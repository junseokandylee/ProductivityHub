using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Pre-compiled EF Core queries for maximum performance on frequently executed operations
/// These queries are compiled once at startup and cached for the lifetime of the application
/// </summary>
public static class CompiledQueries
{
    #region Contact Queries
    
    /// <summary>
    /// Get a single contact with tags by tenant and ID
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Guid, Task<Contact?>> GetContactWithTags =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, Guid contactId) =>
            context.Contacts
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.Id == contactId && c.DeletedAt == null)
                .FirstOrDefault());

    /// <summary>
    /// Get contacts by tenant with optimized pagination (keyset)
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, DateTime, Guid, int, IAsyncEnumerable<Contact>> GetContactsWithKeysetPagination =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, DateTime afterUpdatedAt, Guid afterId, int limit) =>
            context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
                .Where(c => c.UpdatedAt < afterUpdatedAt || (c.UpdatedAt == afterUpdatedAt && c.Id.CompareTo(afterId) < 0))
                .OrderByDescending(c => c.UpdatedAt)
                .ThenByDescending(c => c.Id)
                .Take(limit));

    /// <summary>
    /// Get contacts by tenant with active filter
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, bool, int, int, IAsyncEnumerable<Contact>> GetActiveContactsPaginated =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, bool isActive, int skip, int take) =>
            context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.IsActive == isActive && c.DeletedAt == null)
                .OrderByDescending(c => c.UpdatedAt)
                .ThenByDescending(c => c.Id)
                .Skip(skip)
                .Take(take));

    /// <summary>
    /// Search contacts by name with trigram matching
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, string, int, IAsyncEnumerable<Contact>> SearchContactsByName =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, string searchTerm, int limit) =>
            context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
                .Where(c => EF.Functions.ILike(c.FullName, $"%{searchTerm}%"))
                .OrderByDescending(c => c.UpdatedAt)
                .Take(limit));

    /// <summary>
    /// Find contact by phone hash for deduplication
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, byte[], Task<Contact?>> FindContactByPhoneHash =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, byte[] phoneHash) =>
            context.Contacts
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.PhoneHash != null && c.PhoneHash.SequenceEqual(phoneHash) && c.DeletedAt == null)
                .FirstOrDefault());

    /// <summary>
    /// Find contact by email hash for deduplication
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, byte[], Task<Contact?>> FindContactByEmailHash =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, byte[] emailHash) =>
            context.Contacts
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.EmailHash != null && c.EmailHash.SequenceEqual(emailHash) && c.DeletedAt == null)
                .FirstOrDefault());

    /// <summary>
    /// Find contact by Kakao ID hash for deduplication
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, byte[], Task<Contact?>> FindContactByKakaoHash =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, byte[] kakaoHash) =>
            context.Contacts
                .AsNoTracking()
                .Where(c => c.TenantId == tenantId && c.KakaoIdHash != null && c.KakaoIdHash.SequenceEqual(kakaoHash) && c.DeletedAt == null)
                .FirstOrDefault());

    #endregion

    #region Tag-Based Queries
    
    /// <summary>
    /// Get contacts by tag ID with pagination
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Guid, int, int, IAsyncEnumerable<Contact>> GetContactsByTag =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, Guid tagId, int skip, int take) =>
            context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
                .Where(c => c.ContactTags.Any(ct => ct.TagId == tagId))
                .OrderByDescending(c => c.UpdatedAt)
                .Skip(skip)
                .Take(take));

    /// <summary>
    /// Get contacts by multiple tag IDs (intersection)
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, IEnumerable<Guid>, int, IAsyncEnumerable<Contact>> GetContactsByTags =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, IEnumerable<Guid> tagIds, int limit) =>
            context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
                .Where(c => c.ContactTags.Any(ct => tagIds.Contains(ct.TagId)))
                .OrderByDescending(c => c.UpdatedAt)
                .Take(limit));

    #endregion

    #region Count and Statistics Queries

    /// <summary>
    /// Get total contact count for tenant
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Task<int>> GetContactCount =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId) =>
            context.Contacts
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null)
                .Count());

    /// <summary>
    /// Get active contact count for tenant
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Task<int>> GetActiveContactCount =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId) =>
            context.Contacts
                .Where(c => c.TenantId == tenantId && c.IsActive && c.DeletedAt == null)
                .Count());

    /// <summary>
    /// Get contacts with PII count for statistics
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Task<int>> GetContactsWithPhone =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId) =>
            context.Contacts
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null && c.PhoneHash != null)
                .Count());

    public static readonly Func<ApplicationDbContext, Guid, Task<int>> GetContactsWithEmail =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId) =>
            context.Contacts
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null && c.EmailHash != null)
                .Count());

    public static readonly Func<ApplicationDbContext, Guid, Task<int>> GetContactsWithKakao =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId) =>
            context.Contacts
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null && c.KakaoIdHash != null)
                .Count());

    #endregion

    #region Contact History Queries

    /// <summary>
    /// Get contact history with pagination
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Guid, int, int, IAsyncEnumerable<ContactHistory>> GetContactHistory =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, Guid contactId, int skip, int take) =>
            context.ContactHistory
                .AsNoTracking()
                .Where(ch => ch.TenantId == tenantId && ch.ContactId == contactId)
                .OrderByDescending(ch => ch.OccurredAt)
                .Skip(skip)
                .Take(take));

    /// <summary>
    /// Get contact history by type
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Guid, string, int, IAsyncEnumerable<ContactHistory>> GetContactHistoryByType =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, Guid contactId, string type, int limit) =>
            context.ContactHistory
                .AsNoTracking()
                .Where(ch => ch.TenantId == tenantId && ch.ContactId == contactId && ch.Type == type)
                .OrderByDescending(ch => ch.OccurredAt)
                .Take(limit));

    #endregion

    #region Bulk Operation Queries

    /// <summary>
    /// Get contacts by IDs for bulk operations
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, IEnumerable<Guid>, Task<List<Contact>>> GetContactsByIds =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, IEnumerable<Guid> contactIds) =>
            context.Contacts
                .Where(c => c.TenantId == tenantId && contactIds.Contains(c.Id) && c.DeletedAt == null)
                .OrderBy(c => c.Id)
                .ToList());

    /// <summary>
    /// Check if contact exists for tenant
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Guid, Task<bool>> ContactExists =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, Guid contactId) =>
            context.Contacts
                .Any(c => c.TenantId == tenantId && c.Id == contactId && c.DeletedAt == null));

    #endregion

    #region Tag Queries

    /// <summary>
    /// Get all tags for tenant
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, Task<List<Tag>>> GetTagsForTenant =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId) =>
            context.Tags
                .AsNoTracking()
                .Where(t => t.TenantId == tenantId)
                .OrderBy(t => t.Name)
                .ToList());

    /// <summary>
    /// Get tags by IDs for tenant
    /// </summary>
    public static readonly Func<ApplicationDbContext, Guid, IEnumerable<Guid>, Task<List<Tag>>> GetTagsByIds =
        EF.CompileAsyncQuery((ApplicationDbContext context, Guid tenantId, IEnumerable<Guid> tagIds) =>
            context.Tags
                .AsNoTracking()
                .Where(t => t.TenantId == tenantId && tagIds.Contains(t.Id))
                .OrderBy(t => t.Name)
                .ToList());

    #endregion
}