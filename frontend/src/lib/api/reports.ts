'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284'

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Monthly Trend Report Types
export interface MonthlyTrendData {
  month: string
  year: number
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  cost: number
  deliveryRate: number
  openRate: number
  clickRate: number
  uniqueContacts: number
  campaigns: number
}

export interface MonthlyTrendResponse {
  period: {
    startMonth: string
    endMonth: string
    totalMonths: number
  }
  data: MonthlyTrendData[]
  summary: {
    totalSent: number
    totalDelivered: number
    totalCost: number
    avgDeliveryRate: number
    avgOpenRate: number
    avgClickRate: number
    growth: {
      sent: number
      delivered: number
      cost: number
    }
  }
  insights: {
    bestMonth: string
    worstMonth: string
    trendDirection: 'up' | 'down' | 'stable'
    seasonalPattern: string[]
    recommendations: string[]
  }
}

// Campaign Comparison Report Types
export interface CampaignComparisonItem {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'completed' | 'active' | 'paused'
  sent: number
  delivered: number
  opened: number
  clicked: number
  failed: number
  cost: number
  deliveryRate: number
  openRate: number
  clickRate: number
  roi: number
  channelBreakdown: Array<{
    channel: string
    sent: number
    cost: number
    performance: number
  }>
}

export interface CampaignComparisonResponse {
  campaigns: CampaignComparisonItem[]
  comparison: {
    topPerformer: {
      campaignId: string
      metric: string
      value: number
    }
    benchmarks: {
      avgDeliveryRate: number
      avgOpenRate: number
      avgClickRate: number
      avgCostPerMessage: number
    }
    insights: string[]
  }
}

// Contact Growth Report Types
export interface ContactGrowthData {
  date: string
  newContacts: number
  totalContacts: number
  activeContacts: number
  churnedContacts: number
  growthRate: number
  churnRate: number
  engagementScore: number
}

export interface ContactGrowthResponse {
  period: {
    startDate: string
    endDate: string
    totalDays: number
  }
  data: ContactGrowthData[]
  summary: {
    totalContacts: number
    newContacts: number
    churnedContacts: number
    netGrowth: number
    avgGrowthRate: number
    avgChurnRate: number
    avgEngagementScore: number
  }
  segmentation: Array<{
    segment: string
    count: number
    percentage: number
    growthRate: number
    engagementScore: number
  }>
  insights: {
    fastestGrowthPeriod: string
    highestChurnPeriod: string
    recommendations: string[]
  }
}

// Quota Consumption Report Types
export interface QuotaConsumptionData {
  date: string
  dailyUsage: number
  cumulativeUsage: number
  remainingQuota: number
  usagePercentage: number
  costBreakdown: Array<{
    channel: string
    messages: number
    cost: number
  }>
}

export interface QuotaConsumptionResponse {
  month: number
  year: number
  quotaLimit: number
  currentUsage: number
  remainingQuota: number
  usagePercentage: number
  projectedUsage: number
  isOverQuota: boolean
  isNearLimit: boolean
  data: QuotaConsumptionData[]
  channelBreakdown: Array<{
    channel: string
    usage: number
    percentage: number
    cost: number
    avgCostPerMessage: number
  }>
  insights: {
    burnRate: number
    projectedOverage: number
    peakUsageDays: string[]
    recommendations: string[]
  }
}

// Export Configuration Types
export interface ReportExportConfig {
  reportType: 'monthly' | 'campaigns' | 'contacts' | 'quota'
  format: 'csv' | 'xlsx' | 'pdf'
  filters?: AnalyticsFilters
  includeCharts?: boolean
  includeSummary?: boolean
  dateRange?: {
    startDate: string
    endDate: string
  }
  customFields?: string[]
}

export interface ExportResponse {
  downloadUrl: string
  filename: string
  size: number
  expiresAt: string
}

// API Functions
async function fetchMonthlyTrends(filters: {
  startMonth: string
  endMonth: string
  channels?: string[]
}): Promise<MonthlyTrendResponse> {
  const params = new URLSearchParams({
    startMonth: filters.startMonth,
    endMonth: filters.endMonth,
  })

  if (filters.channels && filters.channels.length > 0) {
    params.append('channels', filters.channels.join(','))
  }

  const { data } = await apiClient.get<MonthlyTrendResponse>(`/reports/monthly-trends?${params}`)
  return data
}

async function fetchCampaignComparison(filters: {
  campaignIds?: string[]
  startDate?: string
  endDate?: string
  status?: string[]
}): Promise<CampaignComparisonResponse> {
  const params = new URLSearchParams()

  if (filters.campaignIds && filters.campaignIds.length > 0) {
    params.append('campaignIds', filters.campaignIds.join(','))
  }

  if (filters.startDate) {
    params.append('startDate', filters.startDate)
  }

  if (filters.endDate) {
    params.append('endDate', filters.endDate)
  }

  if (filters.status && filters.status.length > 0) {
    params.append('status', filters.status.join(','))
  }

  const { data } = await apiClient.get<CampaignComparisonResponse>(`/reports/campaign-comparison?${params}`)
  return data
}

async function fetchContactGrowth(filters: {
  startDate: string
  endDate: string
  segmentBy?: 'channel' | 'tag' | 'source'
}): Promise<ContactGrowthResponse> {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  })

  if (filters.segmentBy) {
    params.append('segmentBy', filters.segmentBy)
  }

  const { data } = await apiClient.get<ContactGrowthResponse>(`/reports/contact-growth?${params}`)
  return data
}

async function fetchQuotaConsumption(filters: {
  month: number
  year: number
  channels?: string[]
}): Promise<QuotaConsumptionResponse> {
  const params = new URLSearchParams({
    month: filters.month.toString(),
    year: filters.year.toString(),
  })

  if (filters.channels && filters.channels.length > 0) {
    params.append('channels', filters.channels.join(','))
  }

  const { data } = await apiClient.get<QuotaConsumptionResponse>(`/reports/quota-consumption?${params}`)
  return data
}

async function exportReport(config: ReportExportConfig): Promise<ExportResponse> {
  const { data } = await apiClient.post<ExportResponse>('/reports/export', config)
  return data
}

// React Query Hooks
export function useMonthlyTrends(filters: {
  startMonth: string
  endMonth: string
  channels?: string[]
}) {
  return useQuery({
    queryKey: ['reports', 'monthly-trends', filters],
    queryFn: () => fetchMonthlyTrends(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000
  })
}

export function useCampaignComparison(filters: {
  campaignIds?: string[]
  startDate?: string
  endDate?: string
  status?: string[]
}) {
  return useQuery({
    queryKey: ['reports', 'campaign-comparison', filters],
    queryFn: () => fetchCampaignComparison(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000
  })
}

export function useContactGrowth(filters: {
  startDate: string
  endDate: string
  segmentBy?: 'channel' | 'tag' | 'source'
}) {
  return useQuery({
    queryKey: ['reports', 'contact-growth', filters],
    queryFn: () => fetchContactGrowth(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000
  })
}

export function useQuotaConsumption(filters: {
  month: number
  year: number
  channels?: string[]
}) {
  return useQuery({
    queryKey: ['reports', 'quota-consumption', filters],
    queryFn: () => fetchQuotaConsumption(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 1000
  })
}

export { exportReport }