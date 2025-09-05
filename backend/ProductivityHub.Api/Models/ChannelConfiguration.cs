using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

public enum ChannelType
{
    SMS = 1,
    Kakao = 2,
    Email = 3
}

public enum ChannelStatus
{
    Inactive = 0,
    Active = 1,
    Testing = 2,
    Failed = 3
}

[Table("channel_configurations")]
public class ChannelConfiguration
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("channel_type")]
    public ChannelType ChannelType { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("provider_name")]
    public string ProviderName { get; set; } = string.Empty; // "KakaoWork", "Aligo", "AWS SES", etc.

    [Required]
    [Column("configuration")]
    public string Configuration { get; set; } = "{}"; // JSON configuration

    [Column("status")]
    public ChannelStatus Status { get; set; } = ChannelStatus.Inactive;

    [Column("is_default")]
    public bool IsDefault { get; set; } = false;

    [Column("priority_order")]
    public int PriorityOrder { get; set; } = 1;

    [Column("rate_limit_per_minute")]
    public int RateLimitPerMinute { get; set; } = 60;

    [Column("rate_limit_per_hour")]
    public int RateLimitPerHour { get; set; } = 1000;

    [Column("rate_limit_per_day")]
    public int RateLimitPerDay { get; set; } = 10000;

    [Column("enable_fallback")]
    public bool EnableFallback { get; set; } = true;

    [Column("last_test_at")]
    public DateTime? LastTestAt { get; set; }

    [Column("last_test_result")]
    public string? LastTestResult { get; set; } // JSON result

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