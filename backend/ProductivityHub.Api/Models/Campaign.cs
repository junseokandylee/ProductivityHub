using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProductivityHub.Api.Models;

[Table("campaigns")]
public class Campaign
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

    [MaxLength(100)]
    [Column("message_title")]
    public string? MessageTitle { get; set; }

    [Required]
    [MaxLength(2000)]
    [Column("message_body")]
    public string MessageBody { get; set; } = string.Empty;

    [Column("variables")]
    public string? Variables { get; set; } // JSON string for message variables

    [Required]
    [Column("status")]
    public CampaignStatus Status { get; set; } = CampaignStatus.Draft;

    [Column("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    [Column("started_at")]
    public DateTime? StartedAt { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("estimated_recipients")]
    public int EstimatedRecipients { get; set; } = 0;

    [Column("estimated_cost")]
    [Precision(10, 2)]
    public decimal EstimatedCost { get; set; } = 0;

    [Column("quota_used")]
    public int QuotaUsed { get; set; } = 0;

    [Column("sent_count")]
    public int SentCount { get; set; } = 0;

    [Column("success_count")]
    public int SuccessCount { get; set; } = 0;

    [Column("failed_count")]
    public int FailedCount { get; set; } = 0;

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
    
    public virtual ICollection<CampaignChannel> Channels { get; set; } = new List<CampaignChannel>();
    public virtual CampaignAudience? Audience { get; set; }
    public virtual ICollection<CampaignContact> CampaignContacts { get; set; } = new List<CampaignContact>();
    public virtual ICollection<MessageHistory> MessageHistories { get; set; } = new List<MessageHistory>();
}

public enum CampaignStatus
{
    Draft = 0,
    Queued = 1,
    Processing = 2,
    Sending = 3,
    Completed = 4,
    Failed = 5,
    Cancelled = 6,
    Paused = 7
}