namespace ProductivityHub.Api.Configuration;

public class RedisConfiguration
{
    public const string SectionName = "Redis";

    public string ConnectionString { get; set; } = string.Empty;
    public int DefaultDatabase { get; set; } = 0;
    public int ConnectTimeout { get; set; } = 10000;
    public int SyncTimeout { get; set; } = 5000;
}