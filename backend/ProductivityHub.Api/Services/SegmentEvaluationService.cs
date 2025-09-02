using System.Text;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.Globalization;

namespace ProductivityHub.Api.Services;

public class SegmentEvaluationService : ISegmentEvaluationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SegmentEvaluationService> _logger;
    
    // Rate limiting for evaluation to prevent abuse
    private static readonly Dictionary<Guid, DateTime> _lastEvaluationTimes = new();
    private static readonly object _rateLimitLock = new();
    private const int MinEvaluationIntervalMs = 1000; // 1 second between evaluations per tenant

    public SegmentEvaluationService(ApplicationDbContext context, ILogger<SegmentEvaluationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SegmentValidationResult> ValidateRulesAsync(SegmentRule rules)
    {
        var result = new SegmentValidationResult { IsValid = true };
        
        try
        {
            var (depth, conditionCount) = AnalyzeRuleStructure(rules);
            result.Depth = depth;
            result.ConditionCount = conditionCount;

            // Check maximum depth
            if (depth > SegmentRuleConstants.MaxNestingDepth)
            {
                result.IsValid = false;
                result.Errors.Add($"Rule nesting depth {depth} exceeds maximum of {SegmentRuleConstants.MaxNestingDepth}");
            }

            // Check maximum conditions
            if (conditionCount > SegmentRuleConstants.MaxConditions)
            {
                result.IsValid = false;
                result.Errors.Add($"Rule condition count {conditionCount} exceeds maximum of {SegmentRuleConstants.MaxConditions}");
            }

            // Validate rule structure recursively
            ValidateRuleRecursive(rules, result);
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Rule validation error: {ex.Message}");
            _logger.LogError(ex, "Error validating segment rules");
        }

        return result;
    }

    public async Task<SegmentEvaluationResult> EvaluateAsync(Guid tenantId, SegmentRule rules, int sampleSize = 10)
    {
        // Rate limiting check
        if (!CheckRateLimit(tenantId))
        {
            throw new InvalidOperationException("Rate limit exceeded. Please wait before evaluating again.");
        }

        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // Validate rules first
            var validation = await ValidateRulesAsync(rules);
            if (!validation.IsValid)
            {
                throw new ArgumentException($"Invalid rules: {string.Join(", ", validation.Errors)}");
            }

            // Build and execute query
            var (whereClause, parameters) = CompileRuleToSql(rules, "c");
            
            // Get total count
            var countQuery = $@"
                SELECT COUNT(*) 
                FROM contacts c 
                WHERE c.tenant_id = @tenant_id 
                  AND c.deleted_at IS NULL 
                  AND ({whereClause})";

            var totalCount = await ExecuteScalarAsync<int>(countQuery, parameters, tenantId);

            // Get sample contacts
            var sampleContacts = new List<ContactDto>();
            if (totalCount > 0 && sampleSize > 0)
            {
                var sampleQuery = $@"
                    SELECT c.id, c.full_name, c.is_active, c.created_at, c.updated_at
                    FROM contacts c
                    LEFT JOIN contact_tags ct ON c.id = ct.contact_id
                    LEFT JOIN tags t ON ct.tag_id = t.id
                    WHERE c.tenant_id = @tenant_id 
                      AND c.deleted_at IS NULL 
                      AND ({whereClause})
                    GROUP BY c.id, c.full_name, c.is_active, c.created_at, c.updated_at
                    ORDER BY c.updated_at DESC
                    LIMIT {Math.Min(sampleSize, 50)}"; // Cap sample size

                sampleContacts = await ExecuteSampleQueryAsync(sampleQuery, parameters, tenantId);
            }

            stopwatch.Stop();

            var result = new SegmentEvaluationResult
            {
                TotalCount = totalCount,
                SampleContacts = sampleContacts,
                ExecutionTimeMs = (int)stopwatch.ElapsedMilliseconds,
                GeneratedSql = $"WHERE {whereClause}"
            };

            _logger.LogInformation("Segment evaluation completed in {ExecutionTime}ms: {TotalCount} contacts found",
                result.ExecutionTimeMs, result.TotalCount);

            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error evaluating segment rules for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task<int> GetCountAsync(Guid tenantId, SegmentRule rules)
    {
        var validation = await ValidateRulesAsync(rules);
        if (!validation.IsValid)
        {
            throw new ArgumentException($"Invalid rules: {string.Join(", ", validation.Errors)}");
        }

        var (whereClause, parameters) = CompileRuleToSql(rules, "c");
        
        var countQuery = $@"
            SELECT COUNT(*) 
            FROM contacts c 
            WHERE c.tenant_id = @tenant_id 
              AND c.deleted_at IS NULL 
              AND ({whereClause})";

        return await ExecuteScalarAsync<int>(countQuery, parameters, tenantId);
    }

    public async Task<List<Guid>> GetContactIdsAsync(Guid tenantId, SegmentRule rules, int? limit = null)
    {
        var validation = await ValidateRulesAsync(rules);
        if (!validation.IsValid)
        {
            throw new ArgumentException($"Invalid rules: {string.Join(", ", validation.Errors)}");
        }

        var (whereClause, parameters) = CompileRuleToSql(rules, "c");
        
        var limitClause = limit.HasValue ? $"LIMIT {Math.Min(limit.Value, 100000)}" : "";
        var query = $@"
            SELECT DISTINCT c.id
            FROM contacts c 
            LEFT JOIN contact_tags ct ON c.id = ct.contact_id
            LEFT JOIN tags t ON ct.tag_id = t.id
            WHERE c.tenant_id = @tenant_id 
              AND c.deleted_at IS NULL 
              AND ({whereClause})
            ORDER BY c.updated_at DESC
            {limitClause}";

        return await ExecuteIdsQueryAsync(query, parameters, tenantId);
    }

    private (int depth, int conditionCount) AnalyzeRuleStructure(SegmentRule rule, int currentDepth = 0)
    {
        if (rule is SegmentRuleGroup group)
        {
            var maxDepth = currentDepth;
            var totalConditions = 0;

            foreach (var child in group.Children)
            {
                var (childDepth, childConditions) = AnalyzeRuleStructure(child, currentDepth + 1);
                maxDepth = Math.Max(maxDepth, childDepth);
                totalConditions += childConditions;
            }

            return (maxDepth, totalConditions);
        }
        else if (rule is SegmentRuleCondition)
        {
            return (currentDepth, 1);
        }

        return (currentDepth, 0);
    }

    private void ValidateRuleRecursive(SegmentRule rule, SegmentValidationResult result)
    {
        if (rule is SegmentRuleGroup group)
        {
            // Validate group operator
            if (group.Operator != "and" && group.Operator != "or")
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid group operator: {group.Operator}. Must be 'and' or 'or'");
            }

            // Must have at least one child
            if (group.Children.Count == 0)
            {
                result.IsValid = false;
                result.Errors.Add("Group must have at least one child rule");
            }

            // Validate children recursively
            foreach (var child in group.Children)
            {
                ValidateRuleRecursive(child, result);
            }
        }
        else if (rule is SegmentRuleCondition condition)
        {
            // Validate field
            if (!SegmentRuleConstants.AllowedFields.Contains(condition.Field))
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid field: {condition.Field}");
                return;
            }

            // Validate operator for field type
            var fieldType = SegmentRuleConstants.FieldTypes.GetValueOrDefault(condition.Field, "string");
            var allowedOperators = SegmentRuleConstants.AllowedOperators.GetValueOrDefault(fieldType, new HashSet<string>());
            
            if (!allowedOperators.Contains(condition.Operator))
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid operator '{condition.Operator}' for field '{condition.Field}' of type '{fieldType}'");
            }

            // Validate value based on field type and operator
            ValidateConditionValue(condition, fieldType, result);
        }
        else
        {
            result.IsValid = false;
            result.Errors.Add($"Unknown rule type: {rule.GetType().Name}");
        }
    }

    private void ValidateConditionValue(SegmentRuleCondition condition, string fieldType, SegmentValidationResult result)
    {
        // Skip validation for operators that don't require values
        if (condition.Operator is "is_empty" or "is_not_empty")
        {
            return;
        }

        if (condition.Value == null)
        {
            result.IsValid = false;
            result.Errors.Add($"Value is required for operator '{condition.Operator}'");
            return;
        }

        // Type-specific validation
        switch (fieldType)
        {
            case "date":
                ValidateDateValue(condition, result);
                break;
            case "boolean":
                ValidateBooleanValue(condition, result);
                break;
            case "tag":
                ValidateTagValue(condition, result);
                break;
            // String and number values are generally flexible
        }
    }

    private void ValidateDateValue(SegmentRuleCondition condition, SegmentValidationResult result)
    {
        if (condition.Operator == "between")
        {
            // Expect array of two dates
            if (condition.Value is not IEnumerable<object> array || array.Count() != 2)
            {
                result.IsValid = false;
                result.Errors.Add("Between operator requires array of two date values");
            }
        }
        else if (condition.Operator is "days_ago" or "in_last_days")
        {
            // Expect number
            if (!int.TryParse(condition.Value?.ToString(), out _))
            {
                result.IsValid = false;
                result.Errors.Add($"Operator '{condition.Operator}' requires integer value");
            }
        }
    }

    private void ValidateBooleanValue(SegmentRuleCondition condition, SegmentValidationResult result)
    {
        if (!bool.TryParse(condition.Value?.ToString(), out _))
        {
            result.IsValid = false;
            result.Errors.Add("Boolean field requires true/false value");
        }
    }

    private void ValidateTagValue(SegmentRuleCondition condition, SegmentValidationResult result)
    {
        if (condition.Operator is "has_any_tags" or "has_all_tags")
        {
            // Expect array of tag IDs
            if (condition.Value is not IEnumerable<object>)
            {
                result.IsValid = false;
                result.Errors.Add($"Operator '{condition.Operator}' requires array of tag IDs");
            }
        }
        else
        {
            // Expect single tag ID
            if (!Guid.TryParse(condition.Value?.ToString(), out _))
            {
                result.IsValid = false;
                result.Errors.Add("Tag operators require valid GUID tag ID");
            }
        }
    }

    private (string whereClause, Dictionary<string, object> parameters) CompileRuleToSql(SegmentRule rule, string tableAlias)
    {
        var parameters = new Dictionary<string, object>();
        var paramCounter = 0;

        var whereClause = CompileRuleRecursive(rule, tableAlias, parameters, ref paramCounter);
        return (whereClause, parameters);
    }

    private string CompileRuleRecursive(SegmentRule rule, string tableAlias, Dictionary<string, object> parameters, ref int paramCounter)
    {
        if (rule is SegmentRuleGroup group)
        {
            var childClauses = new List<string>();
            foreach (var child in group.Children)
            {
                var clause = CompileRuleRecursive(child, tableAlias, parameters, ref paramCounter);
                if (!string.IsNullOrEmpty(clause))
                {
                    childClauses.Add(clause);
                }
            }

            if (!childClauses.Any())
                return "1=1"; // Default to true if no valid children

            var joinOperator = group.Operator.ToUpperInvariant();
            return $"({string.Join($" {joinOperator} ", childClauses)})";
        }
        else if (rule is SegmentRuleCondition condition)
        {
            return CompileConditionToSql(condition, tableAlias, parameters, ref paramCounter);
        }

        return "1=1"; // Default fallback
    }

    private string CompileConditionToSql(SegmentRuleCondition condition, string tableAlias, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var field = condition.Field;
        var op = condition.Operator;
        var value = condition.Value;

        // Map field names to actual column names
        var columnName = field switch
        {
            "full_name" => $"{tableAlias}.full_name",
            "notes" => $"{tableAlias}.notes",
            "is_active" => $"{tableAlias}.is_active",
            "created_at" => $"{tableAlias}.created_at",
            "updated_at" => $"{tableAlias}.updated_at",
            "last_activity_date" => $"{tableAlias}.updated_at", // Use updated_at as last activity proxy
            _ => throw new ArgumentException($"Unknown field: {field}")
        };

        // Handle tag conditions specially
        if (field == "tag")
        {
            return CompileTagCondition(condition, tableAlias, parameters, ref paramCounter);
        }

        // Handle standard field conditions
        return op switch
        {
            "equals" => CreateParameterizedCondition(columnName, "=", value, parameters, ref paramCounter),
            "not_equals" => CreateParameterizedCondition(columnName, "!=", value, parameters, ref paramCounter),
            "contains" => CreateParameterizedCondition(columnName, "ILIKE", $"%{value}%", parameters, ref paramCounter),
            "not_contains" => CreateParameterizedCondition(columnName, "NOT ILIKE", $"%{value}%", parameters, ref paramCounter),
            "starts_with" => CreateParameterizedCondition(columnName, "ILIKE", $"{value}%", parameters, ref paramCounter),
            "ends_with" => CreateParameterizedCondition(columnName, "ILIKE", $"%{value}", parameters, ref paramCounter),
            "is_empty" => $"({columnName} IS NULL OR {columnName} = '')",
            "is_not_empty" => $"({columnName} IS NOT NULL AND {columnName} != '')",
            "greater_than" => CreateParameterizedCondition(columnName, ">", value, parameters, ref paramCounter),
            "less_than" => CreateParameterizedCondition(columnName, "<", value, parameters, ref paramCounter),
            "between" when value is IEnumerable<object> array && array.Count() == 2 => 
                CreateBetweenCondition(columnName, array.ToArray(), parameters, ref paramCounter),
            "days_ago" when int.TryParse(value?.ToString(), out var days) =>
                CreateParameterizedCondition(columnName, "::date =", DateTime.UtcNow.AddDays(-days).Date, parameters, ref paramCounter),
            "in_last_days" when int.TryParse(value?.ToString(), out var days) =>
                CreateParameterizedCondition(columnName, ">=", DateTime.UtcNow.AddDays(-days), parameters, ref paramCounter),
            _ => throw new ArgumentException($"Unsupported operator '{op}' for field '{field}'")
        };
    }

    private string CompileTagCondition(SegmentRuleCondition condition, string tableAlias, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var op = condition.Operator;
        var value = condition.Value;

        return op switch
        {
            "has_tag" when Guid.TryParse(value?.ToString(), out var tagId) =>
                $"EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = {tableAlias}.id AND ct.tag_id = {CreateParameter(tagId, parameters, ref paramCounter)})",
            
            "not_has_tag" when Guid.TryParse(value?.ToString(), out var tagId) =>
                $"NOT EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = {tableAlias}.id AND ct.tag_id = {CreateParameter(tagId, parameters, ref paramCounter)})",
            
            "has_any_tags" when value is IEnumerable<object> tagArray =>
                CreateTagArrayCondition(tableAlias, tagArray, "EXISTS", parameters, ref paramCounter),
            
            "has_all_tags" when value is IEnumerable<object> tagArray =>
                CreateTagAllCondition(tableAlias, tagArray, parameters, ref paramCounter),
            
            _ => throw new ArgumentException($"Unsupported tag operator '{op}' with value type '{value?.GetType().Name}'")
        };
    }

    private string CreateParameterizedCondition(string columnName, string sqlOperator, object? value, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var paramName = CreateParameter(value, parameters, ref paramCounter);
        return $"{columnName} {sqlOperator} {paramName}";
    }

    private string CreateBetweenCondition(string columnName, object[] values, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var param1 = CreateParameter(values[0], parameters, ref paramCounter);
        var param2 = CreateParameter(values[1], parameters, ref paramCounter);
        return $"{columnName} BETWEEN {param1} AND {param2}";
    }

    private string CreateTagArrayCondition(string tableAlias, IEnumerable<object> tagIds, string existsType, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var validTagIds = tagIds.Where(id => Guid.TryParse(id?.ToString(), out _)).ToArray();
        if (!validTagIds.Any())
            return "1=0"; // No valid tag IDs

        var paramNames = new List<string>();
        foreach (var id in validTagIds)
        {
            var tagId = Guid.Parse(id.ToString()!);
            paramNames.Add(CreateParameter(tagId, parameters, ref paramCounter));
        }
        
        var tagIdParams = string.Join(",", paramNames);
        return $"{existsType} (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = {tableAlias}.id AND ct.tag_id IN ({tagIdParams}))";
    }

    private string CreateTagAllCondition(string tableAlias, IEnumerable<object> tagIds, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var validTagIds = tagIds.Where(id => Guid.TryParse(id?.ToString(), out _)).ToArray();
        if (!validTagIds.Any())
            return "1=1"; // No tags to check, condition is true

        var paramNames = new List<string>();
        foreach (var id in validTagIds)
        {
            var tagId = Guid.Parse(id.ToString()!);
            paramNames.Add(CreateParameter(tagId, parameters, ref paramCounter));
        }
        
        var tagIdParams = string.Join(",", paramNames);
        var tagCount = validTagIds.Length;
        
        return $"(SELECT COUNT(DISTINCT ct.tag_id) FROM contact_tags ct WHERE ct.contact_id = {tableAlias}.id AND ct.tag_id IN ({tagIdParams})) = {tagCount}";
    }

    private string CreateParameter(object? value, Dictionary<string, object> parameters, ref int paramCounter)
    {
        var paramName = $"@param{paramCounter++}";
        parameters[paramName] = value ?? DBNull.Value;
        return paramName;
    }

    private bool CheckRateLimit(Guid tenantId)
    {
        lock (_rateLimitLock)
        {
            if (_lastEvaluationTimes.TryGetValue(tenantId, out var lastTime))
            {
                var elapsed = DateTime.UtcNow - lastTime;
                if (elapsed.TotalMilliseconds < MinEvaluationIntervalMs)
                {
                    return false;
                }
            }

            _lastEvaluationTimes[tenantId] = DateTime.UtcNow;
            return true;
        }
    }

    private async Task<T> ExecuteScalarAsync<T>(string sql, Dictionary<string, object> parameters, Guid tenantId)
    {
        using var command = _context.Database.GetDbConnection().CreateCommand();
        await _context.Database.OpenConnectionAsync();
        
        command.CommandText = sql;
        
        // Add tenant_id parameter
        var tenantParam = command.CreateParameter();
        tenantParam.ParameterName = "@tenant_id";
        tenantParam.Value = tenantId;
        command.Parameters.Add(tenantParam);
        
        // Add other parameters
        foreach (var param in parameters)
        {
            var dbParam = command.CreateParameter();
            dbParam.ParameterName = param.Key;
            dbParam.Value = param.Value;
            command.Parameters.Add(dbParam);
        }

        var result = await command.ExecuteScalarAsync();
        return (T)Convert.ChangeType(result!, typeof(T));
    }

    private async Task<List<ContactDto>> ExecuteSampleQueryAsync(string sql, Dictionary<string, object> parameters, Guid tenantId)
    {
        using var command = _context.Database.GetDbConnection().CreateCommand();
        await _context.Database.OpenConnectionAsync();
        
        command.CommandText = sql;
        
        // Add tenant_id parameter
        var tenantParam = command.CreateParameter();
        tenantParam.ParameterName = "@tenant_id";
        tenantParam.Value = tenantId;
        command.Parameters.Add(tenantParam);
        
        // Add other parameters
        foreach (var param in parameters)
        {
            var dbParam = command.CreateParameter();
            dbParam.ParameterName = param.Key;
            dbParam.Value = param.Value;
            command.Parameters.Add(dbParam);
        }

        var contacts = new List<ContactDto>();
        using var reader = await command.ExecuteReaderAsync();
        
        while (await reader.ReadAsync())
        {
            contacts.Add(new ContactDto
            {
                Id = reader.GetGuid(reader.GetOrdinal("id")),
                FullName = reader.GetString(reader.GetOrdinal("full_name")),
                IsActive = reader.GetBoolean(reader.GetOrdinal("is_active")),
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
                UpdatedAt = reader.GetDateTime(reader.GetOrdinal("updated_at"))
            });
        }

        return contacts;
    }

    private async Task<List<Guid>> ExecuteIdsQueryAsync(string sql, Dictionary<string, object> parameters, Guid tenantId)
    {
        using var command = _context.Database.GetDbConnection().CreateCommand();
        await _context.Database.OpenConnectionAsync();
        
        command.CommandText = sql;
        
        // Add tenant_id parameter
        var tenantParam = command.CreateParameter();
        tenantParam.ParameterName = "@tenant_id";
        tenantParam.Value = tenantId;
        command.Parameters.Add(tenantParam);
        
        // Add other parameters
        foreach (var param in parameters)
        {
            var dbParam = command.CreateParameter();
            dbParam.ParameterName = param.Key;
            dbParam.Value = param.Value;
            command.Parameters.Add(dbParam);
        }

        var ids = new List<Guid>();
        using var reader = await command.ExecuteReaderAsync();
        
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetGuid(reader.GetOrdinal("id")));
        }

        return ids;
    }
}