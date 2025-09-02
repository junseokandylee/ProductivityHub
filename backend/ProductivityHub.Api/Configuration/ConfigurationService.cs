using Microsoft.Extensions.Options;

namespace ProductivityHub.Api.Configuration;

public interface IConfigurationService
{
    DatabaseConfiguration Database { get; }
    RedisConfiguration Redis { get; }
    JwtConfiguration Jwt { get; }
    ExternalApiConfiguration ExternalApis { get; }
    SecurityConfiguration Security { get; }
    ApplicationConfiguration Application { get; }
    
    string GetConnectionString();
    string GetRedisConnectionString();
    bool IsProduction();
    bool IsDevelopment();
    void ValidateConfiguration();
}

public class ConfigurationService : IConfigurationService
{
    public DatabaseConfiguration Database { get; }
    public RedisConfiguration Redis { get; }
    public JwtConfiguration Jwt { get; }
    public ExternalApiConfiguration ExternalApis { get; }
    public SecurityConfiguration Security { get; }
    public ApplicationConfiguration Application { get; }

    private readonly ILogger<ConfigurationService> _logger;

    public ConfigurationService(
        IOptions<DatabaseConfiguration> database,
        IOptions<RedisConfiguration> redis,
        IOptions<JwtConfiguration> jwt,
        IOptions<ExternalApiConfiguration> externalApis,
        IOptions<SecurityConfiguration> security,
        IOptions<ApplicationConfiguration> application,
        ILogger<ConfigurationService> logger)
    {
        Database = database.Value;
        Redis = redis.Value;
        Jwt = jwt.Value;
        ExternalApis = externalApis.Value;
        Security = security.Value;
        Application = application.Value;
        _logger = logger;

        ValidateConfiguration();
    }

    public string GetConnectionString()
    {
        // Try environment variable first, then configuration
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING") 
                             ?? Database.ConnectionString;

        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("Database connection string is not configured. Please set DATABASE_CONNECTION_STRING environment variable or configure Database:ConnectionString in appsettings.json");
        }

        return connectionString;
    }

    public string GetRedisConnectionString()
    {
        // Try environment variable first, then configuration
        var connectionString = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING") 
                             ?? Redis.ConnectionString;

        if (string.IsNullOrEmpty(connectionString))
        {
            _logger.LogWarning("Redis connection string is not configured. Redis features will be disabled.");
            return string.Empty;
        }

        return connectionString;
    }

    public bool IsProduction()
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") 
                        ?? Application.Environment;
        return string.Equals(environment, "Production", StringComparison.OrdinalIgnoreCase);
    }

    public bool IsDevelopment()
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") 
                        ?? Application.Environment;
        return string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase);
    }

    public void ValidateConfiguration()
    {
        var errors = new List<string>();

        // Validate JWT configuration
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? Jwt.Secret;
        if (string.IsNullOrEmpty(jwtSecret))
        {
            errors.Add("JWT Secret is required. Set JWT_SECRET environment variable.");
        }
        else if (jwtSecret.Length < 32)
        {
            errors.Add("JWT Secret must be at least 32 characters long.");
        }

        if (string.IsNullOrEmpty(Jwt.Issuer))
        {
            errors.Add("JWT Issuer is required.");
        }

        if (string.IsNullOrEmpty(Jwt.Audience))
        {
            errors.Add("JWT Audience is required.");
        }

        // Validate database configuration
        if (string.IsNullOrEmpty(GetConnectionString()) && !IsDevelopment())
        {
            errors.Add("Database connection string is required for non-development environments.");
        }

        // Production-specific validations
        if (IsProduction())
        {
            if (Application.Features.EnableSwagger)
            {
                _logger.LogWarning("Swagger is enabled in production environment. This may expose sensitive API information.");
            }

            if (Application.Features.EnableDebugEndpoints)
            {
                errors.Add("Debug endpoints must be disabled in production.");
            }

            if (Application.Features.EnableDetailedErrors)
            {
                _logger.LogWarning("Detailed errors are enabled in production. This may expose sensitive information.");
            }

            if (!Security.RequireHttps)
            {
                errors.Add("HTTPS must be required in production.");
            }

            if (!Security.EnableStrictTransportSecurity)
            {
                _logger.LogWarning("Strict Transport Security (HSTS) is disabled in production.");
            }
        }

        if (errors.Any())
        {
            var errorMessage = "Configuration validation failed:\n" + string.Join("\n", errors);
            _logger.LogError(errorMessage);
            throw new InvalidOperationException(errorMessage);
        }

        _logger.LogInformation("Configuration validation completed successfully.");
    }
}