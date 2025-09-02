using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Detailed link click tracking for campaign analytics
/// </summary>
[Table("link_clicks")]
public class LinkClick
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    [Required]
    [Column("event_id")]
    public long EventId { get; set; } // Reference to CampaignEvent

    [Required]
    [MaxLength(2048)]
    [Column("url")]
    public string Url { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("link_label")]
    public string? LinkLabel { get; set; } // e.g., "CTA Button", "Learn More"

    [Column("ip")]
    public IPAddress? Ip { get; set; }

    [MaxLength(64)]
    [Column("user_agent_hash")]
    public string? UserAgentHash { get; set; }

    [MaxLength(255)]
    [Column("referrer")]
    public string? Referrer { get; set; }

    [Column("clicked_at")]
    public DateTimeOffset ClickedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;

    [ForeignKey("EventId")]
    public virtual CampaignEvent Event { get; set; } = null!;
}