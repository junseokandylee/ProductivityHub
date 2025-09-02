'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { subDays, format } from 'date-fns'

export interface AnalyticsFilters {
  scope: 'global' | 'campaign'
  campaignId?: string
  from: Date
  to: Date
  channels: string[]
  interval: '5m' | '1h' | '1d'
  timezone: string
  abGroup?: string
  conversionModel: 'stepwise' | 'absolute'
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  scope: 'global',
  from: subDays(new Date(), 30),
  to: new Date(),
  channels: [],
  interval: '1h',
  timezone: 'Asia/Seoul',
  conversionModel: 'stepwise'
}

export function useAnalyticsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const params = new URLSearchParams(searchParams?.toString())
    
    return {
      scope: (params.get('scope') as 'global' | 'campaign') || DEFAULT_FILTERS.scope,
      campaignId: params.get('campaignId') || undefined,
      from: params.get('from') ? new Date(params.get('from')!) : DEFAULT_FILTERS.from,
      to: params.get('to') ? new Date(params.get('to')!) : DEFAULT_FILTERS.to,
      channels: params.get('channels')?.split(',').filter(Boolean) || DEFAULT_FILTERS.channels,
      interval: (params.get('interval') as '5m' | '1h' | '1d') || DEFAULT_FILTERS.interval,
      timezone: params.get('timezone') || DEFAULT_FILTERS.timezone,
      abGroup: params.get('abGroup') || undefined,
      conversionModel: (params.get('conversionModel') as 'stepwise' | 'absolute') || DEFAULT_FILTERS.conversionModel
    }
  })

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: AnalyticsFilters) => {
    const params = new URLSearchParams()
    
    if (newFilters.scope !== DEFAULT_FILTERS.scope) {
      params.set('scope', newFilters.scope)
    }
    
    if (newFilters.campaignId) {
      params.set('campaignId', newFilters.campaignId)
    }
    
    if (newFilters.from.toISOString() !== DEFAULT_FILTERS.from.toISOString()) {
      params.set('from', format(newFilters.from, 'yyyy-MM-dd'))
    }
    
    if (newFilters.to.toISOString() !== DEFAULT_FILTERS.to.toISOString()) {
      params.set('to', format(newFilters.to, 'yyyy-MM-dd'))
    }
    
    if (newFilters.channels.length > 0) {
      params.set('channels', newFilters.channels.join(','))
    }
    
    if (newFilters.interval !== DEFAULT_FILTERS.interval) {
      params.set('interval', newFilters.interval)
    }
    
    if (newFilters.timezone !== DEFAULT_FILTERS.timezone) {
      params.set('timezone', newFilters.timezone)
    }
    
    if (newFilters.abGroup) {
      params.set('abGroup', newFilters.abGroup)
    }
    
    if (newFilters.conversionModel !== DEFAULT_FILTERS.conversionModel) {
      params.set('conversionModel', newFilters.conversionModel)
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`
    router.replace(newUrl, { scroll: false })
  }, [router])

  // Update a single filter
  const updateFilter = useCallback(<K extends keyof AnalyticsFilters>(
    key: K,
    value: AnalyticsFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    updateUrl(newFilters)
  }, [filters, updateUrl])

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<AnalyticsFilters>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    updateUrl(newFilters)
  }, [filters, updateUrl])

  // Reset to defaults
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    updateUrl(DEFAULT_FILTERS)
  }, [updateUrl])

  // Preset date ranges
  const setDateRange = useCallback((range: 'today' | '7d' | '30d' | '90d' | 'custom') => {
    const now = new Date()
    let from: Date
    let to: Date = now

    switch (range) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7d':
        from = subDays(now, 7)
        break
      case '30d':
        from = subDays(now, 30)
        break
      case '90d':
        from = subDays(now, 90)
        break
      default:
        return // For 'custom', don't change dates
    }

    updateFilters({ from, to })
  }, [updateFilters])

  // Validate filters
  const isValidDateRange = filters.from <= filters.to
  const maxRangeDays = filters.interval === '5m' ? 1 : filters.interval === '1h' ? 30 : 365
  const isValidRangeLength = (filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24) <= maxRangeDays

  // Generate cache keys for react-query
  const getCacheKey = useCallback((endpoint: string, additionalParams?: Record<string, any>) => {
    return [
      endpoint,
      {
        scope: filters.scope,
        campaignId: filters.campaignId,
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        channels: filters.channels,
        interval: filters.interval,
        timezone: filters.timezone,
        abGroup: filters.abGroup,
        conversionModel: filters.conversionModel,
        ...additionalParams
      }
    ]
  }, [filters])

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    setDateRange,
    getCacheKey,
    validation: {
      isValidDateRange,
      isValidRangeLength,
      maxRangeDays
    }
  }
}