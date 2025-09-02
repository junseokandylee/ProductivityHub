using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Services;

public interface IBulkOperationsService
{
    Task<BulkActionResponse> BulkTagOperationAsync(Guid tenantId, BulkTagActionRequest request, Guid userId, string userName);
    Task<BulkActionResponse> BulkDeleteOperationAsync(Guid tenantId, BulkDeleteActionRequest request, Guid userId, string userName);
    Task<BulkActionResponse> BulkMergeOperationAsync(Guid tenantId, BulkMergeActionRequest request, Guid userId, string userName);
    Task<BulkOperationStatus> GetBulkOperationStatusAsync(string jobId);
}

public class BulkOperationsService : IBulkOperationsService
{
    private readonly ApplicationDbContext _context;
    private readonly ISelectionTokenService _selectionTokenService;
    private readonly IContactService _contactService;
    private readonly ILogger<BulkOperationsService> _logger;
    private const int ChunkSize = 1000;
    private const int AsyncThreshold = 10000; // Operations larger than this run async

    public BulkOperationsService(
        ApplicationDbContext context,
        ISelectionTokenService selectionTokenService,
        IContactService contactService,
        ILogger<BulkOperationsService> logger)
    {
        _context = context;
        _selectionTokenService = selectionTokenService;
        _contactService = contactService;
        _logger = logger;
    }

    public async Task<BulkActionResponse> BulkTagOperationAsync(Guid tenantId, BulkTagActionRequest request, Guid userId, string userName)
    {
        if (request.ContactIds == null && string.IsNullOrEmpty(request.SelectionToken))
            throw new ValidationException("Either ContactIds or SelectionToken must be provided");

        var contactIds = await ResolveContactIdsAsync(tenantId, request);
        
        if (contactIds.Count == 0)
        {
            return new BulkActionResponse
            {
                TotalCount = 0,
                ProcessedCount = 0,
                SuccessCount = 0,
                FailedCount = 0
            };
        }

        if (contactIds.Count > AsyncThreshold)
        {
            return await StartAsyncBulkTagOperation(tenantId, request, contactIds, userId, userName);
        }

        return await ExecuteBulkTagOperationAsync(tenantId, request.TagId, request.Action, contactIds, userId, userName);
    }

    public async Task<BulkActionResponse> BulkDeleteOperationAsync(Guid tenantId, BulkDeleteActionRequest request, Guid userId, string userName)
    {
        if (request.ContactIds == null && string.IsNullOrEmpty(request.SelectionToken))
            throw new ValidationException("Either ContactIds or SelectionToken must be provided");

        var contactIds = await ResolveContactIdsAsync(tenantId, request);
        
        if (contactIds.Count == 0)
        {
            return new BulkActionResponse
            {
                TotalCount = 0,
                ProcessedCount = 0,
                SuccessCount = 0,
                FailedCount = 0
            };
        }

        if (contactIds.Count > AsyncThreshold)
        {
            return await StartAsyncBulkDeleteOperation(tenantId, request, contactIds, userId, userName);
        }

        return await ExecuteBulkDeleteOperationAsync(tenantId, contactIds, request.Reason, userId, userName);
    }

    public async Task<BulkActionResponse> BulkMergeOperationAsync(Guid tenantId, BulkMergeActionRequest request, Guid userId, string userName)
    {
        if (request.ContactIds == null && string.IsNullOrEmpty(request.SelectionToken))
            throw new ValidationException("Either ContactIds or SelectionToken must be provided");

        var contactIds = await ResolveContactIdsAsync(tenantId, request);
        
        if (contactIds.Count < 2)
        {
            throw new ValidationException("At least 2 contacts are required for merge operation");
        }

        // Always run merge operations synchronously due to complexity
        return await ExecuteBulkMergeOperationAsync(tenantId, request.PrimarContactId, contactIds, 
            request.PreserveTags, request.PreserveHistory, userId, userName);
    }

    public Task<BulkOperationStatus> GetBulkOperationStatusAsync(string jobId)
    {
        // In a real implementation, this would query a job store or cache
        // For now, return a placeholder
        return Task.FromResult(new BulkOperationStatus
        {
            JobId = jobId,
            Status = "completed",
            OperationType = "unknown"
        });
    }

    private async Task<List<Guid>> ResolveContactIdsAsync(Guid tenantId, BulkActionRequest request)
    {
        if (request.ContactIds?.Any() == true)
        {
            return request.ContactIds;
        }

        if (!string.IsNullOrEmpty(request.SelectionToken))
        {
            return await _selectionTokenService.ExpandSelectionTokenAsync(tenantId, request.SelectionToken);
        }

        return new List<Guid>();
    }

    private async Task<BulkActionResponse> ExecuteBulkTagOperationAsync(
        Guid tenantId, Guid tagId, string action, List<Guid> contactIds, Guid userId, string userName)
    {
        var response = new BulkActionResponse { TotalCount = contactIds.Count };
        var errors = new List<string>();
        var processedCount = 0;
        var successCount = 0;

        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // Verify tag exists and belongs to tenant
            var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == tagId && t.TenantId == tenantId);
            if (tag == null)
            {
                throw new ValidationException("Tag not found or access denied");
            }

            // Process in chunks to avoid deadlocks
            foreach (var chunk in contactIds.Chunk(ChunkSize))
            {
                try
                {
                    // Lock contacts for update
                    var contacts = await _context.Contacts
                        .Where(c => c.TenantId == tenantId && chunk.Contains(c.Id) && c.DeletedAt == null)
                        .ToListAsync();

                    processedCount += contacts.Count;

                    foreach (var contact in contacts)
                    {
                        try
                        {
                            if (action.ToLower() == "add")
                            {
                                // Add tag if not already present
                                var existingTag = await _context.ContactTags
                                    .FirstOrDefaultAsync(ct => ct.ContactId == contact.Id && ct.TagId == tagId);

                                if (existingTag == null)
                                {
                                    _context.ContactTags.Add(new ContactTag
                                    {
                                        ContactId = contact.Id,
                                        TagId = tagId,
                                        TenantId = tenantId,
                                        CreatedAt = DateTime.UtcNow
                                    });

                                    // Log history
                                    await _contactService.LogContactHistoryAsync(contact.Id, "tag_added", 
                                        $"Tag '{tag.Name}' added via bulk operation", userId, userName);
                                }
                            }
                            else if (action.ToLower() == "remove")
                            {
                                // Remove tag if present
                                var existingTags = _context.ContactTags
                                    .Where(ct => ct.ContactId == contact.Id && ct.TagId == tagId);

                                if (existingTags.Any())
                                {
                                    _context.ContactTags.RemoveRange(existingTags);

                                    // Log history
                                    await _contactService.LogContactHistoryAsync(contact.Id, "tag_removed", 
                                        $"Tag '{tag.Name}' removed via bulk operation", userId, userName);
                                }
                            }

                            successCount++;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing tag operation for contact {ContactId}", contact.Id);
                            errors.Add($"Contact {contact.Id}: {ex.Message}");
                        }
                    }

                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing chunk in bulk tag operation");
                    errors.Add($"Chunk processing error: {ex.Message}");
                }
            }

            await transaction.CommitAsync();

            response.ProcessedCount = processedCount;
            response.SuccessCount = successCount;
            response.FailedCount = processedCount - successCount;
            response.Errors = errors;

            _logger.LogInformation("Bulk tag operation completed for tenant {TenantId}: {SuccessCount}/{ProcessedCount} successful", 
                tenantId, successCount, processedCount);

            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Bulk tag operation failed for tenant {TenantId}", tenantId);
            throw;
        }
    }

    private async Task<BulkActionResponse> ExecuteBulkDeleteOperationAsync(
        Guid tenantId, List<Guid> contactIds, string? reason, Guid userId, string userName)
    {
        var response = new BulkActionResponse { TotalCount = contactIds.Count };
        var errors = new List<string>();
        var processedCount = 0;
        var successCount = 0;

        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // Process in chunks
            foreach (var chunk in contactIds.Chunk(ChunkSize))
            {
                try
                {
                    var contacts = await _context.Contacts
                        .Where(c => c.TenantId == tenantId && chunk.Contains(c.Id) && c.DeletedAt == null)
                        .ToListAsync();

                    processedCount += contacts.Count;

                    foreach (var contact in contacts)
                    {
                        try
                        {
                            // Soft delete
                            contact.DeletedAt = DateTime.UtcNow;
                            contact.IsActive = false;

                            // Log deletion
                            var description = string.IsNullOrEmpty(reason) 
                                ? "Contact deleted via bulk operation"
                                : $"Contact deleted via bulk operation. Reason: {reason}";

                            await _contactService.LogContactHistoryAsync(contact.Id, "deleted", 
                                description, userId, userName);

                            successCount++;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error deleting contact {ContactId}", contact.Id);
                            errors.Add($"Contact {contact.Id}: {ex.Message}");
                        }
                    }

                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing chunk in bulk delete operation");
                    errors.Add($"Chunk processing error: {ex.Message}");
                }
            }

            await transaction.CommitAsync();

            response.ProcessedCount = processedCount;
            response.SuccessCount = successCount;
            response.FailedCount = processedCount - successCount;
            response.Errors = errors;

            _logger.LogInformation("Bulk delete operation completed for tenant {TenantId}: {SuccessCount}/{ProcessedCount} successful", 
                tenantId, successCount, processedCount);

            return response;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Bulk delete operation failed for tenant {TenantId}", tenantId);
            throw;
        }
    }

    private async Task<BulkActionResponse> ExecuteBulkMergeOperationAsync(
        Guid tenantId, Guid primaryContactId, List<Guid> contactIds, 
        bool preserveTags, bool preserveHistory, Guid userId, string userName)
    {
        // This would integrate with existing DeduplicationService
        // For now, return a placeholder
        _logger.LogInformation("Bulk merge operation requested for tenant {TenantId} with primary contact {PrimaryContactId}", 
            tenantId, primaryContactId);

        return new BulkActionResponse
        {
            TotalCount = contactIds.Count,
            ProcessedCount = 0,
            SuccessCount = 0,
            FailedCount = 0,
            Errors = new List<string> { "Bulk merge operation not yet implemented" }
        };
    }

    private async Task<BulkActionResponse> StartAsyncBulkTagOperation(
        Guid tenantId, BulkTagActionRequest request, List<Guid> contactIds, Guid userId, string userName)
    {
        // In a real implementation, this would start a background job
        var jobId = Guid.NewGuid().ToString();
        
        _logger.LogInformation("Started async bulk tag operation {JobId} for tenant {TenantId} with {Count} contacts", 
            jobId, tenantId, contactIds.Count);

        return new BulkActionResponse
        {
            TotalCount = contactIds.Count,
            ProcessedCount = 0,
            SuccessCount = 0,
            FailedCount = 0,
            JobId = jobId,
            IsAsync = true
        };
    }

    private async Task<BulkActionResponse> StartAsyncBulkDeleteOperation(
        Guid tenantId, BulkDeleteActionRequest request, List<Guid> contactIds, Guid userId, string userName)
    {
        // In a real implementation, this would start a background job
        var jobId = Guid.NewGuid().ToString();
        
        _logger.LogInformation("Started async bulk delete operation {JobId} for tenant {TenantId} with {Count} contacts", 
            jobId, tenantId, contactIds.Count);

        return new BulkActionResponse
        {
            TotalCount = contactIds.Count,
            ProcessedCount = 0,
            SuccessCount = 0,
            FailedCount = 0,
            JobId = jobId,
            IsAsync = true
        };
    }
}