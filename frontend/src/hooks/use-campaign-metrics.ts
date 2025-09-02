'use client';

import { useQuery } from '@tanstack/react-query';
import type { 
  CampaignMetricsResponse,
  ChannelFilter,
  TimeWindow 
} from '@/lib/types/campaign-metrics';
import { mapApiError } from '@/lib/utils/error-handling';

/**
 * Options for useCampaignMetrics hook
 */
export interface UseCampaignMetricsOptions {
  /** Time window in minutes for time series data */
  windowMinutes?: number;
  /** Channel filter for metrics */
  channelFilter?: ChannelFilter;
  /** Include time series data in response */
  includeTimeseries?: boolean;
  /** Enable/disable polling */
  enabled?: boolean;
  /** Custom poll interval in milliseconds */
  pollInterval?: number;
}

/**
 * Fetch campaign metrics from the API
 */
async function fetchCampaignMetrics(
  campaignId: string,
  options: UseCampaignMetricsOptions,
  signal?: AbortSignal
): Promise<CampaignMetricsResponse> {
  const params = new URLSearchParams();
  
  if (options.windowMinutes) {
    params.set('windowMinutes', options.windowMinutes.toString());
  }
  
  if (options.includeTimeseries !== undefined) {
    params.set('includeTimeseries', options.includeTimeseries.toString());
  }

  const url = `/api/campaigns/${campaignId}/metrics${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch campaign metrics: ${error}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Query key factory for campaign metrics
 */
export const campaignMetricsKeys = {
  all: ['campaignMetrics'] as const,
  campaign: (campaignId: string) => [...campaignMetricsKeys.all, campaignId] as const,
  metrics: (
    campaignId: string, 
    windowMinutes: number, 
    channelFilter: ChannelFilter,
    includeTimeseries: boolean
  ) => [...campaignMetricsKeys.campaign(campaignId), windowMinutes, channelFilter, includeTimeseries] as const,
};

/**
 * Hook to fetch campaign metrics with automatic polling
 */
export function useCampaignMetrics(
  campaignId: string,
  options: UseCampaignMetricsOptions = {}
) {
  const {
    windowMinutes = 60,
    channelFilter = 'all',
    includeTimeseries = true,
    enabled = true,
    pollInterval,
  } = options;

  // Get poll interval from environment or use default
  const defaultPollInterval = Number(
    process.env.NEXT_PUBLIC_MONITOR_POLL_MS ?? '5000'
  );
  const refetchInterval = pollInterval ?? defaultPollInterval;

  return useQuery({
    queryKey: campaignMetricsKeys.metrics(
      campaignId,
      windowMinutes,
      channelFilter,
      includeTimeseries
    ),
    queryFn: ({ signal }) => 
      fetchCampaignMetrics(
        campaignId,
        { windowMinutes, channelFilter, includeTimeseries },
        signal
      ),
    enabled: enabled && !!campaignId,
    staleTime: 2000, // Consider data stale after 2 seconds for real-time feel
    refetchInterval, // Poll every 5 seconds by default
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchIntervalInBackground: false, // Don't poll when tab is not active
    retry: (failureCount, error) => {
      const mappedError = mapApiError(error);
      // Don't retry auth errors
      if (!mappedError.retryable) {
        return false;
      }
      // Retry up to 2 times for polling queries
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Shorter retry delay for real-time data: 1s, 2s
      return Math.min(1000 * Math.pow(2, attemptIndex), 2000);
    },
    // Keep previous data during refetch for smooth transitions
    placeholderData: (previousData) => previousData,
    select: (data) => {
      // Apply client-side channel filtering if needed
      if (channelFilter === 'all') {
        return data;
      }

      // Filter timeseries data based on channel if needed
      // This is optional - the backend API could handle this
      return data;
    },
  });
}

/**
 * Hook to fetch campaign metrics without polling (one-time fetch)
 */
export function useCampaignMetricsOnce(
  campaignId: string,
  options: Omit<UseCampaignMetricsOptions, 'pollInterval'> = {}
) {
  return useCampaignMetrics(campaignId, {
    ...options,
    pollInterval: 0, // Disable polling
  });
}