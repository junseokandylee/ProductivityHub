using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Background service that processes scheduled campaigns and manages campaign automation
/// </summary>
public class CampaignSchedulerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CampaignSchedulerService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Check every minute
    private readonly SemaphoreSlim _processingLock = new(1, 1);

    public CampaignSchedulerService(
        IServiceProvider serviceProvider,
        ILogger<CampaignSchedulerService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Campaign Scheduler Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessScheduledCampaigns(stoppingToken);
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Campaign Scheduler Service main loop");
                
                // Wait longer before retrying if there's an error
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        _logger.LogInformation("Campaign Scheduler Service stopped");
    }

    private async Task ProcessScheduledCampaigns(CancellationToken cancellationToken)
    {
        if (!await _processingLock.WaitAsync(100, cancellationToken))
        {
            _logger.LogDebug("Campaign scheduler already processing, skipping this cycle");
            return;
        }

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            var now = DateTime.UtcNow;
            var upcomingWindow = now.AddMinutes(5); // Process campaigns scheduled in the next 5 minutes

            // Get all active schedules that are due for execution
            var dueSchedules = await context.CampaignSchedules
                .Where(cs => cs.IsActive && 
                           cs.NextExecution.HasValue &&
                           cs.NextExecution <= upcomingWindow)
                .Include(cs => cs.Campaign)
                .Include(cs => cs.Tenant)
                .ToListAsync(cancellationToken);

            if (!dueSchedules.Any())
            {
                _logger.LogDebug("No scheduled campaigns due for execution");
                return;
            }

            _logger.LogInformation(
                "Processing {ScheduleCount} scheduled campaigns",
                dueSchedules.Count);

            foreach (var schedule in dueSchedules)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                try
                {
                    await ProcessSingleSchedule(scope.ServiceProvider, schedule, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error processing schedule {ScheduleId} for campaign {CampaignId}",
                        schedule.Id, schedule.CampaignId);
                }
            }

            // Save any changes made during processing
            await context.SaveChangesAsync(cancellationToken);
        }
        finally
        {
            _processingLock.Release();
        }
    }

    private async Task ProcessSingleSchedule(
        IServiceProvider serviceProvider,
        CampaignSchedule schedule,
        CancellationToken cancellationToken)
    {
        var context = serviceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = serviceProvider.GetRequiredService<ILogger<CampaignSchedulerService>>();

        // Check if this execution is already in progress or completed
        var existingExecution = await context.CampaignScheduleExecutions
            .Where(cse => cse.ScheduleId == schedule.Id &&
                         cse.PlannedExecution == schedule.NextExecution)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingExecution != null)
        {
            logger.LogDebug(
                "Execution already exists for schedule {ScheduleId} at {PlannedExecution}",
                schedule.Id, schedule.NextExecution);
            return;
        }

        // Create execution record
        var execution = new CampaignScheduleExecution
        {
            ScheduleId = schedule.Id,
            CampaignId = schedule.CampaignId,
            TenantId = schedule.TenantId,
            PlannedExecution = schedule.NextExecution!.Value,
            ExecutionStatus = ExecutionStatus.Scheduled
        };

        context.CampaignScheduleExecutions.Add(execution);
        await context.SaveChangesAsync(cancellationToken);

        try
        {
            // Update execution status to running
            execution.ExecutionStatus = ExecutionStatus.Running;
            execution.ActualExecution = DateTime.UtcNow;
            
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            logger.LogInformation(
                "Starting execution of scheduled campaign: ScheduleId={ScheduleId}, CampaignId={CampaignId}, Type={ScheduleType}",
                schedule.Id, schedule.CampaignId, schedule.ScheduleType);

            // Execute the campaign
            var executionResult = await ExecuteCampaign(serviceProvider, schedule, execution, cancellationToken);
            
            stopwatch.Stop();

            // Update execution results
            execution.ExecutionStatus = executionResult.Success ? ExecutionStatus.Completed : ExecutionStatus.Failed;
            execution.ExecutionDurationMs = (int)stopwatch.ElapsedMilliseconds;
            execution.RecipientsProcessed = executionResult.RecipientsProcessed;
            execution.MessagesSent = executionResult.MessagesSent;
            execution.MessagesFailed = executionResult.MessagesFailed;
            execution.ErrorMessage = executionResult.ErrorMessage;
            execution.ExecutionNotes = executionResult.Notes;

            // Update schedule counters
            schedule.ExecutionCount++;
            schedule.LastExecution = execution.ActualExecution;

            // Calculate next execution for recurring schedules
            if (schedule.IsRecurring && ShouldContinueRecurring(schedule))
            {
                schedule.NextExecution = CalculateNextRecurringExecution(schedule);
                schedule.OccurrenceCount++;

                logger.LogInformation(
                    "Recurring schedule updated: ScheduleId={ScheduleId}, NextExecution={NextExecution}, OccurrenceCount={Count}",
                    schedule.Id, schedule.NextExecution, schedule.OccurrenceCount);
            }
            else if (!schedule.IsRecurring || schedule.ScheduleType == ScheduleType.OneTime)
            {
                // Deactivate one-time schedules or completed recurring schedules
                schedule.IsActive = false;
                schedule.NextExecution = null;

                logger.LogInformation(
                    "Schedule completed and deactivated: ScheduleId={ScheduleId}",
                    schedule.Id);
            }

            await context.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Campaign execution completed: ScheduleId={ScheduleId}, Status={Status}, Duration={DurationMs}ms, Sent={Sent}, Failed={Failed}",
                schedule.Id, execution.ExecutionStatus, execution.ExecutionDurationMs,
                execution.MessagesSent, execution.MessagesFailed);
        }
        catch (Exception ex)
        {
            execution.ExecutionStatus = ExecutionStatus.Failed;
            execution.ErrorMessage = ex.Message;
            execution.RetryCount++;

            // Schedule retry if within retry limits
            if (execution.RetryCount < execution.MaxRetries)
            {
                execution.NextRetry = DateTime.UtcNow.AddMinutes(Math.Pow(2, execution.RetryCount)); // Exponential backoff
                execution.ExecutionStatus = ExecutionStatus.Retrying;

                logger.LogWarning(ex,
                    "Campaign execution failed, scheduling retry {RetryCount}/{MaxRetries}: ScheduleId={ScheduleId}, NextRetry={NextRetry}",
                    execution.RetryCount, execution.MaxRetries, schedule.Id, execution.NextRetry);
            }
            else
            {
                logger.LogError(ex,
                    "Campaign execution failed permanently after {RetryCount} retries: ScheduleId={ScheduleId}",
                    execution.RetryCount, schedule.Id);
            }

            await context.SaveChangesAsync(cancellationToken);
            throw;
        }
    }

    private async Task<CampaignExecutionResult> ExecuteCampaign(
        IServiceProvider serviceProvider,
        CampaignSchedule schedule,
        CampaignScheduleExecution execution,
        CancellationToken cancellationToken)
    {
        var context = serviceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            // Load the campaign with all necessary data
            var campaign = await context.Campaigns
                .Where(c => c.Id == schedule.CampaignId)
                .Include(c => c.Channels)
                .Include(c => c.Audience)
                .FirstOrDefaultAsync(cancellationToken);

            if (campaign == null)
            {
                return new CampaignExecutionResult
                {
                    Success = false,
                    ErrorMessage = "Campaign not found",
                    Notes = "Campaign may have been deleted"
                };
            }

            // Check if campaign is in a valid state for execution
            if (campaign.Status != CampaignStatus.Draft && campaign.Status != CampaignStatus.Queued)
            {
                return new CampaignExecutionResult
                {
                    Success = false,
                    ErrorMessage = $"Campaign is in {campaign.Status} status and cannot be executed",
                    Notes = "Only Draft or Queued campaigns can be executed"
                };
            }

            // Update campaign status
            campaign.Status = CampaignStatus.Processing;
            campaign.StartedAt = DateTime.UtcNow;

            // Get target contacts based on audience configuration
            var targetContacts = await GetTargetContacts(context, campaign, cancellationToken);

            if (!targetContacts.Any())
            {
                campaign.Status = CampaignStatus.Completed;
                campaign.CompletedAt = DateTime.UtcNow;

                return new CampaignExecutionResult
                {
                    Success = true,
                    RecipientsProcessed = 0,
                    MessagesSent = 0,
                    MessagesFailed = 0,
                    Notes = "No target contacts found for campaign"
                };
            }

            campaign.EstimatedRecipients = targetContacts.Count;
            await context.SaveChangesAsync(cancellationToken);

            // TODO: Integrate with existing message sending infrastructure
            // For now, simulate message sending
            var messagesSent = 0;
            var messagesFailed = 0;

            foreach (var contact in targetContacts)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                try
                {
                    // Create CampaignContact record
                    var campaignContact = new CampaignContact
                    {
                        CampaignId = campaign.Id,
                        ContactId = contact.Id,
                        Status = "scheduled",
                        CreatedAt = DateTime.UtcNow
                    };

                    context.CampaignContacts.Add(campaignContact);

                    // TODO: Integrate with actual message sending service
                    // This would typically involve:
                    // 1. Message personalization with contact data
                    // 2. Channel selection based on priorities
                    // 3. Actual message dispatch via SMS/Kakao/Email APIs
                    // 4. Status tracking and error handling

                    messagesSent++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Failed to process contact {ContactId} for campaign {CampaignId}",
                        contact.Id, campaign.Id);
                    messagesFailed++;
                }
            }

            // Update campaign with results
            campaign.SentCount = messagesSent;
            campaign.SuccessCount = messagesSent; // Simplified for now
            campaign.FailedCount = messagesFailed;
            campaign.Status = CampaignStatus.Completed;
            campaign.CompletedAt = DateTime.UtcNow;

            await context.SaveChangesAsync(cancellationToken);

            return new CampaignExecutionResult
            {
                Success = true,
                RecipientsProcessed = targetContacts.Count,
                MessagesSent = messagesSent,
                MessagesFailed = messagesFailed,
                Notes = $"Campaign executed successfully. Sent: {messagesSent}, Failed: {messagesFailed}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing campaign {CampaignId}", schedule.CampaignId);
            
            return new CampaignExecutionResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                Notes = "Unexpected error during campaign execution"
            };
        }
    }

    private async Task<List<Contact>> GetTargetContacts(
        ApplicationDbContext context,
        Campaign campaign,
        CancellationToken cancellationToken)
    {
        var query = context.Contacts
            .Where(c => c.TenantId == campaign.TenantId && c.IsActive);

        // Apply audience filters if configured
        if (campaign.Audience != null)
        {
            // TODO: Implement audience filtering logic
            // This would include:
            // - Group membership filtering
            // - Segment filtering  
            // - Tag-based filtering
            // - Custom filter criteria
        }

        return await query.Take(1000).ToListAsync(cancellationToken); // Limit for safety
    }

    private bool ShouldContinueRecurring(CampaignSchedule schedule)
    {
        // Check if recurring schedule should continue
        if (schedule.RecurrenceEndDate.HasValue && DateTime.UtcNow >= schedule.RecurrenceEndDate.Value)
        {
            return false;
        }

        if (schedule.MaxOccurrences.HasValue && schedule.OccurrenceCount >= schedule.MaxOccurrences.Value)
        {
            return false;
        }

        return true;
    }

    private DateTime? CalculateNextRecurringExecution(CampaignSchedule schedule)
    {
        if (schedule.RecurrencePattern == null)
            return null;

        var now = DateTime.UtcNow;
        var timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById(schedule.Timezone);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(now, timeZoneInfo);

        DateTime nextLocal = schedule.RecurrencePattern.Value switch
        {
            RecurrencePattern.Daily => localNow.AddDays(schedule.RecurrenceInterval),
            RecurrencePattern.Weekly => CalculateWeeklyNext(localNow, schedule),
            RecurrencePattern.Monthly => CalculateMonthlyNext(localNow, schedule),
            RecurrencePattern.Yearly => localNow.AddYears(schedule.RecurrenceInterval),
            _ => localNow.AddDays(1)
        };

        // Convert back to UTC
        return TimeZoneInfo.ConvertTimeToUtc(nextLocal, timeZoneInfo);
    }

    private DateTime CalculateWeeklyNext(DateTime localNow, CampaignSchedule schedule)
    {
        if (string.IsNullOrEmpty(schedule.RecurrenceDaysOfWeek))
        {
            return localNow.AddDays(7 * schedule.RecurrenceInterval);
        }

        var daysOfWeek = JsonSerializer.Deserialize<int[]>(schedule.RecurrenceDaysOfWeek);
        var currentDayOfWeek = (int)localNow.DayOfWeek;
        var nextDays = daysOfWeek.Where(d => d > currentDayOfWeek).OrderBy(d => d);
        
        if (nextDays.Any())
        {
            var nextDay = nextDays.First();
            return localNow.AddDays(nextDay - currentDayOfWeek);
        }
        
        // Next week
        var firstDayNextWeek = daysOfWeek.Min();
        return localNow.AddDays(7 * schedule.RecurrenceInterval - currentDayOfWeek + firstDayNextWeek);
    }

    private DateTime CalculateMonthlyNext(DateTime localNow, CampaignSchedule schedule)
    {
        var targetDay = schedule.RecurrenceDayOfMonth ?? localNow.Day;
        var nextMonth = localNow.AddMonths(schedule.RecurrenceInterval);
        
        // Handle cases where target day doesn't exist in the next month
        var daysInNextMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
        if (targetDay > daysInNextMonth)
        {
            targetDay = daysInNextMonth;
        }
        
        return new DateTime(nextMonth.Year, nextMonth.Month, targetDay, 
            localNow.Hour, localNow.Minute, localNow.Second);
    }

    public override void Dispose()
    {
        _processingLock?.Dispose();
        base.Dispose();
    }
}

public class CampaignExecutionResult
{
    public bool Success { get; set; }
    public int RecipientsProcessed { get; set; }
    public int MessagesSent { get; set; }
    public int MessagesFailed { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Notes { get; set; }
}