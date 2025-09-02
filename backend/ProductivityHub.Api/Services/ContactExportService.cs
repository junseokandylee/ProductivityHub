using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using Microsoft.AspNetCore.DataProtection;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

public interface IContactExportService
{
    Task<ContactExportResponse> ExportContactsAsync(Guid tenantId, ContactExportRequest request);
    Task<ExportJobStatus?> GetExportStatusAsync(string jobId);
    Task<Stream?> GetExportFileAsync(string token);
}

public class ContactExportService : IContactExportService
{
    private readonly ApplicationDbContext _context;
    private readonly IDataProtector _protector;
    private readonly ILogger<ContactExportService> _logger;
    private const int SyncThreshold = 50000; // Export sync if <= 50K rows
    private const int BatchSize = 5000; // Process in batches of 5K
    private const int TokenExpirationHours = 24;

    public ContactExportService(
        ApplicationDbContext context,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<ContactExportService> logger)
    {
        _context = context;
        _protector = dataProtectionProvider.CreateProtector("ExportTokens");
        _logger = logger;
    }

    public async Task<ContactExportResponse> ExportContactsAsync(Guid tenantId, ContactExportRequest request)
    {
        try
        {
            // Build query and estimate count
            var query = BuildExportQuery(tenantId, request.SearchCriteria);
            var estimatedRows = await query.CountAsync();

            _logger.LogInformation("Export requested for tenant {TenantId}: {Rows} rows, format {Format}", 
                tenantId, estimatedRows, request.Format);

            if (estimatedRows <= SyncThreshold)
            {
                // Synchronous export - stream directly
                var downloadUrl = await CreateDownloadTokenAsync(tenantId, request, estimatedRows);
                
                return new ContactExportResponse
                {
                    DownloadUrl = downloadUrl,
                    IsAsync = false,
                    EstimatedRows = estimatedRows,
                    Format = request.Format,
                    ExpiresAt = DateTime.UtcNow.AddHours(TokenExpirationHours)
                };
            }
            else
            {
                // Asynchronous export - background job
                var jobId = Guid.NewGuid().ToString();
                
                // TODO: Start background job for large exports
                _logger.LogInformation("Started async export job {JobId} for tenant {TenantId}", 
                    jobId, tenantId);

                return new ContactExportResponse
                {
                    JobId = jobId,
                    IsAsync = true,
                    EstimatedRows = estimatedRows,
                    Format = request.Format
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating export for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task<ExportJobStatus?> GetExportStatusAsync(string jobId)
    {
        // TODO: Implement job status tracking
        // For now, return a placeholder
        return new ExportJobStatus
        {
            JobId = jobId,
            Status = "completed",
            Format = "csv",
            TotalRows = 0,
            ProcessedRows = 0,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };
    }

    public async Task<Stream?> GetExportFileAsync(string token)
    {
        try
        {
            var exportData = DecryptExportToken(token);
            
            if (exportData.ExpiresAt <= DateTime.UtcNow)
            {
                _logger.LogWarning("Export token expired: {Token}", token);
                return null;
            }

            var query = BuildExportQuery(exportData.TenantId, exportData.Request.SearchCriteria);
            
            if (exportData.Request.Format == "xlsx")
            {
                return await GenerateExcelStreamAsync(query, exportData.Request);
            }
            else
            {
                return await GenerateCsvStreamAsync(query, exportData.Request);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating export file for token");
            return null;
        }
    }

    private async Task<string> CreateDownloadTokenAsync(Guid tenantId, ContactExportRequest request, int estimatedRows)
    {
        var tokenData = new ExportTokenData
        {
            TenantId = tenantId,
            Request = request,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(TokenExpirationHours),
            EstimatedRows = estimatedRows
        };

        var json = JsonSerializer.Serialize(tokenData);
        var encryptedToken = _protector.Protect(json);
        var encodedToken = Convert.ToBase64String(Encoding.UTF8.GetBytes(encryptedToken));
        
        return $"/api/contacts/export/download/{encodedToken}";
    }

    private ExportTokenData DecryptExportToken(string token)
    {
        try
        {
            var decodedToken = Encoding.UTF8.GetString(Convert.FromBase64String(token));
            var json = _protector.Unprotect(decodedToken);
            return JsonSerializer.Deserialize<ExportTokenData>(json) 
                ?? throw new InvalidOperationException("Invalid token format");
        }
        catch (Exception ex)
        {
            throw new UnauthorizedAccessException("Invalid or expired export token", ex);
        }
    }

    private IQueryable<Contact> BuildExportQuery(Guid tenantId, ContactSearchRequest searchCriteria)
    {
        var query = _context.Contacts
            .Include(c => c.ContactTags)
            .ThenInclude(ct => ct.Tag)
            .Where(c => c.TenantId == tenantId && c.DeletedAt == null);

        // Apply search filters (reuse logic from existing services)
        if (!string.IsNullOrEmpty(searchCriteria.Search))
        {
            var searchTerm = searchCriteria.Search.ToLower();
            query = query.Where(c =>
                c.FullName.ToLower().Contains(searchTerm));
        }

        if (searchCriteria.IsActive.HasValue)
        {
            query = query.Where(c => c.IsActive == searchCriteria.IsActive.Value);
        }

        if (searchCriteria.TagIds?.Any() == true)
        {
            query = query.Where(c => c.ContactTags.Any(ct => searchCriteria.TagIds.Contains(ct.TagId)));
        }

        if (searchCriteria.AfterUpdatedAt.HasValue)
        {
            query = query.Where(c => c.UpdatedAt >= searchCriteria.AfterUpdatedAt.Value);
        }

        // Apply sorting
        query = searchCriteria.SortBy?.ToLower() switch
        {
            "fullname" => searchCriteria.SortOrder?.ToLower() == "desc"
                ? query.OrderByDescending(c => c.FullName)
                : query.OrderBy(c => c.FullName),
            "createdat" => searchCriteria.SortOrder?.ToLower() == "desc"
                ? query.OrderByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.CreatedAt),
            _ => searchCriteria.SortOrder?.ToLower() == "desc"
                ? query.OrderByDescending(c => c.UpdatedAt)
                : query.OrderBy(c => c.UpdatedAt)
        };

        return query;
    }

    private async Task<Stream> GenerateCsvStreamAsync(IQueryable<Contact> query, ContactExportRequest request)
    {
        var stream = new MemoryStream();
        var writer = new StreamWriter(stream, new UTF8Encoding(true), leaveOpen: true); // UTF-8 BOM for Excel compatibility
        var csvWriter = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            ShouldQuote = args => ShouldQuoteFunction(args.Field, null)
        });

        // Write header
        await WriteContactHeaderAsync(csvWriter, request);

        // Stream data in batches to avoid memory issues
        var skip = 0;
        while (true)
        {
            var batch = await query
                .Skip(skip)
                .Take(BatchSize)
                .ToListAsync();

            if (!batch.Any())
                break;

            foreach (var contact in batch)
            {
                await WriteContactRecordAsync(csvWriter, contact, request);
            }

            skip += BatchSize;
        }

        await csvWriter.FlushAsync();
        await writer.FlushAsync();
        stream.Position = 0;
        
        return stream;
    }

    private async Task<Stream> GenerateExcelStreamAsync(IQueryable<Contact> query, ContactExportRequest request)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Contacts");

        // Write headers
        var headers = GetColumnHeaders(request);
        for (int i = 0; i < headers.Count; i++)
        {
            worksheet.Cell(1, i + 1).Value = headers[i];
        }

        // Format header row
        var headerRange = worksheet.Range(1, 1, 1, headers.Count);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.LightGray;

        // Stream data in batches
        var row = 2;
        var skip = 0;
        
        while (true)
        {
            var batch = await query
                .Skip(skip)
                .Take(BatchSize)
                .ToListAsync();

            if (!batch.Any())
                break;

            foreach (var contact in batch)
            {
                WriteContactExcelRow(worksheet, row, contact, request);
                row++;
            }

            skip += BatchSize;
        }

        // Auto-fit columns
        worksheet.Columns().AdjustToContents();

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        
        return stream;
    }

    private async Task WriteContactHeaderAsync(CsvWriter csvWriter, ContactExportRequest request)
    {
        var headers = GetColumnHeaders(request);
        
        foreach (var header in headers)
        {
            csvWriter.WriteField(header);
        }
        
        await csvWriter.NextRecordAsync();
    }

    private async Task WriteContactRecordAsync(CsvWriter csvWriter, Contact contact, ContactExportRequest request)
    {
        var columns = GetIncludedColumns(request);
        
        foreach (var column in columns)
        {
            var value = GetContactFieldValue(contact, column);
            csvWriter.WriteField(value);
        }
        
        await csvWriter.NextRecordAsync();
    }

    private void WriteContactExcelRow(IXLWorksheet worksheet, int row, Contact contact, ContactExportRequest request)
    {
        var columns = GetIncludedColumns(request);
        
        for (int col = 0; col < columns.Count; col++)
        {
            var value = GetContactFieldValue(contact, columns[col]);
            worksheet.Cell(row, col + 1).Value = value?.ToString() ?? "";
        }
    }

    private List<string> GetColumnHeaders(ContactExportRequest request)
    {
        var columns = GetIncludedColumns(request);
        return columns.Select(col => col switch
        {
            "fullname" => "Full Name",
            "phone" => "Phone",
            "email" => "Email", 
            "kakaoid" => "Kakao ID",
            "notes" => "Notes",
            "isactive" => "Active",
            "tags" => "Tags",
            "createdat" => "Created At",
            "updatedat" => "Updated At",
            _ => col
        }).ToList();
    }

    private List<string> GetIncludedColumns(ContactExportRequest request)
    {
        if (request.IncludeColumns?.Any() == true)
        {
            return request.IncludeColumns;
        }

        // Default columns
        return new List<string> { "fullname", "phone", "email", "kakaoid", "notes", "isactive", "tags", "createdat", "updatedat" };
    }

    private object? GetContactFieldValue(Contact contact, string column)
    {
        return column.ToLower() switch
        {
            "fullname" => contact.FullName,
            "phone" => contact.Phone, // Will be decrypted by EF Core
            "email" => contact.Email, // Will be decrypted by EF Core
            "kakaoid" => contact.KakaoId, // Will be decrypted by EF Core
            "notes" => contact.Notes,
            "isactive" => contact.IsActive,
            "tags" => string.Join(", ", contact.ContactTags.Select(ct => ct.Tag.Name)),
            "createdat" => contact.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
            "updatedat" => contact.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
            _ => ""
        };
    }

    private static readonly Func<string?, CsvContext, bool> ShouldQuoteFunction = (field, context) =>
    {
        // Always quote fields containing commas, quotes, or newlines
        return field?.Contains(',') == true || 
               field?.Contains('"') == true || 
               field?.Contains('\n') == true ||
               field?.Contains('\r') == true;
    };

    private class ExportTokenData
    {
        public Guid TenantId { get; set; }
        public ContactExportRequest Request { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int EstimatedRows { get; set; }
    }
}