using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Services;

namespace ProductivityHub.Api;

/// <summary>
/// Extension methods for Program.cs to handle database seeding
/// </summary>
public static class ProgramSeedDataExtensions
{
    /// <summary>
    /// Seeds the database with test data if --seed argument is provided
    /// </summary>
    public static async Task HandleSeedDataAsync(this WebApplication app, string[] args)
    {
        if (args.Contains("--seed"))
        {
            using var scope = app.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            var encryptionService = scope.ServiceProvider.GetRequiredService<IEncryptionService>();
            var seedService = new DatabaseSeedService(context, 
                scope.ServiceProvider.GetRequiredService<ILogger<DatabaseSeedService>>(),
                encryptionService);

            try
            {
                // Ensure database is created (important for in-memory database)
                await context.Database.EnsureCreatedAsync();
                
                // Check if database is reachable
                var canConnect = await context.Database.CanConnectAsync();
                if (!canConnect)
                {
                    logger.LogError("Cannot connect to database. Ensure database is properly configured.");
                    Environment.Exit(1);
                }
                
                logger.LogInformation("Starting database seeding...");
                await seedService.SeedAsync();
                
                logger.LogInformation("Database seeding completed successfully!");
                
                // Exit after seeding
                Environment.Exit(0);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during database seeding");
                Environment.Exit(1);
            }
        }
    }
}