namespace ProductivityHub.Api.Configuration;

public class ExternalApiConfiguration
{
    public const string SectionName = "ExternalApis";

    public SmsConfiguration Sms { get; set; } = new();
    public KakaoConfiguration Kakao { get; set; } = new();
}

public class SmsConfiguration
{
    public string ApiKey { get; set; } = string.Empty;
    public string ApiUrl { get; set; } = string.Empty;
    public int RateLimitPerMinute { get; set; } = 100;
    public int TimeoutSeconds { get; set; } = 30;
}

public class KakaoConfiguration
{
    public string ApiKey { get; set; } = string.Empty;
    public string ApiUrl { get; set; } = string.Empty;
    public int RateLimitPerMinute { get; set; } = 200;
    public int TimeoutSeconds { get; set; } = 30;
}