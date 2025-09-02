using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ProductivityHub.Api.Services;

public interface ISelectionTokenService
{
    Task<SelectionTokenDto> CreateSelectionTokenAsync(Guid tenantId, ContactSearchRequest searchCriteria);
    Task<List<Guid>> ExpandSelectionTokenAsync(Guid tenantId, string token);
    Task<bool> ValidateSelectionTokenAsync(Guid tenantId, string token);
}

public class SelectionTokenService : ISelectionTokenService
{
    private readonly ApplicationDbContext _context;
    private readonly IDataProtector _protector;
    private readonly ILogger<SelectionTokenService> _logger;
    private const int TokenExpirationHours = 2;
    private const int MaxSelectionSize = 100000; // Safety limit

    public SelectionTokenService(
        ApplicationDbContext context,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<SelectionTokenService> logger)
    {
        _context = context;
        _protector = dataProtectionProvider.CreateProtector("SelectionTokens");
        _logger = logger;
    }

    public async Task<SelectionTokenDto> CreateSelectionTokenAsync(Guid tenantId, ContactSearchRequest searchCriteria)
    {
        try
        {
            // Build query to estimate count
            var query = BuildContactQuery(tenantId, searchCriteria);
            var estimatedCount = await query.CountAsync();

            if (estimatedCount > MaxSelectionSize)
            {
                throw new InvalidOperationException($"Selection size {estimatedCount} exceeds maximum allowed {MaxSelectionSize}");
            }

            // Create token payload
            var tokenData = new SelectionTokenData
            {
                TenantId = tenantId,
                SearchCriteria = searchCriteria,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(TokenExpirationHours)
            };

            // Serialize and protect token
            var json = JsonSerializer.Serialize(tokenData);
            var protectedToken = _protector.Protect(json);

            return new SelectionTokenDto
            {
                Token = protectedToken,
                EstimatedCount = estimatedCount,
                SearchCriteria = searchCriteria,
                ExpiresAt = tokenData.ExpiresAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating selection token for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task<List<Guid>> ExpandSelectionTokenAsync(Guid tenantId, string token)
    {
        try
        {
            var tokenData = await DecryptAndValidateTokenAsync(tenantId, token);
            
            // Build query and get contact IDs
            var query = BuildContactQuery(tokenData.TenantId, tokenData.SearchCriteria);
            var contactIds = await query.Select(c => c.Id).ToListAsync();

            _logger.LogInformation("Expanded selection token to {Count} contacts for tenant {TenantId}", 
                contactIds.Count, tenantId);

            return contactIds;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error expanding selection token for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task<bool> ValidateSelectionTokenAsync(Guid tenantId, string token)
    {
        try
        {
            var tokenData = await DecryptAndValidateTokenAsync(tenantId, token);
            return tokenData.TenantId == tenantId && tokenData.ExpiresAt > DateTime.UtcNow;
        }
        catch
        {
            return false;
        }
    }

    private async Task<SelectionTokenData> DecryptAndValidateTokenAsync(Guid tenantId, string token)
    {
        try
        {
            var json = _protector.Unprotect(token);
            var tokenData = JsonSerializer.Deserialize<SelectionTokenData>(json);

            if (tokenData == null)
                throw new InvalidOperationException("Invalid token format");

            if (tokenData.TenantId != tenantId)
                throw new UnauthorizedAccessException("Token does not belong to this tenant");

            if (tokenData.ExpiresAt <= DateTime.UtcNow)
                throw new InvalidOperationException("Token has expired");

            return tokenData;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invalid or expired selection token for tenant {TenantId}", tenantId);
            throw;
        }
    }

    private IQueryable<Contact> BuildContactQuery(Guid tenantId, ContactSearchRequest searchCriteria)
    {
        var query = _context.Contacts
            .Where(c => c.TenantId == tenantId && c.DeletedAt == null); // Exclude soft-deleted

        // Apply search filters
        if (!string.IsNullOrEmpty(searchCriteria.Search))
        {
            var searchTerm = searchCriteria.Search.ToLower();
            query = query.Where(c =>
                c.FullName.ToLower().Contains(searchTerm));
        }

        // Apply active filter
        if (searchCriteria.IsActive.HasValue)
        {
            query = query.Where(c => c.IsActive == searchCriteria.IsActive.Value);
        }

        // Apply tag filters
        if (searchCriteria.TagIds?.Any() == true)
        {
            query = query.Where(c => c.ContactTags.Any(ct => searchCriteria.TagIds.Contains(ct.TagId)));
        }

        // Apply date range filters
        if (searchCriteria.AfterUpdatedAt.HasValue)
        {
            query = query.Where(c => c.UpdatedAt >= searchCriteria.AfterUpdatedAt.Value);
        }

        // Apply sorting
        query = searchCriteria.SortBy?.ToLower() switch
        {
            "fullname" => searchCriteria.SortOrder?.ToLower() == "desc" 
                ? query.OrderByDescending(c => c.FullName)
                : query.OrderBy(c => c.FullName),
            "createdat" => searchCriteria.SortOrder?.ToLower() == "desc"
                ? query.OrderByDescending(c => c.CreatedAt)
                : query.OrderBy(c => c.CreatedAt),
            _ => searchCriteria.SortOrder?.ToLower() == "desc"
                ? query.OrderByDescending(c => c.UpdatedAt)
                : query.OrderBy(c => c.UpdatedAt)
        };

        return query;
    }

    private class SelectionTokenData
    {
        public Guid TenantId { get; set; }
        public ContactSearchRequest SearchCriteria { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}