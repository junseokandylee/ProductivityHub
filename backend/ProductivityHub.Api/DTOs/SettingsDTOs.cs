using ProductivityHub.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

// Organization Settings DTOs
public class OrganizationSettingsRequest
{
    [MaxLength(200)]
    public string? DisplayName { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(100)]
    [EmailAddress]
    public string? ContactEmail { get; set; }

    [MaxLength(20)]
    public string? ContactPhone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(200)]
    [Url]
    public string? WebsiteUrl { get; set; }

    [MaxLength(500)]
    [Url]
    public string? LogoUrl { get; set; }

    [MaxLength(7)]
    [RegularExpression(@"^#[0-9A-Fa-f]{6}$", ErrorMessage = "Brand color must be a valid hex color")]
    public string? BrandColor { get; set; }

    [MaxLength(50)]
    public string Timezone { get; set; } = "Asia/Seoul";

    [MaxLength(10)]
    public string Language { get; set; } = "ko";

    [MaxLength(10)]
    public string DateFormat { get; set; } = "yyyy-MM-dd";

    [MaxLength(10)]
    public string TimeFormat { get; set; } = "HH:mm";

    public bool EnableNotifications { get; set; } = true;
    public bool EnableEmailNotifications { get; set; } = true;
    public bool EnableSmsNotifications { get; set; } = false;

    [Range(1, 365)]
    public int AutoArchiveDays { get; set; } = 90;

    [Range(1000, 1000000)]
    public int MaxCampaignRecipients { get; set; } = 100000;
}

public class OrganizationSettingsResponse
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? LogoUrl { get; set; }
    public string? BrandColor { get; set; }
    public string Timezone { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string DateFormat { get; set; } = string.Empty;
    public string TimeFormat { get; set; } = string.Empty;
    public bool EnableNotifications { get; set; }
    public bool EnableEmailNotifications { get; set; }
    public bool EnableSmsNotifications { get; set; }
    public int AutoArchiveDays { get; set; }
    public int MaxCampaignRecipients { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string? UpdatedByName { get; set; }
}

// Channel Configuration DTOs
public class ChannelConfigurationRequest
{
    [Required]
    public ChannelType ChannelType { get; set; }

    [Required]
    [MaxLength(100)]
    public string ProviderName { get; set; } = string.Empty;

    [Required]
    public Dictionary<string, object> Configuration { get; set; } = new();

    public bool IsDefault { get; set; } = false;

    [Range(1, 100)]
    public int PriorityOrder { get; set; } = 1;

    [Range(1, 10000)]
    public int RateLimitPerMinute { get; set; } = 60;

    [Range(100, 100000)]
    public int RateLimitPerHour { get; set; } = 1000;

    [Range(1000, 1000000)]
    public int RateLimitPerDay { get; set; } = 10000;

    public bool EnableFallback { get; set; } = true;
}

public class ChannelConfigurationResponse
{
    public Guid Id { get; set; }
    public ChannelType ChannelType { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    public Dictionary<string, object> Configuration { get; set; } = new();
    public ChannelStatus Status { get; set; }
    public bool IsDefault { get; set; }
    public int PriorityOrder { get; set; }
    public int RateLimitPerMinute { get; set; }
    public int RateLimitPerHour { get; set; }
    public int RateLimitPerDay { get; set; }
    public bool EnableFallback { get; set; }
    public DateTime? LastTestAt { get; set; }
    public string? LastTestResult { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string? UpdatedByName { get; set; }
}

public class ChannelTestRequest
{
    [Required]
    public string TestMessage { get; set; } = string.Empty;

    [Required]
    public string TestRecipient { get; set; } = string.Empty; // phone number or email
}

public class ChannelTestResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Dictionary<string, object>? Details { get; set; }
    public DateTime TestedAt { get; set; } = DateTime.UtcNow;
}

// Quota Management DTOs
public class QuotaConfigurationRequest
{
    [Required]
    public ChannelType ChannelType { get; set; }

    [Range(1000, 10000000)]
    public int MonthlyLimit { get; set; } = 10000;

    [Range(100, 100000)]
    public int DailyLimit { get; set; } = 1000;

    [Range(10, 10000)]
    public int HourlyLimit { get; set; } = 100;

    public bool EnableHardLimit { get; set; } = true;

    [Range(50, 100)]
    public int WarningThresholdPercent { get; set; } = 80;

    [Range(70, 100)]
    public int AlertThresholdPercent { get; set; } = 90;

    public bool AutoRecharge { get; set; } = false;

    [Range(0, 100000)]
    public int RechargeAmount { get; set; } = 0;

    [Range(0.01, 10.00)]
    public decimal CostPerMessage { get; set; } = 0.05m;
}

public class QuotaConfigurationResponse
{
    public Guid Id { get; set; }
    public ChannelType ChannelType { get; set; }
    public int MonthlyLimit { get; set; }
    public int DailyLimit { get; set; }
    public int HourlyLimit { get; set; }
    public bool EnableHardLimit { get; set; }
    public int WarningThresholdPercent { get; set; }
    public int AlertThresholdPercent { get; set; }
    public bool AutoRecharge { get; set; }
    public int RechargeAmount { get; set; }
    public decimal CostPerMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string? UpdatedByName { get; set; }
}

public class QuotaUsageResponse
{
    public ChannelType ChannelType { get; set; }
    public DateOnly UsageDate { get; set; }
    public int MessageCount { get; set; }
    public int SuccessfulCount { get; set; }
    public int FailedCount { get; set; }
    public decimal TotalCost { get; set; }
    public double SuccessRate => MessageCount > 0 ? (double)SuccessfulCount / MessageCount * 100 : 0;
}

public class QuotaUsageSearchRequest
{
    public ChannelType? ChannelType { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class QuotaUsageListResponse
{
    public List<QuotaUsageResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

// User Management DTOs
public class UserInvitationRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "Staff";

    [MaxLength(500)]
    public string? Message { get; set; }
}

public class UserInvitationResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public InvitationStatus Status { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
}

public class UserUpdateRequest
{
    [MaxLength(100)]
    public string? Name { get; set; }

    [MaxLength(20)]
    public string? Role { get; set; }

    public bool? IsActive { get; set; }
}

public class UserResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserSearchRequest
{
    public string? Search { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class UserListResponse
{
    public List<UserResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

// Security Settings DTOs
public class SecuritySettingsRequest
{
    [Range(6, 128)]
    public int MinPasswordLength { get; set; } = 8;

    public bool RequireUppercase { get; set; } = true;
    public bool RequireLowercase { get; set; } = true;
    public bool RequireNumbers { get; set; } = true;
    public bool RequireSpecialChars { get; set; } = true;

    [Range(30, 365)]
    public int PasswordExpiryDays { get; set; } = 90;

    [Range(1, 10)]
    public int PreventPasswordReuse { get; set; } = 5;

    [Range(15, 1440)]
    public int SessionTimeoutMinutes { get; set; } = 480;

    [Range(1, 10)]
    public int MaxConcurrentSessions { get; set; } = 3;

    public bool ForceLogoutOnPasswordChange { get; set; } = true;
    public bool Enforce2FA { get; set; } = false;
    public bool Allow2FAEmail { get; set; } = true;
    public bool Allow2FASMS { get; set; } = true;
    public bool Allow2FAAuthenticator { get; set; } = true;
    public bool EnableIPWhitelist { get; set; } = false;

    public List<string>? AllowedIPRanges { get; set; }

    [Range(3, 20)]
    public int MaxFailedLoginAttempts { get; set; } = 5;

    [Range(5, 1440)]
    public int AccountLockoutMinutes { get; set; } = 30;

    public bool EnableAuditLogging { get; set; } = true;

    [Range(30, 2555)]
    public int AuditRetentionDays { get; set; } = 90;

    public bool LogSuccessfulLogins { get; set; } = true;
    public bool LogFailedLogins { get; set; } = true;
    public bool LogDataChanges { get; set; } = true;
    public bool LogAdminActions { get; set; } = true;
}

public class SecuritySettingsResponse
{
    public Guid Id { get; set; }
    public int MinPasswordLength { get; set; }
    public bool RequireUppercase { get; set; }
    public bool RequireLowercase { get; set; }
    public bool RequireNumbers { get; set; }
    public bool RequireSpecialChars { get; set; }
    public int PasswordExpiryDays { get; set; }
    public int PreventPasswordReuse { get; set; }
    public int SessionTimeoutMinutes { get; set; }
    public int MaxConcurrentSessions { get; set; }
    public bool ForceLogoutOnPasswordChange { get; set; }
    public bool Enforce2FA { get; set; }
    public bool Allow2FAEmail { get; set; }
    public bool Allow2FASMS { get; set; }
    public bool Allow2FAAuthenticator { get; set; }
    public bool EnableIPWhitelist { get; set; }
    public List<string>? AllowedIPRanges { get; set; }
    public int MaxFailedLoginAttempts { get; set; }
    public int AccountLockoutMinutes { get; set; }
    public bool EnableAuditLogging { get; set; }
    public int AuditRetentionDays { get; set; }
    public bool LogSuccessfulLogins { get; set; }
    public bool LogFailedLogins { get; set; }
    public bool LogDataChanges { get; set; }
    public bool LogAdminActions { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string? UpdatedByName { get; set; }
}

// API Token DTOs
public class ApiTokenRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public List<string> Permissions { get; set; } = new();

    public DateTime? ExpiresAt { get; set; }
}

public class ApiTokenResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TokenPrefix { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public string? LastUsedIP { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string UserName { get; set; } = string.Empty;
}

public class ApiTokenCreateResponse : ApiTokenResponse
{
    public string Token { get; set; } = string.Empty; // Only returned on creation
}

public class AuditLogResponse
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string? ResourceId { get; set; }
    public Dictionary<string, object>? OldValues { get; set; }
    public Dictionary<string, object>? NewValues { get; set; }
    public string? IPAddress { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AuditLogSearchRequest
{
    public string? UserId { get; set; }
    public string? Action { get; set; }
    public string? ResourceType { get; set; }
    public string? ResourceId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? Success { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class AuditLogListResponse
{
    public List<AuditLogResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}