using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/settings/security")]
[Authorize]
public class SecuritySettingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SecuritySettingsController> _logger;

    public SecuritySettingsController(ApplicationDbContext context, ILogger<SecuritySettingsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Security Settings Management
    [HttpGet]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<SecuritySettingsResponse>> GetSecuritySettings()
    {
        var tenantId = User.GetTenantId();

        try
        {
            var settings = await _context.SecuritySettings
                .Include(ss => ss.CreatedByUser)
                .Include(ss => ss.UpdatedByUser)
                .FirstOrDefaultAsync(ss => ss.TenantId == tenantId);

            if (settings == null)
            {
                // Create default settings if none exist
                var userId = User.GetUserId();
                settings = new SecuritySettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.SecuritySettings.Add(settings);
                await _context.SaveChangesAsync();

                // Reload with navigation properties
                settings = await _context.SecuritySettings
                    .Include(ss => ss.CreatedByUser)
                    .Include(ss => ss.UpdatedByUser)
                    .FirstAsync(ss => ss.Id == settings.Id);
            }

            var response = new SecuritySettingsResponse
            {
                Id = settings.Id,
                MinPasswordLength = settings.MinPasswordLength,
                RequireUppercase = settings.RequireUppercase,
                RequireLowercase = settings.RequireLowercase,
                RequireNumbers = settings.RequireNumbers,
                RequireSpecialChars = settings.RequireSpecialChars,
                PasswordExpiryDays = settings.PasswordExpiryDays,
                PreventPasswordReuse = settings.PreventPasswordReuse,
                SessionTimeoutMinutes = settings.SessionTimeoutMinutes,
                MaxConcurrentSessions = settings.MaxConcurrentSessions,
                ForceLogoutOnPasswordChange = settings.ForceLogoutOnPasswordChange,
                Enforce2FA = settings.Enforce2FA,
                Allow2FAEmail = settings.Allow2FAEmail,
                Allow2FASMS = settings.Allow2FASMS,
                Allow2FAAuthenticator = settings.Allow2FAAuthenticator,
                EnableIPWhitelist = settings.EnableIPWhitelist,
                AllowedIPRanges = string.IsNullOrEmpty(settings.AllowedIPRanges) ? null : 
                    JsonSerializer.Deserialize<List<string>>(settings.AllowedIPRanges),
                MaxFailedLoginAttempts = settings.MaxFailedLoginAttempts,
                AccountLockoutMinutes = settings.AccountLockoutMinutes,
                EnableAuditLogging = settings.EnableAuditLogging,
                AuditRetentionDays = settings.AuditRetentionDays,
                LogSuccessfulLogins = settings.LogSuccessfulLogins,
                LogFailedLogins = settings.LogFailedLogins,
                LogDataChanges = settings.LogDataChanges,
                LogAdminActions = settings.LogAdminActions,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt,
                CreatedByName = settings.CreatedByUser.Name,
                UpdatedByName = settings.UpdatedByUser?.Name
            };

            _logger.LogInformation("Retrieved security settings for tenant {TenantId}", tenantId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving security settings for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving security settings" });
        }
    }

    [HttpPut]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<SecuritySettingsResponse>> UpdateSecuritySettings([FromBody] SecuritySettingsRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var settings = await _context.SecuritySettings
                .FirstOrDefaultAsync(ss => ss.TenantId == tenantId);

            if (settings == null)
            {
                // Create new settings
                settings = new SecuritySettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.SecuritySettings.Add(settings);
            }

            // Update settings
            settings.MinPasswordLength = request.MinPasswordLength;
            settings.RequireUppercase = request.RequireUppercase;
            settings.RequireLowercase = request.RequireLowercase;
            settings.RequireNumbers = request.RequireNumbers;
            settings.RequireSpecialChars = request.RequireSpecialChars;
            settings.PasswordExpiryDays = request.PasswordExpiryDays;
            settings.PreventPasswordReuse = request.PreventPasswordReuse;
            settings.SessionTimeoutMinutes = request.SessionTimeoutMinutes;
            settings.MaxConcurrentSessions = request.MaxConcurrentSessions;
            settings.ForceLogoutOnPasswordChange = request.ForceLogoutOnPasswordChange;
            settings.Enforce2FA = request.Enforce2FA;
            settings.Allow2FAEmail = request.Allow2FAEmail;
            settings.Allow2FASMS = request.Allow2FASMS;
            settings.Allow2FAAuthenticator = request.Allow2FAAuthenticator;
            settings.EnableIPWhitelist = request.EnableIPWhitelist;
            settings.AllowedIPRanges = request.AllowedIPRanges != null ? 
                JsonSerializer.Serialize(request.AllowedIPRanges) : null;
            settings.MaxFailedLoginAttempts = request.MaxFailedLoginAttempts;
            settings.AccountLockoutMinutes = request.AccountLockoutMinutes;
            settings.EnableAuditLogging = request.EnableAuditLogging;
            settings.AuditRetentionDays = request.AuditRetentionDays;
            settings.LogSuccessfulLogins = request.LogSuccessfulLogins;
            settings.LogFailedLogins = request.LogFailedLogins;
            settings.LogDataChanges = request.LogDataChanges;
            settings.LogAdminActions = request.LogAdminActions;
            settings.UpdatedBy = userId;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            settings = await _context.SecuritySettings
                .Include(ss => ss.CreatedByUser)
                .Include(ss => ss.UpdatedByUser)
                .FirstAsync(ss => ss.Id == settings.Id);

            var response = new SecuritySettingsResponse
            {
                Id = settings.Id,
                MinPasswordLength = settings.MinPasswordLength,
                RequireUppercase = settings.RequireUppercase,
                RequireLowercase = settings.RequireLowercase,
                RequireNumbers = settings.RequireNumbers,
                RequireSpecialChars = settings.RequireSpecialChars,
                PasswordExpiryDays = settings.PasswordExpiryDays,
                PreventPasswordReuse = settings.PreventPasswordReuse,
                SessionTimeoutMinutes = settings.SessionTimeoutMinutes,
                MaxConcurrentSessions = settings.MaxConcurrentSessions,
                ForceLogoutOnPasswordChange = settings.ForceLogoutOnPasswordChange,
                Enforce2FA = settings.Enforce2FA,
                Allow2FAEmail = settings.Allow2FAEmail,
                Allow2FASMS = settings.Allow2FASMS,
                Allow2FAAuthenticator = settings.Allow2FAAuthenticator,
                EnableIPWhitelist = settings.EnableIPWhitelist,
                AllowedIPRanges = string.IsNullOrEmpty(settings.AllowedIPRanges) ? null : 
                    JsonSerializer.Deserialize<List<string>>(settings.AllowedIPRanges),
                MaxFailedLoginAttempts = settings.MaxFailedLoginAttempts,
                AccountLockoutMinutes = settings.AccountLockoutMinutes,
                EnableAuditLogging = settings.EnableAuditLogging,
                AuditRetentionDays = settings.AuditRetentionDays,
                LogSuccessfulLogins = settings.LogSuccessfulLogins,
                LogFailedLogins = settings.LogFailedLogins,
                LogDataChanges = settings.LogDataChanges,
                LogAdminActions = settings.LogAdminActions,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt,
                CreatedByName = settings.CreatedByUser.Name,
                UpdatedByName = settings.UpdatedByUser?.Name
            };

            _logger.LogInformation("Updated security settings for tenant {TenantId} by user {UserId}", tenantId, userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating security settings for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while updating security settings" });
        }
    }

    // API Token Management
    [HttpGet("api-tokens")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<List<ApiTokenResponse>>> GetApiTokens()
    {
        var tenantId = User.GetTenantId();

        try
        {
            var tokens = await _context.ApiTokens
                .Where(at => at.TenantId == tenantId)
                .Include(at => at.User)
                .OrderByDescending(at => at.CreatedAt)
                .Select(at => new ApiTokenResponse
                {
                    Id = at.Id,
                    Name = at.Name,
                    TokenPrefix = at.TokenPrefix,
                    Permissions = JsonSerializer.Deserialize<List<string>>(at.Permissions) ?? new(),
                    ExpiresAt = at.ExpiresAt,
                    LastUsedAt = at.LastUsedAt,
                    LastUsedIP = at.LastUsedIP,
                    IsActive = at.IsActive,
                    CreatedAt = at.CreatedAt,
                    UserName = at.User.Name
                })
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} API tokens for tenant {TenantId}", tokens.Count, tenantId);
            return Ok(tokens);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving API tokens for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving API tokens" });
        }
    }

    [HttpPost("api-tokens")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<ApiTokenCreateResponse>> CreateApiToken([FromBody] ApiTokenRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            // Generate token
            var tokenBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(tokenBytes);
            }
            var token = Convert.ToBase64String(tokenBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
            var tokenHash = HashToken(token);
            var tokenPrefix = token[..8];

            var apiToken = new ApiToken
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UserId = userId,
                Name = request.Name,
                TokenHash = tokenHash,
                TokenPrefix = tokenPrefix,
                Permissions = JsonSerializer.Serialize(request.Permissions),
                ExpiresAt = request.ExpiresAt,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ApiTokens.Add(apiToken);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            apiToken = await _context.ApiTokens
                .Include(at => at.User)
                .FirstAsync(at => at.Id == apiToken.Id);

            var response = new ApiTokenCreateResponse
            {
                Id = apiToken.Id,
                Name = apiToken.Name,
                TokenPrefix = apiToken.TokenPrefix,
                Permissions = JsonSerializer.Deserialize<List<string>>(apiToken.Permissions) ?? new(),
                ExpiresAt = apiToken.ExpiresAt,
                LastUsedAt = apiToken.LastUsedAt,
                LastUsedIP = apiToken.LastUsedIP,
                IsActive = apiToken.IsActive,
                CreatedAt = apiToken.CreatedAt,
                UserName = apiToken.User.Name,
                Token = token // Only returned on creation
            };

            _logger.LogInformation("Created API token {TokenId} '{TokenName}' for tenant {TenantId} by user {UserId}", 
                apiToken.Id, request.Name, tenantId, userId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating API token for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while creating API token" });
        }
    }

    [HttpPut("api-tokens/{tokenId:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult<ApiTokenResponse>> UpdateApiToken(Guid tokenId, [FromBody] ApiTokenRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var apiToken = await _context.ApiTokens
                .FirstOrDefaultAsync(at => at.TenantId == tenantId && at.Id == tokenId);

            if (apiToken == null)
            {
                return NotFound(new { message = "API token not found" });
            }

            // Update token
            apiToken.Name = request.Name;
            apiToken.Permissions = JsonSerializer.Serialize(request.Permissions);
            apiToken.ExpiresAt = request.ExpiresAt;
            apiToken.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            apiToken = await _context.ApiTokens
                .Include(at => at.User)
                .FirstAsync(at => at.Id == apiToken.Id);

            var response = new ApiTokenResponse
            {
                Id = apiToken.Id,
                Name = apiToken.Name,
                TokenPrefix = apiToken.TokenPrefix,
                Permissions = JsonSerializer.Deserialize<List<string>>(apiToken.Permissions) ?? new(),
                ExpiresAt = apiToken.ExpiresAt,
                LastUsedAt = apiToken.LastUsedAt,
                LastUsedIP = apiToken.LastUsedIP,
                IsActive = apiToken.IsActive,
                CreatedAt = apiToken.CreatedAt,
                UserName = apiToken.User.Name
            };

            _logger.LogInformation("Updated API token {TokenId} for tenant {TenantId} by user {UserId}", tokenId, tenantId, userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating API token {TokenId} for tenant {TenantId}", tokenId, tenantId);
            return StatusCode(500, new { message = "An error occurred while updating API token" });
        }
    }

    [HttpDelete("api-tokens/{tokenId:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult> DeleteApiToken(Guid tokenId)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var apiToken = await _context.ApiTokens
                .FirstOrDefaultAsync(at => at.TenantId == tenantId && at.Id == tokenId);

            if (apiToken == null)
            {
                return NotFound(new { message = "API token not found" });
            }

            _context.ApiTokens.Remove(apiToken);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted API token {TokenId} for tenant {TenantId} by user {UserId}", tokenId, tenantId, userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting API token {TokenId} for tenant {TenantId}", tokenId, tenantId);
            return StatusCode(500, new { message = "An error occurred while deleting API token" });
        }
    }

    [HttpPost("api-tokens/{tokenId:guid}/deactivate")]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult> DeactivateApiToken(Guid tokenId)
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var apiToken = await _context.ApiTokens
                .FirstOrDefaultAsync(at => at.TenantId == tenantId && at.Id == tokenId);

            if (apiToken == null)
            {
                return NotFound(new { message = "API token not found" });
            }

            apiToken.IsActive = false;
            apiToken.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deactivated API token {TokenId} for tenant {TenantId} by user {UserId}", tokenId, tenantId, userId);
            return Ok(new { message = "API token deactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating API token {TokenId} for tenant {TenantId}", tokenId, tenantId);
            return StatusCode(500, new { message = "An error occurred while deactivating API token" });
        }
    }

    // Audit Log Management
    [HttpGet("audit-logs")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<AuditLogListResponse>> GetAuditLogs([FromQuery] AuditLogSearchRequest request)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var query = _context.AuditLogs
                .Where(al => al.TenantId == tenantId)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(request.UserId))
            {
                if (Guid.TryParse(request.UserId, out var userIdGuid))
                {
                    query = query.Where(al => al.UserId == userIdGuid);
                }
            }

            if (!string.IsNullOrEmpty(request.Action))
            {
                query = query.Where(al => EF.Functions.ILike(al.Action, $"%{request.Action}%"));
            }

            if (!string.IsNullOrEmpty(request.ResourceType))
            {
                query = query.Where(al => EF.Functions.ILike(al.ResourceType, $"%{request.ResourceType}%"));
            }

            if (!string.IsNullOrEmpty(request.ResourceId))
            {
                query = query.Where(al => al.ResourceId == request.ResourceId);
            }

            if (request.StartDate.HasValue)
            {
                query = query.Where(al => al.CreatedAt >= request.StartDate.Value);
            }

            if (request.EndDate.HasValue)
            {
                query = query.Where(al => al.CreatedAt <= request.EndDate.Value);
            }

            if (request.Success.HasValue)
            {
                query = query.Where(al => al.Success == request.Success.Value);
            }

            var totalCount = await query.CountAsync();

            var auditLogs = await query
                .Include(al => al.User)
                .OrderByDescending(al => al.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(al => new AuditLogResponse
                {
                    Id = al.Id,
                    UserName = al.User != null ? al.User.Name : "System",
                    Action = al.Action,
                    ResourceType = al.ResourceType,
                    ResourceId = al.ResourceId,
                    OldValues = string.IsNullOrEmpty(al.OldValues) ? null : 
                        JsonSerializer.Deserialize<Dictionary<string, object>>(al.OldValues),
                    NewValues = string.IsNullOrEmpty(al.NewValues) ? null : 
                        JsonSerializer.Deserialize<Dictionary<string, object>>(al.NewValues),
                    IPAddress = al.IPAddress,
                    Success = al.Success,
                    ErrorMessage = al.ErrorMessage,
                    CreatedAt = al.CreatedAt
                })
                .ToListAsync();

            var response = new AuditLogListResponse
            {
                Items = auditLogs,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };

            _logger.LogInformation("Retrieved {Count} audit logs for tenant {TenantId}", auditLogs.Count, tenantId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit logs for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving audit logs" });
        }
    }

    private string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashedBytes);
    }
}