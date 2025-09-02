using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

public class SegmentService : ISegmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ISegmentEvaluationService _evaluationService;
    private readonly ILogger<SegmentService> _logger;

    public SegmentService(
        ApplicationDbContext context, 
        ISegmentEvaluationService evaluationService,
        ILogger<SegmentService> logger)
    {
        _context = context;
        _evaluationService = evaluationService;
        _logger = logger;
    }

    public async Task<List<SegmentDto>> GetSegmentsAsync(Guid tenantId, bool includeInactive = false)
    {
        var query = _context.Segments
            .Include(s => s.CreatedByUser)
            .Where(s => s.TenantId == tenantId);

        if (!includeInactive)
        {
            query = query.Where(s => s.IsActive);
        }

        var segments = await query
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();

        return segments.Select(MapToDto).ToList();
    }

    public async Task<SegmentDto?> GetSegmentAsync(Guid tenantId, Guid segmentId)
    {
        var segment = await _context.Segments
            .Include(s => s.CreatedByUser)
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == segmentId);

        return segment != null ? MapToDto(segment) : null;
    }

    public async Task<SegmentDto> CreateSegmentAsync(Guid tenantId, Guid userId, CreateSegmentRequest request)
    {
        // Validate rules
        var validation = await _evaluationService.ValidateRulesAsync(request.Rules);
        if (!validation.IsValid)
        {
            throw new ArgumentException($"Invalid segment rules: {string.Join(", ", validation.Errors)}");
        }

        // Check for duplicate name
        var existingSegment = await _context.Segments
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Name == request.Name && s.IsActive);
        
        if (existingSegment != null)
        {
            throw new ArgumentException($"A segment with the name '{request.Name}' already exists");
        }

        var segment = new Segment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name,
            Description = request.Description,
            Rules = JsonSerializer.Serialize(request.Rules),
            CreatedBy = userId,
            IsActive = true
        };

        _context.Segments.Add(segment);
        await _context.SaveChangesAsync();

        // Record creation audit
        await RecordUsageAsync(tenantId, userId, segment.Id, "created", null, null, null);

        _logger.LogInformation("Created segment {SegmentId} '{SegmentName}' for tenant {TenantId} by user {UserId}",
            segment.Id, segment.Name, tenantId, userId);

        // Load the segment with navigation properties for return
        var createdSegment = await _context.Segments
            .Include(s => s.CreatedByUser)
            .FirstAsync(s => s.Id == segment.Id);

        return MapToDto(createdSegment);
    }

    public async Task<SegmentDto> UpdateSegmentAsync(Guid tenantId, Guid userId, Guid segmentId, UpdateSegmentRequest request)
    {
        var segment = await _context.Segments
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == segmentId);

        if (segment == null)
        {
            throw new ArgumentException("Segment not found");
        }

        // Validate rules
        var validation = await _evaluationService.ValidateRulesAsync(request.Rules);
        if (!validation.IsValid)
        {
            throw new ArgumentException($"Invalid segment rules: {string.Join(", ", validation.Errors)}");
        }

        // Check for duplicate name (excluding current segment)
        var existingSegment = await _context.Segments
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Name == request.Name && s.Id != segmentId && s.IsActive);
        
        if (existingSegment != null)
        {
            throw new ArgumentException($"A segment with the name '{request.Name}' already exists");
        }

        // Update properties
        segment.Name = request.Name;
        segment.Description = request.Description;
        segment.Rules = JsonSerializer.Serialize(request.Rules);
        segment.IsActive = request.IsActive;
        segment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Record update audit
        await RecordUsageAsync(tenantId, userId, segment.Id, "updated", null, null, null);

        _logger.LogInformation("Updated segment {SegmentId} '{SegmentName}' for tenant {TenantId} by user {UserId}",
            segment.Id, segment.Name, tenantId, userId);

        // Load the segment with navigation properties for return
        var updatedSegment = await _context.Segments
            .Include(s => s.CreatedByUser)
            .FirstAsync(s => s.Id == segment.Id);

        return MapToDto(updatedSegment);
    }

    public async Task<bool> DeleteSegmentAsync(Guid tenantId, Guid userId, Guid segmentId)
    {
        var segment = await _context.Segments
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == segmentId);

        if (segment == null)
        {
            return false;
        }

        // Soft delete by setting IsActive = false
        segment.IsActive = false;
        segment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Record deletion audit
        await RecordUsageAsync(tenantId, userId, segment.Id, "deleted", null, null, null);

        _logger.LogInformation("Deleted segment {SegmentId} '{SegmentName}' for tenant {TenantId} by user {UserId}",
            segment.Id, segment.Name, tenantId, userId);

        return true;
    }

    public async Task<SegmentDto> CloneSegmentAsync(Guid tenantId, Guid userId, Guid segmentId, string newName, string? newDescription = null)
    {
        var originalSegment = await _context.Segments
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Id == segmentId && s.IsActive);

        if (originalSegment == null)
        {
            throw new ArgumentException("Original segment not found");
        }

        // Check for duplicate name
        var existingSegment = await _context.Segments
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Name == newName && s.IsActive);
        
        if (existingSegment != null)
        {
            throw new ArgumentException($"A segment with the name '{newName}' already exists");
        }

        var clonedSegment = new Segment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = newName,
            Description = newDescription ?? $"Copy of {originalSegment.Name}",
            Rules = originalSegment.Rules, // Copy the rules JSON
            CreatedBy = userId,
            IsActive = true
        };

        _context.Segments.Add(clonedSegment);
        await _context.SaveChangesAsync();

        // Record clone audit for both segments
        await RecordUsageAsync(tenantId, userId, originalSegment.Id, "cloned_from", clonedSegment.Id.ToString(), null, null);
        await RecordUsageAsync(tenantId, userId, clonedSegment.Id, "cloned_to", originalSegment.Id.ToString(), null, null);

        _logger.LogInformation("Cloned segment {OriginalId} to {ClonedId} '{ClonedName}' for tenant {TenantId} by user {UserId}",
            originalSegment.Id, clonedSegment.Id, newName, tenantId, userId);

        // Load the cloned segment with navigation properties for return
        var createdSegment = await _context.Segments
            .Include(s => s.CreatedByUser)
            .FirstAsync(s => s.Id == clonedSegment.Id);

        return MapToDto(createdSegment);
    }

    public async Task RecordUsageAsync(Guid tenantId, Guid userId, Guid segmentId, string action, string? context = null, int? resultCount = null, int? executionTimeMs = null)
    {
        var audit = new SegmentUsageAudit
        {
            TenantId = tenantId,
            SegmentId = segmentId,
            UserId = userId,
            Action = action,
            Context = context,
            ResultCount = resultCount,
            ExecutionTimeMs = executionTimeMs,
            OccurredAt = DateTime.UtcNow
        };

        _context.SegmentUsageAudits.Add(audit);
        
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Don't fail the main operation if audit logging fails
            _logger.LogWarning(ex, "Failed to record segment usage audit for segment {SegmentId}", segmentId);
        }
    }

    public async Task<List<SegmentUsageAuditDto>> GetUsageHistoryAsync(Guid tenantId, Guid segmentId, int limit = 50)
    {
        var history = await _context.SegmentUsageAudits
            .Include(sua => sua.User)
            .Where(sua => sua.TenantId == tenantId && sua.SegmentId == segmentId)
            .OrderByDescending(sua => sua.OccurredAt)
            .Take(Math.Min(limit, 100)) // Cap at 100 records
            .Select(sua => new SegmentUsageAuditDto
            {
                Id = sua.Id,
                Action = sua.Action,
                Context = sua.Context,
                ResultCount = sua.ResultCount,
                ExecutionTimeMs = sua.ExecutionTimeMs,
                OccurredAt = sua.OccurredAt,
                UserName = sua.User.Name ?? sua.User.Email
            })
            .ToListAsync();

        return history;
    }

    private SegmentDto MapToDto(Segment segment)
    {
        SegmentRule rules;
        try
        {
            rules = JsonSerializer.Deserialize<SegmentRule>(segment.Rules) ?? new SegmentRuleGroup();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize rules for segment {SegmentId}, using empty group", segment.Id);
            rules = new SegmentRuleGroup();
        }

        return new SegmentDto
        {
            Id = segment.Id,
            Name = segment.Name,
            Description = segment.Description,
            Rules = rules,
            IsActive = segment.IsActive,
            CreatedAt = segment.CreatedAt,
            UpdatedAt = segment.UpdatedAt,
            CreatedByName = segment.CreatedByUser?.Name ?? segment.CreatedByUser?.Email ?? "Unknown"
        };
    }
}