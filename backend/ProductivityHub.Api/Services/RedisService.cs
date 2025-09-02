using StackExchange.Redis;

namespace ProductivityHub.Api.Services;

public class RedisService : IRedisService, IDisposable
{
    private readonly IConnectionMultiplexer _connection;
    private readonly IDatabase _database;
    private readonly ILogger<RedisService> _logger;

    public RedisService(IConnectionMultiplexer connection, ILogger<RedisService> logger)
    {
        _connection = connection;
        _database = connection.GetDatabase();
        _logger = logger;
    }

    public async Task<bool> IsConnectedAsync()
    {
        try
        {
            return _connection.IsConnected && await _database.PingAsync() != TimeSpan.Zero;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis connection check failed");
            return false;
        }
    }

    public async Task<bool> SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        try
        {
            return await _database.StringSetAsync(key, value, expiry);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis SET operation failed for key: {Key}", key);
            return false;
        }
    }

    public async Task<string?> GetAsync(string key)
    {
        try
        {
            var value = await _database.StringGetAsync(key);
            return value.HasValue ? value.ToString() : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis GET operation failed for key: {Key}", key);
            return null;
        }
    }

    public async Task<bool> DeleteAsync(string key)
    {
        try
        {
            return await _database.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis DELETE operation failed for key: {Key}", key);
            return false;
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            return await _database.KeyExistsAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis EXISTS operation failed for key: {Key}", key);
            return false;
        }
    }

    public async Task<long> IncrementAsync(string key)
    {
        try
        {
            return await _database.StringIncrementAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis INCREMENT operation failed for key: {Key}", key);
            return 0;
        }
    }

    public async Task<long> DecrementAsync(string key)
    {
        try
        {
            return await _database.StringDecrementAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis DECREMENT operation failed for key: {Key}", key);
            return 0;
        }
    }

    public async Task<bool> SetHashAsync(string key, string field, string value)
    {
        try
        {
            return await _database.HashSetAsync(key, field, value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis HSET operation failed for key: {Key}, field: {Field}", key, field);
            return false;
        }
    }

    public async Task<string?> GetHashAsync(string key, string field)
    {
        try
        {
            var value = await _database.HashGetAsync(key, field);
            return value.HasValue ? value.ToString() : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis HGET operation failed for key: {Key}, field: {Field}", key, field);
            return null;
        }
    }

    public async Task<bool> DeleteHashAsync(string key, string field)
    {
        try
        {
            return await _database.HashDeleteAsync(key, field);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis HDEL operation failed for key: {Key}, field: {Field}", key, field);
            return false;
        }
    }

    public async Task<long> ListPushAsync(string key, string value)
    {
        try
        {
            return await _database.ListLeftPushAsync(key, value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis LPUSH operation failed for key: {Key}", key);
            return 0;
        }
    }

    public async Task<string?> ListPopAsync(string key)
    {
        try
        {
            var value = await _database.ListRightPopAsync(key);
            return value.HasValue ? value.ToString() : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis RPOP operation failed for key: {Key}", key);
            return null;
        }
    }

    public async Task<long> ListLengthAsync(string key)
    {
        try
        {
            return await _database.ListLengthAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis LLEN operation failed for key: {Key}", key);
            return 0;
        }
    }

    public async Task<string> StreamAddAsync(string streamKey, IDictionary<string, string> fields)
    {
        try
        {
            var nameValuePairs = fields.Select(kvp => new NameValueEntry(kvp.Key, kvp.Value)).ToArray();
            var messageId = await _database.StreamAddAsync(streamKey, nameValuePairs);
            return messageId.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis XADD operation failed for stream: {StreamKey}", streamKey);
            return string.Empty;
        }
    }

    public async Task<string> StreamAddAsync(string streamKey, string field, string value)
    {
        try
        {
            var messageId = await _database.StreamAddAsync(streamKey, field, value);
            return messageId.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis XADD operation failed for stream: {StreamKey}", streamKey);
            return string.Empty;
        }
    }

    public async Task PublishToStreamAsync(string streamKey, string message)
    {
        try
        {
            await _database.StreamAddAsync(streamKey, "data", message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis XADD publish operation failed for stream: {StreamKey}", streamKey);
            throw;
        }
    }

    public async IAsyncEnumerable<string> SubscribeToStreamAsync(string streamKey, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var lastId = "0-0";
        
        while (!cancellationToken.IsCancellationRequested)
        {
            StreamEntry[]? entries = null;
            bool hasError = false;
            
            try
            {
                entries = await _database.StreamReadAsync(streamKey, lastId, count: 10);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                yield break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error reading from Redis stream {StreamKey}", streamKey);
                hasError = true;
            }
            
            if (hasError)
            {
                await Task.Delay(5000, cancellationToken); // Wait longer on error
                continue;
            }
            
            if (entries?.Length > 0)
            {
                foreach (var entry in entries)
                {
                    lastId = entry.Id;
                    
                    // Find the "data" field in the stream entry
                    var dataField = entry.Values.FirstOrDefault(v => v.Name == "data");
                    if (dataField.Value.HasValue)
                    {
                        yield return dataField.Value.ToString();
                    }
                }
            }
            else
            {
                // No new messages, wait before polling again
                await Task.Delay(1000, cancellationToken);
            }
        }
    }

    public void Dispose()
    {
        _connection?.Dispose();
    }
}