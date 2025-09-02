using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Services;

public interface IActivityScoringService
{
    Task<decimal> CalculateActivityScoreAsync(Guid tenantId, Guid contactId, CancellationToken cancellationToken = default);
    Task UpdateActivityScoreAsync(Guid tenantId, Guid contactId, CancellationToken cancellationToken = default);
    Task UpdateAllActivityScoresAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<ActivityScoreDistribution> GetScoreDistributionAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<ContactDto>> GetContactsByScoreRangeAsync(Guid tenantId, decimal minScore, decimal maxScore, int limit = 100, CancellationToken cancellationToken = default);
}

public class ActivityScoreDistribution
{
    public int HighActivity { get; set; } // Score >= 70
    public int MediumActivity { get; set; } // Score 30-70
    public int LowActivity { get; set; } // Score < 30
    public decimal AverageScore { get; set; }
    public decimal MedianScore { get; set; }
    public Dictionary<int, int> ScoreHistogram { get; set; } = new();
}