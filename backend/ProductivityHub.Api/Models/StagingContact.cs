using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Staging table for bulk contact imports using PostgreSQL COPY
/// </summary>
[Table("staging_contacts")]
public class StagingContact
{
    /// <summary>
    /// Unique identifier for staging record
    /// </summary>
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// Import job ID
    /// </summary>
    [Required]
    public Guid ImportJobId { get; set; }

    /// <summary>
    /// Tenant ID for RLS
    /// </summary>
    [Required]
    public Guid TenantId { get; set; }

    /// <summary>
    /// Row number from source file (1-based)
    /// </summary>
    public int SourceRowNumber { get; set; }

    /// <summary>
    /// Full name (required)
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Phone number (raw from file)
    /// </summary>
    [MaxLength(50)]
    public string? PhoneRaw { get; set; }

    /// <summary>
    /// Normalized phone number (E.164 format)
    /// </summary>
    [MaxLength(20)]
    public string? PhoneNormalized { get; set; }

    /// <summary>
    /// Hash of normalized phone for deduplication
    /// </summary>
    public byte[]? PhoneHash { get; set; }

    /// <summary>
    /// Encrypted phone number
    /// </summary>
    public byte[]? PhoneEncrypted { get; set; }

    /// <summary>
    /// Email address (raw from file)
    /// </summary>
    [MaxLength(200)]
    public string? EmailRaw { get; set; }

    /// <summary>
    /// Normalized email (lowercase, trimmed)
    /// </summary>
    [MaxLength(200)]
    public string? EmailNormalized { get; set; }

    /// <summary>
    /// Hash of normalized email for deduplication
    /// </summary>
    public byte[]? EmailHash { get; set; }

    /// <summary>
    /// Encrypted email address
    /// </summary>
    public byte[]? EmailEncrypted { get; set; }

    /// <summary>
    /// KakaoTalk ID (raw from file)
    /// </summary>
    [MaxLength(100)]
    public string? KakaoIdRaw { get; set; }

    /// <summary>
    /// Normalized KakaoTalk ID
    /// </summary>
    [MaxLength(100)]
    public string? KakaoIdNormalized { get; set; }

    /// <summary>
    /// Hash of normalized Kakao ID for deduplication
    /// </summary>
    public byte[]? KakaoIdHash { get; set; }

    /// <summary>
    /// Encrypted KakaoTalk ID
    /// </summary>
    public byte[]? KakaoIdEncrypted { get; set; }

    /// <summary>
    /// Notes or additional information
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Tag names to be applied (comma-separated)
    /// </summary>
    [MaxLength(1000)]
    public string? TagNames { get; set; }

    /// <summary>
    /// Whether this record is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Validation status
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string ValidationStatus { get; set; } = "valid";

    /// <summary>
    /// Validation errors (JSON array)
    /// </summary>
    public string? ValidationErrors { get; set; }

    /// <summary>
    /// Whether this record was processed successfully
    /// </summary>
    public bool IsProcessed { get; set; }

    /// <summary>
    /// Final Contact ID after merge (if successful)
    /// </summary>
    public Guid? ContactId { get; set; }

    /// <summary>
    /// When the record was staged
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the record was processed
    /// </summary>
    public DateTime? ProcessedAt { get; set; }

    // Navigation properties
    public ImportJob ImportJob { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
    public Contact? Contact { get; set; }
}

/// <summary>
/// Validation status constants
/// </summary>
public static class ValidationStatus
{
    public const string Valid = "valid";
    public const string Warning = "warning";
    public const string Error = "error";
}