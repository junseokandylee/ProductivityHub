using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("alert_policy")]
public class AlertPolicy
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("campaign_id")]
    public Guid? CampaignId { get; set; }

    [Required]
    [Column("failure_rate_threshold")]
    [Range(0.0001, 1.0)]
    public decimal FailureRateThreshold { get; set; } = 0.05m;

    [Required]
    [Column("min_consecutive_buckets")]
    [Range(1, 60)]
    public int MinConsecutiveBuckets { get; set; } = 2;

    [Required]
    [Column("evaluation_window_seconds")]
    [Range(60, 3600)]
    public int EvaluationWindowSeconds { get; set; } = 60;

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [Required]
    [Column("created_by")]
    [MaxLength(255)]
    public string CreatedBy { get; set; } = string.Empty;

    [Required]
    [Column("updated_by")]
    [MaxLength(255)]
    public string UpdatedBy { get; set; } = string.Empty;

    // Navigation properties
    public Campaign? Campaign { get; set; }

    public bool IsDefault => CampaignId == null;
    public bool IsCampaignSpecific => CampaignId.HasValue;
}