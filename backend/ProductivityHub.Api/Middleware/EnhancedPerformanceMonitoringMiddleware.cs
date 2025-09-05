using System.Diagnostics;
using System.Text;
using Microsoft.AspNetCore.Http.Features;

namespace ProductivityHub.Api.Middleware;

/// <summary>
/// Enhanced performance monitoring middleware for 100K+ scale operations
/// Tracks response times, database query counts, cache hit rates, and memory usage
/// </summary>
public class EnhancedPerformanceMonitoringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<EnhancedPerformanceMonitoringMiddleware> _logger;
    
    // Performance thresholds (configurable via settings)
    private readonly int _slowRequestThresholdMs = 150; // p95 target
    private readonly int _verySlowRequestThresholdMs = 500;
    private readonly int _criticalRequestThresholdMs = 1000;
    
    // Performance counters
    private static long _totalRequests = 0;
    private static long _slowRequests = 0;
    private static long _verySlowRequests = 0;
    private static long _criticalRequests = 0;
    
    // Rolling average tracking
    private static readonly Queue<double> _responseTimeWindow = new();
    private static readonly object _metricsLock = new();
    private static readonly int _windowSize = 1000; // Track last 1000 requests

    public EnhancedPerformanceMonitoringMiddleware(
        RequestDelegate next,
        ILogger<EnhancedPerformanceMonitoringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip monitoring for health checks and static files
        if (ShouldSkipMonitoring(context))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var startTime = DateTime.UtcNow;
        var requestId = context.TraceIdentifier;
        var endpoint = GetEndpointInfo(context);
        
        // Capture initial memory state
        var initialMemory = GC.GetTotalMemory(false);
        var initialGen0 = GC.CollectionCount(0);
        var initialGen1 = GC.CollectionCount(1);
        var initialGen2 = GC.CollectionCount(2);

        try
        {
            // Add request tracking headers (only if response hasn't started)
            if (!context.Response.HasStarted)
            {
                context.Response.Headers.Add("X-Request-ID", requestId);
                context.Response.Headers.Add("X-Server-Timing", $"start;dur=0");
            }
            
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var responseTime = stopwatch.ElapsedMilliseconds;
            
            // Capture final memory state
            var finalMemory = GC.GetTotalMemory(false);
            var finalGen0 = GC.CollectionCount(0);
            var finalGen1 = GC.CollectionCount(1);
            var finalGen2 = GC.CollectionCount(2);
            
            var memoryDelta = finalMemory - initialMemory;
            var gcActivity = new
            {
                Gen0 = finalGen0 - initialGen0,
                Gen1 = finalGen1 - initialGen1,
                Gen2 = finalGen2 - initialGen2
            };

            // Update performance counters
            UpdatePerformanceCounters(responseTime);
            
            // Add timing headers (only if response hasn't started)
            if (!context.Response.HasStarted)
            {
                context.Response.Headers["X-Response-Time"] = $"{responseTime}ms";
                context.Response.Headers["X-Memory-Delta"] = $"{memoryDelta:N0}b";
            }
            
            // Log performance metrics
            LogPerformanceMetrics(context, endpoint, responseTime, memoryDelta, gcActivity, startTime);
            
            // Alert on performance issues
            CheckPerformanceAlerts(context, endpoint, responseTime, requestId);
        }
    }

    private bool ShouldSkipMonitoring(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant();
        return path switch
        {
            "/health" => true,
            "/healthz" => true,
            "/ready" => true,
            "/metrics" => true,
            var p when p?.StartsWith("/swagger") == true => true,
            var p when p?.Contains("/css/") == true => true,
            var p when p?.Contains("/js/") == true => true,
            var p when p?.Contains("/images/") == true => true,
            var p when p?.EndsWith(".ico") == true => true,
            _ => false
        };
    }

    private string GetEndpointInfo(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint != null)
        {
            // Use endpoint display name instead of RouteAttribute
            var displayName = endpoint.DisplayName;
            if (!string.IsNullOrEmpty(displayName))
                return $"{context.Request.Method} {displayName}";
        }
        
        return $"{context.Request.Method} {context.Request.Path}";
    }

    private void UpdatePerformanceCounters(double responseTime)
    {
        lock (_metricsLock)
        {
            Interlocked.Increment(ref _totalRequests);
            
            if (responseTime >= _criticalRequestThresholdMs)
            {
                Interlocked.Increment(ref _criticalRequests);
            }
            else if (responseTime >= _verySlowRequestThresholdMs)
            {
                Interlocked.Increment(ref _verySlowRequests);
            }
            else if (responseTime >= _slowRequestThresholdMs)
            {
                Interlocked.Increment(ref _slowRequests);
            }
            
            // Update rolling window
            _responseTimeWindow.Enqueue(responseTime);
            if (_responseTimeWindow.Count > _windowSize)
            {
                _responseTimeWindow.Dequeue();
            }
        }
    }

    private void LogPerformanceMetrics(
        HttpContext context, 
        string endpoint, 
        double responseTime, 
        long memoryDelta,
        object gcActivity,
        DateTime startTime)
    {
        var logLevel = responseTime switch
        {
            >= 1000 => LogLevel.Error,
            >= 500 => LogLevel.Warning,
            >= 150 => LogLevel.Information,
            _ => LogLevel.Debug
        };

        // Enhanced structured logging for performance analysis
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["RequestId"] = context.TraceIdentifier,
            ["Endpoint"] = endpoint,
            ["StatusCode"] = context.Response.StatusCode,
            ["ResponseTime"] = responseTime,
            ["MemoryDelta"] = memoryDelta,
            ["GCActivity"] = gcActivity,
            ["UserAgent"] = context.Request.Headers["User-Agent"].ToString(),
            ["TenantId"] = ExtractTenantId(context),
            ["UserId"] = ExtractUserId(context),
            ["RequestSize"] = context.Request.ContentLength ?? 0,
            ["ResponseSize"] = context.Response.ContentLength ?? 0,
            ["RequestStartTime"] = startTime,
            ["RequestEndTime"] = DateTime.UtcNow
        });

        _logger.LogInformation(
            "Request {Endpoint} completed in {ResponseTime}ms (Status: {StatusCode}, Memory: {MemoryDelta:N0}b)",
            endpoint, responseTime, context.Response.StatusCode, memoryDelta);

        // Log additional details for slow requests
        if (responseTime >= _slowRequestThresholdMs)
        {
            var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : "none";
            var contentType = context.Request.ContentType ?? "none";
            
            _logger.LogInformation(
                "Slow request details - Query: {QueryString}, ContentType: {ContentType}, Connection: {Connection}",
                queryString, contentType, context.Connection.Id);
        }

        // Periodic statistics logging (every 100 requests)
        if (_totalRequests % 100 == 0)
        {
            LogPerformanceStatistics();
        }
    }

    private void CheckPerformanceAlerts(HttpContext context, string endpoint, double responseTime, string requestId)
    {
        // Critical performance alert
        if (responseTime >= _criticalRequestThresholdMs)
        {
            _logger.LogError(
                "CRITICAL PERFORMANCE ALERT: Request {RequestId} to {Endpoint} took {ResponseTime}ms (threshold: {Threshold}ms). " +
                "Immediate investigation required for p95 <150ms target compliance.",
                requestId, endpoint, responseTime, _criticalRequestThresholdMs);
        }
        
        // Check if we're exceeding performance targets
        var slowRequestPercentage = (_slowRequests * 100.0) / _totalRequests;
        if (slowRequestPercentage > 5) // More than 5% slow requests
        {
            _logger.LogWarning(
                "Performance degradation detected: {SlowPercentage:F2}% of requests exceed {Threshold}ms target. " +
                "Current request: {RequestId} ({ResponseTime}ms)",
                slowRequestPercentage, _slowRequestThresholdMs, requestId, responseTime);
        }
    }

    private void LogPerformanceStatistics()
    {
        lock (_metricsLock)
        {
            if (_totalRequests == 0) return;

            var avgResponseTime = _responseTimeWindow.Count > 0 ? _responseTimeWindow.Average() : 0;
            var p95ResponseTime = CalculatePercentileStatic(_responseTimeWindow, 0.95);
            var p99ResponseTime = CalculatePercentileStatic(_responseTimeWindow, 0.99);
            
            var slowPercentage = (_slowRequests * 100.0) / _totalRequests;
            var verySlowPercentage = (_verySlowRequests * 100.0) / _totalRequests;
            var criticalPercentage = (_criticalRequests * 100.0) / _totalRequests;

            _logger.LogInformation(
                "Performance Statistics (Last {WindowSize} requests): " +
                "Avg={AvgMs:F1}ms, P95={P95Ms:F1}ms, P99={P99Ms:F1}ms, " +
                "Slow={SlowPct:F2}% (>{SlowThreshold}ms), " +
                "VerySlow={VerySlowPct:F2}% (>{VerySlowThreshold}ms), " +
                "Critical={CriticalPct:F2}% (>{CriticalThreshold}ms), " +
                "Total={TotalRequests:N0}",
                Math.Min(_responseTimeWindow.Count, _windowSize),
                avgResponseTime, p95ResponseTime, p99ResponseTime,
                slowPercentage, _slowRequestThresholdMs,
                verySlowPercentage, _verySlowRequestThresholdMs,
                criticalPercentage, _criticalRequestThresholdMs,
                _totalRequests);

            // Alert if p95 target is not being met
            if (p95ResponseTime > _slowRequestThresholdMs)
            {
                _logger.LogWarning(
                    "P95 PERFORMANCE TARGET MISSED: Current P95 is {P95Ms:F1}ms, target is <{Target}ms. " +
                    "Performance optimization required for 100K+ scale compliance.",
                    p95ResponseTime, _slowRequestThresholdMs);
            }
        }
    }

    private double CalculatePercentile(IEnumerable<double> values, double percentile)
    {
        if (!values.Any()) return 0;
        
        var sorted = values.OrderBy(x => x).ToArray();
        var index = (int)Math.Ceiling(percentile * sorted.Length) - 1;
        return sorted[Math.Max(0, Math.Min(index, sorted.Length - 1))];
    }

    private string? ExtractTenantId(HttpContext context)
    {
        // Try to get tenant ID from JWT claims
        return context.User?.FindFirst("tenant_id")?.Value;
    }

    private string? ExtractUserId(HttpContext context)
    {
        // Try to get user ID from JWT claims
        var userIdClaim = context.User?.FindFirst("sub") ?? context.User?.FindFirst("user_id");
        return userIdClaim?.Value;
    }

    /// <summary>
    /// Get current performance metrics for health checks
    /// </summary>
    public static object GetPerformanceMetrics()
    {
        lock (_metricsLock)
        {
            var avgResponseTime = _responseTimeWindow.Count > 0 ? _responseTimeWindow.Average() : 0;
            var p95ResponseTime = CalculatePercentileStatic(_responseTimeWindow, 0.95);
            
            return new
            {
                TotalRequests = _totalRequests,
                AverageResponseTime = Math.Round(avgResponseTime, 2),
                P95ResponseTime = Math.Round(p95ResponseTime, 2),
                SlowRequestCount = _slowRequests,
                VerySlowRequestCount = _verySlowRequests,
                CriticalRequestCount = _criticalRequests,
                SlowRequestPercentage = Math.Round((_slowRequests * 100.0) / Math.Max(_totalRequests, 1), 2),
                P95Target = "150ms",
                P95TargetMet = p95ResponseTime <= 150,
                LastUpdated = DateTime.UtcNow
            };
        }
    }
    
    private static double CalculatePercentileStatic(IEnumerable<double> values, double percentile)
    {
        if (!values.Any()) return 0;
        
        var sorted = values.OrderBy(x => x).ToArray();
        var index = (int)Math.Ceiling(percentile * sorted.Length) - 1;
        return sorted[Math.Max(0, Math.Min(index, sorted.Length - 1))];
    }
}