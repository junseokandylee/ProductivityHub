using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

public enum EmailTemplateType
{
    Newsletter = 1,
    Campaign = 2,
    Welcome = 3,
    Notification = 4,
    Promotional = 5,
    Transactional = 6
}

public enum EmailTemplateStatus
{
    Draft = 0,
    Active = 1,
    Archived = 2
}

[Table("email_templates")]
public class EmailTemplate
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("description")]
    public string? Description { get; set; }

    [Required]
    [Column("template_type")]
    public EmailTemplateType TemplateType { get; set; }

    [Column("status")]
    public EmailTemplateStatus Status { get; set; } = EmailTemplateStatus.Draft;

    [Required]
    [MaxLength(300)]
    [Column("subject_template")]
    public string SubjectTemplate { get; set; } = string.Empty;

    [Required]
    [Column("html_content")]
    public string HtmlContent { get; set; } = string.Empty;

    [Column("text_content")]
    public string? TextContent { get; set; }

    [Column("preview_text")]
    [MaxLength(150)]
    public string? PreviewText { get; set; }

    [Column("template_variables")]
    public string TemplateVariables { get; set; } = "[]"; // JSON array of variable names

    [Column("design_json")]
    public string? DesignJson { get; set; } // JSON for email builder

    [Column("thumbnail_url")]
    [MaxLength(500)]
    public string? ThumbnailUrl { get; set; }

    [Column("is_system_template")]
    public bool IsSystemTemplate { get; set; } = false;

    [Column("usage_count")]
    public int UsageCount { get; set; } = 0;

    [Column("last_used_at")]
    public DateTime? LastUsedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public Guid CreatedBy { get; set; }

    [Column("updated_by")]
    public Guid? UpdatedBy { get; set; }

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    public virtual User CreatedByUser { get; set; } = null!;

    [ForeignKey("UpdatedBy")]
    public virtual User? UpdatedByUser { get; set; }
}

public enum SubscriptionStatus
{
    Subscribed = 1,
    Unsubscribed = 2,
    Bounced = 3,
    Complained = 4,
    Pending = 5
}

public enum SubscriptionSource
{
    Manual = 1,
    Import = 2,
    WebForm = 3,
    API = 4,
    Campaign = 5
}

[Table("email_subscriptions")]
public class EmailSubscription
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("name")]
    public string? Name { get; set; }

    [Column("contact_id")]
    public Guid? ContactId { get; set; } // Link to existing contact if available

    [Column("status")]
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Subscribed;

    [Column("source")]
    public SubscriptionSource Source { get; set; } = SubscriptionSource.Manual;

    [Column("subscription_date")]
    public DateTime SubscriptionDate { get; set; } = DateTime.UtcNow;

    [Column("unsubscription_date")]
    public DateTime? UnsubscriptionDate { get; set; }

    [Column("unsubscribe_token")]
    public string? UnsubscribeToken { get; set; }

    [Column("preferences")]
    public string Preferences { get; set; } = "{}"; // JSON for subscription preferences

    [Column("double_opt_in")]
    public bool DoubleOptIn { get; set; } = false;

    [Column("confirmed_at")]
    public DateTime? ConfirmedAt { get; set; }

    [Column("bounce_count")]
    public int BounceCount { get; set; } = 0;

    [Column("last_bounce_at")]
    public DateTime? LastBounceAt { get; set; }

    [Column("complaint_count")]
    public int ComplaintCount { get; set; } = 0;

    [Column("last_complaint_at")]
    public DateTime? LastComplaintAt { get; set; }

    [Column("last_email_sent_at")]
    public DateTime? LastEmailSentAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public Guid? CreatedBy { get; set; }

    [Column("updated_by")]
    public Guid? UpdatedBy { get; set; }

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact? Contact { get; set; }

    [ForeignKey("CreatedBy")]
    public virtual User? CreatedByUser { get; set; }

    [ForeignKey("UpdatedBy")]
    public virtual User? UpdatedByUser { get; set; }
}

[Table("email_subscription_lists")]
public class EmailSubscriptionList
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("description")]
    public string? Description { get; set; }

    [Column("is_default")]
    public bool IsDefault { get; set; } = false;

    [Column("subscriber_count")]
    public int SubscriberCount { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public Guid CreatedBy { get; set; }

    [Column("updated_by")]
    public Guid? UpdatedBy { get; set; }

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    public virtual User CreatedByUser { get; set; } = null!;

    [ForeignKey("UpdatedBy")]
    public virtual User? UpdatedByUser { get; set; }

    public virtual ICollection<EmailSubscriptionListMember> Members { get; set; } = new List<EmailSubscriptionListMember>();
}

[Table("email_subscription_list_members")]
public class EmailSubscriptionListMember
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("list_id")]
    public Guid ListId { get; set; }

    [Required]
    [Column("subscription_id")]
    public Guid SubscriptionId { get; set; }

    [Column("added_at")]
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    [Column("added_by")]
    public Guid? AddedBy { get; set; }

    // Navigation properties
    [ForeignKey("ListId")]
    public virtual EmailSubscriptionList List { get; set; } = null!;

    [ForeignKey("SubscriptionId")]
    public virtual EmailSubscription Subscription { get; set; } = null!;

    [ForeignKey("AddedBy")]
    public virtual User? AddedByUser { get; set; }
}

[Table("email_events")]
public class EmailEvent
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("campaign_id")]
    public Guid? CampaignId { get; set; }

    [Column("subscription_id")]
    public Guid? SubscriptionId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("recipient_email")]
    public string RecipientEmail { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    [Column("event_type")]
    public string EventType { get; set; } = string.Empty; // SENT, DELIVERED, OPENED, CLICKED, BOUNCED, COMPLAINED, UNSUBSCRIBED

    [Column("occurred_at")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    [Column("ses_message_id")]
    public string? SesMessageId { get; set; }

    [Column("event_data")]
    public string? EventData { get; set; } // JSON with additional event-specific data

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("click_url")]
    public string? ClickUrl { get; set; }

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CampaignId")]
    public virtual Campaign? Campaign { get; set; }

    [ForeignKey("SubscriptionId")]
    public virtual EmailSubscription? Subscription { get; set; }
}