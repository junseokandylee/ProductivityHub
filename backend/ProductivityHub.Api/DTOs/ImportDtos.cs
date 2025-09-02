using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

/// <summary>
/// Response DTO for contact import job creation
/// </summary>
public class ImportJobResponse
{
    /// <summary>
    /// Unique job identifier
    /// </summary>
    public required string JobId { get; set; }

    /// <summary>
    /// Import job status
    /// </summary>
    public required string Status { get; set; }

    /// <summary>
    /// Total rows detected in file
    /// </summary>
    public int TotalRows { get; set; }

    /// <summary>
    /// When the job was created
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO for import job status and progress
/// </summary>
public class ImportJobStatusDto
{
    /// <summary>
    /// Unique job identifier
    /// </summary>
    public required string JobId { get; set; }

    /// <summary>
    /// Import job status
    /// </summary>
    public required string Status { get; set; }

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
}

/// <summary>
/// DTO for import validation errors
/// </summary>
public class ImportErrorDto
{
    /// <summary>
    /// Row number (1-based) where error occurred
    /// </summary>
    public int RowNumber { get; set; }

    /// <summary>
    /// Column name or index where error occurred
    /// </summary>
    public string? Column { get; set; }

    /// <summary>
    /// Error type/category
    /// </summary>
    public required string ErrorType { get; set; }

    /// <summary>
    /// Detailed error message
    /// </summary>
    public required string ErrorMessage { get; set; }

    /// <summary>
    /// Raw value that caused the error
    /// </summary>
    public string? RawValue { get; set; }

    /// <summary>
    /// Suggested fix or corrected value
    /// </summary>
    public string? SuggestedFix { get; set; }

    /// <summary>
    /// Error severity level
    /// </summary>
    public required string Severity { get; set; }
}

/// <summary>
/// Response containing import errors
/// </summary>
public class ImportErrorsResponse
{
    /// <summary>
    /// Import job ID
    /// </summary>
    public required string JobId { get; set; }

    /// <summary>
    /// Total error count
    /// </summary>
    public int TotalErrors { get; set; }

    /// <summary>
    /// List of validation errors (limited to top N)
    /// </summary>
    public required List<ImportErrorDto> Errors { get; set; }

    /// <summary>
    /// Whether more errors exist beyond the returned limit
    /// </summary>
    public bool HasMoreErrors { get; set; }

    /// <summary>
    /// URL to download full error report
    /// </summary>
    public string? ErrorFileUrl { get; set; }
}

/// <summary>
/// SSE event data for import progress
/// </summary>
public class ImportProgressEvent
{
    /// <summary>
    /// Event type (progress, error, complete)
    /// </summary>
    public required string EventType { get; set; }

    /// <summary>
    /// Job status information
    /// </summary>
    public required ImportJobStatusDto JobStatus { get; set; }

    /// <summary>
    /// Timestamp when event occurred
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Request for column mapping during import preview
/// </summary>
public class ImportColumnMappingRequest
{
    /// <summary>
    /// Detected columns from file
    /// </summary>
    public required List<string> DetectedColumns { get; set; }

    /// <summary>
    /// Mapping of file columns to contact fields
    /// </summary>
    public required Dictionary<string, string> ColumnMapping { get; set; }
}

/// <summary>
/// Response with import preview data
/// </summary>
public class ImportPreviewResponse
{
    /// <summary>
    /// Detected columns from file
    /// </summary>
    public required List<string> DetectedColumns { get; set; }

    /// <summary>
    /// Sample rows for preview (first N rows)
    /// </summary>
    public required List<Dictionary<string, string?>> SampleRows { get; set; }

    /// <summary>
    /// Total estimated rows
    /// </summary>
    public int EstimatedRows { get; set; }

    /// <summary>
    /// Suggested column mappings
    /// </summary>
    public required Dictionary<string, string> SuggestedMappings { get; set; }

    /// <summary>
    /// Validation warnings/issues detected in preview
    /// </summary>
    public required List<string> ValidationWarnings { get; set; }
}