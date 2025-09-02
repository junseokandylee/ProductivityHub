using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace ProductivityHub.Api.Services;

/// <summary>
/// High-performance contact service optimized for 100K+ contacts
/// Uses compiled queries, Redis caching, and optimized database access patterns
/// </summary>
public class OptimizedContactService : IContactService
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly IContactCacheService _cacheService;
    private readonly ILogger<OptimizedContactService> _logger;

    public OptimizedContactService(
        ApplicationDbContext context, 
        IEncryptionService encryptionService,
        IContactCacheService cacheService,
        ILogger<OptimizedContactService> logger)
    {
        _context = context;
        _encryptionService = encryptionService;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<ContactDto?> GetContactAsync(Guid tenantId, Guid contactId)
    {
        // Try cache first
        var cached = await _cacheService.GetContactAsync(tenantId, contactId);
        if (cached != null)
        {
            _logger.LogDebug("Contact retrieved from cache: {ContactId}", contactId);
            return cached;
        }

        // Use compiled query for database access
        var contact = await CompiledQueries.GetContactWithTags(_context, tenantId, contactId);
        if (contact == null)
            return null;

        var dto = await MapToContactDtoAsync(contact);
        
        // Cache for future requests
        await _cacheService.SetContactAsync(tenantId, dto);
        
        return dto;
    }

    public async Task<ContactSearchResponse> SearchContactsAsync(Guid tenantId, ContactSearchRequest request)
    {
        // Generate cache key for search results
        var cacheKey = GenerateSearchCacheKey(request);
        
        // Try cache first for non-keyset pagination
        if (!request.AfterUpdatedAt.HasValue && !request.AfterId.HasValue)
        {
            var cached = await _cacheService.GetSearchResultsAsync(tenantId, cacheKey);
            if (cached != null)
            {
                _logger.LogDebug("Search results retrieved from cache: {CacheKey}", cacheKey);
                return cached;
            }
        }

        ContactSearchResponse result;

        // For keyset pagination, use optimized query
        if (request.AfterUpdatedAt.HasValue && request.AfterId.HasValue)
        {
            result = await SearchContactsOptimizedAsync(tenantId, request);
        }
        else
        {
            result = await SearchContactsStandardAsync(tenantId, request);
        }

        // Cache results for non-keyset pagination
        if (!request.AfterUpdatedAt.HasValue && !request.AfterId.HasValue)
        {
            await _cacheService.SetSearchResultsAsync(tenantId, cacheKey, result);
        }

        return result;
    }

    private async Task<ContactSearchResponse> SearchContactsOptimizedAsync(Guid tenantId, ContactSearchRequest request)
    {
        IAsyncEnumerable<Contact> query;

        // Use compiled queries for common patterns
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            query = CompiledQueries.SearchContactsByName(_context, tenantId, request.Search.Trim(), request.Limit + 1);
        }
        else if (request.IsActive.HasValue)
        {
            // For keyset with active filter, we need a custom query
            query = _context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.IsActive == request.IsActive.Value && c.DeletedAt == null)
                .Where(c => c.UpdatedAt < request.AfterUpdatedAt!.Value || 
                           (c.UpdatedAt == request.AfterUpdatedAt.Value && c.Id.CompareTo(request.AfterId!.Value) < 0))
                .OrderByDescending(c => c.UpdatedAt)
                .ThenByDescending(c => c.Id)
                .Take(request.Limit + 1)
                .AsAsyncEnumerable();
        }
        else
        {
            query = CompiledQueries.GetContactsWithKeysetPagination(_context, tenantId, request.AfterUpdatedAt!.Value, request.AfterId!.Value, request.Limit + 1);
        }

        var contacts = new List<Contact>();
        await foreach (var contact in query)
        {
            contacts.Add(contact);
        }

        // Apply additional filters that can't be optimized with compiled queries
        if (request.TagIds.Any())
        {
            contacts = contacts.Where(c => c.ContactTags.Any(ct => request.TagIds.Contains(ct.TagId))).ToList();
        }

        // Determine pagination info
        var hasNextPage = contacts.Count > request.Limit;
        if (hasNextPage)
        {
            contacts = contacts.Take(request.Limit).ToList();
        }

        // Map to DTOs
        var contactDtos = new List<ContactDto>();
        foreach (var contact in contacts)
        {
            contactDtos.Add(await MapToContactDtoAsync(contact));
        }

        // Get next cursor
        DateTime? nextUpdatedAt = null;
        Guid? nextId = null;
        
        if (hasNextPage && contacts.Any())
        {
            var lastContact = contacts.Last();
            nextUpdatedAt = lastContact.UpdatedAt;
            nextId = lastContact.Id;
        }

        return new ContactSearchResponse
        {
            Contacts = contactDtos,
            TotalCount = -1, // Don't compute total for performance
            Page = request.Page,
            Limit = request.Limit,
            TotalPages = -1,
            HasNextPage = hasNextPage,
            NextUpdatedAt = nextUpdatedAt,
            NextId = nextId
        };
    }

    private async Task<ContactSearchResponse> SearchContactsStandardAsync(Guid tenantId, ContactSearchRequest request)
    {
        IAsyncEnumerable<Contact> query;
        Task<int> totalCountTask;

        // Use compiled queries when possible
        if (request.IsActive.HasValue && !request.TagIds.Any() && string.IsNullOrWhiteSpace(request.Search))
        {
            var skip = (request.Page - 1) * request.Limit;
            query = CompiledQueries.GetActiveContactsPaginated(_context, tenantId, request.IsActive.Value, skip, request.Limit);
            totalCountTask = CompiledQueries.GetActiveContactCount(_context, tenantId);
        }
        else
        {
            // Fallback to dynamic query building
            var baseQuery = _context.Contacts
                .AsNoTracking()
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null);

            // Apply filters
            if (request.IsActive.HasValue)
            {
                baseQuery = baseQuery.Where(c => c.IsActive == request.IsActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var searchTerm = request.Search.Trim();
                
                // Hash search term for PII lookups
                var normalizedPhone = _encryptionService.NormalizePhone(searchTerm);
                var normalizedEmail = _encryptionService.NormalizeEmail(searchTerm);
                var normalizedKakaoId = _encryptionService.NormalizeKakaoId(searchTerm);
                
                var phoneHash = await _encryptionService.HashAsync(normalizedPhone);
                var emailHash = await _encryptionService.HashAsync(normalizedEmail);
                var kakaoHash = await _encryptionService.HashAsync(normalizedKakaoId);

                baseQuery = baseQuery.Where(c => 
                    EF.Functions.ILike(c.FullName, $"%{searchTerm}%") ||
                    (c.PhoneHash != null && c.PhoneHash.SequenceEqual(phoneHash)) ||
                    (c.EmailHash != null && c.EmailHash.SequenceEqual(emailHash)) ||
                    (c.KakaoIdHash != null && c.KakaoIdHash.SequenceEqual(kakaoHash)));
            }

            if (request.TagIds.Any())
            {
                baseQuery = baseQuery.Where(c => c.ContactTags.Any(ct => request.TagIds.Contains(ct.TagId)));
            }

            totalCountTask = baseQuery.CountAsync();
            
            // Apply sorting and pagination
            var sortedQuery = baseQuery.OrderByDescending(c => c.UpdatedAt).ThenByDescending(c => c.Id);
            query = sortedQuery.Skip((request.Page - 1) * request.Limit).Take(request.Limit).AsAsyncEnumerable();
        }

        // Execute both queries concurrently
        var contactsTask = CollectContactsAsync(query);
        var totalCount = await totalCountTask;
        var contacts = await contactsTask;

        // Map to DTOs
        var contactDtos = new List<ContactDto>();
        foreach (var contact in contacts)
        {
            contactDtos.Add(await MapToContactDtoAsync(contact));
        }

        // Calculate pagination info
        bool hasNextPage = contacts.Count == request.Limit;
        DateTime? nextUpdatedAt = null;
        Guid? nextId = null;
        
        if (hasNextPage && contacts.Any())
        {
            var lastContact = contacts.Last();
            nextUpdatedAt = lastContact.UpdatedAt;
            nextId = lastContact.Id;
        }

        return new ContactSearchResponse
        {
            Contacts = contactDtos,
            TotalCount = totalCount,
            Page = request.Page,
            Limit = request.Limit,
            TotalPages = (int)Math.Ceiling((double)totalCount / request.Limit),
            HasNextPage = hasNextPage,
            NextUpdatedAt = nextUpdatedAt,
            NextId = nextId
        };
    }

    public async Task<ContactDto> CreateContactAsync(Guid tenantId, CreateContactRequest request, Guid userId, string userName)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // Check for duplicates using compiled queries
            await ValidateNoDuplicatesAsync(tenantId, request);

            var contact = new Contact
            {
                TenantId = tenantId,
                FullName = request.FullName.Trim(),
                Notes = request.Notes?.Trim(),
                IsActive = true
            };

            // Encrypt and hash PII data
            await ProcessPiiDataAsync(contact, request);

            _context.Contacts.Add(contact);
            await _context.SaveChangesAsync();

            // Add tags using compiled query for validation
            if (request.TagIds.Any())
            {
                await AddContactTagsAsync(contact.Id, tenantId, request.TagIds);
            }

            // Log creation history
            await LogContactHistoryInternalAsync(contact.Id, tenantId, "CREATED", 
                JsonSerializer.Serialize(new { contact.FullName, HasPhone = !string.IsNullOrEmpty(request.Phone), HasEmail = !string.IsNullOrEmpty(request.Email) }),
                userId, userName, null);

            await transaction.CommitAsync();

            // Invalidate caches
            await _cacheService.InvalidateAllContactCacheAsync(tenantId);

            // Get the complete contact with tags
            var result = await CompiledQueries.GetContactWithTags(_context, tenantId, contact.Id);
            var dto = await MapToContactDtoAsync(result!);
            
            // Cache the new contact
            await _cacheService.SetContactAsync(tenantId, dto);
            
            return dto;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<ContactDto?> UpdateContactAsync(Guid tenantId, Guid contactId, UpdateContactRequest request, Guid userId, string userName)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            var contact = await CompiledQueries.GetContactWithTags(_context, tenantId, contactId);
            if (contact == null)
                return null;

            // Track changes for history
            var changes = new List<string>();
            
            if (contact.FullName != request.FullName?.Trim())
            {
                changes.Add($"Name: '{contact.FullName}' → '{request.FullName?.Trim()}'");
                contact.FullName = request.FullName?.Trim() ?? contact.FullName;
            }

            if (contact.Notes != request.Notes?.Trim())
            {
                changes.Add($"Notes updated");
                contact.Notes = request.Notes?.Trim();
            }

            // Update PII data if provided
            await UpdatePiiDataAsync(contact, request, changes);

            contact.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Update tags
            if (request.TagIds.Any())
            {
                await UpdateContactTagsAsync(contact.Id, tenantId, request.TagIds, changes);
            }

            // Log history if there were changes
            if (changes.Any())
            {
                await LogContactHistoryInternalAsync(contact.Id, tenantId, "UPDATED", 
                    JsonSerializer.Serialize(new { Changes = changes }),
                    userId, userName, null);
            }

            await transaction.CommitAsync();

            // Invalidate caches
            await _cacheService.RemoveContactAsync(tenantId, contactId);
            await _cacheService.InvalidateAllContactCacheAsync(tenantId);

            var dto = await MapToContactDtoAsync(contact);
            
            // Cache the updated contact
            await _cacheService.SetContactAsync(tenantId, dto);
            
            return dto;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeleteContactAsync(Guid tenantId, Guid contactId, Guid userId, string userName)
    {
        var exists = await CompiledQueries.ContactExists(_context, tenantId, contactId);
        if (!exists)
            return false;

        // Soft delete
        var contact = await _context.Contacts.FindAsync(contactId);
        if (contact != null)
        {
            contact.DeletedAt = DateTime.UtcNow;
            contact.IsActive = false;
            
            await LogContactHistoryInternalAsync(contactId, tenantId, "DELETED", 
                JsonSerializer.Serialize(new { DeletedBy = userName }),
                userId, userName, null);

            await _context.SaveChangesAsync();

            // Invalidate caches
            await _cacheService.RemoveContactAsync(tenantId, contactId);
            await _cacheService.InvalidateAllContactCacheAsync(tenantId);
        }

        return true;
    }

    public async Task<List<ContactHistoryDto>> GetContactHistoryAsync(Guid tenantId, ContactHistorySearchRequest request)
    {
        IAsyncEnumerable<ContactHistory> query;

        if (!string.IsNullOrEmpty(request.Type))
        {
            query = CompiledQueries.GetContactHistoryByType(_context, tenantId, request.ContactId, request.Type, request.Limit);
        }
        else
        {
            var skip = (request.Page - 1) * request.Limit;
            query = CompiledQueries.GetContactHistory(_context, tenantId, request.ContactId, skip, request.Limit);
        }

        var history = await CollectHistoryAsync(query);
        
        return history.Select(h => new ContactHistoryDto
        {
            Id = h.Id,
            ContactId = h.ContactId,
            Type = h.Type,
            Payload = h.Payload,
            OccurredAt = h.OccurredAt,
            UserName = h.UserName,
            IpAddress = h.IpAddress
        }).ToList();
    }

    public Task LogContactHistoryAsync(Guid contactId, string type, string? payload, Guid userId, string userName, string? ipAddress = null)
    {
        // This method signature is part of the interface but tenant ID is needed
        throw new NotImplementedException("Use LogContactHistoryInternalAsync with tenantId parameter");
    }

    // Helper methods
    private async Task<List<Contact>> CollectContactsAsync(IAsyncEnumerable<Contact> query)
    {
        var contacts = new List<Contact>();
        await foreach (var contact in query)
        {
            contacts.Add(contact);
        }
        return contacts;
    }

    private async Task<List<ContactHistory>> CollectHistoryAsync(IAsyncEnumerable<ContactHistory> query)
    {
        var history = new List<ContactHistory>();
        await foreach (var item in query)
        {
            history.Add(item);
        }
        return history;
    }

    private async Task ValidateNoDuplicatesAsync(Guid tenantId, CreateContactRequest request)
    {
        if (!string.IsNullOrEmpty(request.Phone))
        {
            var phoneHash = await _encryptionService.HashAsync(_encryptionService.NormalizePhone(request.Phone));
            var existing = await CompiledQueries.FindContactByPhoneHash(_context, tenantId, phoneHash);
            if (existing != null)
                throw new ValidationException($"Contact with phone number already exists: {existing.Id}");
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            var emailHash = await _encryptionService.HashAsync(_encryptionService.NormalizeEmail(request.Email));
            var existing = await CompiledQueries.FindContactByEmailHash(_context, tenantId, emailHash);
            if (existing != null)
                throw new ValidationException($"Contact with email already exists: {existing.Id}");
        }

        if (!string.IsNullOrEmpty(request.KakaoId))
        {
            var kakaoHash = await _encryptionService.HashAsync(_encryptionService.NormalizeKakaoId(request.KakaoId));
            var existing = await CompiledQueries.FindContactByKakaoHash(_context, tenantId, kakaoHash);
            if (existing != null)
                throw new ValidationException($"Contact with Kakao ID already exists: {existing.Id}");
        }
    }

    private async Task ProcessPiiDataAsync(Contact contact, CreateContactRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var normalizedPhone = _encryptionService.NormalizePhone(request.Phone);
            contact.PhoneEncrypted = await _encryptionService.EncryptAsync(normalizedPhone);
            contact.PhoneHash = await _encryptionService.HashAsync(normalizedPhone);
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = _encryptionService.NormalizeEmail(request.Email);
            contact.EmailEncrypted = await _encryptionService.EncryptAsync(normalizedEmail);
            contact.EmailHash = await _encryptionService.HashAsync(normalizedEmail);
        }

        if (!string.IsNullOrWhiteSpace(request.KakaoId))
        {
            var normalizedKakaoId = _encryptionService.NormalizeKakaoId(request.KakaoId);
            contact.KakaoIdEncrypted = await _encryptionService.EncryptAsync(normalizedKakaoId);
            contact.KakaoIdHash = await _encryptionService.HashAsync(normalizedKakaoId);
        }
    }

    private async Task UpdatePiiDataAsync(Contact contact, UpdateContactRequest request, List<string> changes)
    {
        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var normalizedPhone = _encryptionService.NormalizePhone(request.Phone);
            var newPhoneHash = await _encryptionService.HashAsync(normalizedPhone);
            
            if (contact.PhoneHash == null || !contact.PhoneHash.SequenceEqual(newPhoneHash))
            {
                changes.Add("Phone updated");
                contact.PhoneEncrypted = await _encryptionService.EncryptAsync(normalizedPhone);
                contact.PhoneHash = newPhoneHash;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = _encryptionService.NormalizeEmail(request.Email);
            var newEmailHash = await _encryptionService.HashAsync(normalizedEmail);
            
            if (contact.EmailHash == null || !contact.EmailHash.SequenceEqual(newEmailHash))
            {
                changes.Add("Email updated");
                contact.EmailEncrypted = await _encryptionService.EncryptAsync(normalizedEmail);
                contact.EmailHash = newEmailHash;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.KakaoId))
        {
            var normalizedKakaoId = _encryptionService.NormalizeKakaoId(request.KakaoId);
            var newKakaoHash = await _encryptionService.HashAsync(normalizedKakaoId);
            
            if (contact.KakaoIdHash == null || !contact.KakaoIdHash.SequenceEqual(newKakaoHash))
            {
                changes.Add("Kakao ID updated");
                contact.KakaoIdEncrypted = await _encryptionService.EncryptAsync(normalizedKakaoId);
                contact.KakaoIdHash = newKakaoHash;
            }
        }
    }

    private async Task AddContactTagsAsync(Guid contactId, Guid tenantId, List<Guid> tagIds)
    {
        var validTags = await CompiledQueries.GetTagsByIds(_context, tenantId, tagIds);
        
        foreach (var tag in validTags)
        {
            _context.ContactTags.Add(new ContactTag
            {
                ContactId = contactId,
                TagId = tag.Id,
                TenantId = tenantId
            });
        }

        await _context.SaveChangesAsync();
    }

    private async Task UpdateContactTagsAsync(Guid contactId, Guid tenantId, List<Guid> newTagIds, List<string> changes)
    {
        // Remove existing tags
        var existingTags = await _context.ContactTags
            .Where(ct => ct.ContactId == contactId && ct.TenantId == tenantId)
            .ToListAsync();
        
        _context.ContactTags.RemoveRange(existingTags);

        // Add new tags
        if (newTagIds.Any())
        {
            await AddContactTagsAsync(contactId, tenantId, newTagIds);
            changes.Add("Tags updated");
        }
    }

    private async Task LogContactHistoryInternalAsync(Guid contactId, Guid tenantId, string type, string? payload, Guid userId, string userName, string? ipAddress)
    {
        var history = new ContactHistory
        {
            ContactId = contactId,
            TenantId = tenantId,
            Type = type,
            Payload = payload,
            UserId = userId,
            UserName = userName,
            IpAddress = ipAddress,
            OccurredAt = DateTime.UtcNow
        };

        _context.ContactHistory.Add(history);
        await _context.SaveChangesAsync();
    }

    private async Task<ContactDto> MapToContactDtoAsync(Contact contact)
    {
        var dto = new ContactDto
        {
            Id = contact.Id,
            FullName = contact.FullName,
            Notes = contact.Notes,
            IsActive = contact.IsActive,
            CreatedAt = contact.CreatedAt,
            UpdatedAt = contact.UpdatedAt,
            Tags = contact.ContactTags.Select(ct => new TagDto
            {
                Id = ct.Tag.Id,
                Name = ct.Tag.Name,
                Color = ct.Tag.Color
            }).ToList()
        };

        // Decrypt PII data
        if (contact.PhoneEncrypted != null)
        {
            dto.Phone = await _encryptionService.DecryptAsync(contact.PhoneEncrypted);
        }

        if (contact.EmailEncrypted != null)
        {
            dto.Email = await _encryptionService.DecryptAsync(contact.EmailEncrypted);
        }

        if (contact.KakaoIdEncrypted != null)
        {
            dto.KakaoId = await _encryptionService.DecryptAsync(contact.KakaoIdEncrypted);
        }

        return dto;
    }

    private string GenerateSearchCacheKey(ContactSearchRequest request)
    {
        var keyData = new
        {
            Search = request.Search?.Trim().ToLowerInvariant(),
            IsActive = request.IsActive,
            TagIds = request.TagIds.OrderBy(id => id).ToList(),
            Page = request.Page,
            Limit = request.Limit,
            SortBy = request.SortBy?.ToLowerInvariant(),
            SortOrder = request.SortOrder?.ToLowerInvariant()
        };

        var json = JsonSerializer.Serialize(keyData);
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(json));
        return Convert.ToBase64String(hash);
    }
}