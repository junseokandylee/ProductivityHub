using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Net;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Granular campaign event tracking for analytics and reporting
/// Partitioned by occurred_at for performance with large datasets
/// </summary>
[Table("campaign_events")]
public class CampaignEvent
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
    [MaxLength(10)]
    [Column("channel")]
    public string Channel { get; set; } = string.Empty; // 'sms' | 'kakao'

    [Required]
    [Column("event_type")]
    public EventType EventType { get; set; }

    [Required]
    [Column("occurred_at")]
    public DateTimeOffset OccurredAt { get; set; }

    [MaxLength(255)]
    [Column("provider_message_id")]
    public string? ProviderMessageId { get; set; }

    [MaxLength(500)]
    [Column("failure_reason")]
    public string? FailureReason { get; set; }

    [MaxLength(50)]
    [Column("failure_code")]
    public string? FailureCode { get; set; }

    [MaxLength(10)]
    [Column("ab_group")]
    public string? AbGroup { get; set; } // 'A', 'B', 'C', etc.

    [Column("cost_amount", TypeName = "numeric(12,4)")]
    public decimal CostAmount { get; set; } = 0;

    [MaxLength(3)]
    [Column("currency")]
    public string Currency { get; set; } = "KRW";

    [Column("meta", TypeName = "jsonb")]
    public JsonDocument? Meta { get; set; }

    [Column("ip")]
    public IPAddress? Ip { get; set; }

    [MaxLength(64)]
    [Column("user_agent_hash")]
    public string? UserAgentHash { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;
}

/// <summary>
/// Event types for campaign analytics
/// </summary>
public enum EventType
{
    Sent,          // Message sent to provider
    Delivered,     // Delivered to recipient device
    Opened,        // Message opened/read
    Clicked,       // Link clicked
    Failed,        // Delivery failed
    Unsubscribed,  // Recipient unsubscribed
    Bounced,       // Hard bounce
    SpamReport     // Marked as spam
}