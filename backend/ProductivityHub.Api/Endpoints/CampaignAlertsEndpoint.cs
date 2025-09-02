using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.Services;
using System.Security.Claims;

namespace ProductivityHub.Api.Endpoints;

/// <summary>
/// Minimal API endpoints for campaign alert management
/// </summary>
public static class CampaignAlertsEndpoint
{
    /// <summary>
    /// Maps campaign alert endpoints to the application
    /// </summary>
    public static IEndpointRouteBuilder MapCampaignAlertEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/campaigns/{campaignId:guid}/alerts")
            .WithTags("Campaign Alerts")
            .RequireAuthorization();

        // GET /api/campaigns/{campaignId}/alerts
        group.MapGet("/", GetCampaignAlertsAsync)
            .WithName("GetCampaignAlerts")
            .WithSummary("Get campaign alert information")
            .WithDescription("Returns current alert status, failure rates, and alert configuration for a campaign")
            .Produces<CampaignAlertResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return endpoints;
    }

    /// <summary>
    /// Gets alert information for a specific campaign
    /// </summary>
    private static async Task<IResult> GetCampaignAlertsAsync(
        Guid campaignId,
        [FromServices] IAlertEvaluationService alertService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            // Extract tenant ID from JWT claims
            var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
            if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
            {
                return Results.Unauthorized();
            }

            // Get or create alert state for the campaign
            var alertState = await alertService.GetOrCreateAlertStateAsync(tenantId, campaignId, cancellationToken);
            var policy = await alertService.GetAlertPolicyAsync(tenantId, campaignId, cancellationToken);
            
            // Evaluate current alert status
            var evaluation = await alertService.EvaluateAlertAsync(tenantId, campaignId, cancellationToken);

            var response = new CampaignAlertResponse
            {
                CampaignId = campaignId,
                TenantId = tenantId,
                Alert = new CampaignAlertInfo(
                    Triggered: evaluation.AlertState.Triggered,
                    FailureRate: (double)evaluation.CurrentFailureRate,
                    Threshold: (double)evaluation.Policy.FailureRateThreshold,
                    WindowSeconds: evaluation.Policy.EvaluationWindowSeconds,
                    LastTriggeredAt: evaluation.AlertState.LastTriggeredAt,
                    LastClearedAt: evaluation.AlertState.LastClearedAt,
                    LastEvaluatedAt: evaluation.AlertState.LastEvaluatedAt
                ),
                Policy = new AlertPolicyInfo
                {
                    Id = policy.Id,
                    FailureRateThreshold = (double)policy.FailureRateThreshold,
                    MinConsecutiveBuckets = policy.MinConsecutiveBuckets,
                    EvaluationWindowSeconds = policy.EvaluationWindowSeconds,
                    IsDefault = policy.IsDefault,
                    IsCampaignSpecific = policy.IsCampaignSpecific,
                    CreatedAt = policy.CreatedAt,
                    UpdatedAt = policy.UpdatedAt
                },
                WindowMetrics = new WindowMetricsInfo
                {
                    TotalAttempted = evaluation.WindowMetrics.TotalAttempted,
                    TotalFailed = evaluation.WindowMetrics.TotalFailed,
                    TotalDelivered = evaluation.WindowMetrics.TotalDelivered,
                    FailureRate = (double)evaluation.WindowMetrics.FailureRate,
                    DeliveryRate = (double)evaluation.WindowMetrics.DeliveryRate
                },
                EvaluatedAt = DateTime.UtcNow
            };

            return Results.Ok(response);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            // Log error but don't expose internal details
            return Results.Problem("An error occurred while retrieving campaign alerts", statusCode: 500);
        }
    }
}

/// <summary>
/// Response model for campaign alert endpoint
/// </summary>
public class CampaignAlertResponse
{
    /// <summary>Campaign ID</summary>
    public required Guid CampaignId { get; init; }
    
    /// <summary>Tenant ID</summary>
    public required Guid TenantId { get; init; }
    
    /// <summary>Current alert status and metrics</summary>
    public required CampaignAlertInfo Alert { get; init; }
    
    /// <summary>Alert policy configuration</summary>
    public required AlertPolicyInfo Policy { get; init; }
    
    /// <summary>Metrics for the current evaluation window</summary>
    public required WindowMetricsInfo WindowMetrics { get; init; }
    
    /// <summary>When this alert information was evaluated</summary>
    public required DateTime EvaluatedAt { get; init; }
}

/// <summary>
/// Alert policy configuration information
/// </summary>
public class AlertPolicyInfo
{
    /// <summary>Policy ID</summary>
    public required Guid Id { get; init; }
    
    /// <summary>Failure rate threshold (0.0 to 1.0)</summary>
    public required double FailureRateThreshold { get; init; }
    
    /// <summary>Minimum consecutive buckets before triggering</summary>
    public required int MinConsecutiveBuckets { get; init; }
    
    /// <summary>Evaluation window in seconds</summary>
    public required int EvaluationWindowSeconds { get; init; }
    
    /// <summary>Whether this is the default tenant policy</summary>
    public required bool IsDefault { get; init; }
    
    /// <summary>Whether this is campaign-specific policy</summary>
    public required bool IsCampaignSpecific { get; init; }
    
    /// <summary>When the policy was created</summary>
    public required DateTime CreatedAt { get; init; }
    
    /// <summary>When the policy was last updated</summary>
    public required DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Window metrics information
/// </summary>
public class WindowMetricsInfo
{
    /// <summary>Total messages attempted in window</summary>
    public required long TotalAttempted { get; init; }
    
    /// <summary>Total messages failed in window</summary>
    public required long TotalFailed { get; init; }
    
    /// <summary>Total messages delivered in window</summary>
    public required long TotalDelivered { get; init; }
    
    /// <summary>Failure rate in window (0.0 to 1.0)</summary>
    public required double FailureRate { get; init; }
    
    /// <summary>Delivery rate in window (0.0 to 1.0)</summary>
    public required double DeliveryRate { get; init; }
}