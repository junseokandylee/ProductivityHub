using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Extensions;
using System.Text.Json;

namespace ProductivityHub.Api.Controllers;

[ApiController]
[Route("api/settings/organization")]
[Authorize]
public class OrganizationController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<OrganizationController> _logger;

    public OrganizationController(ApplicationDbContext context, ILogger<OrganizationController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<OrganizationSettingsResponse>> GetSettings()
    {
        var tenantId = User.GetTenantId();
        
        try
        {
            var settings = await _context.OrganizationSettings
                .Include(os => os.CreatedByUser)
                .Include(os => os.UpdatedByUser)
                .FirstOrDefaultAsync(os => os.TenantId == tenantId);

            if (settings == null)
            {
                // Create default settings if none exist
                var userId = User.GetUserId();
                settings = new OrganizationSettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.OrganizationSettings.Add(settings);
                await _context.SaveChangesAsync();

                // Reload with navigation properties
                settings = await _context.OrganizationSettings
                    .Include(os => os.CreatedByUser)
                    .Include(os => os.UpdatedByUser)
                    .FirstAsync(os => os.Id == settings.Id);
            }

            var response = new OrganizationSettingsResponse
            {
                Id = settings.Id,
                DisplayName = settings.DisplayName,
                Description = settings.Description,
                ContactEmail = settings.ContactEmail,
                ContactPhone = settings.ContactPhone,
                Address = settings.Address,
                WebsiteUrl = settings.WebsiteUrl,
                LogoUrl = settings.LogoUrl,
                BrandColor = settings.BrandColor ?? "#3B82F6",
                Timezone = settings.Timezone,
                Language = settings.Language,
                DateFormat = settings.DateFormat,
                TimeFormat = settings.TimeFormat,
                EnableNotifications = settings.EnableNotifications,
                EnableEmailNotifications = settings.EnableEmailNotifications,
                EnableSmsNotifications = settings.EnableSmsNotifications,
                AutoArchiveDays = settings.AutoArchiveDays,
                MaxCampaignRecipients = settings.MaxCampaignRecipients,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt,
                CreatedByName = settings.CreatedByUser.Name,
                UpdatedByName = settings.UpdatedByUser?.Name
            };

            _logger.LogInformation("Retrieved organization settings for tenant {TenantId}", tenantId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving organization settings for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving organization settings" });
        }
    }

    [HttpPut]
    public async Task<ActionResult<OrganizationSettingsResponse>> UpdateSettings([FromBody] OrganizationSettingsRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var settings = await _context.OrganizationSettings
                .FirstOrDefaultAsync(os => os.TenantId == tenantId);

            if (settings == null)
            {
                // Create new settings
                settings = new OrganizationSettings
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CreatedBy = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.OrganizationSettings.Add(settings);
            }

            // Update settings
            settings.DisplayName = request.DisplayName;
            settings.Description = request.Description;
            settings.ContactEmail = request.ContactEmail;
            settings.ContactPhone = request.ContactPhone;
            settings.Address = request.Address;
            settings.WebsiteUrl = request.WebsiteUrl;
            settings.LogoUrl = request.LogoUrl;
            settings.BrandColor = request.BrandColor ?? "#3B82F6";
            settings.Timezone = request.Timezone;
            settings.Language = request.Language;
            settings.DateFormat = request.DateFormat;
            settings.TimeFormat = request.TimeFormat;
            settings.EnableNotifications = request.EnableNotifications;
            settings.EnableEmailNotifications = request.EnableEmailNotifications;
            settings.EnableSmsNotifications = request.EnableSmsNotifications;
            settings.AutoArchiveDays = request.AutoArchiveDays;
            settings.MaxCampaignRecipients = request.MaxCampaignRecipients;
            settings.UpdatedBy = userId;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            settings = await _context.OrganizationSettings
                .Include(os => os.CreatedByUser)
                .Include(os => os.UpdatedByUser)
                .FirstAsync(os => os.Id == settings.Id);

            var response = new OrganizationSettingsResponse
            {
                Id = settings.Id,
                DisplayName = settings.DisplayName,
                Description = settings.Description,
                ContactEmail = settings.ContactEmail,
                ContactPhone = settings.ContactPhone,
                Address = settings.Address,
                WebsiteUrl = settings.WebsiteUrl,
                LogoUrl = settings.LogoUrl,
                BrandColor = settings.BrandColor ?? "#3B82F6",
                Timezone = settings.Timezone,
                Language = settings.Language,
                DateFormat = settings.DateFormat,
                TimeFormat = settings.TimeFormat,
                EnableNotifications = settings.EnableNotifications,
                EnableEmailNotifications = settings.EnableEmailNotifications,
                EnableSmsNotifications = settings.EnableSmsNotifications,
                AutoArchiveDays = settings.AutoArchiveDays,
                MaxCampaignRecipients = settings.MaxCampaignRecipients,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt,
                CreatedByName = settings.CreatedByUser.Name,
                UpdatedByName = settings.UpdatedByUser?.Name
            };

            _logger.LogInformation("Updated organization settings for tenant {TenantId} by user {UserId}", tenantId, userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating organization settings for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while updating organization settings" });
        }
    }

    [HttpPost("reset")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<OrganizationSettingsResponse>> ResetToDefaults()
    {
        var tenantId = User.GetTenantId();
        var userId = User.GetUserId();

        try
        {
            var settings = await _context.OrganizationSettings
                .FirstOrDefaultAsync(os => os.TenantId == tenantId);

            if (settings == null)
            {
                return NotFound(new { message = "Organization settings not found" });
            }

            // Reset to default values
            settings.DisplayName = null;
            settings.Description = null;
            settings.ContactEmail = null;
            settings.ContactPhone = null;
            settings.Address = null;
            settings.WebsiteUrl = null;
            settings.LogoUrl = null;
            settings.BrandColor = "#3B82F6";
            settings.Timezone = "Asia/Seoul";
            settings.Language = "ko";
            settings.DateFormat = "yyyy-MM-dd";
            settings.TimeFormat = "HH:mm";
            settings.EnableNotifications = true;
            settings.EnableEmailNotifications = true;
            settings.EnableSmsNotifications = false;
            settings.AutoArchiveDays = 90;
            settings.MaxCampaignRecipients = 100000;
            settings.UpdatedBy = userId;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Reload with navigation properties
            settings = await _context.OrganizationSettings
                .Include(os => os.CreatedByUser)
                .Include(os => os.UpdatedByUser)
                .FirstAsync(os => os.Id == settings.Id);

            var response = new OrganizationSettingsResponse
            {
                Id = settings.Id,
                DisplayName = settings.DisplayName,
                Description = settings.Description,
                ContactEmail = settings.ContactEmail,
                ContactPhone = settings.ContactPhone,
                Address = settings.Address,
                WebsiteUrl = settings.WebsiteUrl,
                LogoUrl = settings.LogoUrl,
                BrandColor = settings.BrandColor ?? "#3B82F6",
                Timezone = settings.Timezone,
                Language = settings.Language,
                DateFormat = settings.DateFormat,
                TimeFormat = settings.TimeFormat,
                EnableNotifications = settings.EnableNotifications,
                EnableEmailNotifications = settings.EnableEmailNotifications,
                EnableSmsNotifications = settings.EnableSmsNotifications,
                AutoArchiveDays = settings.AutoArchiveDays,
                MaxCampaignRecipients = settings.MaxCampaignRecipients,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt,
                CreatedByName = settings.CreatedByUser.Name,
                UpdatedByName = settings.UpdatedByUser?.Name
            };

            _logger.LogInformation("Reset organization settings to defaults for tenant {TenantId} by user {UserId}", tenantId, userId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting organization settings for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while resetting organization settings" });
        }
    }
}