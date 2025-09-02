using MediatR;

namespace ProductivityHub.Api.Application.Queries;

/// <summary>
/// Query to retrieve campaign metrics with optional time series data
/// </summary>
public record GetCampaignMetricsQuery(
    Guid CampaignId,
    Guid TenantId,
    int WindowMinutes = 60,
    bool IncludeTimeseries = true
) : IRequest<CampaignMetricsResponse?>
{
    /// <summary>
    /// Maximum allowed window size in minutes (24 hours)
    /// </summary>
    public const int MaxWindowMinutes = 1440;

    /// <summary>
    /// Validates the query parameters
    /// </summary>
    public bool IsValid(out string? errorMessage)
    {
        if (CampaignId == Guid.Empty)
        {
            errorMessage = "Campaign ID is required";
            return false;
        }

        if (TenantId == Guid.Empty)
        {
            errorMessage = "Tenant ID is required";
            return false;
        }

        if (WindowMinutes <= 0 || WindowMinutes > MaxWindowMinutes)
        {
            errorMessage = $"Window minutes must be between 1 and {MaxWindowMinutes}";
            return false;
        }

        errorMessage = null;
        return true;
    }

    /// <summary>
    /// Gets the time window start for time series queries
    /// </summary>
    public DateTime GetWindowStart() => DateTime.UtcNow.AddMinutes(-WindowMinutes);
}

/// <summary>
/// Response containing campaign metrics data optimized for frontend consumption
/// </summary>
public record CampaignMetricsResponse(
    CampaignMetricsTotals Totals,
    CampaignMetricsRates Rates,
    CampaignMetricsChannels Channels,
    TimeSeriesPoint[]? Timeseries,
    CampaignAlertInfo Alert,
    DateTime UpdatedAt
);

/// <summary>
/// Campaign totals across all channels
/// </summary>
public record CampaignMetricsTotals(
    long Sent,
    long Delivered,
    long Failed,
    long Open,
    long Click
);

/// <summary>
/// Campaign rates calculated from totals
/// </summary>
public record CampaignMetricsRates(
    double Delivered, // delivered_total / sent_total
    double Failure,   // failed_total / sent_total  
    double Open,      // open_total / sent_total
    double Click      // click_total / sent_total
)
{
    /// <summary>
    /// Creates rates from totals, handling zero division
    /// </summary>
    public static CampaignMetricsRates FromTotals(CampaignMetricsTotals totals)
    {
        if (totals.Sent == 0)
        {
            return new CampaignMetricsRates(0.0, 0.0, 0.0, 0.0);
        }

        return new CampaignMetricsRates(
            Delivered: Math.Round((double)totals.Delivered / totals.Sent, 4),
            Failure: Math.Round((double)totals.Failed / totals.Sent, 4),
            Open: Math.Round((double)totals.Open / totals.Sent, 4),
            Click: Math.Round((double)totals.Click / totals.Sent, 4)
        );
    }
}

/// <summary>
/// Per-channel breakdown of metrics
/// </summary>
public record CampaignMetricsChannels(
    ChannelMetrics Sms,
    ChannelMetrics Kakao
);

/// <summary>
/// Metrics for a specific channel
/// </summary>
public record ChannelMetrics(
    long Sent,
    long Delivered,
    long Failed
);

/// <summary>
/// Time series data point for charting
/// </summary>
public record TimeSeriesPoint(
    DateTime T,        // Bucket timestamp
    long Attempted,
    long Delivered,
    long Failed,
    long Open,
    long Click
)
{
    /// <summary>
    /// Creates a time series point from minute-level metrics
    /// </summary>
    public static TimeSeriesPoint FromMinuteMetrics(ProductivityHub.Api.Models.CampaignMetricsMinute minute)
    {
        return new TimeSeriesPoint(
            T: minute.BucketMinute,
            Attempted: minute.Attempted,
            Delivered: minute.Delivered,
            Failed: minute.Failed,
            Open: minute.Open,
            Click: minute.Click
        );
    }
}

/// <summary>
/// Alert information for the campaign
/// </summary>
public record CampaignAlertInfo(
    bool Triggered,
    double FailureRate,
    double Threshold,
    int WindowSeconds,
    DateTime? LastTriggeredAt,
    DateTime? LastClearedAt,
    DateTime LastEvaluatedAt
)
{
    /// <summary>
    /// Creates alert info from evaluation result
    /// </summary>
    public static CampaignAlertInfo FromEvaluationResult(Services.AlertEvaluationResult result)
    {
        return new CampaignAlertInfo(
            Triggered: result.AlertState.Triggered,
            FailureRate: (double)result.CurrentFailureRate,
            Threshold: (double)result.Policy.FailureRateThreshold,
            WindowSeconds: result.Policy.EvaluationWindowSeconds,
            LastTriggeredAt: result.AlertState.LastTriggeredAt,
            LastClearedAt: result.AlertState.LastClearedAt,
            LastEvaluatedAt: result.AlertState.LastEvaluatedAt
        );
    }
    
    /// <summary>
    /// Creates a default (no alert) info
    /// </summary>
    public static CampaignAlertInfo Default(double threshold = 0.05, int windowSeconds = 60)
    {
        return new CampaignAlertInfo(
            Triggered: false,
            FailureRate: 0.0,
            Threshold: threshold,
            WindowSeconds: windowSeconds,
            LastTriggeredAt: null,
            LastClearedAt: null,
            LastEvaluatedAt: DateTime.UtcNow
        );
    }
}