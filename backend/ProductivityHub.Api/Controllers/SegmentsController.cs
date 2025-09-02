using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Services;
using System.Security.Claims;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SegmentsController : ControllerBase
{
    private readonly ISegmentService _segmentService;
    private readonly ISegmentEvaluationService _evaluationService;
    private readonly ILogger<SegmentsController> _logger;

    public SegmentsController(
        ISegmentService segmentService,
        ISegmentEvaluationService evaluationService,
        ILogger<SegmentsController> logger)
    {
        _segmentService = segmentService;
        _evaluationService = evaluationService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all segments for the current tenant
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<SegmentDto>>> GetSegments([FromQuery] bool includeInactive = false)
    {
        var tenantId = GetTenantId();
        var segments = await _segmentService.GetSegmentsAsync(tenantId, includeInactive);
        return Ok(segments);
    }

    /// <summary>
    /// Gets a specific segment by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SegmentDto>> GetSegment(Guid id)
    {
        var tenantId = GetTenantId();
        var segment = await _segmentService.GetSegmentAsync(tenantId, id);
        
        if (segment == null)
        {
            return NotFound();
        }

        return Ok(segment);
    }

    /// <summary>
    /// Creates a new segment
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SegmentDto>> CreateSegment([FromBody] CreateSegmentRequest request)
    {
        try
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            
            var segment = await _segmentService.CreateSegmentAsync(tenantId, userId, request);
            return CreatedAtAction(nameof(GetSegment), new { id = segment.Id }, segment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating segment for tenant {TenantId}", GetTenantId());
            return StatusCode(500, new { error = "An error occurred while creating the segment" });
        }
    }

    /// <summary>
    /// Updates an existing segment
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SegmentDto>> UpdateSegment(Guid id, [FromBody] UpdateSegmentRequest request)
    {
        try
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            
            var segment = await _segmentService.UpdateSegmentAsync(tenantId, userId, id, request);
            return Ok(segment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating segment {SegmentId} for tenant {TenantId}", id, GetTenantId());
            return StatusCode(500, new { error = "An error occurred while updating the segment" });
        }
    }

    /// <summary>
    /// Deletes a segment (soft delete)
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteSegment(Guid id)
    {
        try
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            
            var deleted = await _segmentService.DeleteSegmentAsync(tenantId, userId, id);
            
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting segment {SegmentId} for tenant {TenantId}", id, GetTenantId());
            return StatusCode(500, new { error = "An error occurred while deleting the segment" });
        }
    }

    /// <summary>
    /// Clones an existing segment
    /// </summary>
    [HttpPost("{id:guid}/clone")]
    public async Task<ActionResult<SegmentDto>> CloneSegment(Guid id, [FromBody] CloneSegmentRequest request)
    {
        try
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            
            var clonedSegment = await _segmentService.CloneSegmentAsync(tenantId, userId, id, request.Name, request.Description);
            return CreatedAtAction(nameof(GetSegment), new { id = clonedSegment.Id }, clonedSegment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cloning segment {SegmentId} for tenant {TenantId}", id, GetTenantId());
            return StatusCode(500, new { error = "An error occurred while cloning the segment" });
        }
    }

    /// <summary>
    /// Evaluates segment rules and returns count + sample contacts
    /// </summary>
    [HttpPost("evaluate")]
    public async Task<ActionResult<EvaluateSegmentResponse>> EvaluateSegment([FromBody] EvaluateSegmentRequest request)
    {
        try
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            
            var result = await _evaluationService.EvaluateAsync(tenantId, request.Rules, request.SampleSize);
            
            // Record evaluation audit
            await _segmentService.RecordUsageAsync(tenantId, userId, Guid.Empty, "evaluate", "preview", 
                result.TotalCount, result.ExecutionTimeMs);

            return Ok(new EvaluateSegmentResponse
            {
                TotalCount = result.TotalCount,
                SampleContacts = result.SampleContacts,
                ExecutionTimeMs = result.ExecutionTimeMs
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Rate limit"))
        {
            return StatusCode(429, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating segment rules for tenant {TenantId}", GetTenantId());
            return StatusCode(500, new { error = "An error occurred while evaluating the segment" });
        }
    }

    /// <summary>
    /// Gets usage history for a specific segment
    /// </summary>
    [HttpGet("{id:guid}/usage")]
    public async Task<ActionResult<List<SegmentUsageAuditDto>>> GetSegmentUsage(Guid id, [FromQuery] int limit = 50)
    {
        try
        {
            var tenantId = GetTenantId();
            var usage = await _segmentService.GetUsageHistoryAsync(tenantId, id, limit);
            return Ok(usage);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting usage history for segment {SegmentId}", id);
            return StatusCode(500, new { error = "An error occurred while retrieving usage history" });
        }
    }

    /// <summary>
    /// Gets contact IDs matching a segment (for campaign/export use)
    /// </summary>
    [HttpPost("{id:guid}/contacts")]
    public async Task<ActionResult<List<Guid>>> GetSegmentContactIds(Guid id, [FromQuery] int? limit = null)
    {
        try
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            
            var segment = await _segmentService.GetSegmentAsync(tenantId, id);
            if (segment == null)
            {
                return NotFound();
            }

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var contactIds = await _evaluationService.GetContactIdsAsync(tenantId, segment.Rules, limit);
            stopwatch.Stop();

            // Record usage audit
            await _segmentService.RecordUsageAsync(tenantId, userId, id, "apply", "contact_ids", 
                contactIds.Count, (int)stopwatch.ElapsedMilliseconds);

            return Ok(contactIds);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting contact IDs for segment {SegmentId}", id);
            return StatusCode(500, new { error = "An error occurred while retrieving contact IDs" });
        }
    }

    /// <summary>
    /// Validates segment rules without executing them
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<SegmentValidationResult>> ValidateRules([FromBody] ValidateRulesRequest request)
    {
        try
        {
            var result = await _evaluationService.ValidateRulesAsync(request.Rules);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating segment rules for tenant {TenantId}", GetTenantId());
            return StatusCode(500, new { error = "An error occurred while validating the rules" });
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

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid or missing user ID");
        }
        return userId;
    }
}

// Additional request DTOs
public class CloneSegmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ValidateRulesRequest
{
    public SegmentRule Rules { get; set; } = new SegmentRuleGroup();
}