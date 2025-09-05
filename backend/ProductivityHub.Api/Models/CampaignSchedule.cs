using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProductivityHub.Api.Models;

[Table("campaign_schedules")]
public class CampaignSchedule
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("schedule_type")]
    public ScheduleType ScheduleType { get; set; }

    [Column("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    [MaxLength(50)]
    [Column("timezone")]
    public string Timezone { get; set; } = "UTC";

    // Recurring schedule fields
    [Column("is_recurring")]
    public bool IsRecurring { get; set; } = false;

    [Column("recurrence_pattern")]
    public RecurrencePattern? RecurrencePattern { get; set; }

    [Column("recurrence_interval")]
    public int RecurrenceInterval { get; set; } = 1; // Every X days/weeks/months

    [Column("recurrence_days_of_week")]
    public string? RecurrenceDaysOfWeek { get; set; } // JSON array: [1,2,3] for Mon,Tue,Wed

    [Column("recurrence_day_of_month")]
    public int? RecurrenceDayOfMonth { get; set; } // For monthly: day 15 of each month

    [Column("recurrence_end_date")]
    public DateTime? RecurrenceEndDate { get; set; }

    [Column("max_occurrences")]
    public int? MaxOccurrences { get; set; }

    [Column("occurrence_count")]
    public int OccurrenceCount { get; set; } = 0;

    // Automation trigger fields
    [Column("automation_trigger")]
    public AutomationTrigger? AutomationTrigger { get; set; }

    [Column("trigger_conditions")]
    public string? TriggerConditions { get; set; } // JSON for complex conditions

    [Column("trigger_delay_minutes")]
    public int TriggerDelayMinutes { get; set; } = 0; // Delay after trigger

    // Schedule status and management
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("next_execution")]
    public DateTime? NextExecution { get; set; }

    [Column("last_execution")]
    public DateTime? LastExecution { get; set; }

    [Column("execution_count")]
    public int ExecutionCount { get; set; } = 0;

    [Column("priority")]
    public int Priority { get; set; } = 5; // 1-10, higher = more priority

    [Column("notes")]
    [MaxLength(1000)]
    public string? Notes { get; set; }

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
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    public virtual User CreatedByUser { get; set; } = null!;

    [ForeignKey("UpdatedBy")]
    public virtual User? UpdatedByUser { get; set; }

    public virtual ICollection<CampaignScheduleExecution> Executions { get; set; } = new List<CampaignScheduleExecution>();
}

public enum ScheduleType
{
    Immediate = 0,
    OneTime = 1,
    Recurring = 2,
    Triggered = 3
}

public enum RecurrencePattern
{
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Yearly = 4,
    Custom = 5
}

public enum AutomationTrigger
{
    None = 0,
    ContactAdded = 1,
    ContactUpdated = 2,
    ContactTagged = 3,
    ContactBirthday = 4,
    ContactAnniversary = 5,
    CampaignCompleted = 6,
    DateBased = 7,
    CustomEvent = 8
}