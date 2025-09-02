using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Models.Analytics;
using StackExchange.Redis;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// Time-series and funnel analytics controller for charting and visualization
/// </summary>
[ApiController]
[Route("api/analytics")]
[Authorize]
public class TimeSeriesAnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IDatabase _redis;
    private readonly ILogger<TimeSeriesAnalyticsController> _logger;

    public TimeSeriesAnalyticsController(
        ApplicationDbContext context,
        IConnectionMultiplexer redis,
        ILogger<TimeSeriesAnalyticsController> logger)
    {
        _context = context;
        _redis = redis.GetDatabase();
        _logger = logger;
    }

    /// <summary>
    /// Get time-series metrics for charting with customizable intervals
    /// </summary>
    [HttpGet("timeseries")]
    public async Task<IActionResult> GetTimeSeriesMetrics(
        [FromQuery, MaxTimeRangeForInterval] TimeSeriesQuery query,
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
            var cacheKey = $"timeseries:{tenantId}:{query.Scope}:{query.CampaignId}:{query.From:yyyyMMddHHmm}:{query.To:yyyyMMddHHmm}:{query.Interval}:{query.TimeZone}:{string.Join(",", query.Channels ?? Array.Empty<string>())}";
            var cachedResult = await _redis.StringGetAsync(cacheKey);
            if (cachedResult.HasValue)
            {
                return Ok(JsonSerializer.Deserialize<TimeSeriesResponse>(cachedResult!));
            }

            var response = await ComputeTimeSeriesMetrics(tenantId, query, cancellationToken);

            // Cache for 30 seconds
            await _redis.StringSetAsync(cacheKey, JsonSerializer.Serialize(response), TimeSpan.FromSeconds(30));

            return Ok(response);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, "Request timeout");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting time-series metrics for tenant {TenantId}", HttpContext.GetTenantId());
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get funnel analytics with conversion rates and drop-off analysis
    /// </summary>
    [HttpGet("funnel")]
    public async Task<IActionResult> GetFunnelMetrics(
        [FromQuery] FunnelQuery query,
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

            var response = await ComputeFunnelMetrics(tenantId, query, cancellationToken);

            return Ok(response);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, "Request timeout");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting funnel metrics for tenant {TenantId}", HttpContext.GetTenantId());
            return StatusCode(500, "Internal server error");
        }
    }

    #region Private Methods

    private async Task<TimeSeriesResponse> ComputeTimeSeriesMetrics(
        Guid tenantId,
        TimeSeriesQuery query,
        CancellationToken cancellationToken)
    {
        // Determine the PostgreSQL interval and date truncation function
        var (intervalText, truncateFormat, labelFormat) = GetIntervalConfig(query.Interval);

        // Build the time-series SQL with generate_series for complete bucket coverage
        var sql = $@"
            WITH buckets AS (
                SELECT generate_series(@from::timestamptz, @to::timestamptz, '{intervalText}'::interval) AS bucket
            ),
            agg AS (
                SELECT 
                    date_trunc('{truncateFormat}', occurred_at AT TIME ZONE @timezone) AS bucket,
                    COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                    COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                    COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                    COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                    COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                    COUNT(*) FILTER (WHERE event_type = 'Unsubscribed') AS unsubscribed,
                    COUNT(*) FILTER (WHERE event_type = 'Bounced') AS bounced,
                    COUNT(*) FILTER (WHERE event_type = 'SpamReport') AS spam_reports,
                    COALESCE(SUM(cost_amount), 0) AS total_cost
                FROM campaign_events
                WHERE tenant_id = @tenantId 
                    AND occurred_at BETWEEN @from AND @to
                    AND (@campaignId IS NULL OR campaign_id = @campaignId)
                    AND (COALESCE(@channels, ARRAY[]::text[]) = '{{}}' OR channel = ANY(@channels))
                    AND (COALESCE(@eventTypes, ARRAY[]::text[]) = '{{}}' OR event_type::text = ANY(@eventTypes))
                GROUP BY date_trunc('{truncateFormat}', occurred_at AT TIME ZONE @timezone)
            )
            SELECT 
                b.bucket,
                COALESCE(a.sent, 0) AS sent,
                COALESCE(a.delivered, 0) AS delivered,
                COALESCE(a.opened, 0) AS opened,
                COALESCE(a.clicked, 0) AS clicked,
                COALESCE(a.failed, 0) AS failed,
                COALESCE(a.unsubscribed, 0) AS unsubscribed,
                COALESCE(a.bounced, 0) AS bounced,
                COALESCE(a.spam_reports, 0) AS spam_reports,
                COALESCE(a.total_cost, 0) AS total_cost
            FROM buckets b
            LEFT JOIN agg a ON a.bucket = (b.bucket AT TIME ZONE @timezone)
            ORDER BY b.bucket";

        var parameters = new
        {
            tenantId,
            from = query.From,
            to = query.To,
            timezone = query.TimeZone,
            campaignId = query.CampaignId,
            channels = query.Channels ?? Array.Empty<string>(),
            eventTypes = query.EventTypes ?? Array.Empty<string>()
        };

        var results = await _context.Database.SqlQueryRaw<TimeSeriesResult>(sql, parameters)
            .ToListAsync(cancellationToken);

        // Process results into time buckets
        var buckets = results.Select(r => new TimeBucket
        {
            Timestamp = new DateTimeOffset(r.Bucket, TimeZoneInfo.FindSystemTimeZoneById(query.TimeZone).BaseUtcOffset),
            Label = FormatTimestampLabel(r.Bucket, labelFormat),
            Sent = r.Sent,
            Delivered = r.Delivered,
            Opened = r.Opened,
            Clicked = r.Clicked,
            Failed = r.Failed,
            Unsubscribed = r.Unsubscribed,
            Bounced = r.Bounced,
            SpamReports = r.SpamReports,
            TotalCost = r.TotalCost,
            DeliveryRate = r.Sent > 0 ? (double)r.Delivered / r.Sent * 100 : 0,
            OpenRate = r.Delivered > 0 ? (double)r.Opened / r.Delivered * 100 : 0,
            ClickRate = r.Opened > 0 ? (double)r.Clicked / r.Opened * 100 : 0
        }).ToArray();

        // Create Chart.js compatible datasets
        var datasets = new[]
        {
            new ChartDataset
            {
                Label = "Sent",
                Data = buckets.Select(b => b.Sent).ToArray(),
                BorderColor = "#3B82F6",
                BackgroundColor = "#3B82F6",
                Fill = false
            },
            new ChartDataset
            {
                Label = "Delivered",
                Data = buckets.Select(b => b.Delivered).ToArray(),
                BorderColor = "#10B981",
                BackgroundColor = "#10B981",
                Fill = false
            },
            new ChartDataset
            {
                Label = "Opened",
                Data = buckets.Select(b => b.Opened).ToArray(),
                BorderColor = "#F59E0B",
                BackgroundColor = "#F59E0B",
                Fill = false
            },
            new ChartDataset
            {
                Label = "Clicked",
                Data = buckets.Select(b => b.Clicked).ToArray(),
                BorderColor = "#8B5CF6",
                BackgroundColor = "#8B5CF6",
                Fill = false
            }
        };

        // Calculate summary statistics
        var summary = new TimeBucketSummary
        {
            TotalSent = buckets.Sum(b => b.Sent),
            TotalDelivered = buckets.Sum(b => b.Delivered),
            TotalOpened = buckets.Sum(b => b.Opened),
            TotalClicked = buckets.Sum(b => b.Clicked),
            TotalFailed = buckets.Sum(b => b.Failed),
            TotalCost = buckets.Sum(b => b.TotalCost),
            AverageDeliveryRate = buckets.Where(b => b.Sent > 0).Average(b => b.DeliveryRate),
            AverageOpenRate = buckets.Where(b => b.Delivered > 0).Average(b => b.OpenRate),
            AverageClickRate = buckets.Where(b => b.Opened > 0).Average(b => b.ClickRate)
        };

        // Find peak bucket
        var peakBucket = buckets.OrderByDescending(b => b.Sent).FirstOrDefault() ?? new TimeBucket();
        summary.PeakBucket = peakBucket;
        summary.PeakMetric = "sent";

        var metadata = new TimeSeriesMetadata
        {
            TotalBuckets = buckets.Length,
            EmptyBuckets = buckets.Count(b => b.Sent == 0),
            ActualStart = buckets.FirstOrDefault()?.Timestamp ?? query.From,
            ActualEnd = buckets.LastOrDefault()?.Timestamp ?? query.To,
            EventTypes = query.EventTypes ?? new[] { "Sent", "Delivered", "Opened", "Clicked" },
            Channels = query.Channels ?? Array.Empty<string>(),
            Summary = summary
        };

        return new TimeSeriesResponse
        {
            Scope = query.Scope,
            CampaignId = query.CampaignId,
            From = query.From,
            To = query.To,
            Interval = query.Interval,
            TimeZone = query.TimeZone,
            Datasets = datasets,
            Buckets = buckets,
            Metadata = metadata
        };
    }

    private async Task<FunnelResponse> ComputeFunnelMetrics(
        Guid tenantId,
        FunnelQuery query,
        CancellationToken cancellationToken)
    {
        // Main funnel query - overall metrics
        var mainSql = @"
            SELECT 
                COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                COUNT(*) FILTER (WHERE event_type = 'Unsubscribed') AS unsubscribed,
                COUNT(*) FILTER (WHERE event_type = 'Bounced') AS bounced
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

        var mainResult = await _context.Database.SqlQueryRaw<FunnelResult>(mainSql, parameters)
            .FirstAsync(cancellationToken);

        // Channel breakdown
        var channelSql = @"
            SELECT 
                channel,
                COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                COUNT(*) FILTER (WHERE event_type = 'Unsubscribed') AS unsubscribed,
                COUNT(*) FILTER (WHERE event_type = 'Bounced') AS bounced
            FROM campaign_events
            WHERE tenant_id = @tenantId 
                AND occurred_at BETWEEN @from AND @to
                AND (@campaignId IS NULL OR campaign_id = @campaignId)
                AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
                AND (@abGroup IS NULL OR ab_group = @abGroup)
            GROUP BY channel
            ORDER BY sent DESC";

        var channelResults = await _context.Database.SqlQueryRaw<FunnelResult>(channelSql, parameters)
            .ToListAsync(cancellationToken);

        // A/B group breakdown (if no specific group filter)
        var abGroupResults = new List<FunnelResult>();
        if (string.IsNullOrEmpty(query.AbGroup))
        {
            var abGroupSql = @"
                SELECT 
                    ab_group,
                    COUNT(*) FILTER (WHERE event_type = 'Sent') AS sent,
                    COUNT(*) FILTER (WHERE event_type = 'Delivered') AS delivered,
                    COUNT(*) FILTER (WHERE event_type = 'Opened') AS opened,
                    COUNT(*) FILTER (WHERE event_type = 'Clicked') AS clicked,
                    COUNT(*) FILTER (WHERE event_type = 'Failed') AS failed,
                    COUNT(*) FILTER (WHERE event_type = 'Unsubscribed') AS unsubscribed,
                    COUNT(*) FILTER (WHERE event_type = 'Bounced') AS bounced
                FROM campaign_events
                WHERE tenant_id = @tenantId 
                    AND occurred_at BETWEEN @from AND @to
                    AND (@campaignId IS NULL OR campaign_id = @campaignId)
                    AND (COALESCE(@channels, ARRAY[]::text[]) = '{}' OR channel = ANY(@channels))
                    AND ab_group IS NOT NULL
                GROUP BY ab_group
                ORDER BY sent DESC";

            abGroupResults = await _context.Database.SqlQueryRaw<FunnelResult>(abGroupSql, parameters)
                .ToListAsync(cancellationToken);
        }

        // Build funnel stages
        var stages = BuildFunnelStages(mainResult, query.ConversionModel);
        var channelFunnels = channelResults.Select(r => BuildChannelFunnel(r)).ToArray();
        var abGroupFunnels = abGroupResults.Select(r => BuildAbGroupFunnel(r, mainResult)).ToArray();

        // Calculate insights
        var insights = BuildFunnelInsights(stages, channelFunnels, abGroupFunnels);

        return new FunnelResponse
        {
            Scope = query.Scope,
            CampaignId = query.CampaignId,
            From = query.From,
            To = query.To,
            ConversionModel = query.ConversionModel,
            Stages = stages,
            ChannelFunnels = channelFunnels,
            AbGroupFunnels = abGroupFunnels,
            Insights = insights
        };
    }

    private static (string intervalText, string truncateFormat, string labelFormat) GetIntervalConfig(string interval)
    {
        return interval switch
        {
            "5m" => ("5 minutes", "minute", "HH:mm"),
            "1h" => ("1 hour", "hour", "MMM dd HH:00"),
            "1d" => ("1 day", "day", "MMM dd"),
            _ => ("1 hour", "hour", "MMM dd HH:00")
        };
    }

    private static string FormatTimestampLabel(DateTime timestamp, string format)
    {
        return timestamp.ToString(format);
    }

    private static FunnelStage[] BuildFunnelStages(FunnelResult result, string conversionModel)
    {
        var stages = new[]
        {
            new { Name = "sent", DisplayName = "Sent", Count = result.Sent, Order = 1, Color = "#3B82F6" },
            new { Name = "delivered", DisplayName = "Delivered", Count = result.Delivered, Order = 2, Color = "#10B981" },
            new { Name = "opened", DisplayName = "Opened", Count = result.Opened, Order = 3, Color = "#F59E0B" },
            new { Name = "clicked", DisplayName = "Clicked", Count = result.Clicked, Order = 4, Color = "#8B5CF6" }
        };

        var funnelStages = new List<FunnelStage>();
        long previousCount = 0;

        foreach (var stage in stages)
        {
            var conversionRate = conversionModel == "stepwise" && previousCount > 0
                ? (double)stage.Count / previousCount * 100
                : result.Sent > 0 ? (double)stage.Count / result.Sent * 100 : 0;

            var absoluteRate = result.Sent > 0 ? (double)stage.Count / result.Sent * 100 : 0;
            var dropOffRate = previousCount > 0 ? (double)(previousCount - stage.Count) / previousCount * 100 : 0;
            var dropOffCount = Math.Max(0, previousCount - stage.Count);

            funnelStages.Add(new FunnelStage
            {
                Name = stage.Name,
                DisplayName = stage.DisplayName,
                Count = stage.Count,
                ConversionRate = stage.Order == 1 ? 100 : conversionRate,
                AbsoluteRate = absoluteRate,
                DropOffRate = dropOffRate,
                DropOffCount = dropOffCount,
                Order = stage.Order,
                Color = stage.Color,
                Width = result.Sent > 0 ? (double)stage.Count / result.Sent : 0
            });

            previousCount = stage.Count;
        }

        return funnelStages.ToArray();
    }

    private static ChannelFunnel BuildChannelFunnel(FunnelResult result)
    {
        var stages = BuildFunnelStages(result, "stepwise");
        var overallConversion = result.Sent > 0 ? (double)result.Clicked / result.Sent * 100 : 0;
        
        var bestStage = stages.Where(s => s.Order > 1).OrderByDescending(s => s.ConversionRate).First();
        var worstStage = stages.Where(s => s.Order > 1).OrderBy(s => s.ConversionRate).First();

        return new ChannelFunnel
        {
            Channel = result.Channel ?? "Unknown",
            Stages = stages,
            OverallConversionRate = overallConversion,
            BestStage = bestStage.Name,
            WorstStage = worstStage.Name
        };
    }

    private static AbGroupFunnel BuildAbGroupFunnel(FunnelResult result, FunnelResult controlResult)
    {
        var stages = BuildFunnelStages(result, "stepwise");
        var overallConversion = result.Sent > 0 ? (double)result.Clicked / result.Sent * 100 : 0;
        var controlConversion = controlResult.Sent > 0 ? (double)controlResult.Clicked / controlResult.Sent * 100 : 0;
        var lift = controlConversion > 0 ? (overallConversion - controlConversion) / controlConversion * 100 : 0;

        return new AbGroupFunnel
        {
            AbGroup = result.AbGroup ?? "Unknown",
            Stages = stages,
            OverallConversionRate = overallConversion,
            Lift = lift,
            IsControl = result.AbGroup == "Control" || result.AbGroup == "A"
        };
    }

    private static FunnelInsights BuildFunnelInsights(FunnelStage[] stages, ChannelFunnel[] channelFunnels, AbGroupFunnel[] abGroupFunnels)
    {
        var biggestDropOff = stages.Where(s => s.Order > 1).OrderByDescending(s => s.DropOffRate).FirstOrDefault();
        var bestChannel = channelFunnels.OrderByDescending(c => c.OverallConversionRate).FirstOrDefault();
        var bestAbGroup = abGroupFunnels.OrderByDescending(a => a.OverallConversionRate).FirstOrDefault();

        var overallConversion = stages.FirstOrDefault(s => s.Name == "clicked")?.AbsoluteRate ?? 0;
        var deliveryEfficiency = stages.FirstOrDefault(s => s.Name == "delivered")?.AbsoluteRate ?? 0;
        var engagementRate = stages.FirstOrDefault(s => s.Name == "delivered")?.Count > 0 && stages.FirstOrDefault(s => s.Name == "clicked")?.Count > 0
            ? (double)stages.First(s => s.Name == "clicked").Count / stages.First(s => s.Name == "delivered").Count * 100
            : 0;

        var recommendations = new List<string>();
        if (biggestDropOff != null && biggestDropOff.DropOffRate > 50)
        {
            recommendations.Add($"Focus on improving {biggestDropOff.DisplayName.ToLower()} stage - highest drop-off at {biggestDropOff.DropOffRate:F1}%");
        }

        if (deliveryEfficiency < 90)
        {
            recommendations.Add("Improve delivery rates by reviewing message content and contact data quality");
        }

        if (engagementRate < 5)
        {
            recommendations.Add("Improve message engagement with better content and call-to-action");
        }

        return new FunnelInsights
        {
            BiggestDropOff = biggestDropOff?.Name ?? "None",
            BiggestDropOffRate = biggestDropOff?.DropOffRate ?? 0,
            BiggestDropOffCount = biggestDropOff?.DropOffCount ?? 0,
            BestPerformingChannel = bestChannel?.Channel ?? "None",
            BestChannelConversionRate = bestChannel?.OverallConversionRate ?? 0,
            BestPerformingAbGroup = bestAbGroup?.AbGroup,
            BestAbGroupConversionRate = bestAbGroup?.OverallConversionRate ?? 0,
            BestAbGroupLift = bestAbGroup?.Lift ?? 0,
            OverallConversionRate = overallConversion,
            DeliveryEfficiency = deliveryEfficiency,
            EngagementRate = engagementRate,
            Recommendations = recommendations.ToArray()
        };
    }

    #endregion
}