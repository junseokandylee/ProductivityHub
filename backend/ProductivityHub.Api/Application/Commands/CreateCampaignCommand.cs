using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Commands;

public class CreateCampaignCommand : IRequest<CreateCampaignResponse>
{
    public CreateCampaignRequest Request { get; set; } = new();
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
}