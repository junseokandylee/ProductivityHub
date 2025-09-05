using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("organization_settings")]
public class OrganizationSettings
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [MaxLength(200)]
    [Column("display_name")]
    public string? DisplayName { get; set; }

    [MaxLength(1000)]
    [Column("description")]
    public string? Description { get; set; }

    [MaxLength(100)]
    [Column("contact_email")]
    public string? ContactEmail { get; set; }

    [MaxLength(20)]
    [Column("contact_phone")]
    public string? ContactPhone { get; set; }

    [MaxLength(500)]
    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(200)]
    [Column("website_url")]
    public string? WebsiteUrl { get; set; }

    [MaxLength(500)]
    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [MaxLength(7)]
    [Column("brand_color")]
    public string? BrandColor { get; set; } = "#3B82F6"; // Default blue

    [MaxLength(50)]
    [Column("timezone")]
    public string Timezone { get; set; } = "Asia/Seoul";

    [MaxLength(10)]
    [Column("language")]
    public string Language { get; set; } = "ko";

    [MaxLength(10)]
    [Column("date_format")]
    public string DateFormat { get; set; } = "yyyy-MM-dd";

    [MaxLength(10)]
    [Column("time_format")]
    public string TimeFormat { get; set; } = "HH:mm";

    [Column("enable_notifications")]
    public bool EnableNotifications { get; set; } = true;

    [Column("enable_email_notifications")]
    public bool EnableEmailNotifications { get; set; } = true;

    [Column("enable_sms_notifications")]
    public bool EnableSmsNotifications { get; set; } = false;

    [Column("auto_archive_days")]
    public int AutoArchiveDays { get; set; } = 90;

    [Column("max_campaign_recipients")]
    public int MaxCampaignRecipients { get; set; } = 100000;

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