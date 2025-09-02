import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsAPI, type EstimateCampaignRequest, type CreateCampaignRequest, type CampaignListParams } from '@/lib/api/campaigns';

// Query keys
const QUERY_KEYS = {
  campaigns: (params: CampaignListParams) => ['campaigns', params] as const,
  campaign: (id: string) => ['campaign', id] as const,
} as const;

// Hook for campaigns list with search and filters
export function useCampaigns(params: CampaignListParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.campaigns(params),
    queryFn: () => campaignsAPI.getCampaigns(params),
    keepPreviousData: true,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for campaign status updates
  });
}

// Hook for single campaign details
export function useCampaign(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.campaign(id),
    queryFn: () => campaignsAPI.getCampaign(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for campaign estimation
export function useEstimateCampaign() {
  return useMutation({
    mutationFn: (request: EstimateCampaignRequest) => campaignsAPI.estimateCampaign(request),
    onError: (error) => {
      console.error('Campaign estimation failed:', error);
    },
  });
}

// Hook for campaign creation
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CreateCampaignRequest) => campaignsAPI.createCampaign(request),
    onSuccess: () => {
      // Invalidate any campaign-related queries when a new campaign is created
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
    },
    onError: (error) => {
      console.error('Campaign creation failed:', error);
    },
  });
}