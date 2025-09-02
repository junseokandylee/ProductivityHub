using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Handlers;

public record GetChannelStatusQuery(Guid TenantId) : IRequest<List<ChannelStatusResponse>>;

public class GetChannelStatusQueryHandler : IRequestHandler<GetChannelStatusQuery, List<ChannelStatusResponse>>
{
    public async Task<List<ChannelStatusResponse>> Handle(GetChannelStatusQuery request, CancellationToken cancellationToken)
    {
        // For MVP, return static channel configuration
        // In production, this would query actual channel provider APIs and database quotas
        var channels = new List<ChannelStatusResponse>
        {
            new ChannelStatusResponse
            {
                Channel = "SMS",
                IsEnabled = true,
                QuotaRemaining = 8500,
                DailyLimit = 10000,
                HasWarning = false
            },
            new ChannelStatusResponse
            {
                Channel = "KAKAO",
                IsEnabled = true,
                QuotaRemaining = 4200,
                DailyLimit = 5000,
                HasWarning = true,
                WarningMessage = "카카오 채널 할당량이 80%를 초과했습니다"
            },
            new ChannelStatusResponse
            {
                Channel = "EMAIL",
                IsEnabled = false,
                QuotaRemaining = 0,
                DailyLimit = 1000,
                HasWarning = false
            }
        };

        return channels;
    }
}