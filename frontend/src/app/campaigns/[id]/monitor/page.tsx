'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Activity, WifiOff } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { MetricsChart } from '@/components/dashboard/MetricsChart'
import { ChannelToggle } from '@/components/dashboard/ChannelToggle'
import { TimespanSelect } from '@/components/dashboard/TimespanSelect'
import { useCampaignMetrics } from '@/hooks/use-campaign-metrics'
import { useAlertStore } from '@/lib/stores/alert-store'
import { 
  showFailureAlert, 
  showFailureClearedAlert,
  shouldTriggerAlert,
  calculateFailureRate,
  getAlertThreshold 
} from '@/lib/utils/alert-helpers'
import type { 
  ChannelFilter, 
  TimeWindow, 
  CampaignMetricsResponse,
  KpiData,
  DEFAULT_METRICS_FILTERS 
} from '@/lib/types/campaign-metrics'

interface CampaignMonitorPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CampaignMonitorPage({ params }: CampaignMonitorPageProps) {
  const [id, setId] = React.useState<string | null>(null)
  
  // Handle async params in client component
  React.useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])
  
  if (!id) {
    return <div>Loading...</div>
  }
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(60)

  // Real-time data fetching with polling
  const {
    data,
    isLoading,
    error,
    isError,
    isFetching,
    isPending,
    refetch
  } = useCampaignMetrics(id, {
    windowMinutes: timeWindow,
    channelFilter,
    includeTimeseries: true,
    enabled: true,
  })

  // Alert store for throttling notifications
  const alertStore = useAlertStore()

  // Handle failure rate alerts
  useEffect(() => {
    if (!data) return

    const campaignId = id
    const isTriggered = shouldTriggerAlert(data)
    const failureRate = calculateFailureRate(data)
    const threshold = getAlertThreshold(data)
    
    // Clean up old alerts periodically
    alertStore.cleanup()

    if (isTriggered) {
      // Show failure alert if not throttled
      if (alertStore.shouldNotify('failure', campaignId)) {
        showFailureAlert({
          failureRate,
          threshold,
          campaignId,
          windowSeconds: data.alert?.windowSeconds ?? 60,
        })
        alertStore.markNotified('failure', campaignId)
      }
    } else {
      // Show cleared notification if alert was previously triggered
      if (alertStore.wasTriggered('failure', campaignId)) {
        if (alertStore.shouldNotify('success', campaignId, 30000)) { // 30s throttle for success
          showFailureClearedAlert({
            campaignId,
            previousFailureRate: threshold, // Approximate previous rate
            currentFailureRate: failureRate,
          })
          alertStore.markNotified('success', campaignId)
        }
        alertStore.clearAlert('failure', campaignId)
      }
    }
  }, [data, id, alertStore])

  // Mock KPI data for skeleton/empty state display
  const kpiData: KpiData[] = [
    {
      label: 'Total Sent',
      value: data?.totals.sent ?? 0,
      format: 'number',
      tooltip: 'Total messages sent across all channels',
      tone: 'default'
    },
    {
      label: 'Delivered',
      value: data?.totals.delivered ?? 0,
      rate: data?.rates.delivered,
      format: 'number',
      tooltip: 'Successfully delivered messages',
      tone: 'success'
    },
    {
      label: 'Failed',
      value: data?.totals.failed ?? 0,
      rate: data?.rates.failure,
      format: 'number',
      tooltip: 'Failed message deliveries',
      tone: 'destructive'
    },
    {
      label: 'Open Rate',
      value: data?.rates.open ? `${(data.rates.open * 100).toFixed(1)}%` : '0.0%',
      format: 'percentage',
      tooltip: 'Percentage of delivered messages that were opened',
      tone: data?.rates.open && data.rates.open > 0.3 ? 'success' : 'warning'
    },
    {
      label: 'Click Rate',
      value: data?.rates.click ? `${(data.rates.click * 100).toFixed(1)}%` : '0.0%',
      format: 'percentage',
      tooltip: 'Percentage of delivered messages that were clicked',
      tone: data?.rates.click && data.rates.click > 0.1 ? 'success' : 'warning'
    }
  ]

  const channelLabel = channelFilter === 'all' 
    ? 'All Channels' 
    : channelFilter === 'sms' 
    ? 'SMS Only' 
    : 'KakaoTalk Only'

  const timeWindowLabel = timeWindow === 60 
    ? '1 Hour' 
    : timeWindow === 360 
    ? '6 Hours' 
    : '24 Hours'

  return (
    <div className="space-y-6" role="main">
      {/* Live Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="text-lg font-medium text-gray-900">Real-time Performance</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-xs text-gray-500">
            {isFetching ? 'Updating...' : 'Live'}
          </span>
        </div>
      </div>

      {/* Error State */}
      {isError && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load campaign metrics: {error.message}. 
            <button 
              onClick={() => refetch()}
              className="ml-2 underline hover:no-underline"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      {isFetching && !isPending && (
        <Alert>
          <Activity className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Refreshing metrics...
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-6">
            <ChannelToggle
              value={channelFilter}
              onChange={setChannelFilter}
              className="flex-shrink-0"
            />
            <TimespanSelect
              value={timeWindow}
              onChange={setTimeWindow}
              className="flex-shrink-0"
            />
            {data?.updatedAt && (
              <div className="text-xs text-gray-500">
                Last updated: {new Intl.DateTimeFormat('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(new Date(data.updatedAt))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Alert Status */}
      {data?.alert && (
        <Card className={`border-l-4 ${data.alert.triggered ? 'border-l-red-500 bg-red-50' : 'border-l-green-500 bg-green-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg flex items-center space-x-2 ${data.alert.triggered ? 'text-red-700' : 'text-green-700'}`}>
              <AlertCircle className="h-5 w-5" />
              <span>Alert Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <div className={`mt-1 ${data.alert.triggered ? 'text-red-600' : 'text-green-600'}`}>
                  {data.alert.triggered ? '🚨 Alert Triggered' : '✅ Normal'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Failure Rate:</span>
                <div className="mt-1 font-mono">
                  {(data.alert.failureRate * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Threshold:</span>
                <div className="mt-1 font-mono">
                  {(data.alert.threshold * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Check:</span>
                <div className="mt-1 text-xs">
                  {new Intl.DateTimeFormat('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }).format(new Date(data.alert.lastEvaluatedAt))}
                </div>
              </div>
            </div>
            {data.alert.lastTriggeredAt && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                Last triggered: {new Intl.DateTimeFormat('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(new Date(data.alert.lastTriggeredAt))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiData.map((kpi, index) => (
          <KpiCard
            key={index}
            {...kpi}
            isLoading={isPending || isLoading}
            className="h-full"
          />
        ))}
      </div>

      <Separator />

      {/* Time Series Chart */}
      <MetricsChart
        data={data?.timeseries || null}
        channelFilter={channelFilter}
        isLoading={isPending || isLoading}
        className="w-full"
        height={400}
      />

      {/* Additional Info */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SMS Channel */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">SMS Channel</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sent:</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat('ko-KR').format(data.channels.sms.sent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered:</span>
                    <span className="font-mono text-green-600">
                      {new Intl.NumberFormat('ko-KR').format(data.channels.sms.delivered)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-mono text-red-600">
                      {new Intl.NumberFormat('ko-KR').format(data.channels.sms.failed)}
                    </span>
                  </div>
                </div>
              </div>

              {/* KakaoTalk Channel */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">KakaoTalk Channel</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sent:</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat('ko-KR').format(data.channels.kakao.sent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered:</span>
                    <span className="font-mono text-green-600">
                      {new Intl.NumberFormat('ko-KR').format(data.channels.kakao.delivered)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-mono text-red-600">
                      {new Intl.NumberFormat('ko-KR').format(data.channels.kakao.failed)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Filter Summary */}
      <div className="text-xs text-gray-500 text-center">
        Showing metrics for {channelLabel} • {timeWindowLabel} window
      </div>
    </div>
  )
}