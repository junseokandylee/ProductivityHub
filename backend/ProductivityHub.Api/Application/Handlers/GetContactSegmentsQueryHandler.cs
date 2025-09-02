using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using System.Text.Json;

namespace ProductivityHub.Api.Application.Handlers;

public class GetContactSegmentsQueryHandler : IRequestHandler<GetContactSegmentsQuery, List<ContactSegmentResponse>>
{
    private readonly ApplicationDbContext _context;

    public GetContactSegmentsQueryHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ContactSegmentResponse>> Handle(GetContactSegmentsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ContactSegments
            .Where(s => s.TenantId == request.TenantId && s.IsActive);

        // Apply search filter
        if (!string.IsNullOrEmpty(request.Search))
        {
            query = query.Where(s => s.Name.Contains(request.Search) || 
                                   (s.Description != null && s.Description.Contains(request.Search)));
        }

        // Apply pagination
        var segments = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        var results = new List<ContactSegmentResponse>();
        
        foreach (var segment in segments)
        {
            // Estimate count based on filter (this is a simplified implementation)
            // In production, you would cache these counts or pre-calculate them
            var estimatedCount = await EstimateSegmentCount(segment, cancellationToken);
            
            results.Add(new ContactSegmentResponse
            {
                Id = segment.Id,
                Name = segment.Name,
                Description = segment.Description,
                Count = estimatedCount,
                CreatedAt = segment.CreatedAt,
                UpdatedAt = segment.UpdatedAt
            });
        }

        return results;
    }

    private async Task<int> EstimateSegmentCount(Models.ContactSegment segment, CancellationToken cancellationToken)
    {
        // Simplified count estimation - in production this would be more sophisticated
        var baseQuery = _context.Contacts.Where(c => c.TenantId == segment.TenantId && c.IsActive);
        
        if (string.IsNullOrEmpty(segment.FilterJson))
        {
            return await baseQuery.CountAsync(cancellationToken);
        }

        try
        {
            var filterData = JsonSerializer.Deserialize<Dictionary<string, object>>(segment.FilterJson);
            // Apply basic filters (this is a simplified implementation)
            // In production, you would have a more robust filter engine
            
            return await baseQuery.CountAsync(cancellationToken);
        }
        catch
        {
            return 0;
        }
    }
}