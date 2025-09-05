using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Korean Personal Information Protection Act (개인정보보호법) Compliance
/// Tracks data privacy consent and usage for voter contact information
/// </summary>
public class DataPrivacyConsent
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int ContactId { get; set; }
    
    /// <summary>
    /// Consent type: CONTACT_INFO, MESSAGING, PROFILING, ANALYTICS
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ConsentType { get; set; } = null!;
    
    /// <summary>
    /// Purpose of data collection in Korean
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Purpose { get; set; } = null!;
    
    /// <summary>
    /// Legal basis: CONSENT, LEGITIMATE_INTEREST, VITAL_INTEREST, CONTRACT
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string LegalBasis { get; set; } = null!;
    
    /// <summary>
    /// Data categories covered by this consent
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string DataCategories { get; set; } = null!;
    
    /// <summary>
    /// Consent status: GRANTED, WITHDRAWN, EXPIRED, PENDING
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "PENDING";
    
    /// <summary>
    /// When consent was granted
    /// </summary>
    public DateTime? ConsentGrantedAt { get; set; }
    
    /// <summary>
    /// When consent was withdrawn (if applicable)
    /// </summary>
    public DateTime? ConsentWithdrawnAt { get; set; }
    
    /// <summary>
    /// Method of consent collection: WEB_FORM, PHONE, EMAIL, PAPER
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string CollectionMethod { get; set; } = null!;
    
    /// <summary>
    /// Source of consent (campaign, website, event)
    /// </summary>
    [MaxLength(200)]
    public string? ConsentSource { get; set; }
    
    /// <summary>
    /// IP address when consent was granted (for audit)
    /// </summary>
    [MaxLength(45)]
    public string? ConsentIpAddress { get; set; }
    
    /// <summary>
    /// User agent when consent was granted (for audit)
    /// </summary>
    [MaxLength(500)]
    public string? ConsentUserAgent { get; set; }
    
    /// <summary>
    /// Data retention period in days (per 개인정보보호법)
    /// </summary>
    public int RetentionPeriodDays { get; set; } = 365;
    
    /// <summary>
    /// When data should be deleted
    /// </summary>
    public DateTime DataRetentionExpiry { get; set; }
    
    /// <summary>
    /// Whether data has been automatically deleted
    /// </summary>
    public bool IsDataDeleted { get; set; } = false;
    
    /// <summary>
    /// When data was deleted (if applicable)
    /// </summary>
    public DateTime? DataDeletedAt { get; set; }
    
    /// <summary>
    /// Third parties that data may be shared with
    /// </summary>
    [MaxLength(1000)]
    public string? ThirdPartySharing { get; set; }
    
    /// <summary>
    /// Cross-border transfer information
    /// </summary>
    [MaxLength(500)]
    public string? CrossBorderTransfer { get; set; }
    
    /// <summary>
    /// Version of privacy policy when consent was granted
    /// </summary>
    [MaxLength(20)]
    public string? PolicyVersion { get; set; }
    
    /// <summary>
    /// Language in which consent was granted
    /// </summary>
    [MaxLength(5)]
    public string ConsentLanguage { get; set; } = "ko";
    
    /// <summary>
    /// Whether this is an opt-in (true) or opt-out (false) consent
    /// </summary>
    public bool IsOptIn { get; set; } = true;
    
    /// <summary>
    /// Whether consent is currently valid
    /// </summary>
    public bool IsValid { get; set; } = true;
    
    /// <summary>
    /// Additional consent metadata
    /// </summary>
    public JsonDocument? Metadata { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual Contact Contact { get; set; } = null!;
    public virtual User? CreatedByUser { get; set; }
    public virtual User? UpdatedByUser { get; set; }
    public virtual ICollection<DataProcessingActivity> ProcessingActivities { get; set; } = new List<DataProcessingActivity>();
    public virtual ICollection<DataPrivacyRequest> PrivacyRequests { get; set; } = new List<DataPrivacyRequest>();
}

/// <summary>
/// Data processing activity log for GDPR/PIPA compliance
/// </summary>
public class DataProcessingActivity
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int ConsentId { get; set; }
    
    /// <summary>
    /// Activity type: COLLECTION, PROCESSING, STORAGE, SHARING, DELETION
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ActivityType { get; set; } = null!;
    
    /// <summary>
    /// Purpose of the processing activity
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Purpose { get; set; } = null!;
    
    /// <summary>
    /// Data categories involved in this activity
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string DataCategories { get; set; } = null!;
    
    /// <summary>
    /// System or process that performed the activity
    /// </summary>
    [MaxLength(200)]
    public string? ProcessingSystem { get; set; }
    
    /// <summary>
    /// User who initiated the activity
    /// </summary>
    public int? InitiatedBy { get; set; }
    
    /// <summary>
    /// Third party involved (if applicable)
    /// </summary>
    [MaxLength(200)]
    public string? ThirdParty { get; set; }
    
    /// <summary>
    /// Legal basis for this specific activity
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string LegalBasis { get; set; } = null!;
    
    /// <summary>
    /// Security measures applied
    /// </summary>
    [MaxLength(1000)]
    public string? SecurityMeasures { get; set; }
    
    /// <summary>
    /// Activity result or outcome
    /// </summary>
    [MaxLength(1000)]
    public string? ActivityResult { get; set; }
    
    /// <summary>
    /// Additional activity data
    /// </summary>
    public JsonDocument? ActivityData { get; set; }
    
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual DataPrivacyConsent Consent { get; set; } = null!;
    public virtual User? InitiatedByUser { get; set; }
}

/// <summary>
/// Data subject privacy requests (개인정보 열람·정정·삭제 요청)
/// </summary>
public class DataPrivacyRequest
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int ConsentId { get; set; }
    
    /// <summary>
    /// Request type: ACCESS, RECTIFICATION, ERASURE, PORTABILITY, RESTRICTION
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string RequestType { get; set; } = null!;
    
    /// <summary>
    /// Request description in Korean
    /// </summary>
    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = null!;
    
    /// <summary>
    /// Request status: PENDING, IN_PROGRESS, COMPLETED, REJECTED
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "PENDING";
    
    /// <summary>
    /// Method of request submission
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string SubmissionMethod { get; set; } = null!;
    
    /// <summary>
    /// Contact information for response
    /// </summary>
    [MaxLength(500)]
    public string? ResponseContact { get; set; }
    
    /// <summary>
    /// Verification method used to confirm identity
    /// </summary>
    [MaxLength(100)]
    public string? VerificationMethod { get; set; }
    
    /// <summary>
    /// When identity was verified
    /// </summary>
    public DateTime? VerifiedAt { get; set; }
    
    /// <summary>
    /// User who handled the request
    /// </summary>
    public int? ProcessedBy { get; set; }
    
    /// <summary>
    /// When processing started
    /// </summary>
    public DateTime? ProcessingStartedAt { get; set; }
    
    /// <summary>
    /// When request was completed
    /// </summary>
    public DateTime? CompletedAt { get; set; }
    
    /// <summary>
    /// Response to the request in Korean
    /// </summary>
    [MaxLength(2000)]
    public string? Response { get; set; }
    
    /// <summary>
    /// Reason for rejection (if applicable)
    /// </summary>
    [MaxLength(1000)]
    public string? RejectionReason { get; set; }
    
    /// <summary>
    /// Due date for response (within 10 days per Korean law)
    /// </summary>
    public DateTime DueDate { get; set; }
    
    /// <summary>
    /// Whether response was sent on time
    /// </summary>
    public bool IsOnTime { get; set; } = true;
    
    /// <summary>
    /// Additional request metadata
    /// </summary>
    public JsonDocument? RequestData { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual DataPrivacyConsent Consent { get; set; } = null!;
    public virtual User? ProcessedByUser { get; set; }
}

/// <summary>
/// Data privacy consent types
/// </summary>
public static class DataPrivacyConsentTypes
{
    public const string CONTACT_INFO = "CONTACT_INFO";
    public const string MESSAGING = "MESSAGING";
    public const string PROFILING = "PROFILING";
    public const string ANALYTICS = "ANALYTICS";
    public const string MARKETING = "MARKETING";
    public const string RESEARCH = "RESEARCH";
}

/// <summary>
/// Legal bases for data processing (PIPA)
/// </summary>
public static class DataPrivacyLegalBasis
{
    public const string CONSENT = "CONSENT";
    public const string LEGITIMATE_INTEREST = "LEGITIMATE_INTEREST";
    public const string VITAL_INTEREST = "VITAL_INTEREST";
    public const string CONTRACT = "CONTRACT";
    public const string LEGAL_OBLIGATION = "LEGAL_OBLIGATION";
    public const string PUBLIC_TASK = "PUBLIC_TASK";
}

/// <summary>
/// Data processing activity types
/// </summary>
public static class DataProcessingActivityTypes
{
    public const string COLLECTION = "COLLECTION";
    public const string PROCESSING = "PROCESSING";
    public const string STORAGE = "STORAGE";
    public const string SHARING = "SHARING";
    public const string DELETION = "DELETION";
    public const string ACCESS = "ACCESS";
    public const string RECTIFICATION = "RECTIFICATION";
}

/// <summary>
/// Privacy request types (Korean PIPA)
/// </summary>
public static class DataPrivacyRequestTypes
{
    public const string ACCESS = "ACCESS";           // 열람권
    public const string RECTIFICATION = "RECTIFICATION"; // 정정·삭제권
    public const string ERASURE = "ERASURE";        // 처리정지권
    public const string PORTABILITY = "PORTABILITY"; // 손해배상청구권
    public const string RESTRICTION = "RESTRICTION"; // 처리제한권
}