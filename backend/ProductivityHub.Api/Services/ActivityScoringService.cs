using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public class ActivityScoringService : IActivityScoringService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ActivityScoringService> _logger;

    // Scoring configuration
    private const decimal OpenWeight = 1.0m;
    private const decimal ClickWeight = 3.0m;
    private const decimal ReplyWeight = 5.0m;
    private const decimal DecayLambda = 0.1m; // Decay rate per day
    private const int MaxScore = 100;
    private const int AnalysisWindowDays = 90;

    public ActivityScoringService(ApplicationDbContext context, ILogger<ActivityScoringService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<decimal> CalculateActivityScoreAsync(Guid tenantId, Guid contactId, CancellationToken cancellationToken = default)
    {
        // Skip activity scoring calculation for in-memory database since CampaignEvents are not available
        if (_context.Database.IsInMemory())
        {
            return 0.0m;
        }

        var now = DateTime.UtcNow;
        var cutoffDate = now.AddDays(-AnalysisWindowDays);

        // Get campaign events for this contact
        var events = await _context.CampaignEvents
            .Where(e => e.TenantId == tenantId && 
                       e.ContactId == contactId && 
                       e.OccurredAt >= cutoffDate)
            .Select(e => new { e.EventType, e.OccurredAt })
            .ToListAsync(cancellationToken);

        if (!events.Any())
        {
            return 0.0m;
        }

        decimal totalScore = 0.0m;

        foreach (var evt in events)
        {
            var daysSince = (now - evt.OccurredAt.DateTime).TotalDays;
            var decayFactor = (decimal)Math.Exp(-((double)DecayLambda * daysSince));
            
            var eventWeight = evt.EventType switch
            {
                EventType.Opened => OpenWeight,
                EventType.Clicked => ClickWeight,
                EventType.Delivered => 0.5m, // Light weight for delivery
                _ => 0.0m
            };

            totalScore += eventWeight * decayFactor;
        }

        // Normalize to 0-100 scale using sigmoid-like function
        var normalizedScore = (decimal)(100.0 / (1.0 + Math.Exp(-((double)totalScore / 10.0))));
        
        // Round to 2 decimal places
        return Math.Round(Math.Min(normalizedScore, MaxScore), 2);
    }

    public async Task UpdateActivityScoreAsync(Guid tenantId, Guid contactId, CancellationToken cancellationToken = default)
    {
        var contact = await _context.Contacts
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Id == contactId, cancellationToken);

        if (contact == null)
        {
            _logger.LogWarning("Contact {ContactId} not found for tenant {TenantId}", contactId, tenantId);
            return;
        }

        var newScore = await CalculateActivityScoreAsync(tenantId, contactId, cancellationToken);
        
        // Get the last activity timestamp (skip for in-memory database)
        DateTimeOffset? lastActivity = null;
        if (!_context.Database.IsInMemory())
        {
            lastActivity = await _context.CampaignEvents
                .Where(e => e.TenantId == tenantId && e.ContactId == contactId)
                .MaxAsync(e => (DateTimeOffset?)e.OccurredAt, cancellationToken);
        }

        contact.ActivityScore = newScore;
        contact.LastActivityAt = lastActivity?.DateTime;
        contact.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogDebug("Updated activity score for contact {ContactId}: {Score}", contactId, newScore);
    }

    public async Task UpdateAllActivityScoresAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting batch activity score update for tenant {TenantId}", tenantId);

        var batchSize = 1000;
        var offset = 0;
        var totalUpdated = 0;

        while (!cancellationToken.IsCancellationRequested)
        {
            var contactBatch = await _context.Contacts
                .Where(c => c.TenantId == tenantId && c.IsActive)
                .OrderBy(c => c.Id)
                .Skip(offset)
                .Take(batchSize)
                .Select(c => new { c.Id, c.FullName })
                .ToListAsync(cancellationToken);

            if (!contactBatch.Any())
            {
                break;
            }

            foreach (var contact in contactBatch)
            {
                try
                {
                    await UpdateActivityScoreAsync(tenantId, contact.Id, cancellationToken);
                    totalUpdated++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating activity score for contact {ContactId}", contact.Id);
                }
            }

            offset += batchSize;
            _logger.LogDebug("Processed batch of {BatchSize} contacts, total updated: {TotalUpdated}", 
                batchSize, totalUpdated);
        }

        _logger.LogInformation("Completed batch activity score update for tenant {TenantId}, updated {TotalUpdated} contacts", 
            tenantId, totalUpdated);
    }

    public async Task<ActivityScoreDistribution> GetScoreDistributionAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var scores = await _context.Contacts
            .Where(c => c.TenantId == tenantId && c.IsActive)
            .Select(c => c.ActivityScore)
            .ToListAsync(cancellationToken);

        if (!scores.Any())
        {
            return new ActivityScoreDistribution();
        }

        var distribution = new ActivityScoreDistribution
        {
            HighActivity = scores.Count(s => s >= 70),
            MediumActivity = scores.Count(s => s >= 30 && s < 70),
            LowActivity = scores.Count(s => s < 30),
            AverageScore = Math.Round(scores.Average(), 2),
            MedianScore = GetMedian(scores)
        };

        // Create histogram with 10-point buckets
        for (int i = 0; i < 10; i++)
        {
            var bucketMin = i * 10;
            var bucketMax = (i + 1) * 10;
            var count = scores.Count(s => s >= bucketMin && s < bucketMax);
            distribution.ScoreHistogram[bucketMin] = count;
        }

        return distribution;
    }

    public async Task<List<ContactDto>> GetContactsByScoreRangeAsync(Guid tenantId, decimal minScore, decimal maxScore, int limit = 100, CancellationToken cancellationToken = default)
    {
        var contacts = await _context.Contacts
            .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
            .Where(c => c.TenantId == tenantId && 
                       c.IsActive && 
                       c.ActivityScore >= minScore && 
                       c.ActivityScore <= maxScore)
            .OrderByDescending(c => c.ActivityScore)
            .ThenByDescending(c => c.LastActivityAt)
            .Take(Math.Min(limit, 1000))
            .ToListAsync(cancellationToken);

        return contacts.Select(MapToDto).ToList();
    }

    private static decimal GetMedian(List<decimal> values)
    {
        var sorted = values.OrderBy(v => v).ToList();
        var count = sorted.Count;
        
        if (count == 0) return 0;
        if (count % 2 == 0)
        {
            return (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
        }
        return sorted[count / 2];
    }

    private static ContactDto MapToDto(Contact contact)
    {
        return new ContactDto
        {
            Id = contact.Id,
            FullName = contact.FullName,
            Phone = null, // Will be decrypted elsewhere
            Email = null, // Will be decrypted elsewhere
            KakaoId = null, // Will be decrypted elsewhere
            Notes = contact.Notes,
            IsActive = contact.IsActive,
            ActivityScore = contact.ActivityScore,
            LastActivityAt = contact.LastActivityAt,
            CreatedAt = contact.CreatedAt,
            UpdatedAt = contact.UpdatedAt,
            Tags = contact.ContactTags?.Select(ct => new TagDto
            {
                Id = ct.Tag.Id,
                Name = ct.Tag.Name,
                Color = ct.Tag.Color,
                Description = ct.Tag.Description,
                ContactCount = 0, // Not calculated here for performance
                CreatedAt = ct.Tag.CreatedAt,
                UpdatedAt = ct.Tag.UpdatedAt
            }).ToList() ?? new List<TagDto>()
        };
    }
}