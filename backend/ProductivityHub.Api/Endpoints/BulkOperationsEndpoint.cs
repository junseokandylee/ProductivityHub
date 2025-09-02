using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.DTOs;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Endpoints;

/// <summary>
/// Bulk operations endpoints for contact management
/// </summary>
public static class BulkOperationsEndpoint
{
    /// <summary>
    /// Maps bulk operations endpoints to the application
    /// </summary>
    public static IEndpointRouteBuilder MapBulkOperationsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/contacts/bulk")
            .WithTags("Bulk Operations")
            .RequireAuthorization();

        // POST /api/contacts/bulk/selection-token - Create selection token
        group.MapPost("/selection-token", CreateSelectionTokenAsync)
            .WithName("CreateSelectionToken")
            .WithSummary("Create selection token for smart bulk operations")
            .WithDescription("Creates a secure token representing the current filter state for bulk operations")
            .Produces<SelectionTokenDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/contacts/bulk/tag - Bulk tag operation
        group.MapPost("/tag", BulkTagOperationAsync)
            .WithName("BulkTagOperation")
            .WithSummary("Add or remove tags from multiple contacts")
            .WithDescription("Applies tag operations to contacts specified by IDs or selection token")
            .Produces<BulkActionResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/contacts/bulk/delete - Bulk delete operation
        group.MapPost("/delete", BulkDeleteOperationAsync)
            .WithName("BulkDeleteOperation")
            .WithSummary("Soft delete multiple contacts")
            .WithDescription("Marks contacts as deleted (soft delete) specified by IDs or selection token")
            .Produces<BulkActionResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/contacts/bulk/merge - Bulk merge operation
        group.MapPost("/merge", BulkMergeOperationAsync)
            .WithName("BulkMergeOperation")
            .WithSummary("Merge duplicate contacts")
            .WithDescription("Merges contacts into a primary contact, preserving data as configured")
            .Produces<BulkActionResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/contacts/bulk/status/{jobId} - Get bulk operation status
        group.MapGet("/status/{jobId}", GetBulkOperationStatusAsync)
            .WithName("GetBulkOperationStatus")
            .WithSummary("Get bulk operation status")
            .WithDescription("Returns the current status of a long-running bulk operation")
            .Produces<BulkOperationStatus>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return endpoints;
    }

    /// <summary>
    /// Creates a selection token for smart bulk operations
    /// </summary>
    private static async Task<IResult> CreateSelectionTokenAsync(
        [FromBody] CreateSelectionTokenRequest request,
        [FromServices] ISelectionTokenService selectionTokenService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var token = await selectionTokenService.CreateSelectionTokenAsync(tenantId.Value, request.SearchCriteria);
            return Results.Ok(token);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while creating selection token", statusCode: 500);
        }
    }

    /// <summary>
    /// Performs bulk tag operations on contacts
    /// </summary>
    private static async Task<IResult> BulkTagOperationAsync(
        [FromBody] BulkTagActionRequest request,
        [FromServices] IBulkOperationsService bulkOperationsService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var result = await bulkOperationsService.BulkTagOperationAsync(
                tenantId.Value, request, userId.Value, userName ?? "Unknown");

            return Results.Ok(result);
        }
        catch (Services.ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while performing bulk tag operation", statusCode: 500);
        }
    }

    /// <summary>
    /// Performs bulk delete operations on contacts
    /// </summary>
    private static async Task<IResult> BulkDeleteOperationAsync(
        [FromBody] BulkDeleteActionRequest request,
        [FromServices] IBulkOperationsService bulkOperationsService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var result = await bulkOperationsService.BulkDeleteOperationAsync(
                tenantId.Value, request, userId.Value, userName ?? "Unknown");

            return Results.Ok(result);
        }
        catch (Services.ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while performing bulk delete operation", statusCode: 500);
        }
    }

    /// <summary>
    /// Performs bulk merge operations on contacts
    /// </summary>
    private static async Task<IResult> BulkMergeOperationAsync(
        [FromBody] BulkMergeActionRequest request,
        [FromServices] IBulkOperationsService bulkOperationsService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var result = await bulkOperationsService.BulkMergeOperationAsync(
                tenantId.Value, request, userId.Value, userName ?? "Unknown");

            return Results.Ok(result);
        }
        catch (Services.ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while performing bulk merge operation", statusCode: 500);
        }
    }

    /// <summary>
    /// Gets the status of a bulk operation
    /// </summary>
    private static async Task<IResult> GetBulkOperationStatusAsync(
        string jobId,
        [FromServices] IBulkOperationsService bulkOperationsService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var status = await bulkOperationsService.GetBulkOperationStatusAsync(jobId);
            
            if (status == null)
                return Results.NotFound();

            return Results.Ok(status);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while retrieving bulk operation status", statusCode: 500);
        }
    }

    /// <summary>
    /// Extracts tenant ID, user ID, and username from JWT claims
    /// </summary>
    private static (Guid? TenantId, Guid? UserId, string? UserName) ExtractUserInfo(ClaimsPrincipal user)
    {
        var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
        var userIdClaim = user.FindFirst("sub") ?? user.FindFirst("user_id");
        var userNameClaim = user.FindFirst("name") ?? user.FindFirst("username");

        Guid? tenantId = null;
        Guid? userId = null;

        if (!string.IsNullOrEmpty(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var parsedTenantId))
            tenantId = parsedTenantId;

        if (userIdClaim?.Value != null && Guid.TryParse(userIdClaim.Value, out var parsedUserId))
            userId = parsedUserId;

        return (tenantId, userId, userNameClaim?.Value);
    }
}