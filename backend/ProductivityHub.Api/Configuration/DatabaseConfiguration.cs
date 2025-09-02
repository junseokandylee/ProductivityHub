namespace ProductivityHub.Api.Configuration;

public class DatabaseConfiguration
{
    public const string SectionName = "Database";

    public string ConnectionString { get; set; } = string.Empty;
    public int MinPoolSize { get; set; } = 5;
    public int MaxPoolSize { get; set; } = 100;
    public int CommandTimeout { get; set; } = 30;
    public int RetryCount { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 5;
}