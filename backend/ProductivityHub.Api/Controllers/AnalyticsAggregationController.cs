using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Models.Analytics;
using StackExchange.Redis;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// Advanced analytics aggregation API for global and campaign-level metrics
/// </summary>
[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsAggregationController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IDatabase _redis;
    private readonly ILogger<AnalyticsAggregationController> _logger;

    public AnalyticsAggregationController(
        ApplicationDbContext context,
        IConnectionMultiplexer redis,
        ILogger<AnalyticsAggregationController> logger)
    {
        _context = context;
        _redis = redis.GetDatabase();
        _logger = logger;
    }

    /// <summary>
    /// Get analytics summary with global or campaign scope
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetAnalyticsSummary(
        [FromQuery, MaxDateRange(90)] AnalyticsQuery query, 
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Validate query parameters
            if (query.Scope == "campaign" && !query.CampaignId.HasValue)
                return BadRequest("CampaignId is required for campaign scope");

            if (query.From >= query.To)
                return BadRequest("From date must be before To date");

            // Check cache first
            var cacheKey = $"analytics_summary:{tenantId}:{query.Scope}:{query.CampaignId}:{query.From:yyyyMMdd}:{query.To:yyyyMMdd}:{string.Join(",", query.Channels ?? Array.Empty<string>())}:{query.AbGroup}";
            var cachedResult = await _redis.StringGetAsync(cacheKey);
            if (cachedResult.HasValue)
            {
                return Ok(JsonSerializer.Deserialize<AnalyticsSummaryResponse>(cachedResult!));
            }

            var response = await ComputeAnalyticsSummary(tenantId, query, cancellationToken);

            // Cache for 60 seconds
            await _redis.StringSetAsync(cacheKey, JsonSerializer.Serialize(response), TimeSpan.FromSeconds(60));

            return Ok(response);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, "Request timeout");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics summary for tenant {TenantId}", HttpContext.GetTenantId());
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get A/B test performance analytics
    /// </summary>
    [HttpGet("abtest")]
    public async Task<IActionResult> GetAbTestAnalytics(
        [FromQuery] AbTestQuery query, 
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Set default date range if not provided
            query.From ??= DateTimeOffset.UtcNow.AddDays(-30);
            query.To ??= DateTimeOffset.UtcNow;

            // Validate campaign exists and belongs to tenant
            var campaign = await _context.Campaigns
                .Where(c => c.Id == query.CampaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync(cancellationToken);

            if (campaign == null)
                return NotFound("Campaign not found");

            var response = await ComputeAbTestAnalytics(tenantId, query, cancellationToken);

            return Ok(response);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, "Request timeout");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting A/B test analytics for campaign {CampaignId}", query.CampaignId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get cost and quota analytics
    /// </summary>
    [HttpGet("cost-quota")]
    public async Task<IActionResult> GetCostQuotaAnalytics(
        [FromQuery] CostQuotaQuery query, 
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Validate query parameters
            if (query.Scope == "campaign" && !query.CampaignId.HasValue)
                return BadRequest("CampaignId is required for campaign scope");

            // Set default month/year if not provided
            var now = DateTimeOffset.UtcNow;
            query.Month ??= now.Month;
            query.Year ??= now.Year;

            var response = await ComputeCostQuotaAnalytics(tenantId, query, cancellationToken);

            return Ok(response);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, "Request timeout");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cost quota analytics for tenant {TenantId}", HttpContext.GetTenantId());
            return StatusCode(500, "Internal server error");
        }
    }

    #region Private Methods

    private async Task<AnalyticsSummaryResponse> ComputeAnalyticsSummary(
        Guid tenantId, 
        AnalyticsQuery query, 
        CancellationToken cancellationToken)
    {
        // Build the main KPI aggregation SQL
        var sql = @"
            SELECT 
                COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                COUNT(*) FILTER (WHERE event_type = 'Unsubscribed') AS unsubscribed,
                COUNT(*) FILTER (WHERE event_type = 'Bounced') AS bounced,
                COUNT(*) FILTER (WHERE event_type = 'SpamReport') AS spam_reports,
                COALESCE(SUM(cost_amount), 0) AS total_cost,
                COUNT(DISTINCT campaign_id) AS unique_campaigns,
                COUNT(DISTINCT contact_id) AS unique_contacts
            FROM campaign_events 
            WHERE tenant_id = @tenantId 
                AND occurred_at BETWEEN @from AND @to
                AND (@campaignId IS NULL OR campaign_id = @campaignId)
                AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
                AND (@abGroup IS NULL OR ab_group = @abGroup)";

        var parameters = new
        {
            tenantId,
            from = query.From,
            to = query.To,
            campaignId = query.CampaignId,
            channels = query.Channels ?? Array.Empty<string>(),
            abGroup = query.AbGroup
        };

        // Execute main aggregation
        var kpi = await _context.Database.SqlQueryRaw<KpiResult>(sql, parameters).FirstAsync(cancellationToken);

        // Get channel breakdown
        var channelSql = @"
            SELECT 
                channel,
                COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                COALESCE(SUM(cost_amount), 0) AS cost
            FROM campaign_events 
            WHERE tenant_id = @tenantId 
                AND occurred_at BETWEEN @from AND @to
                AND (@campaignId IS NULL OR campaign_id = @campaignId)
                AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
                AND (@abGroup IS NULL OR ab_group = @abGroup)
            GROUP BY channel
            ORDER BY sent DESC";

        var channelResults = await _context.Database.SqlQueryRaw<ChannelResult>(channelSql, parameters).ToListAsync(cancellationToken);

        // Get failure breakdown
        var failureSql = @"
            SELECT 
                failure_code,
                failure_reason,
                COUNT(*) AS count
            FROM campaign_events 
            WHERE tenant_id = @tenantId 
                AND occurred_at BETWEEN @from AND @to
                AND event_type = 'Failed'
                AND (@campaignId IS NULL OR campaign_id = @campaignId)
                AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
                AND (@abGroup IS NULL OR ab_group = @abGroup)
                AND failure_code IS NOT NULL
            GROUP BY failure_code, failure_reason
            ORDER BY count DESC
            LIMIT 10";

        var failureResults = await _context.Database.SqlQueryRaw<FailureResult>(failureSql, parameters).ToListAsync(cancellationToken);

        // Build response
        var analyticsKpi = new AnalyticsKpi
        {
            Sent = kpi.Sent,
            Delivered = kpi.Delivered,
            Opened = kpi.Opened,
            Clicked = kpi.Clicked,
            Failed = kpi.Failed,
            Unsubscribed = kpi.Unsubscribed,
            Bounced = kpi.Bounced,
            SpamReports = kpi.SpamReports,
            TotalCost = kpi.TotalCost,
            UniqueCampaigns = kpi.UniqueCampaigns,
            UniqueContacts = kpi.UniqueContacts
        };

        var rates = ComputeRates(analyticsKpi);

        var channelBreakdowns = channelResults.Select(c => new ChannelBreakdown
        {
            Channel = c.Channel,
            Sent = c.Sent,
            Delivered = c.Delivered,
            Opened = c.Opened,
            Clicked = c.Clicked,
            Failed = c.Failed,
            Cost = c.Cost,
            DeliveryRate = c.Sent > 0 ? (double)c.Delivered / c.Sent * 100 : 0,
            OpenRate = c.Delivered > 0 ? (double)c.Opened / c.Delivered * 100 : 0,
            ClickRate = c.Opened > 0 ? (double)c.Clicked / c.Opened * 100 : 0
        }).ToArray();

        var totalFailed = failureResults.Sum(f => f.Count);
        var failureBreakdowns = failureResults.Select(f => new FailureBreakdown
        {
            FailureCode = f.FailureCode,
            FailureReason = f.FailureReason,
            Count = f.Count,
            Percentage = totalFailed > 0 ? (double)f.Count / totalFailed * 100 : 0
        }).ToArray();

        return new AnalyticsSummaryResponse
        {
            Scope = query.Scope,
            CampaignId = query.CampaignId,
            From = query.From,
            To = query.To,
            Kpi = analyticsKpi,
            Rates = rates,
            ChannelBreakdowns = channelBreakdowns,
            FailureBreakdowns = failureBreakdowns
        };
    }

    private async Task<AbTestAnalyticsResponse> ComputeAbTestAnalytics(
        Guid tenantId, 
        AbTestQuery query, 
        CancellationToken cancellationToken)
    {
        // Get campaign variants
        var variants = await _context.CampaignVariants
            .Where(cv => cv.TenantId == tenantId && cv.CampaignId == query.CampaignId)
            .ToListAsync(cancellationToken);

        // Get performance data for each variant
        var sql = @"
            SELECT 
                ab_group,
                COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                COUNT(*) FILTER (WHERE event_type = 'Unsubscribed') AS unsubscribed,
                COALESCE(SUM(cost_amount), 0) AS total_cost,
                COUNT(DISTINCT contact_id) AS unique_recipients
            FROM campaign_events 
            WHERE tenant_id = @tenantId 
                AND campaign_id = @campaignId
                AND occurred_at BETWEEN @from AND @to
                AND ab_group IS NOT NULL
                AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
            GROUP BY ab_group
            ORDER BY ab_group";

        var parameters = new
        {
            tenantId,
            campaignId = query.CampaignId,
            from = query.From!.Value,
            to = query.To!.Value,
            channels = query.Channels ?? Array.Empty<string>()
        };

        var performanceResults = await _context.Database.SqlQueryRaw<VariantResult>(sql, parameters).ToListAsync(cancellationToken);

        // Build variant responses
        var variantResponses = variants.Select(v =>
        {
            var perf = performanceResults.FirstOrDefault(p => p.AbGroup == v.Label);
            if (perf == null)
            {
                return new AbTestVariant
                {
                    Label = v.Label,
                    Description = v.Description,
                    AllocationPercentage = v.AllocationPercentage,
                    IsActive = v.IsActive
                };
            }

            return new AbTestVariant
            {
                Label = v.Label,
                Description = v.Description,
                AllocationPercentage = v.AllocationPercentage,
                IsActive = v.IsActive,
                Sent = perf.Sent,
                Delivered = perf.Delivered,
                Opened = perf.Opened,
                Clicked = perf.Clicked,
                Failed = perf.Failed,
                Unsubscribed = perf.Unsubscribed,
                DeliveryRate = perf.Sent > 0 ? (double)perf.Delivered / perf.Sent * 100 : 0,
                OpenRate = perf.Delivered > 0 ? (double)perf.Opened / perf.Delivered * 100 : 0,
                ClickRate = perf.Opened > 0 ? (double)perf.Clicked / perf.Opened * 100 : 0,
                FailureRate = perf.Sent > 0 ? (double)perf.Failed / perf.Sent * 100 : 0,
                TotalCost = perf.TotalCost,
                CostPerSent = perf.Sent > 0 ? perf.TotalCost / perf.Sent : 0,
                CostPerDelivered = perf.Delivered > 0 ? perf.TotalCost / perf.Delivered : 0,
                CostPerClick = perf.Clicked > 0 ? perf.TotalCost / perf.Clicked : 0,
                UniqueRecipients = perf.UniqueRecipients
            };
        }).ToArray();

        // Compute summary
        var summary = ComputeAbTestSummary(variantResponses);

        return new AbTestAnalyticsResponse
        {
            CampaignId = query.CampaignId,
            From = query.From!.Value,
            To = query.To!.Value,
            Variants = variantResponses,
            Summary = summary
        };
    }

    private async Task<CostQuotaResponse> ComputeCostQuotaAnalytics(
        Guid tenantId, 
        CostQuotaQuery query, 
        CancellationToken cancellationToken)
    {
        var startOfMonth = new DateTimeOffset(query.Year!.Value, query.Month!.Value, 1, 0, 0, 0, TimeSpan.Zero);
        var endOfMonth = startOfMonth.AddMonths(1);
        var now = DateTimeOffset.UtcNow;

        // Get cost breakdown
        var costSql = @"
            SELECT 
                channel,
                COALESCE(SUM(cost_amount), 0) AS cost,
                COUNT(*) AS message_count
            FROM campaign_events 
            WHERE tenant_id = @tenantId 
                AND occurred_at BETWEEN @startOfMonth AND @endOfMonth
                AND event_type = 'Sent'
                AND (@campaignId IS NULL OR campaign_id = @campaignId)
                AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
            GROUP BY channel
            ORDER BY cost DESC";

        var costParameters = new
        {
            tenantId,
            startOfMonth,
            endOfMonth,
            campaignId = query.CampaignId,
            channels = query.Channels ?? Array.Empty<string>()
        };

        var costResults = await _context.Database.SqlQueryRaw<CostResult>(costSql, costParameters).ToListAsync(cancellationToken);

        var totalCost = costResults.Sum(c => c.Cost);
        var totalMessages = costResults.Sum(c => c.MessageCount);

        // Get quota information (this would typically come from tenant configuration)
        // For now, using hardcoded values - should be moved to tenant settings
        var monthlyLimit = 100000L; // Should come from tenant configuration
        var monthToDateUsage = totalMessages;

        var totalCostBreakdown = new CostBreakdown
        {
            Total = totalCost,
            Currency = "KRW",
            TotalMessages = totalMessages,
            AverageCostPerMessage = totalMessages > 0 ? totalCost / totalMessages : 0,
            PeriodStart = startOfMonth,
            PeriodEnd = endOfMonth
        };

        var channelCosts = costResults.Select(c => new ChannelCost
        {
            Channel = c.Channel,
            Cost = c.Cost,
            MessageCount = c.MessageCount,
            AverageCostPerMessage = c.MessageCount > 0 ? c.Cost / c.MessageCount : 0,
            PercentageOfTotal = totalCost > 0 ? (double)(c.Cost / totalCost) * 100 : 0
        }).ToArray();

        var daysInMonth = DateTime.DaysInMonth(query.Year!.Value, query.Month!.Value);
        var daysRemaining = Math.Max(0, daysInMonth - now.Day);
        var dailyAverage = now.Day > 0 ? (double)monthToDateUsage / now.Day : 0;

        var quotaUsage = new QuotaUsage
        {
            MonthlyLimit = monthlyLimit,
            MonthToDateUsage = monthToDateUsage,
            RemainingQuota = Math.Max(0, monthlyLimit - monthToDateUsage),
            UsagePercentage = monthlyLimit > 0 ? (double)monthToDateUsage / monthlyLimit * 100 : 0,
            DaysRemainingInMonth = daysRemaining,
            DailyAverageUsage = dailyAverage,
            ProjectedMonthEndUsage = (long)(dailyAverage * daysInMonth),
            IsOverQuota = monthToDateUsage > monthlyLimit,
            IsNearQuota = monthToDateUsage > monthlyLimit * 0.8,
            ChannelQuotas = channelCosts.Select(c => new QuotaChannel
            {
                Channel = c.Channel,
                Limit = monthlyLimit / 2, // Simplified - should be per-channel limits
                Used = c.MessageCount,
                Remaining = Math.Max(0, monthlyLimit / 2 - c.MessageCount),
                UsagePercentage = (double)c.MessageCount / (monthlyLimit / 2) * 100
            }).ToArray()
        };

        var projection = new CostProjection
        {
            ProjectedMonthEndCost = (decimal)(dailyAverage * daysInMonth * ((double)totalCost / Math.Max(1, totalMessages))),
            ProjectedOverage = 0, // Would calculate based on cost limits
            ProjectionBasis = "current_pace",
            ConfidenceLevel = now.Day >= 7 ? 0.8 : 0.5
        };

        return new CostQuotaResponse
        {
            Scope = query.Scope,
            CampaignId = query.CampaignId,
            Month = query.Month!.Value,
            Year = query.Year!.Value,
            TotalCost = totalCostBreakdown,
            ChannelCosts = channelCosts,
            QuotaUsage = quotaUsage,
            Projection = projection
        };
    }

    private static AnalyticsRates ComputeRates(AnalyticsKpi kpi)
    {
        return new AnalyticsRates
        {
            DeliveryRate = kpi.Sent > 0 ? (double)kpi.Delivered / kpi.Sent * 100 : 0,
            OpenRate = kpi.Delivered > 0 ? (double)kpi.Opened / kpi.Delivered * 100 : 0,
            ClickRate = kpi.Opened > 0 ? (double)kpi.Clicked / kpi.Opened * 100 : 0,
            ClickThroughRate = kpi.Delivered > 0 ? (double)kpi.Clicked / kpi.Delivered * 100 : 0,
            FailureRate = kpi.Sent > 0 ? (double)kpi.Failed / kpi.Sent * 100 : 0,
            UnsubscribeRate = kpi.Delivered > 0 ? (double)kpi.Unsubscribed / kpi.Delivered * 100 : 0,
            BounceRate = kpi.Sent > 0 ? (double)kpi.Bounced / kpi.Sent * 100 : 0,
            SpamRate = kpi.Delivered > 0 ? (double)kpi.SpamReports / kpi.Delivered * 100 : 0
        };
    }

    private static AbTestSummary ComputeAbTestSummary(AbTestVariant[] variants)
    {
        var activeVariants = variants.Where(v => v.IsActive && v.Sent > 0).ToArray();
        
        if (activeVariants.Length == 0)
        {
            return new AbTestSummary
            {
                TotalVariants = variants.Length,
                ActiveVariants = 0,
                StatisticalNote = "No active variants with data"
            };
        }

        // Find best performing variant
        var bestByClickRate = activeVariants.OrderByDescending(v => v.ClickRate).First();
        var bestByOpenRate = activeVariants.OrderByDescending(v => v.OpenRate).First();
        var bestByDeliveryRate = activeVariants.OrderByDescending(v => v.DeliveryRate).First();

        // Simplified significance check (in production, use proper statistical tests)
        var hasSignificance = activeVariants.All(v => v.Sent >= 100) && activeVariants.Length >= 2;

        return new AbTestSummary
        {
            TotalVariants = variants.Length,
            ActiveVariants = activeVariants.Length,
            BestPerformingVariant = bestByClickRate.Label,
            BestMetric = "click_rate",
            BestValue = bestByClickRate.ClickRate,
            HasStatisticalSignificance = hasSignificance,
            StatisticalNote = hasSignificance 
                ? "Sufficient sample size for statistical analysis" 
                : "Insufficient sample size for statistical significance"
        };
    }

    #endregion

    #region Result DTOs

    private class KpiResult
    {
        public long Sent { get; set; }
        public long Delivered { get; set; }
        public long Opened { get; set; }
        public long Clicked { get; set; }
        public long Failed { get; set; }
        public long Unsubscribed { get; set; }
        public long Bounced { get; set; }
        public long SpamReports { get; set; }
        public decimal TotalCost { get; set; }
        public int UniqueCampaigns { get; set; }
        public int UniqueContacts { get; set; }
    }

    private class ChannelResult
    {
        public string Channel { get; set; } = string.Empty;
        public long Sent { get; set; }
        public long Delivered { get; set; }
        public long Opened { get; set; }
        public long Clicked { get; set; }
        public long Failed { get; set; }
        public decimal Cost { get; set; }
    }

    private class FailureResult
    {
        public string? FailureCode { get; set; }
        public string? FailureReason { get; set; }
        public long Count { get; set; }
    }

    private class VariantResult
    {
        public string AbGroup { get; set; } = string.Empty;
        public long Sent { get; set; }
        public long Delivered { get; set; }
        public long Opened { get; set; }
        public long Clicked { get; set; }
        public long Failed { get; set; }
        public long Unsubscribed { get; set; }
        public decimal TotalCost { get; set; }
        public int UniqueRecipients { get; set; }
    }

    private class CostResult
    {
        public string Channel { get; set; } = string.Empty;
        public decimal Cost { get; set; }
        public long MessageCount { get; set; }
    }

    #endregion
}