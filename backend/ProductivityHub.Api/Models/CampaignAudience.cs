using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("campaign_audience")]
public class CampaignAudience
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Column("group_ids", TypeName = "jsonb")]
    public string? GroupIds { get; set; } // JSON array of group IDs

    [Column("segment_ids", TypeName = "jsonb")]
    public string? SegmentIds { get; set; } // JSON array of segment IDs

    [Column("filter_json", TypeName = "jsonb")]
    public string? FilterJson { get; set; } // Complex filtering criteria

    [Column("include_all")]
    public bool IncludeAll { get; set; } = false; // Include all contacts for tenant

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;
}