using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/campaigns/schedules")]
public class CampaignSchedulesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CampaignSchedulesController> _logger;

    public CampaignSchedulesController(ApplicationDbContext context, ILogger<CampaignSchedulesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<CampaignScheduleListResponse>> GetSchedules(
        [FromQuery] CampaignScheduleSearchRequest request)
    {
        var tenantId = User.GetTenantId();
        var query = _context.CampaignSchedules
            .Where(cs => cs.TenantId == tenantId)
            .Include(cs => cs.Campaign)
            .Include(cs => cs.CreatedByUser)
            .Include(cs => cs.UpdatedByUser)
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(request.Search))
        {
            query = query.Where(cs => 
                EF.Functions.ILike(cs.Campaign.Name, $"%{request.Search}%") ||
                EF.Functions.ILike(cs.Notes ?? "", $"%{request.Search}%"));
        }

        if (request.ScheduleType.HasValue)
        {
            query = query.Where(cs => cs.ScheduleType == request.ScheduleType.Value);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(cs => cs.IsActive == request.IsActive.Value);
        }

        if (request.IsRecurring.HasValue)
        {
            query = query.Where(cs => cs.IsRecurring == request.IsRecurring.Value);
        }

        if (request.AutomationTrigger.HasValue)
        {
            query = query.Where(cs => cs.AutomationTrigger == request.AutomationTrigger.Value);
        }

        if (request.NextExecutionFrom.HasValue)
        {
            query = query.Where(cs => cs.NextExecution >= request.NextExecutionFrom.Value);
        }

        if (request.NextExecutionTo.HasValue)
        {
            query = query.Where(cs => cs.NextExecution <= request.NextExecutionTo.Value);
        }

        // Apply sorting
        query = request.SortBy.ToLower() switch
        {
            "campaignname" => request.SortOrder.ToLower() == "desc" 
                ? query.OrderByDescending(cs => cs.Campaign.Name)
                : query.OrderBy(cs => cs.Campaign.Name),
            "scheduletype" => request.SortOrder.ToLower() == "desc"
                ? query.OrderByDescending(cs => cs.ScheduleType)
                : query.OrderBy(cs => cs.ScheduleType),
            "priority" => request.SortOrder.ToLower() == "desc"
                ? query.OrderByDescending(cs => cs.Priority)
                : query.OrderBy(cs => cs.Priority),
            "createdat" => request.SortOrder.ToLower() == "desc"
                ? query.OrderByDescending(cs => cs.CreatedAt)
                : query.OrderBy(cs => cs.CreatedAt),
            _ => request.SortOrder.ToLower() == "desc"
                ? query.OrderByDescending(cs => cs.NextExecution)
                : query.OrderBy(cs => cs.NextExecution)
        };

        var totalCount = await query.CountAsync();
        var schedules = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        // Get execution statistics for each schedule
        var scheduleIds = schedules.Select(s => s.Id).ToList();
        var executionStats = await _context.CampaignScheduleExecutions
            .Where(cse => scheduleIds.Contains(cse.ScheduleId))
            .GroupBy(cse => cse.ScheduleId)
            .Select(g => new
            {
                ScheduleId = g.Key,
                TotalExecutions = g.Count(),
                CompletedExecutions = g.Count(e => e.ExecutionStatus == ExecutionStatus.Completed),
                FailedExecutions = g.Count(e => e.ExecutionStatus == ExecutionStatus.Failed),
                LastExecution = g.Where(e => e.ActualExecution != null)
                                 .OrderByDescending(e => e.ActualExecution)
                                 .Select(e => new { e.ActualExecution, e.ExecutionStatus })
                                 .FirstOrDefault()
            })
            .ToDictionaryAsync(x => x.ScheduleId);

        var response = new CampaignScheduleListResponse
        {
            Schedules = schedules.Select(schedule => new CampaignScheduleResponse
            {
                Id = schedule.Id,
                CampaignId = schedule.CampaignId,
                CampaignName = schedule.Campaign.Name,
                ScheduleType = schedule.ScheduleType,
                ScheduledAt = schedule.ScheduledAt,
                Timezone = schedule.Timezone,
                IsRecurring = schedule.IsRecurring,
                RecurrencePattern = schedule.RecurrencePattern,
                RecurrenceInterval = schedule.RecurrenceInterval,
                RecurrenceDaysOfWeek = string.IsNullOrEmpty(schedule.RecurrenceDaysOfWeek) 
                    ? null 
                    : JsonSerializer.Deserialize<int[]>(schedule.RecurrenceDaysOfWeek),
                RecurrenceDayOfMonth = schedule.RecurrenceDayOfMonth,
                RecurrenceEndDate = schedule.RecurrenceEndDate,
                MaxOccurrences = schedule.MaxOccurrences,
                OccurrenceCount = schedule.OccurrenceCount,
                AutomationTrigger = schedule.AutomationTrigger,
                TriggerConditions = string.IsNullOrEmpty(schedule.TriggerConditions)
                    ? null
                    : JsonSerializer.Deserialize<Dictionary<string, object>>(schedule.TriggerConditions),
                TriggerDelayMinutes = schedule.TriggerDelayMinutes,
                IsActive = schedule.IsActive,
                NextExecution = schedule.NextExecution,
                LastExecution = schedule.LastExecution,
                ExecutionCount = schedule.ExecutionCount,
                Priority = schedule.Priority,
                Notes = schedule.Notes,
                CreatedAt = schedule.CreatedAt,
                CreatedBy = schedule.CreatedBy,
                CreatedByName = schedule.CreatedByUser.Name,
                UpdatedAt = schedule.UpdatedAt,
                UpdatedBy = schedule.UpdatedBy,
                UpdatedByName = schedule.UpdatedByUser?.Name,
                TotalExecutions = executionStats.ContainsKey(schedule.Id) ? executionStats[schedule.Id].TotalExecutions : 0,
                CompletedExecutions = executionStats.ContainsKey(schedule.Id) ? executionStats[schedule.Id].CompletedExecutions : 0,
                FailedExecutions = executionStats.ContainsKey(schedule.Id) ? executionStats[schedule.Id].FailedExecutions : 0,
                LastExecutionDate = executionStats.ContainsKey(schedule.Id) ? executionStats[schedule.Id].LastExecution?.ActualExecution : null,
                LastExecutionStatus = executionStats.ContainsKey(schedule.Id) ? executionStats[schedule.Id].LastExecution?.ExecutionStatus : null
            }).ToList(),
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize,
            HasNextPage = (request.Page * request.PageSize) < totalCount
        };

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CampaignScheduleResponse>> GetSchedule(Guid id)
    {
        var tenantId = User.GetTenantId();
        var schedule = await _context.CampaignSchedules
            .Where(cs => cs.Id == id && cs.TenantId == tenantId)
            .Include(cs => cs.Campaign)
            .Include(cs => cs.CreatedByUser)
            .Include(cs => cs.UpdatedByUser)
            .FirstOrDefaultAsync();

        if (schedule == null)
        {
            return NotFound();
        }

        // Get execution statistics
        var executionStats = await _context.CampaignScheduleExecutions
            .Where(cse => cse.ScheduleId == id)
            .GroupBy(cse => cse.ScheduleId)
            .Select(g => new
            {
                TotalExecutions = g.Count(),
                CompletedExecutions = g.Count(e => e.ExecutionStatus == ExecutionStatus.Completed),
                FailedExecutions = g.Count(e => e.ExecutionStatus == ExecutionStatus.Failed),
                LastExecution = g.Where(e => e.ActualExecution != null)
                                 .OrderByDescending(e => e.ActualExecution)
                                 .Select(e => new { e.ActualExecution, e.ExecutionStatus })
                                 .FirstOrDefault()
            })
            .FirstOrDefaultAsync();

        var response = new CampaignScheduleResponse
        {
            Id = schedule.Id,
            CampaignId = schedule.CampaignId,
            CampaignName = schedule.Campaign.Name,
            ScheduleType = schedule.ScheduleType,
            ScheduledAt = schedule.ScheduledAt,
            Timezone = schedule.Timezone,
            IsRecurring = schedule.IsRecurring,
            RecurrencePattern = schedule.RecurrencePattern,
            RecurrenceInterval = schedule.RecurrenceInterval,
            RecurrenceDaysOfWeek = string.IsNullOrEmpty(schedule.RecurrenceDaysOfWeek) 
                ? null 
                : JsonSerializer.Deserialize<int[]>(schedule.RecurrenceDaysOfWeek),
            RecurrenceDayOfMonth = schedule.RecurrenceDayOfMonth,
            RecurrenceEndDate = schedule.RecurrenceEndDate,
            MaxOccurrences = schedule.MaxOccurrences,
            OccurrenceCount = schedule.OccurrenceCount,
            AutomationTrigger = schedule.AutomationTrigger,
            TriggerConditions = string.IsNullOrEmpty(schedule.TriggerConditions)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, object>>(schedule.TriggerConditions),
            TriggerDelayMinutes = schedule.TriggerDelayMinutes,
            IsActive = schedule.IsActive,
            NextExecution = schedule.NextExecution,
            LastExecution = schedule.LastExecution,
            ExecutionCount = schedule.ExecutionCount,
            Priority = schedule.Priority,
            Notes = schedule.Notes,
            CreatedAt = schedule.CreatedAt,
            CreatedBy = schedule.CreatedBy,
            CreatedByName = schedule.CreatedByUser.Name,
            UpdatedAt = schedule.UpdatedAt,
            UpdatedBy = schedule.UpdatedBy,
            UpdatedByName = schedule.UpdatedByUser?.Name,
            TotalExecutions = executionStats?.TotalExecutions ?? 0,
            CompletedExecutions = executionStats?.CompletedExecutions ?? 0,
            FailedExecutions = executionStats?.FailedExecutions ?? 0,
            LastExecutionDate = executionStats?.LastExecution?.ActualExecution,
            LastExecutionStatus = executionStats?.LastExecution?.ExecutionStatus
        };

        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<CampaignScheduleResponse>> CreateSchedule(CreateCampaignScheduleRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        // Validate campaign exists and belongs to tenant
        var campaign = await _context.Campaigns
            .Where(c => c.Id == request.CampaignId && c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (campaign == null)
        {
            return BadRequest("Campaign not found or access denied");
        }

        // Validate schedule parameters
        if (request.ScheduleType == ScheduleType.OneTime && !request.ScheduledAt.HasValue)
        {
            return BadRequest("ScheduledAt is required for one-time schedules");
        }

        if (request.IsRecurring && request.RecurrencePattern == null)
        {
            return BadRequest("RecurrencePattern is required for recurring schedules");
        }

        // Calculate next execution time
        var nextExecution = CalculateNextExecution(request);

        var schedule = new CampaignSchedule
        {
            CampaignId = request.CampaignId,
            TenantId = tenantId,
            ScheduleType = request.ScheduleType,
            ScheduledAt = request.ScheduledAt,
            Timezone = request.Timezone,
            IsRecurring = request.IsRecurring,
            RecurrencePattern = request.RecurrencePattern,
            RecurrenceInterval = request.RecurrenceInterval,
            RecurrenceDaysOfWeek = request.RecurrenceDaysOfWeek != null 
                ? JsonSerializer.Serialize(request.RecurrenceDaysOfWeek) 
                : null,
            RecurrenceDayOfMonth = request.RecurrenceDayOfMonth,
            RecurrenceEndDate = request.RecurrenceEndDate,
            MaxOccurrences = request.MaxOccurrences,
            AutomationTrigger = request.AutomationTrigger,
            TriggerConditions = request.TriggerConditions != null 
                ? JsonSerializer.Serialize(request.TriggerConditions) 
                : null,
            TriggerDelayMinutes = request.TriggerDelayMinutes,
            NextExecution = nextExecution,
            Priority = request.Priority,
            Notes = request.Notes,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.CampaignSchedules.Add(schedule);
        await _context.SaveChangesAsync();

        // Log the creation
        _logger.LogInformation(
            "Campaign schedule created: ScheduleId={ScheduleId}, CampaignId={CampaignId}, Type={ScheduleType}, NextExecution={NextExecution}",
            schedule.Id, schedule.CampaignId, schedule.ScheduleType, schedule.NextExecution);

        return CreatedAtAction(
            nameof(GetSchedule),
            new { id = schedule.Id },
            await GetScheduleResponse(schedule.Id));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CampaignScheduleResponse>> UpdateSchedule(Guid id, UpdateCampaignScheduleRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        var schedule = await _context.CampaignSchedules
            .Where(cs => cs.Id == id && cs.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (schedule == null)
        {
            return NotFound();
        }

        // Update only provided fields
        if (request.ScheduleType.HasValue)
            schedule.ScheduleType = request.ScheduleType.Value;

        if (request.ScheduledAt.HasValue)
            schedule.ScheduledAt = request.ScheduledAt.Value;

        if (request.Timezone != null)
            schedule.Timezone = request.Timezone;

        if (request.IsRecurring.HasValue)
            schedule.IsRecurring = request.IsRecurring.Value;

        if (request.RecurrencePattern.HasValue)
            schedule.RecurrencePattern = request.RecurrencePattern.Value;

        if (request.RecurrenceInterval.HasValue)
            schedule.RecurrenceInterval = request.RecurrenceInterval.Value;

        if (request.RecurrenceDaysOfWeek != null)
            schedule.RecurrenceDaysOfWeek = JsonSerializer.Serialize(request.RecurrenceDaysOfWeek);

        if (request.RecurrenceDayOfMonth.HasValue)
            schedule.RecurrenceDayOfMonth = request.RecurrenceDayOfMonth.Value;

        if (request.RecurrenceEndDate.HasValue)
            schedule.RecurrenceEndDate = request.RecurrenceEndDate.Value;

        if (request.MaxOccurrences.HasValue)
            schedule.MaxOccurrences = request.MaxOccurrences.Value;

        if (request.AutomationTrigger.HasValue)
            schedule.AutomationTrigger = request.AutomationTrigger.Value;

        if (request.TriggerConditions != null)
            schedule.TriggerConditions = JsonSerializer.Serialize(request.TriggerConditions);

        if (request.TriggerDelayMinutes.HasValue)
            schedule.TriggerDelayMinutes = request.TriggerDelayMinutes.Value;

        if (request.IsActive.HasValue)
            schedule.IsActive = request.IsActive.Value;

        if (request.Priority.HasValue)
            schedule.Priority = request.Priority.Value;

        if (request.Notes != null)
            schedule.Notes = request.Notes;

        // Recalculate next execution if schedule parameters changed
        if (request.ScheduleType.HasValue || request.ScheduledAt.HasValue || 
            request.RecurrencePattern.HasValue || request.RecurrenceInterval.HasValue ||
            request.RecurrenceDaysOfWeek != null || request.RecurrenceDayOfMonth.HasValue)
        {
            schedule.NextExecution = CalculateNextExecution(schedule);
        }

        schedule.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Campaign schedule updated: ScheduleId={ScheduleId}, NextExecution={NextExecution}",
            schedule.Id, schedule.NextExecution);

        return Ok(await GetScheduleResponse(schedule.Id));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSchedule(Guid id)
    {
        var tenantId = User.GetTenantId();
        var schedule = await _context.CampaignSchedules
            .Where(cs => cs.Id == id && cs.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (schedule == null)
        {
            return NotFound();
        }

        _context.CampaignSchedules.Remove(schedule);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Campaign schedule deleted: ScheduleId={ScheduleId}", schedule.Id);

        return NoContent();
    }

    [HttpPost("{id}/activate")]
    public async Task<IActionResult> ActivateSchedule(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        var schedule = await _context.CampaignSchedules
            .Where(cs => cs.Id == id && cs.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (schedule == null)
        {
            return NotFound();
        }

        schedule.IsActive = true;
        schedule.UpdatedBy = userId;
        
        // Recalculate next execution
        schedule.NextExecution = CalculateNextExecution(schedule);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Campaign schedule activated: ScheduleId={ScheduleId}", schedule.Id);

        return Ok(new { message = "Schedule activated successfully", nextExecution = schedule.NextExecution });
    }

    [HttpPost("{id}/deactivate")]
    public async Task<IActionResult> DeactivateSchedule(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        var schedule = await _context.CampaignSchedules
            .Where(cs => cs.Id == id && cs.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (schedule == null)
        {
            return NotFound();
        }

        schedule.IsActive = false;
        schedule.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Campaign schedule deactivated: ScheduleId={ScheduleId}", schedule.Id);

        return Ok(new { message = "Schedule deactivated successfully" });
    }

    [HttpGet("upcoming")]
    public async Task<ActionResult<ScheduleUpcomingExecutionsResponse>> GetUpcomingExecutions(
        [FromQuery] ScheduleUpcomingExecutionsRequest request)
    {
        var tenantId = User.GetTenantId();
        
        var upcomingExecutions = await _context.CampaignSchedules
            .Where(cs => cs.TenantId == tenantId && 
                        cs.IsActive && 
                        cs.NextExecution >= request.FromDate && 
                        cs.NextExecution <= request.ToDate)
            .Include(cs => cs.Campaign)
            .OrderBy(cs => cs.NextExecution)
            .Take(request.Limit ?? 50)
            .Select(cs => new UpcomingExecutionItem
            {
                ScheduleId = cs.Id,
                CampaignId = cs.CampaignId,
                CampaignName = cs.Campaign.Name,
                ScheduledExecution = cs.NextExecution!.Value,
                ScheduleType = cs.ScheduleType,
                IsRecurring = cs.IsRecurring,
                Timezone = cs.Timezone,
                Priority = cs.Priority
            })
            .ToListAsync();

        var totalCount = await _context.CampaignSchedules
            .Where(cs => cs.TenantId == tenantId && 
                        cs.IsActive && 
                        cs.NextExecution >= request.FromDate && 
                        cs.NextExecution <= request.ToDate)
            .CountAsync();

        return Ok(new ScheduleUpcomingExecutionsResponse
        {
            Executions = upcomingExecutions,
            TotalCount = totalCount
        });
    }

    private DateTime? CalculateNextExecution(CreateCampaignScheduleRequest request)
    {
        return request.ScheduleType switch
        {
            ScheduleType.Immediate => DateTime.UtcNow,
            ScheduleType.OneTime => request.ScheduledAt,
            ScheduleType.Recurring => CalculateRecurringNextExecution(
                request.RecurrencePattern!.Value,
                request.RecurrenceInterval,
                request.RecurrenceDaysOfWeek,
                request.RecurrenceDayOfMonth,
                request.Timezone),
            ScheduleType.Triggered => null, // Calculated when trigger fires
            _ => null
        };
    }

    private DateTime? CalculateNextExecution(CampaignSchedule schedule)
    {
        return schedule.ScheduleType switch
        {
            ScheduleType.Immediate => DateTime.UtcNow,
            ScheduleType.OneTime => schedule.ScheduledAt,
            ScheduleType.Recurring => CalculateRecurringNextExecution(
                schedule.RecurrencePattern!.Value,
                schedule.RecurrenceInterval,
                string.IsNullOrEmpty(schedule.RecurrenceDaysOfWeek) 
                    ? null 
                    : JsonSerializer.Deserialize<int[]>(schedule.RecurrenceDaysOfWeek),
                schedule.RecurrenceDayOfMonth,
                schedule.Timezone),
            ScheduleType.Triggered => null,
            _ => null
        };
    }

    private DateTime? CalculateRecurringNextExecution(
        RecurrencePattern pattern,
        int interval,
        int[]? daysOfWeek,
        int? dayOfMonth,
        string timezone)
    {
        var now = DateTime.UtcNow;
        
        // Convert to target timezone for calculation
        var timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById(timezone);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(now, timeZoneInfo);

        DateTime nextLocal = pattern switch
        {
            RecurrencePattern.Daily => localNow.AddDays(interval),
            RecurrencePattern.Weekly => CalculateWeeklyNext(localNow, interval, daysOfWeek),
            RecurrencePattern.Monthly => CalculateMonthlyNext(localNow, interval, dayOfMonth),
            RecurrencePattern.Yearly => localNow.AddYears(interval),
            _ => localNow.AddDays(1)
        };

        // Convert back to UTC
        return TimeZoneInfo.ConvertTimeToUtc(nextLocal, timeZoneInfo);
    }

    private DateTime CalculateWeeklyNext(DateTime localNow, int interval, int[]? daysOfWeek)
    {
        if (daysOfWeek == null || daysOfWeek.Length == 0)
        {
            return localNow.AddDays(7 * interval);
        }

        var currentDayOfWeek = (int)localNow.DayOfWeek;
        var nextDays = daysOfWeek.Where(d => d > currentDayOfWeek).OrderBy(d => d);
        
        if (nextDays.Any())
        {
            var nextDay = nextDays.First();
            return localNow.AddDays(nextDay - currentDayOfWeek);
        }
        
        // Next week
        var firstDayNextWeek = daysOfWeek.Min();
        return localNow.AddDays(7 * interval - currentDayOfWeek + firstDayNextWeek);
    }

    private DateTime CalculateMonthlyNext(DateTime localNow, int interval, int? dayOfMonth)
    {
        var targetDay = dayOfMonth ?? localNow.Day;
        var nextMonth = localNow.AddMonths(interval);
        
        // Handle cases where target day doesn't exist in the next month
        var daysInNextMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
        if (targetDay > daysInNextMonth)
        {
            targetDay = daysInNextMonth;
        }
        
        return new DateTime(nextMonth.Year, nextMonth.Month, targetDay, localNow.Hour, localNow.Minute, localNow.Second);
    }

    private async Task<CampaignScheduleResponse> GetScheduleResponse(Guid scheduleId)
    {
        var schedule = await _context.CampaignSchedules
            .Where(cs => cs.Id == scheduleId)
            .Include(cs => cs.Campaign)
            .Include(cs => cs.CreatedByUser)
            .Include(cs => cs.UpdatedByUser)
            .FirstOrDefaultAsync();

        if (schedule == null)
            throw new InvalidOperationException($"Schedule {scheduleId} not found");

        return new CampaignScheduleResponse
        {
            Id = schedule.Id,
            CampaignId = schedule.CampaignId,
            CampaignName = schedule.Campaign.Name,
            ScheduleType = schedule.ScheduleType,
            ScheduledAt = schedule.ScheduledAt,
            Timezone = schedule.Timezone,
            IsRecurring = schedule.IsRecurring,
            RecurrencePattern = schedule.RecurrencePattern,
            RecurrenceInterval = schedule.RecurrenceInterval,
            RecurrenceDaysOfWeek = string.IsNullOrEmpty(schedule.RecurrenceDaysOfWeek) 
                ? null 
                : JsonSerializer.Deserialize<int[]>(schedule.RecurrenceDaysOfWeek),
            RecurrenceDayOfMonth = schedule.RecurrenceDayOfMonth,
            RecurrenceEndDate = schedule.RecurrenceEndDate,
            MaxOccurrences = schedule.MaxOccurrences,
            OccurrenceCount = schedule.OccurrenceCount,
            AutomationTrigger = schedule.AutomationTrigger,
            TriggerConditions = string.IsNullOrEmpty(schedule.TriggerConditions)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, object>>(schedule.TriggerConditions),
            TriggerDelayMinutes = schedule.TriggerDelayMinutes,
            IsActive = schedule.IsActive,
            NextExecution = schedule.NextExecution,
            LastExecution = schedule.LastExecution,
            ExecutionCount = schedule.ExecutionCount,
            Priority = schedule.Priority,
            Notes = schedule.Notes,
            CreatedAt = schedule.CreatedAt,
            CreatedBy = schedule.CreatedBy,
            CreatedByName = schedule.CreatedByUser.Name,
            UpdatedAt = schedule.UpdatedAt,
            UpdatedBy = schedule.UpdatedBy,
            UpdatedByName = schedule.UpdatedByUser?.Name
        };
    }
}