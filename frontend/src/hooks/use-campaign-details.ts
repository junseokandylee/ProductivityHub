'use client'

import { useQuery } from '@tanstack/react-query'
import { mapApiError } from '@/lib/utils/error-handling'

/**
 * Campaign details response interface
 */
export interface CampaignDetailsResponse {
  id: string
  name: string
  description?: string
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
  scheduledAt?: string
  targetingConfig?: {
    segmentIds?: string[]
    channels?: ('sms' | 'kakao' | 'email' | 'push')[]
    filters?: Record<string, any>
  }
  abTestConfig?: {
    variants: Array<{
      id: string
      name: string
      allocation: number
      description?: string
    }>
    testType: 'message_content' | 'send_time' | 'channel_mix' | 'targeting'
    startDate: string
    endDate?: string
  }
  messageTemplates?: Array<{
    id: string
    channel: string
    subject?: string
    content: string
    variantId?: string
  }>
}

/**
 * Fetch campaign details from the API
 */
async function fetchCampaignDetails(
  campaignId: string,
  signal?: AbortSignal
): Promise<CampaignDetailsResponse> {
  const url = `/api/campaigns/${campaignId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch campaign details: ${error}`)
  }

  const data = await response.json()
  return data
}

/**
 * Query key factory for campaign details
 */
export const campaignDetailsKeys = {
  all: ['campaignDetails'] as const,
  campaign: (campaignId: string) => [...campaignDetailsKeys.all, campaignId] as const,
}

/**
 * Hook to fetch campaign details
 */
export function useCampaignDetails(campaignId: string) {
  return useQuery({
    queryKey: campaignDetailsKeys.campaign(campaignId),
    queryFn: ({ signal }) => fetchCampaignDetails(campaignId, signal),
    enabled: !!campaignId,
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes  
    refetchOnWindowFocus: false, // Campaign details don't change frequently
    refetchOnReconnect: true, // Refetch when network reconnects
    retry: (failureCount, error) => {
      const mappedError = mapApiError(error)
      // Don't retry auth errors or not found errors
      if (!mappedError.retryable) {
        return false
      }
      // Retry up to 3 times for campaign details
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => {
      // Standard exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000)
    },
  })
}

/**
 * Hook to fetch multiple campaigns details
 */
export function useCampaignsDetails(campaignIds: string[]) {
  const queries = campaignIds.map(id => ({
    queryKey: campaignDetailsKeys.campaign(id),
    queryFn: ({ signal }: { signal?: AbortSignal }) => fetchCampaignDetails(id, signal),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  }))

  // This would typically use useQueries from react-query for multiple parallel queries
  // For now, returning a simple structure
  return {
    queries,
    isLoading: false,
    error: null,
    data: []
  }
}