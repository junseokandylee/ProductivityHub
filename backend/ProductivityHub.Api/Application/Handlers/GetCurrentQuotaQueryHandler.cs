using MediatR;
using ProductivityHub.Api.DTOs;

namespace ProductivityHub.Api.Application.Handlers;

public record GetCurrentQuotaQuery(Guid TenantId) : IRequest<QuotaCurrentResponse>;

public class GetCurrentQuotaQueryHandler : IRequestHandler<GetCurrentQuotaQuery, QuotaCurrentResponse>
{
    public async Task<QuotaCurrentResponse> Handle(GetCurrentQuotaQuery request, CancellationToken cancellationToken)
    {
        // For MVP, return static quota data
        // In production, this would query actual usage from database and external provider APIs
        var smsUsed = 1500;
        var smsLimit = 10000;
        var kakaoUsed = 800;
        var kakaoLimit = 5000;
        var emailUsed = 0;
        var emailLimit = 1000;

        var response = new QuotaCurrentResponse
        {
            ChannelQuotas = new Dictionary<string, QuotaDetail>
            {
                ["SMS"] = new QuotaDetail
                {
                    Used = smsUsed,
                    Limit = smsLimit,
                    UsagePercentage = (double)smsUsed / smsLimit * 100,
                    IsNearLimit = (double)smsUsed / smsLimit > 0.8
                },
                ["KAKAO"] = new QuotaDetail
                {
                    Used = kakaoUsed,
                    Limit = kakaoLimit,
                    UsagePercentage = (double)kakaoUsed / kakaoLimit * 100,
                    IsNearLimit = (double)kakaoUsed / kakaoLimit > 0.8
                },
                ["EMAIL"] = new QuotaDetail
                {
                    Used = emailUsed,
                    Limit = emailLimit,
                    UsagePercentage = (double)emailUsed / emailLimit * 100,
                    IsNearLimit = (double)emailUsed / emailLimit > 0.8
                }
            },
            TotalUsedToday = smsUsed + kakaoUsed + emailUsed,
            TotalDailyLimit = smsLimit + kakaoLimit + emailLimit
        };

        return response;
    }
}