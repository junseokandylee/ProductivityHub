using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;

namespace ProductivityHub.Api.Services;

public class ActivityScoringBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ActivityScoringBackgroundService> _logger;
    private readonly TimeSpan _dailyUpdateInterval = TimeSpan.FromHours(24);

    public ActivityScoringBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<ActivityScoringBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Activity Scoring Background Service started");

        // Wait for a short delay on startup to let the application initialize
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAllTenantsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in activity scoring background service");
            }

            // Wait for the next scheduled run
            await Task.Delay(_dailyUpdateInterval, stoppingToken);
        }

        _logger.LogInformation("Activity Scoring Background Service stopped");
    }

    private async Task ProcessAllTenantsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var scoringService = scope.ServiceProvider.GetRequiredService<IActivityScoringService>();

        _logger.LogInformation("Starting daily activity score update for all tenants");

        try
        {
            // Get all active tenants
            var tenantIds = await context.Tenants
                .Where(t => t.IsActive)
                .Select(t => t.Id)
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Processing activity scores for {TenantCount} tenants", tenantIds.Count);

            foreach (var tenantId in tenantIds)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                try
                {
                    await scoringService.UpdateAllActivityScoresAsync(tenantId, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating activity scores for tenant {TenantId}", tenantId);
                }
            }

            _logger.LogInformation("Completed daily activity score update for all tenants");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during daily activity score update");
        }
    }
}

public class ActivityScoringEventService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ActivityScoringEventService> _logger;

    public ActivityScoringEventService(
        IServiceProvider serviceProvider,
        ILogger<ActivityScoringEventService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Activity Scoring Event Service started");
        // TODO: Subscribe to analytics events for real-time score updates
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Activity Scoring Event Service stopped");
        return Task.CompletedTask;
    }

    public async Task HandleAnalyticsEventAsync(Guid tenantId, Guid contactId, string eventType)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var scoringService = scope.ServiceProvider.GetRequiredService<IActivityScoringService>();
            
            // Update the specific contact's score when new events occur
            await scoringService.UpdateActivityScoreAsync(tenantId, contactId);
            
            _logger.LogDebug("Updated activity score for contact {ContactId} after {EventType} event", 
                contactId, eventType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating activity score for contact {ContactId} after event", contactId);
        }
    }
}