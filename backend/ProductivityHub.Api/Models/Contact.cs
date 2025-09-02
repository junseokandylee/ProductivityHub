using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("contacts")]
public class Contact
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    // Encrypted PII fields
    [Column("phone_enc")]
    public byte[]? PhoneEncrypted { get; set; }

    [Column("phone_hash")]
    public byte[]? PhoneHash { get; set; }

    [Column("email_enc")]
    public byte[]? EmailEncrypted { get; set; }

    [Column("email_hash")]
    public byte[]? EmailHash { get; set; }

    [Column("kakao_enc")]
    public byte[]? KakaoIdEncrypted { get; set; }

    [Column("kakao_hash")]
    public byte[]? KakaoIdHash { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Required]
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("activity_score", TypeName = "numeric(6,2)")]
    public decimal ActivityScore { get; set; } = 0.0m;

    [Column("last_activity_at")]
    public DateTime? LastActivityAt { get; set; }

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;
    public virtual ICollection<ContactTag> ContactTags { get; set; } = new List<ContactTag>();
    public virtual ICollection<ContactHistory> ContactHistory { get; set; } = new List<ContactHistory>();
    public virtual ICollection<CampaignContact> CampaignContacts { get; set; } = new List<CampaignContact>();
    public virtual ICollection<MessageHistory> MessageHistories { get; set; } = new List<MessageHistory>();

    // Helper properties (not mapped to database)
    [NotMapped]
    public string? Phone { get; set; }

    [NotMapped]
    public string? Email { get; set; }

    [NotMapped]
    public string? KakaoId { get; set; }

    [NotMapped]
    public List<Tag> Tags => ContactTags.Select(ct => ct.Tag).Where(t => t != null).ToList()!;
}