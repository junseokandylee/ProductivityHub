using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

public interface IContactImportService
{
    /// <summary>
    /// Starts a new contact import job from uploaded file
    /// </summary>
    Task<ImportJob> StartImportAsync(Guid tenantId, Guid userId, string userName, IFormFile file, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the status and progress of an import job
    /// </summary>
    Task<ImportJobStatusDto?> GetImportJobStatusAsync(Guid tenantId, Guid jobId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Streams real-time import progress via Server-Sent Events
    /// </summary>
    Task StreamImportProgressAsync(Guid tenantId, Guid jobId, HttpResponse response, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets validation errors for an import job
    /// </summary>
    Task<ImportErrorsResponse?> GetImportErrorsAsync(Guid tenantId, Guid jobId, int limit = 100, CancellationToken cancellationToken = default);

    /// <summary>
    /// Previews import file structure without processing
    /// </summary>
    Task<ImportPreviewResponse> PreviewImportFileAsync(IFormFile file, CancellationToken cancellationToken = default);
}

public class ContactImportService : IContactImportService
{
    private readonly ApplicationDbContext _context;
    private readonly IRedisService _redisService;
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<ContactImportService> _logger;
    private readonly string _tempFilePath;

    public ContactImportService(
        ApplicationDbContext context,
        IRedisService redisService,
        IEncryptionService encryptionService,
        ILogger<ContactImportService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _redisService = redisService;
        _encryptionService = encryptionService;
        _logger = logger;
        _tempFilePath = configuration.GetValue<string>("ImportSettings:TempFilePath") ?? Path.GetTempPath();
    }

    public async Task<ImportJob> StartImportAsync(Guid tenantId, Guid userId, string userName, IFormFile file, CancellationToken cancellationToken = default)
    {
        var jobId = Guid.NewGuid();
        var fileName = $"{jobId:N}_{file.FileName}";
        var filePath = Path.Combine(_tempFilePath, fileName);

        try
        {
            // Ensure temp directory exists
            Directory.CreateDirectory(_tempFilePath);

            // Save uploaded file to temp location
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            // Get rough estimate of total rows for initial progress
            var estimatedRows = await EstimateRowCountAsync(filePath, file.ContentType);

            // Create import job record
            var importJob = new ImportJob
            {
                Id = jobId,
                TenantId = tenantId,
                UserId = userId,
                Type = "contacts",
                OriginalFileName = file.FileName,
                FilePath = filePath,
                FileSize = file.Length,
                ContentType = file.ContentType,
                Status = ImportJobStatus.Pending,
                Progress = 0,
                TotalRows = estimatedRows,
                ProcessedRows = 0,
                ErrorRows = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ImportJobs.Add(importJob);
            await _context.SaveChangesAsync(cancellationToken);

            // Queue job for background processing
            await QueueImportJobAsync(importJob);

            _logger.LogInformation("Started import job {JobId} for tenant {TenantId} with {EstimatedRows} estimated rows", 
                jobId, tenantId, estimatedRows);

            return importJob;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start import job for tenant {TenantId}", tenantId);
            
            // Clean up temp file on error
            try
            {
                if (File.Exists(filePath))
                    File.Delete(filePath);
            }
            catch (Exception cleanupEx)
            {
                _logger.LogWarning(cleanupEx, "Failed to clean up temp file {FilePath}", filePath);
            }

            throw;
        }
    }

    public async Task<ImportJobStatusDto?> GetImportJobStatusAsync(Guid tenantId, Guid jobId, CancellationToken cancellationToken = default)
    {
        var importJob = await _context.ImportJobs
            .Where(j => j.TenantId == tenantId && j.Id == jobId)
            .FirstOrDefaultAsync(cancellationToken);

        if (importJob == null)
            return null;

        return new ImportJobStatusDto
        {
            JobId = importJob.Id.ToString("N"),
            Status = importJob.Status,
            Progress = importJob.Progress,
            TotalRows = importJob.TotalRows,
            ProcessedRows = importJob.ProcessedRows,
            ErrorRows = importJob.ErrorRows,
            ProcessingRate = importJob.ProcessingRate,
            EstimatedSecondsRemaining = importJob.EstimatedSecondsRemaining,
            ErrorMessage = importJob.ErrorMessage,
            CreatedAt = importJob.CreatedAt,
            StartedAt = importJob.StartedAt,
            CompletedAt = importJob.CompletedAt
        };
    }

    public async Task StreamImportProgressAsync(Guid tenantId, Guid jobId, HttpResponse response, CancellationToken cancellationToken = default)
    {
        try
        {
            // Subscribe to Redis stream for this job
            var streamKey = $"import:progress:{jobId:N}";
            
            // Send initial status
            var currentStatus = await GetImportJobStatusAsync(tenantId, jobId, cancellationToken);
            if (currentStatus != null)
            {
                var initialEvent = new ImportProgressEvent
                {
                    EventType = "status",
                    JobStatus = currentStatus
                };
                
                await WriteSSEEventAsync(response, "status", initialEvent, cancellationToken);
            }

            // Stream updates from Redis
            await foreach (var message in _redisService.SubscribeToStreamAsync(streamKey, cancellationToken))
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                try
                {
                    var progressEvent = JsonSerializer.Deserialize<ImportProgressEvent>(message);
                    if (progressEvent != null)
                    {
                        await WriteSSEEventAsync(response, progressEvent.EventType, progressEvent, cancellationToken);

                        // Stop streaming if job completed or failed
                        if (progressEvent.JobStatus.Status == ImportJobStatus.Completed || 
                            progressEvent.JobStatus.Status == ImportJobStatus.Failed)
                        {
                            break;
                        }
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize progress event for job {JobId}", jobId);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected, this is normal
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming progress for import job {JobId}", jobId);
            throw;
        }
    }

    public async Task<ImportErrorsResponse?> GetImportErrorsAsync(Guid tenantId, Guid jobId, int limit = 100, CancellationToken cancellationToken = default)
    {
        var importJob = await _context.ImportJobs
            .Where(j => j.TenantId == tenantId && j.Id == jobId)
            .FirstOrDefaultAsync(cancellationToken);

        if (importJob == null)
            return null;

        var errors = await _context.ImportErrors
            .Where(e => e.ImportJobId == jobId)
            .OrderBy(e => e.RowNumber)
            .Take(limit)
            .Select(e => new ImportErrorDto
            {
                RowNumber = e.RowNumber,
                Column = e.Column,
                ErrorType = e.ErrorType,
                ErrorMessage = e.ErrorMessage,
                RawValue = e.RawValue,
                SuggestedFix = e.SuggestedFix,
                Severity = e.Severity
            })
            .ToListAsync(cancellationToken);

        var totalErrors = await _context.ImportErrors
            .Where(e => e.ImportJobId == jobId)
            .CountAsync(cancellationToken);

        return new ImportErrorsResponse
        {
            JobId = jobId.ToString("N"),
            TotalErrors = totalErrors,
            Errors = errors,
            HasMoreErrors = totalErrors > limit,
            ErrorFileUrl = !string.IsNullOrEmpty(importJob.ErrorFilePath) ? $"/api/imports/{jobId:N}/error-file" : null
        };
    }

    public async Task<ImportPreviewResponse> PreviewImportFileAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        var tempFilePath = Path.GetTempFileName();
        
        try
        {
            // Save file temporarily for processing
            using (var stream = new FileStream(tempFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            // Parse first few rows to detect structure
            var (detectedColumns, sampleRows, estimatedRows) = await ParseFilePreviewAsync(tempFilePath, file.ContentType, cancellationToken);

            // Generate suggested mappings
            var suggestedMappings = GenerateColumnMappings(detectedColumns);

            // Validate sample data for warnings
            var warnings = ValidateSampleData(sampleRows, detectedColumns);

            return new ImportPreviewResponse
            {
                DetectedColumns = detectedColumns,
                SampleRows = sampleRows,
                EstimatedRows = estimatedRows,
                SuggestedMappings = suggestedMappings,
                ValidationWarnings = warnings
            };
        }
        finally
        {
            // Clean up temp file
            try
            {
                if (File.Exists(tempFilePath))
                    File.Delete(tempFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to clean up preview temp file {TempFilePath}", tempFilePath);
            }
        }
    }

    #region Private Helper Methods

    private async Task<int> EstimateRowCountAsync(string filePath, string? contentType)
    {
        // Quick estimation - just count lines for CSV, or use a rough estimate for Excel
        if (contentType?.Contains("csv") == true)
        {
            var lineCount = 0;
            using (var reader = new StreamReader(filePath))
            {
                while (await reader.ReadLineAsync() != null)
                {
                    lineCount++;
                    if (lineCount > 10000) // Cap estimation for large files
                        break;
                }
            }
            return Math.Max(0, lineCount - 1); // Subtract header row
        }

        // For Excel files, return a conservative estimate
        return 1000;
    }

    private async Task QueueImportJobAsync(ImportJob job)
    {
        var jobMessage = new
        {
            JobId = job.Id,
            TenantId = job.TenantId,
            FilePath = job.FilePath,
            ContentType = job.ContentType,
            OriginalFileName = job.OriginalFileName
        };

        var messageJson = JsonSerializer.Serialize(jobMessage);
        await _redisService.PublishToStreamAsync("import:jobs", messageJson);
    }

    private async Task<(List<string> columns, List<Dictionary<string, string?>> sampleRows, int estimatedRows)> 
        ParseFilePreviewAsync(string filePath, string? contentType, CancellationToken cancellationToken)
    {
        // This is a placeholder implementation
        // In the full implementation, this would use CsvHelper or ExcelDataReader
        // to parse the first 5-10 rows and detect columns
        
        var columns = new List<string> { "Name", "Phone", "Email", "KakaoId", "Notes" };
        var sampleRows = new List<Dictionary<string, string?>>
        {
            new() { ["Name"] = "John Doe", ["Phone"] = "010-1234-5678", ["Email"] = "john@example.com", ["KakaoId"] = "johndoe", ["Notes"] = "Test contact" }
        };

        return (columns, sampleRows, 1);
    }

    private Dictionary<string, string> GenerateColumnMappings(List<string> detectedColumns)
    {
        var mappings = new Dictionary<string, string>();
        
        // Simple mapping logic - in real implementation this would be more sophisticated
        foreach (var column in detectedColumns)
        {
            var lowerColumn = column.ToLowerInvariant();
            if (lowerColumn.Contains("name") || lowerColumn.Contains("이름"))
                mappings[column] = "FullName";
            else if (lowerColumn.Contains("phone") || lowerColumn.Contains("전화") || lowerColumn.Contains("휴대폰"))
                mappings[column] = "PhoneRaw";
            else if (lowerColumn.Contains("email") || lowerColumn.Contains("이메일"))
                mappings[column] = "EmailRaw";
            else if (lowerColumn.Contains("kakao") || lowerColumn.Contains("카카오"))
                mappings[column] = "KakaoIdRaw";
            else if (lowerColumn.Contains("note") || lowerColumn.Contains("메모") || lowerColumn.Contains("비고"))
                mappings[column] = "Notes";
        }

        return mappings;
    }

    private List<string> ValidateSampleData(List<Dictionary<string, string?>> sampleRows, List<string> columns)
    {
        var warnings = new List<string>();

        // Basic validation warnings
        if (!columns.Any(c => c.ToLowerInvariant().Contains("name")))
            warnings.Add("No name column detected - this is required for contact import");

        if (!columns.Any(c => c.ToLowerInvariant().Contains("phone") || c.ToLowerInvariant().Contains("email")))
            warnings.Add("No phone or email column detected - at least one contact method is recommended");

        return warnings;
    }

    private async Task WriteSSEEventAsync(HttpResponse response, string eventType, object data, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(data);
        var eventData = $"event: {eventType}\ndata: {json}\n\n";
        await response.WriteAsync(eventData, cancellationToken);
        await response.Body.FlushAsync(cancellationToken);
    }

    #endregion
}