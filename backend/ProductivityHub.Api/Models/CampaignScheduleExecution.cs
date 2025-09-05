using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("campaign_schedule_executions")]
public class CampaignScheduleExecution
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("schedule_id")]
    public Guid ScheduleId { get; set; }

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("planned_execution")]
    public DateTime PlannedExecution { get; set; }

    [Column("actual_execution")]
    public DateTime? ActualExecution { get; set; }

    [Column("execution_status")]
    public ExecutionStatus ExecutionStatus { get; set; } = ExecutionStatus.Scheduled;

    [Column("error_message")]
    [MaxLength(2000)]
    public string? ErrorMessage { get; set; }

    [Column("execution_duration_ms")]
    public int? ExecutionDurationMs { get; set; }

    [Column("recipients_processed")]
    public int RecipientsProcessed { get; set; } = 0;

    [Column("messages_sent")]
    public int MessagesSent { get; set; } = 0;

    [Column("messages_failed")]
    public int MessagesFailed { get; set; } = 0;

    [Column("retry_count")]
    public int RetryCount { get; set; } = 0;

    [Column("max_retries")]
    public int MaxRetries { get; set; } = 3;

    [Column("next_retry")]
    public DateTime? NextRetry { get; set; }

    [Column("execution_notes")]
    [MaxLength(1000)]
    public string? ExecutionNotes { get; set; }

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("ScheduleId")]
    public virtual CampaignSchedule Schedule { get; set; } = null!;

    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;
}

public enum ExecutionStatus
{
    Scheduled = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4,
    Skipped = 5,
    Retrying = 6
}