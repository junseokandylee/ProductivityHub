using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("segment_usage_audit")]
public class SegmentUsageAudit
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("segment_id")]
    public Guid SegmentId { get; set; }

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("action")]
    public string Action { get; set; } = string.Empty; // "evaluate", "apply", "export", "campaign_use"

    [MaxLength(100)]
    [Column("context")]
    public string? Context { get; set; } // Additional context like campaign_id, export_id, etc.

    [Column("result_count")]
    public int? ResultCount { get; set; } // Number of contacts returned by evaluation

    [Column("execution_time_ms")]
    public int? ExecutionTimeMs { get; set; } // Query execution time

    [Column("occurred_at")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("SegmentId")]
    public virtual Segment Segment { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}