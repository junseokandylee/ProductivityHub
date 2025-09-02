using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public interface IJwtService
{
    string GenerateToken(User user);
    string? ValidateToken(string token);
    DateTime GetTokenExpiration();
}