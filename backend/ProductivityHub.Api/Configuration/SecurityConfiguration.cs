namespace ProductivityHub.Api.Configuration;

public class SecurityConfiguration
{
    public const string SectionName = "Security";

    public bool EnableStrictTransportSecurity { get; set; } = false;
    public bool EnableContentSecurityPolicy { get; set; } = false;
    public bool RequireHttps { get; set; } = false;
    public int HstsMaxAgeSeconds { get; set; } = 31536000;
    public bool HstsIncludeSubdomains { get; set; } = true;
    public bool EnableXFrameOptions { get; set; } = true;
    public bool EnableXContentTypeOptions { get; set; } = true;
    public bool EnableReferrerPolicy { get; set; } = true;
    public RateLimitConfiguration RateLimit { get; set; } = new();
}

public class RateLimitConfiguration
{
    public int RequestsPerMinute { get; set; } = 100;
    public bool EnableRateLimiting { get; set; } = true;
    public bool SkipSuccessfulRequests { get; set; } = false;
    public bool RateLimitByIp { get; set; } = true;
    public bool RateLimitByUser { get; set; } = false;
    public int WindowMinutes { get; set; } = 10;
}