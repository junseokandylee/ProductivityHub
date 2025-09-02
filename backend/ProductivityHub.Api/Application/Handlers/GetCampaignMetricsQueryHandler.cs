using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Services;
using System.Text.Json;

namespace ProductivityHub.Api.Application.Handlers;

/// <summary>
/// Handler for retrieving campaign metrics with Redis-first caching strategy
/// </summary>
public class GetCampaignMetricsQueryHandler : IRequestHandler<GetCampaignMetricsQuery, CampaignMetricsResponse?>
{
    private readonly ApplicationDbContext _context;
    private readonly IRedisService _redis;
    private readonly IAlertEvaluationService _alertService;
    private readonly ILogger<GetCampaignMetricsQueryHandler> _logger;
    private readonly TimeSpan _cacheTimeout;

    public GetCampaignMetricsQueryHandler(
        ApplicationDbContext context,
        IRedisService redis,
        IAlertEvaluationService alertService,
        ILogger<GetCampaignMetricsQueryHandler> logger)
    {
        _context = context;
        _redis = redis;
        _alertService = alertService;
        _logger = logger;
        
        // Cache TTL from environment or default to 30 seconds for real-time feel
        _cacheTimeout = TimeSpan.FromSeconds(
            int.TryParse(Environment.GetEnvironmentVariable("CAMPAIGN_METRICS_CACHE_TTL_SECONDS"), out var ttl) 
                ? ttl : 30);
    }

    public async Task<CampaignMetricsResponse?> Handle(GetCampaignMetricsQuery request, CancellationToken cancellationToken)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            // First, try to get from Redis cache
            var cacheKey = $"campaign:metrics:{request.CampaignId}";
            var cachedData = await _redis.GetAsync(cacheKey);
            
            if (!string.IsNullOrEmpty(cachedData))
            {
                try
                {
                    var cached = JsonSerializer.Deserialize<CachedMetricsData>(cachedData);
                    if (cached != null && IsValidCache(cached))
                    {
                        var response = await BuildResponseFromCache(cached, request, cancellationToken);
                        if (response != null)
                        {
                            stopwatch.Stop();
                            _logger.LogDebug("Campaign metrics served from cache in {ElapsedMs}ms for campaign {CampaignId}", 
                                stopwatch.ElapsedMilliseconds, request.CampaignId);
                            return response;
                        }
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize cached metrics for campaign {CampaignId}", request.CampaignId);
                }
            }

            // Cache miss or stale - query database
            var dbResponse = await QueryFromDatabase(request, cancellationToken);
            if (dbResponse == null)
            {
                return null; // Campaign not found or not in tenant
            }

            // Cache the fresh data
            await CacheMetricsData(cacheKey, dbResponse, cancellationToken);
            
            stopwatch.Stop();
            _logger.LogInformation("Campaign metrics served from database in {ElapsedMs}ms for campaign {CampaignId}", 
                stopwatch.ElapsedMilliseconds, request.CampaignId);
            
            return dbResponse;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error retrieving metrics for campaign {CampaignId} (elapsed: {ElapsedMs}ms)", 
                request.CampaignId, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    /// <summary>
    /// Builds response from cached data, optionally querying time series if not included
    /// </summary>
    private async Task<CampaignMetricsResponse?> BuildResponseFromCache(
        CachedMetricsData cached, 
        GetCampaignMetricsQuery request, 
        CancellationToken cancellationToken)
    {
        TimeSeriesPoint[]? timeseries = null;
        
        if (request.IncludeTimeseries)
        {
            // Check if cached timeseries matches requested window
            if (cached.TimeseriesWindowMinutes == request.WindowMinutes && cached.Timeseries != null)
            {
                timeseries = cached.Timeseries;
            }
            else
            {
                // Need to query fresh timeseries for different window
                timeseries = await QueryTimeSeries(request.CampaignId, request.TenantId, request.GetWindowStart(), cancellationToken);
            }
        }

        // Get alert information (not cached, always fresh)
        var alertInfo = await GetAlertInfo(request.TenantId, request.CampaignId, cancellationToken);

        return new CampaignMetricsResponse(
            Totals: cached.Totals,
            Rates: cached.Rates,
            Channels: cached.Channels,
            Timeseries: timeseries,
            Alert: alertInfo,
            UpdatedAt: cached.UpdatedAt
        );
    }

    /// <summary>
    /// Queries fresh metrics data from PostgreSQL
    /// </summary>
    private async Task<CampaignMetricsResponse?> QueryFromDatabase(GetCampaignMetricsQuery request, CancellationToken cancellationToken)
    {
        // Query aggregate metrics with tenant isolation
        var aggregateMetrics = await _context.CampaignMetrics
            .Where(c => c.CampaignId == request.CampaignId && c.TenantId == request.TenantId)
            .Select(c => new
            {
                c.SentTotal,
                c.DeliveredTotal,
                c.FailedTotal,
                c.OpenTotal,
                c.ClickTotal,
                c.SmsSent,
                c.SmsDelivered,
                c.SmsFailed,
                c.KakaoSent,
                c.KakaoDelivered,
                c.KakaoFailed,
                c.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (aggregateMetrics == null)
        {
            // Check if campaign exists in tenant (for proper 404 vs 403)
            var campaignExists = await _context.Campaigns
                .AnyAsync(c => c.Id == request.CampaignId && c.TenantId == request.TenantId, cancellationToken);
                
            if (!campaignExists)
            {
                return null; // Campaign not found in tenant
            }

            // Campaign exists but no metrics yet - return zeros
            var totals = new CampaignMetricsTotals(0, 0, 0, 0, 0);
            var alertData = await GetAlertInfo(request.TenantId, request.CampaignId, cancellationToken);
            
            return new CampaignMetricsResponse(
                Totals: totals,
                Rates: CampaignMetricsRates.FromTotals(totals),
                Channels: new CampaignMetricsChannels(
                    Sms: new ChannelMetrics(0, 0, 0),
                    Kakao: new ChannelMetrics(0, 0, 0)
                ),
                Timeseries: request.IncludeTimeseries ? Array.Empty<TimeSeriesPoint>() : null,
                Alert: alertData,
                UpdatedAt: DateTime.UtcNow
            );
        }

        // Build totals and rates
        var responseTotals = new CampaignMetricsTotals(
            Sent: aggregateMetrics.SentTotal,
            Delivered: aggregateMetrics.DeliveredTotal,
            Failed: aggregateMetrics.FailedTotal,
            Open: aggregateMetrics.OpenTotal,
            Click: aggregateMetrics.ClickTotal
        );

        var rates = CampaignMetricsRates.FromTotals(responseTotals);

        var channels = new CampaignMetricsChannels(
            Sms: new ChannelMetrics(
                Sent: aggregateMetrics.SmsSent,
                Delivered: aggregateMetrics.SmsDelivered,
                Failed: aggregateMetrics.SmsFailed
            ),
            Kakao: new ChannelMetrics(
                Sent: aggregateMetrics.KakaoSent,
                Delivered: aggregateMetrics.KakaoDelivered,
                Failed: aggregateMetrics.KakaoFailed
            )
        );

        // Query time series if requested
        TimeSeriesPoint[]? timeseries = null;
        if (request.IncludeTimeseries)
        {
            timeseries = await QueryTimeSeries(request.CampaignId, request.TenantId, request.GetWindowStart(), cancellationToken);
        }

        // Get alert information
        var alertInfo = await GetAlertInfo(request.TenantId, request.CampaignId, cancellationToken);

        return new CampaignMetricsResponse(
            Totals: responseTotals,
            Rates: rates,
            Channels: channels,
            Timeseries: timeseries,
            Alert: alertInfo,
            UpdatedAt: aggregateMetrics.UpdatedAt
        );
    }

    /// <summary>
    /// Queries time series data for the specified window
    /// </summary>
    private async Task<TimeSeriesPoint[]> QueryTimeSeries(Guid campaignId, Guid tenantId, DateTime windowStart, CancellationToken cancellationToken)
    {
        var timeSeriesData = await _context.CampaignMetricsMinutes
            .Where(m => m.CampaignId == campaignId && 
                       m.TenantId == tenantId && 
                       m.BucketMinute >= windowStart)
            .OrderBy(m => m.BucketMinute)
            .ToArrayAsync(cancellationToken);

        return timeSeriesData.Select(TimeSeriesPoint.FromMinuteMetrics).ToArray();
    }

    /// <summary>
    /// Gets alert information for a campaign, trying Redis cache first
    /// </summary>
    private async Task<CampaignAlertInfo> GetAlertInfo(Guid tenantId, Guid campaignId, CancellationToken cancellationToken)
    {
        try
        {
            // Try Redis cache first for faster response
            var alertCacheKey = $"campaign:alert:{campaignId}";
            var cachedAlert = await _redis.GetAsync(alertCacheKey);
            
            if (!string.IsNullOrEmpty(cachedAlert))
            {
                try
                {
                    var alertData = JsonSerializer.Deserialize<CachedAlertData>(cachedAlert);
                    if (alertData != null)
                    {
                        return new CampaignAlertInfo(
                            Triggered: alertData.Triggered,
                            FailureRate: alertData.FailureRate,
                            Threshold: alertData.Threshold,
                            WindowSeconds: alertData.WindowSeconds,
                            LastTriggeredAt: alertData.LastTriggeredAt,
                            LastClearedAt: alertData.LastClearedAt,
                            LastEvaluatedAt: alertData.LastEvaluatedAt
                        );
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize cached alert data for campaign {CampaignId}", campaignId);
                }
            }

            // Cache miss or error - evaluate fresh alert data
            var alertResult = await _alertService.EvaluateAlertAsync(tenantId, campaignId, cancellationToken);
            return CampaignAlertInfo.FromEvaluationResult(alertResult);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting alert info for campaign {CampaignId}, returning default", campaignId);
            return CampaignAlertInfo.Default();
        }
    }

    /// <summary>
    /// Caches metrics data in Redis with TTL
    /// </summary>
    private async Task CacheMetricsData(string cacheKey, CampaignMetricsResponse response, CancellationToken cancellationToken)
    {
        try
        {
            var cacheData = new CachedMetricsData
            {
                Totals = response.Totals,
                Rates = response.Rates,
                Channels = response.Channels,
                Timeseries = response.Timeseries,
                TimeseriesWindowMinutes = response.Timeseries?.Length > 0 ? CalculateWindowMinutes(response.Timeseries) : null,
                UpdatedAt = response.UpdatedAt,
                CachedAt = DateTime.UtcNow
            };

            var serialized = JsonSerializer.Serialize(cacheData);
            await _redis.SetAsync(cacheKey, serialized, _cacheTimeout);
        }
        catch (Exception ex)
        {
            // Don't fail the request if caching fails
            _logger.LogWarning(ex, "Failed to cache metrics data for key {CacheKey}", cacheKey);
        }
    }

    /// <summary>
    /// Calculates the window minutes from timeseries data
    /// </summary>
    private static int? CalculateWindowMinutes(TimeSeriesPoint[] timeseries)
    {
        if (timeseries.Length < 2) return null;
        
        var span = timeseries[^1].T - timeseries[0].T;
        return (int)Math.Ceiling(span.TotalMinutes);
    }

    /// <summary>
    /// Checks if cached data is still valid
    /// </summary>
    private bool IsValidCache(CachedMetricsData cached)
    {
        // Cache is invalid if older than TTL
        return DateTime.UtcNow - cached.CachedAt < _cacheTimeout;
    }
}

/// <summary>
/// Cached metrics data structure for Redis storage
/// </summary>
internal record CachedMetricsData
{
    public required CampaignMetricsTotals Totals { get; init; }
    public required CampaignMetricsRates Rates { get; init; }
    public required CampaignMetricsChannels Channels { get; init; }
    public TimeSeriesPoint[]? Timeseries { get; init; }
    public int? TimeseriesWindowMinutes { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required DateTime CachedAt { get; init; }
}

/// <summary>
/// Cached alert data structure for Redis storage
/// </summary>
internal record CachedAlertData
{
    public required bool Triggered { get; init; }
    public required double FailureRate { get; init; }
    public required double Threshold { get; init; }
    public required int WindowSeconds { get; init; }
    public DateTime? LastTriggeredAt { get; init; }
    public DateTime? LastClearedAt { get; init; }
    public required DateTime LastEvaluatedAt { get; init; }
}