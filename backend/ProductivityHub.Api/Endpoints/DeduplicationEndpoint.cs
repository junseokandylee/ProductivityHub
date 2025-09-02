using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.Extensions;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Endpoints;

public static class DeduplicationEndpoint
{
    public static void MapDeduplicationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/contacts/dedup")
            .WithTags("Deduplication")
            .RequireAuthorization();

        group.MapPost("/preview", PreviewDuplicatesAsync)
            .WithName("PreviewDuplicates")
            .WithSummary("Preview duplicate contact clusters")
            .Produces<DeduplicationPreviewResponse>()
            .ProducesValidationProblem();

        group.MapPost("/merge", MergeContactsAsync)
            .WithName("MergeContacts")
            .WithSummary("Execute contact merges for duplicate clusters")
            .Produces<MergeContactsResponse>()
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status500InternalServerError);
    }

    private static async Task<IResult> PreviewDuplicatesAsync(
        [FromBody] DeduplicationPreviewRequest request,
        [FromServices] IDeduplicationService deduplicationService,
        [FromServices] ILogger<Program> logger,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = context.GetTenantId();
            if (tenantId == Guid.Empty)
            {
                logger.LogWarning("PreviewDuplicates: Missing tenant ID in request");
                return Results.BadRequest("Tenant ID is required");
            }

            logger.LogInformation("Starting duplicate preview for tenant {TenantId} with confidence threshold {MinConfidenceScore}", 
                tenantId, request.MinConfidenceScore);

            var response = await deduplicationService.FindDuplicateClustersAsync(
                tenantId, 
                request, 
                cancellationToken);

            logger.LogInformation("Duplicate preview completed for tenant {TenantId}. Found {ClusterCount} clusters with {TotalContacts} contacts", 
                tenantId, response.TotalClusters, response.TotalContacts);

            return Results.Ok(response);
        }
        catch (Services.ValidationException ex)
        {
            logger.LogWarning(ex, "Validation error in PreviewDuplicates: {Message}", ex.Message);
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            logger.LogWarning(ex, "Invalid argument in PreviewDuplicates: {Message}", ex.Message);
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error in PreviewDuplicates for tenant {TenantId}", 
                context.GetTenantId());
            return Results.Problem(
                title: "Internal Server Error",
                detail: "An error occurred while previewing duplicates",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> MergeContactsAsync(
        [FromBody] MergeContactsRequest request,
        [FromServices] IDeduplicationService deduplicationService,
        [FromServices] ILogger<Program> logger,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = context.GetTenantId();
            if (tenantId == Guid.Empty)
            {
                logger.LogWarning("MergeContacts: Missing tenant ID in request");
                return Results.BadRequest("Tenant ID is required");
            }

            if (request.ClusterIds == null || request.ClusterIds.Count == 0)
            {
                logger.LogWarning("MergeContacts: No cluster IDs provided for tenant {TenantId}", tenantId);
                return Results.BadRequest("At least one cluster ID is required");
            }

            logger.LogInformation("Starting contact merge for tenant {TenantId}. Clusters: {ClusterIds}, DryRun: {DryRun}", 
                tenantId, string.Join(", ", request.ClusterIds), request.DryRun);

            var userId = context.GetUserId();
            var userName = context.User?.Identity?.Name ?? "Unknown";

            var response = await deduplicationService.MergeContactsAsync(
                tenantId, 
                request, 
                userId, 
                userName, 
                cancellationToken);

            if (response.Success)
            {
                logger.LogInformation("Contact merge completed for tenant {TenantId}. Processed {ClustersProcessed} clusters, merged {ContactsMerged} contacts", 
                    tenantId, response.ClustersProcessed, response.ContactsMerged);
            }
            else
            {
                logger.LogWarning("Contact merge failed for tenant {TenantId}. Errors: {Errors}", 
                    tenantId, string.Join("; ", response.Errors));
            }

            return Results.Ok(response);
        }
        catch (Services.ValidationException ex)
        {
            logger.LogWarning(ex, "Validation error in MergeContacts: {Message}", ex.Message);
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            logger.LogWarning(ex, "Invalid argument in MergeContacts: {Message}", ex.Message);
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Invalid operation in MergeContacts: {Message}", ex.Message);
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error in MergeContacts for tenant {TenantId}", 
                context.GetTenantId());
            return Results.Problem(
                title: "Internal Server Error",
                detail: "An error occurred while merging contacts",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}