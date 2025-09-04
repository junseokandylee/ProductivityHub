'use client'

import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalyticsFiltersBar } from '@/components/analytics/analytics-filters-bar'
import { ExportMenu } from '@/components/analytics/export-menu'
import { KpiCard, KpiCardGroup } from '@/components/analytics/kpi-card'
import { TimeSeriesChart } from '@/components/analytics/time-series-chart'
import { FunnelChart } from '@/components/analytics/funnel-chart'
import { AnalyticsTable } from '@/components/analytics/analytics-table'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { useAnalyticsSummary, useTimeSeriesMetrics, useFunnelMetrics } from '@/hooks/use-analytics-api'
import { BarChart3, Target, TrendingUp, Users, MessageSquare, Clock, DollarSign } from 'lucide-react'
import { useState } from 'react'

interface CampaignSummary {
  id: string
  name: string
  channel: string
  status: string
  startDate: string
  endDate?: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  conversionRate: number
  cost: number
  roi: number
}

export default function CampaignAnalyticsPage() {
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d')

  // Set scope to campaign-specific
  const campaignFilters = { 
    ...filters, 
    scope: 'campaign' as const,
    campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined
  }

  const { data: summaryData, isLoading: summaryLoading } = useAnalyticsSummary(campaignFilters)
  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useTimeSeriesMetrics(campaignFilters)
  const { data: funnelData, isLoading: funnelLoading } = useFunnelMetrics(campaignFilters)

  // Mock campaign data - in real implementation, this would come from API
  const campaigns: CampaignSummary[] = [
    {
      id: 'camp-1',
      name: '2024 지방선거 유권자 접촉',
      channel: 'SMS',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-04-10',
      sent: 15420,
      delivered: 14987,
      opened: 12456,
      clicked: 3876,
      conversionRate: 25.1,
      cost: 2340000,
      roi: 3.2
    },
    {
      id: 'camp-2', 
      name: '정책 설명회 초대',
      channel: 'KakaoTalk',
      status: 'completed',
      startDate: '2024-02-01',
      endDate: '2024-02-28',
      sent: 8750,
      delivered: 8691,
      opened: 7234,
      clicked: 2145,
      conversionRate: 24.5,
      cost: 875000,
      roi: 2.8
    },
    {
      id: 'camp-3',
      name: '청년층 정책 홍보',
      channel: 'SMS',
      status: 'active',
      startDate: '2024-03-01',
      sent: 22100,
      delivered: 21456,
      opened: 18923,
      clicked: 4832,
      conversionRate: 21.8,
      cost: 3315000,
      roi: 2.4
    }
  ]

  const activeCampaign = campaigns.find(c => c.id === selectedCampaign)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">캠페인 성과 분석</h1>
          <p className="text-muted-foreground">
            개별 캠페인의 성과 지표와 전환율 분석
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="캠페인 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 캠페인</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <div className="flex items-center gap-2">
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {campaign.status === 'active' ? '진행중' : '완료'}
                    </Badge>
                    {campaign.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportMenu filters={campaignFilters} />
        </div>
      </div>

      {/* Campaign Info Banner */}
      {activeCampaign && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-900">{activeCampaign.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{activeCampaign.channel}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {activeCampaign.startDate} 
                    {activeCampaign.endDate && ` ~ ${activeCampaign.endDate}`}
                  </span>
                </div>
                <Badge variant={activeCampaign.status === 'active' ? 'default' : 'secondary'}>
                  {activeCampaign.status === 'active' ? '진행중' : '완료'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                ₩{activeCampaign.cost.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">캠페인 비용</div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <AnalyticsFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        showScopeSelector={false}
      />

      {/* KPI Cards */}
      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCardGroup>
          <KpiCard
            label="총 발송"
            value={activeCampaign?.sent || summaryData?.kpi.sent || 0}
            color="baseline"
            icon={MessageSquare}
            isLoading={summaryLoading}
            formatter={(val) => val.toLocaleString()}
          />
          <KpiCard
            label="전달률"
            value={activeCampaign ? 
              ((activeCampaign.delivered / activeCampaign.sent) * 100).toFixed(1) + '%' :
              summaryData?.rates.deliveryRate.toFixed(1) + '%' || '0%'}
            deltaPct={2.3}
            color="conversion"
            icon={Target}
            isLoading={summaryLoading}
          />
          <KpiCard
            label="오픈률"
            value={activeCampaign ? 
              ((activeCampaign.opened / activeCampaign.delivered) * 100).toFixed(1) + '%' :
              summaryData?.rates.openRate.toFixed(1) + '%' || '0%'}
            deltaPct={-1.2}
            color="open"
            icon={TrendingUp}
            isLoading={summaryLoading}
          />
          <KpiCard
            label="클릭률"
            value={activeCampaign ? 
              ((activeCampaign.clicked / activeCampaign.opened) * 100).toFixed(1) + '%' :
              summaryData?.rates.clickRate.toFixed(1) + '%' || '0%'}
            deltaPct={4.8}
            color="click"
            icon={Users}
            isLoading={summaryLoading}
          />
        </KpiCardGroup>
      </Suspense>

      {/* Performance Over Time */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">캠페인 성과 트렌드</h3>
            <div className="flex gap-2">
              <Button
                variant={timeframe === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('7d')}
              >
                7일
              </Button>
              <Button
                variant={timeframe === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('30d')}
              >
                30일
              </Button>
              <Button
                variant={timeframe === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('90d')}
              >
                90일
              </Button>
            </div>
          </div>
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <TimeSeriesChart 
              filters={campaignFilters} 
              height={400}
              metrics={['sent', 'delivered', 'opened', 'clicked']}
            />
          </Suspense>
        </div>
      </Card>

      {/* Conversion Funnel & ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">전환 퍼널</h3>
            <Suspense fallback={<ChartSkeleton className="h-64" />}>
              <FunnelChart filters={campaignFilters} />
            </Suspense>
          </div>
        </Card>

        {/* ROI & Cost Analysis */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">ROI 분석</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">총 ROI</p>
                  <p className="text-2xl font-bold text-green-900">
                    {activeCampaign?.roi.toFixed(1) || '2.8'}x
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">메시지당 비용</p>
                  <p className="text-lg font-semibold">
                    ₩{activeCampaign ? 
                      Math.round(activeCampaign.cost / activeCampaign.sent) :
                      '152'
                    }
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">전환당 비용</p>
                  <p className="text-lg font-semibold">
                    ₩{activeCampaign ? 
                      Math.round(activeCampaign.cost / activeCampaign.clicked) :
                      '604'
                    }
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">채널별 성과 비교</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">SMS</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="w-14 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">KakaoTalk</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="w-12 h-2 bg-yellow-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">73%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">캠페인 성과 비교</h3>
          <Suspense fallback={<TableSkeleton />}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">캠페인명</th>
                    <th className="text-left py-3 font-medium">채널</th>
                    <th className="text-left py-3 font-medium">상태</th>
                    <th className="text-right py-3 font-medium">발송</th>
                    <th className="text-right py-3 font-medium">전달률</th>
                    <th className="text-right py-3 font-medium">오픈률</th>
                    <th className="text-right py-3 font-medium">클릭률</th>
                    <th className="text-right py-3 font-medium">전환률</th>
                    <th className="text-right py-3 font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-gray-500">
                          {campaign.startDate} ~ {campaign.endDate || '진행중'}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline">{campaign.channel}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status === 'active' ? '진행중' : '완료'}
                        </Badge>
                      </td>
                      <td className="text-right py-3">{campaign.sent.toLocaleString()}</td>
                      <td className="text-right py-3">
                        {((campaign.delivered / campaign.sent) * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-3">
                        {((campaign.opened / campaign.delivered) * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-3">
                        {((campaign.clicked / campaign.opened) * 100).toFixed(1)}%
                      </td>
                      <td className="text-right py-3 font-medium">
                        {campaign.conversionRate.toFixed(1)}%
                      </td>
                      <td className="text-right py-3">
                        <span className="font-medium text-green-600">
                          {campaign.roi.toFixed(1)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Suspense>
        </div>
      </Card>
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

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}