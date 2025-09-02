using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("contact_history")]
public class ContactHistory
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("type")]
    public string Type { get; set; } = string.Empty; // CREATED, UPDATED, DELETED, VIEWED, EXPORTED, etc.

    [Column("payload", TypeName = "jsonb")]
    public string? Payload { get; set; } // JSON payload with event details

    [Column("occurred_at")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    [Column("user_id")]
    public Guid? UserId { get; set; } // Who performed the action

    [MaxLength(100)]
    [Column("user_name")]
    public string? UserName { get; set; }

    [MaxLength(45)]
    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    [Column("user_agent")]
    public string? UserAgent { get; set; }

    // Navigation properties
    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;

    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}