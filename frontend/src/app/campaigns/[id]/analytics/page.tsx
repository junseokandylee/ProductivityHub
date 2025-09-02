'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, BarChart3 } from 'lucide-react'
import { GlobalKpiCards } from '@/components/analytics/global-kpi-cards'
import { GlobalTimeSeriesChart } from '@/components/analytics/global-timeseries-chart'
import { GlobalFunnelChart } from '@/components/analytics/global-funnel-chart'
import { AnalyticsFiltersBar } from '@/components/analytics/analytics-filters-bar'
import { AbTestPerformanceWidget } from '@/components/analytics/ab-test-performance-widget'
import { QuotaProgressCard } from '@/components/analytics/quota-progress-card'
import { CostByChannelChart } from '@/components/analytics/cost-by-channel-chart'
import { ExportMenu } from '@/components/analytics/export-menu'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { useCampaignDetails } from '@/hooks/use-campaign-details'
import { useAnalyticsRefresh } from '@/hooks/use-analytics-api'

interface CampaignAnalyticsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CampaignAnalyticsPage({ params }: CampaignAnalyticsPageProps) {
  const [id, setId] = React.useState<string | null>(null)
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()
  
  // Handle async params in client component
  React.useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])
  
  if (!id) {
    return <div>Loading...</div>
  }
  const { refreshAll } = useAnalyticsRefresh()
  
  // Set campaign-specific scope in filters
  const campaignFilters = {
    ...filters,
    scope: 'campaign' as const,
    campaignId: id
  }

  // Get campaign details for context
  const { data: campaignData, isLoading: campaignLoading, error: campaignError } = useCampaignDetails(id)

  // Handle manual refresh
  const handleRefresh = () => {
    refreshAll()
  }

  return (
    <div className="space-y-6" role="main">

      {/* Campaign Error State */}
      {campaignError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load campaign details. Some features may not work properly.
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analytics Filters</CardTitle>
            <ExportMenu filters={campaignFilters} />
          </div>
        </CardHeader>
        <CardContent>
          <AnalyticsFiltersBar
            filters={campaignFilters}
            onFilterChange={updateFilter}
            onReset={resetFilters}
            onRefresh={handleRefresh}
            showScopeSelector={false} // Hide scope selector since it's campaign-specific
          />
        </CardContent>
      </Card>

      <Separator />

      {/* A/B Test Performance - Show only if campaign has A/B variants */}
      {campaignData?.abTestConfig && (
        <>
          <AbTestPerformanceWidget
            campaignId={id}
            filters={campaignFilters}
            config={campaignData.abTestConfig}
          />
          <Separator />
        </>
      )}

      {/* KPI Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Key Performance Indicators</h2>
        <GlobalKpiCards filters={campaignFilters} />
      </div>

      <Separator />

      {/* Time Series Chart */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Performance Over Time</h2>
        <GlobalTimeSeriesChart filters={campaignFilters} height={400} />
      </div>

      <Separator />

      {/* Funnel Analysis */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Conversion Funnel</h2>
        <GlobalFunnelChart filters={campaignFilters} />
      </div>

      <Separator />

      {/* Cost & Quota Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign-specific Quota Progress */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Quota Impact</h2>
          <QuotaProgressCard filters={campaignFilters} />
        </div>

        {/* Campaign Cost Breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Cost Breakdown</h2>
          <Card>
            <CardContent className="p-6">
              <CostByChannelChart filters={campaignFilters} height={300} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Campaign-Specific Info */}
      {campaignData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Campaign Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium capitalize ${
                      campaignData.status === 'active' ? 'text-green-600' :
                      campaignData.status === 'paused' ? 'text-yellow-600' :
                      campaignData.status === 'completed' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {campaignData.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-mono text-xs">
                      {new Date(campaignData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {campaignData.scheduledAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scheduled:</span>
                      <span className="font-mono text-xs">
                        {new Date(campaignData.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {campaignData.targetingConfig && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Targeting</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Segments:</span>
                      <span className="font-mono">
                        {campaignData.targetingConfig.segmentIds?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Channels:</span>
                      <span className="font-mono">
                        {campaignData.targetingConfig.channels?.join(', ') || 'All'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {campaignData.abTestConfig && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">A/B Testing</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variants:</span>
                      <span className="font-mono">
                        {campaignData.abTestConfig.variants?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Traffic Split:</span>
                      <span className="font-mono text-xs">
                        {campaignData.abTestConfig.variants?.map(v => `${v.allocation}%`).join(' / ') || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Analytics data is updated in real-time • All times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </div>
    </div>
  )
}