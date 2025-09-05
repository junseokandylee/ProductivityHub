using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

// Profile DTOs
public class UserProfileResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Bio { get; set; }
    public string Timezone { get; set; } = "Asia/Seoul";
    public string Language { get; set; } = "ko";
    public string DateFormat { get; set; } = "yyyy-MM-dd";
    public string TimeFormat { get; set; } = "HH:mm";
    public bool EmailNotifications { get; set; } = true;
    public bool PushNotifications { get; set; } = true;
    public bool SmsNotifications { get; set; } = false;
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string TenantName { get; set; } = string.Empty;
}

public class UpdateUserProfileRequest
{
    [MaxLength(100)]
    public string? Name { get; set; }

    [MaxLength(20)]
    [Phone]
    public string? PhoneNumber { get; set; }

    [MaxLength(100)]
    public string? JobTitle { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    [MaxLength(50)]
    public string? Timezone { get; set; }

    [MaxLength(10)]
    public string? Language { get; set; }

    [MaxLength(15)]
    public string? DateFormat { get; set; }

    [MaxLength(10)]
    public string? TimeFormat { get; set; }

    public bool? EmailNotifications { get; set; }
    public bool? PushNotifications { get; set; }
    public bool? SmsNotifications { get; set; }
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class ChangeEmailRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(100)]
    public string NewEmail { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UploadAvatarResponse
{
    public string AvatarUrl { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class UserActivityResponse
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IPAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UserActivitySearchRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Action { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class UserActivityListResponse
{
    public List<UserActivityResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

// Profile validation helper
public static class ProfileValidation
{
    public static readonly string[] AllowedTimezones = 
    {
        "Asia/Seoul", "UTC", "America/New_York", "Europe/London", 
        "Asia/Tokyo", "Australia/Sydney", "America/Los_Angeles"
    };

    public static readonly string[] AllowedLanguages = 
    {
        "ko", "en", "ja", "zh"
    };

    public static readonly string[] AllowedDateFormats = 
    {
        "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy.MM.dd"
    };

    public static readonly string[] AllowedTimeFormats = 
    {
        "HH:mm", "hh:mm tt", "HH:mm:ss"
    };

    public static bool IsValidTimezone(string? timezone) =>
        timezone != null && AllowedTimezones.Contains(timezone);

    public static bool IsValidLanguage(string? language) =>
        language != null && AllowedLanguages.Contains(language);

    public static bool IsValidDateFormat(string? dateFormat) =>
        dateFormat != null && AllowedDateFormats.Contains(dateFormat);

    public static bool IsValidTimeFormat(string? timeFormat) =>
        timeFormat != null && AllowedTimeFormats.Contains(timeFormat);
}