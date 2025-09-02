using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Handlers;

public class GetSampleContactQueryHandler : IRequestHandler<GetSampleContactQuery, SampleContactResponse>
{
    private readonly ApplicationDbContext _context;

    public GetSampleContactQueryHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SampleContactResponse> Handle(GetSampleContactQuery request, CancellationToken cancellationToken)
    {
        // Try to get a real contact from the selected audience
        Models.Contact? sampleContact = null;

        // First try to get a contact from selected groups
        if (request.GroupIds.Any())
        {
            sampleContact = await _context.ContactGroupMembers
                .Where(cgm => request.GroupIds.Contains(cgm.GroupId))
                .Include(cgm => cgm.Contact)
                .ThenInclude(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(cgm => cgm.Contact.TenantId == request.TenantId && cgm.Contact.IsActive)
                .Select(cgm => cgm.Contact)
                .FirstOrDefaultAsync(cancellationToken);
        }

        // If no contact from groups, try segments (simplified - in production would evaluate segment filters)
        if (sampleContact == null && request.SegmentIds.Any())
        {
            sampleContact = await _context.Contacts
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == request.TenantId && c.IsActive)
                .FirstOrDefaultAsync(cancellationToken);
        }

        // If still no contact, get any contact from the tenant
        if (sampleContact == null)
        {
            sampleContact = await _context.Contacts
                .Include(c => c.ContactTags)
                .ThenInclude(ct => ct.Tag)
                .Where(c => c.TenantId == request.TenantId && c.IsActive)
                .FirstOrDefaultAsync(cancellationToken);
        }

        // Create sample contact response
        if (sampleContact != null)
        {
            // Parse additional data from metadata if available
            var personalizationData = new Dictionary<string, string>
            {
                ["name"] = sampleContact.FullName ?? "홍길동",
                ["phone"] = sampleContact.Phone ?? "010-1234-5678", // Will be decrypted in service layer
                ["email"] = sampleContact.Email ?? "hong@example.com" // Will be decrypted in service layer
            };

            // Add common political campaign variables
            personalizationData["district"] = "서울 종로구";
            personalizationData["candidate"] = "김후보";
            personalizationData["party"] = "정치생산성당";

            // Add tag data from the new tag system
            if (sampleContact.Tags.Any())
            {
                try
                {
                    var tagNames = sampleContact.Tags.Select(t => t.Name).ToList();
                    personalizationData["tags"] = string.Join(", ", tagNames);
                    
                    // Add specific tag values if they follow key:value pattern
                    foreach (var tag in sampleContact.Tags)
                    {
                        var parts = tag.Name.Split(':');
                        if (parts.Length == 2)
                        {
                            personalizationData[parts[0].Trim().ToLower()] = parts[1].Trim();
                        }
                    }
                }
                catch
                {
                    // Ignore tag parsing errors
                }
            }

            return new SampleContactResponse
            {
                Name = sampleContact.FullName ?? "홍길동",
                Phone = sampleContact.Phone,
                Email = sampleContact.Email,
                PersonalizationData = personalizationData
            };
        }

        // Fallback to default sample data if no contacts exist
        return new SampleContactResponse
        {
            Name = "홍길동",
            Phone = "010-1234-5678",
            Email = "hong@example.com",
            PersonalizationData = new Dictionary<string, string>
            {
                ["name"] = "홍길동",
                ["phone"] = "010-1234-5678",
                ["email"] = "hong@example.com",
                ["district"] = "서울 종로구",
                ["candidate"] = "김후보",
                ["party"] = "정치생산성당",
                ["age"] = "35",
                ["gender"] = "남성"
            }
        };
    }
}