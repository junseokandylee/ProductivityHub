using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Queries;

public record GetContactGroupsQuery(
    Guid TenantId, 
    string? Search = null, 
    int Page = 1, 
    int PageSize = 50
) : IRequest<List<ContactGroupResponse>>;