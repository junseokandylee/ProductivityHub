using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("message_history")]
public class MessageHistory
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("channel")]
    public string Channel { get; set; } = string.Empty; // SMS, Kakao

    [Required]
    [Column("message_content")]
    public string MessageContent { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Pending"; // Pending, Sent, Delivered, Failed, Read

    [Column("sent_at")]
    public DateTime? SentAt { get; set; }

    [Column("delivered_at")]
    public DateTime? DeliveredAt { get; set; }

    [Column("read_at")]
    public DateTime? ReadAt { get; set; }

    [MaxLength(100)]
    [Column("external_message_id")]
    public string? ExternalMessageId { get; set; } // ID from SMS/Kakao provider

    [MaxLength(500)]
    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("cost")]
    public decimal? Cost { get; set; } // Cost per message

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;
}