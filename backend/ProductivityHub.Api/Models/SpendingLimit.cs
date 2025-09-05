using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Korean Election Law Spending Limit Configuration
/// Manages 정치자금법 compliance for campaign spending limits
/// </summary>
public class SpendingLimit
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    /// <summary>
    /// Election type: 대통령선거, 국회의원선거, 지방선거
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ElectionType { get; set; } = null!;
    
    /// <summary>
    /// Spending category: 광고비, 인쇄비, 교통비, 통신비, etc.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = null!;
    
    /// <summary>
    /// Subcategory for detailed tracking
    /// </summary>
    [MaxLength(100)]
    public string? Subcategory { get; set; }
    
    /// <summary>
    /// Maximum allowed spending for this category (KRW)
    /// </summary>
    public decimal MaximumAmount { get; set; }
    
    /// <summary>
    /// Current spending in this category (KRW)
    /// </summary>
    public decimal CurrentSpending { get; set; } = 0;
    
    /// <summary>
    /// Percentage of limit used (0-100)
    /// </summary>
    public decimal UtilizationPercentage { get; set; } = 0;
    
    /// <summary>
    /// Warning threshold percentage (default: 80%)
    /// </summary>
    public decimal WarningThreshold { get; set; } = 80;
    
    /// <summary>
    /// Critical threshold percentage (default: 95%)
    /// </summary>
    public decimal CriticalThreshold { get; set; } = 95;
    
    /// <summary>
    /// Reporting period: DAILY, WEEKLY, MONTHLY, QUARTERLY
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string ReportingPeriod { get; set; } = "MONTHLY";
    
    /// <summary>
    /// Currency code (default: KRW)
    /// </summary>
    [MaxLength(3)]
    public string Currency { get; set; } = "KRW";
    
    /// <summary>
    /// Legal reference for this spending limit (정치자금법 조항)
    /// </summary>
    [MaxLength(200)]
    public string? LegalReference { get; set; }
    
    /// <summary>
    /// Whether this limit is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// Campaign period start date
    /// </summary>
    public DateTime CampaignStartDate { get; set; }
    
    /// <summary>
    /// Campaign period end date
    /// </summary>
    public DateTime CampaignEndDate { get; set; }
    
    /// <summary>
    /// Last spending calculation timestamp
    /// </summary>
    public DateTime LastCalculatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Additional configuration for spending tracking
    /// </summary>
    public JsonDocument? Configuration { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public int CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual User? UpdatedByUser { get; set; }
    public virtual ICollection<SpendingTransaction> Transactions { get; set; } = new List<SpendingTransaction>();
    public virtual ICollection<SpendingAlert> Alerts { get; set; } = new List<SpendingAlert>();
}

/// <summary>
/// Individual spending transaction for compliance tracking
/// </summary>
public class SpendingTransaction
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int SpendingLimitId { get; set; }
    
    /// <summary>
    /// Associated campaign (if applicable)
    /// </summary>
    public int? CampaignId { get; set; }
    
    /// <summary>
    /// Transaction description in Korean
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = null!;
    
    /// <summary>
    /// Transaction amount (KRW)
    /// </summary>
    public decimal Amount { get; set; }
    
    /// <summary>
    /// Transaction type: MESSAGING, ADVERTISING, PERSONNEL, MATERIALS
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string TransactionType { get; set; } = null!;
    
    /// <summary>
    /// Vendor or service provider
    /// </summary>
    [MaxLength(200)]
    public string? Vendor { get; set; }
    
    /// <summary>
    /// Invoice or receipt number
    /// </summary>
    [MaxLength(100)]
    public string? InvoiceNumber { get; set; }
    
    /// <summary>
    /// Payment method used
    /// </summary>
    [MaxLength(50)]
    public string? PaymentMethod { get; set; }
    
    /// <summary>
    /// Whether this transaction is approved for spending
    /// </summary>
    public bool IsApproved { get; set; } = false;
    
    /// <summary>
    /// User who approved the transaction
    /// </summary>
    public int? ApprovedBy { get; set; }
    
    /// <summary>
    /// When the transaction was approved
    /// </summary>
    public DateTime? ApprovedAt { get; set; }
    
    /// <summary>
    /// Additional transaction metadata
    /// </summary>
    public JsonDocument? Metadata { get; set; }
    
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public int CreatedBy { get; set; }
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual SpendingLimit SpendingLimit { get; set; } = null!;
    public virtual Campaign? Campaign { get; set; }
    public virtual User CreatedByUser { get; set; } = null!;
    public virtual User? ApprovedByUser { get; set; }
}

/// <summary>
/// Spending alert for threshold violations
/// </summary>
public class SpendingAlert
{
    public int Id { get; set; }
    
    [Required]
    public int TenantId { get; set; }
    
    [Required]
    public int SpendingLimitId { get; set; }
    
    /// <summary>
    /// Alert severity: WARNING, CRITICAL, EXCEEDED
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = null!;
    
    /// <summary>
    /// Alert message in Korean
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = null!;
    
    /// <summary>
    /// Spending percentage when alert was triggered
    /// </summary>
    public decimal TriggerPercentage { get; set; }
    
    /// <summary>
    /// Actual spending amount when alert was triggered
    /// </summary>
    public decimal TriggerAmount { get; set; }
    
    /// <summary>
    /// Whether the alert has been acknowledged
    /// </summary>
    public bool IsAcknowledged { get; set; } = false;
    
    /// <summary>
    /// User who acknowledged the alert
    /// </summary>
    public int? AcknowledgedBy { get; set; }
    
    /// <summary>
    /// When the alert was acknowledged
    /// </summary>
    public DateTime? AcknowledgedAt { get; set; }
    
    /// <summary>
    /// Alert resolution notes
    /// </summary>
    [MaxLength(1000)]
    public string? ResolutionNotes { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual SpendingLimit SpendingLimit { get; set; } = null!;
    public virtual User? AcknowledgedByUser { get; set; }
}

/// <summary>
/// Korean election spending categories
/// </summary>
public static class KoreanElectionSpendingCategories
{
    public const string 광고비 = "광고비";
    public const string 인쇄비 = "인쇄비";
    public const string 교통비 = "교통비";
    public const string 통신비 = "통신비";
    public const string 집회장소사용료 = "집회장소사용료";
    public const string 선거사무소설치운영비 = "선거사무소설치운영비";
    public const string 선거운동원 = "선거운동원";
    public const string 기타비용 = "기타비용";
}

/// <summary>
/// Korean election types
/// </summary>
public static class KoreanElectionTypes
{
    public const string 대통령선거 = "대통령선거";
    public const string 국회의원선거 = "국회의원선거";
    public const string 광역의회의원선거 = "광역의회의원선거";
    public const string 기초의회의원선거 = "기초의회의원선거";
    public const string 시도지사선거 = "시도지사선거";
    public const string 시군구청장선거 = "시군구청장선거";
}

/// <summary>
/// Spending alert severity levels
/// </summary>
public static class SpendingAlertSeverity
{
    public const string WARNING = "WARNING";
    public const string CRITICAL = "CRITICAL";
    public const string EXCEEDED = "EXCEEDED";
}