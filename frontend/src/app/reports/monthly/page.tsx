'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useMonthlyTrends, exportReport } from '@/lib/api/reports'
import { AnalyticsFiltersBar } from '@/components/analytics/analytics-filters-bar'
import { GlobalKPICards } from '@/components/analytics/global-kpi-cards'
import { TimeSeriesChart } from '@/components/analytics/time-series-chart'
import { AnalyticsTable } from '@/components/analytics/analytics-table'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import type { TableColumn } from '@/components/analytics/analytics-table'

const MONTH_RANGE_OPTIONS = [
  { value: '3', label: '최근 3개월' },
  { value: '6', label: '최근 6개월' },
  { value: '12', label: '최근 12개월' },
  { value: '24', label: '최근 24개월' }
]

export default function MonthlyTrendsPage() {
  const router = useRouter()
  const [monthRange, setMonthRange] = useState('6')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [isExporting, setIsExporting] = useState(false)
  
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()

  // Calculate date range based on selected months
  const dateFilters = useMemo(() => {
    const months = parseInt(monthRange)
    const endDate = new Date()
    const startDate = subMonths(startOfMonth(endDate), months - 1)
    
    return {
      startMonth: format(startDate, 'yyyy-MM'),
      endMonth: format(endOfMonth(endDate), 'yyyy-MM'),
      channels: filters.channels
    }
  }, [monthRange, filters.channels])

  const { 
    data: trendsData, 
    isLoading, 
    error, 
    refetch 
  } = useMonthlyTrends(dateFilters)

  // Prepare table data
  const tableColumns: TableColumn[] = [
    {
      id: 'month',
      label: '월',
      type: 'text',
      sortable: true,
      format: (value) => {
        const [year, month] = value.split('-')
        return `${year}년 ${parseInt(month)}월`
      }
    },
    {
      id: 'sent',
      label: '발송',
      type: 'number',
      sortable: true
    },
    {
      id: 'delivered',
      label: '전달',
      type: 'number',
      sortable: true
    },
    {
      id: 'deliveryRate',
      label: '전달률',
      type: 'percentage',
      sortable: true,
      badgeColor: (value: number) => value >= 95 ? 'conversion' : value >= 85 ? 'open' : 'neutral'
    },
    {
      id: 'opened',
      label: '열람',
      type: 'number',
      sortable: true
    },
    {
      id: 'openRate',
      label: '열람률',
      type: 'percentage',
      sortable: true,
      badgeColor: (value: number) => value >= 20 ? 'conversion' : value >= 10 ? 'open' : 'neutral'
    },
    {
      id: 'clicked',
      label: '클릭',
      type: 'number',
      sortable: true
    },
    {
      id: 'clickRate',
      label: '클릭률',
      type: 'percentage',
      sortable: true,
      badgeColor: (value: number) => value >= 5 ? 'conversion' : value >= 2 ? 'open' : 'neutral'
    },
    {
      id: 'cost',
      label: '비용',
      type: 'currency',
      sortable: true
    },
    {
      id: 'uniqueContacts',
      label: '고유 연락처',
      type: 'number',
      sortable: true
    },
    {
      id: 'campaigns',
      label: '캠페인 수',
      type: 'number',
      sortable: true
    }
  ]

  const tableData = trendsData?.data?.map((item, index) => ({
    id: `${item.year}-${item.month}`,
    month: `${item.year}-${item.month.toString().padStart(2, '0')}`,
    ...item
  })) || []

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!trendsData) return

    setIsExporting(true)
    try {
      const result = await exportReport({
        reportType: 'monthly',
        format,
        filters,
        includeCharts: true,
        includeSummary: true,
        dateRange: {
          startDate: dateFilters.startMonth,
          endDate: dateFilters.endMonth
        }
      })
      
      // Download file
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = result.filename
      link.click()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const renderTrendIndicator = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
          <span className="text-sm font-medium">+{value.toFixed(1)}%</span>
        </div>
      )
    } else if (value < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-3 w-3" />
          <span className="text-sm font-medium">{value.toFixed(1)}%</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <span className="text-sm">0%</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>월별 트렌드 데이터를 불러오는데 실패했습니다: {error.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">월별 트렌드 분석</h1>
            <p className="text-gray-600">
              {dateFilters.startMonth}부터 {dateFilters.endMonth}까지의 월별 성과 분석
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={monthRange} onValueChange={setMonthRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleExport} disabled={isExporting || isLoading}>
            <SelectTrigger className="w-32">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="내보내기" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        isLoading={isLoading}
        onRefresh={() => refetch()}
        showScopeSelector={false}
      />

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trendsData?.summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 발송</p>
                  <p className="text-2xl font-bold">
                    {trendsData.summary.totalSent.toLocaleString()}
                  </p>
                  {renderTrendIndicator(trendsData.summary.growth.sent)}
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 전달</p>
                  <p className="text-2xl font-bold">
                    {trendsData.summary.totalDelivered.toLocaleString()}
                  </p>
                  {renderTrendIndicator(trendsData.summary.growth.delivered)}
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 전달률</p>
                  <p className="text-2xl font-bold">
                    {trendsData.summary.avgDeliveryRate.toFixed(1)}%
                  </p>
                  <div className="text-xs text-gray-500">
                    열람률 {trendsData.summary.avgOpenRate.toFixed(1)}%
                  </div>
                </div>
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 비용</p>
                  <p className="text-2xl font-bold">
                    ₩{trendsData.summary.totalCost.toLocaleString()}
                  </p>
                  {renderTrendIndicator(trendsData.summary.growth.cost)}
                </div>
                <LineChart className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="charts">차트</TabsTrigger>
          <TabsTrigger value="data">데이터</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : trendsData ? (
            <>
              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>핵심 인사이트</CardTitle>
                  <CardDescription>
                    {monthRange}개월간의 성과 분석 및 추천사항
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">성과 하이라이트</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">최고 성과 월:</span>
                            <Badge variant="secondary">
                              {trendsData.insights.bestMonth}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">트렌드 방향:</span>
                            <Badge variant={
                              trendsData.insights.trendDirection === 'up' ? 'default' :
                              trendsData.insights.trendDirection === 'down' ? 'destructive' : 'secondary'
                            }>
                              {trendsData.insights.trendDirection === 'up' ? '상승' :
                               trendsData.insights.trendDirection === 'down' ? '하락' : '안정'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">계절적 패턴</h4>
                        <div className="flex flex-wrap gap-1">
                          {trendsData.insights.seasonalPattern.map((pattern, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {pattern}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">개선 추천사항</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        {trendsData.insights.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Series Chart */}
              <TimeSeriesChart
                filters={filters}
                title="월별 성과 트렌드"
                className="h-96"
              />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <TimeSeriesChart
            filters={filters}
            title="발송 및 전달 트렌드"
            className="h-96"
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeSeriesChart
              filters={filters}
              title="참여율 트렌드 (열람 및 클릭)"
              className="h-80"
            />
            <TimeSeriesChart
              filters={filters}
              title="비용 트렌드"
              className="h-80"
            />
          </div>
        </TabsContent>

        <TabsContent value="data">
          <AnalyticsTable
            columns={tableColumns}
            data={tableData}
            title="월별 상세 데이터"
            isLoading={isLoading}
            error={error?.message}
            onRetry={() => refetch()}
            exportable={true}
            onExport={() => handleExport('csv')}
            pagination={true}
            pageSize={12}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}