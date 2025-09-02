using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("campaign_metrics")]
public class CampaignMetrics
{
    [Key]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("sent_total")]
    public long SentTotal { get; set; } = 0;

    [Column("delivered_total")]
    public long DeliveredTotal { get; set; } = 0;

    [Column("failed_total")]
    public long FailedTotal { get; set; } = 0;

    [Column("open_total")]
    public long OpenTotal { get; set; } = 0;

    [Column("click_total")]
    public long ClickTotal { get; set; } = 0;

    [Column("sms_sent")]
    public long SmsSent { get; set; } = 0;

    [Column("sms_delivered")]
    public long SmsDelivered { get; set; } = 0;

    [Column("sms_failed")]
    public long SmsFailed { get; set; } = 0;

    [Column("kakao_sent")]
    public long KakaoSent { get; set; } = 0;

    [Column("kakao_delivered")]
    public long KakaoDelivered { get; set; } = 0;

    [Column("kakao_failed")]
    public long KakaoFailed { get; set; } = 0;

    [Required]
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;
}