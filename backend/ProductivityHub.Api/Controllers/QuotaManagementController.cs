using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/settings/quota")]
[Authorize]
public class QuotaManagementController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<QuotaManagementController> _logger;

    public QuotaManagementController(ApplicationDbContext context, ILogger<QuotaManagementController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("configurations")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<List<QuotaConfigurationResponse>>> GetQuotaConfigurations()
    {
        var tenantId = User.GetTenantId();

        try
        {
            var configurations = await _context.QuotaConfigurations
                .Where(qc => qc.TenantId == tenantId)
                .Include(qc => qc.CreatedByUser)
                .Include(qc => qc.UpdatedByUser)
                .OrderBy(qc => qc.ChannelType)
                .Select(qc => new QuotaConfigurationResponse
                {
                    Id = qc.Id,
                    ChannelType = qc.ChannelType,
                    MonthlyLimit = qc.MonthlyLimit,
                    DailyLimit = qc.DailyLimit,
                    HourlyLimit = qc.HourlyLimit,
                    EnableHardLimit = qc.EnableHardLimit,
                    WarningThresholdPercent = qc.WarningThresholdPercent,
                    AlertThresholdPercent = qc.AlertThresholdPercent,
                    AutoRecharge = qc.AutoRecharge,
                    RechargeAmount = qc.RechargeAmount,
                    CostPerMessage = qc.CostPerMessage,
                    CreatedAt = qc.CreatedAt,
                    UpdatedAt = qc.UpdatedAt,
                    CreatedByName = qc.CreatedByUser.Name,
                    UpdatedByName = qc.UpdatedByUser != null ? qc.UpdatedByUser.Name : null
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} quota configurations for tenant {TenantId}", configurations.Count, tenantId);
            return Ok(configurations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quota configurations for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving quota configurations" });
        }
    }

    [HttpGet("configurations/{channelType}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<QuotaConfigurationResponse>> GetQuotaConfiguration(ChannelType channelType)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var configuration = await _context.QuotaConfigurations
                .Where(qc => qc.TenantId == tenantId && qc.ChannelType == channelType)
                .Include(qc => qc.CreatedByUser)
                .Include(qc => qc.UpdatedByUser)
                .Select(qc => new QuotaConfigurationResponse
                {
                    Id = qc.Id,
                    ChannelType = qc.ChannelType,
                    MonthlyLimit = qc.MonthlyLimit,
                    DailyLimit = qc.DailyLimit,
                    HourlyLimit = qc.HourlyLimit,
                    EnableHardLimit = qc.EnableHardLimit,
                    WarningThresholdPercent = qc.WarningThresholdPercent,
                    AlertThresholdPercent = qc.AlertThresholdPercent,
                    AutoRecharge = qc.AutoRecharge,
                    RechargeAmount = qc.RechargeAmount,
                    CostPerMessage = qc.CostPerMessage,
                    CreatedAt = qc.CreatedAt,
                    UpdatedAt = qc.UpdatedAt,
                    CreatedByName = qc.CreatedByUser.Name,
                    UpdatedByName = qc.UpdatedByUser != null ? qc.UpdatedByUser.Name : null
                })
                .FirstOrDefaultAsync();

            if (configuration == null)
            {
                return NotFound(new { message = "Quota configuration not found for this channel type" });
            }

            return Ok(configuration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quota configuration for channel type {ChannelType} for tenant {TenantId}", channelType, tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving quota configuration" });
        }
    }

    [HttpPut("configurations/{channelType}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<QuotaConfigurationResponse>> UpdateQuotaConfiguration(ChannelType channelType, [FromBody] QuotaConfigurationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var configuration = await _context.QuotaConfigurations
                .FirstOrDefaultAsync(qc => qc.TenantId == tenantId && qc.ChannelType == channelType);

            if (configuration == null)
            {
                // Create new configuration
                configuration = new QuotaConfiguration
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ChannelType = channelType,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.QuotaConfigurations.Add(configuration);
            }

            // Update configuration
            configuration.MonthlyLimit = request.MonthlyLimit;
            configuration.DailyLimit = request.DailyLimit;
            configuration.HourlyLimit = request.HourlyLimit;
            configuration.EnableHardLimit = request.EnableHardLimit;
            configuration.WarningThresholdPercent = request.WarningThresholdPercent;
            configuration.AlertThresholdPercent = request.AlertThresholdPercent;
            configuration.AutoRecharge = request.AutoRecharge;
            configuration.RechargeAmount = request.RechargeAmount;
            configuration.CostPerMessage = request.CostPerMessage;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            configuration = await _context.QuotaConfigurations
                .Include(qc => qc.CreatedByUser)
                .Include(qc => qc.UpdatedByUser)
                .FirstAsync(qc => qc.Id == configuration.Id);

            var response = new QuotaConfigurationResponse
            {
                Id = configuration.Id,
                ChannelType = configuration.ChannelType,
                MonthlyLimit = configuration.MonthlyLimit,
                DailyLimit = configuration.DailyLimit,
                HourlyLimit = configuration.HourlyLimit,
                EnableHardLimit = configuration.EnableHardLimit,
                WarningThresholdPercent = configuration.WarningThresholdPercent,
                AlertThresholdPercent = configuration.AlertThresholdPercent,
                AutoRecharge = configuration.AutoRecharge,
                RechargeAmount = configuration.RechargeAmount,
                CostPerMessage = configuration.CostPerMessage,
                CreatedAt = configuration.CreatedAt,
                UpdatedAt = configuration.UpdatedAt,
                CreatedByName = configuration.CreatedByUser.Name,
                UpdatedByName = configuration.UpdatedByUser?.Name
            };

            _logger.LogInformation("Updated quota configuration for {ChannelType} for tenant {TenantId} by user {UserId}", channelType, tenantId, userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating quota configuration for {ChannelType} for tenant {TenantId}", channelType, tenantId);
            return StatusCode(500, new { message = "An error occurred while updating quota configuration" });
        }
    }

    [HttpGet("usage")]
    public async Task<ActionResult<QuotaUsageListResponse>> GetQuotaUsage([FromQuery] QuotaUsageSearchRequest request)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var query = _context.QuotaUsages
                .Where(qu => qu.TenantId == tenantId)
                .AsQueryable();

            // Apply filters
            if (request.ChannelType.HasValue)
            {
                query = query.Where(qu => qu.ChannelType == request.ChannelType.Value);
            }

            if (request.StartDate.HasValue)
            {
                query = query.Where(qu => qu.UsageDate >= request.StartDate.Value);
            }

            if (request.EndDate.HasValue)
            {
                query = query.Where(qu => qu.UsageDate <= request.EndDate.Value);
            }

            var totalCount = await query.CountAsync();

            var usages = await query
                .OrderByDescending(qu => qu.UsageDate)
                .ThenByDescending(qu => qu.UsageHour)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(qu => new QuotaUsageResponse
                {
                    ChannelType = qu.ChannelType,
                    UsageDate = qu.UsageDate,
                    MessageCount = qu.MessageCount,
                    SuccessfulCount = qu.SuccessfulCount,
                    FailedCount = qu.FailedCount,
                    TotalCost = qu.TotalCost
                })
                .ToListAsync();

            var response = new QuotaUsageListResponse
            {
                Items = usages,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };

            _logger.LogInformation("Retrieved {Count} quota usage records for tenant {TenantId}", usages.Count, tenantId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quota usage for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving quota usage" });
        }
    }

    [HttpGet("usage/summary")]
    public async Task<ActionResult<object>> GetQuotaUsageSummary()
    {
        var tenantId = User.GetTenantId();

        try
        {
            var currentMonth = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-DateTime.UtcNow.Day + 1));
            var currentDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            var currentHour = DateTime.UtcNow.Hour;

            var monthlySummary = await _context.QuotaUsages
                .Where(qu => qu.TenantId == tenantId && qu.UsageDate >= currentMonth)
                .GroupBy(qu => qu.ChannelType)
                .Select(g => new
                {
                    ChannelType = g.Key,
                    MonthlyMessageCount = g.Sum(qu => qu.MessageCount),
                    MonthlySuccessfulCount = g.Sum(qu => qu.SuccessfulCount),
                    MonthlyFailedCount = g.Sum(qu => qu.FailedCount),
                    MonthlyTotalCost = g.Sum(qu => qu.TotalCost)
                })
                .ToListAsync();

            var dailySummary = await _context.QuotaUsages
                .Where(qu => qu.TenantId == tenantId && qu.UsageDate == currentDate)
                .GroupBy(qu => qu.ChannelType)
                .Select(g => new
                {
                    ChannelType = g.Key,
                    DailyMessageCount = g.Sum(qu => qu.MessageCount),
                    DailySuccessfulCount = g.Sum(qu => qu.SuccessfulCount),
                    DailyFailedCount = g.Sum(qu => qu.FailedCount),
                    DailyTotalCost = g.Sum(qu => qu.TotalCost)
                })
                .ToListAsync();

            var hourlySummary = await _context.QuotaUsages
                .Where(qu => qu.TenantId == tenantId && qu.UsageDate == currentDate && qu.UsageHour == currentHour)
                .GroupBy(qu => qu.ChannelType)
                .Select(g => new
                {
                    ChannelType = g.Key,
                    HourlyMessageCount = g.Sum(qu => qu.MessageCount),
                    HourlySuccessfulCount = g.Sum(qu => qu.SuccessfulCount),
                    HourlyFailedCount = g.Sum(qu => qu.FailedCount),
                    HourlyTotalCost = g.Sum(qu => qu.TotalCost)
                })
                .ToListAsync();

            // Get quota configurations for comparison
            var quotaConfigs = await _context.QuotaConfigurations
                .Where(qc => qc.TenantId == tenantId)
                .ToDictionaryAsync(qc => qc.ChannelType);

            var summary = new
            {
                CurrentMonth = currentMonth,
                CurrentDate = currentDate,
                CurrentHour = currentHour,
                Channels = Enum.GetValues<ChannelType>().Select(ct => new
                {
                    ChannelType = ct,
                    Configuration = quotaConfigs.GetValueOrDefault(ct),
                    Monthly = monthlySummary.FirstOrDefault(ms => ms.ChannelType == ct),
                    Daily = dailySummary.FirstOrDefault(ds => ds.ChannelType == ct),
                    Hourly = hourlySummary.FirstOrDefault(hs => hs.ChannelType == ct)
                })
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving quota usage summary for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving quota usage summary" });
        }
    }
}