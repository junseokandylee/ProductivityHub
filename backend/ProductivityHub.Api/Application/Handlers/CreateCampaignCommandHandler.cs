using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Commands;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Services;

namespace ProductivityHub.Api.Application.Handlers;

public class CreateCampaignCommandHandler : IRequestHandler<CreateCampaignCommand, CreateCampaignResponse>
{
    private readonly ApplicationDbContext _context;
    private readonly IRedisService _redisService;
    private readonly IPricingService _pricingService;
    private readonly ILogger<CreateCampaignCommandHandler> _logger;

    public CreateCampaignCommandHandler(
        ApplicationDbContext context,
        IRedisService redisService,
        IPricingService pricingService,
        ILogger<CreateCampaignCommandHandler> logger)
    {
        _context = context;
        _redisService = redisService;
        _pricingService = pricingService;
        _logger = logger;
    }

    public async Task<CreateCampaignResponse> Handle(CreateCampaignCommand command, CancellationToken cancellationToken)
    {
        try
        {
            // Validate request
            var validationResult = await ValidateRequestAsync(command.Request, command.TenantId, cancellationToken);
            if (!validationResult.IsValid)
            {
                return new CreateCampaignResponse
                {
                    Status = "ValidationFailed",
                    Message = validationResult.ErrorMessage
                };
            }

            // Estimate recipients and cost
            var estimateCommand = new EstimateCampaignCommand
            {
                Request = new EstimateCampaignRequest
                {
                    Audience = command.Request.Audience,
                    Channels = command.Request.Channels
                },
                TenantId = command.TenantId
            };

            var estimate = await EstimateRecipientsAsync(estimateCommand, cancellationToken);
            
            // Check quota
            if (!estimate.QuotaOk)
            {
                return new CreateCampaignResponse
                {
                    Status = "QuotaExceeded",
                    Message = "Monthly quota would be exceeded by this campaign"
                };
            }

            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // Create campaign
                var campaign = new Campaign
                {
                    TenantId = command.TenantId,
                    Name = command.Request.FullName,
                    MessageTitle = command.Request.MessageTitle,
                    MessageBody = command.Request.MessageBody,
                    Variables = command.Request.Variables != null ? JsonSerializer.Serialize(command.Request.Variables) : null,
                    Status = CampaignStatus.Queued,
                    ScheduledAt = command.Request.ScheduledAt,
                    EstimatedRecipients = estimate.RecipientCount,
                    EstimatedCost = estimate.EstimatedCost,
                    QuotaUsed = estimate.QuotaRequired,
                    CreatedBy = command.UserId
                };

                _context.Campaigns.Add(campaign);
                await _context.SaveChangesAsync(cancellationToken);

                // Create campaign channels
                foreach (var channelRequest in command.Request.Channels)
                {
                    var campaignChannel = new CampaignChannel
                    {
                        CampaignId = campaign.Id,
                        Channel = channelRequest.Channel,
                        OrderIndex = channelRequest.OrderIndex,
                        FallbackEnabled = channelRequest.FallbackEnabled
                    };

                    _context.CampaignChannels.Add(campaignChannel);
                }

                // Create campaign audience
                var campaignAudience = new CampaignAudience
                {
                    CampaignId = campaign.Id,
                    GroupIds = command.Request.Audience.GroupIds != null ? JsonSerializer.Serialize(command.Request.Audience.GroupIds) : null,
                    SegmentIds = command.Request.Audience.SegmentIds != null ? JsonSerializer.Serialize(command.Request.Audience.SegmentIds) : null,
                    FilterJson = command.Request.Audience.FilterJson != null ? JsonSerializer.Serialize(command.Request.Audience.FilterJson) : null,
                    IncludeAll = command.Request.Audience.IncludeAll
                };

                _context.CampaignAudiences.Add(campaignAudience);

                await _context.SaveChangesAsync(cancellationToken);

                // Enqueue to Redis Stream
                var streamData = new Dictionary<string, string>
                {
                    ["campaign_id"] = campaign.Id.ToString(),
                    ["tenant_id"] = campaign.TenantId.ToString(),
                    ["status"] = "queued",
                    ["created_at"] = campaign.CreatedAt.ToString("O")
                };

                var messageId = await _redisService.StreamAddAsync("campaigns", streamData);

                if (string.IsNullOrEmpty(messageId))
                {
                    _logger.LogWarning("Failed to enqueue campaign {CampaignId} to Redis Stream", campaign.Id);
                }

                await transaction.CommitAsync(cancellationToken);

                return new CreateCampaignResponse
                {
                    CampaignId = campaign.Id,
                    Status = "Queued",
                    Message = "Campaign created successfully and queued for processing",
                    CreatedAt = campaign.CreatedAt
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Failed to create campaign");
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating campaign");
            return new CreateCampaignResponse
            {
                Status = "Error",
                Message = $"Failed to create campaign: {ex.Message}"
            };
        }
    }

    private async Task<(bool IsValid, string ErrorMessage)> ValidateRequestAsync(
        CreateCampaignRequest request, 
        Guid tenantId, 
        CancellationToken cancellationToken)
    {
        // Validate message body is not empty
        if (string.IsNullOrWhiteSpace(request.MessageBody))
        {
            return (false, "Message body cannot be empty");
        }

        // Validate channels
        if (!request.Channels.Any())
        {
            return (false, "At least one channel must be specified");
        }

        // Validate channel types
        foreach (var channel in request.Channels)
        {
            if (!ChannelTypes.IsValid(channel.Channel))
            {
                return (false, $"Invalid channel type: {channel.Channel}");
            }
        }

        // Validate channel order uniqueness
        var orderIndexes = request.Channels.Select(c => c.OrderIndex).ToList();
        if (orderIndexes.Distinct().Count() != orderIndexes.Count)
        {
            return (false, "Channel order indexes must be unique");
        }

        // Validate fallback logic - ensure fallback is not enabled for the last channel
        var sortedChannels = request.Channels.OrderBy(c => c.OrderIndex).ToList();
        var lastChannel = sortedChannels.Last();
        if (lastChannel.FallbackEnabled && sortedChannels.Count > 1)
        {
            return (false, "Fallback cannot be enabled for the last channel in the sequence");
        }

        // Validate audience selection
        var audience = request.Audience;
        if (!audience.IncludeAll && 
            (audience.GroupIds?.Any() != true) && 
            (audience.SegmentIds?.Any() != true) && 
            (audience.FilterJson?.Any() != true))
        {
            return (false, "Audience selection must target at least one recipient or set IncludeAll");
        }

        return (true, string.Empty);
    }

    private async Task<EstimateCampaignResponse> EstimateRecipientsAsync(
        EstimateCampaignCommand command, 
        CancellationToken cancellationToken)
    {
        // This is a simplified implementation
        // In production, this would query the actual contacts view with proper filtering
        var recipientCount = 1000; // Placeholder - would be calculated from contacts

        var channels = command.Request.Channels.Select(c => c.Channel).ToList();
        var estimatedCost = await _pricingService.CalculateCostAsync(recipientCount, channels);
        var quotaOk = await _pricingService.CheckQuotaAsync(command.TenantId, recipientCount);

        return new EstimateCampaignResponse
        {
            RecipientCount = recipientCount,
            EstimatedCost = estimatedCost,
            QuotaRequired = recipientCount,
            QuotaOk = quotaOk,
            Currency = "KRW",
            ChannelBreakdown = channels.ToDictionary(c => c, _ => recipientCount)
        };
    }
}