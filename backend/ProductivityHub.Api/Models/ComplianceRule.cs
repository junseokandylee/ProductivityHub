using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Korean Election Law Compliance Rule
/// Represents configurable validation rules for 공직선거법, 정치자금법, and 개인정보보호법
/// </summary>
public class ComplianceRule
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    /// <summary>
    /// Rule identifier for easy reference
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string RuleCode { get; set; } = null!;
    
    /// <summary>
    /// Rule name in Korean
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;
    
    /// <summary>
    /// Rule description in Korean
    /// </summary>
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Legal category: 공직선거법, 정치자금법, 개인정보보호법
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string LegalCategory { get; set; } = null!;
    
    /// <summary>
    /// Rule type: CONTENT, TIMING, SPENDING, PRIVACY, CHANNEL
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string RuleType { get; set; } = null!;
    
    /// <summary>
    /// Rule severity: CRITICAL, HIGH, MEDIUM, LOW
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = null!;
    
    /// <summary>
    /// Rule validation pattern or configuration in JSON
    /// </summary>
    public JsonDocument ValidationConfig { get; set; } = null!;
    
    /// <summary>
    /// Action to take when rule is violated: BLOCK, WARN, LOG
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Action { get; set; } = null!;
    
    /// <summary>
    /// Korean legal reference (법조항)
    /// </summary>
    [MaxLength(200)]
    public string? LegalReference { get; set; }
    
    /// <summary>
    /// Whether the rule is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// Rule applies to specific channels
    /// </summary>
    [MaxLength(500)]
    public string? ApplicableChannels { get; set; }
    
    /// <summary>
    /// Rule applies during specific periods
    /// </summary>
    public JsonDocument? TimingRestrictions { get; set; }
    
    /// <summary>
    /// Custom message to display when rule is violated
    /// </summary>
    [MaxLength(1000)]
    public string? ViolationMessage { get; set; }
    
    /// <summary>
    /// Suggested remediation actions
    /// </summary>
    [MaxLength(1000)]
    public string? RemediationSuggestion { get; set; }
    
    /// <summary>
    /// Rule priority for evaluation order
    /// </summary>
    public int Priority { get; set; } = 1;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public int CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual User? UpdatedByUser { get; set; }
    public virtual ICollection<ComplianceViolation> Violations { get; set; } = new List<ComplianceViolation>();
}

/// <summary>
/// Predefined Korean Election Law compliance rule categories
/// </summary>
public static class ComplianceRuleCategories
{
    public const string 공직선거법 = "공직선거법";
    public const string 정치자금법 = "정치자금법";
    public const string 개인정보보호법 = "개인정보보호법";
}

/// <summary>
/// Compliance rule types
/// </summary>
public static class ComplianceRuleTypes
{
    public const string CONTENT = "CONTENT";
    public const string TIMING = "TIMING";
    public const string SPENDING = "SPENDING";
    public const string PRIVACY = "PRIVACY";
    public const string CHANNEL = "CHANNEL";
    public const string IDENTIFICATION = "IDENTIFICATION";
    public const string FUNDING = "FUNDING";
}

/// <summary>
/// Rule severity levels
/// </summary>
public static class ComplianceRuleSeverity
{
    public const string CRITICAL = "CRITICAL";
    public const string HIGH = "HIGH";
    public const string MEDIUM = "MEDIUM";
    public const string LOW = "LOW";
}

/// <summary>
/// Actions to take on rule violations
/// </summary>
public static class ComplianceRuleActions
{
    public const string BLOCK = "BLOCK";
    public const string WARN = "WARN";
    public const string LOG = "LOG";
    public const string ESCALATE = "ESCALATE";
}