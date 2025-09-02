using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

/// <summary>
/// A/B testing variants for campaigns
/// </summary>
[Table("campaign_variants")]
public class CampaignVariant
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [MaxLength(10)]
    [Column("label")]
    public string Label { get; set; } = string.Empty; // 'A', 'B', 'Control', etc.

    [MaxLength(200)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("allocation_percentage")]
    public decimal AllocationPercentage { get; set; } = 50.0m; // Percentage of audience

    [MaxLength(500)]
    [Column("message_content")]
    public string? MessageContent { get; set; }

    [MaxLength(200)]
    [Column("subject_line")]
    public string? SubjectLine { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    // Related events
    public virtual ICollection<CampaignEvent> Events { get; set; } = new List<CampaignEvent>();
}