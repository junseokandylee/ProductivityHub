using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Korean Election Law Compliance Service Implementation
/// Provides real-time validation for 공직선거법, 정치자금법, and 개인정보보호법
/// </summary>
public class KoreanElectionLawComplianceService : IKoreanElectionLawComplianceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<KoreanElectionLawComplianceService> _logger;

    public KoreanElectionLawComplianceService(
        ApplicationDbContext context,
        ILogger<KoreanElectionLawComplianceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ComplianceValidationResult> ValidateMessageContentAsync(int tenantId, string content, string channel, int? campaignId = null)
    {
        var result = new ComplianceValidationResult();
        
        try
        {
            // Get active content validation rules
            var contentRules = await _context.ComplianceRules
                .Where(r => r.TenantId == tenantId && 
                           r.RuleType == ComplianceRuleTypes.CONTENT && 
                           r.IsActive)
                .OrderBy(r => r.Priority)
                .ToListAsync();

            // Validate against political terms
            var termValidation = await ValidatePoliticalTermsAsync(tenantId, content);
            if (!termValidation.IsCompliant)
            {
                result.IsCompliant = false;
                result.RecommendedAction = termValidation.RecommendedAction;
                
                foreach (var detectedTerm in termValidation.DetectedTerms)
                {
                    result.Issues.Add(new ComplianceIssue
                    {
                        RuleCode = "POLITICAL_TERM_" + detectedTerm.Term.Category,
                        LegalCategory = ComplianceRuleCategories.공직선거법,
                        Severity = detectedTerm.Severity,
                        Description = $"정치적 민감어 감지: '{detectedTerm.Term.Term}' - {detectedTerm.Term.Description}",
                        LegalReference = detectedTerm.Term.LegalReference,
                        SuggestedFix = string.Join(", ", termValidation.SuggestedAlternatives)
                    });
                }
            }

            // Validate content rules
            foreach (var rule in contentRules)
            {
                var ruleValidation = await ValidateContentAgainstRule(content, channel, rule);
                if (!ruleValidation.IsValid)
                {
                    if (rule.Action == ComplianceRuleActions.BLOCK)
                    {
                        result.IsCompliant = false;
                        result.RecommendedAction = ComplianceAction.Block;
                    }
                    else if (rule.Action == ComplianceRuleActions.WARN)
                    {
                        result.Warnings.Add(new ComplianceWarning
                        {
                            RuleCode = rule.RuleCode,
                            Description = ruleValidation.Message,
                            Recommendation = rule.RemediationSuggestion
                        });
                    }

                    result.Issues.Add(new ComplianceIssue
                    {
                        RuleCode = rule.RuleCode,
                        LegalCategory = rule.LegalCategory,
                        Severity = rule.Severity,
                        Description = ruleValidation.Message,
                        LegalReference = rule.LegalReference,
                        SuggestedFix = rule.RemediationSuggestion,
                        RequiresApproval = rule.Action == ComplianceRuleActions.ESCALATE
                    });
                }
            }

            // Check timing restrictions
            var timingValidation = await ValidateTimingAsync(tenantId, "MESSAGE_SEND");
            if (!timingValidation.IsCompliant)
            {
                result.IsCompliant = false;
                result.Issues.AddRange(timingValidation.Issues);
            }

            // Log validation if there are issues
            if (!result.IsCompliant || result.Warnings.Any())
            {
                await LogComplianceValidationAsync(tenantId, "MESSAGE_CONTENT", content, result, campaignId);
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating message content for tenant {TenantId}", tenantId);
            result.IsCompliant = false;
            result.ValidationMessage = "시스템 오류로 인한 규정 준수 검증 실패";
        }

        return result;
    }

    public async Task<PoliticalTermValidationResult> ValidatePoliticalTermsAsync(int tenantId, string content)
    {
        var result = new PoliticalTermValidationResult();

        try
        {
            // Get active political terms
            var politicalTerms = await _context.KoreanPoliticalTerms
                .Where(t => t.TenantId == tenantId && t.IsActive)
                .OrderBy(t => t.Severity == ComplianceRuleSeverity.CRITICAL ? 1 : 
                            t.Severity == ComplianceRuleSeverity.HIGH ? 2 : 3)
                .ToListAsync();

            foreach (var term in politicalTerms)
            {
                var matches = FindTermMatches(content, term);
                if (matches.Any())
                {
                    foreach (var match in matches)
                    {
                        result.DetectedTerms.Add(new DetectedPoliticalTerm
                        {
                            Term = term,
                            Context = ExtractContext(content, match.Index, 50),
                            Position = match.Index,
                            Severity = term.Severity,
                            Action = DetermineTermAction(term)
                        });
                    }

                    // Determine overall compliance
                    if (term.Category == KoreanPoliticalTermCategories.PROHIBITED ||
                        term.Severity == ComplianceRuleSeverity.CRITICAL)
                    {
                        result.IsCompliant = false;
                        result.RecommendedAction = ComplianceAction.Block;
                    }
                    else if (term.Category == KoreanPoliticalTermCategories.RESTRICTED)
                    {
                        result.RecommendedAction = ComplianceAction.RequireApproval;
                    }
                    
                    // Add suggested alternatives
                    if (!string.IsNullOrEmpty(term.SuggestedAlternatives))
                    {
                        result.SuggestedAlternatives.AddRange(
                            term.SuggestedAlternatives.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                .Select(s => s.Trim())
                        );
                    }
                }
            }

            // Log detected terms
            if (result.DetectedTerms.Any())
            {
                await LogPoliticalTermUsageAsync(tenantId, result.DetectedTerms, content);
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating political terms for tenant {TenantId}", tenantId);
            result.IsCompliant = false;
            result.ValidationMessage = "정치적 용어 검증 중 오류 발생";
        }

        return result;
    }

    public async Task<ComplianceValidationResult> ValidateSpendingAsync(int tenantId, decimal amount, string category, int? campaignId = null)
    {
        var result = new ComplianceValidationResult();

        try
        {
            // Get spending limit for category
            var spendingLimit = await _context.SpendingLimits
                .FirstOrDefaultAsync(sl => sl.TenantId == tenantId && 
                                         sl.Category == category && 
                                         sl.IsActive);

            if (spendingLimit == null)
            {
                result.Warnings.Add(new ComplianceWarning
                {
                    RuleCode = "NO_SPENDING_LIMIT",
                    Description = $"카테고리 '{category}'에 대한 지출 한도가 설정되지 않았습니다.",
                    Recommendation = "지출 한도를 설정하여 정치자금법 준수를 확인하세요."
                });
                return result;
            }

            var newTotal = spendingLimit.CurrentSpending + amount;
            var newUtilization = (newTotal / spendingLimit.MaximumAmount) * 100;

            // Check if spending would exceed limit
            if (newTotal > spendingLimit.MaximumAmount)
            {
                result.IsCompliant = false;
                result.RecommendedAction = ComplianceAction.Block;
                result.Issues.Add(new ComplianceIssue
                {
                    RuleCode = "SPENDING_LIMIT_EXCEEDED",
                    LegalCategory = ComplianceRuleCategories.정치자금법,
                    Severity = ComplianceRuleSeverity.CRITICAL,
                    Description = $"지출 한도 초과: {category} 카테고리에서 {amount:C}원 추가 지출 시 한도 {spendingLimit.MaximumAmount:C}원을 {newTotal - spendingLimit.MaximumAmount:C}원 초과",
                    LegalReference = spendingLimit.LegalReference,
                    SuggestedFix = "지출 금액을 줄이거나 다른 카테고리로 분류하세요."
                });

                // Create spending alert
                await CreateSpendingAlertAsync(spendingLimit.Id, SpendingAlertSeverity.EXCEEDED, 
                    newUtilization, newTotal, tenantId);
            }
            else if (newUtilization >= spendingLimit.CriticalThreshold)
            {
                result.Warnings.Add(new ComplianceWarning
                {
                    RuleCode = "SPENDING_CRITICAL_THRESHOLD",
                    Description = $"지출 한계점 도달: {category} 카테고리 사용률이 {newUtilization:F1}%로 임계점 {spendingLimit.CriticalThreshold}%를 초과했습니다.",
                    Recommendation = "지출 계획을 재검토하고 승인을 받으세요."
                });

                await CreateSpendingAlertAsync(spendingLimit.Id, SpendingAlertSeverity.CRITICAL, 
                    newUtilization, newTotal, tenantId);
            }
            else if (newUtilization >= spendingLimit.WarningThreshold)
            {
                result.Warnings.Add(new ComplianceWarning
                {
                    RuleCode = "SPENDING_WARNING_THRESHOLD",
                    Description = $"지출 주의: {category} 카테고리 사용률이 {newUtilization:F1}%로 경고 기준 {spendingLimit.WarningThreshold}%를 초과했습니다.",
                    Recommendation = "향후 지출 계획을 검토하세요."
                });

                await CreateSpendingAlertAsync(spendingLimit.Id, SpendingAlertSeverity.WARNING, 
                    newUtilization, newTotal, tenantId);
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating spending for tenant {TenantId}, category {Category}, amount {Amount}", 
                tenantId, category, amount);
            result.IsCompliant = false;
            result.ValidationMessage = "지출 검증 중 오류 발생";
        }

        return result;
    }

    public async Task<ComplianceValidationResult> ValidateDataUsageAsync(int tenantId, int contactId, string purpose, string dataCategories)
    {
        var result = new ComplianceValidationResult();

        try
        {
            // Check for valid consent
            var hasConsent = await _context.DataPrivacyConsents
                .AnyAsync(c => c.TenantId == tenantId && 
                              c.ContactId == contactId && 
                              c.Status == "GRANTED" && 
                              c.Purpose.Contains(purpose) &&
                              c.IsValid &&
                              c.DataRetentionExpiry > DateTime.UtcNow);

            if (!hasConsent)
            {
                result.IsCompliant = false;
                result.RecommendedAction = ComplianceAction.Block;
                result.Issues.Add(new ComplianceIssue
                {
                    RuleCode = "NO_VALID_CONSENT",
                    LegalCategory = ComplianceRuleCategories.개인정보보호법,
                    Severity = ComplianceRuleSeverity.CRITICAL,
                    Description = $"유효한 개인정보 사용 동의가 없습니다. 목적: {purpose}, 데이터 카테고리: {dataCategories}",
                    LegalReference = "개인정보보호법 제15조",
                    SuggestedFix = "유효한 동의를 획득하거나 데이터 사용을 중단하세요."
                });
            }

            // Check data retention period
            var expiredConsents = await _context.DataPrivacyConsents
                .Where(c => c.TenantId == tenantId && 
                           c.ContactId == contactId && 
                           c.DataRetentionExpiry <= DateTime.UtcNow &&
                           !c.IsDataDeleted)
                .ToListAsync();

            if (expiredConsents.Any())
            {
                result.Issues.Add(new ComplianceIssue
                {
                    RuleCode = "DATA_RETENTION_EXPIRED",
                    LegalCategory = ComplianceRuleCategories.개인정보보호법,
                    Severity = ComplianceRuleSeverity.HIGH,
                    Description = $"데이터 보관 기간이 만료된 개인정보가 {expiredConsents.Count}건 있습니다.",
                    LegalReference = "개인정보보호법 제21조",
                    SuggestedFix = "만료된 개인정보를 즉시 삭제하세요."
                });
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating data usage for tenant {TenantId}, contact {ContactId}", 
                tenantId, contactId);
            result.IsCompliant = false;
            result.ValidationMessage = "개인정보 사용 검증 중 오류 발생";
        }

        return result;
    }

    public async Task<ComplianceValidationResult> ValidateTimingAsync(int tenantId, string activityType, DateTime? scheduledTime = null)
    {
        var result = new ComplianceValidationResult();
        var checkTime = scheduledTime ?? DateTime.UtcNow;

        try
        {
            // Get timing rules
            var timingRules = await _context.ComplianceRules
                .Where(r => r.TenantId == tenantId && 
                           r.RuleType == ComplianceRuleTypes.TIMING && 
                           r.IsActive)
                .ToListAsync();

            foreach (var rule in timingRules)
            {
                var violation = await CheckTimingRule(rule, activityType, checkTime);
                if (violation != null)
                {
                    result.IsCompliant = false;
                    result.Issues.Add(new ComplianceIssue
                    {
                        RuleCode = rule.RuleCode,
                        LegalCategory = rule.LegalCategory,
                        Severity = rule.Severity,
                        Description = violation,
                        LegalReference = rule.LegalReference,
                        SuggestedFix = rule.RemediationSuggestion
                    });

                    if (rule.Action == ComplianceRuleActions.BLOCK)
                    {
                        result.RecommendedAction = ComplianceAction.Block;
                    }
                }
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating timing for tenant {TenantId}, activity {ActivityType}", 
                tenantId, activityType);
            result.IsCompliant = false;
            result.ValidationMessage = "시간 규정 검증 중 오류 발생";
        }

        return result;
    }

    public async Task<SpendingComplianceStatus> GetSpendingStatusAsync(int tenantId, string? category = null)
    {
        var status = new SpendingComplianceStatus();

        try
        {
            var query = _context.SpendingLimits
                .Where(sl => sl.TenantId == tenantId && sl.IsActive);

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(sl => sl.Category == category);
            }

            var spendingLimits = await query.Include(sl => sl.Alerts).ToListAsync();

            foreach (var limit in spendingLimits)
            {
                status.TotalSpending += limit.CurrentSpending;
                status.TotalLimit += limit.MaximumAmount;

                var categoryStatus = new SpendingCategoryStatus
                {
                    Category = limit.Category,
                    CurrentSpending = limit.CurrentSpending,
                    Limit = limit.MaximumAmount,
                    UtilizationPercentage = limit.UtilizationPercentage,
                    Status = limit.UtilizationPercentage >= limit.CriticalThreshold ? "CRITICAL" :
                            limit.UtilizationPercentage >= limit.WarningThreshold ? "WARNING" : "OK"
                };

                status.CategoryStatus.Add(categoryStatus);
                status.ActiveAlerts.AddRange(limit.Alerts.Where(a => !a.IsAcknowledged));
            }

            if (status.TotalLimit > 0)
            {
                status.UtilizationPercentage = (status.TotalSpending / status.TotalLimit) * 100;
            }

            status.IsOverLimit = status.TotalSpending > status.TotalLimit;
            status.IsNearLimit = status.UtilizationPercentage >= 80;

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting spending status for tenant {TenantId}", tenantId);
        }

        return status;
    }

    public async Task<ComplianceDashboardData> GetDashboardDataAsync(int tenantId)
    {
        var dashboard = new ComplianceDashboardData();
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        try
        {
            // Get overall metrics
            dashboard.OverallMetrics = await CalculateComplianceMetricsAsync(tenantId, fromDate, toDate);

            // Get recent violations
            dashboard.RecentViolations = await _context.ComplianceViolations
                .Where(v => v.TenantId == tenantId && v.OccurredAt >= fromDate)
                .OrderByDescending(v => v.OccurredAt)
                .Take(10)
                .Include(v => v.Rule)
                .ToListAsync();

            // Get active alerts
            dashboard.ActiveAlerts = await GetActiveAlertsAsync(tenantId);

            // Get spending status
            dashboard.SpendingStatus = await GetSpendingStatusAsync(tenantId);

            // Get category breakdown
            var categories = new[] { ComplianceRuleCategories.공직선거법, ComplianceRuleCategories.정치자금법, ComplianceRuleCategories.개인정보보호법 };
            foreach (var category in categories)
            {
                var metrics = await CalculateComplianceMetricsAsync(tenantId, fromDate, toDate, category);
                dashboard.CategoryBreakdown.Add(metrics);
            }

            // Get trends (last 7 days)
            for (int i = 6; i >= 0; i--)
            {
                var date = DateTime.UtcNow.Date.AddDays(-i);
                var nextDate = date.AddDays(1);
                
                foreach (var category in categories)
                {
                    var dayMetrics = await CalculateComplianceMetricsAsync(tenantId, date, nextDate, category);
                    dashboard.Trends.Add(new ComplianceTrend
                    {
                        Date = date,
                        Category = category,
                        CompliancePercentage = dayMetrics.CompliancePercentage,
                        ViolationCount = dayMetrics.FailedValidations
                    });
                }
            }

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard data for tenant {TenantId}", tenantId);
        }

        return dashboard;
    }

    // Helper methods

    private List<Match> FindTermMatches(string content, KoreanPoliticalTerm term)
    {
        var matches = new List<Match>();

        try
        {
            // Use regex pattern if available, otherwise exact match
            if (!string.IsNullOrEmpty(term.RegexPattern))
            {
                var regex = new Regex(term.RegexPattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                matches.AddRange(regex.Matches(content).Cast<Match>());
            }
            else
            {
                // Simple text search
                var index = content.IndexOf(term.Term, StringComparison.OrdinalIgnoreCase);
                while (index != -1)
                {
                    matches.Add(Match.Empty); // Placeholder, real implementation would create proper Match
                    index = content.IndexOf(term.Term, index + 1, StringComparison.OrdinalIgnoreCase);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error matching term {Term} with pattern {Pattern}", term.Term, term.RegexPattern);
        }

        return matches;
    }

    private string ExtractContext(string content, int position, int contextLength)
    {
        var start = Math.Max(0, position - contextLength);
        var end = Math.Min(content.Length, position + contextLength);
        return content.Substring(start, end - start);
    }

    private string DetermineTermAction(KoreanPoliticalTerm term)
    {
        return term.Category switch
        {
            KoreanPoliticalTermCategories.PROHIBITED => PoliticalTermActions.BLOCKED,
            KoreanPoliticalTermCategories.RESTRICTED => PoliticalTermActions.REQUIRES_REVIEW,
            KoreanPoliticalTermCategories.SENSITIVE => PoliticalTermActions.WARNED,
            _ => PoliticalTermActions.ALLOWED
        };
    }

    private async Task<ComplianceMetrics> CalculateComplianceMetricsAsync(int tenantId, DateTime fromDate, DateTime toDate, string? category = null)
    {
        // This is a simplified implementation - real implementation would be more complex
        var violations = await _context.ComplianceViolations
            .Where(v => v.TenantId == tenantId && 
                       v.OccurredAt >= fromDate && 
                       v.OccurredAt <= toDate)
            .ToListAsync();

        if (!string.IsNullOrEmpty(category))
        {
            violations = violations.Where(v => v.Rule?.LegalCategory == category).ToList();
        }

        return new ComplianceMetrics
        {
            Category = category ?? "전체",
            TotalValidations = 1000, // This would be calculated from actual validation logs
            PassedValidations = 950,
            FailedValidations = violations.Count,
            CompliancePercentage = violations.Count > 0 ? 95.0 : 100.0,
            CriticalViolations = violations.Count(v => v.Severity == ComplianceRuleSeverity.CRITICAL),
            HighViolations = violations.Count(v => v.Severity == ComplianceRuleSeverity.HIGH),
            MediumViolations = violations.Count(v => v.Severity == ComplianceRuleSeverity.MEDIUM),
            LowViolations = violations.Count(v => v.Severity == ComplianceRuleSeverity.LOW),
            ResolvedViolations = violations.Count(v => v.Status == ComplianceViolationStatus.RESOLVED),
            ViolationResolutionRate = violations.Any() ? 
                (double)violations.Count(v => v.Status == ComplianceViolationStatus.RESOLVED) / violations.Count * 100 : 100
        };
    }

    // Additional helper methods would be implemented here...
    private Task<(bool IsValid, string Message)> ValidateContentAgainstRule(string content, string channel, ComplianceRule rule)
    {
        // Implementation would parse the rule's ValidationConfig JSON and apply the validation logic
        return Task.FromResult((true, ""));
    }

    private Task LogComplianceValidationAsync(int tenantId, string type, string content, ComplianceValidationResult result, int? campaignId)
    {
        // Implementation would log validation results for audit purposes
        return Task.CompletedTask;
    }

    private Task LogPoliticalTermUsageAsync(int tenantId, List<DetectedPoliticalTerm> terms, string content)
    {
        // Implementation would log detected political term usage
        return Task.CompletedTask;
    }

    private Task CreateSpendingAlertAsync(int spendingLimitId, string severity, decimal percentage, decimal amount, int tenantId)
    {
        // Implementation would create spending alerts
        return Task.CompletedTask;
    }

    private Task<string?> CheckTimingRule(ComplianceRule rule, string activityType, DateTime checkTime)
    {
        // Implementation would check if the timing violates the rule
        return Task.FromResult<string?>(null);
    }

    // Placeholder implementations for interface methods not shown above
    public Task<ComplianceValidationResult> ValidateCampaignContentAsync(int tenantId, int campaignId) => throw new NotImplementedException();
    public Task UpdateSpendingAsync(int tenantId, decimal amount, string category, string description, int? campaignId = null) => throw new NotImplementedException();
    public Task<bool> HasValidConsentAsync(int tenantId, int contactId, string consentType) => throw new NotImplementedException();
    public Task RecordDataProcessingActivityAsync(int tenantId, int contactId, string activityType, string purpose, int? userId = null) => throw new NotImplementedException();
    public Task<bool> IsWithinCampaignPeriodAsync(int tenantId, DateTime checkTime) => throw new NotImplementedException();
    public Task<List<KoreanPoliticalTerm>> GetProblematicTermsAsync(int tenantId, string content) => throw new NotImplementedException();
    public Task<List<string>> SuggestAlternativeContentAsync(int tenantId, string content, List<string> problematicTerms) => throw new NotImplementedException();
    public Task<ComplianceViolation> CreateViolationAsync(ComplianceViolation violation) => throw new NotImplementedException();
    public Task<ComplianceViolation> UpdateViolationStatusAsync(int violationId, string status, string? resolution = null, int? resolvedBy = null) => throw new NotImplementedException();
    public Task<List<ComplianceViolation>> GetActiveViolationsAsync(int tenantId, string? severity = null) => throw new NotImplementedException();
    public Task<ComplianceViolation> EscalateViolationAsync(int violationId, string escalationReason) => throw new NotImplementedException();
    public Task<List<ComplianceRule>> GetActiveRulesAsync(int tenantId, string? category = null, string? ruleType = null) => throw new NotImplementedException();
    public Task<ComplianceRule> CreateRuleAsync(ComplianceRule rule) => throw new NotImplementedException();
    public Task<ComplianceRule> UpdateRuleAsync(ComplianceRule rule) => throw new NotImplementedException();
    public Task<bool> DeactivateRuleAsync(int ruleId) => throw new NotImplementedException();
    public Task<ComplianceReport> GenerateComplianceReportAsync(int tenantId, DateTime fromDate, DateTime toDate, string? category = null) => throw new NotImplementedException();
    public Task<List<ComplianceMetrics>> GetComplianceMetricsAsync(int tenantId, DateTime fromDate, DateTime toDate) => throw new NotImplementedException();
    public Task<byte[]> ExportComplianceDataAsync(int tenantId, DateTime fromDate, DateTime toDate, string format = "xlsx") => throw new NotImplementedException();
    public Task<List<ComplianceAlert>> GetActiveAlertsAsync(int tenantId) => Task.FromResult(new List<ComplianceAlert>());
    public Task NotifyComplianceViolationAsync(ComplianceViolation violation) => throw new NotImplementedException();
}