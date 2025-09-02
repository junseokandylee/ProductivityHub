using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Commands;

public class EstimateCampaignCommand : IRequest<EstimateCampaignResponse>
{
    public EstimateCampaignRequest Request { get; set; } = new();
    public Guid TenantId { get; set; }
}