using System.Data;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProductivityHub.Api.Data;

namespace ProductivityHub.Api.Services;

public interface IDatabaseMonitoringService
{
    Task<QueryPerformanceStats> GetContactSearchPerformanceAsync(Guid tenantId, string searchTerm);
    Task<IndexUsageStats> GetContactIndexUsageAsync();
    Task LogSlowQueryAsync(string query, TimeSpan duration, Dictionary<string, object> parameters);
    Task<DatabasePerformanceReport> GeneratePerformanceReportAsync();
}

public class DatabaseMonitoringService : IDatabaseMonitoringService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseMonitoringService> _logger;
    private const int SlowQueryThresholdMs = 150; // PRD requirement: <150ms p95

    public DatabaseMonitoringService(ApplicationDbContext context, ILogger<DatabaseMonitoringService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<QueryPerformanceStats> GetContactSearchPerformanceAsync(Guid tenantId, string searchTerm)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // Build the query that mimics actual search behavior
            var query = _context.Contacts
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == tenantId && c.DeletedAt == null);

            if (!string.IsNullOrEmpty(searchTerm))
            {
                var searchTermLower = searchTerm.ToLower();
                query = query.Where(c =>
                    c.FullName.ToLower().Contains(searchTermLower));
            }

            // Get EXPLAIN ANALYZE results
            var explainQuery = $@"
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
                {query.ToQueryString().Replace("@__", "$")}";

            var explainResult = await ExecuteRawSqlAsync<string>(explainQuery);
            
            // Execute actual query to get timing
            var contacts = await query
                .OrderByDescending(c => c.UpdatedAt)
                .Take(20)
                .ToListAsync();

            stopwatch.Stop();

            var stats = new QueryPerformanceStats
            {
                QueryType = "ContactSearch",
                TenantId = tenantId,
                SearchTerm = searchTerm,
                ExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                ResultCount = contacts.Count,
                ExecutionPlan = explainResult,
                Timestamp = DateTime.UtcNow
            };

            // Log slow queries
            if (stopwatch.ElapsedMilliseconds > SlowQueryThresholdMs)
            {
                await LogSlowQueryAsync(query.ToQueryString(), stopwatch.Elapsed, 
                    new Dictionary<string, object>
                    {
                        { "tenantId", tenantId },
                        { "searchTerm", searchTerm ?? "" },
                        { "resultCount", contacts.Count }
                    });
            }

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing contact search performance for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task<IndexUsageStats> GetContactIndexUsageAsync()
    {
        try
        {
            var indexUsageQuery = @"
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan
                FROM pg_stat_user_indexes 
                WHERE tablename IN ('contacts', 'contact_tags', 'tags')
                ORDER BY idx_scan DESC";

            var result = await ExecuteRawSqlAsync<dynamic>(indexUsageQuery);
            
            return new IndexUsageStats
            {
                ContactTableIndexes = result,
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting index usage statistics");
            throw;
        }
    }

    public async Task LogSlowQueryAsync(string query, TimeSpan duration, Dictionary<string, object> parameters)
    {
        var logData = new
        {
            Query = query,
            DurationMs = duration.TotalMilliseconds,
            Parameters = parameters,
            Timestamp = DateTime.UtcNow
        };

        _logger.LogWarning("Slow query detected: {Duration}ms | Query: {Query} | Parameters: {@Parameters}",
            duration.TotalMilliseconds, query, parameters);

        // Store in database for analysis (could be extended to metrics system)
        // For now, we'll rely on structured logging
    }

    public async Task<DatabasePerformanceReport> GeneratePerformanceReportAsync()
    {
        try
        {
            // Get table statistics
            var tableStatsQuery = @"
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    n_live_tup as live_tuples,
                    n_dead_tup as dead_tuples,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables 
                WHERE tablename IN ('contacts', 'contact_tags', 'tags')
                ORDER BY n_live_tup DESC";

            var tableStats = await ExecuteRawSqlAsync<dynamic>(tableStatsQuery);

            // Get cache hit ratios
            var cacheHitQuery = @"
                SELECT 
                    schemaname,
                    tablename,
                    heap_blks_read,
                    heap_blks_hit,
                    CASE 
                        WHEN heap_blks_hit + heap_blks_read = 0 THEN 0
                        ELSE ROUND(heap_blks_hit::numeric / (heap_blks_hit + heap_blks_read) * 100, 2)
                    END as cache_hit_ratio
                FROM pg_statio_user_tables 
                WHERE tablename IN ('contacts', 'contact_tags', 'tags')
                ORDER BY cache_hit_ratio DESC";

            var cacheStats = await ExecuteRawSqlAsync<dynamic>(cacheHitQuery);

            // Get database size information
            var sizeQuery = @"
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as database_size,
                    pg_size_pretty(pg_total_relation_size('contacts')) as contacts_table_size,
                    pg_size_pretty(pg_total_relation_size('contact_tags')) as contact_tags_table_size";

            var sizeStats = await ExecuteRawSqlAsync<dynamic>(sizeQuery);

            return new DatabasePerformanceReport
            {
                TableStatistics = tableStats,
                CacheHitRatios = cacheStats,
                SizeInformation = sizeStats,
                IndexUsage = await GetContactIndexUsageAsync(),
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating database performance report");
            throw;
        }
    }

    private async Task<T> ExecuteRawSqlAsync<T>(string sql)
    {
        using var connection = _context.Database.GetDbConnection() as NpgsqlConnection;
        if (connection == null)
            throw new InvalidOperationException("Database connection must be PostgreSQL");

        await connection.OpenAsync();
        using var command = new NpgsqlCommand(sql, connection);
        
        if (typeof(T) == typeof(string))
        {
            var result = await command.ExecuteScalarAsync();
            return (T)(object)(result?.ToString() ?? "");
        }
        
        var results = new List<dynamic>();
        using var reader = await command.ExecuteReaderAsync();
        
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object>();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.GetValue(i);
            }
            results.Add(row);
        }
        
        return (T)(object)results;
    }
}

// Data transfer objects for monitoring results
public class QueryPerformanceStats
{
    public string QueryType { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string? SearchTerm { get; set; }
    public long ExecutionTimeMs { get; set; }
    public int ResultCount { get; set; }
    public string ExecutionPlan { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class IndexUsageStats
{
    public dynamic ContactTableIndexes { get; set; } = new object();
    public DateTime GeneratedAt { get; set; }
}

public class DatabasePerformanceReport
{
    public dynamic TableStatistics { get; set; } = new object();
    public dynamic CacheHitRatios { get; set; } = new object();
    public dynamic SizeInformation { get; set; } = new object();
    public IndexUsageStats IndexUsage { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}