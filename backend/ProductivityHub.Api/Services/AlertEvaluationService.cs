using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public interface IAlertEvaluationService
{
    Task<AlertEvaluationResult> EvaluateAlertAsync(Guid tenantId, Guid campaignId, CancellationToken cancellationToken = default);
    Task<AlertPolicy> GetAlertPolicyAsync(Guid tenantId, Guid? campaignId = null, CancellationToken cancellationToken = default);
    Task<AlertState> GetOrCreateAlertStateAsync(Guid tenantId, Guid campaignId, CancellationToken cancellationToken = default);
}

public class AlertEvaluationService : IAlertEvaluationService
{
    private readonly ApplicationDbContext _dbContext;
    private const decimal HysteresisBuffer = 0.01m; // 1% buffer to prevent flapping
    private const decimal DefaultFailureThreshold = 0.05m; // 5% default threshold

    public AlertEvaluationService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AlertEvaluationResult> EvaluateAlertAsync(Guid tenantId, Guid campaignId, CancellationToken cancellationToken = default)
    {
        var policy = await GetAlertPolicyAsync(tenantId, campaignId, cancellationToken);
        var alertState = await GetOrCreateAlertStateAsync(tenantId, campaignId, cancellationToken);
        
        var windowStart = DateTime.UtcNow.AddSeconds(-policy.EvaluationWindowSeconds);
        
        // Get metrics for the evaluation window from minute buckets
        var windowMetrics = await GetWindowMetricsAsync(tenantId, campaignId, windowStart, cancellationToken);
        
        // Calculate failure rate
        var totalAttempted = windowMetrics.TotalAttempted;
        var totalFailed = windowMetrics.TotalFailed;
        var currentFailureRate = totalAttempted == 0 ? 0m : (decimal)totalFailed / totalAttempted;
        
        // Evaluate threshold breach
        bool thresholdBreached = currentFailureRate >= policy.FailureRateThreshold;
        
        // Update consecutive breach counter
        if (thresholdBreached)
        {
            alertState.ConsecutiveBreaches++;
        }
        else
        {
            alertState.ConsecutiveBreaches = 0;
        }
        
        // Apply hysteresis logic
        bool shouldTrigger = false;
        bool shouldClear = false;
        
        if (!alertState.Triggered && thresholdBreached && alertState.ConsecutiveBreaches >= policy.MinConsecutiveBuckets)
        {
            shouldTrigger = true;
            alertState.Triggered = true;
            alertState.LastTriggeredAt = DateTime.UtcNow;
        }
        else if (alertState.Triggered && currentFailureRate < (policy.FailureRateThreshold - HysteresisBuffer))
        {
            shouldClear = true;
            alertState.Triggered = false;
            alertState.LastClearedAt = DateTime.UtcNow;
            alertState.ConsecutiveBreaches = 0;
        }
        
        // Update alert state
        alertState.LastFailureRate = currentFailureRate;
        alertState.LastEvaluatedAt = DateTime.UtcNow;
        
        // Save changes
        _dbContext.AlertStates.Update(alertState);
        await _dbContext.SaveChangesAsync(cancellationToken);
        
        return new AlertEvaluationResult
        {
            AlertState = alertState,
            Policy = policy,
            CurrentFailureRate = currentFailureRate,
            WindowMetrics = windowMetrics,
            ThresholdBreached = thresholdBreached,
            ShouldTrigger = shouldTrigger,
            ShouldClear = shouldClear
        };
    }

    public async Task<AlertPolicy> GetAlertPolicyAsync(Guid tenantId, Guid? campaignId = null, CancellationToken cancellationToken = default)
    {
        // First try to get campaign-specific policy
        if (campaignId.HasValue)
        {
            var campaignPolicy = await _dbContext.AlertPolicies
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.CampaignId == campaignId.Value, cancellationToken);
            
            if (campaignPolicy != null)
                return campaignPolicy;
        }
        
        // Then try tenant default policy
        var tenantPolicy = await _dbContext.AlertPolicies
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.CampaignId == null, cancellationToken);
        
        if (tenantPolicy != null)
            return tenantPolicy;
        
        // Return system default if no policies exist
        return new AlertPolicy
        {
            TenantId = tenantId,
            CampaignId = campaignId,
            FailureRateThreshold = DefaultFailureThreshold,
            MinConsecutiveBuckets = 2,
            EvaluationWindowSeconds = 60,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = "system",
            UpdatedBy = "system"
        };
    }

    public async Task<AlertState> GetOrCreateAlertStateAsync(Guid tenantId, Guid campaignId, CancellationToken cancellationToken = default)
    {
        var alertState = await _dbContext.AlertStates
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.CampaignId == campaignId, cancellationToken);
        
        if (alertState != null)
            return alertState;
        
        // Create new alert state
        alertState = new AlertState
        {
            TenantId = tenantId,
            CampaignId = campaignId,
            Triggered = false,
            LastFailureRate = 0m,
            ConsecutiveBreaches = 0,
            LastEvaluatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        _dbContext.AlertStates.Add(alertState);
        await _dbContext.SaveChangesAsync(cancellationToken);
        
        return alertState;
    }

    private async Task<WindowMetrics> GetWindowMetricsAsync(Guid tenantId, Guid campaignId, DateTime windowStart, CancellationToken cancellationToken)
    {
        // Get metrics from minute buckets for the evaluation window
        var bucketMetrics = await _dbContext.CampaignMetricsMinutes
            .Where(m => m.TenantId == tenantId 
                     && m.CampaignId == campaignId 
                     && m.BucketMinute >= windowStart)
            .GroupBy(m => 1) // Group all records to sum
            .Select(g => new WindowMetrics
            {
                TotalAttempted = g.Sum(m => m.Attempted),
                TotalFailed = g.Sum(m => m.Failed),
                TotalDelivered = g.Sum(m => m.Delivered)
            })
            .FirstOrDefaultAsync(cancellationToken);
        
        return bucketMetrics ?? new WindowMetrics();
    }
}

public class AlertEvaluationResult
{
    public AlertState AlertState { get; set; } = null!;
    public AlertPolicy Policy { get; set; } = null!;
    public decimal CurrentFailureRate { get; set; }
    public WindowMetrics WindowMetrics { get; set; } = null!;
    public bool ThresholdBreached { get; set; }
    public bool ShouldTrigger { get; set; }
    public bool ShouldClear { get; set; }
}

public class WindowMetrics
{
    public long TotalAttempted { get; set; }
    public long TotalFailed { get; set; }
    public long TotalDelivered { get; set; }
    
    public decimal FailureRate => TotalAttempted == 0 ? 0m : (decimal)TotalFailed / TotalAttempted;
    public decimal DeliveryRate => TotalAttempted == 0 ? 0m : (decimal)TotalDelivered / TotalAttempted;
}