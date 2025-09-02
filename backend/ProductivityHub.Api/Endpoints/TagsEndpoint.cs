using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.DTOs;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Endpoints;

/// <summary>
/// Minimal API endpoints for tag management
/// </summary>
public static class TagsEndpoint
{
    /// <summary>
    /// Maps tag endpoints to the application
    /// </summary>
    public static IEndpointRouteBuilder MapTagEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/tags")
            .WithTags("Tags")
            .RequireAuthorization();

        // GET /api/tags
        group.MapGet("/", GetTagsAsync)
            .WithName("GetTags")
            .WithSummary("Get all tags")
            .WithDescription("Returns all tags for the tenant with contact counts")
            .Produces<List<TagDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/tags/{id}
        group.MapGet("/{id:guid}", GetTagAsync)
            .WithName("GetTag")
            .WithSummary("Get tag by ID")
            .WithDescription("Returns a single tag by ID")
            .Produces<TagDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/tags
        group.MapPost("/", CreateTagAsync)
            .WithName("CreateTag")
            .WithSummary("Create tag")
            .WithDescription("Create a new tag for organizing contacts")
            .Produces<TagDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/tags/{id}
        group.MapPut("/{id:guid}", UpdateTagAsync)
            .WithName("UpdateTag")
            .WithSummary("Update tag")
            .WithDescription("Update an existing tag")
            .Produces<TagDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/tags/{id}
        group.MapDelete("/{id:guid}", DeleteTagAsync)
            .WithName("DeleteTag")
            .WithSummary("Delete tag")
            .WithDescription("Delete a tag (only if not in use by any contacts)")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // Contact tag assignment endpoints
        var contactGroup = endpoints.MapGroup("/api/contacts")
            .WithTags("Contact Tags")
            .RequireAuthorization();

        // POST /api/contacts/{id}/tags - Assign tag to contact
        contactGroup.MapPost("/{id:guid}/tags", AssignTagToContactAsync)
            .WithName("AssignTagToContact")
            .WithSummary("Assign tag to contact")
            .WithDescription("Assign a tag to a specific contact")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized);

        // DELETE /api/contacts/{id}/tags/{tagId} - Remove tag from contact
        contactGroup.MapDelete("/{id:guid}/tags/{tagId:guid}", RemoveTagFromContactAsync)
            .WithName("RemoveTagFromContact")
            .WithSummary("Remove tag from contact")
            .WithDescription("Remove a tag from a specific contact")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/contacts/tags/bulk - Bulk tag operations
        contactGroup.MapPost("/tags/bulk", BulkTagOperationAsync)
            .WithName("ContactsBulkTagOperation")
            .WithSummary("Bulk tag operations")
            .WithDescription("Add or remove tags from multiple contacts in a single operation")
            .Produces<BulkTagOperationResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized);

        return endpoints;
    }

    /// <summary>
    /// Gets all tags for the tenant
    /// </summary>
    private static async Task<IResult> GetTagsAsync(
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var tags = await tagService.GetTagsAsync(tenantId.Value);
            return Results.Ok(tags);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while retrieving tags", statusCode: 500);
        }
    }

    /// <summary>
    /// Gets a single tag by ID
    /// </summary>
    private static async Task<IResult> GetTagAsync(
        Guid id,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var tag = await tagService.GetTagAsync(tenantId.Value, id);
            if (tag == null)
                return Results.NotFound();

            return Results.Ok(tag);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while retrieving the tag", statusCode: 500);
        }
    }

    /// <summary>
    /// Creates a new tag
    /// </summary>
    private static async Task<IResult> CreateTagAsync(
        [FromBody] CreateTagRequest request,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var tag = await tagService.CreateTagAsync(tenantId.Value, request);
            return Results.Created($"/api/tags/{tag.Id}", tag);
        }
        catch (Services.ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while creating the tag", statusCode: 500);
        }
    }

    /// <summary>
    /// Updates an existing tag
    /// </summary>
    private static async Task<IResult> UpdateTagAsync(
        Guid id,
        [FromBody] UpdateTagRequest request,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var tag = await tagService.UpdateTagAsync(tenantId.Value, id, request);
            if (tag == null)
                return Results.NotFound();

            return Results.Ok(tag);
        }
        catch (Services.ValidationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while updating the tag", statusCode: 500);
        }
    }

    /// <summary>
    /// Deletes a tag
    /// </summary>
    private static async Task<IResult> DeleteTagAsync(
        Guid id,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var success = await tagService.DeleteTagAsync(tenantId.Value, id);
            if (!success)
                return Results.NotFound();

            return Results.NoContent();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("in use"))
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while deleting the tag", statusCode: 500);
        }
    }

    /// <summary>
    /// Assigns a tag to a contact
    /// </summary>
    private static async Task<IResult> AssignTagToContactAsync(
        Guid id,
        [FromBody] AssignTagRequest request,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var success = await tagService.AssignTagToContactAsync(tenantId.Value, id, request.TagId);
            return Results.NoContent();
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while assigning the tag", statusCode: 500);
        }
    }

    /// <summary>
    /// Removes a tag from a contact
    /// </summary>
    private static async Task<IResult> RemoveTagFromContactAsync(
        Guid id,
        Guid tagId,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var success = await tagService.RemoveTagFromContactAsync(tenantId.Value, id, tagId);
            return Results.NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while removing the tag", statusCode: 500);
        }
    }

    /// <summary>
    /// Performs bulk tag operations on multiple contacts
    /// </summary>
    private static async Task<IResult> BulkTagOperationAsync(
        [FromBody] BulkTagOperationRequest request,
        [FromServices] ITagService tagService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var tenantId = ExtractTenantId(user);
            if (!tenantId.HasValue)
                return Results.Unauthorized();

            var result = await tagService.BulkTagOperationAsync(tenantId.Value, request);
            return Results.Ok(result);
        }
        catch (ArgumentException ex)
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
    /// Extracts tenant ID from JWT claims
    /// </summary>
    private static Guid? ExtractTenantId(ClaimsPrincipal user)
    {
        var tenantIdClaim = user.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
            return null;
        
        return tenantId;
    }
}