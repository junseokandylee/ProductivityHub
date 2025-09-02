using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public interface ISegmentEvaluationService
{
    /// <summary>
    /// Validates segment rules for security and complexity
    /// </summary>
    Task<SegmentValidationResult> ValidateRulesAsync(SegmentRule rules);
    
    /// <summary>
    /// Evaluates segment rules against contacts for a tenant
    /// </summary>
    Task<SegmentEvaluationResult> EvaluateAsync(Guid tenantId, SegmentRule rules, int sampleSize = 10);
    
    /// <summary>
    /// Gets the count of contacts matching the segment rules
    /// </summary>
    Task<int> GetCountAsync(Guid tenantId, SegmentRule rules);
    
    /// <summary>
    /// Gets contact IDs matching the segment rules (for campaign/export use)
    /// </summary>
    Task<List<Guid>> GetContactIdsAsync(Guid tenantId, SegmentRule rules, int? limit = null);
}

public class SegmentValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public int Depth { get; set; }
    public int ConditionCount { get; set; }
}

public class SegmentEvaluationResult
{
    public int TotalCount { get; set; }
    public List<ContactDto> SampleContacts { get; set; } = new();
    public int ExecutionTimeMs { get; set; }
    public string GeneratedSql { get; set; } = string.Empty; // For debugging/logging
}