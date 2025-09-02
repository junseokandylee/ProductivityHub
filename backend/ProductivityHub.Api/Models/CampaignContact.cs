using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("campaign_contacts")]
public class CampaignContact
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

    [MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "Pending"; // Pending, Sent, Delivered, Failed

    [Column("sent_at")]
    public DateTime? SentAt { get; set; }

    [Column("delivered_at")]
    public DateTime? DeliveredAt { get; set; }

    [MaxLength(500)]
    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;
}