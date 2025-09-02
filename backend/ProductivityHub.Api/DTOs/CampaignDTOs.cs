using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

public class CreateCampaignRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? MessageTitle { get; set; }

    [Required]
    [MaxLength(2000)]
    public string MessageBody { get; set; } = string.Empty;

    public Dictionary<string, string>? Variables { get; set; }

    [Required]
    public List<CampaignChannelRequest> Channels { get; set; } = new();

    [Required]
    public CampaignAudienceRequest Audience { get; set; } = new();

    public DateTime? ScheduledAt { get; set; }
}

public class CampaignChannelRequest
{
    [Required]
    public string Channel { get; set; } = string.Empty; // SMS, Kakao

    [Required]
    [Range(0, int.MaxValue)]
    public int OrderIndex { get; set; }

    public bool FallbackEnabled { get; set; } = true;
}

public class CampaignAudienceRequest
{
    public List<Guid>? GroupIds { get; set; }
    public List<Guid>? SegmentIds { get; set; }
    public Dictionary<string, object>? FilterJson { get; set; }
    public bool IncludeAll { get; set; } = false;
}

public class CreateCampaignResponse
{
    public Guid CampaignId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class EstimateCampaignRequest
{
    [Required]
    public CampaignAudienceRequest Audience { get; set; } = new();
    
    [Required]
    public List<CampaignChannelRequest> Channels { get; set; } = new();
}

public class EstimateCampaignResponse
{
    public int RecipientCount { get; set; }
    public decimal EstimatedCost { get; set; }
    public int QuotaRequired { get; set; }
    public bool QuotaOk { get; set; }
    public string Currency { get; set; } = "KRW";
    public Dictionary<string, int>? ChannelBreakdown { get; set; }
}