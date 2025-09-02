using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.DTOs;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Endpoints;

/// <summary>
/// Contact export endpoints for CSV/XLSX generation
/// </summary>
public static class ContactExportEndpoint
{
    /// <summary>
    /// Maps contact export endpoints to the application
    /// </summary>
    public static IEndpointRouteBuilder MapContactExportEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/contacts/export")
            .WithTags("Contact Export")
            .RequireAuthorization();

        // POST /api/contacts/export - Initiate export (sync/async)
        group.MapPost("/", InitiateExportAsync)
            .WithName("InitiateContactExport")
            .WithSummary("Initiate contact export (CSV/XLSX)")
            .WithDescription("Exports contacts based on filter criteria. Returns direct download for small sets, job ID for large sets.")
            .Produces<ContactExportResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status202Accepted)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/contacts/export/download/{token} - Download export file
        group.MapGet("/download/{token}", DownloadExportAsync)
            .WithName("DownloadExport")
            .WithSummary("Download exported contact file")
            .WithDescription("Downloads the generated export file using a secure token")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status410Gone);

        // GET /api/contacts/export/status/{jobId} - Get export job status
        group.MapGet("/status/{jobId}", GetExportStatusAsync)
            .WithName("GetExportStatus")
            .WithSummary("Get export job status")
            .WithDescription("Returns the current status of a background export job")
            .Produces<ExportJobStatus>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return endpoints;
    }

    /// <summary>
    /// Initiates contact export (sync for small datasets, async for large ones)
    /// </summary>
    private static async Task<IResult> InitiateExportAsync(
        [FromBody] ContactExportRequest request,
        [FromServices] IContactExportService exportService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var result = await exportService.ExportContactsAsync(tenantId.Value, request);

            if (result.IsAsync)
            {
                return Results.Accepted($"/api/contacts/export/status/{result.JobId}", result);
            }
            else
            {
                return Results.Ok(result);
            }
        }
        catch (Services.ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"An error occurred while initiating export: {ex.Message}", statusCode: 500);
        }
    }

    /// <summary>
    /// Downloads the exported file using a secure token
    /// </summary>
    private static async Task<IResult> DownloadExportAsync(
        string token,
        [FromServices] IContactExportService exportService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var fileStream = await exportService.GetExportFileAsync(token);
            
            if (fileStream == null)
            {
                return Results.Problem("Export file not found or expired", statusCode: 410);
            }

            // Determine content type and filename based on token format
            var contentType = token.Contains("xlsx") ? 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : 
                "text/csv";
            
            var fileName = $"contacts_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}" + 
                          (token.Contains("xlsx") ? ".xlsx" : ".csv");

            return Results.Stream(
                fileStream,
                contentType: contentType,
                fileDownloadName: fileName,
                enableRangeProcessing: true);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"An error occurred while downloading export: {ex.Message}", statusCode: 500);
        }
    }

    /// <summary>
    /// Gets the status of a background export job
    /// </summary>
    private static async Task<IResult> GetExportStatusAsync(
        string jobId,
        [FromServices] IContactExportService exportService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var status = await exportService.GetExportStatusAsync(jobId);
            
            if (status == null)
                return Results.NotFound(new { error = "Export job not found" });

            return Results.Ok(status);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"An error occurred while retrieving export status: {ex.Message}", statusCode: 500);
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