using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductivityHub.Api.Models;

[Table("security_settings")]
public class SecuritySettings
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    // Password Policy
    [Column("min_password_length")]
    public int MinPasswordLength { get; set; } = 8;

    [Column("require_uppercase")]
    public bool RequireUppercase { get; set; } = true;

    [Column("require_lowercase")]
    public bool RequireLowercase { get; set; } = true;

    [Column("require_numbers")]
    public bool RequireNumbers { get; set; } = true;

    [Column("require_special_chars")]
    public bool RequireSpecialChars { get; set; } = true;

    [Column("password_expiry_days")]
    public int PasswordExpiryDays { get; set; } = 90;

    [Column("prevent_password_reuse")]
    public int PreventPasswordReuse { get; set; } = 5; // Last N passwords

    // Session Management
    [Column("session_timeout_minutes")]
    public int SessionTimeoutMinutes { get; set; } = 480; // 8 hours

    [Column("max_concurrent_sessions")]
    public int MaxConcurrentSessions { get; set; } = 3;

    [Column("force_logout_on_password_change")]
    public bool ForceLogoutOnPasswordChange { get; set; } = true;

    // Two-Factor Authentication
    [Column("enforce_2fa")]
    public bool Enforce2FA { get; set; } = false;

    [Column("allow_2fa_email")]
    public bool Allow2FAEmail { get; set; } = true;

    [Column("allow_2fa_sms")]
    public bool Allow2FASMS { get; set; } = true;

    [Column("allow_2fa_authenticator")]
    public bool Allow2FAAuthenticator { get; set; } = true;

    // Access Control
    [Column("enable_ip_whitelist")]
    public bool EnableIPWhitelist { get; set; } = false;

    [Column("allowed_ip_ranges")]
    public string? AllowedIPRanges { get; set; } // JSON array of IP ranges

    [Column("max_failed_login_attempts")]
    public int MaxFailedLoginAttempts { get; set; } = 5;

    [Column("account_lockout_minutes")]
    public int AccountLockoutMinutes { get; set; } = 30;

    // Audit Settings
    [Column("enable_audit_logging")]
    public bool EnableAuditLogging { get; set; } = true;

    [Column("audit_retention_days")]
    public int AuditRetentionDays { get; set; } = 90;

    [Column("log_successful_logins")]
    public bool LogSuccessfulLogins { get; set; } = true;

    [Column("log_failed_logins")]
    public bool LogFailedLogins { get; set; } = true;

    [Column("log_data_changes")]
    public bool LogDataChanges { get; set; } = true;

    [Column("log_admin_actions")]
    public bool LogAdminActions { get; set; } = true;

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

[Table("api_tokens")]
public class ApiToken
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("token_hash")]
    public string TokenHash { get; set; } = string.Empty;

    [MaxLength(8)]
    [Column("token_prefix")]
    public string TokenPrefix { get; set; } = string.Empty; // First 8 chars for display

    [Column("permissions")]
    public string Permissions { get; set; } = "[]"; // JSON array of permissions

    [Column("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    [Column("last_used_at")]
    public DateTime? LastUsedAt { get; set; }

    [Column("last_used_ip")]
    public string? LastUsedIP { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("action")]
    public string Action { get; set; } = string.Empty; // LOGIN, LOGOUT, CREATE, UPDATE, DELETE

    [Required]
    [MaxLength(100)]
    [Column("resource_type")]
    public string ResourceType { get; set; } = string.Empty; // USER, CAMPAIGN, CONTACT, etc.

    [Column("resource_id")]
    public string? ResourceId { get; set; }

    [Column("old_values")]
    public string? OldValues { get; set; } // JSON

    [Column("new_values")]
    public string? NewValues { get; set; } // JSON

    [Column("ip_address")]
    public string? IPAddress { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("success")]
    public bool Success { get; set; } = true;

    [Column("error_message")]
    public string? ErrorMessage { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}