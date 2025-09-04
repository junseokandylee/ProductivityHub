'use client'

import { Suspense, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnalyticsFiltersBar } from '@/components/analytics/analytics-filters-bar'
import { ExportMenu } from '@/components/analytics/export-menu'
import { KpiCard, KpiCardGroup } from '@/components/analytics/kpi-card'
import { CostOverTimeChart } from '@/components/analytics/cost-over-time-chart'
import { CostByChannelChart } from '@/components/analytics/cost-by-channel-chart'
import { QuotaProgressCard } from '@/components/analytics/quota-progress-card'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { useCostQuota, useTimeSeriesMetrics } from '@/hooks/use-analytics-api'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Target, 
  BarChart3,
  Zap,
  Calendar,
  CreditCard,
  Percent
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface BudgetAlert {
  id: string
  type: 'warning' | 'critical' | 'info'
  message: string
  threshold: number
  currentValue: number
  recommendation?: string
}

interface CostBreakdown {
  category: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export default function CostAnalyticsPage() {
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [budgetView, setBudgetView] = useState<'current' | 'projected'>('current')

  const { data: costData, isLoading: costLoading } = useCostQuota(filters)
  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useTimeSeriesMetrics(filters)

  // Mock budget alerts and cost breakdown data
  const budgetAlerts: BudgetAlert[] = [
    {
      id: '1',
      type: 'warning',
      message: '월 예산의 78% 사용됨',
      threshold: 80,
      currentValue: 78,
      recommendation: '남은 예산을 고려하여 캠페인 규모 조정을 권장합니다.'
    },
    {
      id: '2', 
      type: 'critical',
      message: 'SMS 채널 예산 초과 임박',
      threshold: 95,
      currentValue: 94,
      recommendation: 'SMS 채널 사용을 일시 중단하거나 예산을 증액하세요.'
    },
    {
      id: '3',
      type: 'info',
      message: 'KakaoTalk 채널 비용 효율성 우수',
      threshold: 50,
      currentValue: 45,
      recommendation: 'KakaoTalk 채널의 비중을 늘려 비용 효율성을 개선할 수 있습니다.'
    }
  ]

  const costBreakdowns: CostBreakdown[] = [
    {
      category: 'SMS 발송',
      amount: 3250000,
      percentage: 52.3,
      trend: 'up',
      trendValue: 12.5
    },
    {
      category: 'KakaoTalk 발송',
      amount: 2140000,
      percentage: 34.4,
      trend: 'down',
      trendValue: -5.2
    },
    {
      category: '데이터 처리',
      amount: 520000,
      percentage: 8.4,
      trend: 'stable',
      trendValue: 1.1
    },
    {
      category: '시스템 운영',
      amount: 305000,
      percentage: 4.9,
      trend: 'up',
      trendValue: 3.2
    }
  ]

  const formatCurrency = (amount: number, currency: string = 'KRW'): string => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`
    }
    return `${currency} ${amount.toLocaleString()}`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertColor = (type: 'warning' | 'critical' | 'info') => {
    switch (type) {
      case 'critical':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  const getAlertIcon = (type: 'warning' | 'critical' | 'info') => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return <Zap className="h-5 w-5 text-blue-600" />
    }
  }

  const projectedMonthlyCost = costData?.quotaUsage?.projectedMonthEndUsage || 0
  const remainingDays = costData?.quotaUsage?.daysRemainingInMonth || 0
  const dailyAverage = costData?.quotaUsage?.dailyAverageUsage || 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">비용 분석</h1>
          <p className="text-muted-foreground">
            캠페인 비용 추적 및 예산 관리 대시보드
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={budgetView} onValueChange={(value: 'current' | 'projected') => setBudgetView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">현재 비용</SelectItem>
              <SelectItem value="projected">예상 비용</SelectItem>
            </SelectContent>
          </Select>
          <ExportMenu filters={filters} />
        </div>
      </div>

      {/* Budget Alerts */}
      <div className="grid gap-4">
        {budgetAlerts.map((alert) => (
          <Alert key={alert.id} className={getAlertColor(alert.type)}>
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{alert.message}</p>
                  <Badge variant="outline" className="text-xs">
                    {alert.currentValue}%
                  </Badge>
                </div>
                <Progress 
                  value={alert.currentValue} 
                  className={cn(
                    "h-2 mb-2",
                    alert.type === 'critical' && "[&>[role=progressbar]]:bg-red-500",
                    alert.type === 'warning' && "[&>[role=progressbar]]:bg-yellow-500"
                  )}
                />
                {alert.recommendation && (
                  <p className="text-sm text-muted-foreground">{alert.recommendation}</p>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>

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
            label="월 총 비용"
            value={costData?.totalCost.total || 0}
            deltaPct={budgetView === 'projected' ? 15.2 : -3.1}
            color="baseline"
            icon={DollarSign}
            isLoading={costLoading}
            formatter={(val) => formatCurrency(val)}
          />
          <KpiCard
            label="예산 사용률"
            value={costData?.quotaUsage.usagePercentage.toFixed(1) + '%' || '0%'}
            deltaPct={8.5}
            color={costData?.quotaUsage.isNearQuota ? "click" : "conversion"}
            icon={Percent}
            isLoading={costLoading}
          />
          <KpiCard
            label="일평균 비용"
            value={dailyAverage}
            deltaPct={-2.3}
            color="open"
            icon={Calendar}
            isLoading={costLoading}
            formatter={(val) => formatCurrency(val)}
          />
          <KpiCard
            label="메시지당 평균 비용"
            value={costData?.totalCost.averageCostPerMessage || 0}
            deltaPct={1.8}
            color="neutral"
            icon={Target}
            isLoading={costLoading}
            formatter={(val) => formatCurrency(val)}
          />
        </KpiCardGroup>
      </Suspense>

      {/* Cost Trends */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">비용 추이</h3>
            <div className="flex gap-2">
              <Button
                variant={timeframe === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('daily')}
              >
                일간
              </Button>
              <Button
                variant={timeframe === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('weekly')}
              >
                주간
              </Button>
              <Button
                variant={timeframe === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe('monthly')}
              >
                월간
              </Button>
            </div>
          </div>
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <CostOverTimeChart filters={filters} height={400} />
          </Suspense>
        </div>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Distribution */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">채널별 비용 분포</h3>
            <Suspense fallback={<ChartSkeleton className="h-80" />}>
              <CostByChannelChart filters={filters} height={320} />
            </Suspense>
          </div>
        </Card>

        {/* Cost Categories */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">비용 카테고리</h3>
            <div className="space-y-4">
              {costBreakdowns.map((breakdown) => (
                <div key={breakdown.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{breakdown.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {breakdown.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">
                        {formatCurrency(breakdown.amount)}
                      </span>
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(breakdown.trend)}
                        <span className={cn(
                          breakdown.trend === 'up' ? 'text-red-600' : 
                          breakdown.trend === 'down' ? 'text-green-600' : 
                          'text-gray-600'
                        )}>
                          {breakdown.trend === 'stable' ? '' : 
                           breakdown.trend === 'up' ? '+' : ''}
                          {breakdown.trendValue.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quota Progress */}
        <Card className="lg:col-span-1">
          <Suspense fallback={<ChartSkeleton className="h-64" />}>
            <QuotaProgressCard filters={filters} />
          </Suspense>
        </Card>

        {/* Cost Efficiency Metrics */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">비용 효율성 지표</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">전환당 비용</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(costData ? costData.totalCost.total / 1250 : 0)}
                </div>
                <div className="text-sm text-green-700">
                  전월 대비 -8.3% 개선
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">ROI</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">2.8x</div>
                <div className="text-sm text-blue-700">
                  투자 대비 280% 수익
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">채널 효율성</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">KakaoTalk</div>
                <div className="text-sm text-yellow-700">
                  가장 높은 전환율/비용 비율
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-800">예산 활용도</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">94.2%</div>
                <div className="text-sm text-purple-700">
                  월 예산 대비 사용률
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Projected Costs & Recommendations */}
      {budgetView === 'projected' && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">예상 비용 분석</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">월말 예상 비용</h4>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {formatCurrency(projectedMonthlyCost)}
                </div>
                <div className="text-sm text-blue-700">
                  현재 추세 기준 ({remainingDays}일 남음)
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-800 mb-2">예산 초과 위험도</h4>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-xl font-bold text-blue-900">중간</span>
                </div>
                <div className="text-sm text-blue-700">
                  현재 사용 패턴 유지시 7% 초과 예상
                </div>
              </div>

              <div>
                <h4 className="font-medium text-blue-800 mb-2">권장 조치</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• SMS 채널 비중 10% 감축</li>
                  <li>• KakaoTalk 채널 활용 증대</li>
                  <li>• 일일 예산 한도 설정 권장</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cost Optimization Insights */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">비용 최적화 인사이트</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">비용 절감 기회</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <div className="font-medium text-green-800">채널 믹스 최적화</div>
                    <div className="text-sm text-green-600">KakaoTalk 비중 증가</div>
                  </div>
                  <div className="text-green-800 font-semibold">-15%</div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <div className="font-medium text-green-800">발송 시간 최적화</div>
                    <div className="text-sm text-green-600">참여율 높은 시간대 활용</div>
                  </div>
                  <div className="text-green-800 font-semibold">-8%</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <div className="font-medium text-green-800">타겟팅 정밀도 향상</div>
                    <div className="text-sm text-green-600">전환 확률 높은 세그먼트</div>
                  </div>
                  <div className="text-green-800 font-semibold">-12%</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">성과 지표</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">예상 월간 절감액:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(890000)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ROI 개선 예상:</span>
                  <span className="font-semibold text-blue-600">+0.7x</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">전환당 비용 감소:</span>
                  <span className="font-semibold text-green-600">-₩145</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">예산 활용 효율성:</span>
                  <span className="font-semibold text-purple-600">+23%</span>
                </div>
              </div>
            </div>
          </div>
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