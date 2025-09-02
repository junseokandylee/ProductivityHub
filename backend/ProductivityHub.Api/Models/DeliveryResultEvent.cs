namespace ProductivityHub.Api.Models;

/// <summary>
/// Represents a delivery result event consumed from Redis Streams
/// </summary>
public class DeliveryResultEvent
{
    public required string EventId { get; set; }
    public required string EventType { get; set; }
    public required Guid CampaignId { get; set; }
    public required Guid ContactId { get; set; }
    public required Guid TenantId { get; set; }
    public required string Channel { get; set; } // SMS, KakaoTalk, etc.
    public required string Status { get; set; } // Sent, Delivered, Failed, Opened, Clicked
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? MessageId { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>
    /// Creates a DeliveryResultEvent from Redis Stream fields
    /// </summary>
    public static DeliveryResultEvent FromRedisStream(string eventId, Dictionary<string, string> fields)
    {
        var evt = new DeliveryResultEvent
        {
            EventId = eventId,
            EventType = fields.TryGetValue("event_type", out var eventType) ? eventType : "delivery_result",
            CampaignId = Guid.Parse(fields["campaign_id"]),
            ContactId = Guid.Parse(fields["contact_id"]),
            TenantId = Guid.Parse(fields["tenant_id"]),
            Channel = fields["channel"],
            Status = fields["status"],
            MessageId = fields.TryGetValue("message_id", out var messageId) ? messageId : null,
            ErrorCode = fields.TryGetValue("error_code", out var errorCode) ? errorCode : null,
            ErrorMessage = fields.TryGetValue("error_message", out var errorMessage) ? errorMessage : null
        };

        // Parse timestamp if provided
        if (fields.TryGetValue("timestamp", out var timestampStr))
        {
            if (DateTime.TryParse(timestampStr, out var timestamp))
            {
                evt.Timestamp = timestamp;
            }
        }

        return evt;
    }

    /// <summary>
    /// Gets the time bucket minute for this event (truncated to minute)
    /// </summary>
    public DateTime GetBucketMinute()
    {
        return new DateTime(Timestamp.Year, Timestamp.Month, Timestamp.Day, 
                          Timestamp.Hour, Timestamp.Minute, 0, DateTimeKind.Utc);
    }

    /// <summary>
    /// Determines if this event should increment sent counters
    /// </summary>
    public bool IsSentEvent() => Status.Equals("Sent", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Determines if this event should increment delivered counters
    /// </summary>
    public bool IsDeliveredEvent() => Status.Equals("Delivered", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Determines if this event should increment failed counters
    /// </summary>
    public bool IsFailedEvent() => Status.Equals("Failed", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Determines if this event should increment open counters
    /// </summary>
    public bool IsOpenEvent() => Status.Equals("Opened", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Determines if this event should increment click counters
    /// </summary>
    public bool IsClickEvent() => Status.Equals("Clicked", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Gets the channel type for counter updating
    /// </summary>
    public bool IsSmsChannel() => Channel.Equals("SMS", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Gets the channel type for counter updating
    /// </summary>
    public bool IsKakaoChannel() => Channel.Equals("KakaoTalk", StringComparison.OrdinalIgnoreCase) ||
                                   Channel.Equals("Kakao", StringComparison.OrdinalIgnoreCase);
}