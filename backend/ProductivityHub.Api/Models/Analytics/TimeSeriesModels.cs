using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Models.Analytics;

/// <summary>
/// Query parameters for time-series analytics endpoint
/// </summary>
public class TimeSeriesQuery
{
    [Required]
    public string Scope { get; set; } = "global"; // "global" or "campaign"
    
    public Guid? CampaignId { get; set; }
    
    [Required]
    public DateTimeOffset From { get; set; }
    
    [Required]
    public DateTimeOffset To { get; set; }
    
    [Required]
    [RegularExpression("^(5m|1h|1d)$", ErrorMessage = "Interval must be 5m, 1h, or 1d")]
    public string Interval { get; set; } = "1h";
    
    public string[]? Channels { get; set; }
    
    [RegularExpression(@"^[A-Za-z_]+\/[A-Za-z_]+$", ErrorMessage = "Invalid timezone format")]
    public string TimeZone { get; set; } = "Asia/Seoul";
    
    public string[]? EventTypes { get; set; } // Filter specific event types
}

/// <summary>
/// Time-series analytics response optimized for Chart.js
/// </summary>
public class TimeSeriesResponse
{
    public string Scope { get; set; } = string.Empty;
    public Guid? CampaignId { get; set; }
    public DateTimeOffset From { get; set; }
    public DateTimeOffset To { get; set; }
    public string Interval { get; set; } = string.Empty;
    public string TimeZone { get; set; } = string.Empty;
    
    // Chart.js compatible datasets
    public ChartDataset[] Datasets { get; set; } = Array.Empty<ChartDataset>();
    
    // Raw bucket data for custom processing
    public TimeBucket[] Buckets { get; set; } = Array.Empty<TimeBucket>();
    
    // Metadata
    public TimeSeriesMetadata Metadata { get; set; } = new();
}

/// <summary>
/// Chart.js compatible dataset structure
/// </summary>
public class ChartDataset
{
    public string Label { get; set; } = string.Empty;
    public long[] Data { get; set; } = Array.Empty<long>();
    public string BorderColor { get; set; } = string.Empty;
    public string BackgroundColor { get; set; } = string.Empty;
    public bool Fill { get; set; }
    public double Tension { get; set; } = 0.4;
    public int BorderWidth { get; set; } = 2;
}

/// <summary>
/// Individual time bucket with all metrics
/// </summary>
public class TimeBucket
{
    public DateTimeOffset Timestamp { get; set; }
    public string Label { get; set; } = string.Empty; // Formatted timestamp for display
    public long Sent { get; set; }
    public long Delivered { get; set; }
    public long Opened { get; set; }
    public long Clicked { get; set; }
    public long Failed { get; set; }
    public long Unsubscribed { get; set; }
    public long Bounced { get; set; }
    public long SpamReports { get; set; }
    public decimal TotalCost { get; set; }
    
    // Calculated rates for this bucket
    public double DeliveryRate { get; set; }
    public double OpenRate { get; set; }
    public double ClickRate { get; set; }
}

/// <summary>
/// Time-series metadata and summary
/// </summary>
public class TimeSeriesMetadata
{
    public int TotalBuckets { get; set; }
    public int EmptyBuckets { get; set; }
    public DateTimeOffset ActualStart { get; set; }
    public DateTimeOffset ActualEnd { get; set; }
    public string[] EventTypes { get; set; } = Array.Empty<string>();
    public string[] Channels { get; set; } = Array.Empty<string>();
    public TimeBucketSummary Summary { get; set; } = new();
}

/// <summary>
/// Summary statistics across all buckets
/// </summary>
public class TimeBucketSummary
{
    public long TotalSent { get; set; }
    public long TotalDelivered { get; set; }
    public long TotalOpened { get; set; }
    public long TotalClicked { get; set; }
    public long TotalFailed { get; set; }
    public decimal TotalCost { get; set; }
    public double AverageDeliveryRate { get; set; }
    public double AverageOpenRate { get; set; }
    public double AverageClickRate { get; set; }
    public TimeBucket PeakBucket { get; set; } = new();
    public string PeakMetric { get; set; } = string.Empty; // "sent", "opened", "clicked"
}

/// <summary>
/// Funnel analytics query parameters
/// </summary>
public class FunnelQuery
{
    [Required]
    public string Scope { get; set; } = "global"; // "global" or "campaign"
    
    public Guid? CampaignId { get; set; }
    
    [Required]
    public DateTimeOffset From { get; set; }
    
    [Required]
    public DateTimeOffset To { get; set; }
    
    public string[]? Channels { get; set; }
    
    public string? AbGroup { get; set; }
    
    // Funnel configuration
    [Required]
    public string ConversionModel { get; set; } = "stepwise"; // "stepwise" or "absolute"
}

/// <summary>
/// Funnel analytics response
/// </summary>
public class FunnelResponse
{
    public string Scope { get; set; } = string.Empty;
    public Guid? CampaignId { get; set; }
    public DateTimeOffset From { get; set; }
    public DateTimeOffset To { get; set; }
    public string ConversionModel { get; set; } = string.Empty;
    
    // Main funnel stages
    public FunnelStage[] Stages { get; set; } = Array.Empty<FunnelStage>();
    
    // Channel breakdown
    public ChannelFunnel[] ChannelFunnels { get; set; } = Array.Empty<ChannelFunnel>();
    
    // A/B group breakdown (if applicable)
    public AbGroupFunnel[] AbGroupFunnels { get; set; } = Array.Empty<AbGroupFunnel>();
    
    // Funnel insights
    public FunnelInsights Insights { get; set; } = new();
}

/// <summary>
/// Individual funnel stage data
/// </summary>
public class FunnelStage
{
    public string Name { get; set; } = string.Empty; // "sent", "delivered", "opened", "clicked"
    public string DisplayName { get; set; } = string.Empty;
    public long Count { get; set; }
    public double ConversionRate { get; set; } // Conversion from previous stage
    public double AbsoluteRate { get; set; } // Conversion from first stage (sent)
    public double DropOffRate { get; set; } // Drop-off from previous stage
    public long DropOffCount { get; set; }
    public int Order { get; set; }
    
    // Visual properties for funnel charts
    public string Color { get; set; } = string.Empty;
    public double Width { get; set; } // Relative width for funnel visualization
}

/// <summary>
/// Channel-specific funnel breakdown
/// </summary>
public class ChannelFunnel
{
    public string Channel { get; set; } = string.Empty;
    public FunnelStage[] Stages { get; set; } = Array.Empty<FunnelStage>();
    public double OverallConversionRate { get; set; } // Sent to final conversion
    public string BestStage { get; set; } = string.Empty; // Stage with highest conversion
    public string WorstStage { get; set; } = string.Empty; // Stage with lowest conversion
}

/// <summary>
/// A/B group funnel breakdown
/// </summary>
public class AbGroupFunnel
{
    public string AbGroup { get; set; } = string.Empty;
    public string? Description { get; set; }
    public FunnelStage[] Stages { get; set; } = Array.Empty<FunnelStage>();
    public double OverallConversionRate { get; set; }
    public double Lift { get; set; } // Lift compared to control group
    public bool IsControl { get; set; }
}

/// <summary>
/// Funnel insights and recommendations
/// </summary>
public class FunnelInsights
{
    public string BiggestDropOff { get; set; } = string.Empty; // Stage with largest drop-off
    public double BiggestDropOffRate { get; set; }
    public long BiggestDropOffCount { get; set; }
    
    public string BestPerformingChannel { get; set; } = string.Empty;
    public double BestChannelConversionRate { get; set; }
    
    public string? BestPerformingAbGroup { get; set; }
    public double BestAbGroupConversionRate { get; set; }
    public double BestAbGroupLift { get; set; }
    
    public double OverallConversionRate { get; set; } // Sent to clicked
    public double DeliveryEfficiency { get; set; } // Sent to delivered
    public double EngagementRate { get; set; } // Delivered to clicked
    
    public string[] Recommendations { get; set; } = Array.Empty<string>();
}

/// <summary>
/// Validation attribute for time-series intervals
/// </summary>
public class ValidIntervalAttribute : ValidationAttribute
{
    private static readonly string[] ValidIntervals = { "5m", "1h", "1d" };

    public override bool IsValid(object? value)
    {
        if (value is not string interval)
            return false;

        return ValidIntervals.Contains(interval);
    }

    public override string FormatErrorMessage(string name)
    {
        return $"Interval must be one of: {string.Join(", ", ValidIntervals)}";
    }
}

/// <summary>
/// Validation attribute for maximum time range based on interval
/// </summary>
public class MaxTimeRangeForIntervalAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is not TimeSeriesQuery query)
            return true;

        var range = query.To - query.From;
        
        return query.Interval switch
        {
            "5m" => range.TotalHours <= 24, // Max 24 hours for 5-minute intervals
            "1h" => range.TotalDays <= 30,  // Max 30 days for hourly intervals
            "1d" => range.TotalDays <= 365, // Max 1 year for daily intervals
            _ => true
        };
    }

    public override string FormatErrorMessage(string name)
    {
        return "Time range exceeds maximum allowed for the selected interval";
    }
}

/// <summary>
/// Internal DTO for SQL query results
/// </summary>
internal class TimeSeriesResult
{
    public DateTime Bucket { get; set; }
    public long Sent { get; set; }
    public long Delivered { get; set; }
    public long Opened { get; set; }
    public long Clicked { get; set; }
    public long Failed { get; set; }
    public long Unsubscribed { get; set; }
    public long Bounced { get; set; }
    public long SpamReports { get; set; }
    public decimal TotalCost { get; set; }
}

/// <summary>
/// Internal DTO for funnel SQL query results
/// </summary>
internal class FunnelResult
{
    public string? Channel { get; set; }
    public string? AbGroup { get; set; }
    public long Sent { get; set; }
    public long Delivered { get; set; }
    public long Opened { get; set; }
    public long Clicked { get; set; }
    public long Failed { get; set; }
    public long Unsubscribed { get; set; }
    public long Bounced { get; set; }
}