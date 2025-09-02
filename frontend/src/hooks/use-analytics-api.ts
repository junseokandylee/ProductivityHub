'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { AnalyticsFilters } from './use-analytics-filters'

// Types for API responses
export interface AnalyticsKpi {
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  unsubscribed: number
  bounced: number
  spamReports: number
  totalCost: number
  uniqueCampaigns: number
  uniqueContacts: number
}

export interface AnalyticsRates {
  deliveryRate: number
  openRate: number
  clickRate: number
  clickThroughRate: number
  failureRate: number
  unsubscribeRate: number
  bounceRate: number
  spamRate: number
}

export interface ChannelBreakdown {
  channel: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  cost: number
  deliveryRate: number
  openRate: number
  clickRate: number
}

export interface AnalyticsSummaryResponse {
  scope: string
  campaignId?: string
  from: string
  to: string
  kpi: AnalyticsKpi
  rates: AnalyticsRates
  channelBreakdowns: ChannelBreakdown[]
  failureBreakdowns: Array<{
    failureCode?: string
    failureReason?: string
    count: number
    percentage: number
  }>
}

export interface TimeBucket {
  timestamp: string
  label: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  unsubscribed: number
  bounced: number
  spamReports: number
  totalCost: number
  deliveryRate: number
  openRate: number
  clickRate: number
}

export interface ChartDataset {
  label: string
  data: number[]
  borderColor: string
  backgroundColor: string
  fill: boolean
  tension: number
  borderWidth: number
}

export interface TimeSeriesResponse {
  scope: string
  campaignId?: string
  from: string
  to: string
  interval: string
  timeZone: string
  datasets: ChartDataset[]
  buckets: TimeBucket[]
  metadata: {
    totalBuckets: number
    emptyBuckets: number
    actualStart: string
    actualEnd: string
    eventTypes: string[]
    channels: string[]
  }
}

export interface FunnelStage {
  name: string
  displayName: string
  count: number
  conversionRate: number
  absoluteRate: number
  dropOffRate: number
  dropOffCount: number
  order: number
  color: string
  width: number
}

export interface FunnelResponse {
  scope: string
  campaignId?: string
  from: string
  to: string
  conversionModel: string
  stages: FunnelStage[]
  channelFunnels: Array<{
    channel: string
    stages: FunnelStage[]
    overallConversionRate: number
    bestStage: string
    worstStage: string
  }>
  insights: {
    biggestDropOff: string
    biggestDropOffRate: number
    biggestDropOffCount: number
    bestPerformingChannel: string
    bestChannelConversionRate: number
    overallConversionRate: number
    deliveryEfficiency: number
    engagementRate: number
    recommendations: string[]
  }
}

export interface CostQuotaResponse {
  scope: string
  campaignId?: string
  month: number
  year: number
  totalCost: {
    total: number
    currency: string
    totalMessages: number
    averageCostPerMessage: number
  }
  channelCosts: Array<{
    channel: string
    cost: number
    messageCount: number
    averageCostPerMessage: number
    percentageOfTotal: number
  }>
  quotaUsage: {
    monthlyLimit: number
    monthToDateUsage: number
    remainingQuota: number
    usagePercentage: number
    daysRemainingInMonth: number
    dailyAverageUsage: number
    projectedMonthEndUsage: number
    isOverQuota: boolean
    isNearQuota: boolean
  }
}

// API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284'

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Query functions
async function fetchAnalyticsSummary(filters: AnalyticsFilters): Promise<AnalyticsSummaryResponse> {
  const params = new URLSearchParams({
    scope: filters.scope,
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
  })

  if (filters.campaignId) {
    params.append('campaignId', filters.campaignId)
  }

  if (filters.channels.length > 0) {
    params.append('channels', filters.channels.join(','))
  }

  if (filters.abGroup) {
    params.append('abGroup', filters.abGroup)
  }

  const { data } = await apiClient.get<AnalyticsSummaryResponse>(`/analytics/summary?${params}`)
  return data
}

async function fetchTimeSeriesMetrics(filters: AnalyticsFilters): Promise<TimeSeriesResponse> {
  const params = new URLSearchParams({
    scope: filters.scope,
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    interval: filters.interval,
    timezone: filters.timezone,
  })

  if (filters.campaignId) {
    params.append('campaignId', filters.campaignId)
  }

  if (filters.channels.length > 0) {
    params.append('channels', filters.channels.join(','))
  }

  const { data } = await apiClient.get<TimeSeriesResponse>(`/analytics/timeseries?${params}`)
  return data
}

async function fetchFunnelMetrics(filters: AnalyticsFilters): Promise<FunnelResponse> {
  const params = new URLSearchParams({
    scope: filters.scope,
    from: filters.from.toISOString(),
    to: filters.to.toISOString(),
    conversionModel: filters.conversionModel,
  })

  if (filters.campaignId) {
    params.append('campaignId', filters.campaignId)
  }

  if (filters.channels.length > 0) {
    params.append('channels', filters.channels.join(','))
  }

  if (filters.abGroup) {
    params.append('abGroup', filters.abGroup)
  }

  const { data } = await apiClient.get<FunnelResponse>(`/analytics/funnel?${params}`)
  return data
}

async function fetchCostQuota(filters: AnalyticsFilters): Promise<CostQuotaResponse> {
  const params = new URLSearchParams({
    scope: filters.scope,
  })

  if (filters.campaignId) {
    params.append('campaignId', filters.campaignId)
  }

  if (filters.channels.length > 0) {
    params.append('channels', filters.channels.join(','))
  }

  const { data } = await apiClient.get<CostQuotaResponse>(`/analytics/cost-quota?${params}`)
  return data
}

// React Query hooks
export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'summary', filters],
    queryFn: () => fetchAnalyticsSummary(filters),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60, // 1 minute
    retry: 2,
    retryDelay: 1000
  })
}

export function useTimeSeriesMetrics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'timeseries', filters],
    queryFn: () => fetchTimeSeriesMetrics(filters),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60, // 1 minute
    retry: 2,
    retryDelay: 1000
  })
}

export function useFunnelMetrics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'funnel', filters],
    queryFn: () => fetchFunnelMetrics(filters),
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // 2 minutes
    retry: 2,
    retryDelay: 1000
  })
}

export function useCostQuota(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'cost-quota', filters],
    queryFn: () => fetchCostQuota(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: 1000
  })
}

// Utility hook for manual refresh
export function useAnalyticsRefresh() {
  const queryClient = useQueryClient()

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const refreshSummary = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics', 'summary'] })
  }

  const refreshTimeSeries = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics', 'timeseries'] })
  }

  const refreshFunnel = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics', 'funnel'] })
  }

  const refreshCostQuota = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics', 'cost-quota'] })
  }

  return {
    refreshAll,
    refreshSummary,
    refreshTimeSeries,
    refreshFunnel,
    refreshCostQuota
  }
}