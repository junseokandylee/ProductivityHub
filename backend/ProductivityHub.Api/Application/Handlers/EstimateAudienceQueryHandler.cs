using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Handlers;

public class EstimateAudienceQueryHandler : IRequestHandler<EstimateAudienceQuery, EstimateAudienceResponse>
{
    private readonly ApplicationDbContext _context;

    public EstimateAudienceQueryHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<EstimateAudienceResponse> Handle(EstimateAudienceQuery request, CancellationToken cancellationToken)
    {
        var contactIds = new HashSet<Guid>();
        var breakdown = new Dictionary<string, int>();

        // Get contacts from groups
        if (request.GroupIds.Any())
        {
            var groupContactIds = await _context.ContactGroupMembers
                .Where(cgm => request.GroupIds.Contains(cgm.GroupId))
                .Include(cgm => cgm.Contact)
                .Where(cgm => cgm.Contact.TenantId == request.TenantId && cgm.Contact.IsActive)
                .Select(cgm => cgm.ContactId)
                .ToListAsync(cancellationToken);

            foreach (var contactId in groupContactIds)
            {
                contactIds.Add(contactId);
            }
            breakdown["groups"] = groupContactIds.Count;
        }

        // Get contacts from segments (simplified implementation)
        if (request.SegmentIds.Any())
        {
            // In a real implementation, you would evaluate segment filters
            // For now, we'll use a simplified approach
            var segments = await _context.ContactSegments
                .Where(s => request.SegmentIds.Contains(s.Id) && s.TenantId == request.TenantId)
                .ToListAsync(cancellationToken);

            var segmentContactCount = 0;
            foreach (var segment in segments)
            {
                // This is a simplified estimation - in production you'd evaluate the actual filters
                var estimatedCount = await _context.Contacts
                    .Where(c => c.TenantId == request.TenantId && c.IsActive)
                    .CountAsync(cancellationToken) / 10; // Simplified estimate
                    
                segmentContactCount += estimatedCount;
            }
            breakdown["segments"] = segmentContactCount;
        }

        // Apply custom filters (simplified implementation)
        var customFilterCount = 0;
        if (request.FilterJson != null && request.FilterJson.Any())
        {
            // Simplified custom filter implementation
            customFilterCount = await _context.Contacts
                .Where(c => c.TenantId == request.TenantId && c.IsActive)
                .CountAsync(cancellationToken) / 20; // Simplified estimate
                
            breakdown["custom_filters"] = customFilterCount;
        }

        var totalContacts = breakdown.Values.Sum();
        var uniqueContacts = Math.Max(contactIds.Count, totalContacts * 85 / 100); // Estimate 85% uniqueness

        return new EstimateAudienceResponse
        {
            TotalContacts = totalContacts,
            UniqueContacts = uniqueContacts,
            BreakdownBySource = breakdown
        };
    }
}