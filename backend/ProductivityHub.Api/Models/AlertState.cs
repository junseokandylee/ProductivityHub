using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("alert_state")]
public class AlertState
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Column("triggered")]
    public bool Triggered { get; set; } = false;

    [Column("last_failure_rate")]
    [Range(0.0, 1.0)]
    public decimal LastFailureRate { get; set; } = 0m;

    [Column("consecutive_breaches")]
    [Range(0, int.MaxValue)]
    public int ConsecutiveBreaches { get; set; } = 0;

    [Required]
    [Column("last_evaluated_at")]
    public DateTime LastEvaluatedAt { get; set; }

    [Column("last_triggered_at")]
    public DateTime? LastTriggeredAt { get; set; }

    [Column("last_cleared_at")]
    public DateTime? LastClearedAt { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public Campaign Campaign { get; set; } = null!;

    // Helper properties
    public bool IsActive => Triggered;
    public TimeSpan? TimeSinceLastTriggered => LastTriggeredAt.HasValue 
        ? DateTime.UtcNow - LastTriggeredAt.Value 
        : null;
    public TimeSpan? TimeSinceLastCleared => LastClearedAt.HasValue 
        ? DateTime.UtcNow - LastClearedAt.Value 
        : null;
}