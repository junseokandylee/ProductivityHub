namespace ProductivityHub.Api.Services;

public interface IPricingService
{
    Task<decimal> CalculateCostAsync(int recipientCount, IEnumerable<string> channels);
    Task<bool> CheckQuotaAsync(Guid tenantId, int requiredQuota);
    Task<int> GetMonthlyQuotaUsageAsync(Guid tenantId);
    Task<int> GetMonthlyQuotaLimitAsync(Guid tenantId);
}

public class PricingService : IPricingService
{
    private readonly Dictionary<string, decimal> _channelPricing = new()
    {
        { "SMS", 22.0m }, // 22 KRW per SMS
        { "Kakao", 17.0m } // 17 KRW per Kakao message
    };

    private const int DEFAULT_MONTHLY_QUOTA = 50000; // 50K messages per month

    public async Task<decimal> CalculateCostAsync(int recipientCount, IEnumerable<string> channels)
    {
        await Task.CompletedTask; // Placeholder for async operations
        
        if (!channels.Any())
            return 0;

        // Use the first (primary) channel for cost calculation
        var primaryChannel = channels.First();
        
        if (_channelPricing.TryGetValue(primaryChannel, out var cost))
        {
            return recipientCount * cost;
        }

        return 0;
    }

    public async Task<bool> CheckQuotaAsync(Guid tenantId, int requiredQuota)
    {
        await Task.CompletedTask; // Placeholder
        
        var currentUsage = await GetMonthlyQuotaUsageAsync(tenantId);
        var quotaLimit = await GetMonthlyQuotaLimitAsync(tenantId);
        
        return (currentUsage + requiredQuota) <= quotaLimit;
    }

    public async Task<int> GetMonthlyQuotaUsageAsync(Guid tenantId)
    {
        await Task.CompletedTask; // Placeholder
        // TODO: Implement actual quota usage calculation from database
        return 0;
    }

    public async Task<int> GetMonthlyQuotaLimitAsync(Guid tenantId)
    {
        await Task.CompletedTask; // Placeholder
        // TODO: Implement actual quota limit retrieval from database/settings
        return DEFAULT_MONTHLY_QUOTA;
    }
}