using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Queries;

public record GetSampleContactQuery(
    Guid TenantId,
    List<Guid> GroupIds,
    List<Guid> SegmentIds,
    Dictionary<string, object>? FilterJson = null
) : IRequest<SampleContactResponse>;