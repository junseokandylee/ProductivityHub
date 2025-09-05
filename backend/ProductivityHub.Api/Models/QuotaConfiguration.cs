using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("quota_configurations")]
public class QuotaConfiguration
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

    [Column("monthly_limit")]
    public int MonthlyLimit { get; set; } = 10000;

    [Column("daily_limit")]
    public int DailyLimit { get; set; } = 1000;

    [Column("hourly_limit")]
    public int HourlyLimit { get; set; } = 100;

    [Column("enable_hard_limit")]
    public bool EnableHardLimit { get; set; } = true;

    [Column("warning_threshold_percent")]
    public int WarningThresholdPercent { get; set; } = 80;

    [Column("alert_threshold_percent")]
    public int AlertThresholdPercent { get; set; } = 90;

    [Column("auto_recharge")]
    public bool AutoRecharge { get; set; } = false;

    [Column("recharge_amount")]
    public int RechargeAmount { get; set; } = 0;

    [Column("cost_per_message")]
    public decimal CostPerMessage { get; set; } = 0.05m; // in KRW

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

[Table("quota_usage")]
public class QuotaUsage
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

    [Column("usage_date")]
    public DateOnly UsageDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    [Column("usage_hour")]
    public int UsageHour { get; set; } = DateTime.UtcNow.Hour;

    [Column("message_count")]
    public int MessageCount { get; set; } = 0;

    [Column("successful_count")]
    public int SuccessfulCount { get; set; } = 0;

    [Column("failed_count")]
    public int FailedCount { get; set; } = 0;

    [Column("total_cost")]
    public decimal TotalCost { get; set; } = 0m;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;
}