using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using ProductivityHub.Api;
using ProductivityHub.Api.Configuration;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Endpoints;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Services;
using ProductivityHub.Api.Middleware;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Add configuration services (loads environment variables and configuration)
builder.Services.AddConfigurationServices(builder.Configuration);

// Add services to the container with environment-based database configuration
builder.Services.AddDbContextPool<ApplicationDbContext>(options =>
{
    if (builder.Environment.IsDevelopment())
    {
        // Use in-memory database for development to avoid connection issues
        options.UseInMemoryDatabase("ProductivityHubDev");
        Console.WriteLine("✓ Using in-memory database for development environment");
    }
    else
    {
        // Use PostgreSQL for production and staging
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING") 
                             ?? builder.Configuration.GetConnectionString("DefaultConnection");
        
        options.UseNpgsql(connectionString, npgsqlOptions =>
        {
            // Optimize for high-performance workloads with 100K+ contacts
            npgsqlOptions.CommandTimeout(30); // 30 second timeout for complex queries
            npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), null);
        });
        
        Console.WriteLine("✓ Using PostgreSQL database for production environment");
    }
    
    // Enable query compilation caching and splitting for better performance
    options.EnableSensitiveDataLogging(builder.Environment.IsDevelopment());
    options.EnableDetailedErrors(builder.Environment.IsDevelopment());
    options.EnableServiceProviderCaching();
}, poolSize: 100); // Optimize pool size for high concurrency

// Configure Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(provider =>
{
    var connectionString = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING") 
                         ?? builder.Configuration.GetSection("Redis:ConnectionString").Value;
    var password = Environment.GetEnvironmentVariable("REDIS_PASSWORD") 
                 ?? builder.Configuration.GetSection("Redis:Password").Value;
                         
    var logger = provider.GetRequiredService<ILogger<Program>>();
    
    if (string.IsNullOrEmpty(connectionString))
    {
        logger.LogWarning("Redis connection string not configured. Redis features will be disabled.");
        return null!;
    }
    
    try
    {
        var config = ConfigurationOptions.Parse(connectionString);
        
        if (!string.IsNullOrEmpty(password))
        {
            config.Password = password;
            logger.LogInformation("Redis configured with authentication");
        }
        else
        {
            logger.LogInformation("Redis configured without authentication");
        }
        
        config.AbortOnConnectFail = false;
        config.ConnectRetry = 3;
        config.ConnectTimeout = 5000;
        
        return ConnectionMultiplexer.Connect(config);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to connect to Redis server at {ConnectionString}", connectionString);
        return null!;
    }
});

builder.Services.AddScoped<IRedisService, RedisService>();

// Add JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();

// Add Pricing Service
builder.Services.AddScoped<IPricingService, PricingService>();

// Add Alert Evaluation Service
builder.Services.AddScoped<IAlertEvaluationService, AlertEvaluationService>();

// Add Contact Management Services
builder.Services.AddScoped<IEncryptionService, EncryptionService>();

// Performance-optimized contact service with caching
builder.Services.AddDistributedMemoryCache(); // Fallback if Redis not available

builder.Services.AddScoped<IContactCacheService, ContactCacheService>();
builder.Services.AddScoped<IContactService, OptimizedContactService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IContactImportService, ContactImportService>();
builder.Services.AddScoped<IDeduplicationService, DeduplicationService>();

// Add Segment Builder Services
builder.Services.AddScoped<ISegmentEvaluationService, SegmentEvaluationService>();
builder.Services.AddScoped<ISegmentService, SegmentService>();

// Add Activity Scoring Services
builder.Services.AddScoped<IActivityScoringService, ActivityScoringService>();

// Add Bulk Operations Services
builder.Services.AddScoped<ISelectionTokenService, SelectionTokenService>();
builder.Services.AddScoped<IBulkOperationsService, BulkOperationsService>();

// Add Export Services
builder.Services.AddScoped<IContactExportService, ContactExportService>();

// Add Database Seed Service
builder.Services.AddScoped<DatabaseSeedService>();

// Configure Host Options to prevent background service failures from stopping the app
builder.Services.Configure<HostOptions>(hostOptions =>
{
    hostOptions.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

// Add Metrics Aggregator Background Service
builder.Services.AddHostedService<MetricsAggregatorService>();

// Add Contact Import Processor Background Service
builder.Services.AddHostedService<ContactImportProcessorService>();

// Add Activity Scoring Background Services
builder.Services.AddHostedService<ActivityScoringBackgroundService>();
builder.Services.AddSingleton<ActivityScoringEventService>();

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddCheck<MetricsHealthCheck>("metrics-aggregator");

// Add JWT Authentication with enhanced configuration
var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET") 
              ?? builder.Configuration.GetSection("Jwt")["Secret"];
              
if (string.IsNullOrEmpty(secretKey))
{
    throw new InvalidOperationException("JWT Secret not configured. Set JWT_SECRET environment variable.");
}
var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwtSection = builder.Configuration.GetSection("Jwt");
    
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? jwtSection["Issuer"],
        ValidateAudience = true,
        ValidAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? jwtSection["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Add CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

// Configure OpenAPI/Swagger based on feature flags
var enableSwagger = Environment.GetEnvironmentVariable("ENABLE_SWAGGER")?.ToLowerInvariant() == "true" 
                   || builder.Configuration.GetValue<bool>("Features:EnableSwagger", true);
                   
if (enableSwagger)
{
    builder.Services.AddOpenApi();
    builder.Services.AddSwaggerGen();
}

var app = builder.Build();

// Handle seed data command line argument
await app.HandleSeedDataAsync(args);

// Automatically initialize database for development environment
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        // Ensure database is created (critical for in-memory database)
        await context.Database.EnsureCreatedAsync();
        
        // Check if we need to seed data (if no users exist)
        var hasUsers = await context.Users.AnyAsync();
        if (!hasUsers)
        {
            var encryptionService = scope.ServiceProvider.GetRequiredService<IEncryptionService>();
            var seedService = new DatabaseSeedService(context, 
                scope.ServiceProvider.GetRequiredService<ILogger<DatabaseSeedService>>(),
                encryptionService);
            logger.LogInformation("🌱 No existing data found, seeding development database...");
            await seedService.SeedAsync();
            logger.LogInformation("✅ Development database seeded successfully!");
        }
        else
        {
            logger.LogInformation("✅ Development database already contains data, skipping seeding");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error during automatic database initialization");
        // Don't exit in development - let the app continue without seeded data
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Add performance monitoring middleware early in the pipeline
app.UseMiddleware<EnhancedPerformanceMonitoringMiddleware>();

// Enable CORS for all routes
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

// Health check endpoints
app.MapGet("/health/database", async (ApplicationDbContext db) =>
{
    try
    {
        await db.Database.CanConnectAsync();
        return Results.Ok(new { status = "healthy", database = "connected" });
    }
    catch (Exception ex)
    {
        return Results.Json(
            new { status = "unhealthy", database = "disconnected", error = ex.Message }, 
            statusCode: 503
        );
    }
})
.WithName("DatabaseHealthCheck");

app.MapGet("/health/redis", async (IRedisService redis) =>
{
    try
    {
        var isConnected = await redis.IsConnectedAsync();
        if (isConnected)
        {
            return Results.Ok(new { status = "healthy", redis = "connected" });
        }
        else
        {
            return Results.Json(
                new { status = "unhealthy", redis = "disconnected" }, 
                statusCode: 503
            );
        }
    }
    catch (Exception ex)
    {
        return Results.Json(
            new { status = "unhealthy", redis = "disconnected", error = ex.Message }, 
            statusCode: 503
        );
    }
})
.WithName("RedisHealthCheck");

// Performance metrics endpoint for monitoring
app.MapGet("/metrics/performance", () =>
{
    var metrics = EnhancedPerformanceMonitoringMiddleware.GetPerformanceMetrics();
    return Results.Ok(metrics);
})
.WithName("PerformanceMetrics");

app.MapGet("/health", async (ApplicationDbContext db, IRedisService redis) =>
{
    var health = new
    {
        status = "healthy",
        timestamp = DateTime.UtcNow,
        services = new
        {
            database = "unknown",
            redis = "unknown"
        }
    };

    try
    {
        var dbConnected = await db.Database.CanConnectAsync();
        var redisConnected = await redis.IsConnectedAsync();

        var services = new
        {
            database = dbConnected ? "healthy" : "unhealthy",
            redis = redisConnected ? "healthy" : "unhealthy"
        };

        var overallStatus = dbConnected && redisConnected ? "healthy" : "degraded";

        return Results.Ok(new
        {
            status = overallStatus,
            timestamp = DateTime.UtcNow,
            services
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            status = "unhealthy",
            timestamp = DateTime.UtcNow,
            error = ex.Message,
            services = health.services
        }, statusCode: 503);
    }
})
.WithName("OverallHealthCheck");

// Comprehensive health check endpoint
app.MapHealthChecks("/health/metrics")
.WithName("MetricsHealthCheck");

// Metrics aggregator performance endpoint
app.MapGet("/health/metrics/performance", (IServiceProvider services) =>
{
    try
    {
        var hostedServices = services.GetServices<IHostedService>();
        var metricsService = hostedServices.OfType<MetricsAggregatorService>().FirstOrDefault();
        
        if (metricsService == null)
        {
            return Results.Json(new { error = "MetricsAggregatorService not found" }, statusCode: 503);
        }

        var metrics = metricsService.GetMetrics();
        return Results.Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            performance = new
            {
                events_processed = metrics.EventsProcessed,
                events_failed = metrics.EventsFailed,
                batches_processed = metrics.BatchesProcessed,
                last_processed_time = metrics.LastProcessedTime,
                uptime_seconds = metrics.UptimeSeconds,
                events_per_second = Math.Round(metrics.EventsPerSecond, 2),
                success_rate_percent = Math.Round(metrics.SuccessRate, 2),
                processed_events_in_memory = metrics.ProcessedEventsInMemory
            },
            thresholds = new
            {
                target_throughput = "≥50 msg/s",
                max_dashboard_lag = "≤5 seconds",
                success_rate_target = "≥99%"
            }
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new 
        { 
            error = "Failed to get metrics performance", 
            message = ex.Message 
        }, statusCode: 503);
    }
})
.WithName("MetricsPerformance");

// Hello World endpoint using MediatR
app.MapGet("/hello", async (IMediator mediator, string? name) =>
{
    var query = new ProductivityHub.Api.Application.Queries.HelloWorldQuery { Name = name };
    var result = await mediator.Send(query);
    return Results.Ok(new { message = result, timestamp = DateTime.UtcNow });
})
.WithName("HelloWorld");

// Authentication endpoints
app.MapPost("/auth/register", async (IMediator mediator, ProductivityHub.Api.Application.Commands.RegisterCommand command) =>
{
    var result = await mediator.Send(command);
    
    if (result.Success)
    {
        return Results.Ok(result);
    }
    
    return Results.BadRequest(result);
})
.WithName("Register");

app.MapPost("/auth/login", async (IMediator mediator, ProductivityHub.Api.Application.Commands.LoginCommand command) =>
{
    var result = await mediator.Send(command);
    
    if (result.Success)
    {
        return Results.Ok(result);
    }
    
    return Results.Unauthorized();
})
.WithName("Login");

// Protected endpoint to test authentication
app.MapGet("/auth/profile", async (HttpContext context, ApplicationDbContext db) =>
{
    var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    var userEmail = context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
    var userRole = context.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    var tenantId = context.User.FindFirst("tenant_id")?.Value;
    
    if (userId == null)
    {
        return Results.Unauthorized();
    }

    var user = await db.Users
        .Include(u => u.Tenant)
        .FirstOrDefaultAsync(u => u.Id == Guid.Parse(userId));

    if (user == null)
    {
        return Results.NotFound();
    }

    return Results.Ok(new
    {
        id = user.Id,
        email = user.Email,
        name = user.Name,
        role = user.Role,
        tenantId = user.TenantId,
        tenantName = user.Tenant.Name,
        lastLoginAt = user.LastLoginAt
    });
})
.RequireAuthorization()
.WithName("GetProfile");

// Campaign API endpoints
app.MapPost("/api/campaigns", async (IMediator mediator, ProductivityHub.Api.DTOs.CreateCampaignRequest request, HttpContext context) =>
{
    try
    {
        var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var command = new ProductivityHub.Api.Application.Commands.CreateCampaignCommand
        {
            Request = request,
            UserId = Guid.Parse(userId),
            TenantId = Guid.Parse(tenantId)
        };

        var result = await mediator.Send(command);

        return result.Status switch
        {
            "Queued" => Results.Accepted($"/api/campaigns/{result.CampaignId}", result),
            "ValidationFailed" => Results.BadRequest(result),
            "QuotaExceeded" => Results.Conflict(result),
            "Error" => Results.Problem(result.Message),
            _ => Results.Json(result, statusCode: 500)
        };
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("CreateCampaign");

app.MapPost("/api/campaigns/estimate", async (IMediator mediator, ProductivityHub.Api.DTOs.EstimateCampaignRequest request, HttpContext context) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var command = new ProductivityHub.Api.Application.Commands.EstimateCampaignCommand
        {
            Request = request,
            TenantId = Guid.Parse(tenantId)
        };

        var result = await mediator.Send(command);

        if (result.RecipientCount == 0 && result.EstimatedCost == 0 && !result.QuotaOk)
        {
            return Results.BadRequest(new { message = "Unable to estimate campaign. Please check your audience selection." });
        }

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("EstimateCampaign");

// Contacts API endpoints
app.MapGet("/api/contacts/groups", async (IMediator mediator, HttpContext context, string? search = null, int page = 1, int pageSize = 50) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Queries.GetContactGroupsQuery(
            Guid.Parse(tenantId), search, page, pageSize);

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("GetContactGroups");

app.MapGet("/api/contacts/segments", async (IMediator mediator, HttpContext context, string? search = null, int page = 1, int pageSize = 50) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Queries.GetContactSegmentsQuery(
            Guid.Parse(tenantId), search, page, pageSize);

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("GetContactSegments");

app.MapPost("/api/contacts/estimate", async (IMediator mediator, ProductivityHub.Api.DTOs.EstimateAudienceRequest request, HttpContext context) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Queries.EstimateAudienceQuery(
            Guid.Parse(tenantId), request.GroupIds, request.SegmentIds, request.FilterJson);

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("EstimateAudience");

app.MapPost("/api/contacts/sample", async (IMediator mediator, ProductivityHub.Api.DTOs.SampleContactRequest request, HttpContext context) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Queries.GetSampleContactQuery(
            Guid.Parse(tenantId), request.GroupIds, request.SegmentIds, request.FilterJson);

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("GetSampleContact");

app.MapPost("/api/templates/preview", async (IMediator mediator, ProductivityHub.Api.DTOs.PreviewTemplateRequest request, HttpContext context) =>
{
    try
    {
        var query = new ProductivityHub.Api.Application.Queries.PreviewTemplateQuery(
            request.MessageBody, request.Title, request.Variables);

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("PreviewTemplate");

app.MapGet("/api/channels/status", async (IMediator mediator, HttpContext context) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Handlers.GetChannelStatusQuery(Guid.Parse(tenantId));

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("GetChannelStatus");

app.MapGet("/api/quotas/current", async (IMediator mediator, HttpContext context) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Handlers.GetCurrentQuotaQuery(Guid.Parse(tenantId));

        var result = await mediator.Send(query);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("GetCurrentQuota");

// Campaign metrics endpoint
app.MapGet("/api/campaigns/{campaignId}/metrics", async (
    IMediator mediator, 
    HttpContext context, 
    Guid campaignId,
    int windowMinutes = 60,
    bool includeTimeseries = true) =>
{
    try
    {
        var tenantId = context.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            return Results.Unauthorized();
        }

        var query = new ProductivityHub.Api.Application.Queries.GetCampaignMetricsQuery(
            campaignId, 
            Guid.Parse(tenantId), 
            windowMinutes, 
            includeTimeseries);

        // Validate query parameters
        if (!query.IsValid(out var errorMessage))
        {
            return Results.BadRequest(new { error = errorMessage });
        }

        var result = await mediator.Send(query);

        if (result == null)
        {
            return Results.NotFound(new { error = "Campaign not found or not accessible" });
        }

        // Add cache control headers for real-time data
        context.Response.Headers["Cache-Control"] = "no-store";
        context.Response.Headers["Pragma"] = "no-cache";

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Internal server error: {ex.Message}");
    }
})
.RequireAuthorization()
.WithName("GetCampaignMetrics");

// Map campaign alert endpoints
app.MapCampaignAlertEndpoints();

// Map contact management endpoints
app.MapContactEndpoints();
app.MapTagEndpoints();
app.MapContactImportEndpoints();
app.MapDeduplicationEndpoints();
app.MapBulkOperationsEndpoints();
app.MapContactExportEndpoints();

// Map activity score endpoints
app.MapActivityScoreEndpoints();

// Test Redis operations (when Redis server is available)
app.MapPost("/redis/test", async (IRedisService redis) =>
{
    try
    {
        var key = "test:key";
        var value = $"test-value-{DateTime.UtcNow:yyyy-MM-dd-HH:mm:ss}";
        
        var setResult = await redis.SetAsync(key, value);
        if (!setResult)
        {
            return Results.BadRequest(new { error = "Failed to set Redis value" });
        }
        
        var getValue = await redis.GetAsync(key);
        if (getValue != value)
        {
            return Results.BadRequest(new { error = "Retrieved value doesn't match set value" });
        }
        
        var deleteResult = await redis.DeleteAsync(key);
        
        return Results.Ok(new 
        { 
            message = "Redis operations test successful",
            operations = new 
            {
                set = setResult,
                get = getValue,
                delete = deleteResult
            }
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new 
        { 
            error = "Redis operations test failed", 
            message = ex.Message 
        }, statusCode: 503);
    }
})
.WithName("TestRedisOperations");

// Root endpoint
app.MapGet("/", () => new 
{
    Name = "ProductivityHub API",
    Version = "1.0.0",
    Status = "Running",
    Timestamp = DateTime.UtcNow,
    Endpoints = new 
    {
        Health = "/health",
        Swagger = "/swagger",
        OpenAPI = "/openapi/v1.json"
    }
})
.WithName("GetApiInfo")
.WithTags("Info");

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
