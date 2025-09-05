using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/campaigns/templates")]
public class CampaignTemplatesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CampaignTemplatesController> _logger;

    public CampaignTemplatesController(ApplicationDbContext context, ILogger<CampaignTemplatesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<CampaignTemplateResponse>>> GetTemplates(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] bool includePublic = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var tenantId = User.GetTenantId();
        var query = _context.CampaignTemplates
            .Include(ct => ct.CreatedByUser)
            .Include(ct => ct.UpdatedByUser)
            .AsQueryable();

        // Filter by tenant or public templates
        if (includePublic)
        {
            query = query.Where(ct => ct.TenantId == tenantId || ct.IsPublic);
        }
        else
        {
            query = query.Where(ct => ct.TenantId == tenantId);
        }

        // Apply filters
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(ct => 
                EF.Functions.ILike(ct.FullName, $"%{search}%") ||
                EF.Functions.ILike(ct.Description ?? "", $"%{search}%") ||
                EF.Functions.ILike(ct.MessageBodyTemplate, $"%{search}%"));
        }

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(ct => ct.Category == category);
        }

        if (isActive.HasValue)
        {
            query = query.Where(ct => ct.IsActive == isActive.Value);
        }

        // Order by usage count descending, then by name
        query = query.OrderByDescending(ct => ct.UsageCount)
                     .ThenBy(ct => ct.Name);

        var templates = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var response = templates.Select(template => new CampaignTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            MessageTitleTemplate = template.MessageTitleTemplate,
            MessageBodyTemplate = template.MessageBodyTemplate,
            TemplateVariables = string.IsNullOrEmpty(template.TemplateVariables)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, string>>(template.TemplateVariables),
            DefaultChannels = string.IsNullOrEmpty(template.DefaultChannels)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.DefaultChannels),
            DefaultPriority = template.DefaultPriority,
            Category = template.Category,
            Tags = string.IsNullOrEmpty(template.Tags)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.Tags),
            IsPublic = template.IsPublic,
            UsageCount = template.UsageCount,
            LastUsed = template.LastUsed,
            IsActive = template.IsActive,
            CreatedAt = template.CreatedAt,
            CreatedBy = template.CreatedBy,
            CreatedByName = template.CreatedByUser.Name,
            UpdatedAt = template.UpdatedAt,
            UpdatedBy = template.UpdatedBy,
            UpdatedByName = template.UpdatedByUser?.Name
        }).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CampaignTemplateResponse>> GetTemplate(Guid id)
    {
        var tenantId = User.GetTenantId();
        var template = await _context.CampaignTemplates
            .Where(ct => ct.Id == id && (ct.TenantId == tenantId || ct.IsPublic))
            .Include(ct => ct.CreatedByUser)
            .Include(ct => ct.UpdatedByUser)
            .FirstOrDefaultAsync();

        if (template == null)
        {
            return NotFound();
        }

        var response = new CampaignTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            MessageTitleTemplate = template.MessageTitleTemplate,
            MessageBodyTemplate = template.MessageBodyTemplate,
            TemplateVariables = string.IsNullOrEmpty(template.TemplateVariables)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, string>>(template.TemplateVariables),
            DefaultChannels = string.IsNullOrEmpty(template.DefaultChannels)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.DefaultChannels),
            DefaultPriority = template.DefaultPriority,
            Category = template.Category,
            Tags = string.IsNullOrEmpty(template.Tags)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.Tags),
            IsPublic = template.IsPublic,
            UsageCount = template.UsageCount,
            LastUsed = template.LastUsed,
            IsActive = template.IsActive,
            CreatedAt = template.CreatedAt,
            CreatedBy = template.CreatedBy,
            CreatedByName = template.CreatedByUser.Name,
            UpdatedAt = template.UpdatedAt,
            UpdatedBy = template.UpdatedBy,
            UpdatedByName = template.UpdatedByUser?.Name
        };

        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<CampaignTemplateResponse>> CreateTemplate(CreateCampaignTemplateRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        // Check for duplicate name within tenant
        var existingTemplate = await _context.CampaignTemplates
            .Where(ct => ct.TenantId == tenantId && ct.Name == request.Name)
            .FirstOrDefaultAsync();

        if (existingTemplate != null)
        {
            return BadRequest($"A template with name '{request.Name}' already exists");
        }

        var template = new CampaignTemplate
        {
            TenantId = tenantId,
            Name = request.Name,
            Description = request.Description,
            MessageTitleTemplate = request.MessageTitleTemplate,
            MessageBodyTemplate = request.MessageBodyTemplate,
            TemplateVariables = request.TemplateVariables != null 
                ? JsonSerializer.Serialize(request.TemplateVariables)
                : null,
            DefaultChannels = request.DefaultChannels != null 
                ? JsonSerializer.Serialize(request.DefaultChannels)
                : null,
            DefaultPriority = request.DefaultPriority,
            Category = request.Category,
            Tags = request.Tags != null 
                ? JsonSerializer.Serialize(request.Tags)
                : null,
            IsPublic = request.IsPublic,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.CampaignTemplates.Add(template);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Campaign template created: TemplateId={TemplateId}, Name={Name}, TenantId={TenantId}",
            template.Id, template.Name, template.TenantId);

        return CreatedAtAction(
            nameof(GetTemplate),
            new { id = template.Id },
            await GetTemplateResponse(template.Id));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CampaignTemplateResponse>> UpdateTemplate(
        Guid id, UpdateCampaignTemplateRequest request)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        var template = await _context.CampaignTemplates
            .Where(ct => ct.Id == id && ct.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (template == null)
        {
            return NotFound();
        }

        // Check for duplicate name if name is being changed
        if (request.Name != null && request.Name != template.Name)
        {
            var existingTemplate = await _context.CampaignTemplates
                .Where(ct => ct.TenantId == tenantId && ct.Name == request.Name && ct.Id != id)
                .FirstOrDefaultAsync();

            if (existingTemplate != null)
            {
                return BadRequest($"A template with name '{request.Name}' already exists");
            }

            template.Name = request.Name;
        }

        // Update only provided fields
        if (request.Description != null)
            template.Description = request.Description;

        if (request.MessageTitleTemplate != null)
            template.MessageTitleTemplate = request.MessageTitleTemplate;

        if (request.MessageBodyTemplate != null)
            template.MessageBodyTemplate = request.MessageBodyTemplate;

        if (request.TemplateVariables != null)
            template.TemplateVariables = JsonSerializer.Serialize(request.TemplateVariables);

        if (request.DefaultChannels != null)
            template.DefaultChannels = JsonSerializer.Serialize(request.DefaultChannels);

        if (request.DefaultPriority.HasValue)
            template.DefaultPriority = request.DefaultPriority.Value;

        if (request.Category != null)
            template.Category = request.Category;

        if (request.Tags != null)
            template.Tags = JsonSerializer.Serialize(request.Tags);

        if (request.IsPublic.HasValue)
            template.IsPublic = request.IsPublic.Value;

        if (request.IsActive.HasValue)
            template.IsActive = request.IsActive.Value;

        template.UpdatedBy = userId;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Campaign template updated: TemplateId={TemplateId}, Name={Name}",
            template.Id, template.Name);

        return Ok(await GetTemplateResponse(template.Id));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var tenantId = User.GetTenantId();
        var template = await _context.CampaignTemplates
            .Where(ct => ct.Id == id && ct.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (template == null)
        {
            return NotFound();
        }

        _context.CampaignTemplates.Remove(template);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Campaign template deleted: TemplateId={TemplateId}, Name={Name}",
            template.Id, template.Name);

        return NoContent();
    }

    [HttpPost("{id}/use")]
    public async Task<IActionResult> IncrementUsageCount(Guid id)
    {
        var tenantId = User.GetTenantId();
        var template = await _context.CampaignTemplates
            .Where(ct => ct.Id == id && (ct.TenantId == tenantId || ct.IsPublic))
            .FirstOrDefaultAsync();

        if (template == null)
        {
            return NotFound();
        }

        template.UsageCount++;
        template.LastUsed = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Campaign template usage incremented: TemplateId={TemplateId}, UsageCount={UsageCount}",
            template.Id, template.UsageCount);

        return Ok(new { usageCount = template.UsageCount, lastUsed = template.LastUsed });
    }

    [HttpGet("categories")]
    public async Task<ActionResult<List<string>>> GetCategories()
    {
        var tenantId = User.GetTenantId();
        var categories = await _context.CampaignTemplates
            .Where(ct => (ct.TenantId == tenantId || ct.IsPublic) && 
                        ct.IsActive && 
                        !string.IsNullOrEmpty(ct.Category))
            .Select(ct => ct.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("popular")]
    public async Task<ActionResult<List<CampaignTemplateResponse>>> GetPopularTemplates(
        [FromQuery] int limit = 10)
    {
        var tenantId = User.GetTenantId();
        var popularTemplates = await _context.CampaignTemplates
            .Where(ct => (ct.TenantId == tenantId || ct.IsPublic) && ct.IsActive)
            .Include(ct => ct.CreatedByUser)
            .Include(ct => ct.UpdatedByUser)
            .OrderByDescending(ct => ct.UsageCount)
            .ThenByDescending(ct => ct.LastUsed)
            .Take(limit)
            .ToListAsync();

        var response = popularTemplates.Select(template => new CampaignTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            MessageTitleTemplate = template.MessageTitleTemplate,
            MessageBodyTemplate = template.MessageBodyTemplate,
            TemplateVariables = string.IsNullOrEmpty(template.TemplateVariables)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, string>>(template.TemplateVariables),
            DefaultChannels = string.IsNullOrEmpty(template.DefaultChannels)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.DefaultChannels),
            DefaultPriority = template.DefaultPriority,
            Category = template.Category,
            Tags = string.IsNullOrEmpty(template.Tags)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.Tags),
            IsPublic = template.IsPublic,
            UsageCount = template.UsageCount,
            LastUsed = template.LastUsed,
            IsActive = template.IsActive,
            CreatedAt = template.CreatedAt,
            CreatedBy = template.CreatedBy,
            CreatedByName = template.CreatedByUser.Name,
            UpdatedAt = template.UpdatedAt,
            UpdatedBy = template.UpdatedBy,
            UpdatedByName = template.UpdatedByUser?.Name
        }).ToList();

        return Ok(response);
    }

    private async Task<CampaignTemplateResponse> GetTemplateResponse(Guid templateId)
    {
        var template = await _context.CampaignTemplates
            .Where(ct => ct.Id == templateId)
            .Include(ct => ct.CreatedByUser)
            .Include(ct => ct.UpdatedByUser)
            .FirstOrDefaultAsync();

        if (template == null)
            throw new InvalidOperationException($"Template {templateId} not found");

        return new CampaignTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            MessageTitleTemplate = template.MessageTitleTemplate,
            MessageBodyTemplate = template.MessageBodyTemplate,
            TemplateVariables = string.IsNullOrEmpty(template.TemplateVariables)
                ? null
                : JsonSerializer.Deserialize<Dictionary<string, string>>(template.TemplateVariables),
            DefaultChannels = string.IsNullOrEmpty(template.DefaultChannels)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.DefaultChannels),
            DefaultPriority = template.DefaultPriority,
            Category = template.Category,
            Tags = string.IsNullOrEmpty(template.Tags)
                ? null
                : JsonSerializer.Deserialize<string[]>(template.Tags),
            IsPublic = template.IsPublic,
            UsageCount = template.UsageCount,
            LastUsed = template.LastUsed,
            IsActive = template.IsActive,
            CreatedAt = template.CreatedAt,
            CreatedBy = template.CreatedBy,
            CreatedByName = template.CreatedByUser.Name,
            UpdatedAt = template.UpdatedAt,
            UpdatedBy = template.UpdatedBy,
            UpdatedByName = template.UpdatedByUser?.Name
        };
    }
}