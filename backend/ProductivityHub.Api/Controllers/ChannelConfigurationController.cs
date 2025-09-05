using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/settings/channels")]
[Authorize]
public class ChannelConfigurationController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ChannelConfigurationController> _logger;

    public ChannelConfigurationController(ApplicationDbContext context, ILogger<ChannelConfigurationController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<List<ChannelConfigurationResponse>>> GetChannelConfigurations()
    {
        var tenantId = User.GetTenantId();

        try
        {
            var configurations = await _context.ChannelConfigurations
                .Where(cc => cc.TenantId == tenantId)
                .Include(cc => cc.CreatedByUser)
                .Include(cc => cc.UpdatedByUser)
                .OrderBy(cc => cc.PriorityOrder)
                .ThenBy(cc => cc.ChannelType)
                .Select(cc => new ChannelConfigurationResponse
                {
                    Id = cc.Id,
                    ChannelType = cc.ChannelType,
                    ProviderName = cc.ProviderName,
                    Configuration = JsonSerializer.Deserialize<Dictionary<string, object>>(cc.Configuration) ?? new(),
                    Status = cc.Status,
                    IsDefault = cc.IsDefault,
                    PriorityOrder = cc.PriorityOrder,
                    RateLimitPerMinute = cc.RateLimitPerMinute,
                    RateLimitPerHour = cc.RateLimitPerHour,
                    RateLimitPerDay = cc.RateLimitPerDay,
                    EnableFallback = cc.EnableFallback,
                    LastTestAt = cc.LastTestAt,
                    LastTestResult = cc.LastTestResult,
                    CreatedAt = cc.CreatedAt,
                    UpdatedAt = cc.UpdatedAt,
                    CreatedByName = cc.CreatedByUser.Name,
                    UpdatedByName = cc.UpdatedByUser != null ? cc.UpdatedByUser.Name : null
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} channel configurations for tenant {TenantId}", configurations.Count, tenantId);
            return Ok(configurations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving channel configurations for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving channel configurations" });
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<ChannelConfigurationResponse>> GetChannelConfiguration(Guid id)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var configuration = await _context.ChannelConfigurations
                .Where(cc => cc.TenantId == tenantId && cc.Id == id)
                .Include(cc => cc.CreatedByUser)
                .Include(cc => cc.UpdatedByUser)
                .Select(cc => new ChannelConfigurationResponse
                {
                    Id = cc.Id,
                    ChannelType = cc.ChannelType,
                    ProviderName = cc.ProviderName,
                    Configuration = JsonSerializer.Deserialize<Dictionary<string, object>>(cc.Configuration) ?? new(),
                    Status = cc.Status,
                    IsDefault = cc.IsDefault,
                    PriorityOrder = cc.PriorityOrder,
                    RateLimitPerMinute = cc.RateLimitPerMinute,
                    RateLimitPerHour = cc.RateLimitPerHour,
                    RateLimitPerDay = cc.RateLimitPerDay,
                    EnableFallback = cc.EnableFallback,
                    LastTestAt = cc.LastTestAt,
                    LastTestResult = cc.LastTestResult,
                    CreatedAt = cc.CreatedAt,
                    UpdatedAt = cc.UpdatedAt,
                    CreatedByName = cc.CreatedByUser.Name,
                    UpdatedByName = cc.UpdatedByUser != null ? cc.UpdatedByUser.Name : null
                })
                .FirstOrDefaultAsync();

            if (configuration == null)
            {
                return NotFound(new { message = "Channel configuration not found" });
            }

            return Ok(configuration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving channel configuration {Id} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving channel configuration" });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<ChannelConfigurationResponse>> CreateChannelConfiguration([FromBody] ChannelConfigurationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            // Check if this would be a duplicate default channel for the type
            if (request.IsDefault)
            {
                var existingDefault = await _context.ChannelConfigurations
                    .AnyAsync(cc => cc.TenantId == tenantId && cc.ChannelType == request.ChannelType && cc.IsDefault);

                if (existingDefault)
                {
                    return BadRequest(new { message = $"A default {request.ChannelType} configuration already exists" });
                }
            }

            var configuration = new ChannelConfiguration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ChannelType = request.ChannelType,
                ProviderName = request.ProviderName,
                Configuration = JsonSerializer.Serialize(request.Configuration),
                Status = ChannelStatus.Inactive,
                IsDefault = request.IsDefault,
                PriorityOrder = request.PriorityOrder,
                RateLimitPerMinute = request.RateLimitPerMinute,
                RateLimitPerHour = request.RateLimitPerHour,
                RateLimitPerDay = request.RateLimitPerDay,
                EnableFallback = request.EnableFallback,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ChannelConfigurations.Add(configuration);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            configuration = await _context.ChannelConfigurations
                .Include(cc => cc.CreatedByUser)
                .Include(cc => cc.UpdatedByUser)
                .FirstAsync(cc => cc.Id == configuration.Id);

            var response = new ChannelConfigurationResponse
            {
                Id = configuration.Id,
                ChannelType = configuration.ChannelType,
                ProviderName = configuration.ProviderName,
                Configuration = JsonSerializer.Deserialize<Dictionary<string, object>>(configuration.Configuration) ?? new(),
                Status = configuration.Status,
                IsDefault = configuration.IsDefault,
                PriorityOrder = configuration.PriorityOrder,
                RateLimitPerMinute = configuration.RateLimitPerMinute,
                RateLimitPerHour = configuration.RateLimitPerHour,
                RateLimitPerDay = configuration.RateLimitPerDay,
                EnableFallback = configuration.EnableFallback,
                LastTestAt = configuration.LastTestAt,
                LastTestResult = configuration.LastTestResult,
                CreatedAt = configuration.CreatedAt,
                UpdatedAt = configuration.UpdatedAt,
                CreatedByName = configuration.CreatedByUser.Name,
                UpdatedByName = configuration.UpdatedByUser?.Name
            };

            _logger.LogInformation("Created channel configuration {Id} for {ChannelType} - {ProviderName} for tenant {TenantId} by user {UserId}", 
                configuration.Id, request.ChannelType, request.ProviderName, tenantId, userId);

            return CreatedAtAction(nameof(GetChannelConfiguration), new { id = configuration.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating channel configuration for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while creating channel configuration" });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<ChannelConfigurationResponse>> UpdateChannelConfiguration(Guid id, [FromBody] ChannelConfigurationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var configuration = await _context.ChannelConfigurations
                .FirstOrDefaultAsync(cc => cc.TenantId == tenantId && cc.Id == id);

            if (configuration == null)
            {
                return NotFound(new { message = "Channel configuration not found" });
            }

            // Check if this would create a duplicate default channel for the type
            if (request.IsDefault && !configuration.IsDefault)
            {
                var existingDefault = await _context.ChannelConfigurations
                    .AnyAsync(cc => cc.TenantId == tenantId && cc.ChannelType == request.ChannelType && cc.IsDefault && cc.Id != id);

                if (existingDefault)
                {
                    // Remove default from other configurations of the same type
                    var otherDefaults = await _context.ChannelConfigurations
                        .Where(cc => cc.TenantId == tenantId && cc.ChannelType == request.ChannelType && cc.IsDefault && cc.Id != id)
                        .ToListAsync();

                    foreach (var other in otherDefaults)
                    {
                        other.IsDefault = false;
                        other.UpdatedAt = DateTime.UtcNow;
                        other.UpdatedBy = userId;
                    }
                }
            }

            // Update configuration
            configuration.ChannelType = request.ChannelType;
            configuration.ProviderName = request.ProviderName;
            configuration.Configuration = JsonSerializer.Serialize(request.Configuration);
            configuration.IsDefault = request.IsDefault;
            configuration.PriorityOrder = request.PriorityOrder;
            configuration.RateLimitPerMinute = request.RateLimitPerMinute;
            configuration.RateLimitPerHour = request.RateLimitPerHour;
            configuration.RateLimitPerDay = request.RateLimitPerDay;
            configuration.EnableFallback = request.EnableFallback;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            configuration = await _context.ChannelConfigurations
                .Include(cc => cc.CreatedByUser)
                .Include(cc => cc.UpdatedByUser)
                .FirstAsync(cc => cc.Id == configuration.Id);

            var response = new ChannelConfigurationResponse
            {
                Id = configuration.Id,
                ChannelType = configuration.ChannelType,
                ProviderName = configuration.ProviderName,
                Configuration = JsonSerializer.Deserialize<Dictionary<string, object>>(configuration.Configuration) ?? new(),
                Status = configuration.Status,
                IsDefault = configuration.IsDefault,
                PriorityOrder = configuration.PriorityOrder,
                RateLimitPerMinute = configuration.RateLimitPerMinute,
                RateLimitPerHour = configuration.RateLimitPerHour,
                RateLimitPerDay = configuration.RateLimitPerDay,
                EnableFallback = configuration.EnableFallback,
                LastTestAt = configuration.LastTestAt,
                LastTestResult = configuration.LastTestResult,
                CreatedAt = configuration.CreatedAt,
                UpdatedAt = configuration.UpdatedAt,
                CreatedByName = configuration.CreatedByUser.Name,
                UpdatedByName = configuration.UpdatedByUser?.Name
            };

            _logger.LogInformation("Updated channel configuration {Id} for tenant {TenantId} by user {UserId}", id, tenantId, userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating channel configuration {Id} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while updating channel configuration" });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult> DeleteChannelConfiguration(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var configuration = await _context.ChannelConfigurations
                .FirstOrDefaultAsync(cc => cc.TenantId == tenantId && cc.Id == id);

            if (configuration == null)
            {
                return NotFound(new { message = "Channel configuration not found" });
            }

            _context.ChannelConfigurations.Remove(configuration);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted channel configuration {Id} for tenant {TenantId} by user {UserId}", id, tenantId, userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting channel configuration {Id} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while deleting channel configuration" });
        }
    }

    [HttpPost("{id:guid}/test")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<ChannelTestResponse>> TestChannelConfiguration(Guid id, [FromBody] ChannelTestRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var configuration = await _context.ChannelConfigurations
                .FirstOrDefaultAsync(cc => cc.TenantId == tenantId && cc.Id == id);

            if (configuration == null)
            {
                return NotFound(new { message = "Channel configuration not found" });
            }

            // TODO: Implement actual channel testing logic based on channel type
            var testResult = await PerformChannelTest(configuration, request);

            // Update last test results
            configuration.LastTestAt = DateTime.UtcNow;
            configuration.LastTestResult = JsonSerializer.Serialize(new { 
                success = testResult.Success, 
                message = testResult.Message,
                details = testResult.Details,
                testedAt = testResult.TestedAt
            });
            
            // Update status based on test result
            configuration.Status = testResult.Success ? ChannelStatus.Active : ChannelStatus.Failed;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Tested channel configuration {Id} for tenant {TenantId} by user {UserId} - Success: {Success}", 
                id, tenantId, userId, testResult.Success);

            return Ok(testResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing channel configuration {Id} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while testing channel configuration" });
        }
    }

    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult> ActivateChannelConfiguration(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var configuration = await _context.ChannelConfigurations
                .FirstOrDefaultAsync(cc => cc.TenantId == tenantId && cc.Id == id);

            if (configuration == null)
            {
                return NotFound(new { message = "Channel configuration not found" });
            }

            if (configuration.Status == ChannelStatus.Failed)
            {
                return BadRequest(new { message = "Cannot activate a failed channel configuration. Please test it first." });
            }

            configuration.Status = ChannelStatus.Active;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Activated channel configuration {Id} for tenant {TenantId} by user {UserId}", id, tenantId, userId);
            return Ok(new { message = "Channel configuration activated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating channel configuration {Id} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while activating channel configuration" });
        }
    }

    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult> DeactivateChannelConfiguration(Guid id)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var configuration = await _context.ChannelConfigurations
                .FirstOrDefaultAsync(cc => cc.TenantId == tenantId && cc.Id == id);

            if (configuration == null)
            {
                return NotFound(new { message = "Channel configuration not found" });
            }

            configuration.Status = ChannelStatus.Inactive;
            configuration.UpdatedBy = userId;
            configuration.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deactivated channel configuration {Id} for tenant {TenantId} by user {UserId}", id, tenantId, userId);
            return Ok(new { message = "Channel configuration deactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating channel configuration {Id} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while deactivating channel configuration" });
        }
    }

    private async Task<ChannelTestResponse> PerformChannelTest(ChannelConfiguration configuration, ChannelTestRequest request)
    {
        // TODO: Implement actual channel testing based on channel type
        // This is a placeholder implementation
        
        try
        {
            await Task.Delay(500); // Simulate API call delay

            var configDict = JsonSerializer.Deserialize<Dictionary<string, object>>(configuration.Configuration) ?? new();

            switch (configuration.ChannelType)
            {
                case ChannelType.SMS:
                    return await TestSmsChannel(configDict, request);
                
                case ChannelType.Kakao:
                    return await TestKakaoChannel(configDict, request);
                
                case ChannelType.Email:
                    return await TestEmailChannel(configDict, request);
                
                default:
                    return new ChannelTestResponse
                    {
                        Success = false,
                        Message = "Unsupported channel type",
                        Details = new Dictionary<string, object>
                        {
                            ["channelType"] = configuration.ChannelType.ToString(),
                            ["error"] = "Channel type not implemented"
                        }
                    };
            }
        }
        catch (Exception ex)
        {
            return new ChannelTestResponse
            {
                Success = false,
                Message = "Test failed due to error",
                Details = new Dictionary<string, object>
                {
                    ["error"] = ex.Message,
                    ["type"] = ex.GetType().Name
                }
            };
        }
    }

    private Task<ChannelTestResponse> TestSmsChannel(Dictionary<string, object> config, ChannelTestRequest request)
    {
        // TODO: Implement SMS provider testing
        return Task.FromResult(new ChannelTestResponse
        {
            Success = true,
            Message = "SMS channel test successful (mock)",
            Details = new Dictionary<string, object>
            {
                ["provider"] = config.GetValueOrDefault("provider", "unknown"),
                ["recipient"] = request.TestRecipient,
                ["messageLength"] = request.TestMessage.Length,
                ["mock"] = true
            }
        });
    }

    private Task<ChannelTestResponse> TestKakaoChannel(Dictionary<string, object> config, ChannelTestRequest request)
    {
        // TODO: Implement Kakao provider testing
        return Task.FromResult(new ChannelTestResponse
        {
            Success = true,
            Message = "Kakao channel test successful (mock)",
            Details = new Dictionary<string, object>
            {
                ["provider"] = config.GetValueOrDefault("provider", "unknown"),
                ["recipient"] = request.TestRecipient,
                ["messageLength"] = request.TestMessage.Length,
                ["mock"] = true
            }
        });
    }

    private Task<ChannelTestResponse> TestEmailChannel(Dictionary<string, object> config, ChannelTestRequest request)
    {
        // TODO: Implement Email provider testing
        return Task.FromResult(new ChannelTestResponse
        {
            Success = true,
            Message = "Email channel test successful (mock)",
            Details = new Dictionary<string, object>
            {
                ["provider"] = config.GetValueOrDefault("provider", "unknown"),
                ["recipient"] = request.TestRecipient,
                ["messageLength"] = request.TestMessage.Length,
                ["mock"] = true
            }
        });
    }
}