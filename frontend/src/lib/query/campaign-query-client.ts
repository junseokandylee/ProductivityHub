'use client';

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { mapApiError, UserFriendlyError } from '@/lib/utils/error-handling';

// Global error handler for campaign wizard
export type ErrorHandler = (error: UserFriendlyError) => void;

let globalErrorHandler: ErrorHandler | null = null;

/**
 * Set global error handler for campaign wizard
 */
export function setGlobalErrorHandler(handler: ErrorHandler) {
  globalErrorHandler = handler;
}

/**
 * Clear global error handler
 */
export function clearGlobalErrorHandler() {
  globalErrorHandler = null;
}

/**
 * Handle query/mutation errors globally
 */
function handleGlobalError(error: unknown) {
  if (globalErrorHandler) {
    const mappedError = mapApiError(error);
    globalErrorHandler(mappedError);
  }
}

/**
 * Create campaign-specific query client with error handling
 */
export function createCampaignQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const mappedError = mapApiError(error);
          // Don't retry non-retryable errors
          if (!mappedError.retryable) {
            return false;
          }
          // Retry up to 3 times for retryable errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error) => {
          const mappedError = mapApiError(error);
          // Only retry network errors for mutations
          return mappedError.retryable && 
                 (mappedError.title.includes('네트워크') || mappedError.title.includes('서버')) &&
                 failureCount < 2;
        },
        retryDelay: (attemptIndex) => {
          return Math.min(2000 * Math.pow(2, attemptIndex), 8000);
        },
      },
    },
    queryCache: new QueryCache({
      onError: handleGlobalError,
    }),
    mutationCache: new MutationCache({
      onError: handleGlobalError,
    }),
  });
}

/**
 * Query keys for campaign wizard
 */
export const campaignQueryKeys = {
  // Audience
  groups: ['audience', 'groups'] as const,
  segments: ['audience', 'segments'] as const,
  sampleContact: ['audience', 'sample-contact'] as const,
  
  // Messages
  templates: ['messages', 'templates'] as const,
  templatePreview: (templateId: string, variables: Record<string, string>) =>
    ['messages', 'template-preview', templateId, variables] as const,
  
  // Channels
  channelStatus: ['channels', 'status'] as const,
  quotas: ['quotas', 'current'] as const,
  
  // Campaigns
  campaignEstimate: (request: object) => ['campaigns', 'estimate', request] as const,
  campaigns: ['campaigns'] as const,
} as const;

/**
 * Invalidate all campaign-related queries
 */
export function invalidateAllCampaignQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['audience'] });
  queryClient.invalidateQueries({ queryKey: ['messages'] });
  queryClient.invalidateQueries({ queryKey: ['channels'] });
  queryClient.invalidateQueries({ queryKey: ['quotas'] });
  queryClient.invalidateQueries({ queryKey: ['campaigns'] });
}

/**
 * Clear all campaign-related queries
 */
export function clearAllCampaignQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['audience'] });
  queryClient.removeQueries({ queryKey: ['messages'] });
  queryClient.removeQueries({ queryKey: ['channels'] });
  queryClient.removeQueries({ queryKey: ['quotas'] });
  queryClient.removeQueries({ queryKey: ['campaigns'] });
}

// React Query configuration for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Enable query devtools in development
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => {
    // Devtools will be available in development
  });
}