using System.Security.Claims;

namespace ProductivityHub.Api.Extensions;

public static class HttpContextExtensions
{
    /// <summary>
    /// Gets the tenant ID from the current HTTP context user claims
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The tenant ID or Guid.Empty if not found</returns>
    public static Guid GetTenantId(this HttpContext context)
    {
        var tenantIdClaim = context.User?.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantIdClaim))
        {
            // Fallback to a default tenant ID or throw an exception
            // For now, returning Empty to prevent null reference issues
            return Guid.Empty;
        }
        
        return Guid.TryParse(tenantIdClaim, out var tenantId) ? tenantId : Guid.Empty;
    }
    
    /// <summary>
    /// Gets the user ID from the current HTTP context user claims
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <returns>The user ID or Guid.Empty if not found</returns>
    public static Guid GetUserId(this HttpContext context)
    {
        var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                         context.User?.FindFirst("sub")?.Value;
        
        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Guid.Empty;
        }
        
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }
}

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Gets the tenant ID from the claims principal
    /// </summary>
    /// <param name="user">The claims principal</param>
    /// <returns>The tenant ID or Guid.Empty if not found</returns>
    public static Guid GetTenantId(this ClaimsPrincipal user)
    {
        var tenantIdClaim = user?.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantIdClaim))
        {
            return Guid.Empty;
        }
        
        return Guid.TryParse(tenantIdClaim, out var tenantId) ? tenantId : Guid.Empty;
    }
    
    /// <summary>
    /// Gets the user ID from the claims principal
    /// </summary>
    /// <param name="user">The claims principal</param>
    /// <returns>The user ID or Guid.Empty if not found</returns>
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var userIdClaim = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                         user?.FindFirst("sub")?.Value;
        
        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Guid.Empty;
        }
        
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }
}