import { Page } from '@playwright/test'

export interface MockKPIData {
  totalCampaigns: { value: number; deltaPct: number; color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral' }
  totalImpressions: { value: number; deltaPct: number; color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral' }
  clickThroughRate: { value: number; deltaPct: number; color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral' }
  conversionRate: { value: number; deltaPct: number; color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral' }
}

export interface MockTimeSeriesData {
  timestamp: string
  impressions: number
  clicks: number
  conversions: number
}

export interface MockFunnelStage {
  id: string
  label: string
  value: number
  color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral'
  description?: string
}

export interface MockCampaignData {
  id: string
  campaignName: string
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  conversionRate: number
  cost?: number
  status?: 'active' | 'paused' | 'completed'
  createdAt?: string
}

export const defaultMockKPIs: MockKPIData = {
  totalCampaigns: { value: 1245, deltaPct: 12.5, color: 'baseline' },
  totalImpressions: { value: 2485720, deltaPct: 8.3, color: 'baseline' },
  clickThroughRate: { value: 3.2, deltaPct: -2.1, color: 'click' },
  conversionRate: { value: 1.8, deltaPct: 15.4, color: 'conversion' }
}

export const defaultMockTimeSeries: MockTimeSeriesData[] = [
  { timestamp: '2024-01-01T00:00:00Z', impressions: 15000, clicks: 480, conversions: 72 },
  { timestamp: '2024-01-02T00:00:00Z', impressions: 18500, clicks: 592, conversions: 89 },
  { timestamp: '2024-01-03T00:00:00Z', impressions: 22000, clicks: 704, conversions: 106 },
  { timestamp: '2024-01-04T00:00:00Z', impressions: 19800, clicks: 634, conversions: 95 },
  { timestamp: '2024-01-05T00:00:00Z', impressions: 23500, clicks: 752, conversions: 113 },
  { timestamp: '2024-01-06T00:00:00Z', impressions: 21200, clicks: 678, conversions: 101 },
  { timestamp: '2024-01-07T00:00:00Z', impressions: 24800, clicks: 794, conversions: 119 }
]

export const defaultMockFunnel: MockFunnelStage[] = [
  { id: 'impressions', label: 'Impressions', value: 100000, color: 'baseline', description: 'Total ad impressions' },
  { id: 'clicks', label: 'Clicks', value: 3200, color: 'click', description: 'Users who clicked' },
  { id: 'conversions', label: 'Conversions', value: 1800, color: 'conversion', description: 'Completed actions' }
]

export const defaultMockCampaigns: MockCampaignData[] = [
  { 
    id: 'camp-1', 
    campaignName: 'Summer Sale 2024', 
    impressions: 45000, 
    clicks: 1440, 
    conversions: 216, 
    ctr: 3.2, 
    conversionRate: 15.0,
    cost: 450000,
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z'
  },
  { 
    id: 'camp-2', 
    campaignName: 'Back to School', 
    impressions: 38500, 
    clicks: 1232, 
    conversions: 185, 
    ctr: 3.2, 
    conversionRate: 15.0,
    cost: 385000,
    status: 'completed',
    createdAt: '2024-01-15T00:00:00Z'
  },
  { 
    id: 'camp-3', 
    campaignName: 'Holiday Special', 
    impressions: 52000, 
    clicks: 1664, 
    conversions: 249, 
    ctr: 3.2, 
    conversionRate: 15.0,
    cost: 520000,
    status: 'paused',
    createdAt: '2024-02-01T00:00:00Z'
  }
]

export async function mockCampaignAnalyticsAPI(
  page: Page,
  options: {
    kpis?: MockKPIData
    timeSeries?: MockTimeSeriesData[]
    funnel?: MockFunnelStage[]
    campaigns?: MockCampaignData[]
    delay?: number
    shouldFail?: boolean
    failureType?: 'timeout' | 'error' | 'unauthorized'
  } = {}
) {
  const {
    kpis = defaultMockKPIs,
    timeSeries = defaultMockTimeSeries,
    funnel = defaultMockFunnel,
    campaigns = defaultMockCampaigns,
    delay = 0,
    shouldFail = false,
    failureType = 'error'
  } = options

  // Mock KPI endpoint
  await page.route('/api/analytics/kpis', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    if (shouldFail) {
      if (failureType === 'timeout') {
        // Don't respond to simulate timeout
        return
      } else if (failureType === 'unauthorized') {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized access' })
        })
        return
      } else {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
        return
      }
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ kpis })
    })
  })

  // Mock time series endpoint
  await page.route('/api/analytics/timeseries', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    if (shouldFail) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load time series data' })
      })
      return
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ timeseries: timeSeries })
    })
  })

  // Mock funnel endpoint
  await page.route('/api/analytics/funnel', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    if (shouldFail) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load funnel data' })
      })
      return
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ funnel })
    })
  })

  // Mock campaigns table endpoint  
  await page.route('/api/analytics/campaigns', async (route) => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    if (shouldFail) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load campaigns data' })
      })
      return
    }

    // Handle query parameters for search/filtering
    const url = new URL(route.request().url())
    const search = url.searchParams.get('search')
    const sortBy = url.searchParams.get('sortBy')
    const sortOrder = url.searchParams.get('sortOrder')
    const page_num = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')

    let filteredCampaigns = [...campaigns]

    // Apply search filter
    if (search) {
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.campaignName.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Apply sorting
    if (sortBy && sortOrder) {
      filteredCampaigns.sort((a, b) => {
        const aVal = a[sortBy as keyof MockCampaignData]
        const bVal = b[sortBy as keyof MockCampaignData]
        
        const modifier = sortOrder === 'desc' ? -1 : 1
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * modifier
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * modifier
        }
        
        return 0
      })
    }

    // Apply pagination
    const startIndex = (page_num - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex)

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        campaigns: paginatedCampaigns,
        total: filteredCampaigns.length,
        page: page_num,
        pageSize,
        totalPages: Math.ceil(filteredCampaigns.length / pageSize)
      })
    })
  })

  // Mock CSV export endpoint
  await page.route('/api/analytics/export/csv', async (route) => {
    if (shouldFail) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Export failed' })
      })
      return
    }

    // Generate CSV content
    const headers = ['Campaign Name', 'Impressions', 'Clicks', 'Conversions', 'CTR (%)', 'Conversion Rate (%)', 'Cost (₩)', 'Status']
    const csvRows = campaigns.map(campaign => [
      campaign.campaignName,
      campaign.impressions.toString(),
      campaign.clicks.toString(),
      campaign.conversions.toString(),
      campaign.ctr.toFixed(2),
      campaign.conversionRate.toFixed(2),
      campaign.cost?.toLocaleString() || '0',
      campaign.status || 'unknown'
    ])

    const csvContent = [headers, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="campaign-analytics.csv"'
      },
      body: csvContent
    })
  })
}

export function generateLargeMockData(size: number): MockCampaignData[] {
  const campaigns: MockCampaignData[] = []
  
  for (let i = 0; i < size; i++) {
    campaigns.push({
      id: `camp-${i + 1}`,
      campaignName: `Campaign ${i + 1}`,
      impressions: Math.floor(Math.random() * 100000) + 10000,
      clicks: Math.floor(Math.random() * 5000) + 500,
      conversions: Math.floor(Math.random() * 500) + 50,
      ctr: Math.random() * 10 + 1,
      conversionRate: Math.random() * 25 + 5,
      cost: Math.floor(Math.random() * 1000000) + 100000,
      status: ['active', 'paused', 'completed'][Math.floor(Math.random() * 3)] as any,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    })
  }
  
  return campaigns
}

export const emptyMockData = {
  kpis: {
    totalCampaigns: { value: 0, deltaPct: 0, color: 'neutral' as const },
    totalImpressions: { value: 0, deltaPct: 0, color: 'neutral' as const },
    clickThroughRate: { value: 0, deltaPct: 0, color: 'neutral' as const },
    conversionRate: { value: 0, deltaPct: 0, color: 'neutral' as const }
  },
  timeSeries: [],
  funnel: [],
  campaigns: []
}