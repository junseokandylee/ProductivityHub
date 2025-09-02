using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.DTOs;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Endpoints;

/// <summary>
/// Minimal API endpoints for contact management
/// </summary>
public static class ContactsEndpoint
{
    /// <summary>
    /// Maps contact endpoints to the application
    /// </summary>
    public static IEndpointRouteBuilder MapContactEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/contacts")
            .WithTags("Contacts")
            .RequireAuthorization();

        // GET /api/contacts/{id}
        group.MapGet("/{id:guid}", GetContactAsync)
            .WithName("GetContact")
            .WithSummary("Get contact by ID")
            .WithDescription("Returns a single contact with decrypted PII data")
            .Produces<ContactDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/contacts
        group.MapGet("/", SearchContactsAsync)
            .WithName("SearchContacts")
            .WithSummary("Search contacts")
            .WithDescription("Search contacts with filtering, pagination, and sorting")
            .Produces<ContactSearchResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/contacts
        group.MapPost("/", CreateContactAsync)
            .WithName("CreateContact")
            .WithSummary("Create contact")
            .WithDescription("Create a new contact with encrypted PII data")
            .Produces<ContactDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/contacts/{id}
        group.MapPut("/{id:guid}", UpdateContactAsync)
            .WithName("UpdateContact")
            .WithSummary("Update contact")
            .WithDescription("Update an existing contact with encrypted PII data")
            .Produces<ContactDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/contacts/{id}
        group.MapDelete("/{id:guid}", DeleteContactAsync)
            .WithName("DeleteContact")
            .WithSummary("Delete contact")
            .WithDescription("Delete a contact and log the action")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/contacts/{id}/history
        group.MapGet("/{id:guid}/history", GetContactHistoryAsync)
            .WithName("GetContactHistory")
            .WithSummary("Get contact history")
            .WithDescription("Get audit history for a contact")
            .Produces<List<ContactHistoryDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return endpoints;
    }

    /// <summary>
    /// Gets a single contact by ID
    /// </summary>
    private static async Task<IResult> GetContactAsync(
        Guid id,
        [FromServices] IContactService contactService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var contact = await contactService.GetContactAsync(tenantId.Value, id);
            if (contact == null)
                return Results.NotFound();

            return Results.Ok(contact);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while retrieving the contact", statusCode: 500);
        }
    }

    /// <summary>
    /// Searches contacts with filtering, pagination, and sorting
    /// </summary>
    private static async Task<IResult> SearchContactsAsync(
        [FromServices] IContactService contactService,
        ClaimsPrincipal user,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] Guid[]? tagIds = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string sortBy = "CreatedAt",
        [FromQuery] string sortOrder = "desc",
        [FromQuery] DateTime? afterUpdatedAt = null,
        [FromQuery] Guid? afterId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var request = new ContactSearchRequest
            {
                Search = search,
                IsActive = isActive,
                Page = page,
                Limit = limit,
                SortBy = sortBy,
                SortOrder = sortOrder,
                TagIds = tagIds?.ToList() ?? new List<Guid>(),
                AfterUpdatedAt = afterUpdatedAt,
                AfterId = afterId
            };

            var result = await contactService.SearchContactsAsync(tenantId.Value, request);
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while searching contacts", statusCode: 500);
        }
    }

    /// <summary>
    /// Creates a new contact
    /// </summary>
    private static async Task<IResult> CreateContactAsync(
        [FromBody] CreateContactRequest request,
        [FromServices] IContactService contactService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var contact = await contactService.CreateContactAsync(
                tenantId.Value, 
                request, 
                userId.Value, 
                userName ?? "Unknown");

            return Results.Created($"/api/contacts/{contact.Id}", contact);
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
            return Results.Problem("An error occurred while creating the contact", statusCode: 500);
        }
    }

    /// <summary>
    /// Updates an existing contact
    /// </summary>
    private static async Task<IResult> UpdateContactAsync(
        Guid id,
        [FromBody] UpdateContactRequest request,
        [FromServices] IContactService contactService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var contact = await contactService.UpdateContactAsync(
                tenantId.Value, 
                id, 
                request, 
                userId.Value, 
                userName ?? "Unknown");

            if (contact == null)
                return Results.NotFound();

            return Results.Ok(contact);
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
            return Results.Problem("An error occurred while updating the contact", statusCode: 500);
        }
    }

    /// <summary>
    /// Deletes a contact
    /// </summary>
    private static async Task<IResult> DeleteContactAsync(
        Guid id,
        [FromServices] IContactService contactService,
        ClaimsPrincipal user,
        CancellationToken cancellationToken)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var success = await contactService.DeleteContactAsync(
                tenantId.Value, 
                id, 
                userId.Value, 
                userName ?? "Unknown");

            if (!success)
                return Results.NotFound();

            return Results.NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while deleting the contact", statusCode: 500);
        }
    }

    /// <summary>
    /// Gets contact history/audit log
    /// </summary>
    private static async Task<IResult> GetContactHistoryAsync(
        Guid id,
        [FromServices] IContactService contactService,
        ClaimsPrincipal user,
        [FromQuery] string? type = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (tenantId, userId, userName) = ExtractUserInfo(user);
            if (!tenantId.HasValue || !userId.HasValue)
                return Results.Unauthorized();

            var request = new ContactHistorySearchRequest
            {
                ContactId = id,
                Type = type,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                Limit = limit
            };

            var history = await contactService.GetContactHistoryAsync(tenantId.Value, request);
            return Results.Ok(history);
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
        catch (Exception)
        {
            return Results.Problem("An error occurred while retrieving contact history", statusCode: 500);
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