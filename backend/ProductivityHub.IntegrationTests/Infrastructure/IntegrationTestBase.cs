using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Services;
using System.IdentityModel.Tokens.Jwt;

namespace ProductivityHub.IntegrationTests.Infrastructure;

public abstract class IntegrationTestBase : IClassFixture<IntegrationTestWebApplicationFactory>
{
    protected readonly IntegrationTestWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    protected readonly ApplicationDbContext DbContext;

    // Test tenant and user data
    protected readonly Guid TestTenantId = Guid.Parse("550e8400-e29b-41d4-a716-446655440000");
    protected readonly Guid TestUserId = Guid.Parse("550e8400-e29b-41d4-a716-446655440001");
    protected readonly string TestUserName = "Test User";

    protected readonly Guid OtherTenantId = Guid.Parse("550e8400-e29b-41d4-a716-446655440002");
    protected readonly Guid OtherUserId = Guid.Parse("550e8400-e29b-41d4-a716-446655440003");

    protected IntegrationTestBase(IntegrationTestWebApplicationFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
        DbContext = factory.GetDbContext();
        
        // Set up authentication
        SetupAuthentication();
    }

    private void SetupAuthentication()
    {
        var token = GenerateJwtToken(TestTenantId, TestUserId, TestUserName);
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    protected void AuthenticateAsOtherTenant()
    {
        var token = GenerateJwtToken(OtherTenantId, OtherUserId, "Other User");
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    protected void AuthenticateAsTenant(Guid tenantId, Guid userId, string userName)
    {
        var token = GenerateJwtToken(tenantId, userId, userName);
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private string GenerateJwtToken(Guid tenantId, Guid userId, string userName)
    {
        var jwtService = Factory.Services.GetRequiredService<IJwtService>();
        
        var claims = new List<Claim>
        {
            new("sub", userId.ToString()),
            new("user_id", userId.ToString()),
            new("tenant_id", tenantId.ToString()),
            new("name", userName),
            new("username", userName),
            new("role", "Admin"),
            new("jti", Guid.NewGuid().ToString()),
            new("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        // Use the same key and settings as the main application
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("your-super-secret-key-that-is-at-least-32-characters-long"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "ProductivityHub",
            audience: "ProductivityHub",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    protected async Task<T> PostAsync<T>(string requestUri, object content)
    {
        var json = JsonSerializer.Serialize(content);
        var stringContent = new StringContent(json, Encoding.UTF8, "application/json");
        
        var response = await Client.PostAsync(requestUri, stringContent);
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(responseContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        })!;
    }

    protected async Task<T> GetAsync<T>(string requestUri)
    {
        var response = await Client.GetAsync(requestUri);
        response.EnsureSuccessStatusCode();
        
        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(responseContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        })!;
    }

    protected async Task CleanupDbAsync()
    {
        // Clean up test data in reverse order of dependencies
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM contact_tags WHERE contact_id IN (SELECT id FROM contacts WHERE tenant_id = {0})", TestTenantId);
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM contact_history WHERE contact_id IN (SELECT id FROM contacts WHERE tenant_id = {0})", TestTenantId);
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM contacts WHERE tenant_id = {0}", TestTenantId);
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM tags WHERE tenant_id = {0}", TestTenantId);
        
        // Also clean other tenant data
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM contact_tags WHERE contact_id IN (SELECT id FROM contacts WHERE tenant_id = {0})", OtherTenantId);
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM contact_history WHERE contact_id IN (SELECT id FROM contacts WHERE tenant_id = {0})", OtherTenantId);
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM contacts WHERE tenant_id = {0}", OtherTenantId);
        await DbContext.Database.ExecuteSqlRawAsync("DELETE FROM tags WHERE tenant_id = {0}", OtherTenantId);
    }
}