using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Korean Political Terms Database for Election Law Compliance
/// Contains political terminology with legal implications for content validation
/// </summary>
public class KoreanPoliticalTerm
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    /// <summary>
    /// Korean term or phrase
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Term { get; set; } = null!;
    
    /// <summary>
    /// Term category: PROHIBITED, RESTRICTED, SENSITIVE, REQUIRES_ATTRIBUTION
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = null!;
    
    /// <summary>
    /// Subcategory for detailed classification
    /// </summary>
    [MaxLength(100)]
    public string? Subcategory { get; set; }
    
    /// <summary>
    /// Legal classification under Korean election law
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string LegalClassification { get; set; } = null!;
    
    /// <summary>
    /// Severity level: CRITICAL, HIGH, MEDIUM, LOW
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = null!;
    
    /// <summary>
    /// Description of why this term is flagged
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string Description { get; set; } = null!;
    
    /// <summary>
    /// Legal reference (법조항)
    /// </summary>
    [MaxLength(200)]
    public string? LegalReference { get; set; }
    
    /// <summary>
    /// Context in which this term is problematic
    /// </summary>
    [MaxLength(1000)]
    public string? ProblematicContext { get; set; }
    
    /// <summary>
    /// Alternative suggested terms
    /// </summary>
    [MaxLength(1000)]
    public string? SuggestedAlternatives { get; set; }
    
    /// <summary>
    /// Related terms or variations
    /// </summary>
    [MaxLength(1000)]
    public string? RelatedTerms { get; set; }
    
    /// <summary>
    /// Regular expression pattern for matching variations
    /// </summary>
    [MaxLength(500)]
    public string? RegexPattern { get; set; }
    
    /// <summary>
    /// Whether this term requires candidate attribution
    /// </summary>
    public bool RequiresAttribution { get; set; } = false;
    
    /// <summary>
    /// Whether this term is only prohibited during certain periods
    /// </summary>
    public bool HasTimingRestrictions { get; set; } = false;
    
    /// <summary>
    /// Timing restrictions configuration
    /// </summary>
    public JsonDocument? TimingRestrictions { get; set; }
    
    /// <summary>
    /// Channels where this term is restricted
    /// </summary>
    [MaxLength(500)]
    public string? ChannelRestrictions { get; set; }
    
    /// <summary>
    /// Regional variations or specific applicability
    /// </summary>
    [MaxLength(500)]
    public string? RegionalVariations { get; set; }
    
    /// <summary>
    /// Whether this term is currently active for checking
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// Source of this term entry
    /// </summary>
    [MaxLength(200)]
    public string? Source { get; set; }
    
    /// <summary>
    /// Language dialect: STANDARD, BUSAN, JEJU, etc.
    /// </summary>
    [MaxLength(50)]
    public string Dialect { get; set; } = "STANDARD";
    
    /// <summary>
    /// Formality level: FORMAL, INFORMAL, SLANG
    /// </summary>
    [MaxLength(20)]
    public string FormalityLevel { get; set; } = "FORMAL";
    
    /// <summary>
    /// Additional metadata about the term
    /// </summary>
    public JsonDocument? Metadata { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public int CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual User? UpdatedByUser { get; set; }
    public virtual ICollection<PoliticalTermUsage> UsageHistory { get; set; } = new List<PoliticalTermUsage>();
}

/// <summary>
/// Usage tracking for political terms in campaign messages
/// </summary>
public class PoliticalTermUsage
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int TermId { get; set; }
    
    /// <summary>
    /// Campaign where the term was used
    /// </summary>
    public int? CampaignId { get; set; }
    
    /// <summary>
    /// Message or content ID where term was found
    /// </summary>
    [MaxLength(100)]
    public string? ContentReference { get; set; }
    
    /// <summary>
    /// Context around the term usage
    /// </summary>
    [MaxLength(2000)]
    public string? Context { get; set; }
    
    /// <summary>
    /// Action taken: BLOCKED, WARNED, ALLOWED, ESCALATED
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Action { get; set; } = null!;
    
    /// <summary>
    /// User who was using the term
    /// </summary>
    public int? UserId { get; set; }
    
    /// <summary>
    /// Whether usage was approved by supervisor
    /// </summary>
    public bool IsApproved { get; set; } = false;
    
    /// <summary>
    /// User who approved the usage
    /// </summary>
    public int? ApprovedBy { get; set; }
    
    /// <summary>
    /// When usage was approved
    /// </summary>
    public DateTime? ApprovedAt { get; set; }
    
    /// <summary>
    /// Approval reasoning
    /// </summary>
    [MaxLength(1000)]
    public string? ApprovalReason { get; set; }
    
    /// <summary>
    /// Whether this created a compliance violation
    /// </summary>
    public bool CreatedViolation { get; set; } = false;
    
    /// <summary>
    /// Associated violation ID (if created)
    /// </summary>
    public int? ViolationId { get; set; }
    
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual KoreanPoliticalTerm Term { get; set; } = null!;
    public virtual Campaign? Campaign { get; set; }
    public virtual User? User { get; set; }
    public virtual User? ApprovedByUser { get; set; }
    public virtual ComplianceViolation? Violation { get; set; }
}

/// <summary>
/// Korean political term categories
/// </summary>
public static class KoreanPoliticalTermCategories
{
    public const string PROHIBITED = "PROHIBITED";                 // 사용금지어
    public const string RESTRICTED = "RESTRICTED";               // 제한어
    public const string SENSITIVE = "SENSITIVE";                 // 민감어
    public const string REQUIRES_ATTRIBUTION = "REQUIRES_ATTRIBUTION"; // 출처표시필요
    public const string SLANDER = "SLANDER";                     // 비방어
    public const string FALSE_INFO = "FALSE_INFO";               // 허위정보
    public const string INFLAMMATORY = "INFLAMMATORY";           // 선동어
}

/// <summary>
/// Legal classifications under Korean election law
/// </summary>
public static class KoreanLegalClassifications
{
    // 공직선거법
    public const string ELECTION_LAW_VIOLATION = "ELECTION_LAW_VIOLATION";
    public const string CANDIDATE_SLANDER = "CANDIDATE_SLANDER";
    public const string FALSE_FACT = "FALSE_FACT";
    public const string VOTE_BUYING = "VOTE_BUYING";
    public const string ILLEGAL_CAMPAIGN = "ILLEGAL_CAMPAIGN";
    
    // 정치자금법
    public const string FUNDING_VIOLATION = "FUNDING_VIOLATION";
    public const string DONATION_SOLICITATION = "DONATION_SOLICITATION";
    
    // 개인정보보호법
    public const string PRIVACY_VIOLATION = "PRIVACY_VIOLATION";
    public const string PERSONAL_INFO_MISUSE = "PERSONAL_INFO_MISUSE";
    
    // 기타
    public const string HATE_SPEECH = "HATE_SPEECH";
    public const string DISCRIMINATION = "DISCRIMINATION";
    public const string REGIONAL_BIAS = "REGIONAL_BIAS";
}

/// <summary>
/// Political term actions
/// </summary>
public static class PoliticalTermActions
{
    public const string BLOCKED = "BLOCKED";
    public const string WARNED = "WARNED";
    public const string ALLOWED = "ALLOWED";
    public const string ESCALATED = "ESCALATED";
    public const string REQUIRES_REVIEW = "REQUIRES_REVIEW";
}

/// <summary>
/// Korean dialects for term variations
/// </summary>
public static class KoreanDialects
{
    public const string STANDARD = "STANDARD";     // 표준어
    public const string BUSAN = "BUSAN";          // 부산사투리
    public const string JEJU = "JEJU";            // 제주사투리
    public const string GANGWON = "GANGWON";      // 강원도사투리
    public const string CHUNGCHEONG = "CHUNGCHEONG"; // 충청도사투리
    public const string JEOLLA = "JEOLLA";        // 전라도사투리
    public const string GYEONGSANG = "GYEONGSANG"; // 경상도사투리
}