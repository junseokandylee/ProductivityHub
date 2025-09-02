using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Represents an import job for processing CSV/Excel files
/// </summary>
public class ImportJob
{
    /// <summary>
    /// Unique job identifier
    /// </summary>
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// Tenant ID for RLS
    /// </summary>
    [Required]
    public Guid TenantId { get; set; }

    /// <summary>
    /// User who initiated the import
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Import type (contacts, etc.)
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Original filename
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Temporary file path on server
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// File size in bytes
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// MIME type of uploaded file
    /// </summary>
    [MaxLength(100)]
    public string? ContentType { get; set; }

    /// <summary>
    /// Current job status
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = ImportJobStatus.Pending;

    /// <summary>
    /// Progress percentage (0-100)
    /// </summary>
    public int Progress { get; set; }

    /// <summary>
    /// Total rows detected in file
    /// </summary>
    public int TotalRows { get; set; }

    /// <summary>
    /// Rows processed successfully
    /// </summary>
    public int ProcessedRows { get; set; }

    /// <summary>
    /// Rows with errors
    /// </summary>
    public int ErrorRows { get; set; }

    /// <summary>
    /// Processing rate (rows per second)
    /// </summary>
    public decimal? ProcessingRate { get; set; }

    /// <summary>
    /// Estimated time remaining in seconds
    /// </summary>
    public int? EstimatedSecondsRemaining { get; set; }

    /// <summary>
    /// Error message if job failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Path to error file with detailed error report
    /// </summary>
    [MaxLength(1000)]
    public string? ErrorFilePath { get; set; }

    /// <summary>
    /// Column mapping configuration (JSON)
    /// </summary>
    public string? ColumnMapping { get; set; }

    /// <summary>
    /// Import configuration options (JSON)
    /// </summary>
    public string? ImportOptions { get; set; }

    /// <summary>
    /// When the job was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the job was started
    /// </summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// When the job was completed
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Last update timestamp
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
}

/// <summary>
/// Import job status constants
/// </summary>
public static class ImportJobStatus
{
    public const string Pending = "pending";
    public const string Processing = "processing";
    public const string Completed = "completed";
    public const string Failed = "failed";
    public const string Cancelled = "cancelled";
}