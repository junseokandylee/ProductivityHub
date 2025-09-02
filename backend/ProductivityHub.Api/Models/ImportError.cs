using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Represents a validation error encountered during import
/// </summary>
public class ImportError
{
    /// <summary>
    /// Unique error identifier
    /// </summary>
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// Import job ID
    /// </summary>
    [Required]
    public Guid ImportJobId { get; set; }

    /// <summary>
    /// Row number (1-based) where error occurred
    /// </summary>
    public int RowNumber { get; set; }

    /// <summary>
    /// Column name or index where error occurred
    /// </summary>
    [MaxLength(100)]
    public string? Column { get; set; }

    /// <summary>
    /// Error type/category
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ErrorType { get; set; } = string.Empty;

    /// <summary>
    /// Detailed error message
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// Raw value that caused the error
    /// </summary>
    [MaxLength(500)]
    public string? RawValue { get; set; }

    /// <summary>
    /// Suggested fix or corrected value
    /// </summary>
    [MaxLength(500)]
    public string? SuggestedFix { get; set; }

    /// <summary>
    /// Error severity level
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = ImportErrorSeverity.Error;

    /// <summary>
    /// When the error was recorded
    /// </summary>
    public DateTime CreatedAt { get; set; }

    // Navigation property
    public ImportJob ImportJob { get; set; } = null!;
}

/// <summary>
/// Import error type constants
/// </summary>
public static class ImportErrorType
{
    public const string RequiredField = "required_field";
    public const string InvalidFormat = "invalid_format";
    public const string InvalidPhone = "invalid_phone";
    public const string InvalidEmail = "invalid_email";
    public const string InvalidKakaoId = "invalid_kakao_id";
    public const string DuplicateRow = "duplicate_row";
    public const string ValueTooLong = "value_too_long";
    public const string UnknownColumn = "unknown_column";
    public const string DatabaseError = "database_error";
}

/// <summary>
/// Import error severity constants
/// </summary>
public static class ImportErrorSeverity
{
    public const string Warning = "warning";
    public const string Error = "error";
    public const string Critical = "critical";
}