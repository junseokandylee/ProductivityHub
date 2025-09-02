using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

public interface IContactService
{
    Task<ContactDto?> GetContactAsync(Guid tenantId, Guid contactId);
    Task<ContactSearchResponse> SearchContactsAsync(Guid tenantId, ContactSearchRequest request);
    Task<ContactDto> CreateContactAsync(Guid tenantId, CreateContactRequest request, Guid userId, string userName);
    Task<ContactDto?> UpdateContactAsync(Guid tenantId, Guid contactId, UpdateContactRequest request, Guid userId, string userName);
    Task<bool> DeleteContactAsync(Guid tenantId, Guid contactId, Guid userId, string userName);
    Task<List<ContactHistoryDto>> GetContactHistoryAsync(Guid tenantId, ContactHistorySearchRequest request);
    Task LogContactHistoryAsync(Guid contactId, string type, string? payload, Guid userId, string userName, string? ipAddress = null);
}

public class ContactService : IContactService
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<ContactService> _logger;

    public ContactService(
        ApplicationDbContext context, 
        IEncryptionService encryptionService,
        ILogger<ContactService> logger)
    {
        _context = context;
        _encryptionService = encryptionService;
        _logger = logger;
    }

    public async Task<ContactDto?> GetContactAsync(Guid tenantId, Guid contactId)
    {
        var contact = await _context.Contacts
            .Include(c => c.ContactTags)
            .ThenInclude(ct => ct.Tag)
            .Where(c => c.TenantId == tenantId && c.Id == contactId)
            .FirstOrDefaultAsync();

        if (contact == null)
            return null;

        return await MapToContactDtoAsync(contact);
    }

    public async Task<ContactSearchResponse> SearchContactsAsync(Guid tenantId, ContactSearchRequest request)
    {
        // For keyset pagination, use optimized method
        if (request.AfterUpdatedAt.HasValue && request.AfterId.HasValue)
        {
            return await SearchContactsOptimizedAsync(tenantId, request);
        }
        
        var query = _context.Contacts
            .Include(c => c.ContactTags)
            .ThenInclude(ct => ct.Tag)
            .Where(c => c.TenantId == tenantId);

        // Apply filters
        if (request.IsActive.HasValue)
        {
            query = query.Where(c => c.IsActive == request.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            // Use PostgreSQL full-text search for names
            query = query.Where(c => EF.Functions.ILike(c.FullName, $"%{request.Search}%"));
        }

        if (request.TagIds.Any())
        {
            query = query.Where(c => c.ContactTags.Any(ct => request.TagIds.Contains(ct.TagId)));
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        query = request.SortBy.ToLower() switch
        {
            "name" or "fullname" => request.SortOrder.ToLower() == "desc" 
                ? query.OrderByDescending(c => c.FullName) 
                : query.OrderBy(c => c.FullName),
            "createdat" => request.SortOrder.ToLower() == "desc" 
                ? query.OrderByDescending(c => c.CreatedAt) 
                : query.OrderBy(c => c.CreatedAt),
            "updatedat" => request.SortOrder.ToLower() == "desc" 
                ? query.OrderByDescending(c => c.UpdatedAt) 
                : query.OrderBy(c => c.UpdatedAt),
            _ => query.OrderByDescending(c => c.CreatedAt)
        };

        // Apply pagination
        var contacts = await query
            .Skip((request.Page - 1) * request.Limit)
            .Take(request.Limit)
            .ToListAsync();

        var contactDtos = new List<ContactDto>();
        foreach (var contact in contacts)
        {
            contactDtos.Add(await MapToContactDtoAsync(contact));
        }

        // Get next page cursor info
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

    /// <summary>
    /// Optimized search with keyset pagination for better performance on large datasets
    /// </summary>
    private async Task<ContactSearchResponse> SearchContactsOptimizedAsync(Guid tenantId, ContactSearchRequest request)
    {
        var query = _context.Contacts
            .AsNoTracking() // Read-only for better performance
            .Where(c => c.TenantId == tenantId);

        // Apply keyset pagination first for performance
        if (request.AfterUpdatedAt.HasValue && request.AfterId.HasValue)
        {
            query = query.Where(c => 
                c.UpdatedAt < request.AfterUpdatedAt.Value ||
                (c.UpdatedAt == request.AfterUpdatedAt.Value && c.Id.CompareTo(request.AfterId.Value) < 0));
        }

        // Apply filters
        if (request.IsActive.HasValue)
        {
            query = query.Where(c => c.IsActive == request.IsActive.Value);
        }

        // Optimized search with PII hash lookups
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var searchTerm = request.Search.Trim();
            
            // Hash the search term for PII lookups
            var normalizedPhone = _encryptionService.NormalizePhone(searchTerm);
            var normalizedEmail = _encryptionService.NormalizeEmail(searchTerm);
            var normalizedKakaoId = _encryptionService.NormalizeKakaoId(searchTerm);
            
            var phoneHash = await _encryptionService.HashAsync(normalizedPhone);
            var emailHash = await _encryptionService.HashAsync(normalizedEmail);
            var kakaoHash = await _encryptionService.HashAsync(normalizedKakaoId);

            query = query.Where(c => 
                EF.Functions.ILike(c.FullName, $"%{searchTerm}%") ||
                (c.PhoneHash != null && c.PhoneHash.SequenceEqual(phoneHash)) ||
                (c.EmailHash != null && c.EmailHash.SequenceEqual(emailHash)) ||
                (c.KakaoIdHash != null && c.KakaoIdHash.SequenceEqual(kakaoHash)));
        }

        // Tag filtering with JOIN for better performance
        if (request.TagIds.Any())
        {
            query = query.Where(c => c.ContactTags.Any(ct => request.TagIds.Contains(ct.TagId)));
        }

        // Always sort by UpdatedAt DESC, Id DESC for consistent keyset pagination
        query = query.OrderByDescending(c => c.UpdatedAt).ThenByDescending(c => c.Id);

        // Get one extra record to determine if there's a next page
        var contacts = await query
            .Take(request.Limit + 1)
            .Include(c => c.ContactTags)
            .ThenInclude(ct => ct.Tag)
            .ToListAsync();

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
            TotalCount = -1, // Don't compute total for performance in keyset pagination
            Page = request.Page,
            Limit = request.Limit,
            TotalPages = -1,
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
            var contact = new Contact
            {
                TenantId = tenantId,
                FullName = request.FullName.Trim(),
                Notes = request.Notes?.Trim(),
                IsActive = true
            };

            // Encrypt and hash PII data
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

            _context.Contacts.Add(contact);
            await _context.SaveChangesAsync();

            // Add tags
            if (request.TagIds.Any())
            {
                var validTagIds = await _context.Tags
                    .Where(t => t.TenantId == tenantId && request.TagIds.Contains(t.Id))
                    .Select(t => t.Id)
                    .ToListAsync();

                foreach (var tagId in validTagIds)
                {
                    _context.ContactTags.Add(new ContactTag
                    {
                        ContactId = contact.Id,
                        TagId = tagId,
                        TenantId = tenantId
                    });
                }

                await _context.SaveChangesAsync();
            }

            // Log creation history
            await LogContactHistoryInternalAsync(contact.Id, tenantId, "CREATED", 
                JsonSerializer.Serialize(new { contact.FullName, HasPhone = !string.IsNullOrEmpty(request.Phone), HasEmail = !string.IsNullOrEmpty(request.Email) }),
                userId, userName, null);

            await transaction.CommitAsync();

            // Reload with includes for return
            var createdContact = await _context.Contacts
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .FirstAsync(c => c.Id == contact.Id);

            return await MapToContactDtoAsync(createdContact);
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
            var contact = await _context.Contacts
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.Id == contactId)
                .FirstOrDefaultAsync();

            if (contact == null)
                return null;

            var originalData = await MapToContactDtoAsync(contact);

            // Update basic fields
            contact.FullName = request.FullName.Trim();
            contact.Notes = request.Notes?.Trim();
            contact.IsActive = request.IsActive;

            // Update encrypted PII data
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var normalizedPhone = _encryptionService.NormalizePhone(request.Phone);
                contact.PhoneEncrypted = await _encryptionService.EncryptAsync(normalizedPhone);
                contact.PhoneHash = await _encryptionService.HashAsync(normalizedPhone);
            }
            else
            {
                contact.PhoneEncrypted = null;
                contact.PhoneHash = null;
            }

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var normalizedEmail = _encryptionService.NormalizeEmail(request.Email);
                contact.EmailEncrypted = await _encryptionService.EncryptAsync(normalizedEmail);
                contact.EmailHash = await _encryptionService.HashAsync(normalizedEmail);
            }
            else
            {
                contact.EmailEncrypted = null;
                contact.EmailHash = null;
            }

            if (!string.IsNullOrWhiteSpace(request.KakaoId))
            {
                var normalizedKakaoId = _encryptionService.NormalizeKakaoId(request.KakaoId);
                contact.KakaoIdEncrypted = await _encryptionService.EncryptAsync(normalizedKakaoId);
                contact.KakaoIdHash = await _encryptionService.HashAsync(normalizedKakaoId);
            }
            else
            {
                contact.KakaoIdEncrypted = null;
                contact.KakaoIdHash = null;
            }

            // Update tags - remove old ones and add new ones
            var existingTagIds = contact.ContactTags.Select(ct => ct.TagId).ToList();
            var newTagIds = request.TagIds.Distinct().ToList();

            // Remove tags that are no longer needed
            var tagsToRemove = contact.ContactTags.Where(ct => !newTagIds.Contains(ct.TagId)).ToList();
            foreach (var tagToRemove in tagsToRemove)
            {
                _context.ContactTags.Remove(tagToRemove);
            }

            // Add new tags
            var tagsToAdd = newTagIds.Where(tagId => !existingTagIds.Contains(tagId)).ToList();
            if (tagsToAdd.Any())
            {
                var validTagIds = await _context.Tags
                    .Where(t => t.TenantId == tenantId && tagsToAdd.Contains(t.Id))
                    .Select(t => t.Id)
                    .ToListAsync();

                foreach (var tagId in validTagIds)
                {
                    _context.ContactTags.Add(new ContactTag
                    {
                        ContactId = contact.Id,
                        TagId = tagId,
                        TenantId = tenantId
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Log update history
            var updatedData = await MapToContactDtoAsync(contact);
            await LogContactHistoryInternalAsync(contact.Id, tenantId, "UPDATED", 
                JsonSerializer.Serialize(new { Before = originalData, After = updatedData }),
                userId, userName, null);

            await transaction.CommitAsync();

            return updatedData;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeleteContactAsync(Guid tenantId, Guid contactId, Guid userId, string userName)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            var contact = await _context.Contacts
                .Where(c => c.TenantId == tenantId && c.Id == contactId)
                .FirstOrDefaultAsync();

            if (contact == null)
                return false;

            var contactData = await MapToContactDtoAsync(contact);

            // Log deletion before actual deletion
            await LogContactHistoryInternalAsync(contact.Id, tenantId, "DELETED", 
                JsonSerializer.Serialize(contactData),
                userId, userName, null);

            _context.Contacts.Remove(contact);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<ContactHistoryDto>> GetContactHistoryAsync(Guid tenantId, ContactHistorySearchRequest request)
    {
        var query = _context.ContactHistory
            .Where(ch => ch.TenantId == tenantId && ch.ContactId == request.ContactId);

        if (!string.IsNullOrWhiteSpace(request.Type))
        {
            query = query.Where(ch => ch.Type == request.Type);
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(ch => ch.OccurredAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(ch => ch.OccurredAt <= request.ToDate.Value);
        }

        var history = await query
            .OrderByDescending(ch => ch.OccurredAt)
            .Skip((request.Page - 1) * request.Limit)
            .Take(request.Limit)
            .ToListAsync();

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

    private async Task<ContactDto> MapToContactDtoAsync(Contact contact)
    {
        return new ContactDto
        {
            Id = contact.Id,
            FullName = contact.FullName,
            Phone = await _encryptionService.DecryptAsync(contact.PhoneEncrypted),
            Email = await _encryptionService.DecryptAsync(contact.EmailEncrypted),
            KakaoId = await _encryptionService.DecryptAsync(contact.KakaoIdEncrypted),
            Notes = contact.Notes,
            IsActive = contact.IsActive,
            CreatedAt = contact.CreatedAt,
            UpdatedAt = contact.UpdatedAt,
            Tags = contact.ContactTags.Select(ct => new TagDto
            {
                Id = ct.Tag.Id,
                Name = ct.Tag.Name,
                Color = ct.Tag.Color,
                Description = ct.Tag.Description,
                CreatedAt = ct.Tag.CreatedAt,
                UpdatedAt = ct.Tag.UpdatedAt
            }).ToList()
        };
    }

    public async Task LogContactHistoryAsync(Guid contactId, string type, string? payload, Guid userId, string userName, string? ipAddress = null)
    {
        var tenantId = Guid.Empty; // In bulk operations, we might need to get this differently
        await LogContactHistoryInternalAsync(contactId, tenantId, type, payload, userId, userName, ipAddress);
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
}