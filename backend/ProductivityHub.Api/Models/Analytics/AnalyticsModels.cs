using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Models.Analytics;

/// <summary>
/// Query parameters for analytics summary endpoint
/// </summary>
public class AnalyticsQuery
{
    [Required]
    public string Scope { get; set; } = "global"; // "global" or "campaign"
    
    public Guid? CampaignId { get; set; }
    
    [Required]
    public DateTimeOffset From { get; set; } = DateTimeOffset.UtcNow.AddDays(-30);
    
    [Required]
    public DateTimeOffset To { get; set; } = DateTimeOffset.UtcNow;
    
    public string[]? Channels { get; set; } // ["sms", "kakao"]
    
    public string? AbGroup { get; set; }
}

/// <summary>
/// Analytics summary response model
/// </summary>
public class AnalyticsSummaryResponse
{
    public string Scope { get; set; } = string.Empty;
    public Guid? CampaignId { get; set; }
    public DateTimeOffset From { get; set; }
    public DateTimeOffset To { get; set; }
    public AnalyticsKpi Kpi { get; set; } = new();
    public AnalyticsRates Rates { get; set; } = new();
    public ChannelBreakdown[] ChannelBreakdowns { get; set; } = Array.Empty<ChannelBreakdown>();
    public FailureBreakdown[] FailureBreakdowns { get; set; } = Array.Empty<FailureBreakdown>();
}

/// <summary>
/// Core analytics KPIs
/// </summary>
public class AnalyticsKpi
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

/// <summary>
/// Computed analytics rates
/// </summary>
public class AnalyticsRates
{
    public double DeliveryRate { get; set; } // Delivered / Sent * 100
    public double OpenRate { get; set; } // Opened / Delivered * 100
    public double ClickRate { get; set; } // Clicked / Opened * 100
    public double ClickThroughRate { get; set; } // Clicked / Delivered * 100
    public double FailureRate { get; set; } // Failed / Sent * 100
    public double UnsubscribeRate { get; set; } // Unsubscribed / Delivered * 100
    public double BounceRate { get; set; } // Bounced / Sent * 100
    public double SpamRate { get; set; } // SpamReports / Delivered * 100
}

/// <summary>
/// Channel-specific breakdown
/// </summary>
public class ChannelBreakdown
{
    public string Channel { get; set; } = string.Empty;
    public long Sent { get; set; }
    public long Delivered { get; set; }
    public long Opened { get; set; }
    public long Clicked { get; set; }
    public long Failed { get; set; }
    public decimal Cost { get; set; }
    public double DeliveryRate { get; set; }
    public double OpenRate { get; set; }
    public double ClickRate { get; set; }
}

/// <summary>
/// Failure reason breakdown
/// </summary>
public class FailureBreakdown
{
    public string? FailureCode { get; set; }
    public string? FailureReason { get; set; }
    public long Count { get; set; }
    public double Percentage { get; set; }
}

/// <summary>
/// A/B test analytics query
/// </summary>
public class AbTestQuery
{
    [Required]
    public Guid CampaignId { get; set; }
    
    public DateTimeOffset? From { get; set; }
    public DateTimeOffset? To { get; set; }
    
    public string[]? Channels { get; set; }
}

/// <summary>
/// A/B test analytics response
/// </summary>
public class AbTestAnalyticsResponse
{
    public Guid CampaignId { get; set; }
    public DateTimeOffset From { get; set; }
    public DateTimeOffset To { get; set; }
    public AbTestVariant[] Variants { get; set; } = Array.Empty<AbTestVariant>();
    public AbTestSummary Summary { get; set; } = new();
}

/// <summary>
/// Individual A/B test variant performance
/// </summary>
public class AbTestVariant
{
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal AllocationPercentage { get; set; }
    public bool IsActive { get; set; }
    
    // Raw counts for significance testing
    public long Sent { get; set; }
    public long Delivered { get; set; }
    public long Opened { get; set; }
    public long Clicked { get; set; }
    public long Failed { get; set; }
    public long Unsubscribed { get; set; }
    
    // Rates
    public double DeliveryRate { get; set; }
    public double OpenRate { get; set; }
    public double ClickRate { get; set; }
    public double FailureRate { get; set; }
    
    // Cost metrics
    public decimal TotalCost { get; set; }
    public decimal CostPerSent { get; set; }
    public decimal CostPerDelivered { get; set; }
    public decimal CostPerClick { get; set; }
    
    // Unique metrics
    public int UniqueRecipients { get; set; }
}

/// <summary>
/// A/B test summary with comparison metrics
/// </summary>
public class AbTestSummary
{
    public int TotalVariants { get; set; }
    public int ActiveVariants { get; set; }
    public string? BestPerformingVariant { get; set; }
    public string? BestMetric { get; set; } // "delivery_rate", "open_rate", "click_rate"
    public double BestValue { get; set; }
    public bool HasStatisticalSignificance { get; set; }
    public string? StatisticalNote { get; set; }
}

/// <summary>
/// Cost and quota query parameters
/// </summary>
public class CostQuotaQuery
{
    [Required]
    public string Scope { get; set; } = "global"; // "global" or "campaign"
    
    public Guid? CampaignId { get; set; }
    
    public int? Month { get; set; } // 1-12, defaults to current month
    public int? Year { get; set; } // defaults to current year
    
    public string[]? Channels { get; set; }
}

/// <summary>
/// Cost and quota analytics response
/// </summary>
public class CostQuotaResponse
{
    public string Scope { get; set; } = string.Empty;
    public Guid? CampaignId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    
    // Cost breakdown
    public CostBreakdown TotalCost { get; set; } = new();
    public ChannelCost[] ChannelCosts { get; set; } = Array.Empty<ChannelCost>();
    
    // Quota tracking
    public QuotaUsage QuotaUsage { get; set; } = new();
    
    // Projections
    public CostProjection? Projection { get; set; }
}

/// <summary>
/// Cost breakdown details
/// </summary>
public class CostBreakdown
{
    public decimal Total { get; set; }
    public string Currency { get; set; } = "KRW";
    public long TotalMessages { get; set; }
    public decimal AverageCostPerMessage { get; set; }
    public DateTimeOffset PeriodStart { get; set; }
    public DateTimeOffset PeriodEnd { get; set; }
}

/// <summary>
/// Per-channel cost breakdown
/// </summary>
public class ChannelCost
{
    public string Channel { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public long MessageCount { get; set; }
    public decimal AverageCostPerMessage { get; set; }
    public double PercentageOfTotal { get; set; }
}

/// <summary>
/// Quota usage tracking
/// </summary>
public class QuotaUsage
{
    public long MonthlyLimit { get; set; }
    public long MonthToDateUsage { get; set; }
    public long RemainingQuota { get; set; }
    public double UsagePercentage { get; set; }
    public int DaysRemainingInMonth { get; set; }
    public double DailyAverageUsage { get; set; }
    public long ProjectedMonthEndUsage { get; set; }
    public bool IsOverQuota { get; set; }
    public bool IsNearQuota { get; set; } // >80%
    public QuotaChannel[] ChannelQuotas { get; set; } = Array.Empty<QuotaChannel>();
}

/// <summary>
/// Per-channel quota usage
/// </summary>
public class QuotaChannel
{
    public string Channel { get; set; } = string.Empty;
    public long Limit { get; set; }
    public long Used { get; set; }
    public long Remaining { get; set; }
    public double UsagePercentage { get; set; }
}

/// <summary>
/// Cost projection based on current usage patterns
/// </summary>
public class CostProjection
{
    public decimal ProjectedMonthEndCost { get; set; }
    public decimal ProjectedOverage { get; set; }
    public string ProjectionBasis { get; set; } = string.Empty; // "current_pace", "historical_average"
    public double ConfidenceLevel { get; set; }
}

/// <summary>
/// Validation attributes for analytics queries
/// </summary>
public class MaxDateRangeAttribute : ValidationAttribute
{
    private readonly int _maxDays;

    public MaxDateRangeAttribute(int maxDays)
    {
        _maxDays = maxDays;
    }

    public override bool IsValid(object? value)
    {
        if (value is not AnalyticsQuery query)
            return true;

        var range = query.To - query.From;
        return range.TotalDays <= _maxDays;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"Date range cannot exceed {_maxDays} days";
    }
}