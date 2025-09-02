using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Services;
using System.Security.Claims;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ActivityScoreController : ControllerBase
{
    private readonly IActivityScoringService _scoringService;
    private readonly ILogger<ActivityScoreController> _logger;

    public ActivityScoreController(
        IActivityScoringService scoringService,
        ILogger<ActivityScoreController> logger)
    {
        _scoringService = scoringService;
        _logger = logger;
    }

    /// <summary>
    /// Get activity score distribution for the current tenant
    /// </summary>
    [HttpGet("distribution")]
    public async Task<ActionResult<ActivityScoreDistribution>> GetScoreDistribution()
    {
        try
        {
            var tenantId = GetTenantId();
            var distribution = await _scoringService.GetScoreDistributionAsync(tenantId);
            return Ok(distribution);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting score distribution for tenant {TenantId}", GetTenantId());
            return StatusCode(500, new { error = "An error occurred while retrieving score distribution" });
        }
    }

    /// <summary>
    /// Get contacts by activity score range
    /// </summary>
    [HttpGet("contacts")]
    public async Task<ActionResult<List<ContactDto>>> GetContactsByScoreRange(
        [FromQuery] decimal minScore = 0,
        [FromQuery] decimal maxScore = 100,
        [FromQuery] int limit = 100)
    {
        try
        {
            var tenantId = GetTenantId();
            var contacts = await _scoringService.GetContactsByScoreRangeAsync(tenantId, minScore, maxScore, limit);
            return Ok(contacts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting contacts by score range for tenant {TenantId}", GetTenantId());
            return StatusCode(500, new { error = "An error occurred while retrieving contacts" });
        }
    }

    /// <summary>
    /// Get contacts by activity level (high/medium/low)
    /// </summary>
    [HttpGet("contacts/{level}")]
    public async Task<ActionResult<List<ContactDto>>> GetContactsByActivityLevel(
        string level,
        [FromQuery] int limit = 100)
    {
        try
        {
            var tenantId = GetTenantId();
            
            var (minScore, maxScore) = level.ToLowerInvariant() switch
            {
                "high" => (70m, 100m),
                "medium" => (30m, 69.99m),
                "low" => (0m, 29.99m),
                _ => throw new ArgumentException($"Invalid activity level: {level}")
            };

            var contacts = await _scoringService.GetContactsByScoreRangeAsync(tenantId, minScore, maxScore, limit);
            return Ok(contacts);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting contacts by activity level {Level} for tenant {TenantId}", 
                level, GetTenantId());
            return StatusCode(500, new { error = "An error occurred while retrieving contacts" });
        }
    }

    /// <summary>
    /// Recalculate activity score for a specific contact
    /// </summary>
    [HttpPost("contacts/{contactId:guid}/recalculate")]
    public async Task<ActionResult> RecalculateContactScore(Guid contactId)
    {
        try
        {
            var tenantId = GetTenantId();
            await _scoringService.UpdateActivityScoreAsync(tenantId, contactId);
            return Ok(new { message = "Activity score updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recalculating activity score for contact {ContactId}", contactId);
            return StatusCode(500, new { error = "An error occurred while updating the activity score" });
        }
    }

    /// <summary>
    /// Trigger bulk recalculation of all activity scores for current tenant (admin only)
    /// </summary>
    [HttpPost("recalculate-all")]
    public async Task<ActionResult> RecalculateAllScores()
    {
        try
        {
            var tenantId = GetTenantId();
            
            // Start the recalculation process in the background
            _ = Task.Run(async () =>
            {
                try
                {
                    await _scoringService.UpdateAllActivityScoresAsync(tenantId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in background recalculation for tenant {TenantId}", tenantId);
                }
            });

            return Ok(new { message = "Bulk recalculation started. This process will run in the background." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting bulk recalculation for tenant {TenantId}", GetTenantId());
            return StatusCode(500, new { error = "An error occurred while starting the recalculation" });
        }
    }

    private Guid GetTenantId()
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            throw new UnauthorizedAccessException("Invalid or missing tenant ID");
        }
        return tenantId;
    }
}