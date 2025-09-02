using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("campaign_channels")]
public class CampaignChannel
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("channel")]
    public string Channel { get; set; } = string.Empty; // SMS, Kakao

    [Required]
    [Column("order_index")]
    public int OrderIndex { get; set; } // 0, 1, 2... for priority order

    [Column("fallback_enabled")]
    public bool FallbackEnabled { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;
}

public static class ChannelTypes
{
    public const string SMS = "SMS";
    public const string Kakao = "Kakao";
    
    public static readonly string[] All = { SMS, Kakao };
    
    public static bool IsValid(string channel) => All.Contains(channel);
}