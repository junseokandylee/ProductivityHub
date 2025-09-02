'use client'

import { Suspense } from 'react'
import { useAuth } from '@/lib/auth/context'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
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
import Link from 'next/link'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-6">
                <h1 className="text-xl font-semibold text-gray-900">
                  정치생산성허브
                </h1>
                <nav className="flex space-x-4">
                  <Link
                    href="/dashboard"
                    className="text-blue-600 font-medium px-3 py-2 rounded-md text-sm bg-blue-50"
                  >
                    대시보드
                  </Link>
                  <Link
                    href="/campaigns"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
                  >
                    캠페인
                  </Link>
                  <Link
                    href="/contacts"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
                  >
                    연락처
                  </Link>
                  <Link
                    href="/analytics"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
                  >
                    상세 분석
                  </Link>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  안녕하세요, {user?.name}님
                </span>
                <span className="text-xs text-gray-500">
                  ({user?.tenantName} - {user?.role})
                </span>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="container mx-auto py-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
                <p className="text-muted-foreground">
                  캠페인 성과 및 주요 지표 개요
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

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Time Series Chart - Takes 2 columns */}
              <Card className="col-span-1 lg:col-span-2">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">시간별 트렌드</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-80" />}>
                    <GlobalTimeSeriesChart filters={filters} />
                  </Suspense>
                </div>
              </Card>

              {/* Funnel Chart - Takes 1 column */}
              <Card className="col-span-1 lg:col-span-1">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">전환 퍼널</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-80" />}>
                    <GlobalFunnelChart filters={filters} />
                  </Suspense>
                </div>
              </Card>
            </div>

            {/* Secondary Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quota Progress */}
              <Card>
                <Suspense fallback={<ChartSkeleton className="h-64" />}>
                  <QuotaProgressCard filters={filters} />
                </Suspense>
              </Card>

              {/* Cost by Channel */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">채널별 비용</h3>
                  </div>
                  <Suspense fallback={<ChartSkeleton className="h-64" />}>
                    <CostByChannelChart filters={filters} />
                  </Suspense>
                </div>
              </Card>
            </div>

            {/* Cost Over Time - Full Width */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">비용 추이</h3>
                </div>
                <Suspense fallback={<ChartSkeleton className="h-80" />}>
                  <CostOverTimeChart filters={filters} />
                </Suspense>
              </div>
            </Card>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/campaigns/new">
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📝</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">새 캠페인</h3>
                      <p className="text-sm text-gray-600">캠페인 생성하기</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/contacts">
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">👥</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">연락처 관리</h3>
                      <p className="text-sm text-gray-600">연락처 보기/편집</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/analytics">
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">상세 분석</h3>
                      <p className="text-sm text-gray-600">고급 분석 도구</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
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