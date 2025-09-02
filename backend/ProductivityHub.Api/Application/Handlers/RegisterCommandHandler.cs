using BCrypt.Net;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Commands;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Services;

namespace ProductivityHub.Api.Application.Handlers;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResult>
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly ILogger<RegisterCommandHandler> _logger;

    public RegisterCommandHandler(
        ApplicationDbContext context,
        IJwtService jwtService,
        ILogger<RegisterCommandHandler> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _logger = logger;
    }

    public async Task<RegisterResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (existingUser != null)
            {
                return new RegisterResult
                {
                    Success = false,
                    Message = "User with this email already exists"
                };
            }

            // Check if tenant exists, create if not
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Name == request.TenantName, cancellationToken);

            if (tenant == null)
            {
                tenant = new Tenant
                {
                    Id = Guid.NewGuid(),
                    Name = request.TenantName,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Tenants.Add(tenant);
            }

            // Create new user
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            var user = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Email = request.Email,
                Name = request.Name,
                PasswordHash = passwordHash,
                Role = request.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            // Generate JWT token
            var token = _jwtService.GenerateToken(user);
            var expiresAt = _jwtService.GetTokenExpiration();

            return new RegisterResult
            {
                Success = true,
                Message = "User registered successfully",
                Token = token,
                ExpiresAt = expiresAt,
                User = new UserInfo
                {
                    Id = user.Id,
                    Email = user.Email,
                    Name = user.Name,
                    Role = user.Role,
                    TenantId = user.TenantId,
                    TenantName = tenant.Name
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration");
            return new RegisterResult
            {
                Success = false,
                Message = "An error occurred during registration"
            };
        }
    }
}