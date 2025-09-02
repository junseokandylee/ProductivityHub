using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Queries;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Handlers;

public class GetContactGroupsQueryHandler : IRequestHandler<GetContactGroupsQuery, List<ContactGroupResponse>>
{
    private readonly ApplicationDbContext _context;

    public GetContactGroupsQueryHandler(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ContactGroupResponse>> Handle(GetContactGroupsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ContactGroups
            .Where(g => g.TenantId == request.TenantId && g.IsActive);

        // Apply search filter
        if (!string.IsNullOrEmpty(request.Search))
        {
            query = query.Where(g => g.Name.Contains(request.Search) || 
                                   (g.Description != null && g.Description.Contains(request.Search)));
        }

        // Apply pagination
        var groups = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Include(g => g.Members)
            .OrderBy(g => g.Name)
            .ToListAsync(cancellationToken);

        return groups.Select(g => new ContactGroupResponse
        {
            Id = g.Id,
            Name = g.Name,
            Description = g.Description,
            Count = g.Members.Count,
            CreatedAt = g.CreatedAt,
            UpdatedAt = g.UpdatedAt
        }).ToList();
    }
}