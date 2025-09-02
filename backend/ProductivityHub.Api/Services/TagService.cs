using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public interface ITagService
{
    Task<List<TagDto>> GetTagsAsync(Guid tenantId);
    Task<TagDto?> GetTagAsync(Guid tenantId, Guid tagId);
    Task<TagDto> CreateTagAsync(Guid tenantId, CreateTagRequest request);
    Task<TagDto?> UpdateTagAsync(Guid tenantId, Guid tagId, UpdateTagRequest request);
    Task<bool> DeleteTagAsync(Guid tenantId, Guid tagId);
    
    // Contact tag assignment methods
    Task<bool> AssignTagToContactAsync(Guid tenantId, Guid contactId, Guid tagId);
    Task<bool> RemoveTagFromContactAsync(Guid tenantId, Guid contactId, Guid tagId);
    Task<BulkTagOperationResponse> BulkTagOperationAsync(Guid tenantId, BulkTagOperationRequest request);
}

public class TagService : ITagService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TagService> _logger;

    public TagService(ApplicationDbContext context, ILogger<TagService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<TagDto>> GetTagsAsync(Guid tenantId)
    {
        var tags = await _context.Tags
            .Where(t => t.TenantId == tenantId)
            .Select(t => new TagDto
            {
                Id = t.Id,
                Name = t.Name,
                Color = t.Color,
                Description = t.Description,
                ContactCount = t.ContactTags.Count,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .OrderBy(t => t.Name)
            .ToListAsync();

        return tags;
    }

    public async Task<TagDto?> GetTagAsync(Guid tenantId, Guid tagId)
    {
        var tag = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Id == tagId)
            .Select(t => new TagDto
            {
                Id = t.Id,
                Name = t.Name,
                Color = t.Color,
                Description = t.Description,
                ContactCount = t.ContactTags.Count,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .FirstOrDefaultAsync();

        return tag;
    }

    public async Task<TagDto> CreateTagAsync(Guid tenantId, CreateTagRequest request)
    {
        // Check if tag name already exists for this tenant
        var existingTag = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Name == request.Name.Trim())
            .FirstOrDefaultAsync();

        if (existingTag != null)
        {
            throw new InvalidOperationException($"A tag with name '{request.Name}' already exists.");
        }

        var tag = new Tag
        {
            TenantId = tenantId,
            Name = request.Name.Trim(),
            Color = request.Color,
            Description = request.Description?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();

        return new TagDto
        {
            Id = tag.Id,
            Name = tag.Name,
            Color = tag.Color,
            Description = tag.Description,
            ContactCount = 0, // New tag has no contacts
            CreatedAt = tag.CreatedAt,
            UpdatedAt = tag.UpdatedAt
        };
    }

    public async Task<TagDto?> UpdateTagAsync(Guid tenantId, Guid tagId, UpdateTagRequest request)
    {
        var tag = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Id == tagId)
            .FirstOrDefaultAsync();

        if (tag == null)
            return null;

        // Check if new name already exists for another tag
        var existingTag = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Name == request.Name.Trim() && t.Id != tagId)
            .FirstOrDefaultAsync();

        if (existingTag != null)
        {
            throw new InvalidOperationException($"A tag with name '{request.Name}' already exists.");
        }

        tag.Name = request.Name.Trim();
        tag.Color = request.Color;
        tag.Description = request.Description?.Trim();
        tag.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Get contact count
        var contactCount = await _context.ContactTags
            .Where(ct => ct.TagId == tagId)
            .CountAsync();

        return new TagDto
        {
            Id = tag.Id,
            Name = tag.Name,
            Color = tag.Color,
            Description = tag.Description,
            ContactCount = contactCount,
            CreatedAt = tag.CreatedAt,
            UpdatedAt = tag.UpdatedAt
        };
    }

    public async Task<bool> DeleteTagAsync(Guid tenantId, Guid tagId)
    {
        var tag = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Id == tagId)
            .FirstOrDefaultAsync();

        if (tag == null)
            return false;

        // Check if tag is in use by any contacts
        var isInUse = await _context.ContactTags
            .Where(ct => ct.TagId == tagId)
            .AnyAsync();

        if (isInUse)
        {
            throw new InvalidOperationException("Cannot delete tag because it is in use by one or more contacts.");
        }

        _context.Tags.Remove(tag);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> AssignTagToContactAsync(Guid tenantId, Guid contactId, Guid tagId)
    {
        // Check if contact exists and belongs to tenant
        var contactExists = await _context.Contacts
            .Where(c => c.TenantId == tenantId && c.Id == contactId)
            .AnyAsync();

        if (!contactExists)
        {
            throw new ArgumentException("Contact not found or does not belong to tenant");
        }

        // Check if tag exists and belongs to tenant
        var tagExists = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Id == tagId)
            .AnyAsync();

        if (!tagExists)
        {
            throw new ArgumentException("Tag not found or does not belong to tenant");
        }

        // Check if assignment already exists
        var existingAssignment = await _context.ContactTags
            .Where(ct => ct.ContactId == contactId && ct.TagId == tagId && ct.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (existingAssignment != null)
        {
            return false; // Already assigned
        }

        // Create new assignment
        var contactTag = new ContactTag
        {
            ContactId = contactId,
            TagId = tagId,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ContactTags.Add(contactTag);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RemoveTagFromContactAsync(Guid tenantId, Guid contactId, Guid tagId)
    {
        var contactTag = await _context.ContactTags
            .Where(ct => ct.ContactId == contactId && ct.TagId == tagId && ct.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (contactTag == null)
        {
            return false; // Not assigned
        }

        _context.ContactTags.Remove(contactTag);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<BulkTagOperationResponse> BulkTagOperationAsync(Guid tenantId, BulkTagOperationRequest request)
    {
        var response = new BulkTagOperationResponse();
        var errors = new List<string>();

        // Validate action
        if (request.Action != "add" && request.Action != "remove")
        {
            throw new ArgumentException("Action must be 'add' or 'remove'");
        }

        // Check if tag exists and belongs to tenant
        var tagExists = await _context.Tags
            .Where(t => t.TenantId == tenantId && t.Id == request.TagId)
            .AnyAsync();

        if (!tagExists)
        {
            throw new ArgumentException("Tag not found or does not belong to tenant");
        }

        // Validate that all contacts exist and belong to tenant
        var validContactIds = await _context.Contacts
            .Where(c => c.TenantId == tenantId && request.ContactIds.Contains(c.Id))
            .Select(c => c.Id)
            .ToListAsync();

        var invalidContactIds = request.ContactIds.Except(validContactIds).ToList();
        if (invalidContactIds.Count > 0)
        {
            errors.Add($"Invalid contact IDs: {string.Join(", ", invalidContactIds)}");
        }

        response.ProcessedContacts = validContactIds.Count;

        if (request.Action == "add")
        {
            // Get existing assignments to avoid duplicates
            var existingAssignments = await _context.ContactTags
                .Where(ct => ct.TagId == request.TagId && validContactIds.Contains(ct.ContactId) && ct.TenantId == tenantId)
                .Select(ct => ct.ContactId)
                .ToListAsync();

            var contactsToAdd = validContactIds.Except(existingAssignments).ToList();

            // Bulk insert new assignments
            var newAssignments = contactsToAdd.Select(contactId => new ContactTag
            {
                ContactId = contactId,
                TagId = request.TagId,
                TenantId = tenantId,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            if (newAssignments.Count > 0)
            {
                _context.ContactTags.AddRange(newAssignments);
                await _context.SaveChangesAsync();
            }

            response.SuccessfulOperations = newAssignments.Count;
            response.FailedOperations = existingAssignments.Count; // Already assigned
            
            if (existingAssignments.Count > 0)
            {
                errors.Add($"{existingAssignments.Count} contacts already had this tag assigned");
            }
        }
        else // remove
        {
            // Find assignments to remove
            var assignmentsToRemove = await _context.ContactTags
                .Where(ct => ct.TagId == request.TagId && validContactIds.Contains(ct.ContactId) && ct.TenantId == tenantId)
                .ToListAsync();

            if (assignmentsToRemove.Count > 0)
            {
                _context.ContactTags.RemoveRange(assignmentsToRemove);
                await _context.SaveChangesAsync();
            }

            response.SuccessfulOperations = assignmentsToRemove.Count;
            response.FailedOperations = validContactIds.Count - assignmentsToRemove.Count; // Not assigned

            if (response.FailedOperations > 0)
            {
                errors.Add($"{response.FailedOperations} contacts did not have this tag assigned");
            }
        }

        response.Errors = errors;
        return response;
    }
}