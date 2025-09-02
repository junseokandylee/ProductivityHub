using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

public class ContactDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? KakaoId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public decimal ActivityScore { get; set; } = 0.0m;
    public DateTime? LastActivityAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TagDto> Tags { get; set; } = new();
}

public class CreateContactRequest
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Phone]
    public string? Phone { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public string? KakaoId { get; set; }
    
    public string? Notes { get; set; }
    
    public List<Guid> TagIds { get; set; } = new();
}

public class UpdateContactRequest
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Phone]
    public string? Phone { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public string? KakaoId { get; set; }
    
    public string? Notes { get; set; }
    
    public List<Guid> TagIds { get; set; } = new();
    
    public bool IsActive { get; set; } = true;
}

public class ContactSearchRequest
{
    public string? Search { get; set; }
    public List<Guid> TagIds { get; set; } = new();
    public bool? IsActive { get; set; }
    public decimal? MinActivityScore { get; set; }
    public decimal? MaxActivityScore { get; set; }
    public string? ActivityLevel { get; set; } // "high", "medium", "low"
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public string SortBy { get; set; } = "CreatedAt";
    public string SortOrder { get; set; } = "desc";
    
    // Keyset pagination support
    public DateTime? AfterUpdatedAt { get; set; }
    public Guid? AfterId { get; set; }
}

public class ContactSearchResponse
{
    public List<ContactDto> Contacts { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
    public int TotalPages { get; set; }
    
    // Keyset pagination support
    public bool HasNextPage { get; set; }
    public DateTime? NextUpdatedAt { get; set; }
    public Guid? NextId { get; set; }
}

public class TagDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int ContactCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateTagRequest
{
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF0000)")]
    public string Color { get; set; } = "#6B7280";

    public string? Description { get; set; }
}

public class UpdateTagRequest
{
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Color must be a valid hex color (e.g., #FF0000)")]
    public string Color { get; set; } = "#6B7280";

    public string? Description { get; set; }
}

public class ContactHistoryDto
{
    public long Id { get; set; }
    public Guid ContactId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public DateTime OccurredAt { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
}

public class ContactHistorySearchRequest
{
    public Guid ContactId { get; set; }
    public string? Type { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
}

// Tag assignment DTOs
public class AssignTagRequest
{
    [Required]
    public Guid TagId { get; set; }
}

public class RemoveTagRequest
{
    [Required]
    public Guid TagId { get; set; }
}

public class BulkTagOperationRequest
{
    [Required]
    public List<Guid> ContactIds { get; set; } = new();
    
    [Required]
    public Guid TagId { get; set; }
    
    [Required]
    public string Action { get; set; } = string.Empty; // "add" or "remove"
}

public class BulkTagOperationResponse
{
    public int ProcessedContacts { get; set; }
    public int SuccessfulOperations { get; set; }
    public int FailedOperations { get; set; }
    public List<string> Errors { get; set; } = new();
}

// Selection Token System for Smart Bulk Operations
public class SelectionTokenDto
{
    public string Token { get; set; } = string.Empty;
    public int EstimatedCount { get; set; }
    public ContactSearchRequest SearchCriteria { get; set; } = new();
    public DateTime ExpiresAt { get; set; }
}

public class CreateSelectionTokenRequest
{
    public ContactSearchRequest SearchCriteria { get; set; } = new();
}

// Enhanced Bulk Operations with Selection Token Support
public class BulkActionRequest
{
    /// <summary>
    /// Either provide explicit ContactIds or a SelectionToken from current filter state
    /// </summary>
    public List<Guid>? ContactIds { get; set; }
    public string? SelectionToken { get; set; }
}

public class BulkTagActionRequest : BulkActionRequest
{
    [Required]
    public Guid TagId { get; set; }
    
    [Required]
    [RegularExpression(@"^(add|remove)$", ErrorMessage = "Action must be 'add' or 'remove'")]
    public string Action { get; set; } = string.Empty;
}

public class BulkDeleteActionRequest : BulkActionRequest
{
    public string? Reason { get; set; }
}

public class BulkMergeActionRequest : BulkActionRequest
{
    [Required]
    public Guid PrimarContactId { get; set; } // The contact to merge others into
    public bool PreserveTags { get; set; } = true;
    public bool PreserveHistory { get; set; } = true;
}

public class BulkActionResponse
{
    public int TotalCount { get; set; }
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public string? JobId { get; set; } // For long-running operations
    public bool IsAsync { get; set; } = false;
}

// Long-running bulk operation tracking
public class BulkOperationStatus
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "pending", "running", "completed", "failed"
    public string OperationType { get; set; } = string.Empty; // "tag", "delete", "merge"
    public int TotalCount { get; set; }
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double ProgressPercentage => TotalCount > 0 ? (double)ProcessedCount / TotalCount * 100 : 0;
}

// Contact Export System
public class ContactExportRequest
{
    public ContactSearchRequest SearchCriteria { get; set; } = new();
    
    [Required]
    [RegularExpression(@"^(csv|xlsx)$", ErrorMessage = "Format must be 'csv' or 'xlsx'")]
    public string Format { get; set; } = "csv";
    
    public List<string> IncludeColumns { get; set; } = new();
    
    public bool IncludeHistory { get; set; } = false;
}

public class ContactExportResponse
{
    public string? DownloadUrl { get; set; }
    public string? JobId { get; set; }
    public bool IsAsync { get; set; }
    public int EstimatedRows { get; set; }
    public string Format { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}

public class ExportJobStatus
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "pending", "running", "completed", "failed", "expired"
    public string Format { get; set; } = string.Empty;
    public int TotalRows { get; set; }
    public int ProcessedRows { get; set; }
    public string? DownloadUrl { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public List<string> Errors { get; set; } = new();
    public double ProgressPercentage => TotalRows > 0 ? (double)ProcessedRows / TotalRows * 100 : 0;
}