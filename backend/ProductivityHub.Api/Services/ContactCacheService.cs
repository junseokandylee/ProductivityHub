using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Services;

public class ContactCacheService : IContactCacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<ContactCacheService> _logger;
    
    // Cache key prefixes for different data types
    private const string ContactPrefix = "contact";
    private const string SearchPrefix = "search";
    private const string TagPrefix = "tag";
    private const string StatsPrefix = "stats";
    
    // Default cache expiration times optimized for contact management workload
    private static readonly TimeSpan DefaultContactExpiry = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan DefaultSearchExpiry = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan DefaultTagExpiry = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan DefaultStatsExpiry = TimeSpan.FromMinutes(10);
    
    private readonly JsonSerializerOptions _jsonOptions;
    
    public ContactCacheService(IDistributedCache cache, ILogger<ContactCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
        
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
    }
    
    public async Task<ContactDto?> GetContactAsync(Guid tenantId, Guid contactId)
    {
        try
        {
            var key = BuildContactKey(tenantId, contactId);
            var cached = await _cache.GetStringAsync(key);
            
            if (cached == null)
                return null;
                
            return JsonSerializer.Deserialize<ContactDto>(cached, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get contact from cache: {TenantId}/{ContactId}", tenantId, contactId);
            return null;
        }
    }
    
    public async Task SetContactAsync(Guid tenantId, ContactDto contact, TimeSpan? expiry = null)
    {
        try
        {
            var key = BuildContactKey(tenantId, contact.Id);
            var value = JsonSerializer.Serialize(contact, _jsonOptions);
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? DefaultContactExpiry
            };
            
            await _cache.SetStringAsync(key, value, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache contact: {TenantId}/{ContactId}", tenantId, contact.Id);
        }
    }
    
    public async Task RemoveContactAsync(Guid tenantId, Guid contactId)
    {
        try
        {
            var key = BuildContactKey(tenantId, contactId);
            await _cache.RemoveAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to remove contact from cache: {TenantId}/{ContactId}", tenantId, contactId);
        }
    }
    
    public async Task<ContactSearchResponse?> GetSearchResultsAsync(Guid tenantId, string searchKey)
    {
        try
        {
            var key = BuildSearchKey(tenantId, searchKey);
            var cached = await _cache.GetStringAsync(key);
            
            if (cached == null)
                return null;
                
            return JsonSerializer.Deserialize<ContactSearchResponse>(cached, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get search results from cache: {TenantId}/{SearchKey}", tenantId, searchKey);
            return null;
        }
    }
    
    public async Task SetSearchResultsAsync(Guid tenantId, string searchKey, ContactSearchResponse results, TimeSpan? expiry = null)
    {
        try
        {
            var key = BuildSearchKey(tenantId, searchKey);
            var value = JsonSerializer.Serialize(results, _jsonOptions);
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? DefaultSearchExpiry
            };
            
            await _cache.SetStringAsync(key, value, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache search results: {TenantId}/{SearchKey}", tenantId, searchKey);
        }
    }
    
    public async Task InvalidateSearchCacheAsync(Guid tenantId)
    {
        try
        {
            // Note: Redis doesn't have a built-in pattern delete, so we'd need to implement
            // a separate mechanism to track keys or use Redis-specific commands
            // For now, this is a placeholder for when we upgrade to IConnectionMultiplexer
            _logger.LogInformation("Search cache invalidation requested for tenant: {TenantId}", tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate search cache: {TenantId}", tenantId);
        }
    }
    
    public async Task<List<ContactDto>?> GetContactsByTagAsync(Guid tenantId, Guid tagId)
    {
        try
        {
            var key = BuildTagKey(tenantId, tagId);
            var cached = await _cache.GetStringAsync(key);
            
            if (cached == null)
                return null;
                
            return JsonSerializer.Deserialize<List<ContactDto>>(cached, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get contacts by tag from cache: {TenantId}/{TagId}", tenantId, tagId);
            return null;
        }
    }
    
    public async Task SetContactsByTagAsync(Guid tenantId, Guid tagId, List<ContactDto> contacts, TimeSpan? expiry = null)
    {
        try
        {
            var key = BuildTagKey(tenantId, tagId);
            var value = JsonSerializer.Serialize(contacts, _jsonOptions);
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? DefaultTagExpiry
            };
            
            await _cache.SetStringAsync(key, value, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache contacts by tag: {TenantId}/{TagId}", tenantId, tagId);
        }
    }
    
    public async Task InvalidateTagCacheAsync(Guid tenantId, Guid tagId)
    {
        try
        {
            var key = BuildTagKey(tenantId, tagId);
            await _cache.RemoveAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate tag cache: {TenantId}/{TagId}", tenantId, tagId);
        }
    }
    
    public async Task RemoveContactsAsync(Guid tenantId, IEnumerable<Guid> contactIds)
    {
        var tasks = contactIds.Select(id => RemoveContactAsync(tenantId, id));
        await Task.WhenAll(tasks);
    }
    
    public async Task InvalidateAllContactCacheAsync(Guid tenantId)
    {
        try
        {
            // Invalidate search and stats caches when contacts change
            await InvalidateSearchCacheAsync(tenantId);
            await InvalidateContactStatsAsync(tenantId);
            
            _logger.LogInformation("All contact cache invalidated for tenant: {TenantId}", tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate all contact cache: {TenantId}", tenantId);
        }
    }
    
    public async Task<object?> GetContactStatsAsync(Guid tenantId)
    {
        try
        {
            var key = BuildStatsKey(tenantId);
            var cached = await _cache.GetStringAsync(key);
            
            if (cached == null)
                return null;
                
            return JsonSerializer.Deserialize<object>(cached, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get contact stats from cache: {TenantId}", tenantId);
            return null;
        }
    }
    
    public async Task SetContactStatsAsync(Guid tenantId, object stats, TimeSpan? expiry = null)
    {
        try
        {
            var key = BuildStatsKey(tenantId);
            var value = JsonSerializer.Serialize(stats, _jsonOptions);
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? DefaultStatsExpiry
            };
            
            await _cache.SetStringAsync(key, value, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache contact stats: {TenantId}", tenantId);
        }
    }
    
    public async Task InvalidateContactStatsAsync(Guid tenantId)
    {
        try
        {
            var key = BuildStatsKey(tenantId);
            await _cache.RemoveAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate contact stats cache: {TenantId}", tenantId);
        }
    }
    
    // Private helper methods for building cache keys
    private static string BuildContactKey(Guid tenantId, Guid contactId)
        => $"{ContactPrefix}:{tenantId}:{contactId}";
    
    private static string BuildSearchKey(Guid tenantId, string searchKey)
        => $"{SearchPrefix}:{tenantId}:{searchKey}";
    
    private static string BuildTagKey(Guid tenantId, Guid tagId)
        => $"{TagPrefix}:{tenantId}:{tagId}";
    
    private static string BuildStatsKey(Guid tenantId)
        => $"{StatsPrefix}:{tenantId}";
}