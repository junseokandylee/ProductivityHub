using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Attributes;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Models;
using System.Net;
using System.Text.Json;
using System.Text;
using System.Globalization;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// Analytics controller for campaign event tracking and aggregations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(ApplicationDbContext context, ILogger<AnalyticsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private static bool IsValidScope(string scope)
    {
        return scope is "global" or "campaign";
    }

    /// <summary>
    /// Record a campaign event
    /// </summary>
    [HttpPost("events")]
    public async Task<IActionResult> RecordEvent([FromBody] CampaignEventRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Validate campaign belongs to tenant
            var campaign = await _context.Campaigns
                .Where(c => c.Id == request.CampaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaign == null)
                return NotFound("Campaign not found");

            // Validate contact belongs to tenant
            var contact = await _context.Contacts
                .Where(c => c.Id == request.ContactId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (contact == null)
                return NotFound("Contact not found");

            var campaignEvent = new CampaignEvent
            {
                TenantId = tenantId,
                CampaignId = request.CampaignId,
                ContactId = request.ContactId,
                Channel = request.Channel,
                EventType = request.EventType,
                OccurredAt = request.OccurredAt ?? DateTimeOffset.UtcNow,
                ProviderMessageId = request.ProviderMessageId,
                FailureReason = request.FailureReason,
                FailureCode = request.FailureCode,
                AbGroup = request.AbGroup,
                CostAmount = request.CostAmount ?? 0,
                Currency = request.Currency ?? "KRW",
                Meta = request.Meta != null ? JsonDocument.Parse(request.Meta) : null,
                Ip = !string.IsNullOrEmpty(request.IpAddress) && IPAddress.TryParse(request.IpAddress, out var ip) ? ip : null,
                UserAgentHash = request.UserAgentHash
            };

            _context.CampaignEvents.Add(campaignEvent);
            await _context.SaveChangesAsync();

            return Ok(new { Id = campaignEvent.Id, Message = "Event recorded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording campaign event");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Record a link click event
    /// </summary>
    [HttpPost("link-clicks")]
    public async Task<IActionResult> RecordLinkClick([FromBody] LinkClickRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Validate event belongs to tenant
            var campaignEvent = await _context.CampaignEvents
                .Where(e => e.Id == request.EventId && e.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaignEvent == null)
                return NotFound("Campaign event not found");

            var linkClick = new LinkClick
            {
                TenantId = tenantId,
                CampaignId = campaignEvent.CampaignId,
                ContactId = campaignEvent.ContactId,
                EventId = request.EventId,
                Url = request.Url,
                LinkLabel = request.LinkLabel,
                Ip = !string.IsNullOrEmpty(request.IpAddress) && IPAddress.TryParse(request.IpAddress, out var ip) ? ip : null,
                UserAgentHash = request.UserAgentHash,
                Referrer = request.Referrer,
                ClickedAt = request.ClickedAt ?? DateTimeOffset.UtcNow
            };

            _context.LinkClicks.Add(linkClick);
            await _context.SaveChangesAsync();

            return Ok(new { Id = linkClick.Id, Message = "Link click recorded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording link click");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get campaign funnel metrics
    /// </summary>
    [HttpGet("campaigns/{campaignId}/funnel")]
    public async Task<IActionResult> GetCampaignFunnelMetrics(Guid campaignId, [FromQuery] string? channel = null, [FromQuery] string? abGroup = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var query = _context.CampaignEvents
                .Where(e => e.TenantId == tenantId && e.CampaignId == campaignId);

            if (!string.IsNullOrEmpty(channel))
                query = query.Where(e => e.Channel == channel);

            if (!string.IsNullOrEmpty(abGroup))
                query = query.Where(e => e.AbGroup == abGroup);

            var metrics = await query
                .GroupBy(e => new { e.Channel, e.AbGroup })
                .Select(g => new
                {
                    Channel = g.Key.Channel,
                    AbGroup = g.Key.AbGroup,
                    SentCount = g.Count(e => e.EventType == EventType.Sent),
                    DeliveredCount = g.Count(e => e.EventType == EventType.Delivered),
                    OpenedCount = g.Count(e => e.EventType == EventType.Opened),
                    ClickedCount = g.Count(e => e.EventType == EventType.Clicked),
                    FailedCount = g.Count(e => e.EventType == EventType.Failed),
                    UnsubscribedCount = g.Count(e => e.EventType == EventType.Unsubscribed),
                    TotalCost = g.Sum(e => e.CostAmount),
                    UniqueRecipients = g.Select(e => e.ContactId).Distinct().Count(),
                    CampaignStart = g.Min(e => e.OccurredAt),
                    CampaignEnd = g.Max(e => e.OccurredAt)
                })
                .ToListAsync();

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting campaign funnel metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get campaign hourly metrics for the last 30 days
    /// </summary>
    [HttpGet("campaigns/{campaignId}/hourly")]
    public async Task<IActionResult> GetCampaignHourlyMetrics(Guid campaignId, [FromQuery] int days = 30)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var startDate = DateTimeOffset.UtcNow.AddDays(-Math.Abs(days));

            var metrics = await _context.CampaignEvents
                .Where(e => e.TenantId == tenantId && 
                           e.CampaignId == campaignId && 
                           e.OccurredAt >= startDate)
                .GroupBy(e => new { 
                    e.Channel, 
                    HourBucket = new DateTimeOffset(e.OccurredAt.Year, e.OccurredAt.Month, e.OccurredAt.Day, e.OccurredAt.Hour, 0, 0, e.OccurredAt.Offset)
                })
                .Select(g => new
                {
                    Channel = g.Key.Channel,
                    HourBucket = g.Key.HourBucket,
                    SentCount = g.Count(e => e.EventType == EventType.Sent),
                    DeliveredCount = g.Count(e => e.EventType == EventType.Delivered),
                    OpenedCount = g.Count(e => e.EventType == EventType.Opened),
                    ClickedCount = g.Count(e => e.EventType == EventType.Clicked),
                    FailedCount = g.Count(e => e.EventType == EventType.Failed),
                    HourlyCost = g.Sum(e => e.CostAmount)
                })
                .OrderBy(m => m.HourBucket)
                .ToListAsync();

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting campaign hourly metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get global analytics summary for tenant
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetAnalyticsSummary([FromQuery] DateTimeOffset? startDate = null, [FromQuery] DateTimeOffset? endDate = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            startDate ??= DateTimeOffset.UtcNow.AddDays(-30);
            endDate ??= DateTimeOffset.UtcNow;

            var summary = await _context.CampaignEvents
                .Where(e => e.TenantId == tenantId && 
                           e.OccurredAt >= startDate && 
                           e.OccurredAt <= endDate)
                .GroupBy(e => 1)
                .Select(g => new
                {
                    TotalCampaigns = g.Select(e => e.CampaignId).Distinct().Count(),
                    TotalEvents = g.Count(),
                    TotalContacts = g.Select(e => e.ContactId).Distinct().Count(),
                    TotalSent = g.Count(e => e.EventType == EventType.Sent),
                    TotalDelivered = g.Count(e => e.EventType == EventType.Delivered),
                    TotalOpened = g.Count(e => e.EventType == EventType.Opened),
                    TotalClicked = g.Count(e => e.EventType == EventType.Clicked),
                    TotalFailed = g.Count(e => e.EventType == EventType.Failed),
                    TotalCost = g.Sum(e => e.CostAmount),
                    DeliveryRate = g.Count(e => e.EventType == EventType.Sent) > 0 
                        ? (double)g.Count(e => e.EventType == EventType.Delivered) / g.Count(e => e.EventType == EventType.Sent) * 100 
                        : 0,
                    OpenRate = g.Count(e => e.EventType == EventType.Delivered) > 0 
                        ? (double)g.Count(e => e.EventType == EventType.Opened) / g.Count(e => e.EventType == EventType.Delivered) * 100 
                        : 0,
                    ClickRate = g.Count(e => e.EventType == EventType.Opened) > 0 
                        ? (double)g.Count(e => e.EventType == EventType.Clicked) / g.Count(e => e.EventType == EventType.Opened) * 100 
                        : 0
                })
                .FirstOrDefaultAsync();

            if (summary == null)
            {
                return Ok(new
                {
                    TotalCampaigns = 0,
                    TotalEvents = 0,
                    TotalContacts = 0,
                    TotalSent = 0,
                    TotalDelivered = 0,
                    TotalOpened = 0,
                    TotalClicked = 0,
                    TotalFailed = 0,
                    TotalCost = 0m,
                    DeliveryRate = 0.0,
                    OpenRate = 0.0,
                    ClickRate = 0.0
                });
            }

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics summary");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get top performing links by clicks
    /// </summary>
    [HttpGet("campaigns/{campaignId}/top-links")]
    public async Task<IActionResult> GetTopLinks(Guid campaignId, [FromQuery] int limit = 10)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            var topLinks = await _context.LinkClicks
                .Where(lc => lc.TenantId == tenantId && lc.CampaignId == campaignId)
                .GroupBy(lc => new { lc.Url, lc.LinkLabel })
                .Select(g => new
                {
                    Url = g.Key.Url,
                    LinkLabel = g.Key.LinkLabel,
                    ClickCount = g.Count(),
                    UniqueClickers = g.Select(lc => lc.ContactId).Distinct().Count(),
                    LastClicked = g.Max(lc => lc.ClickedAt)
                })
                .OrderByDescending(l => l.ClickCount)
                .Take(limit)
                .ToListAsync();

            return Ok(topLinks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top links");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Export analytics data to CSV format with rate limiting and security measures
    /// </summary>
    [HttpGet("export.csv")]
    [ExportRateLimit(maxRequests: 5, timeWindowMinutes: 60)] // 5 exports per hour per user
    public async Task<IActionResult> ExportAnalyticsCsv(
        [FromQuery] string scope = "global", 
        [FromQuery] Guid? campaignId = null,
        [FromQuery] DateTimeOffset? startDate = null, 
        [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] string? channels = null,
        [FromQuery] bool includeTimeSeries = true,
        [FromQuery] string timeZone = "UTC")
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (tenantId == Guid.Empty)
                return BadRequest("Tenant ID is required");

            // Enhanced input validation and security measures
            if (!IsValidScope(scope))
                return BadRequest("Invalid scope. Must be 'global' or 'campaign'");
                
            if (scope == "campaign" && !campaignId.HasValue)
                return BadRequest("Campaign ID is required for campaign scope");

            // Set default date range if not provided (limit to 1 year max)
            startDate ??= DateTimeOffset.UtcNow.AddDays(-30);
            endDate ??= DateTimeOffset.UtcNow;
            
            // Security: Limit date range to prevent excessive data exports
            var maxDateRange = TimeSpan.FromDays(365); // 1 year max
            if (endDate - startDate > maxDateRange)
                return BadRequest($"Date range cannot exceed {maxDateRange.Days} days");
                
            if (startDate > DateTimeOffset.UtcNow)
                return BadRequest("Start date cannot be in the future");
                
            if (endDate > DateTimeOffset.UtcNow)
                endDate = DateTimeOffset.UtcNow; // Auto-correct to current time
                
            if (startDate >= endDate)
                return BadRequest("Start date must be before end date");

            // Validate campaign ownership if campaign scope
            if (scope == "campaign" && campaignId.HasValue)
            {
                var campaignExists = await _context.Campaigns
                    .AnyAsync(c => c.Id == campaignId.Value && c.TenantId == tenantId);
                    
                if (!campaignExists)
                    return NotFound("Campaign not found or access denied");
            }

            // Parse channels filter (with validation)
            var channelList = string.IsNullOrEmpty(channels) ? null : channels.Split(',').Select(c => c.Trim()).ToList();
            
            // Validate channel names (prevent injection)
            if (channelList != null)
            {
                var validChannels = new[] { "email", "sms", "push", "web", "social" };
                var invalidChannels = channelList.Where(c => !validChannels.Contains(c.ToLowerInvariant())).ToList();
                if (invalidChannels.Any())
                    return BadRequest($"Invalid channels: {string.Join(", ", invalidChannels)}");
            }

            // Security logging
            _logger.LogInformation("Analytics export requested: Tenant={TenantId}, User={UserId}, Scope={Scope}, Campaign={CampaignId}, DateRange={StartDate} to {EndDate}", 
                tenantId, HttpContext.GetUserId(), scope, campaignId, startDate, endDate);

            // Set response headers for CSV download
            var fileName = scope == "campaign" 
                ? $"campaign-{campaignId}-analytics-{DateTime.UtcNow:yyyy-MM-dd}.csv"
                : $"global-analytics-{DateTime.UtcNow:yyyy-MM-dd}.csv";
            
            Response.ContentType = "text/csv";
            Response.Headers["Content-Disposition"] = $"attachment; filename={fileName}";

            // Use StreamWriter for efficient CSV streaming
            await using var writer = new StreamWriter(Response.Body, Encoding.UTF8);
            
            // Write metadata header
            await writer.WriteLineAsync("# Analytics Export");
            await writer.WriteLineAsync($"# Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
            await writer.WriteLineAsync($"# Scope: {scope.ToUpper()}");
            if (campaignId.HasValue)
                await writer.WriteLineAsync($"# Campaign ID: {campaignId}");
            await writer.WriteLineAsync($"# Date Range: {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
            await writer.WriteLineAsync($"# Time Zone: {timeZone}");
            if (channelList != null)
                await writer.WriteLineAsync($"# Channels: {string.Join(", ", channelList)}");
            await writer.WriteLineAsync();

            // Write summary data first
            await writer.WriteLineAsync("# SUMMARY METRICS");
            await writer.WriteLineAsync("Metric,Value,Percentage");

            var query = _context.CampaignEvents
                .Where(e => e.TenantId == tenantId && 
                           e.OccurredAt >= startDate && 
                           e.OccurredAt <= endDate);

            if (scope == "campaign" && campaignId.HasValue)
                query = query.Where(e => e.CampaignId == campaignId);

            if (channelList != null)
                query = query.Where(e => channelList.Contains(e.Channel));

            var summary = await query
                .GroupBy(e => 1)
                .Select(g => new
                {
                    TotalSent = g.Count(e => e.EventType == EventType.Sent),
                    TotalDelivered = g.Count(e => e.EventType == EventType.Delivered),
                    TotalOpened = g.Count(e => e.EventType == EventType.Opened),
                    TotalClicked = g.Count(e => e.EventType == EventType.Clicked),
                    TotalFailed = g.Count(e => e.EventType == EventType.Failed),
                    TotalCost = g.Sum(e => e.CostAmount),
                    UniqueContacts = g.Select(e => e.ContactId).Distinct().Count()
                })
                .FirstOrDefaultAsync();

            if (summary != null)
            {
                var deliveryRate = summary.TotalSent > 0 ? (double)summary.TotalDelivered / summary.TotalSent * 100 : 0;
                var openRate = summary.TotalDelivered > 0 ? (double)summary.TotalOpened / summary.TotalDelivered * 100 : 0;
                var clickRate = summary.TotalOpened > 0 ? (double)summary.TotalClicked / summary.TotalOpened * 100 : 0;

                await writer.WriteLineAsync($"Messages Sent,{summary.TotalSent},100.0");
                await writer.WriteLineAsync($"Messages Delivered,{summary.TotalDelivered},{deliveryRate:F1}");
                await writer.WriteLineAsync($"Messages Opened,{summary.TotalOpened},{openRate:F1}");
                await writer.WriteLineAsync($"Messages Clicked,{summary.TotalClicked},{clickRate:F1}");
                await writer.WriteLineAsync($"Messages Failed,{summary.TotalFailed},{(summary.TotalSent > 0 ? (double)summary.TotalFailed / summary.TotalSent * 100 : 0):F1}");
                await writer.WriteLineAsync($"Total Cost,{summary.TotalCost:F2},");
                await writer.WriteLineAsync($"Unique Contacts,{summary.UniqueContacts},");
            }

            await writer.WriteLineAsync();

            // Write channel breakdown
            await writer.WriteLineAsync("# CHANNEL BREAKDOWN");
            await writer.WriteLineAsync("Channel,Sent,Delivered,Opened,Clicked,Failed,Cost,Delivery_Rate,Open_Rate,Click_Rate");

            var channelBreakdown = await query
                .GroupBy(e => e.Channel)
                .Select(g => new
                {
                    Channel = g.Key,
                    Sent = g.Count(e => e.EventType == EventType.Sent),
                    Delivered = g.Count(e => e.EventType == EventType.Delivered),
                    Opened = g.Count(e => e.EventType == EventType.Opened),
                    Clicked = g.Count(e => e.EventType == EventType.Clicked),
                    Failed = g.Count(e => e.EventType == EventType.Failed),
                    Cost = g.Sum(e => e.CostAmount)
                })
                .ToListAsync();

            foreach (var channel in channelBreakdown)
            {
                var deliveryRate = channel.Sent > 0 ? (double)channel.Delivered / channel.Sent * 100 : 0;
                var openRate = channel.Delivered > 0 ? (double)channel.Opened / channel.Delivered * 100 : 0;
                var clickRate = channel.Opened > 0 ? (double)channel.Clicked / channel.Opened * 100 : 0;

                await writer.WriteLineAsync($"{channel.Channel},{channel.Sent},{channel.Delivered},{channel.Opened},{channel.Clicked},{channel.Failed},{channel.Cost:F2},{deliveryRate:F1},{openRate:F1},{clickRate:F1}");
            }

            // Write time series data if requested
            if (includeTimeSeries)
            {
                await writer.WriteLineAsync();
                await writer.WriteLineAsync("# TIME SERIES DATA (Hourly)");
                await writer.WriteLineAsync("Date,Hour,Channel,Sent,Delivered,Opened,Clicked,Failed,Cost");

                var timeSeries = await query
                    .GroupBy(e => new { 
                        e.Channel,
                        Date = e.OccurredAt.Date,
                        Hour = e.OccurredAt.Hour
                    })
                    .Select(g => new
                    {
                        g.Key.Channel,
                        g.Key.Date,
                        g.Key.Hour,
                        Sent = g.Count(e => e.EventType == EventType.Sent),
                        Delivered = g.Count(e => e.EventType == EventType.Delivered),
                        Opened = g.Count(e => e.EventType == EventType.Opened),
                        Clicked = g.Count(e => e.EventType == EventType.Clicked),
                        Failed = g.Count(e => e.EventType == EventType.Failed),
                        Cost = g.Sum(e => e.CostAmount)
                    })
                    .OrderBy(ts => ts.Date)
                    .ThenBy(ts => ts.Hour)
                    .ThenBy(ts => ts.Channel)
                    .ToListAsync();

                foreach (var ts in timeSeries)
                {
                    await writer.WriteLineAsync($"{ts.Date:yyyy-MM-dd},{ts.Hour:00},{ts.Channel},{ts.Sent},{ts.Delivered},{ts.Opened},{ts.Clicked},{ts.Failed},{ts.Cost:F2}");
                }
            }

            await writer.FlushAsync();
            return new EmptyResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting analytics to CSV");
            return StatusCode(500, "Internal server error");
        }
    }
}

/// <summary>
/// Request model for recording campaign events
/// </summary>
public class CampaignEventRequest
{
    public Guid CampaignId { get; set; }
    public Guid ContactId { get; set; }
    public string Channel { get; set; } = string.Empty;
    public EventType EventType { get; set; }
    public DateTimeOffset? OccurredAt { get; set; }
    public string? ProviderMessageId { get; set; }
    public string? FailureReason { get; set; }
    public string? FailureCode { get; set; }
    public string? AbGroup { get; set; }
    public decimal? CostAmount { get; set; }
    public string? Currency { get; set; }
    public string? Meta { get; set; } // JSON string
    public string? IpAddress { get; set; }
    public string? UserAgentHash { get; set; }
}

/// <summary>
/// Request model for recording link clicks
/// </summary>
public class LinkClickRequest
{
    public long EventId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? LinkLabel { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgentHash { get; set; }
    public string? Referrer { get; set; }
    public DateTimeOffset? ClickedAt { get; set; }
}