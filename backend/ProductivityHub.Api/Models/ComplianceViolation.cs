using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Korean Election Law Compliance Violation
/// Tracks violations of election law rules with remediation status
/// </summary>
public class ComplianceViolation
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int RuleId { get; set; }
    
    /// <summary>
    /// Violation type: MESSAGE_CONTENT, SPENDING_LIMIT, PRIVACY_BREACH, TIMING_VIOLATION, etc.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ViolationType { get; set; } = null!;
    
    /// <summary>
    /// Severity of the violation: CRITICAL, HIGH, MEDIUM, LOW
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = null!;
    
    /// <summary>
    /// Description of the violation in Korean
    /// </summary>
    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = null!;
    
    /// <summary>
    /// Resource type that violated the rule
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ResourceType { get; set; } = null!;
    
    /// <summary>
    /// ID of the resource that caused the violation
    /// </summary>
    [Required]
    public int ResourceId { get; set; }
    
    /// <summary>
    /// Campaign associated with the violation (if applicable)
    /// </summary>
    public int? CampaignId { get; set; }
    
    /// <summary>
    /// User who caused the violation
    /// </summary>
    public int? UserId { get; set; }
    
    /// <summary>
    /// Violation status: ACTIVE, RESOLVED, ACKNOWLEDGED, ESCALATED
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";
    
    /// <summary>
    /// Action taken by the system: BLOCKED, WARNED, LOGGED, ESCALATED
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string ActionTaken { get; set; } = null!;
    
    /// <summary>
    /// Additional violation details and context
    /// </summary>
    public JsonDocument? ViolationData { get; set; }
    
    /// <summary>
    /// Risk score (0-100) indicating violation impact
    /// </summary>
    public int RiskScore { get; set; }
    
    /// <summary>
    /// Estimated financial penalty if reported to authorities
    /// </summary>
    public decimal? EstimatedPenalty { get; set; }
    
    /// <summary>
    /// Legal reference for the violation (법조항)
    /// </summary>
    [MaxLength(200)]
    public string? LegalReference { get; set; }
    
    /// <summary>
    /// Remediation steps taken
    /// </summary>
    [MaxLength(2000)]
    public string? RemediationSteps { get; set; }
    
    /// <summary>
    /// Resolution notes in Korean
    /// </summary>
    [MaxLength(2000)]
    public string? ResolutionNotes { get; set; }
    
    /// <summary>
    /// User who resolved the violation
    /// </summary>
    public int? ResolvedBy { get; set; }
    
    /// <summary>
    /// When the violation was resolved
    /// </summary>
    public DateTime? ResolvedAt { get; set; }
    
    /// <summary>
    /// Whether this violation requires reporting to 중앙선거관리위원회
    /// </summary>
    public bool RequiresReporting { get; set; } = false;
    
    /// <summary>
    /// Whether this violation has been reported to authorities
    /// </summary>
    public bool IsReported { get; set; } = false;
    
    /// <summary>
    /// When the violation was reported (if applicable)
    /// </summary>
    public DateTime? ReportedAt { get; set; }
    
    /// <summary>
    /// Reference number from election commission (if reported)
    /// </summary>
    [MaxLength(100)]
    public string? ReportingReference { get; set; }
    
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual ComplianceRule Rule { get; set; } = null!;
    public virtual Campaign? Campaign { get; set; }
    public virtual User? User { get; set; }
    public virtual User? ResolvedByUser { get; set; }
    public virtual ICollection<ComplianceViolationLog> ViolationLogs { get; set; } = new List<ComplianceViolationLog>();
}

/// <summary>
/// Log entries for violation resolution tracking
/// </summary>
public class ComplianceViolationLog
{
    public int Id { get; set; }
    
    [Required]
    public int ViolationId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    /// <summary>
    /// Action taken: ACKNOWLEDGED, ESCALATED, RESOLVED, REPORTED
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Action { get; set; } = null!;
    
    /// <summary>
    /// Notes about the action taken
    /// </summary>
    [MaxLength(1000)]
    public string? Notes { get; set; }
    
    /// <summary>
    /// Previous status before this action
    /// </summary>
    [MaxLength(20)]
    public string? PreviousStatus { get; set; }
    
    /// <summary>
    /// New status after this action
    /// </summary>
    [MaxLength(20)]
    public string? NewStatus { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual ComplianceViolation Violation { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

/// <summary>
/// Compliance violation types
/// </summary>
public static class ComplianceViolationTypes
{
    // 공직선거법 violations
    public const string MESSAGE_CONTENT = "MESSAGE_CONTENT";
    public const string TIMING_VIOLATION = "TIMING_VIOLATION";
    public const string CHANNEL_RESTRICTION = "CHANNEL_RESTRICTION";
    public const string CANDIDATE_IDENTIFICATION = "CANDIDATE_IDENTIFICATION";
    public const string FALSE_INFORMATION = "FALSE_INFORMATION";
    public const string SLANDER = "SLANDER";
    
    // 정치자금법 violations
    public const string SPENDING_LIMIT = "SPENDING_LIMIT";
    public const string FUNDING_SOURCE = "FUNDING_SOURCE";
    public const string EXPENDITURE_REPORTING = "EXPENDITURE_REPORTING";
    public const string DONATION_LIMIT = "DONATION_LIMIT";
    
    // 개인정보보호법 violations
    public const string PRIVACY_BREACH = "PRIVACY_BREACH";
    public const string CONSENT_VIOLATION = "CONSENT_VIOLATION";
    public const string DATA_RETENTION = "DATA_RETENTION";
    public const string UNAUTHORIZED_SHARING = "UNAUTHORIZED_SHARING";
    public const string SECURITY_BREACH = "SECURITY_BREACH";
}

/// <summary>
/// Violation status values
/// </summary>
public static class ComplianceViolationStatus
{
    public const string ACTIVE = "ACTIVE";
    public const string ACKNOWLEDGED = "ACKNOWLEDGED";
    public const string ESCALATED = "ESCALATED";
    public const string RESOLVED = "RESOLVED";
    public const string REPORTED = "REPORTED";
}

/// <summary>
/// Resource types that can have violations
/// </summary>
public static class ComplianceResourceTypes
{
    public const string CAMPAIGN = "CAMPAIGN";
    public const string MESSAGE = "MESSAGE";
    public const string CONTACT = "CONTACT";
    public const string SPENDING = "SPENDING";
    public const string USER = "USER";
    public const string DATA_PROCESSING = "DATA_PROCESSING";
}