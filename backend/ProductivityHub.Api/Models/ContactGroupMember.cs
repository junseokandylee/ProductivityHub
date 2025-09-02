using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("contact_group_members")]
public class ContactGroupMember
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("group_id")]
    public Guid GroupId { get; set; }

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("GroupId")]
    public virtual ContactGroup Group { get; set; } = null!;
    
    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;
}