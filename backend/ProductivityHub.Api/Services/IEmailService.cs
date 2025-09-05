using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Services;

public interface IEmailService
{
    Task<EmailSendResult> SendEmailAsync(SendEmailRequest request, CancellationToken cancellationToken = default);
    Task<EmailSendResult> SendBulkEmailAsync(SendBulkEmailRequest request, CancellationToken cancellationToken = default);
    Task<EmailSendResult> SendTemplatedEmailAsync(SendTemplatedEmailRequest request, CancellationToken cancellationToken = default);
    Task<EmailSendResult> SendBulkTemplatedEmailAsync(SendBulkTemplatedEmailRequest request, CancellationToken cancellationToken = default);
    
    Task<List<string>> GetVerifiedEmailAddressesAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<bool> VerifyEmailAddressAsync(string emailAddress, CancellationToken cancellationToken = default);
    
    Task<EmailQuotaInfo> GetSendQuotaAsync(CancellationToken cancellationToken = default);
    Task<EmailSendStatistics> GetSendStatisticsAsync(CancellationToken cancellationToken = default);
    
    Task ProcessSesWebhookAsync(string payload, CancellationToken cancellationToken = default);
}

// DTOs for Email Service
public class SendEmailRequest
{
    public Guid TenantId { get; set; }
    public string From { get; set; } = string.Empty;
    public List<string> To { get; set; } = new();
    public List<string>? Cc { get; set; }
    public List<string>? Bcc { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
    public string? TextBody { get; set; }
    public List<EmailAttachment>? Attachments { get; set; }
    public Dictionary<string, string>? Tags { get; set; }
    public string? ConfigurationSetName { get; set; }
}

public class SendBulkEmailRequest
{
    public Guid TenantId { get; set; }
    public string From { get; set; } = string.Empty;
    public List<BulkEmailDestination> Destinations { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
    public string? TextBody { get; set; }
    public Dictionary<string, string>? DefaultTags { get; set; }
    public string? ConfigurationSetName { get; set; }
}

public class SendTemplatedEmailRequest
{
    public Guid TenantId { get; set; }
    public string From { get; set; } = string.Empty;
    public List<string> To { get; set; } = new();
    public string TemplateName { get; set; } = string.Empty;
    public Dictionary<string, string> TemplateData { get; set; } = new();
    public Dictionary<string, string>? Tags { get; set; }
    public string? ConfigurationSetName { get; set; }
}

public class SendBulkTemplatedEmailRequest
{
    public Guid TenantId { get; set; }
    public string From { get; set; } = string.Empty;
    public List<BulkTemplatedEmailDestination> Destinations { get; set; } = new();
    public string TemplateName { get; set; } = string.Empty;
    public Dictionary<string, string>? DefaultTags { get; set; }
    public string? ConfigurationSetName { get; set; }
}

public class BulkEmailDestination
{
    public List<string> To { get; set; } = new();
    public Dictionary<string, string>? ReplacementTags { get; set; }
}

public class BulkTemplatedEmailDestination
{
    public List<string> To { get; set; } = new();
    public Dictionary<string, string> ReplacementTemplateData { get; set; } = new();
}

public class EmailAttachment
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Content { get; set; } = Array.Empty<byte>();
}

public class EmailSendResult
{
    public bool Success { get; set; }
    public string? MessageId { get; set; }
    public List<string>? MessageIds { get; set; } // For bulk operations
    public string? ErrorMessage { get; set; }
    public Dictionary<string, string>? FailedDestinations { get; set; } // Email -> Error
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}

public class EmailQuotaInfo
{
    public double Max24HourSend { get; set; }
    public double MaxSendRate { get; set; }
    public double SentLast24Hours { get; set; }
}

public class EmailSendStatistics
{
    public long DeliveryAttempts { get; set; }
    public long Bounces { get; set; }
    public long Complaints { get; set; }
    public long Rejects { get; set; }
    public DateTime Timestamp { get; set; }
}