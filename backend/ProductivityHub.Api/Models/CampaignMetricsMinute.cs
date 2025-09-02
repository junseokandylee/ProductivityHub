using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProductivityHub.Api.Models;

[Table("campaign_metrics_minute")]
[PrimaryKey(nameof(CampaignId), nameof(BucketMinute))]
public class CampaignMetricsMinute
{
    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("bucket_minute")]
    public DateTime BucketMinute { get; set; }

    [Column("attempted")]
    public long Attempted { get; set; } = 0;

    [Column("delivered")]
    public long Delivered { get; set; } = 0;

    [Column("failed")]
    public long Failed { get; set; } = 0;

    [Column("open")]
    public long Open { get; set; } = 0;

    [Column("click")]
    public long Click { get; set; } = 0;

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;
}