using ProductivityHub.Api.Configuration;

namespace ProductivityHub.Api.Extensions;

public static class ConfigurationExtensions
{
    public static IServiceCollection AddConfigurationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Load environment variables from .env files
        LoadEnvironmentVariables();

        // Configure strongly-typed configuration objects
        services.Configure<DatabaseConfiguration>(config =>
        {
            config.ConnectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING")
                ?? configuration.GetConnectionString("DefaultConnection")
                ?? string.Empty;
            
            config.MinPoolSize = GetIntFromEnvironment("DATABASE_MIN_POOL_SIZE") ?? 5;
            config.MaxPoolSize = GetIntFromEnvironment("DATABASE_MAX_POOL_SIZE") ?? 100;
            config.CommandTimeout = GetIntFromEnvironment("DATABASE_COMMAND_TIMEOUT") ?? 30;
            config.RetryCount = GetIntFromEnvironment("DATABASE_RETRY_COUNT") ?? 3;
            config.RetryDelaySeconds = GetIntFromEnvironment("DATABASE_RETRY_DELAY_SECONDS") ?? 5;
        });

        services.Configure<RedisConfiguration>(config =>
        {
            config.ConnectionString = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING")
                ?? configuration.GetSection("Redis")["ConnectionString"]
                ?? string.Empty;
            
            config.DefaultDatabase = GetIntFromEnvironment("REDIS_DEFAULT_DATABASE") ?? 0;
            config.ConnectTimeout = GetIntFromEnvironment("REDIS_CONNECT_TIMEOUT") ?? 10000;
            config.SyncTimeout = GetIntFromEnvironment("REDIS_SYNC_TIMEOUT") ?? 5000;
        });

        services.Configure<JwtConfiguration>(config =>
        {
            var jwtSection = configuration.GetSection("Jwt");
            
            config.Secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? jwtSection["Secret"]
                ?? string.Empty;
            
            config.Issuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
                ?? jwtSection["Issuer"]
                ?? "political-productivity-hub";
            
            config.Audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
                ?? jwtSection["Audience"]
                ?? "political-productivity-hub";
            
            config.ExpiresInMinutes = GetIntFromEnvironment("JWT_EXPIRES_IN_MINUTES")
                ?? jwtSection.GetValue<int>("ExpiresInMinutes", 1440);
            
            config.RequireHttps = GetBoolFromEnvironment("JWT_REQUIRE_HTTPS") ?? false;
            config.ValidateIssuer = GetBoolFromEnvironment("JWT_VALIDATE_ISSUER") ?? true;
            config.ValidateAudience = GetBoolFromEnvironment("JWT_VALIDATE_AUDIENCE") ?? true;
            config.ValidateLifetime = GetBoolFromEnvironment("JWT_VALIDATE_LIFETIME") ?? true;
            config.ClockSkewSeconds = GetIntFromEnvironment("JWT_CLOCK_SKEW_SECONDS") ?? 0;
        });

        services.Configure<ExternalApiConfiguration>(config =>
        {
            var externalApiSection = configuration.GetSection("ExternalApis");
            
            config.Sms.ApiKey = Environment.GetEnvironmentVariable("SMS_API_KEY")
                ?? externalApiSection["Sms:ApiKey"]
                ?? string.Empty;
            
            config.Sms.ApiUrl = Environment.GetEnvironmentVariable("SMS_API_URL")
                ?? externalApiSection["Sms:ApiUrl"]
                ?? string.Empty;
            
            config.Sms.RateLimitPerMinute = GetIntFromEnvironment("SMS_RATE_LIMIT_PER_MINUTE") ?? 100;
            config.Sms.TimeoutSeconds = GetIntFromEnvironment("SMS_TIMEOUT_SECONDS") ?? 30;
            
            config.Kakao.ApiKey = Environment.GetEnvironmentVariable("KAKAO_API_KEY")
                ?? externalApiSection["Kakao:ApiKey"]
                ?? string.Empty;
            
            config.Kakao.ApiUrl = Environment.GetEnvironmentVariable("KAKAO_API_URL")
                ?? externalApiSection["Kakao:ApiUrl"]
                ?? string.Empty;
            
            config.Kakao.RateLimitPerMinute = GetIntFromEnvironment("KAKAO_RATE_LIMIT_PER_MINUTE") ?? 200;
            config.Kakao.TimeoutSeconds = GetIntFromEnvironment("KAKAO_TIMEOUT_SECONDS") ?? 30;
        });

        services.Configure<SecurityConfiguration>(config =>
        {
            config.EnableStrictTransportSecurity = GetBoolFromEnvironment("ENABLE_STRICT_TRANSPORT_SECURITY") ?? false;
            config.EnableContentSecurityPolicy = GetBoolFromEnvironment("ENABLE_CONTENT_SECURITY_POLICY") ?? false;
            config.RequireHttps = GetBoolFromEnvironment("REQUIRE_HTTPS") ?? false;
            config.HstsMaxAgeSeconds = GetIntFromEnvironment("HSTS_MAX_AGE_SECONDS") ?? 31536000;
            config.HstsIncludeSubdomains = GetBoolFromEnvironment("HSTS_INCLUDE_SUBDOMAINS") ?? true;
            config.EnableXFrameOptions = GetBoolFromEnvironment("ENABLE_X_FRAME_OPTIONS") ?? true;
            config.EnableXContentTypeOptions = GetBoolFromEnvironment("ENABLE_X_CONTENT_TYPE_OPTIONS") ?? true;
            config.EnableReferrerPolicy = GetBoolFromEnvironment("ENABLE_REFERRER_POLICY") ?? true;
            
            config.RateLimit.RequestsPerMinute = GetIntFromEnvironment("RATE_LIMIT_REQUESTS_PER_MINUTE") ?? 100;
            config.RateLimit.EnableRateLimiting = GetBoolFromEnvironment("ENABLE_RATE_LIMITING") ?? true;
            config.RateLimit.SkipSuccessfulRequests = GetBoolFromEnvironment("RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS") ?? false;
            config.RateLimit.RateLimitByIp = GetBoolFromEnvironment("RATE_LIMIT_BY_IP") ?? true;
            config.RateLimit.RateLimitByUser = GetBoolFromEnvironment("RATE_LIMIT_BY_USER") ?? false;
            config.RateLimit.WindowMinutes = GetIntFromEnvironment("RATE_LIMIT_WINDOW_MINUTES") ?? 10;
        });

        services.Configure<ApplicationConfiguration>(config =>
        {
            config.Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
            config.FrontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3003";
            config.BackendUrl = Environment.GetEnvironmentVariable("BACKEND_URL") ?? "http://localhost:5284";
            
            var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
                ?? configuration.GetSection("Cors")["AllowedOrigins"];
            
            if (!string.IsNullOrEmpty(allowedOrigins))
            {
                config.AllowedOrigins = allowedOrigins.Split(',').Select(o => o.Trim()).ToList();
            }
            
            // Feature flags
            config.Features.EnableSwagger = GetBoolFromEnvironment("ENABLE_SWAGGER") ?? true;
            config.Features.EnableDebugEndpoints = GetBoolFromEnvironment("ENABLE_DEBUG_ENDPOINTS") ?? false;
            config.Features.EnableHotReload = GetBoolFromEnvironment("ENABLE_HOT_RELOAD") ?? false;
            config.Features.EnableDetailedErrors = GetBoolFromEnvironment("ENABLE_DETAILED_ERRORS") ?? true;
            config.Features.EnableTelemetry = GetBoolFromEnvironment("ENABLE_TELEMETRY") ?? false;
            config.Features.EnableHealthChecks = GetBoolFromEnvironment("ENABLE_HEALTH_CHECKS") ?? true;
            
            // File upload
            config.FileUpload.MaxSizeMB = GetIntFromEnvironment("MAX_UPLOAD_SIZE_MB") ?? 50;
            config.FileUpload.UploadPath = Environment.GetEnvironmentVariable("UPLOAD_PATH") ?? "./uploads";
            config.FileUpload.TempPath = Environment.GetEnvironmentVariable("TEMP_PATH") ?? "./temp";
            config.FileUpload.AwsS3BucketName = Environment.GetEnvironmentVariable("AWS_S3_BUCKET_NAME");
            config.FileUpload.AwsS3Region = Environment.GetEnvironmentVariable("AWS_S3_REGION");
            
            // Logging
            config.Logging.LogLevel = Environment.GetEnvironmentVariable("LOG_LEVEL") ?? "Information";
            config.Logging.EnableConsoleLogging = GetBoolFromEnvironment("ENABLE_CONSOLE_LOGGING") ?? true;
            config.Logging.EnableFileLogging = GetBoolFromEnvironment("ENABLE_FILE_LOGGING") ?? false;
            config.Logging.LogFilePath = Environment.GetEnvironmentVariable("LOG_FILE_PATH") ?? "./logs/app.log";
            config.Logging.EnableStructuredLogging = GetBoolFromEnvironment("ENABLE_STRUCTURED_LOGGING") ?? false;
            config.Logging.LogFormat = Environment.GetEnvironmentVariable("LOG_FORMAT") ?? "text";
            config.Logging.IncludeScopes = GetBoolFromEnvironment("LOG_INCLUDE_SCOPES") ?? false;
            config.Logging.MaxFileSizeMB = GetIntFromEnvironment("LOG_MAX_FILE_SIZE_MB") ?? 100;
            config.Logging.MaxFiles = GetIntFromEnvironment("LOG_MAX_FILES") ?? 30;
        });

        // Register the configuration service
        services.AddSingleton<IConfigurationService, ConfigurationService>();

        return services;
    }

    private static void LoadEnvironmentVariables()
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        
        // Load environment-specific .env files
        var envFiles = new[]
        {
            ".env",
            $".env.{environment.ToLowerInvariant()}",
            ".env.local"
        };

        foreach (var envFile in envFiles)
        {
            if (File.Exists(envFile))
            {
                LoadDotEnvFile(envFile);
            }
        }
    }

    private static void LoadDotEnvFile(string filePath)
    {
        try
        {
            var lines = File.ReadAllLines(filePath);
            
            foreach (var line in lines)
            {
                // Skip empty lines and comments
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                    continue;

                var parts = line.Split('=', 2);
                if (parts.Length == 2)
                {
                    var key = parts[0].Trim();
                    var value = parts[1].Trim().Trim('"').Trim('\'');
                    
                    // Only set if not already set (environment variables take precedence)
                    if (Environment.GetEnvironmentVariable(key) == null)
                    {
                        Environment.SetEnvironmentVariable(key, value);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not load .env file '{filePath}': {ex.Message}");
        }
    }

    private static int? GetIntFromEnvironment(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return int.TryParse(value, out var result) ? result : null;
    }

    private static bool? GetBoolFromEnvironment(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return bool.TryParse(value, out var result) ? result : null;
    }
}