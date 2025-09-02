namespace ProductivityHub.Api.Services;

public interface IRedisService
{
    Task<bool> IsConnectedAsync();
    Task<bool> SetAsync(string key, string value, TimeSpan? expiry = null);
    Task<string?> GetAsync(string key);
    Task<bool> DeleteAsync(string key);
    Task<bool> ExistsAsync(string key);
    Task<long> IncrementAsync(string key);
    Task<long> DecrementAsync(string key);
    Task<bool> SetHashAsync(string key, string field, string value);
    Task<string?> GetHashAsync(string key, string field);
    Task<bool> DeleteHashAsync(string key, string field);
    Task<long> ListPushAsync(string key, string value);
    Task<string?> ListPopAsync(string key);
    Task<long> ListLengthAsync(string key);
    
    // Redis Streams support
    Task<string> StreamAddAsync(string streamKey, IDictionary<string, string> fields);
    Task<string> StreamAddAsync(string streamKey, string field, string value);
    Task PublishToStreamAsync(string streamKey, string message);
    IAsyncEnumerable<string> SubscribeToStreamAsync(string streamKey, CancellationToken cancellationToken = default);
}