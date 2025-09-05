using ProductivityHub.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

// Email Template DTOs
public class CreateEmailTemplateRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public EmailTemplateType Type { get; set; }

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string HtmlContent { get; set; } = string.Empty;

    public string? TextContent { get; set; }

    public List<string>? TemplateVariables { get; set; }

    public string? DesignJson { get; set; } // For email builder data

    public bool IsActive { get; set; } = true;
}

public class UpdateEmailTemplateRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    public EmailTemplateType? Type { get; set; }

    [MaxLength(200)]
    public string? Subject { get; set; }

    public string? HtmlContent { get; set; }

    public string? TextContent { get; set; }

    public List<string>? TemplateVariables { get; set; }

    public string? DesignJson { get; set; }

    public bool? IsActive { get; set; }
}

public class EmailTemplateResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public EmailTemplateType Type { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public string? TextContent { get; set; }
    public List<string> TemplateVariables { get; set; } = new();
    public string? DesignJson { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string? UpdatedByName { get; set; }
}

public class EmailTemplateListResponse
{
    public List<EmailTemplateResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public class EmailTemplateSearchRequest
{
    public string? Search { get; set; }
    public EmailTemplateType? Type { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

// Template Preview DTOs
public class PreviewEmailTemplateRequest
{
    [Required]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string HtmlContent { get; set; } = string.Empty;

    public string? TextContent { get; set; }

    public Dictionary<string, string>? SampleData { get; set; }
}

public class PreviewEmailTemplateResponse
{
    public string Subject { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public string? TextContent { get; set; }
    public DateTime PreviewedAt { get; set; } = DateTime.UtcNow;
}

// Template Variable DTOs
public class TemplateVariableResponse
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public bool IsRequired { get; set; }
    public string Type { get; set; } = "string"; // string, number, date, boolean
}

public class ExtractTemplateVariablesRequest
{
    [Required]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string HtmlContent { get; set; } = string.Empty;

    public string? TextContent { get; set; }
}

public class ExtractTemplateVariablesResponse
{
    public List<TemplateVariableResponse> Variables { get; set; } = new();
    public DateTime ExtractedAt { get; set; } = DateTime.UtcNow;
}

// Template Clone DTOs
public class CloneEmailTemplateRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }
}

public class CloneEmailTemplateResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime ClonedAt { get; set; } = DateTime.UtcNow;
}