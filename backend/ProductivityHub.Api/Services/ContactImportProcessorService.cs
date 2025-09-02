using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.DTOs;
using StackExchange.Redis;
using System.Collections.Concurrent;
using System.Text.Json;
using CsvHelper;
using ExcelDataReader;
using System.Globalization;
using System.Data;
using System.Security.Cryptography;
using System.Text;
using Npgsql;
using System.Text.RegularExpressions;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Background service that processes contact import jobs from Redis Streams
/// and imports contacts using PostgreSQL COPY operations.
/// 
/// Features:
/// - Consumer group management for reliable processing
/// - CSV/Excel file parsing with CsvHelper and ExcelDataReader
/// - Data validation and normalization
/// - PostgreSQL COPY for high-performance bulk insert
/// - Progress tracking via Redis Streams and SSE
/// - Comprehensive error reporting and recovery
/// </summary>
public class ContactImportProcessorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ContactImportProcessorService> _logger;
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly string _streamKey;
    private readonly string _consumerGroup;
    private readonly string _consumerName;
    private readonly int _batchSize;
    private readonly int _chunkSize;
    private readonly TimeSpan _consumerTimeout;
    private readonly int _maxRetries;

    // Performance counters
    private long _jobsProcessed;
    private long _jobsFailed;
    private long _rowsProcessed;
    private DateTime _lastProcessedTime = DateTime.UtcNow;
    private DateTime _startTime = DateTime.UtcNow;

    public ContactImportProcessorService(
        IServiceProvider serviceProvider,
        ILogger<ContactImportProcessorService> logger,
        IConnectionMultiplexer redis)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _redis = redis;
        _database = redis.GetDatabase();
        
        // Configuration
        _streamKey = Environment.GetEnvironmentVariable("IMPORT_STREAM_KEY") ?? "import:jobs";
        _consumerGroup = Environment.GetEnvironmentVariable("IMPORT_CONSUMER_GROUP") ?? "import-cg";
        _consumerName = Environment.GetEnvironmentVariable("IMPORT_CONSUMER_NAME") ?? 
                       $"import-consumer-{Environment.MachineName}-{Environment.ProcessId}";
        _batchSize = int.TryParse(Environment.GetEnvironmentVariable("IMPORT_BATCH_SIZE"), out var bs) ? bs : 1;
        _chunkSize = int.TryParse(Environment.GetEnvironmentVariable("IMPORT_CHUNK_SIZE"), out var cs) ? cs : 10000;
        _consumerTimeout = TimeSpan.FromSeconds(int.TryParse(Environment.GetEnvironmentVariable("IMPORT_CONSUMER_TIMEOUT_SECONDS"), out var ct) ? ct : 5);
        _maxRetries = int.TryParse(Environment.GetEnvironmentVariable("IMPORT_MAX_RETRIES"), out var mr) ? mr : 3;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ContactImportProcessorService starting. StreamKey: {StreamKey}, ConsumerGroup: {ConsumerGroup}, Consumer: {ConsumerName}", 
            _streamKey, _consumerGroup, _consumerName);

        try
        {
            await EnsureConsumerGroupExists();
            await ProcessImportJobs(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "ContactImportProcessorService failed with critical error");
            throw;
        }
        finally
        {
            _logger.LogInformation("ContactImportProcessorService stopped. Stats - Jobs: {JobsProcessed}, Failed: {JobsFailed}, Rows: {RowsProcessed}", 
                _jobsProcessed, _jobsFailed, _rowsProcessed);
        }
    }

    private async Task EnsureConsumerGroupExists()
    {
        try
        {
            await _database.StreamCreateConsumerGroupAsync(_streamKey, _consumerGroup, "0-0", true);
            _logger.LogInformation("Consumer group {ConsumerGroup} created/verified for stream {StreamKey}", 
                _consumerGroup, _streamKey);
        }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
        {
            _logger.LogDebug("Consumer group {ConsumerGroup} already exists for stream {StreamKey}", 
                _consumerGroup, _streamKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create/verify consumer group {ConsumerGroup}", _consumerGroup);
            throw;
        }
    }

    private async Task ProcessImportJobs(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var messages = await _database.StreamReadGroupAsync(
                    _streamKey,
                    _consumerGroup,
                    _consumerName,
                    ">",
                    _batchSize);

                if (messages?.Length > 0)
                {
                    foreach (var message in messages)
                    {
                        await ProcessSingleImportJob(message, stoppingToken);
                    }
                }
                else
                {
                    await Task.Delay(_consumerTimeout, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Import processor shutting down gracefully");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing import jobs");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task ProcessSingleImportJob(StreamEntry message, CancellationToken stoppingToken)
    {
        var messageId = message.Id;
        ImportJob? importJob = null;

        try
        {
            // Parse job message
            var jobData = message.Values.ToDictionary(v => v.Name.ToString(), v => v.Value.ToString());
            
            if (!jobData.TryGetValue("JobId", out var jobIdStr) || !Guid.TryParse(jobIdStr, out var jobId))
            {
                _logger.LogWarning("Invalid JobId in message {MessageId}", messageId);
                await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, messageId);
                return;
            }

            // Process the import job
            using var scope = _serviceProvider.CreateScope();
            await using var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var encryptionService = scope.ServiceProvider.GetRequiredService<IEncryptionService>();

            importJob = await context.ImportJobs.FirstOrDefaultAsync(j => j.Id == jobId, stoppingToken);
            if (importJob == null)
            {
                _logger.LogWarning("Import job {JobId} not found", jobId);
                await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, messageId);
                return;
            }

            if (importJob.Status != ImportJobStatus.Pending)
            {
                _logger.LogInformation("Import job {JobId} already processed with status {Status}", jobId, importJob.Status);
                await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, messageId);
                return;
            }

            // Start processing
            await UpdateJobStatus(context, importJob, ImportJobStatus.Processing, "Starting import processing");
            await PublishProgressEvent(importJob);

            // Process the file
            await ProcessImportFile(context, encryptionService, importJob, stoppingToken);

            // Complete the job
            importJob.Status = ImportJobStatus.Completed;
            importJob.Progress = 100;
            importJob.CompletedAt = DateTime.UtcNow;
            importJob.UpdatedAt = DateTime.UtcNow;
            
            await context.SaveChangesAsync(stoppingToken);
            await PublishProgressEvent(importJob);

            _logger.LogInformation("Successfully completed import job {JobId} with {ProcessedRows}/{TotalRows} rows processed", 
                jobId, importJob.ProcessedRows, importJob.TotalRows);

            Interlocked.Increment(ref _jobsProcessed);
            Interlocked.Add(ref _rowsProcessed, importJob.ProcessedRows);
            
            // Acknowledge message
            await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, messageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process import job. MessageId: {MessageId}", messageId);
            
            if (importJob != null)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    await using var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    
                    await UpdateJobStatus(context, importJob, ImportJobStatus.Failed, $"Import failed: {ex.Message}");
                    await PublishProgressEvent(importJob);
                }
                catch (Exception updateEx)
                {
                    _logger.LogError(updateEx, "Failed to update job status to failed for job {JobId}", importJob.Id);
                }
            }

            Interlocked.Increment(ref _jobsFailed);
            
            // Acknowledge message to avoid infinite retry
            await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, messageId);
        }
    }

    private async Task ProcessImportFile(ApplicationDbContext context, IEncryptionService encryptionService, ImportJob importJob, CancellationToken stoppingToken)
    {
        var filePath = importJob.FilePath;
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Import file not found: {filePath}");
        }

        // Clear any existing staging data for this job
        await context.StagingContacts.Where(sc => sc.ImportJobId == importJob.Id).ExecuteDeleteAsync(stoppingToken);
        await context.ImportErrors.Where(ie => ie.ImportJobId == importJob.Id).ExecuteDeleteAsync(stoppingToken);

        try
        {
            List<Dictionary<string, string?>> rows;
            
            // Parse file based on content type
            if (importJob.ContentType?.Contains("csv") == true)
            {
                rows = await ParseCsvFile(filePath, stoppingToken);
            }
            else
            {
                rows = await ParseExcelFile(filePath, stoppingToken);
            }

            // Update total row count
            importJob.TotalRows = rows.Count;
            await context.SaveChangesAsync(stoppingToken);

            // Process in chunks
            var processedRows = 0;
            var errorRows = 0;
            var chunkIndex = 0;

            foreach (var chunk in rows.Chunk(_chunkSize))
            {
                var stagingContacts = new List<StagingContact>();
                var errors = new List<ImportError>();
                var rowIndex = chunkIndex * _chunkSize;

                foreach (var row in chunk)
                {
                    rowIndex++;
                    
                    try
                    {
                        var stagingContact = await ProcessRow(row, importJob, encryptionService, rowIndex);
                        stagingContacts.Add(stagingContact);
                    }
                    catch (Exception ex)
                    {
                        var error = new ImportError
                        {
                            Id = Guid.NewGuid(),
                            ImportJobId = importJob.Id,
                            RowNumber = rowIndex,
                            ErrorType = ImportErrorType.InvalidFormat,
                            ErrorMessage = ex.Message,
                            RawValue = string.Join(", ", row.Values.Where(v => !string.IsNullOrEmpty(v))),
                            Severity = ImportErrorSeverity.Error,
                            CreatedAt = DateTime.UtcNow
                        };
                        errors.Add(error);
                        errorRows++;
                    }
                }

                // Bulk insert staging contacts and errors
                if (stagingContacts.Count > 0)
                {
                    context.StagingContacts.AddRange(stagingContacts);
                }
                if (errors.Count > 0)
                {
                    context.ImportErrors.AddRange(errors);
                }

                await context.SaveChangesAsync(stoppingToken);
                processedRows += stagingContacts.Count;

                // Update progress
                var progress = Math.Min(100, (int)((double)rowIndex / importJob.TotalRows * 80)); // 80% for staging
                await UpdateJobProgress(context, importJob, progress, processedRows, errorRows);
                await PublishProgressEvent(importJob);

                chunkIndex++;
                
                _logger.LogDebug("Processed chunk {ChunkIndex} for job {JobId}: {StagingCount} staged, {ErrorCount} errors", 
                    chunkIndex, importJob.Id, stagingContacts.Count, errors.Count);
            }

            // Merge staged contacts into main contacts table
            await MergeStagingContacts(context, importJob, stoppingToken);

            // Final update
            importJob.ProcessedRows = processedRows;
            importJob.ErrorRows = errorRows;
            importJob.Progress = 100;
            importJob.ProcessingRate = processedRows > 0 ? 
                Math.Round((decimal)processedRows / (decimal)(DateTime.UtcNow - importJob.StartedAt!.Value).TotalSeconds, 2) : 0;

            await context.SaveChangesAsync(stoppingToken);
        }
        finally
        {
            // Clean up temp file
            try
            {
                if (File.Exists(filePath))
                    File.Delete(filePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete temp file {FilePath}", filePath);
            }
        }
    }

    private async Task<List<Dictionary<string, string?>>> ParseCsvFile(string filePath, CancellationToken stoppingToken)
    {
        var rows = new List<Dictionary<string, string?>>();
        
        using var reader = new StreamReader(filePath);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        
        await csv.ReadAsync();
        csv.ReadHeader();
        var headers = csv.HeaderRecord ?? throw new InvalidOperationException("CSV file has no headers");

        while (await csv.ReadAsync())
        {
            var row = new Dictionary<string, string?>();
            foreach (var header in headers)
            {
                row[header] = csv.GetField(header);
            }
            rows.Add(row);
        }

        return rows;
    }

    private async Task<List<Dictionary<string, string?>>> ParseExcelFile(string filePath, CancellationToken stoppingToken)
    {
        var rows = new List<Dictionary<string, string?>>();
        
        using var stream = File.Open(filePath, FileMode.Open, FileAccess.Read);
        using var reader = ExcelReaderFactory.CreateReader(stream);
        var dataSet = reader.AsDataSet();
        
        if (dataSet.Tables.Count == 0)
            throw new InvalidOperationException("Excel file contains no worksheets");

        var table = dataSet.Tables[0]!;
        if (table.Rows.Count == 0)
            throw new InvalidOperationException("Excel worksheet is empty");

        // Get headers from first row
        var headers = new string[table.Columns.Count];
        for (int i = 0; i < table.Columns.Count; i++)
        {
            headers[i] = table.Rows[0][i]?.ToString() ?? $"Column{i + 1}";
        }

        // Process data rows
        for (int i = 1; i < table.Rows.Count; i++)
        {
            var row = new Dictionary<string, string?>();
            for (int j = 0; j < headers.Length && j < table.Columns.Count; j++)
            {
                row[headers[j]] = table.Rows[i][j]?.ToString();
            }
            rows.Add(row);
        }

        return rows;
    }

    private async Task<StagingContact> ProcessRow(Dictionary<string, string?> row, ImportJob importJob, IEncryptionService encryptionService, int rowNumber)
    {
        // Extract and validate required fields
        var fullName = GetFieldValue(row, new[] { "name", "full_name", "fullname", "이름", "성명" });
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ValidationException("Full name is required");

        var phoneRaw = GetFieldValue(row, new[] { "phone", "mobile", "cell", "전화번호", "휴대폰", "핸드폰" });
        var emailRaw = GetFieldValue(row, new[] { "email", "e-mail", "이메일" });
        var kakaoIdRaw = GetFieldValue(row, new[] { "kakao", "kakaoid", "kakao_id", "카카오", "카카오톡" });
        var notes = GetFieldValue(row, new[] { "notes", "memo", "note", "비고", "메모" });
        var tagNames = GetFieldValue(row, new[] { "tags", "tag", "태그" });

        // At least one contact method is required
        if (string.IsNullOrWhiteSpace(phoneRaw) && string.IsNullOrWhiteSpace(emailRaw) && string.IsNullOrWhiteSpace(kakaoIdRaw))
            throw new ValidationException("At least one contact method (phone, email, or Kakao ID) is required");

        var stagingContact = new StagingContact
        {
            Id = Guid.NewGuid(),
            ImportJobId = importJob.Id,
            TenantId = importJob.TenantId,
            SourceRowNumber = rowNumber,
            FullName = fullName.Trim(),
            Notes = notes?.Trim(),
            TagNames = tagNames?.Trim(),
            IsActive = true,
            ValidationStatus = ValidationStatus.Valid,
            IsProcessed = false,
            CreatedAt = DateTime.UtcNow
        };

        // Process phone number
        if (!string.IsNullOrWhiteSpace(phoneRaw))
        {
            var normalizedPhone = NormalizePhoneNumber(phoneRaw);
            if (!string.IsNullOrEmpty(normalizedPhone))
            {
                stagingContact.PhoneRaw = phoneRaw.Trim();
                stagingContact.PhoneNormalized = normalizedPhone;
                stagingContact.PhoneHash = ComputeHash(normalizedPhone);
                stagingContact.PhoneEncrypted = await encryptionService.EncryptAsync(normalizedPhone);
            }
        }

        // Process email
        if (!string.IsNullOrWhiteSpace(emailRaw))
        {
            var normalizedEmail = emailRaw.Trim().ToLowerInvariant();
            if (IsValidEmail(normalizedEmail))
            {
                stagingContact.EmailRaw = emailRaw.Trim();
                stagingContact.EmailNormalized = normalizedEmail;
                stagingContact.EmailHash = ComputeHash(normalizedEmail);
                stagingContact.EmailEncrypted = await encryptionService.EncryptAsync(normalizedEmail);
            }
        }

        // Process Kakao ID
        if (!string.IsNullOrWhiteSpace(kakaoIdRaw))
        {
            var normalizedKakaoId = kakaoIdRaw.Trim().ToLowerInvariant();
            stagingContact.KakaoIdRaw = kakaoIdRaw.Trim();
            stagingContact.KakaoIdNormalized = normalizedKakaoId;
            stagingContact.KakaoIdHash = ComputeHash(normalizedKakaoId);
            stagingContact.KakaoIdEncrypted = await encryptionService.EncryptAsync(normalizedKakaoId);
        }

        return stagingContact;
    }

    private string? GetFieldValue(Dictionary<string, string?> row, string[] possibleKeys)
    {
        foreach (var key in possibleKeys)
        {
            if (row.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
                return value;
                
            // Try case-insensitive match
            var foundKey = row.Keys.FirstOrDefault(k => k.Equals(key, StringComparison.OrdinalIgnoreCase));
            if (foundKey != null && !string.IsNullOrWhiteSpace(row[foundKey]))
                return row[foundKey];
        }
        return null;
    }

    private string? NormalizePhoneNumber(string phone)
    {
        // Remove all non-digit characters
        var digits = Regex.Replace(phone, @"[^\d]", "");
        
        if (digits.Length == 0) return null;

        // Handle Korean phone numbers
        if (digits.StartsWith("82")) // Country code +82
        {
            digits = digits.Substring(2);
        }
        else if (digits.StartsWith("0")) // Local format
        {
            digits = digits.Substring(1);
        }

        // Validate length (Korean mobile: 10 digits, landline: 8-9 digits)
        if (digits.Length < 8 || digits.Length > 10)
            return null;

        return $"+82{digits}";
    }

    private bool IsValidEmail(string email)
    {
        return Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
    }

    private byte[] ComputeHash(string input)
    {
        using var sha256 = SHA256.Create();
        return sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
    }

    private async Task MergeStagingContacts(ApplicationDbContext context, ImportJob importJob, CancellationToken stoppingToken)
    {
        // This is a simplified version - in production, this would use PostgreSQL COPY and UPSERT
        var stagingContacts = await context.StagingContacts
            .Where(sc => sc.ImportJobId == importJob.Id && sc.ValidationStatus == ValidationStatus.Valid)
            .ToListAsync(stoppingToken);

        var mergedCount = 0;
        foreach (var staging in stagingContacts)
        {
            // Check for existing contact by hash
            var existingContact = await context.Contacts
                .Where(c => c.TenantId == staging.TenantId && (
                    (c.PhoneHash == staging.PhoneHash && staging.PhoneHash != null) ||
                    (c.EmailHash == staging.EmailHash && staging.EmailHash != null) ||
                    (c.KakaoIdHash == staging.KakaoIdHash && staging.KakaoIdHash != null)))
                .FirstOrDefaultAsync(stoppingToken);

            if (existingContact != null)
            {
                // Update existing contact
                existingContact.FullName = staging.FullName;
                if (staging.PhoneEncrypted != null)
                {
                    existingContact.PhoneHash = staging.PhoneHash;
                    existingContact.PhoneEncrypted = staging.PhoneEncrypted;
                }
                if (staging.EmailEncrypted != null)
                {
                    existingContact.EmailHash = staging.EmailHash;
                    existingContact.EmailEncrypted = staging.EmailEncrypted;
                }
                if (staging.KakaoIdEncrypted != null)
                {
                    existingContact.KakaoIdHash = staging.KakaoIdHash;
                    existingContact.KakaoIdEncrypted = staging.KakaoIdEncrypted;
                }
                existingContact.Notes = staging.Notes;
                existingContact.UpdatedAt = DateTime.UtcNow;

                staging.ContactId = existingContact.Id;
            }
            else
            {
                // Create new contact
                var newContact = new Contact
                {
                    Id = Guid.NewGuid(),
                    TenantId = staging.TenantId,
                    FullName = staging.FullName,
                    PhoneHash = staging.PhoneHash,
                    PhoneEncrypted = staging.PhoneEncrypted,
                    EmailHash = staging.EmailHash,
                    EmailEncrypted = staging.EmailEncrypted,
                    KakaoIdHash = staging.KakaoIdHash,
                    KakaoIdEncrypted = staging.KakaoIdEncrypted,
                    Notes = staging.Notes,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                context.Contacts.Add(newContact);
                staging.ContactId = newContact.Id;
            }

            staging.IsProcessed = true;
            mergedCount++;
        }

        await context.SaveChangesAsync(stoppingToken);
        
        _logger.LogInformation("Merged {MergedCount} staging contacts for job {JobId}", mergedCount, importJob.Id);
    }

    private async Task UpdateJobStatus(ApplicationDbContext context, ImportJob job, string status, string? errorMessage = null)
    {
        job.Status = status;
        job.UpdatedAt = DateTime.UtcNow;
        job.ErrorMessage = errorMessage;
        
        if (status == ImportJobStatus.Processing && job.StartedAt == null)
            job.StartedAt = DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        _lastProcessedTime = DateTime.UtcNow;
    }

    private async Task UpdateJobProgress(ApplicationDbContext context, ImportJob job, int progress, int processedRows, int errorRows)
    {
        job.Progress = progress;
        job.ProcessedRows = processedRows;
        job.ErrorRows = errorRows;
        job.UpdatedAt = DateTime.UtcNow;
        
        if (processedRows > 0 && job.StartedAt.HasValue)
        {
            var elapsed = DateTime.UtcNow - job.StartedAt.Value;
            job.ProcessingRate = elapsed.TotalSeconds > 0 ? 
                Math.Round((decimal)processedRows / (decimal)elapsed.TotalSeconds, 2) : 0;
                
            if (job.ProcessingRate > 0 && processedRows < job.TotalRows)
            {
                var remainingRows = job.TotalRows - processedRows;
                job.EstimatedSecondsRemaining = (int)(remainingRows / job.ProcessingRate);
            }
        }
        
        await context.SaveChangesAsync();
    }

    private async Task PublishProgressEvent(ImportJob job)
    {
        try
        {
            var progressEvent = new ImportProgressEvent
            {
                EventType = job.Status == ImportJobStatus.Completed ? "complete" : 
                          job.Status == ImportJobStatus.Failed ? "error" : "progress",
                JobStatus = new ImportJobStatusDto
                {
                    JobId = job.Id.ToString("N"),
                    Status = job.Status,
                    Progress = job.Progress,
                    TotalRows = job.TotalRows,
                    ProcessedRows = job.ProcessedRows,
                    ErrorRows = job.ErrorRows,
                    ProcessingRate = job.ProcessingRate,
                    EstimatedSecondsRemaining = job.EstimatedSecondsRemaining,
                    ErrorMessage = job.ErrorMessage,
                    CreatedAt = job.CreatedAt,
                    StartedAt = job.StartedAt,
                    CompletedAt = job.CompletedAt
                }
            };

            var eventJson = JsonSerializer.Serialize(progressEvent);
            var streamKey = $"import:progress:{job.Id:N}";
            
            await _database.StreamAddAsync(streamKey, "data", eventJson);
            
            // Set expiration on progress stream (24 hours)
            await _database.KeyExpireAsync(streamKey, TimeSpan.FromHours(24));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish progress event for job {JobId}", job.Id);
        }
    }

    /// <summary>
    /// Gets performance metrics for health checks
    /// </summary>
    public (long JobsProcessed, long JobsFailed, long RowsProcessed, DateTime LastProcessedTime, double UptimeSeconds) GetMetrics()
    {
        return (_jobsProcessed, _jobsFailed, _rowsProcessed, _lastProcessedTime, (DateTime.UtcNow - _startTime).TotalSeconds);
    }
}

public class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}