'use client'

import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { GlobalKpiCards } from '@/components/analytics/global-kpi-cards'
import { GlobalTimeSeriesChart } from '@/components/analytics/global-timeseries-chart'
import { GlobalFunnelChart } from '@/components/analytics/global-funnel-chart'
import { AnalyticsFiltersBar } from '@/components/analytics/analytics-filters-bar'
import { QuotaProgressCard } from '@/components/analytics/quota-progress-card'
import { CostByChannelChart } from '@/components/analytics/cost-by-channel-chart'
import { CostOverTimeChart } from '@/components/analytics/cost-over-time-chart'
import { ExportMenu } from '@/components/analytics/export-menu'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { Skeleton } from '@/components/ui/skeleton'

export default function GlobalAnalyticsPage() {
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Global campaign performance and insights
          </p>
        </div>
        <ExportMenu filters={{ ...filters, scope: 'global' }} />
      </div>

      {/* Filters */}
      <AnalyticsFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
      />

      {/* KPI Cards */}
      <Suspense fallback={<KpiCardsSkeleton />}>
        <GlobalKpiCards filters={filters} />
      </Suspense>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Trends Over Time</h3>
            </div>
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <GlobalTimeSeriesChart filters={filters} />
            </Suspense>
          </div>
        </Card>

        {/* Funnel Chart */}
        <Card className="col-span-1 lg:col-span-1">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Conversion Funnel</h3>
            </div>
            <Suspense fallback={<ChartSkeleton className="h-64" />}>
              <GlobalFunnelChart filters={filters} />
            </Suspense>
          </div>
        </Card>

        {/* Quota Progress Card */}
        <Card className="col-span-1 lg:col-span-1">
          <Suspense fallback={<ChartSkeleton className="h-64" />}>
            <QuotaProgressCard filters={filters} />
          </Suspense>
        </Card>
      </div>

      {/* Cost Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Over Time */}
        <Card className="col-span-1 lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cost Trends</h3>
            </div>
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <CostOverTimeChart filters={filters} />
            </Suspense>
          </div>
        </Card>

        {/* Cost by Channel */}
        <Card className="col-span-1 lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cost Breakdown by Channel</h3>
            </div>
            <Suspense fallback={<ChartSkeleton className="h-64" />}>
              <CostByChannelChart filters={filters} />
            </Suspense>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Loading Skeletons
function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className || "h-64 w-full"} />
}