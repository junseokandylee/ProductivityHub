using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Korean Election Law Compliance Service Interface
/// Provides comprehensive validation for 공직선거법, 정치자금법, and 개인정보보호법
/// </summary>
public interface IKoreanElectionLawComplianceService
{
    // Message Content Validation
    Task<ComplianceValidationResult> ValidateMessageContentAsync(int tenantId, string content, string channel, int? campaignId = null);
    Task<ComplianceValidationResult> ValidateCampaignContentAsync(int tenantId, int campaignId);
    
    // Spending Compliance
    Task<ComplianceValidationResult> ValidateSpendingAsync(int tenantId, decimal amount, string category, int? campaignId = null);
    Task<SpendingComplianceStatus> GetSpendingStatusAsync(int tenantId, string? category = null);
    Task UpdateSpendingAsync(int tenantId, decimal amount, string category, string description, int? campaignId = null);
    
    // Privacy Compliance
    Task<ComplianceValidationResult> ValidateDataUsageAsync(int tenantId, int contactId, string purpose, string dataCategories);
    Task<bool> HasValidConsentAsync(int tenantId, int contactId, string consentType);
    Task RecordDataProcessingActivityAsync(int tenantId, int contactId, string activityType, string purpose, int? userId = null);
    
    // Timing Compliance
    Task<ComplianceValidationResult> ValidateTimingAsync(int tenantId, string activityType, DateTime? scheduledTime = null);
    Task<bool> IsWithinCampaignPeriodAsync(int tenantId, DateTime checkTime);
    
    // Political Terms Validation
    Task<PoliticalTermValidationResult> ValidatePoliticalTermsAsync(int tenantId, string content);
    Task<List<KoreanPoliticalTerm>> GetProblematicTermsAsync(int tenantId, string content);
    Task<List<string>> SuggestAlternativeContentAsync(int tenantId, string content, List<string> problematicTerms);
    
    // Violation Management
    Task<ComplianceViolation> CreateViolationAsync(ComplianceViolation violation);
    Task<ComplianceViolation> UpdateViolationStatusAsync(int violationId, string status, string? resolution = null, int? resolvedBy = null);
    Task<List<ComplianceViolation>> GetActiveViolationsAsync(int tenantId, string? severity = null);
    Task<ComplianceViolation> EscalateViolationAsync(int violationId, string escalationReason);
    
    // Rules Management
    Task<List<ComplianceRule>> GetActiveRulesAsync(int tenantId, string? category = null, string? ruleType = null);
    Task<ComplianceRule> CreateRuleAsync(ComplianceRule rule);
    Task<ComplianceRule> UpdateRuleAsync(ComplianceRule rule);
    Task<bool> DeactivateRuleAsync(int ruleId);
    
    // Compliance Reporting
    Task<ComplianceReport> GenerateComplianceReportAsync(int tenantId, DateTime fromDate, DateTime toDate, string? category = null);
    Task<List<ComplianceMetrics>> GetComplianceMetricsAsync(int tenantId, DateTime fromDate, DateTime toDate);
    Task<byte[]> ExportComplianceDataAsync(int tenantId, DateTime fromDate, DateTime toDate, string format = "xlsx");
    
    // Real-time Monitoring
    Task<ComplianceDashboardData> GetDashboardDataAsync(int tenantId);
    Task<List<ComplianceAlert>> GetActiveAlertsAsync(int tenantId);
    Task NotifyComplianceViolationAsync(ComplianceViolation violation);
}

/// <summary>
/// Result of compliance validation
/// </summary>
public class ComplianceValidationResult
{
    public bool IsCompliant { get; set; } = true;
    public List<ComplianceIssue> Issues { get; set; } = new List<ComplianceIssue>();
    public List<ComplianceWarning> Warnings { get; set; } = new List<ComplianceWarning>();
    public ComplianceAction RecommendedAction { get; set; } = ComplianceAction.Allow;
    public string? ValidationMessage { get; set; }
    public JsonDocument? ValidationData { get; set; }
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Individual compliance issue
/// </summary>
public class ComplianceIssue
{
    public string RuleCode { get; set; } = null!;
    public string LegalCategory { get; set; } = null!;
    public string Severity { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? LegalReference { get; set; }
    public string? SuggestedFix { get; set; }
    public bool RequiresApproval { get; set; } = false;
}

/// <summary>
/// Compliance warning (non-blocking)
/// </summary>
public class ComplianceWarning
{
    public string RuleCode { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? Recommendation { get; set; }
}

/// <summary>
/// Political term validation result
/// </summary>
public class PoliticalTermValidationResult
{
    public bool IsCompliant { get; set; } = true;
    public List<DetectedPoliticalTerm> DetectedTerms { get; set; } = new List<DetectedPoliticalTerm>();
    public List<string> SuggestedAlternatives { get; set; } = new List<string>();
    public ComplianceAction RecommendedAction { get; set; } = ComplianceAction.Allow;
    public string? ValidationMessage { get; set; }
}

/// <summary>
/// Detected political term with context
/// </summary>
public class DetectedPoliticalTerm
{
    public KoreanPoliticalTerm Term { get; set; } = null!;
    public string Context { get; set; } = null!;
    public int Position { get; set; }
    public string Severity { get; set; } = null!;
    public string Action { get; set; } = null!;
}

/// <summary>
/// Spending compliance status
/// </summary>
public class SpendingComplianceStatus
{
    public decimal TotalSpending { get; set; }
    public decimal TotalLimit { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public List<SpendingCategoryStatus> CategoryStatus { get; set; } = new List<SpendingCategoryStatus>();
    public List<SpendingAlert> ActiveAlerts { get; set; } = new List<SpendingAlert>();
    public bool IsOverLimit { get; set; }
    public bool IsNearLimit { get; set; }
}

/// <summary>
/// Spending status by category
/// </summary>
public class SpendingCategoryStatus
{
    public string Category { get; set; } = null!;
    public decimal CurrentSpending { get; set; }
    public decimal Limit { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public string Status { get; set; } = null!; // OK, WARNING, CRITICAL, EXCEEDED
}

/// <summary>
/// Compliance report
/// </summary>
public class ComplianceReport
{
    public int TenantId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public ComplianceMetrics OverallMetrics { get; set; } = null!;
    public List<ComplianceMetrics> CategoryMetrics { get; set; } = new List<ComplianceMetrics>();
    public List<ComplianceViolation> CriticalViolations { get; set; } = new List<ComplianceViolation>();
    public List<ComplianceRecommendation> Recommendations { get; set; } = new List<ComplianceRecommendation>();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Compliance metrics
/// </summary>
public class ComplianceMetrics
{
    public string Category { get; set; } = null!;
    public int TotalValidations { get; set; }
    public int PassedValidations { get; set; }
    public int FailedValidations { get; set; }
    public double CompliancePercentage { get; set; }
    public int CriticalViolations { get; set; }
    public int HighViolations { get; set; }
    public int MediumViolations { get; set; }
    public int LowViolations { get; set; }
    public int ResolvedViolations { get; set; }
    public double ViolationResolutionRate { get; set; }
}

/// <summary>
/// Compliance dashboard data
/// </summary>
public class ComplianceDashboardData
{
    public ComplianceMetrics OverallMetrics { get; set; } = null!;
    public List<ComplianceViolation> RecentViolations { get; set; } = new List<ComplianceViolation>();
    public List<ComplianceAlert> ActiveAlerts { get; set; } = new List<ComplianceAlert>();
    public SpendingComplianceStatus SpendingStatus { get; set; } = null!;
    public List<ComplianceMetrics> CategoryBreakdown { get; set; } = new List<ComplianceMetrics>();
    public List<ComplianceTrend> Trends { get; set; } = new List<ComplianceTrend>();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Compliance trend data
/// </summary>
public class ComplianceTrend
{
    public DateTime Date { get; set; }
    public string Category { get; set; } = null!;
    public double CompliancePercentage { get; set; }
    public int ViolationCount { get; set; }
}

/// <summary>
/// Compliance alert
/// </summary>
public class ComplianceAlert
{
    public string Type { get; set; } = null!;
    public string Severity { get; set; } = null!;
    public string Message { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public bool IsAcknowledged { get; set; }
    public string? ActionRequired { get; set; }
}

/// <summary>
/// Compliance recommendation
/// </summary>
public class ComplianceRecommendation
{
    public string Type { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string Priority { get; set; } = null!;
    public string? ActionPlan { get; set; }
    public DateTime? DueDate { get; set; }
}

/// <summary>
/// Compliance actions
/// </summary>
public enum ComplianceAction
{
    Allow,
    Warn,
    Block,
    RequireApproval,
    Escalate
}

/// <summary>
/// Static compliance constants
/// </summary>
public static class KoreanElectionLawConstants
{
    // Campaign periods (days before election)
    public const int CAMPAIGN_PERIOD_PRESIDENT = 22;
    public const int CAMPAIGN_PERIOD_NATIONAL_ASSEMBLY = 14;
    public const int CAMPAIGN_PERIOD_LOCAL = 14;
    
    // Spending limits (KRW) - 2024 rates
    public static readonly Dictionary<string, decimal> SPENDING_LIMITS = new()
    {
        { "대통령선거_총한도", 100_000_000_000m }, // 1000억원
        { "국회의원선거_총한도", 150_000_000m },   // 1.5억원
        { "광역의회의원선거_총한도", 50_000_000m }, // 5천만원
        { "기초의회의원선거_총한도", 30_000_000m }, // 3천만원
        { "광고비_한도", 20_000_000m },           // 2천만원
        { "통신비_한도", 10_000_000m }            // 1천만원
    };
    
    // Data retention periods (days)
    public const int DATA_RETENTION_GENERAL = 365;
    public const int DATA_RETENTION_SENSITIVE = 180;
    public const int DATA_RETENTION_MARKETING = 730;
    
    // Response timeframes (days)
    public const int PRIVACY_REQUEST_RESPONSE_TIME = 10;
    public const int VIOLATION_RESOLUTION_TIME = 7;
}