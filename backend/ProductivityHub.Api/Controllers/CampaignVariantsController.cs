using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// Controller for managing campaign variants (A/B testing)
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CampaignVariantsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CampaignVariantsController> _logger;

    public CampaignVariantsController(ApplicationDbContext context, ILogger<CampaignVariantsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all variants for a campaign
    /// </summary>
    [HttpGet("campaign/{campaignId}")]
    public async Task<IActionResult> GetCampaignVariants(Guid campaignId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var variants = await _context.CampaignVariants
                .Where(cv => cv.TenantId == tenantId && cv.CampaignId == campaignId)
                .OrderBy(cv => cv.Label)
                .ToListAsync();

            return Ok(variants);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting campaign variants for campaign {CampaignId}", campaignId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get a specific campaign variant
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCampaignVariant(Guid id)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var variant = await _context.CampaignVariants
                .Where(cv => cv.Id == id && cv.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (variant == null)
                return NotFound("Campaign variant not found");

            return Ok(variant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting campaign variant {Id}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Create a new campaign variant
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateCampaignVariant([FromBody] CreateCampaignVariantRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Validate campaign exists and belongs to tenant
            var campaign = await _context.Campaigns
                .Where(c => c.Id == request.CampaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaign == null)
                return NotFound("Campaign not found");

            // Check if variant label already exists for this campaign
            var existingVariant = await _context.CampaignVariants
                .Where(cv => cv.CampaignId == request.CampaignId && cv.Label == request.Label)
                .FirstOrDefaultAsync();

            if (existingVariant != null)
                return BadRequest($"Variant with label '{request.Label}' already exists for this campaign");

            // Check total allocation doesn't exceed 100%
            var totalAllocation = await _context.CampaignVariants
                .Where(cv => cv.CampaignId == request.CampaignId && cv.IsActive)
                .SumAsync(cv => cv.AllocationPercentage);

            if (totalAllocation + request.AllocationPercentage > 100)
                return BadRequest($"Total allocation would exceed 100%. Current allocation: {totalAllocation}%");

            var variant = new CampaignVariant
            {
                TenantId = tenantId,
                CampaignId = request.CampaignId,
                Label = request.Label,
                Description = request.Description,
                AllocationPercentage = request.AllocationPercentage,
                MessageContent = request.MessageContent,
                SubjectLine = request.SubjectLine,
                IsActive = request.IsActive ?? true
            };

            _context.CampaignVariants.Add(variant);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCampaignVariant), new { id = variant.Id }, variant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating campaign variant");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Update a campaign variant
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCampaignVariant(Guid id, [FromBody] UpdateCampaignVariantRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var variant = await _context.CampaignVariants
                .Where(cv => cv.Id == id && cv.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (variant == null)
                return NotFound("Campaign variant not found");

            // Check allocation constraints if allocation is being changed
            if (request.AllocationPercentage.HasValue && request.AllocationPercentage.Value != variant.AllocationPercentage)
            {
                var totalAllocation = await _context.CampaignVariants
                    .Where(cv => cv.CampaignId == variant.CampaignId && cv.IsActive && cv.Id != id)
                    .SumAsync(cv => cv.AllocationPercentage);

                if (totalAllocation + request.AllocationPercentage.Value > 100)
                    return BadRequest($"Total allocation would exceed 100%. Current allocation (excluding this variant): {totalAllocation}%");
            }

            // Update fields if provided
            if (!string.IsNullOrEmpty(request.Description))
                variant.Description = request.Description;

            if (request.AllocationPercentage.HasValue)
                variant.AllocationPercentage = request.AllocationPercentage.Value;

            if (!string.IsNullOrEmpty(request.MessageContent))
                variant.MessageContent = request.MessageContent;

            if (!string.IsNullOrEmpty(request.SubjectLine))
                variant.SubjectLine = request.SubjectLine;

            if (request.IsActive.HasValue)
                variant.IsActive = request.IsActive.Value;

            variant.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(variant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating campaign variant {Id}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Delete a campaign variant
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCampaignVariant(Guid id)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var variant = await _context.CampaignVariants
                .Where(cv => cv.Id == id && cv.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (variant == null)
                return NotFound("Campaign variant not found");

            // Check if variant has associated events
            var hasEvents = await _context.CampaignEvents
                .AnyAsync(ce => ce.CampaignId == variant.CampaignId && ce.AbGroup == variant.Label);

            if (hasEvents)
                return BadRequest("Cannot delete variant with associated campaign events");

            _context.CampaignVariants.Remove(variant);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting campaign variant {Id}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get performance comparison between variants
    /// </summary>
    [HttpGet("campaign/{campaignId}/performance")]
    public async Task<IActionResult> GetVariantPerformance(Guid campaignId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var performance = await _context.CampaignEvents
                .Where(ce => ce.TenantId == tenantId && ce.CampaignId == campaignId && ce.AbGroup != null)
                .GroupBy(ce => ce.AbGroup)
                .Select(g => new
                {
                    VariantLabel = g.Key,
                    TotalEvents = g.Count(),
                    SentCount = g.Count(e => e.EventType == EventType.Sent),
                    DeliveredCount = g.Count(e => e.EventType == EventType.Delivered),
                    OpenedCount = g.Count(e => e.EventType == EventType.Opened),
                    ClickedCount = g.Count(e => e.EventType == EventType.Clicked),
                    FailedCount = g.Count(e => e.EventType == EventType.Failed),
                    UnsubscribedCount = g.Count(e => e.EventType == EventType.Unsubscribed),
                    TotalCost = g.Sum(e => e.CostAmount),
                    UniqueRecipients = g.Select(e => e.ContactId).Distinct().Count(),
                    DeliveryRate = g.Count(e => e.EventType == EventType.Sent) > 0 
                        ? (double)g.Count(e => e.EventType == EventType.Delivered) / g.Count(e => e.EventType == EventType.Sent) * 100 
                        : 0,
                    OpenRate = g.Count(e => e.EventType == EventType.Delivered) > 0 
                        ? (double)g.Count(e => e.EventType == EventType.Opened) / g.Count(e => e.EventType == EventType.Delivered) * 100 
                        : 0,
                    ClickRate = g.Count(e => e.EventType == EventType.Opened) > 0 
                        ? (double)g.Count(e => e.EventType == EventType.Clicked) / g.Count(e => e.EventType == EventType.Opened) * 100 
                        : 0
                })
                .OrderBy(p => p.VariantLabel)
                .ToListAsync();

            return Ok(performance);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting variant performance for campaign {CampaignId}", campaignId);
            return StatusCode(500, "Internal server error");
        }
    }
}

/// <summary>
/// Request model for creating campaign variants
/// </summary>
public class CreateCampaignVariantRequest
{
    public Guid CampaignId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal AllocationPercentage { get; set; } = 50.0m;
    public string? MessageContent { get; set; }
    public string? SubjectLine { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// Request model for updating campaign variants
/// </summary>
public class UpdateCampaignVariantRequest
{
    public string? Description { get; set; }
    public decimal? AllocationPercentage { get; set; }
    public string? MessageContent { get; set; }
    public string? SubjectLine { get; set; }
    public bool? IsActive { get; set; }
}