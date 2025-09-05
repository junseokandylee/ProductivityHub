using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/email-templates")]
[Authorize]
public class EmailTemplateController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<EmailTemplateController> _logger;

    public EmailTemplateController(ApplicationDbContext context, ILogger<EmailTemplateController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<EmailTemplateListResponse>> GetTemplates([FromQuery] EmailTemplateSearchRequest request)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var query = _context.EmailTemplates
                .Include(t => t.CreatedByUser)
                .Include(t => t.UpdatedByUser)
                .Where(t => t.TenantId == tenantId);

            // Apply search filter
            if (!string.IsNullOrEmpty(request.Search))
            {
                query = query.Where(t => 
                    EF.Functions.ILike(t.Name, $"%{request.Search}%") ||
                    EF.Functions.ILike(t.Description, $"%{request.Search}%") ||
                    EF.Functions.ILike(t.SubjectTemplate, $"%{request.Search}%"));
            }

            // Apply type filter
            if (request.Type.HasValue)
            {
                query = query.Where(t => t.TemplateType == request.Type.Value);
            }

            // Apply active status filter
            if (request.IsActive.HasValue)
            {
                var targetStatus = request.IsActive.Value ? EmailTemplateStatus.Active : EmailTemplateStatus.Draft;
                query = query.Where(t => t.Status == targetStatus);
            }

            var totalCount = await query.CountAsync();

            var templates = await query
                .OrderByDescending(t => t.UpdatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(t => new EmailTemplateResponse
                {
                    Id = t.Id,
                    Name = t.Name,
                    Description = t.Description,
                    Type = t.TemplateType,
                    Subject = t.SubjectTemplate,
                    HtmlContent = t.HtmlContent,
                    TextContent = t.TextContent,
                    TemplateVariables = string.IsNullOrEmpty(t.TemplateVariables) 
                        ? new List<string>() 
                        : JsonSerializer.Deserialize<List<string>>(t.TemplateVariables, (JsonSerializerOptions)null!) ?? new List<string>(),
                    DesignJson = t.DesignJson,
                    IsActive = t.Status == EmailTemplateStatus.Active,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    CreatedByName = t.CreatedByUser.Name,
                    UpdatedByName = t.UpdatedByUser != null ? t.UpdatedByUser.Name : null
                })
                .ToListAsync();

            var response = new EmailTemplateListResponse
            {
                Items = templates,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving email templates for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving email templates" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EmailTemplateResponse>> GetTemplate(Guid id)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var template = await _context.EmailTemplates
                .Include(t => t.CreatedByUser)
                .Include(t => t.UpdatedByUser)
                .Where(t => t.TenantId == tenantId && t.Id == id)
                .Select(t => new EmailTemplateResponse
                {
                    Id = t.Id,
                    Name = t.Name,
                    Description = t.Description,
                    Type = t.TemplateType,
                    Subject = t.SubjectTemplate,
                    HtmlContent = t.HtmlContent,
                    TextContent = t.TextContent,
                    TemplateVariables = string.IsNullOrEmpty(t.TemplateVariables) 
                        ? new List<string>() 
                        : JsonSerializer.Deserialize<List<string>>(t.TemplateVariables, (JsonSerializerOptions)null!) ?? new List<string>(),
                    DesignJson = t.DesignJson,
                    IsActive = t.Status == EmailTemplateStatus.Active,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    CreatedByName = t.CreatedByUser.Name,
                    UpdatedByName = t.UpdatedByUser != null ? t.UpdatedByUser.Name : null
                })
                .FirstOrDefaultAsync();

            if (template == null)
            {
                return NotFound(new { message = "Email template not found" });
            }

            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving email template {TemplateId} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving the email template" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<EmailTemplateResponse>> CreateTemplate([FromBody] CreateEmailTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            // Check if template name already exists for this tenant
            var existingTemplate = await _context.EmailTemplates
                .Where(t => t.TenantId == tenantId && t.Name == request.Name.Trim())
                .FirstOrDefaultAsync();

            if (existingTemplate != null)
            {
                return Conflict(new { message = $"An email template with name '{request.Name}' already exists." });
            }

            var template = new EmailTemplate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                TemplateType = request.Type,
                SubjectTemplate = request.Subject.Trim(),
                HtmlContent = request.HtmlContent,
                TextContent = request.TextContent,
                TemplateVariables = request.TemplateVariables != null 
                    ? JsonSerializer.Serialize(request.TemplateVariables) 
                    : "[]",
                DesignJson = request.DesignJson,
                Status = request.IsActive ? EmailTemplateStatus.Active : EmailTemplateStatus.Draft,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.EmailTemplates.Add(template);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            template = await _context.EmailTemplates
                .Include(t => t.CreatedByUser)
                .Include(t => t.UpdatedByUser)
                .FirstAsync(t => t.Id == template.Id);

            var response = new EmailTemplateResponse
            {
                Id = template.Id,
                Name = template.Name,
                Description = template.Description,
                Type = template.TemplateType,
                Subject = template.SubjectTemplate,
                HtmlContent = template.HtmlContent,
                TextContent = template.TextContent,
                TemplateVariables = string.IsNullOrEmpty(template.TemplateVariables) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(template.TemplateVariables, (JsonSerializerOptions)null!) ?? new List<string>(),
                DesignJson = template.DesignJson,
                IsActive = template.Status == EmailTemplateStatus.Active,
                CreatedAt = template.CreatedAt,
                UpdatedAt = template.UpdatedAt,
                CreatedByName = template.CreatedByUser.Name,
                UpdatedByName = template.UpdatedByUser?.Name
            };

            _logger.LogInformation("Created email template {TemplateId} for tenant {TenantId}", template.Id, tenantId);
            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating email template for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while creating the email template" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<EmailTemplateResponse>> UpdateTemplate(Guid id, [FromBody] UpdateEmailTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var template = await _context.EmailTemplates
                .Where(t => t.TenantId == tenantId && t.Id == id)
                .FirstOrDefaultAsync();

            if (template == null)
            {
                return NotFound(new { message = "Email template not found" });
            }

            // Check if new name already exists for another template
            if (!string.IsNullOrEmpty(request.Name))
            {
                var existingTemplate = await _context.EmailTemplates
                    .Where(t => t.TenantId == tenantId && t.Name == request.Name.Trim() && t.Id != id)
                    .FirstOrDefaultAsync();

                if (existingTemplate != null)
                {
                    return Conflict(new { message = $"An email template with name '{request.Name}' already exists." });
                }

                template.Name = request.Name.Trim();
            }

            // Update only provided fields
            if (!string.IsNullOrEmpty(request.Description))
                template.Description = request.Description.Trim();
            
            if (request.Type.HasValue)
                template.TemplateType = request.Type.Value;
            
            if (!string.IsNullOrEmpty(request.Subject))
                template.SubjectTemplate = request.Subject.Trim();
            
            if (!string.IsNullOrEmpty(request.HtmlContent))
                template.HtmlContent = request.HtmlContent;
            
            if (request.TextContent != null)
                template.TextContent = request.TextContent;
            
            if (request.TemplateVariables != null)
                template.TemplateVariables = JsonSerializer.Serialize(request.TemplateVariables);
            
            if (request.DesignJson != null)
                template.DesignJson = request.DesignJson;
            
            if (request.IsActive.HasValue)
                template.Status = request.IsActive.Value ? EmailTemplateStatus.Active : EmailTemplateStatus.Draft;

            template.UpdatedBy = userId;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            template = await _context.EmailTemplates
                .Include(t => t.CreatedByUser)
                .Include(t => t.UpdatedByUser)
                .FirstAsync(t => t.Id == template.Id);

            var response = new EmailTemplateResponse
            {
                Id = template.Id,
                Name = template.Name,
                Description = template.Description,
                Type = template.TemplateType,
                Subject = template.SubjectTemplate,
                HtmlContent = template.HtmlContent,
                TextContent = template.TextContent,
                TemplateVariables = string.IsNullOrEmpty(template.TemplateVariables) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(template.TemplateVariables, (JsonSerializerOptions)null!) ?? new List<string>(),
                DesignJson = template.DesignJson,
                IsActive = template.Status == EmailTemplateStatus.Active,
                CreatedAt = template.CreatedAt,
                UpdatedAt = template.UpdatedAt,
                CreatedByName = template.CreatedByUser.Name,
                UpdatedByName = template.UpdatedByUser?.Name
            };

            _logger.LogInformation("Updated email template {TemplateId} for tenant {TenantId}", id, tenantId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating email template {TemplateId} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while updating the email template" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTemplate(Guid id)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var template = await _context.EmailTemplates
                .Where(t => t.TenantId == tenantId && t.Id == id)
                .FirstOrDefaultAsync();

            if (template == null)
            {
                return NotFound(new { message = "Email template not found" });
            }

            // Check if template is in use by any campaigns
            var isInUse = await _context.Campaigns
                .Where(c => c.TenantId == tenantId && c.Variables != null && c.Variables.Contains(template.Id.ToString()))
                .AnyAsync();

            if (isInUse)
            {
                return BadRequest(new { message = "Cannot delete template because it is in use by one or more campaigns." });
            }

            _context.EmailTemplates.Remove(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted email template {TemplateId} for tenant {TenantId}", id, tenantId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting email template {TemplateId} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while deleting the email template" });
        }
    }

    [HttpPost("{id}/clone")]
    public async Task<ActionResult<CloneEmailTemplateResponse>> CloneTemplate(Guid id, [FromBody] CloneEmailTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var sourceTemplate = await _context.EmailTemplates
                .Where(t => t.TenantId == tenantId && t.Id == id)
                .FirstOrDefaultAsync();

            if (sourceTemplate == null)
            {
                return NotFound(new { message = "Source email template not found" });
            }

            // Check if new name already exists
            var existingTemplate = await _context.EmailTemplates
                .Where(t => t.TenantId == tenantId && t.Name == request.Name.Trim())
                .FirstOrDefaultAsync();

            if (existingTemplate != null)
            {
                return Conflict(new { message = $"An email template with name '{request.Name}' already exists." });
            }

            var clonedTemplate = new EmailTemplate
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                TemplateType = sourceTemplate.TemplateType,
                SubjectTemplate = sourceTemplate.SubjectTemplate,
                HtmlContent = sourceTemplate.HtmlContent,
                TextContent = sourceTemplate.TextContent,
                TemplateVariables = sourceTemplate.TemplateVariables,
                DesignJson = sourceTemplate.DesignJson,
                Status = EmailTemplateStatus.Active, // New clones are active by default
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.EmailTemplates.Add(clonedTemplate);
            await _context.SaveChangesAsync();

            var response = new CloneEmailTemplateResponse
            {
                Id = clonedTemplate.Id,
                Name = clonedTemplate.Name,
                Description = clonedTemplate.Description,
                ClonedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Cloned email template {SourceId} to {ClonedId} for tenant {TenantId}", id, clonedTemplate.Id, tenantId);
            return CreatedAtAction(nameof(GetTemplate), new { id = clonedTemplate.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cloning email template {TemplateId} for tenant {TenantId}", id, tenantId);
            return StatusCode(500, new { message = "An error occurred while cloning the email template" });
        }
    }

    [HttpPost("preview")]
    public async Task<ActionResult<PreviewEmailTemplateResponse>> PreviewTemplate([FromBody] PreviewEmailTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var processedSubject = ProcessTemplate(request.Subject, request.SampleData);
            var processedHtmlContent = ProcessTemplate(request.HtmlContent, request.SampleData);
            var processedTextContent = !string.IsNullOrEmpty(request.TextContent) 
                ? ProcessTemplate(request.TextContent, request.SampleData) 
                : null;

            var response = new PreviewEmailTemplateResponse
            {
                Subject = processedSubject,
                HtmlContent = processedHtmlContent,
                TextContent = processedTextContent,
                PreviewedAt = DateTime.UtcNow
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error previewing email template");
            return StatusCode(500, new { message = "An error occurred while previewing the template" });
        }
    }

    [HttpPost("extract-variables")]
    public async Task<ActionResult<ExtractTemplateVariablesResponse>> ExtractVariables([FromBody] ExtractTemplateVariablesRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var variables = new HashSet<string>();
            var variablePattern = @"\{\{(\w+)\}\}";

            // Extract from subject
            var subjectMatches = Regex.Matches(request.Subject, variablePattern);
            foreach (Match match in subjectMatches)
            {
                variables.Add(match.Groups[1].Value);
            }

            // Extract from HTML content
            var htmlMatches = Regex.Matches(request.HtmlContent, variablePattern);
            foreach (Match match in htmlMatches)
            {
                variables.Add(match.Groups[1].Value);
            }

            // Extract from text content
            if (!string.IsNullOrEmpty(request.TextContent))
            {
                var textMatches = Regex.Matches(request.TextContent, variablePattern);
                foreach (Match match in textMatches)
                {
                    variables.Add(match.Groups[1].Value);
                }
            }

            var response = new ExtractTemplateVariablesResponse
            {
                Variables = variables.Select(v => new TemplateVariableResponse
                {
                    Name = v,
                    Description = GetVariableDescription(v),
                    Type = "string",
                    IsRequired = true
                }).ToList(),
                ExtractedAt = DateTime.UtcNow
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting template variables");
            return StatusCode(500, new { message = "An error occurred while extracting variables" });
        }
    }

    private string ProcessTemplate(string template, Dictionary<string, string>? data)
    {
        if (data == null || !data.Any())
            return template;

        var result = template;
        foreach (var kvp in data)
        {
            var placeholder = $"{{{{{kvp.Key}}}}}";
            result = result.Replace(placeholder, kvp.Value);
        }
        return result;
    }

    private string GetVariableDescription(string variableName)
    {
        return variableName.ToLower() switch
        {
            "name" => "Contact name",
            "email" => "Contact email address",
            "phone" => "Contact phone number",
            "company" => "Company name",
            "position" => "Job position",
            "district" => "Electoral district",
            "candidate" => "Candidate name",
            "date" => "Current date",
            "time" => "Current time",
            _ => $"Variable: {variableName}"
        };
    }
}