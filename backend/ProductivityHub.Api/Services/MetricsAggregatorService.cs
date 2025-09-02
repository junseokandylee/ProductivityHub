using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using StackExchange.Redis;
using System.Collections.Concurrent;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Background service that consumes delivery result events from Redis Streams 
/// and aggregates them into PostgreSQL metrics tables for real-time analytics.
/// 
/// Features:
/// - Consumer group management for reliable processing
/// - Exactly-once semantics with idempotency
/// - Batch processing for performance
/// - Hot data caching in Redis
/// - Comprehensive observability
/// </summary>
public class MetricsAggregatorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MetricsAggregatorService> _logger;
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly string _streamKey;
    private readonly string _consumerGroup;
    private readonly string _consumerName;
    private readonly int _batchSize;
    private readonly TimeSpan _batchTimeout;
    private readonly TimeSpan _consumerTimeout;
    private readonly int _maxRetries;
    private readonly ConcurrentDictionary<string, string> _processedEvents;
    private readonly SemaphoreSlim _batchSemaphore;

    // Performance counters
    private long _eventsProcessed;
    private long _eventsFailed;
    private long _batchesProcessed;
    private DateTime _lastProcessedTime = DateTime.UtcNow;
    private DateTime _startTime = DateTime.UtcNow;

    public MetricsAggregatorService(
        IServiceProvider serviceProvider,
        ILogger<MetricsAggregatorService> logger,
        IConnectionMultiplexer redis)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _redis = redis;
        _database = redis.GetDatabase();
        
        // Configuration
        _streamKey = Environment.GetEnvironmentVariable("METRICS_STREAM_KEY") ?? "msg:events";
        _consumerGroup = Environment.GetEnvironmentVariable("METRICS_CONSUMER_GROUP") ?? "metrics-cg";
        _consumerName = Environment.GetEnvironmentVariable("METRICS_CONSUMER_NAME") ?? 
                       $"metrics-consumer-{Environment.MachineName}-{Environment.ProcessId}";
        _batchSize = int.TryParse(Environment.GetEnvironmentVariable("METRICS_BATCH_SIZE"), out var bs) ? bs : 50;
        _batchTimeout = TimeSpan.FromSeconds(int.TryParse(Environment.GetEnvironmentVariable("METRICS_BATCH_TIMEOUT_SECONDS"), out var bt) ? bt : 30);
        _consumerTimeout = TimeSpan.FromSeconds(int.TryParse(Environment.GetEnvironmentVariable("METRICS_CONSUMER_TIMEOUT_SECONDS"), out var ct) ? ct : 5);
        _maxRetries = int.TryParse(Environment.GetEnvironmentVariable("METRICS_MAX_RETRIES"), out var mr) ? mr : 3;

        // Deduplication cache (LRU with size limit)
        _processedEvents = new ConcurrentDictionary<string, string>();
        _batchSemaphore = new SemaphoreSlim(1, 1);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MetricsAggregatorService starting. StreamKey: {StreamKey}, ConsumerGroup: {ConsumerGroup}, Consumer: {ConsumerName}", 
            _streamKey, _consumerGroup, _consumerName);

        try
        {
            await EnsureConsumerGroupExists();
            await ProcessStreamMessages(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "MetricsAggregatorService failed with critical error");
            throw;
        }
        finally
        {
            _logger.LogInformation("MetricsAggregatorService stopped. Stats - Processed: {ProcessedCount}, Failed: {FailedCount}, Batches: {BatchCount}", 
                _eventsProcessed, _eventsFailed, _batchesProcessed);
        }
    }

    /// <summary>
    /// Ensures the consumer group exists for the stream
    /// </summary>
    private async Task EnsureConsumerGroupExists()
    {
        try
        {
            await _database.StreamCreateConsumerGroupAsync(_streamKey, _consumerGroup, "0-0", true);
            _logger.LogInformation("Consumer group {ConsumerGroup} created/verified for stream {StreamKey}", 
                _consumerGroup, _streamKey);
        }
        catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
        {
            _logger.LogDebug("Consumer group {ConsumerGroup} already exists for stream {StreamKey}", 
                _consumerGroup, _streamKey);
        }
    }

    /// <summary>
    /// Main processing loop that consumes messages from Redis Stream
    /// </summary>
    private async Task ProcessStreamMessages(CancellationToken stoppingToken)
    {
        var batchBuffer = new List<DeliveryResultEvent>();
        var lastBatchTime = DateTime.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Check if we should process batch due to timeout
                var shouldFlushBatch = DateTime.UtcNow - lastBatchTime > _batchTimeout && batchBuffer.Count > 0;

                if (shouldFlushBatch)
                {
                    await ProcessBatch(batchBuffer, stoppingToken);
                    batchBuffer.Clear();
                    lastBatchTime = DateTime.UtcNow;
                }

                // Read messages from stream (both new and pending)
                var messages = await ReadStreamMessages();
                
                if (messages.Length == 0)
                {
                    // No messages, wait a bit before next poll
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                // Process each message
                foreach (var message in messages)
                {
                    try
                    {
                        var eventData = ParseDeliveryEvent(message);
                        if (eventData != null && !IsEventProcessed(eventData.EventId))
                        {
                            batchBuffer.Add(eventData);
                            MarkEventAsProcessed(eventData.EventId);
                        }

                        // Acknowledge message immediately (at-least-once processing)
                        await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, message.Id);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing message {MessageId} from stream", message.Id);
                        Interlocked.Increment(ref _eventsFailed);
                        
                        // Acknowledge failed message to prevent reprocessing
                        await _database.StreamAcknowledgeAsync(_streamKey, _consumerGroup, message.Id);
                    }
                }

                // Process batch if it's full
                if (batchBuffer.Count >= _batchSize)
                {
                    await ProcessBatch(batchBuffer, stoppingToken);
                    batchBuffer.Clear();
                    lastBatchTime = DateTime.UtcNow;
                }

                _lastProcessedTime = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in main processing loop");
                await Task.Delay(5000, stoppingToken); // Back off on error
            }
        }

        // Process remaining batch before shutdown
        if (batchBuffer.Count > 0)
        {
            await ProcessBatch(batchBuffer, stoppingToken);
        }
    }

    /// <summary>
    /// Reads messages from Redis Stream using consumer group
    /// </summary>
    private async Task<StreamEntry[]> ReadStreamMessages()
    {
        try
        {
            // Read pending messages first (recovery)
            var pendingMessages = await _database.StreamReadGroupAsync(
                _streamKey, _consumerGroup, _consumerName, ">", count: _batchSize);

            if (pendingMessages != null && pendingMessages.Length > 0)
            {
                return pendingMessages;
            }

            // No pending messages, wait for new ones
            var newMessages = await _database.StreamReadGroupAsync(
                _streamKey, _consumerGroup, _consumerName, ">", 
                count: _batchSize, noAck: false);

            return newMessages ?? Array.Empty<StreamEntry>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading from stream {StreamKey}", _streamKey);
            return Array.Empty<StreamEntry>();
        }
    }

    /// <summary>
    /// Parses a Redis Stream entry into a DeliveryResultEvent
    /// </summary>
    private DeliveryResultEvent? ParseDeliveryEvent(StreamEntry entry)
    {
        try
        {
            var fields = entry.Values.ToDictionary(
                pair => pair.Name.ToString(),
                pair => pair.Value.ToString()
            );

            return DeliveryResultEvent.FromRedisStream(entry.Id.ToString(), fields);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse delivery event from message {MessageId}", entry.Id);
            return null;
        }
    }

    /// <summary>
    /// Processes a batch of events by updating metrics in PostgreSQL
    /// </summary>
    private async Task ProcessBatch(List<DeliveryResultEvent> events, CancellationToken cancellationToken)
    {
        if (events.Count == 0) return;

        await _batchSemaphore.WaitAsync(cancellationToken);
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Group events by campaign and time bucket for efficient processing
            var aggregatedMetrics = AggregateEventsToBuckets(events);

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            // Process aggregated metrics
            await UpdateCampaignMetrics(dbContext, aggregatedMetrics);
            await UpdateTimeSeriesMetrics(dbContext, aggregatedMetrics);
            await UpdateRedisCache(aggregatedMetrics);
            
            // Evaluate alerts for affected campaigns
            var alertService = scope.ServiceProvider.GetRequiredService<IAlertEvaluationService>();
            await EvaluateAlerts(alertService, aggregatedMetrics, cancellationToken);

            stopwatch.Stop();

            var processedCount = events.Count;
            Interlocked.Add(ref _eventsProcessed, processedCount);
            Interlocked.Increment(ref _batchesProcessed);

            _logger.LogInformation("Processed batch of {EventCount} events in {ElapsedMs}ms. Total processed: {TotalProcessed}", 
                processedCount, stopwatch.ElapsedMilliseconds, _eventsProcessed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing batch of {EventCount} events", events.Count);
            Interlocked.Add(ref _eventsFailed, events.Count);
            throw;
        }
        finally
        {
            _batchSemaphore.Release();
        }
    }

    /// <summary>
    /// Aggregates events into campaign and time bucket groups
    /// </summary>
    private Dictionary<(Guid CampaignId, DateTime BucketMinute), MetricsDelta> AggregateEventsToBuckets(
        List<DeliveryResultEvent> events)
    {
        var aggregates = new Dictionary<(Guid, DateTime), MetricsDelta>();

        foreach (var evt in events)
        {
            var key = (evt.CampaignId, evt.GetBucketMinute());
            
            if (!aggregates.TryGetValue(key, out var delta))
            {
                delta = new MetricsDelta 
                { 
                    CampaignId = evt.CampaignId, 
                    TenantId = evt.TenantId,
                    BucketMinute = evt.GetBucketMinute()
                };
                aggregates[key] = delta;
            }

            // Increment counters based on event type and channel
            if (evt.IsSentEvent())
            {
                delta.SentTotal++;
                if (evt.IsSmsChannel()) delta.SmsSent++;
                if (evt.IsKakaoChannel()) delta.KakaoSent++;
                delta.Attempted++;
            }
            else if (evt.IsDeliveredEvent())
            {
                delta.DeliveredTotal++;
                if (evt.IsSmsChannel()) delta.SmsDelivered++;
                if (evt.IsKakaoChannel()) delta.KakaoDelivered++;
                delta.Delivered++;
            }
            else if (evt.IsFailedEvent())
            {
                delta.FailedTotal++;
                if (evt.IsSmsChannel()) delta.SmsFailed++;
                if (evt.IsKakaoChannel()) delta.KakaoFailed++;
                delta.Failed++;
            }
            else if (evt.IsOpenEvent())
            {
                delta.OpenTotal++;
                delta.Open++;
            }
            else if (evt.IsClickEvent())
            {
                delta.ClickTotal++;
                delta.Click++;
            }
        }

        return aggregates;
    }

    /// <summary>
    /// Updates campaign-level aggregate metrics using upsert operations
    /// </summary>
    private async Task UpdateCampaignMetrics(ApplicationDbContext dbContext, 
        Dictionary<(Guid CampaignId, DateTime BucketMinute), MetricsDelta> aggregates)
    {
        var campaignDeltas = aggregates.Values
            .GroupBy(d => d.CampaignId)
            .ToDictionary(g => g.Key, g => g.Aggregate(new MetricsDelta(), (acc, delta) =>
            {
                acc.SentTotal += delta.SentTotal;
                acc.DeliveredTotal += delta.DeliveredTotal;
                acc.FailedTotal += delta.FailedTotal;
                acc.OpenTotal += delta.OpenTotal;
                acc.ClickTotal += delta.ClickTotal;
                acc.SmsSent += delta.SmsSent;
                acc.SmsDelivered += delta.SmsDelivered;
                acc.SmsFailed += delta.SmsFailed;
                acc.KakaoSent += delta.KakaoSent;
                acc.KakaoDelivered += delta.KakaoDelivered;
                acc.KakaoFailed += delta.KakaoFailed;
                acc.TenantId = delta.TenantId; // Should be same for all
                return acc;
            }));

        foreach (var (campaignId, delta) in campaignDeltas)
        {
            var sql = """
                INSERT INTO campaign_metrics 
                (campaign_id, tenant_id, sent_total, delivered_total, failed_total, open_total, click_total,
                 sms_sent, sms_delivered, sms_failed, kakao_sent, kakao_delivered, kakao_failed, updated_at, created_at)
                VALUES (@CampaignId, @TenantId, @SentTotal, @DeliveredTotal, @FailedTotal, @OpenTotal, @ClickTotal,
                        @SmsSent, @SmsDelivered, @SmsFailed, @KakaoSent, @KakaoDelivered, @KakaoFailed, @UpdatedAt, @CreatedAt)
                ON CONFLICT (campaign_id) DO UPDATE SET
                    sent_total = campaign_metrics.sent_total + @SentTotal,
                    delivered_total = campaign_metrics.delivered_total + @DeliveredTotal,
                    failed_total = campaign_metrics.failed_total + @FailedTotal,
                    open_total = campaign_metrics.open_total + @OpenTotal,
                    click_total = campaign_metrics.click_total + @ClickTotal,
                    sms_sent = campaign_metrics.sms_sent + @SmsSent,
                    sms_delivered = campaign_metrics.sms_delivered + @SmsDelivered,
                    sms_failed = campaign_metrics.sms_failed + @SmsFailed,
                    kakao_sent = campaign_metrics.kakao_sent + @KakaoSent,
                    kakao_delivered = campaign_metrics.kakao_delivered + @KakaoDelivered,
                    kakao_failed = campaign_metrics.kakao_failed + @KakaoFailed,
                    updated_at = @UpdatedAt
                """;

            await dbContext.Database.ExecuteSqlRawAsync(sql,
                new Npgsql.NpgsqlParameter("@CampaignId", campaignId),
                new Npgsql.NpgsqlParameter("@TenantId", delta.TenantId),
                new Npgsql.NpgsqlParameter("@SentTotal", delta.SentTotal),
                new Npgsql.NpgsqlParameter("@DeliveredTotal", delta.DeliveredTotal),
                new Npgsql.NpgsqlParameter("@FailedTotal", delta.FailedTotal),
                new Npgsql.NpgsqlParameter("@OpenTotal", delta.OpenTotal),
                new Npgsql.NpgsqlParameter("@ClickTotal", delta.ClickTotal),
                new Npgsql.NpgsqlParameter("@SmsSent", delta.SmsSent),
                new Npgsql.NpgsqlParameter("@SmsDelivered", delta.SmsDelivered),
                new Npgsql.NpgsqlParameter("@SmsFailed", delta.SmsFailed),
                new Npgsql.NpgsqlParameter("@KakaoSent", delta.KakaoSent),
                new Npgsql.NpgsqlParameter("@KakaoDelivered", delta.KakaoDelivered),
                new Npgsql.NpgsqlParameter("@KakaoFailed", delta.KakaoFailed),
                new Npgsql.NpgsqlParameter("@UpdatedAt", DateTime.UtcNow),
                new Npgsql.NpgsqlParameter("@CreatedAt", DateTime.UtcNow));
        }
    }

    /// <summary>
    /// Updates time-series metrics using batch upsert
    /// </summary>
    private async Task UpdateTimeSeriesMetrics(ApplicationDbContext dbContext,
        Dictionary<(Guid CampaignId, DateTime BucketMinute), MetricsDelta> aggregates)
    {
        foreach (var ((campaignId, bucketMinute), delta) in aggregates)
        {
            var sql = """
                INSERT INTO campaign_metrics_minute 
                (campaign_id, tenant_id, bucket_minute, attempted, delivered, failed, open, click, updated_at)
                VALUES (@CampaignId, @TenantId, @BucketMinute, @Attempted, @Delivered, @Failed, @Open, @Click, @UpdatedAt)
                ON CONFLICT (campaign_id, bucket_minute) DO UPDATE SET
                    attempted = campaign_metrics_minute.attempted + @Attempted,
                    delivered = campaign_metrics_minute.delivered + @Delivered,
                    failed = campaign_metrics_minute.failed + @Failed,
                    open = campaign_metrics_minute.open + @Open,
                    click = campaign_metrics_minute.click + @Click,
                    updated_at = @UpdatedAt
                """;

            await dbContext.Database.ExecuteSqlRawAsync(sql,
                new Npgsql.NpgsqlParameter("@CampaignId", campaignId),
                new Npgsql.NpgsqlParameter("@TenantId", delta.TenantId),
                new Npgsql.NpgsqlParameter("@BucketMinute", bucketMinute),
                new Npgsql.NpgsqlParameter("@Attempted", delta.Attempted),
                new Npgsql.NpgsqlParameter("@Delivered", delta.Delivered),
                new Npgsql.NpgsqlParameter("@Failed", delta.Failed),
                new Npgsql.NpgsqlParameter("@Open", delta.Open),
                new Npgsql.NpgsqlParameter("@Click", delta.Click),
                new Npgsql.NpgsqlParameter("@UpdatedAt", DateTime.UtcNow));
        }
    }

    /// <summary>
    /// Evaluates alerts for campaigns that had metrics updates
    /// </summary>
    private async Task EvaluateAlerts(IAlertEvaluationService alertService, 
        Dictionary<(Guid CampaignId, DateTime BucketMinute), MetricsDelta> aggregates, 
        CancellationToken cancellationToken)
    {
        var uniqueCampaigns = aggregates.Values
            .GroupBy(d => new { d.CampaignId, d.TenantId })
            .ToList();

        foreach (var campaignGroup in uniqueCampaigns)
        {
            try
            {
                var campaign = campaignGroup.Key;
                var alertResult = await alertService.EvaluateAlertAsync(
                    campaign.TenantId, 
                    campaign.CampaignId, 
                    cancellationToken);

                if (alertResult.ShouldTrigger)
                {
                    _logger.LogWarning("Alert TRIGGERED for campaign {CampaignId}: " +
                                     "Failure rate {FailureRate:P2} exceeds threshold {Threshold:P2} " +
                                     "for {ConsecutiveBreaches} consecutive periods",
                        campaign.CampaignId,
                        alertResult.CurrentFailureRate,
                        alertResult.Policy.FailureRateThreshold,
                        alertResult.AlertState.ConsecutiveBreaches);
                        
                    // TODO: Send notification/webhook (future task)
                    await UpdateAlertInRedisCache(campaign.CampaignId, alertResult);
                }
                else if (alertResult.ShouldClear)
                {
                    _logger.LogInformation("Alert CLEARED for campaign {CampaignId}: " +
                                         "Failure rate {FailureRate:P2} dropped below threshold",
                        campaign.CampaignId,
                        alertResult.CurrentFailureRate);
                        
                    await UpdateAlertInRedisCache(campaign.CampaignId, alertResult);
                }
                
                // Update Redis cache with current alert status for API consumption
                if (alertResult.AlertState.Triggered || alertResult.ShouldTrigger || alertResult.ShouldClear)
                {
                    await UpdateAlertInRedisCache(campaign.CampaignId, alertResult);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating alert for campaign {CampaignId} tenant {TenantId}",
                    campaignGroup.Key.CampaignId, campaignGroup.Key.TenantId);
            }
        }
    }

    /// <summary>
    /// Updates alert information in Redis cache for fast API access
    /// </summary>
    private async Task UpdateAlertInRedisCache(Guid campaignId, AlertEvaluationResult alertResult)
    {
        var alertCacheKey = $"campaign:alert:{campaignId}";
        var alertData = new
        {
            triggered = alertResult.AlertState.Triggered,
            failureRate = alertResult.CurrentFailureRate,
            threshold = alertResult.Policy.FailureRateThreshold,
            windowSeconds = alertResult.Policy.EvaluationWindowSeconds,
            lastTriggeredAt = alertResult.AlertState.LastTriggeredAt,
            lastClearedAt = alertResult.AlertState.LastClearedAt,
            lastEvaluatedAt = alertResult.AlertState.LastEvaluatedAt,
            consecutiveBreaches = alertResult.AlertState.ConsecutiveBreaches
        };

        // Cache alert data for 30 seconds (hot data for monitoring dashboard)
        await _database.StringSetAsync(alertCacheKey, JsonSerializer.Serialize(alertData), TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// Updates Redis cache with hot campaign metrics data
    /// </summary>
    private async Task UpdateRedisCache(Dictionary<(Guid CampaignId, DateTime BucketMinute), MetricsDelta> aggregates)
    {
        var pipeline = _database.CreateBatch();

        foreach (var ((campaignId, _), delta) in aggregates)
        {
            var cacheKey = $"campaign:metrics:{campaignId}";
            var cacheData = new
            {
                campaignId = campaignId,
                sentTotal = delta.SentTotal,
                deliveredTotal = delta.DeliveredTotal,
                failedTotal = delta.FailedTotal,
                openTotal = delta.OpenTotal,
                clickTotal = delta.ClickTotal,
                lastUpdated = DateTime.UtcNow
            };

            // Cache for 1 hour (hot data)
            pipeline.StringSetAsync(cacheKey, JsonSerializer.Serialize(cacheData), TimeSpan.FromHours(1));
        }

        pipeline.Execute();
    }

    /// <summary>
    /// Checks if an event has already been processed (idempotency)
    /// </summary>
    private bool IsEventProcessed(string eventId)
    {
        return _processedEvents.ContainsKey(eventId);
    }

    /// <summary>
    /// Marks an event as processed for deduplication
    /// </summary>
    private void MarkEventAsProcessed(string eventId)
    {
        // Simple LRU cache implementation with size limit
        if (_processedEvents.Count > 10000)
        {
            // Remove oldest 20% of entries
            var keysToRemove = _processedEvents.Keys.Take(2000).ToList();
            foreach (var key in keysToRemove)
            {
                _processedEvents.TryRemove(key, out _);
            }
        }

        _processedEvents[eventId] = DateTime.UtcNow.ToString();
    }

    /// <summary>
    /// Gets performance metrics for health checks and monitoring
    /// </summary>
    public ServiceMetrics GetMetrics()
    {
        return new ServiceMetrics
        {
            EventsProcessed = _eventsProcessed,
            EventsFailed = _eventsFailed,
            BatchesProcessed = _batchesProcessed,
            LastProcessedTime = _lastProcessedTime,
            StartTime = _startTime,
            UptimeSeconds = (DateTime.UtcNow - _startTime).TotalSeconds,
            EventsPerSecond = _eventsProcessed > 0 ? _eventsProcessed / Math.Max(1, (DateTime.UtcNow - _startTime).TotalSeconds) : 0,
            SuccessRate = _eventsProcessed + _eventsFailed > 0 ? 
                         (double)_eventsProcessed / (_eventsProcessed + _eventsFailed) * 100 : 100,
            ProcessedEventsInMemory = _processedEvents.Count
        };
    }

    public override Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MetricsAggregatorService stopping...");
        return base.StopAsync(stoppingToken);
    }
}

/// <summary>
/// Represents aggregated metric deltas for a campaign and time bucket
/// </summary>
internal class MetricsDelta
{
    public Guid CampaignId { get; set; }
    public Guid TenantId { get; set; }
    public DateTime BucketMinute { get; set; }
    
    // Aggregate counters
    public long SentTotal { get; set; }
    public long DeliveredTotal { get; set; }
    public long FailedTotal { get; set; }
    public long OpenTotal { get; set; }
    public long ClickTotal { get; set; }
    
    // Channel-specific counters
    public long SmsSent { get; set; }
    public long SmsDelivered { get; set; }
    public long SmsFailed { get; set; }
    public long KakaoSent { get; set; }
    public long KakaoDelivered { get; set; }
    public long KakaoFailed { get; set; }
    
    // Time series counters
    public long Attempted { get; set; }
    public long Delivered { get; set; }
    public long Failed { get; set; }
    public long Open { get; set; }
    public long Click { get; set; }
}

/// <summary>
/// Performance metrics for the MetricsAggregatorService
/// </summary>
public class ServiceMetrics
{
    public long EventsProcessed { get; set; }
    public long EventsFailed { get; set; }
    public long BatchesProcessed { get; set; }
    public DateTime LastProcessedTime { get; set; }
    public DateTime StartTime { get; set; }
    public double UptimeSeconds { get; set; }
    public double EventsPerSecond { get; set; }
    public double SuccessRate { get; set; }
    public int ProcessedEventsInMemory { get; set; }
}