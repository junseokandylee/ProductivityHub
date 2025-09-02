using Microsoft.AspNetCore.Authorization;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Services;
using System.Security.Claims;

namespace ProductivityHub.Api.Endpoints;

public static class ActivityScoreEndpoint
{
    public static void MapActivityScoreEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/activity-score")
                      .WithTags("Activity Score")
                      .RequireAuthorization();

        // Get activity score distribution for the current tenant
        group.MapGet("/distribution", async (
            IActivityScoringService scoringService,
            ClaimsPrincipal user,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return Results.Unauthorized();
                }
                
                var distribution = await scoringService.GetScoreDistributionAsync(tenantId, cancellationToken);
                
                return Results.Ok(new { success = true, data = distribution });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "An error occurred while retrieving score distribution",
                    statusCode: 500);
            }
        })
        .WithName("GetActivityScoreDistribution")
        .WithSummary("Get activity score distribution for the current tenant")
        .WithOpenApi();

        // Get contacts by activity score range
        group.MapGet("/contacts", async (
            IActivityScoringService scoringService,
            ClaimsPrincipal user,
            decimal minScore = 0,
            decimal maxScore = 100,
            int limit = 100,
            CancellationToken cancellationToken = default) =>
        {
            try
            {
                var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return Results.Unauthorized();
                }
                
                var contacts = await scoringService.GetContactsByScoreRangeAsync(tenantId, minScore, maxScore, limit, cancellationToken);
                
                return Results.Ok(new { success = true, data = contacts });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "An error occurred while retrieving contacts",
                    statusCode: 500);
            }
        })
        .WithName("GetContactsByScoreRange")
        .WithSummary("Get contacts by activity score range")
        .WithOpenApi();

        // Get contacts by activity level (high/medium/low)
        group.MapGet("/contacts/{level}", async (
            string level,
            IActivityScoringService scoringService,
            ClaimsPrincipal user,
            int limit = 100,
            CancellationToken cancellationToken = default) =>
        {
            try
            {
                var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return Results.Unauthorized();
                }
                
                var (minScore, maxScore) = level.ToLowerInvariant() switch
                {
                    "high" => (70m, 100m),
                    "medium" => (30m, 69.99m),
                    "low" => (0m, 29.99m),
                    _ => throw new ArgumentException($"Invalid activity level: {level}")
                };

                var contacts = await scoringService.GetContactsByScoreRangeAsync(tenantId, minScore, maxScore, limit, cancellationToken);
                
                return Results.Ok(new { success = true, data = contacts });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "An error occurred while retrieving contacts",
                    statusCode: 500);
            }
        })
        .WithName("GetContactsByActivityLevel")
        .WithSummary("Get contacts by activity level (high/medium/low)")
        .WithOpenApi();

        // Recalculate activity score for a specific contact
        group.MapPost("/contacts/{contactId:guid}/recalculate", async (
            Guid contactId,
            IActivityScoringService scoringService,
            ClaimsPrincipal user,
            CancellationToken cancellationToken = default) =>
        {
            try
            {
                var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return Results.Unauthorized();
                }
                
                await scoringService.UpdateActivityScoreAsync(tenantId, contactId, cancellationToken);
                
                return Results.Ok(new { success = true, message = "Activity score updated successfully" });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "An error occurred while updating the activity score",
                    statusCode: 500);
            }
        })
        .WithName("RecalculateContactScore")
        .WithSummary("Recalculate activity score for a specific contact")
        .WithOpenApi();

        // Trigger bulk recalculation of all activity scores for current tenant (admin only)
        group.MapPost("/recalculate-all", async (
            IActivityScoringService scoringService,
            ClaimsPrincipal user,
            ILogger<Program> logger,
            CancellationToken cancellationToken = default) =>
        {
            try
            {
                var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
                if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
                {
                    return Results.Unauthorized();
                }
                
                // Start the recalculation process in the background
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await scoringService.UpdateAllActivityScoresAsync(tenantId, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Error in background recalculation for tenant {TenantId}", tenantId);
                    }
                }, cancellationToken);

                return Results.Ok(new { success = true, message = "Bulk recalculation started. This process will run in the background." });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    title: "An error occurred while starting the recalculation",
                    statusCode: 500);
            }
        })
        .WithName("RecalculateAllScores")
        .WithSummary("Trigger bulk recalculation of all activity scores for current tenant (admin only)")
        .WithOpenApi();
    }
}