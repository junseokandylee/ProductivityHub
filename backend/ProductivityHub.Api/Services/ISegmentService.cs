using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public interface ISegmentService
{
    /// <summary>
    /// Gets all segments for a tenant
    /// </summary>
    Task<List<SegmentDto>> GetSegmentsAsync(Guid tenantId, bool includeInactive = false);
    
    /// <summary>
    /// Gets a specific segment by ID
    /// </summary>
    Task<SegmentDto?> GetSegmentAsync(Guid tenantId, Guid segmentId);
    
    /// <summary>
    /// Creates a new segment
    /// </summary>
    Task<SegmentDto> CreateSegmentAsync(Guid tenantId, Guid userId, CreateSegmentRequest request);
    
    /// <summary>
    /// Updates an existing segment
    /// </summary>
    Task<SegmentDto> UpdateSegmentAsync(Guid tenantId, Guid userId, Guid segmentId, UpdateSegmentRequest request);
    
    /// <summary>
    /// Deletes a segment (soft delete by setting IsActive = false)
    /// </summary>
    Task<bool> DeleteSegmentAsync(Guid tenantId, Guid userId, Guid segmentId);
    
    /// <summary>
    /// Clones an existing segment with a new name
    /// </summary>
    Task<SegmentDto> CloneSegmentAsync(Guid tenantId, Guid userId, Guid segmentId, string newName, string? newDescription = null);
    
    /// <summary>
    /// Records segment usage for audit trail
    /// </summary>
    Task RecordUsageAsync(Guid tenantId, Guid userId, Guid segmentId, string action, string? context = null, int? resultCount = null, int? executionTimeMs = null);
    
    /// <summary>
    /// Gets segment usage history
    /// </summary>
    Task<List<SegmentUsageAuditDto>> GetUsageHistoryAsync(Guid tenantId, Guid segmentId, int limit = 50);
}

public class SegmentUsageAuditDto
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Context { get; set; }
    public int? ResultCount { get; set; }
    public int? ExecutionTimeMs { get; set; }
    public DateTime OccurredAt { get; set; }
    public string UserName { get; set; } = string.Empty;
}