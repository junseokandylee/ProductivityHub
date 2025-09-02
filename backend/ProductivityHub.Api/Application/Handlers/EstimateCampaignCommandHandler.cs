using MediatR;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Application.Commands;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Services;

namespace ProductivityHub.Api.Application.Handlers;

public class EstimateCampaignCommandHandler : IRequestHandler<EstimateCampaignCommand, EstimateCampaignResponse>
{
    private readonly ApplicationDbContext _context;
    private readonly IPricingService _pricingService;
    private readonly ILogger<EstimateCampaignCommandHandler> _logger;

    public EstimateCampaignCommandHandler(
        ApplicationDbContext context,
        IPricingService pricingService,
        ILogger<EstimateCampaignCommandHandler> logger)
    {
        _context = context;
        _pricingService = pricingService;
        _logger = logger;
    }

    public async Task<EstimateCampaignResponse> Handle(EstimateCampaignCommand command, CancellationToken cancellationToken)
    {
        try
        {
            // Estimate recipient count based on audience selection
            var recipientCount = await CalculateRecipientCountAsync(command.Request.Audience, command.TenantId, cancellationToken);
            
            if (recipientCount == 0)
            {
                return new EstimateCampaignResponse
                {
                    RecipientCount = 0,
                    EstimatedCost = 0,
                    QuotaRequired = 0,
                    QuotaOk = true,
                    Currency = "KRW",
                    ChannelBreakdown = new Dictionary<string, int>()
                };
            }

            // Calculate cost based on channels
            var channels = command.Request.Channels.Select(c => c.Channel).ToList();
            var estimatedCost = await _pricingService.CalculateCostAsync(recipientCount, channels);

            // Check quota availability
            var quotaOk = await _pricingService.CheckQuotaAsync(command.TenantId, recipientCount);

            // Create channel breakdown
            var channelBreakdown = channels.ToDictionary(
                channel => channel,
                _ => recipientCount // For now, assume all recipients can be reached via each channel
            );

            return new EstimateCampaignResponse
            {
                RecipientCount = recipientCount,
                EstimatedCost = estimatedCost,
                QuotaRequired = recipientCount,
                QuotaOk = quotaOk,
                Currency = "KRW",
                ChannelBreakdown = channelBreakdown
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error estimating campaign for tenant {TenantId}", command.TenantId);
            
            return new EstimateCampaignResponse
            {
                RecipientCount = 0,
                EstimatedCost = 0,
                QuotaRequired = 0,
                QuotaOk = false,
                Currency = "KRW",
                ChannelBreakdown = new Dictionary<string, int>()
            };
        }
    }

    private async Task<int> CalculateRecipientCountAsync(
        CampaignAudienceRequest audience, 
        Guid tenantId, 
        CancellationToken cancellationToken)
    {
        try
        {
            // If IncludeAll is true, count all contacts for the tenant
            if (audience.IncludeAll)
            {
                return await _context.Contacts
                    .Where(c => c.TenantId == tenantId)
                    .CountAsync(cancellationToken);
            }

            var query = _context.Contacts.Where(c => c.TenantId == tenantId);

            // Apply group filtering
            if (audience.GroupIds?.Any() == true)
            {
                // This is a placeholder - in a real implementation, you'd have a Groups table
                // and a many-to-many relationship between Contacts and Groups
                // For now, we'll just return a mock count
                _logger.LogWarning("Group filtering not implemented yet");
            }

            // Apply segment filtering
            if (audience.SegmentIds?.Any() == true)
            {
                // This is a placeholder - segments would be pre-computed contact lists
                _logger.LogWarning("Segment filtering not implemented yet");
            }

            // Apply custom filters
            if (audience.FilterJson?.Any() == true)
            {
                // This would apply custom JSON-based filters
                // For now, we'll just log and use base query
                _logger.LogWarning("Custom filtering not implemented yet");
            }

            // For now, return a mock count based on available contacts
            // In production, this would apply all the filters properly
            var totalContacts = await query.CountAsync(cancellationToken);
            
            // Return a reasonable estimate if no specific filters are applied
            if ((audience.GroupIds?.Any() != true) && 
                (audience.SegmentIds?.Any() != true) && 
                (audience.FilterJson == null || !audience.FilterJson.Any()))
            {
                return Math.Min(totalContacts, 1000); // Cap at 1000 for demo
            }

            return totalContacts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating recipient count for tenant {TenantId}", tenantId);
            return 0;
        }
    }
}