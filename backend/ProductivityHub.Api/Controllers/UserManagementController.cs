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
[Route("api/settings/users")]
[Authorize]
public class UserManagementController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UserManagementController> _logger;

    public UserManagementController(ApplicationDbContext context, ILogger<UserManagementController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<UserListResponse>> GetUsers([FromQuery] UserSearchRequest request)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var query = _context.Users
                .Where(u => u.TenantId == tenantId)
                .AsQueryable();

            // Apply search filter
            if (!string.IsNullOrEmpty(request.Search))
            {
                query = query.Where(u => 
                    EF.Functions.ILike(u.Name, $"%{request.Search}%") ||
                    EF.Functions.ILike(u.Email, $"%{request.Search}%"));
            }

            // Apply role filter
            if (!string.IsNullOrEmpty(request.Role))
            {
                query = query.Where(u => u.Role == request.Role);
            }

            // Apply active status filter
            if (request.IsActive.HasValue)
            {
                query = query.Where(u => u.IsActive == request.IsActive.Value);
            }

            var totalCount = await query.CountAsync();

            var users = await query
                .OrderBy(u => u.Name)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Email = u.Email,
                    Name = u.Name,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                })
                .ToListAsync();

            var response = new UserListResponse
            {
                Items = users,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };

            _logger.LogInformation("Retrieved {Count} users for tenant {TenantId}", users.Count, tenantId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving users for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving users" });
        }
    }

    [HttpGet("{userId:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<UserResponse>> GetUser(Guid userId)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var user = await _context.Users
                .Where(u => u.TenantId == tenantId && u.Id == userId)
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Email = u.Email,
                    Name = u.Name,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    LastLoginAt = u.LastLoginAt,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user {UserId} for tenant {TenantId}", userId, tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving user" });
        }
    }

    [HttpPut("{userId:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<UserResponse>> UpdateUser(Guid userId, [FromBody] UserUpdateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var currentUserId = User.GetUserId();

        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Prevent self-modification of critical attributes
            if (user.Id == currentUserId)
            {
                if (request.Role != null && request.Role != user.Role)
                {
                    return BadRequest(new { message = "Cannot change your own role" });
                }

                if (request.IsActive == false)
                {
                    return BadRequest(new { message = "Cannot deactivate your own account" });
                }
            }

            // Prevent non-owners from modifying owners
            var currentUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == currentUserId);

            if (currentUser?.Role != "Owner" && user.Role == "Owner")
            {
                return Forbid("Only owners can modify owner accounts");
            }

            // Update fields if provided
            if (request.Name != null)
            {
                user.Name = request.Name;
            }

            if (request.Role != null)
            {
                // Validate role
                if (!new[] { "Owner", "Admin", "Staff" }.Contains(request.Role))
                {
                    return BadRequest(new { message = "Invalid role specified" });
                }
                user.Role = request.Role;
            }

            if (request.IsActive.HasValue)
            {
                user.IsActive = request.IsActive.Value;
            }

            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var response = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };

            _logger.LogInformation("Updated user {UserId} for tenant {TenantId} by user {CurrentUserId}", userId, tenantId, currentUserId);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user {UserId} for tenant {TenantId}", userId, tenantId);
            return StatusCode(500, new { message = "An error occurred while updating user" });
        }
    }

    [HttpDelete("{userId:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult> DeleteUser(Guid userId)
    {
        var tenantId = User.GetTenantId();
        var currentUserId = User.GetUserId();

        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Prevent self-deletion
            if (user.Id == currentUserId)
            {
                return BadRequest(new { message = "Cannot delete your own account" });
            }

            // Prevent non-owners from deleting owners
            var currentUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == currentUserId);

            if (currentUser?.Role != "Owner" && user.Role == "Owner")
            {
                return Forbid("Only owners can delete owner accounts");
            }

            // Check if this is the last owner
            if (user.Role == "Owner")
            {
                var ownerCount = await _context.Users
                    .CountAsync(u => u.TenantId == tenantId && u.Role == "Owner" && u.IsActive);

                if (ownerCount <= 1)
                {
                    return BadRequest(new { message = "Cannot delete the last owner account" });
                }
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted user {UserId} for tenant {TenantId} by user {CurrentUserId}", userId, tenantId, currentUserId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId} for tenant {TenantId}", userId, tenantId);
            return StatusCode(500, new { message = "An error occurred while deleting user" });
        }
    }

    // User Invitation Management
    [HttpPost("invitations")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<UserInvitationResponse>> InviteUser([FromBody] UserInvitationRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var tenantId = User.GetTenantId();
        var currentUserId = User.GetUserId();

        try
        {
            // Check if user with this email already exists
            var existingUser = await _context.Users
                .AnyAsync(u => u.TenantId == tenantId && u.Email == request.Email);

            if (existingUser)
            {
                return BadRequest(new { message = "A user with this email already exists" });
            }

            // Check if there's already a pending invitation
            var existingInvitation = await _context.UserInvitations
                .AnyAsync(ui => ui.TenantId == tenantId && ui.Email == request.Email && ui.Status == InvitationStatus.Pending);

            if (existingInvitation)
            {
                return BadRequest(new { message = "An invitation has already been sent to this email" });
            }

            // Validate role
            if (!new[] { "Owner", "Admin", "Staff" }.Contains(request.Role))
            {
                return BadRequest(new { message = "Invalid role specified" });
            }

            // Generate invitation token
            var invitationToken = GenerateInvitationToken();

            var invitation = new UserInvitation
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Email = request.Email,
                Name = request.Name,
                Role = request.Role,
                InvitationToken = invitationToken,
                Message = request.Message,
                CreatedBy = currentUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UserInvitations.Add(invitation);
            await _context.SaveChangesAsync();

            // Reload with navigation properties
            invitation = await _context.UserInvitations
                .Include(ui => ui.CreatedByUser)
                .FirstAsync(ui => ui.Id == invitation.Id);

            var response = new UserInvitationResponse
            {
                Id = invitation.Id,
                Email = invitation.Email,
                Name = invitation.Name,
                Role = invitation.Role,
                Status = invitation.Status,
                ExpiresAt = invitation.ExpiresAt,
                AcceptedAt = invitation.AcceptedAt,
                Message = invitation.Message,
                CreatedAt = invitation.CreatedAt,
                CreatedByName = invitation.CreatedByUser.Name
            };

            _logger.LogInformation("Created user invitation {InvitationId} for email {Email} to tenant {TenantId} by user {UserId}", 
                invitation.Id, request.Email, tenantId, currentUserId);

            // TODO: Send invitation email
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user invitation for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while creating invitation" });
        }
    }

    [HttpGet("invitations")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<List<UserInvitationResponse>>> GetInvitations()
    {
        var tenantId = User.GetTenantId();

        try
        {
            var invitations = await _context.UserInvitations
                .Where(ui => ui.TenantId == tenantId)
                .Include(ui => ui.CreatedByUser)
                .OrderByDescending(ui => ui.CreatedAt)
                .Select(ui => new UserInvitationResponse
                {
                    Id = ui.Id,
                    Email = ui.Email,
                    Name = ui.Name,
                    Role = ui.Role,
                    Status = ui.Status,
                    ExpiresAt = ui.ExpiresAt,
                    AcceptedAt = ui.AcceptedAt,
                    Message = ui.Message,
                    CreatedAt = ui.CreatedAt,
                    CreatedByName = ui.CreatedByUser.Name
                })
                .ToListAsync();

            return Ok(invitations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving invitations for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An error occurred while retrieving invitations" });
        }
    }

    [HttpPost("invitations/{invitationId:guid}/resend")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult> ResendInvitation(Guid invitationId)
    {
        var tenantId = User.GetTenantId();
        var currentUserId = User.GetUserId();

        try
        {
            var invitation = await _context.UserInvitations
                .FirstOrDefaultAsync(ui => ui.TenantId == tenantId && ui.Id == invitationId);

            if (invitation == null)
            {
                return NotFound(new { message = "Invitation not found" });
            }

            if (invitation.Status != InvitationStatus.Pending)
            {
                return BadRequest(new { message = "Only pending invitations can be resent" });
            }

            // Update expiration date
            invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);
            invitation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Resent user invitation {InvitationId} for tenant {TenantId} by user {UserId}", 
                invitationId, tenantId, currentUserId);

            // TODO: Send invitation email again

            return Ok(new { message = "Invitation resent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resending invitation {InvitationId} for tenant {TenantId}", invitationId, tenantId);
            return StatusCode(500, new { message = "An error occurred while resending invitation" });
        }
    }

    [HttpDelete("invitations/{invitationId:guid}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult> RevokeInvitation(Guid invitationId)
    {
        var tenantId = User.GetTenantId();
        var currentUserId = User.GetUserId();

        try
        {
            var invitation = await _context.UserInvitations
                .FirstOrDefaultAsync(ui => ui.TenantId == tenantId && ui.Id == invitationId);

            if (invitation == null)
            {
                return NotFound(new { message = "Invitation not found" });
            }

            if (invitation.Status != InvitationStatus.Pending)
            {
                return BadRequest(new { message = "Only pending invitations can be revoked" });
            }

            invitation.Status = InvitationStatus.Revoked;
            invitation.RevokedAt = DateTime.UtcNow;
            invitation.RevokedBy = currentUserId;
            invitation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Revoked user invitation {InvitationId} for tenant {TenantId} by user {UserId}", 
                invitationId, tenantId, currentUserId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking invitation {InvitationId} for tenant {TenantId}", invitationId, tenantId);
            return StatusCode(500, new { message = "An error occurred while revoking invitation" });
        }
    }

    private string GenerateInvitationToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }
}