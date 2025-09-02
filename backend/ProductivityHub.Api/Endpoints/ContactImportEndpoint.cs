using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;

namespace ProductivityHub.Api.Endpoints;

/// <summary>
/// Minimal API endpoints for contact import functionality
/// </summary>
public static class ContactImportEndpoint
{
    /// <summary>
    /// Maps contact import endpoints to the application
    /// </summary>
    public static IEndpointRouteBuilder MapContactImportEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/imports")
            .WithTags("Contact Import")
            .RequireAuthorization();

        // POST /api/imports/contacts - Upload file and start import job
        group.MapPost("/contacts", StartContactImportAsync)
            .WithName("StartContactImport")
            .WithSummary("Start contact import from CSV/Excel file")
            .WithDescription("Upload a CSV or Excel file and create an import job for processing")
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<ImportJobResponse>(StatusCodes.Status202Accepted)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status413PayloadTooLarge)
            .DisableAntiforgery(); // Required for file uploads

        // GET /api/imports/{jobId} - Get import job status
        group.MapGet("/{jobId}", GetImportJobStatusAsync)
            .WithName("GetImportJobStatus")
            .WithSummary("Get import job status")
            .WithDescription("Get the current status and progress of an import job")
            .Produces<ImportJobStatusDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/imports/{jobId}/events - SSE endpoint for real-time progress
        group.MapGet("/{jobId}/events", StreamImportProgressAsync)
            .WithName("StreamImportProgress")
            .WithSummary("Stream import progress via Server-Sent Events")
            .WithDescription("Real-time progress updates for an import job using SSE")
            .Produces(StatusCodes.Status200OK, contentType: "text/event-stream")
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/imports/{jobId}/errors - Get import validation errors
        group.MapGet("/{jobId}/errors", GetImportErrorsAsync)
            .WithName("GetImportErrors")
            .WithSummary("Get import validation errors")
            .WithDescription("Get validation errors for an import job")
            .Produces<ImportErrorsResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/imports/preview - Preview import file without processing
        group.MapPost("/preview", PreviewImportFileAsync)
            .WithName("PreviewImportFile")
            .WithSummary("Preview import file")
            .WithDescription("Preview CSV/Excel file structure and get suggested column mappings")
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<ImportPreviewResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .DisableAntiforgery();

        return endpoints;
    }

    /// <summary>
    /// Starts a new contact import job from uploaded file
    /// </summary>
    private static async Task<IResult> StartContactImportAsync(
        IFormFile file,
        [FromServices] IContactImportService importService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            // Validate file
            var validationResult = ValidateUploadedFile(file);
            if (!validationResult.IsValid)
                return Results.BadRequest(new { error = validationResult.ErrorMessage });

            // Start import job
            var importJob = await importService.StartImportAsync(
                tenantId.Value, 
                userId.Value, 
                userName ?? "Unknown", 
                file, 
                cancellationToken);

            var response = new ImportJobResponse
            {
                JobId = importJob.Id.ToString("N"),
                Status = importJob.Status,
                TotalRows = importJob.TotalRows,
                CreatedAt = importJob.CreatedAt
            };

            return Results.Accepted($"/api/imports/{response.JobId}", response);
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
            return Results.Problem($"An error occurred while starting the import: {ex.Message}", statusCode: 500);
        }
    }

    /// <summary>
    /// Gets the status and progress of an import job
    /// </summary>
    private static async Task<IResult> GetImportJobStatusAsync(
        string jobId,
        [FromServices] IContactImportService importService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            if (!Guid.TryParse(jobId, out var jobGuid))
                return Results.BadRequest(new { error = "Invalid job ID format" });

            var jobStatus = await importService.GetImportJobStatusAsync(tenantId.Value, jobGuid);
            if (jobStatus == null)
                return Results.NotFound();

            return Results.Ok(jobStatus);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"An error occurred while retrieving import status: {ex.Message}", statusCode: 500);
        }
    }

    /// <summary>
    /// Streams real-time import progress via Server-Sent Events
    /// </summary>
    private static async Task StreamImportProgressAsync(
        string jobId,
        [FromServices] IContactImportService importService,
        ClaimsPrincipal user,
        HttpContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
            {
                context.Response.StatusCode = 401;
                return;
            }

            if (!Guid.TryParse(jobId, out var jobGuid))
            {
                context.Response.StatusCode = 400;
                await context.Response.WriteAsync("Invalid job ID format");
                return;
            }

            // Verify job exists and user has access
            var jobStatus = await importService.GetImportJobStatusAsync(tenantId.Value, jobGuid);
            if (jobStatus == null)
            {
                context.Response.StatusCode = 404;
                return;
            }

            // Set SSE headers
            context.Response.Headers.Add("Content-Type", "text/event-stream");
            context.Response.Headers.Add("Cache-Control", "no-cache");
            context.Response.Headers.Add("Connection", "keep-alive");
            context.Response.Headers.Add("Access-Control-Allow-Origin", "*");

            // Stream progress events
            await importService.StreamImportProgressAsync(
                tenantId.Value, 
                jobGuid, 
                context.Response, 
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected, this is normal
        }
        catch (Exception ex)
        {
            try
            {
                var errorEvent = new ImportProgressEvent
                {
                    EventType = "error",
                    JobStatus = new ImportJobStatusDto
                    {
                        JobId = jobId,
                        Status = ImportJobStatus.Failed,
                        Progress = 0,
                        ErrorMessage = ex.Message,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                var eventData = JsonSerializer.Serialize(errorEvent);
                await context.Response.WriteAsync($"event: error\ndata: {eventData}\n\n");
                await context.Response.Body.FlushAsync();
            }
            catch
            {
                // Ignore errors when writing error response
            }
        }
    }

    /// <summary>
    /// Gets validation errors for an import job
    /// </summary>
    private static async Task<IResult> GetImportErrorsAsync(
        string jobId,
        [FromServices] IContactImportService importService,
        ClaimsPrincipal user,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            if (!Guid.TryParse(jobId, out var jobGuid))
                return Results.BadRequest(new { error = "Invalid job ID format" });

            var errorsResponse = await importService.GetImportErrorsAsync(tenantId.Value, jobGuid, limit);
            if (errorsResponse == null)
                return Results.NotFound();

            return Results.Ok(errorsResponse);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception ex)
        {
            return Results.Problem($"An error occurred while retrieving import errors: {ex.Message}", statusCode: 500);
        }
    }

    /// <summary>
    /// Previews import file structure without processing
    /// </summary>
    private static async Task<IResult> PreviewImportFileAsync(
        IFormFile file,
        [FromServices] IContactImportService importService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            // Validate file
            var validationResult = ValidateUploadedFile(file);
            if (!validationResult.IsValid)
                return Results.BadRequest(new { error = validationResult.ErrorMessage });

            var preview = await importService.PreviewImportFileAsync(file, cancellationToken);
            return Results.Ok(preview);
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
            return Results.Problem($"An error occurred while previewing the file: {ex.Message}", statusCode: 500);
        }
    }

    /// <summary>
    /// Validates uploaded file size, type, and basic constraints
    /// </summary>
    private static (bool IsValid, string? ErrorMessage) ValidateUploadedFile(IFormFile file)
    {
        const long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
        var allowedExtensions = new[] { ".csv", ".xlsx", ".xls" };
        var allowedContentTypes = new[] { 
            "text/csv", 
            "application/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        };

        if (file == null || file.Length == 0)
            return (false, "File is required and cannot be empty");

        if (file.Length > MAX_FILE_SIZE)
            return (false, $"File size cannot exceed {MAX_FILE_SIZE / (1024 * 1024)}MB");

        var fileExtension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(fileExtension) || !allowedExtensions.Contains(fileExtension))
            return (false, "File must be a CSV or Excel file (.csv, .xlsx, .xls)");

        if (!string.IsNullOrEmpty(file.ContentType) && !allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            return (false, "Invalid file content type");

        return (true, null);
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