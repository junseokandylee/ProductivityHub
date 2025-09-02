namespace ProductivityHub.Api.DTOs;

public class ContactGroupResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Count { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ContactSegmentResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Count { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class EstimateAudienceRequest
{
    public List<Guid> GroupIds { get; set; } = new();
    public List<Guid> SegmentIds { get; set; } = new();
    public Dictionary<string, object>? FilterJson { get; set; }
}

public class EstimateAudienceResponse
{
    public int TotalContacts { get; set; }
    public int UniqueContacts { get; set; }
    public Dictionary<string, int> BreakdownBySource { get; set; } = new();
}

public class SampleContactRequest
{
    public List<Guid> GroupIds { get; set; } = new();
    public List<Guid> SegmentIds { get; set; } = new();
    public Dictionary<string, object>? FilterJson { get; set; }
}

public class SampleContactResponse
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public Dictionary<string, string> PersonalizationData { get; set; } = new();
}

public class PreviewTemplateRequest
{
    public string MessageBody { get; set; } = string.Empty;
    public string? Title { get; set; }
    public Dictionary<string, string> Variables { get; set; } = new();
}

public class PreviewTemplateResponse
{
    public string RenderedBody { get; set; } = string.Empty;
    public string? RenderedTitle { get; set; }
    public List<string> MissingVariables { get; set; } = new();
    public int CharacterCount { get; set; }
}

public class ChannelStatusResponse
{
    public string Channel { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public int QuotaRemaining { get; set; }
    public int DailyLimit { get; set; }
    public bool HasWarning { get; set; }
    public string? WarningMessage { get; set; }
}

public class QuotaCurrentResponse
{
    public Dictionary<string, QuotaDetail> ChannelQuotas { get; set; } = new();
    public int TotalUsedToday { get; set; }
    public int TotalDailyLimit { get; set; }
}

public class QuotaDetail
{
    public int Used { get; set; }
    public int Limit { get; set; }
    public double UsagePercentage { get; set; }
    public bool IsNearLimit { get; set; }
}