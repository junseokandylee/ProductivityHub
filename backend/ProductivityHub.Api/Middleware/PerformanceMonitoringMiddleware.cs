using System.Diagnostics;
using System.Text.Json;

namespace ProductivityHub.Api.Middleware;

public class PerformanceMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<PerformanceMonitoringMiddleware> _logger;
    private static readonly ActivitySource ActivitySource = new("ProductivityHub.Api.Performance");
    private const int SlowRequestThresholdMs = 150; // PRD requirement: <150ms p95

    public PerformanceMonitoringMiddleware(RequestDelegate next, ILogger<PerformanceMonitoringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only monitor specific performance-critical endpoints
        if (!ShouldMonitorRequest(context.Request))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString("N")[..8];
        
        using var activity = ActivitySource.StartActivity($"HTTP {context.Request.Method} {GetNormalizedPath(context.Request.Path)}");
        activity?.SetTag("http.method", context.Request.Method);
        activity?.SetTag("http.path", context.Request.Path.Value);
        activity?.SetTag("request.id", requestId);
        
        // Extract tenant info for multi-tenant monitoring
        var tenantId = ExtractTenantId(context);
        if (tenantId != null)
        {
            activity?.SetTag("tenant.id", tenantId);
        }

        try
        {
            // Add request timing headers
            context.Response.Headers.Add("X-Request-Id", requestId);
            context.Response.OnStarting(() =>
            {
                context.Response.Headers.Add("X-Response-Time", $"{stopwatch.ElapsedMilliseconds}ms");
                return Task.CompletedTask;
            });

            await _next(context);

            stopwatch.Stop();
            
            // Log performance metrics
            var performanceData = new
            {
                RequestId = requestId,
                Method = context.Request.Method,
                Path = context.Request.Path.Value,
                QueryString = context.Request.QueryString.Value,
                StatusCode = context.Response.StatusCode,
                DurationMs = stopwatch.ElapsedMilliseconds,
                TenantId = tenantId,
                Timestamp = DateTime.UtcNow
            };

            activity?.SetTag("http.status_code", context.Response.StatusCode.ToString());
            activity?.SetTag("duration.ms", stopwatch.ElapsedMilliseconds.ToString());

            // Log performance metrics with structured data
            if (stopwatch.ElapsedMilliseconds > SlowRequestThresholdMs)
            {
                _logger.LogWarning("Slow request detected: {Method} {Path} took {Duration}ms | RequestId: {RequestId} | TenantId: {TenantId} | StatusCode: {StatusCode}",
                    context.Request.Method, 
                    context.Request.Path.Value,
                    stopwatch.ElapsedMilliseconds,
                    requestId,
                    tenantId,
                    context.Response.StatusCode);
                
                activity?.SetStatus(ActivityStatusCode.Error, "Slow request");
            }
            else
            {
                _logger.LogInformation("Request completed: {Method} {Path} in {Duration}ms | RequestId: {RequestId}",
                    context.Request.Method,
                    context.Request.Path.Value,
                    stopwatch.ElapsedMilliseconds,
                    requestId);
            }

            // Record metrics for performance tracking
            RecordPerformanceMetrics(context, stopwatch.ElapsedMilliseconds, tenantId);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            
            _logger.LogError(ex, "Request failed: {Method} {Path} after {Duration}ms | RequestId: {RequestId} | TenantId: {TenantId}",
                context.Request.Method,
                context.Request.Path.Value,
                stopwatch.ElapsedMilliseconds,
                requestId,
                tenantId);
            
            throw;
        }
    }

    private static bool ShouldMonitorRequest(HttpRequest request)
    {
        var path = request.Path.Value?.ToLowerInvariant() ?? "";
        
        // Monitor performance-critical contact endpoints
        return path.StartsWith("/api/contacts") && 
               (request.Method == "GET" || request.Method == "POST") &&
               !path.Contains("/health") &&
               !path.Contains("/metrics");
    }

    private static string GetNormalizedPath(PathString path)
    {
        var pathValue = path.Value?.ToLowerInvariant() ?? "";
        
        // Normalize paths with IDs to reduce cardinality
        if (pathValue.Contains("/api/contacts/") && Guid.TryParse(pathValue.Split('/').Last(), out _))
        {
            return "/api/contacts/{id}";
        }
        
        return pathValue;
    }

    private static string? ExtractTenantId(HttpContext context)
    {
        // Try to get tenant ID from JWT claims
        var tenantClaim = context.User?.FindFirst("tenant_id")?.Value;
        if (!string.IsNullOrEmpty(tenantClaim))
        {
            return tenantClaim;
        }

        // Try to get from headers as fallback
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var headerValue))
        {
            return headerValue.FirstOrDefault();
        }

        return null;
    }

    private void RecordPerformanceMetrics(HttpContext context, long durationMs, string? tenantId)
    {
        // This can be extended to send metrics to monitoring systems like Prometheus, DataDog, etc.
        var metricsData = new
        {
            MetricType = "http_request_duration",
            Endpoint = GetNormalizedPath(context.Request.Path),
            Method = context.Request.Method,
            StatusCode = context.Response.StatusCode,
            DurationMs = durationMs,
            TenantId = tenantId,
            Timestamp = DateTime.UtcNow
        };

        // For now, we'll use structured logging
        // In production, this would be sent to a metrics collection system
        using var scope = _logger.BeginScope(metricsData);
        
        // Create performance buckets for analysis
        var performanceBucket = durationMs switch
        {
            < 50 => "fast",
            < 100 => "acceptable", 
            < 150 => "concerning",
            < 500 => "slow",
            _ => "very_slow"
        };

        _logger.LogInformation("Performance metric: {Endpoint} {Method} = {Duration}ms ({Bucket})",
            GetNormalizedPath(context.Request.Path),
            context.Request.Method,
            durationMs,
            performanceBucket);
    }
}

public static class PerformanceMonitoringMiddlewareExtensions
{
    public static IApplicationBuilder UsePerformanceMonitoring(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<PerformanceMonitoringMiddleware>();
    }
}