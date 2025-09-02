using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;
using ProductivityHub.Api.Extensions;
using System.Net;

namespace ProductivityHub.Api.Attributes;

/// <summary>
/// Rate limiting attribute specifically for export endpoints
/// Limits exports to prevent abuse and resource exhaustion
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class ExportRateLimitAttribute : ActionFilterAttribute
{
    private readonly int _maxRequests;
    private readonly TimeSpan _timeWindow;
    private IMemoryCache _cache = null!;
    private ILogger<ExportRateLimitAttribute>? _logger;
    
    public ExportRateLimitAttribute(int maxRequests = 10, int timeWindowMinutes = 60)
    {
        _maxRequests = maxRequests;
        _timeWindow = TimeSpan.FromMinutes(timeWindowMinutes);
    }

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        _cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
        _logger = context.HttpContext.RequestServices.GetService<ILogger<ExportRateLimitAttribute>>();
        
        // Get user identifier (tenant + user ID)
        var tenantId = context.HttpContext.GetTenantId();
        var userId = context.HttpContext.GetUserId();
        
        if (tenantId == Guid.Empty)
        {
            context.Result = new BadRequestObjectResult(new { error = "Tenant ID is required" });
            return;
        }

        var key = $"export_rate_limit:{tenantId}:{userId}";
        var now = DateTimeOffset.UtcNow;

        // Get or create rate limit entry
        var requests = _cache.GetOrCreate(key, factory =>
        {
            factory.SlidingExpiration = _timeWindow;
            return new List<DateTimeOffset>();
        });

        if (requests == null)
        {
            requests = new List<DateTimeOffset>();
            _cache.Set(key, requests, _timeWindow);
        }

        // Remove expired requests
        requests.RemoveAll(r => now - r > _timeWindow);

        // Check if limit exceeded
        if (requests.Count >= _maxRequests)
        {
            var oldestRequest = requests.Min();
            var resetTime = oldestRequest.Add(_timeWindow);
            
            _logger?.LogWarning("Export rate limit exceeded for tenant {TenantId}, user {UserId}. Limit: {MaxRequests} per {TimeWindow} minutes", 
                tenantId, userId, _maxRequests, _timeWindow.TotalMinutes);

            context.Result = new ObjectResult(new 
            { 
                error = "Rate limit exceeded", 
                message = $"Maximum {_maxRequests} exports allowed per {_timeWindow.TotalMinutes} minutes",
                retryAfter = resetTime.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                requestsRemaining = 0,
                resetTime = resetTime.ToUnixTimeSeconds()
            })
            {
                StatusCode = (int)HttpStatusCode.TooManyRequests
            };

            context.HttpContext.Response.Headers["X-RateLimit-Limit"] = _maxRequests.ToString();
            context.HttpContext.Response.Headers["X-RateLimit-Remaining"] = "0";
            context.HttpContext.Response.Headers["X-RateLimit-Reset"] = resetTime.ToUnixTimeSeconds().ToString();
            context.HttpContext.Response.Headers["Retry-After"] = ((int)(resetTime - now).TotalSeconds).ToString();
            
            return;
        }

        // Add current request
        requests.Add(now);
        _cache.Set(key, requests, _timeWindow);

        // Add rate limit headers
        var remaining = _maxRequests - requests.Count;
        var nextReset = requests.Min().Add(_timeWindow);
        
        context.HttpContext.Response.Headers["X-RateLimit-Limit"] = _maxRequests.ToString();
        context.HttpContext.Response.Headers["X-RateLimit-Remaining"] = remaining.ToString();
        context.HttpContext.Response.Headers["X-RateLimit-Reset"] = nextReset.ToUnixTimeSeconds().ToString();

        base.OnActionExecuting(context);
    }
}