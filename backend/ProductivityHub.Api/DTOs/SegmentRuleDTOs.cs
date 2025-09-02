using System.Text.Json.Serialization;

namespace ProductivityHub.Api.DTOs;

// Base class for segment rules
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(SegmentRuleGroup), "group")]
[JsonDerivedType(typeof(SegmentRuleCondition), "condition")]
public abstract class SegmentRule
{
    [JsonPropertyName("type")]
    public abstract string Type { get; }
}

// Group of rules with AND/OR logic
public class SegmentRuleGroup : SegmentRule
{
    public override string Type => "group";

    [JsonPropertyName("operator")]
    public string Operator { get; set; } = "and"; // "and" or "or"

    [JsonPropertyName("children")]
    public List<SegmentRule> Children { get; set; } = new();
}

// Individual condition
public class SegmentRuleCondition : SegmentRule
{
    public override string Type => "condition";

    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("operator")]
    public string Operator { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public object? Value { get; set; }
}

// DTO for segment requests
public class CreateSegmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SegmentRule Rules { get; set; } = new SegmentRuleGroup();
}

public class UpdateSegmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SegmentRule Rules { get; set; } = new SegmentRuleGroup();
    public bool IsActive { get; set; } = true;
}

// DTO for segment evaluation
public class EvaluateSegmentRequest
{
    public SegmentRule Rules { get; set; } = new SegmentRuleGroup();
    public int SampleSize { get; set; } = 10; // Number of sample contacts to return
}

public class EvaluateSegmentResponse
{
    public int TotalCount { get; set; }
    public List<ContactDto> SampleContacts { get; set; } = new();
    public int ExecutionTimeMs { get; set; }
}

// DTO for segment response
public class SegmentDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SegmentRule Rules { get; set; } = new SegmentRuleGroup();
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
}

// Constants for field names and operators
public static class SegmentRuleConstants
{
    // Allowed field names
    public static readonly HashSet<string> AllowedFields = new()
    {
        "full_name", "is_active", "created_at", "updated_at",
        "notes", "tag", "last_activity_date"
    };

    // Allowed operators by field type
    public static readonly Dictionary<string, HashSet<string>> AllowedOperators = new()
    {
        ["string"] = new() { "equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty" },
        ["number"] = new() { "equals", "not_equals", "greater_than", "less_than", "between" },
        ["date"] = new() { "equals", "not_equals", "greater_than", "less_than", "between", "days_ago", "in_last_days" },
        ["boolean"] = new() { "equals", "not_equals" },
        ["tag"] = new() { "has_tag", "not_has_tag", "has_any_tags", "has_all_tags" }
    };

    // Field type mapping
    public static readonly Dictionary<string, string> FieldTypes = new()
    {
        ["full_name"] = "string",
        ["notes"] = "string", 
        ["is_active"] = "boolean",
        ["created_at"] = "date",
        ["updated_at"] = "date",
        ["last_activity_date"] = "date",
        ["tag"] = "tag"
    };

    // Maximum nesting depth to prevent pathological queries
    public const int MaxNestingDepth = 5;

    // Maximum number of conditions to prevent expensive queries
    public const int MaxConditions = 20;
}