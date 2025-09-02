using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Services;

public interface IContactCacheService
{
    // Hot data caching for frequently accessed contacts
    Task<ContactDto?> GetContactAsync(Guid tenantId, Guid contactId);
    Task SetContactAsync(Guid tenantId, ContactDto contact, TimeSpan? expiry = null);
    Task RemoveContactAsync(Guid tenantId, Guid contactId);
    
    // Search result caching for pagination performance
    Task<ContactSearchResponse?> GetSearchResultsAsync(Guid tenantId, string searchKey);
    Task SetSearchResultsAsync(Guid tenantId, string searchKey, ContactSearchResponse results, TimeSpan? expiry = null);
    Task InvalidateSearchCacheAsync(Guid tenantId);
    
    // Tag-based caching for tag filters
    Task<List<ContactDto>?> GetContactsByTagAsync(Guid tenantId, Guid tagId);
    Task SetContactsByTagAsync(Guid tenantId, Guid tagId, List<ContactDto> contacts, TimeSpan? expiry = null);
    Task InvalidateTagCacheAsync(Guid tenantId, Guid tagId);
    
    // Bulk operations support
    Task RemoveContactsAsync(Guid tenantId, IEnumerable<Guid> contactIds);
    Task InvalidateAllContactCacheAsync(Guid tenantId);
    
    // Statistics caching for dashboard performance
    Task<object?> GetContactStatsAsync(Guid tenantId);
    Task SetContactStatsAsync(Guid tenantId, object stats, TimeSpan? expiry = null);
    Task InvalidateContactStatsAsync(Guid tenantId);
}