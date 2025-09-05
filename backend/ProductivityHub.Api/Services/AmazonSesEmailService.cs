using Amazon;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

public class AmazonSesEmailService : IEmailService
{
    private readonly IAmazonSimpleEmailService _sesClient;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AmazonSesEmailService> _logger;
    private readonly IConfiguration _configuration;

    // SES rate limiting - default is 14 emails/second for new accounts
    private readonly SemaphoreSlim _rateLimitSemaphore;
    private readonly int _maxSendRate;

    public AmazonSesEmailService(
        IAmazonSimpleEmailService sesClient,
        ApplicationDbContext context,
        ILogger<AmazonSesEmailService> logger,
        IConfiguration configuration)
    {
        _sesClient = sesClient;
        _context = context;
        _logger = logger;
        _configuration = configuration;
        
        _maxSendRate = _configuration.GetValue<int>("AWS:SES:MaxSendRate", 14);
        _rateLimitSemaphore = new SemaphoreSlim(_maxSendRate, _maxSendRate);
    }

    public async Task<EmailSendResult> SendEmailAsync(SendEmailRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            await _rateLimitSemaphore.WaitAsync(cancellationToken);

            var destination = new Destination
            {
                ToAddresses = request.To,
                CcAddresses = request.Cc ?? new List<string>(),
                BccAddresses = request.Bcc ?? new List<string>()
            };

            var message = new Message
            {
                Subject = new Content { Data = request.Subject },
                Body = new Body
                {
                    Html = new Content { Data = request.HtmlBody },
                    Text = !string.IsNullOrEmpty(request.TextBody) ? new Content { Data = request.TextBody } : null
                }
            };

            var sendRequest = new Amazon.SimpleEmail.Model.SendEmailRequest
            {
                Source = request.From,
                Destination = destination,
                Message = message,
                ConfigurationSetName = request.ConfigurationSetName,
                Tags = request.Tags?.Select(kvp => new MessageTag { Name = kvp.Key, Value = kvp.Value }).ToList()
            };

            var response = await _sesClient.SendEmailAsync(sendRequest, cancellationToken);

            // Log the email event
            await LogEmailEventAsync(request.TenantId, response.MessageId, request.To.First(), EventType.Sent, null, cancellationToken);

            _logger.LogInformation("Email sent successfully. MessageId: {MessageId}", response.MessageId);

            return new EmailSendResult
            {
                Success = true,
                MessageId = response.MessageId,
                SentAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Recipients}", string.Join(", ", request.To));
            return new EmailSendResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                SentAt = DateTime.UtcNow
            };
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }

    public async Task<EmailSendResult> SendBulkEmailAsync(SendBulkEmailRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            // For now, implement bulk email by sending individual emails
            // AWS SES v4 doesn't have SendBulkEmail in the same way as v3
            var results = new List<string>();
            var failures = new Dictionary<string, string>();

            foreach (var destination in request.Destinations)
            {
                try
                {
                    await _rateLimitSemaphore.WaitAsync(cancellationToken);

                    var singleRequest = new SendEmailRequest
                    {
                        TenantId = request.TenantId,
                        From = request.From,
                        To = destination.To,
                        Subject = request.Subject,
                        HtmlBody = request.HtmlBody,
                        TextBody = request.TextBody,
                        Tags = request.DefaultTags,
                        ConfigurationSetName = request.ConfigurationSetName
                    };

                    var result = await SendEmailAsync(singleRequest, cancellationToken);
                    if (result.Success && result.MessageId != null)
                    {
                        results.Add(result.MessageId);
                    }
                    else
                    {
                        foreach (var email in destination.To)
                        {
                            failures[email] = result.ErrorMessage ?? "Unknown error";
                        }
                    }
                }
                finally
                {
                    _rateLimitSemaphore.Release();
                }
            }

            _logger.LogInformation("Bulk email sent. Success: {SuccessCount}, Failed: {FailedCount}", 
                results.Count, failures.Count);

            return new EmailSendResult
            {
                Success = results.Any(),
                MessageIds = results,
                FailedDestinations = failures.Any() ? failures : null,
                SentAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send bulk email to {RecipientCount} destinations", request.Destinations.Count);
            return new EmailSendResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                SentAt = DateTime.UtcNow
            };
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }

    public async Task<EmailSendResult> SendTemplatedEmailAsync(SendTemplatedEmailRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            await _rateLimitSemaphore.WaitAsync(cancellationToken);

            var destination = new Destination { ToAddresses = request.To };

            var templatedRequest = new Amazon.SimpleEmail.Model.SendTemplatedEmailRequest
            {
                Source = request.From,
                Destination = destination,
                Template = request.TemplateName,
                TemplateData = JsonSerializer.Serialize(request.TemplateData),
                ConfigurationSetName = request.ConfigurationSetName,
                Tags = request.Tags?.Select(kvp => new MessageTag { Name = kvp.Key, Value = kvp.Value }).ToList()
            };

            var response = await _sesClient.SendTemplatedEmailAsync(templatedRequest, cancellationToken);

            // Log the email event
            await LogEmailEventAsync(request.TenantId, response.MessageId, request.To.First(), EventType.Sent, null, cancellationToken);

            _logger.LogInformation("Templated email sent successfully. MessageId: {MessageId}, Template: {Template}", 
                response.MessageId, request.TemplateName);

            return new EmailSendResult
            {
                Success = true,
                MessageId = response.MessageId,
                SentAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send templated email to {Recipients} with template {Template}", 
                string.Join(", ", request.To), request.TemplateName);
            return new EmailSendResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                SentAt = DateTime.UtcNow
            };
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }

    public async Task<EmailSendResult> SendBulkTemplatedEmailAsync(SendBulkTemplatedEmailRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            // Implement bulk templated email by sending individual templated emails
            var results = new List<string>();
            var failures = new Dictionary<string, string>();

            foreach (var destination in request.Destinations)
            {
                try
                {
                    var singleRequest = new SendTemplatedEmailRequest
                    {
                        TenantId = request.TenantId,
                        From = request.From,
                        To = destination.To,
                        TemplateName = request.TemplateName,
                        TemplateData = destination.ReplacementTemplateData,
                        Tags = request.DefaultTags,
                        ConfigurationSetName = request.ConfigurationSetName
                    };

                    var result = await SendTemplatedEmailAsync(singleRequest, cancellationToken);
                    if (result.Success && result.MessageId != null)
                    {
                        results.Add(result.MessageId);
                    }
                    else
                    {
                        foreach (var email in destination.To)
                        {
                            failures[email] = result.ErrorMessage ?? "Unknown error";
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending templated email to destination");
                    foreach (var email in destination.To)
                    {
                        failures[email] = ex.Message;
                    }
                }
            }

            _logger.LogInformation("Bulk templated email sent. Template: {Template}, Success: {SuccessCount}, Failed: {FailedCount}", 
                request.TemplateName, results.Count, failures.Count);

            return new EmailSendResult
            {
                Success = results.Any(),
                MessageIds = results,
                FailedDestinations = failures.Any() ? failures : null,
                SentAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send bulk templated email with template {Template} to {RecipientCount} destinations", 
                request.TemplateName, request.Destinations.Count);
            return new EmailSendResult
            {
                Success = false,
                ErrorMessage = ex.Message,
                SentAt = DateTime.UtcNow
            };
        }
        finally
        {
            _rateLimitSemaphore.Release();
        }
    }

    public async Task<List<string>> GetVerifiedEmailAddressesAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _sesClient.ListVerifiedEmailAddressesAsync(cancellationToken);
            return response.VerifiedEmailAddresses;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get verified email addresses for tenant {TenantId}", tenantId);
            return new List<string>();
        }
    }

    public async Task<bool> VerifyEmailAddressAsync(string emailAddress, CancellationToken cancellationToken = default)
    {
        try
        {
            await _sesClient.VerifyEmailIdentityAsync(new VerifyEmailIdentityRequest { EmailAddress = emailAddress }, cancellationToken);
            _logger.LogInformation("Verification email sent to {EmailAddress}", emailAddress);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {EmailAddress}", emailAddress);
            return false;
        }
    }

    public async Task<EmailQuotaInfo> GetSendQuotaAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _sesClient.GetSendQuotaAsync(cancellationToken);
            return new EmailQuotaInfo
            {
                Max24HourSend = response.Max24HourSend ?? 0,
                MaxSendRate = response.MaxSendRate ?? 0,
                SentLast24Hours = response.SentLast24Hours ?? 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get SES send quota");
            return new EmailQuotaInfo();
        }
    }

    public async Task<EmailSendStatistics> GetSendStatisticsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _sesClient.GetSendStatisticsAsync(cancellationToken);
            var latestStats = response.SendDataPoints.OrderByDescending(x => x.Timestamp).FirstOrDefault();
            
            return new EmailSendStatistics
            {
                DeliveryAttempts = latestStats?.DeliveryAttempts ?? 0,
                Bounces = latestStats?.Bounces ?? 0,
                Complaints = latestStats?.Complaints ?? 0,
                Rejects = latestStats?.Rejects ?? 0,
                Timestamp = latestStats?.Timestamp ?? DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get SES send statistics");
            return new EmailSendStatistics { Timestamp = DateTime.UtcNow };
        }
    }

    public async Task ProcessSesWebhookAsync(string payload, CancellationToken cancellationToken = default)
    {
        try
        {
            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;

            // Handle SNS message
            if (root.TryGetProperty("Type", out var typeElement) && typeElement.GetString() == "Notification")
            {
                if (root.TryGetProperty("Message", out var messageElement))
                {
                    var messagePayload = messageElement.GetString();
                    if (!string.IsNullOrEmpty(messagePayload))
                    {
                        await ProcessSesEventAsync(messagePayload, cancellationToken);
                    }
                }
            }
            else
            {
                // Direct SES event
                await ProcessSesEventAsync(payload, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process SES webhook: {Payload}", payload);
        }
    }

    private async Task ProcessSesEventAsync(string eventPayload, CancellationToken cancellationToken)
    {
        using var document = JsonDocument.Parse(eventPayload);
        var root = document.RootElement;

        if (!root.TryGetProperty("eventType", out var eventTypeElement))
            return;

        var eventType = eventTypeElement.GetString();
        var messageId = root.TryGetProperty("mail", out var mailElement) && 
                       mailElement.TryGetProperty("messageId", out var messageIdElement) 
                       ? messageIdElement.GetString() : null;

        var recipientEmail = GetRecipientEmail(root);
        if (string.IsNullOrEmpty(messageId) || string.IsNullOrEmpty(recipientEmail))
            return;

        var eventTypeEnum = eventType switch
        {
            "send" => EventType.Sent,
            "delivery" => EventType.Delivered,
            "bounce" => EventType.Bounced,
            "complaint" => EventType.Complained,
            "reject" => EventType.Rejected,
            _ => (EventType?)null
        };

        if (!eventTypeEnum.HasValue)
            return;

        // Find the tenant ID from existing email events (assuming we logged the initial send)
        var existingEvent = await _context.EmailEvents
            .Where(e => e.SesMessageId == messageId)
            .Select(e => new { e.TenantId, e.SubscriptionId })
            .FirstOrDefaultAsync(cancellationToken);

        if (existingEvent == null)
        {
            _logger.LogWarning("Could not find tenant for SES message {MessageId}", messageId);
            return;
        }

        await LogEmailEventAsync(existingEvent.TenantId, messageId, recipientEmail, eventTypeEnum.Value, eventPayload, cancellationToken);
    }

    private string? GetRecipientEmail(JsonElement root)
    {
        if (root.TryGetProperty("mail", out var mailElement) &&
            mailElement.TryGetProperty("commonHeaders", out var headersElement) &&
            headersElement.TryGetProperty("to", out var toElement) &&
            toElement.ValueKind == JsonValueKind.Array)
        {
            var firstRecipient = toElement.EnumerateArray().FirstOrDefault();
            return firstRecipient.ValueKind == JsonValueKind.String ? firstRecipient.GetString() : null;
        }

        // For bounce/complaint events, try different path
        if (root.TryGetProperty("bounce", out var bounceElement) &&
            bounceElement.TryGetProperty("bouncedRecipients", out var bouncedElement) &&
            bouncedElement.ValueKind == JsonValueKind.Array)
        {
            var firstBounced = bouncedElement.EnumerateArray().FirstOrDefault();
            if (firstBounced.TryGetProperty("emailAddress", out var emailElement))
                return emailElement.GetString();
        }

        if (root.TryGetProperty("complaint", out var complaintElement) &&
            complaintElement.TryGetProperty("complainedRecipients", out var complainedElement) &&
            complainedElement.ValueKind == JsonValueKind.Array)
        {
            var firstComplained = complainedElement.EnumerateArray().FirstOrDefault();
            if (firstComplained.TryGetProperty("emailAddress", out var emailElement))
                return emailElement.GetString();
        }

        return null;
    }

    private async Task LogEmailEventAsync(Guid tenantId, string sesMessageId, string recipientEmail, EventType eventType, string? eventData, CancellationToken cancellationToken)
    {
        try
        {
            // Check if this is for a subscription
            var subscription = await _context.EmailSubscriptions
                .Where(s => s.TenantId == tenantId && s.Email == recipientEmail)
                .FirstOrDefaultAsync(cancellationToken);

            var emailEvent = new EmailEvent
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CampaignId = null, // Will be set by campaign service when sending campaign emails
                SubscriptionId = subscription?.Id,
                RecipientEmail = recipientEmail,
                EventType = eventType.ToString(),
                OccurredAt = DateTime.UtcNow,
                SesMessageId = sesMessageId,
                EventData = eventData
            };

            _context.EmailEvents.Add(emailEvent);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log email event for message {MessageId}", sesMessageId);
        }
    }

    public void Dispose()
    {
        _rateLimitSemaphore?.Dispose();
    }
}

public enum EventType
{
    Sent,
    Delivered,
    Opened,
    Clicked,
    Bounced,
    Complained,
    Rejected,
    Unsubscribed
}