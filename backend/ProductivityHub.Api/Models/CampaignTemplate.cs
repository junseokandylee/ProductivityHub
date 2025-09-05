using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("campaign_templates")]
public class CampaignTemplate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Column("description")]
    public string? Description { get; set; }

    [MaxLength(100)]
    [Column("message_title_template")]
    public string? MessageTitleTemplate { get; set; }

    [Required]
    [MaxLength(2000)]
    [Column("message_body_template")]
    public string MessageBodyTemplate { get; set; } = string.Empty;

    [Column("template_variables")]
    public string? TemplateVariables { get; set; } // JSON string for available variables

    [Column("default_channels")]
    public string? DefaultChannels { get; set; } // JSON array of channel preferences

    [Column("default_priority")]
    public int DefaultPriority { get; set; } = 5;

    [Column("category")]
    [MaxLength(50)]
    public string? Category { get; set; } // e.g., "Welcome", "Reminder", "Event", "Holiday"

    [Column("tags")]
    public string? Tags { get; set; } // JSON array for template categorization

    [Column("is_public")]
    public bool IsPublic { get; set; } = false; // Can be shared across tenants

    [Column("usage_count")]
    public int UsageCount { get; set; } = 0;

    [Column("last_used")]
    public DateTime? LastUsed { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Audit fields
    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("created_by")]
    public Guid CreatedBy { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_by")]
    public Guid? UpdatedBy { get; set; }

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    public virtual User CreatedByUser { get; set; } = null!;

    [ForeignKey("UpdatedBy")]
    public virtual User? UpdatedByUser { get; set; }
}