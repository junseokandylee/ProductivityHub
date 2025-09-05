namespace ProductivityHub.Api.Configuration;

public class AwsSesConfiguration
{
    public const string SectionName = "AWS:SES";
    
    public string Region { get; set; } = "us-east-1";
    public string? AccessKey { get; set; }
    public string? SecretKey { get; set; }
    public int MaxSendRate { get; set; } = 14; // Default SES rate limit for new accounts
    public string? ConfigurationSetName { get; set; }
    public string? DefaultFromAddress { get; set; }
    public string? DefaultFromName { get; set; }
    public bool UseLocalStack { get; set; } = false; // For testing with LocalStack
    public string LocalStackEndpoint { get; set; } = "http://localhost:4566";
    
    // Webhook settings for receiving SES events
    public string WebhookSecret { get; set; } = string.Empty;
    public string WebhookPath { get; set; } = "/webhooks/ses";
    
    // Template settings
    public Dictionary<string, string> DefaultTemplates { get; set; } = new();
}