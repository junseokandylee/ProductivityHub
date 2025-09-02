namespace ProductivityHub.Api.Configuration;

public class ApplicationConfiguration
{
    public const string SectionName = "Application";

    public string Environment { get; set; } = "Development";
    public string FrontendUrl { get; set; } = "http://localhost:3003";
    public string BackendUrl { get; set; } = "http://localhost:5284";
    public List<string> AllowedOrigins { get; set; } = new();
    
    public FeatureFlagsConfiguration Features { get; set; } = new();
    public FileUploadConfiguration FileUpload { get; set; } = new();
    public LoggingConfiguration Logging { get; set; } = new();
}

public class FeatureFlagsConfiguration
{
    public bool EnableSwagger { get; set; } = true;
    public bool EnableDebugEndpoints { get; set; } = false;
    public bool EnableHotReload { get; set; } = false;
    public bool EnableDetailedErrors { get; set; } = true;
    public bool EnableTelemetry { get; set; } = false;
    public bool EnableHealthChecks { get; set; } = true;
}

public class FileUploadConfiguration
{
    public int MaxSizeMB { get; set; } = 50;
    public string UploadPath { get; set; } = "./uploads";
    public string TempPath { get; set; } = "./temp";
    public string? AwsS3BucketName { get; set; }
    public string? AwsS3Region { get; set; }
}

public class LoggingConfiguration
{
    public string LogLevel { get; set; } = "Information";
    public bool EnableConsoleLogging { get; set; } = true;
    public bool EnableFileLogging { get; set; } = false;
    public string LogFilePath { get; set; } = "./logs/app.log";
    public bool EnableStructuredLogging { get; set; } = false;
    public string LogFormat { get; set; } = "text";
    public bool IncludeScopes { get; set; } = false;
    public int MaxFileSizeMB { get; set; } = 100;
    public int MaxFiles { get; set; } = 30;
}