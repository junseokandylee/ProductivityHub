using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Health check for the MetricsAggregatorService and related infrastructure
/// </summary>
public class MetricsHealthCheck : IHealthCheck
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly ILogger<MetricsHealthCheck> _logger;
    private readonly string _streamKey;
    private readonly string _consumerGroup;

    public MetricsHealthCheck(IConnectionMultiplexer redis, ILogger<MetricsHealthCheck> logger)
    {
        _redis = redis;
        _database = redis.GetDatabase();
        _logger = logger;
        _streamKey = Environment.GetEnvironmentVariable("METRICS_STREAM_KEY") ?? "msg:events";
        _consumerGroup = Environment.GetEnvironmentVariable("METRICS_CONSUMER_GROUP") ?? "metrics-cg";
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var healthData = new Dictionary<string, object>();
            var isHealthy = true;
            var issues = new List<string>();

            // Check Redis connection
            if (!_redis.IsConnected)
            {
                isHealthy = false;
                issues.Add("Redis connection is not available");
            }
            else
            {
                healthData["redis_connected"] = true;

                try
                {
                    // Ping Redis
                    var pingResult = await _database.PingAsync();
                    healthData["redis_ping_ms"] = pingResult.TotalMilliseconds;

                    // Check stream exists
                    var streamInfo = await _database.StreamInfoAsync(_streamKey);
                    healthData["stream_length"] = streamInfo.Length;
                    healthData["stream_first_entry"] = streamInfo.FirstEntry.Id.ToString();
                    healthData["stream_last_entry"] = streamInfo.LastEntry.Id.ToString();

                    // Check consumer group exists and get info
                    try
                    {
                        var consumerGroups = await _database.StreamGroupInfoAsync(_streamKey);
                        var targetGroup = consumerGroups.FirstOrDefault(cg => cg.Name == _consumerGroup);
                        
                        if (consumerGroups.Any(cg => cg.Name == _consumerGroup))
                        {
                            healthData["consumer_group_exists"] = true;
                            healthData["consumer_group_pending"] = targetGroup.PendingMessageCount;
                            healthData["consumer_group_consumers"] = targetGroup.ConsumerCount;

                            // Get consumer info
                            var consumers = await _database.StreamConsumerInfoAsync(_streamKey, _consumerGroup);
                            healthData["active_consumers"] = consumers.Length;
                            
                            var totalPending = consumers.Sum(c => c.PendingMessageCount);
                            healthData["total_pending_messages"] = totalPending;

                            // Check if there are too many pending messages (could indicate processing issues)
                            if (totalPending > 1000)
                            {
                                issues.Add($"High pending message count: {totalPending}");
                            }

                            // Check consumer idle times
                            var maxIdleTime = consumers.Where(c => c.IdleTimeInMilliseconds > 0)
                                                     .Max(c => c.IdleTimeInMilliseconds);
                            healthData["max_consumer_idle_ms"] = maxIdleTime;

                            if (maxIdleTime > 300000) // 5 minutes
                            {
                                issues.Add($"Consumer has been idle for {maxIdleTime / 1000} seconds");
                            }
                        }
                        else
                        {
                            isHealthy = false;
                            issues.Add($"Consumer group '{_consumerGroup}' not found");
                        }
                    }
                    catch (RedisServerException ex) when (ex.Message.Contains("NOGROUP"))
                    {
                        isHealthy = false;
                        issues.Add($"Consumer group '{_consumerGroup}' does not exist");
                    }
                }
                catch (Exception ex)
                {
                    isHealthy = false;
                    issues.Add($"Error checking stream: {ex.Message}");
                }
            }

            // Add timestamp
            healthData["check_timestamp"] = DateTime.UtcNow;
            healthData["stream_key"] = _streamKey;
            healthData["consumer_group"] = _consumerGroup;

            if (isHealthy)
            {
                return HealthCheckResult.Healthy("Metrics aggregator is healthy", healthData);
            }
            else
            {
                var issuesMessage = string.Join("; ", issues);
                return HealthCheckResult.Unhealthy($"Metrics aggregator issues: {issuesMessage}", data: healthData);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during metrics health check");
            return HealthCheckResult.Unhealthy($"Health check failed: {ex.Message}");
        }
    }
}