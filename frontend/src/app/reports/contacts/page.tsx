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
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserMinus,
  Activity,
  PieChart,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Calendar,
  Target
} from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useContactGrowth, exportReport } from '@/lib/api/reports'
import { TimeSeriesChart } from '@/components/analytics/time-series-chart'
import { AnalyticsTable } from '@/components/analytics/analytics-table'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import type { TableColumn } from '@/components/analytics/analytics-table'

const DATE_RANGE_OPTIONS = [
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
  { value: '180', label: '최근 6개월' },
  { value: '365', label: '최근 1년' }
]

const SEGMENT_OPTIONS = [
  { value: 'channel', label: '채널별' },
  { value: 'tag', label: '태그별' },
  { value: 'source', label: '유입경로별' }
]

export default function ContactGrowthPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState('90')
  const [segmentBy, setSegmentBy] = useState<'channel' | 'tag' | 'source'>('channel')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [isExporting, setIsExporting] = useState(false)
  
  const { filters } = useAnalyticsFilters()

  // Calculate date range
  const dateFilters = useMemo(() => {
    const days = parseInt(dateRange)
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      segmentBy
    }
  }, [dateRange, segmentBy])

  const { 
    data: growthData, 
    isLoading, 
    error, 
    refetch 
  } = useContactGrowth(dateFilters)

  // Table columns for growth data
  const tableColumns: TableColumn[] = [
    {
      id: 'date',
      label: '날짜',
      type: 'date',
      sortable: true,
      width: '120px'
    },
    {
      id: 'newContacts',
      label: '신규 연락처',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'totalContacts',
      label: '전체 연락처',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'activeContacts',
      label: '활성 연락처',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'churnedContacts',
      label: '이탈 연락처',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'growthRate',
      label: '성장률',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => value > 5 ? 'conversion' : value > 0 ? 'open' : 'neutral'
    },
    {
      id: 'churnRate',
      label: '이탈률',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => value < 2 ? 'conversion' : value < 5 ? 'open' : 'neutral'
    },
    {
      id: 'engagementScore',
      label: '참여도',
      type: 'number',
      sortable: true,
      width: '100px',
      format: (value: number) => `${value.toFixed(1)}/10`,
      badgeColor: (value: number) => value >= 7 ? 'conversion' : value >= 5 ? 'open' : 'neutral'
    }
  ]

  const tableData = growthData?.data?.map(item => ({
    id: item.date,
    ...item
  })) || []

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!growthData) return

    setIsExporting(true)
    try {
      const result = await exportReport({
        reportType: 'contacts',
        format,
        includeCharts: true,
        includeSummary: true,
        dateRange: {
          startDate: dateFilters.startDate,
          endDate: dateFilters.endDate
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

  const renderSegmentChart = () => {
    if (!growthData?.segmentation) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle>세그먼트별 분석</CardTitle>
          <CardDescription>
            {SEGMENT_OPTIONS.find(opt => opt.value === segmentBy)?.label} 연락처 분포
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {growthData.segmentation.map((segment, index) => (
              <div key={segment.segment} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-blue-${500 + (index * 100) % 400}`} />
                    <span className="font-medium">{segment.segment}</span>
                    <Badge variant="outline" className="text-xs">
                      {segment.count.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      {segment.percentage.toFixed(1)}%
                    </span>
                    {renderTrendIndicator(segment.growthRate)}
                  </div>
                </div>
                <Progress value={segment.percentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>참여도: {segment.engagementScore.toFixed(1)}/10</span>
                  <span>성장률: {segment.growthRate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>연락처 성장 데이터를 불러오는데 실패했습니다: {error.message}</span>
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
            <h1 className="text-3xl font-bold text-gray-900">연락처 성장 분석</h1>
            <p className="text-gray-600">
              연락처 증가 추이와 세그먼트별 성장률을 분석합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={segmentBy} onValueChange={(value: any) => setSegmentBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_OPTIONS.map(option => (
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
      ) : growthData?.summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 연락처</p>
                  <p className="text-2xl font-bold">
                    {growthData.summary.totalContacts.toLocaleString()}
                  </p>
                  <div className="text-xs text-gray-500">
                    순 증가: {growthData.summary.netGrowth.toLocaleString()}
                  </div>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">신규 연락처</p>
                  <p className="text-2xl font-bold">
                    {growthData.summary.newContacts.toLocaleString()}
                  </p>
                  {renderTrendIndicator(growthData.summary.avgGrowthRate)}
                </div>
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">이탈 연락처</p>
                  <p className="text-2xl font-bold">
                    {growthData.summary.churnedContacts.toLocaleString()}
                  </p>
                  <div className="text-xs text-gray-500">
                    이탈률: {growthData.summary.avgChurnRate.toFixed(1)}%
                  </div>
                </div>
                <UserMinus className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 참여도</p>
                  <p className="text-2xl font-bold">
                    {growthData.summary.avgEngagementScore.toFixed(1)}/10
                  </p>
                  <Progress 
                    value={growthData.summary.avgEngagementScore * 10} 
                    className="h-1 mt-2" 
                  />
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="trends">트렌드</TabsTrigger>
          <TabsTrigger value="segments">세그먼트</TabsTrigger>
          <TabsTrigger value="data">데이터</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : growthData ? (
            <>
              {/* Growth Chart */}
              <TimeSeriesChart
                filters={filters}
                title="연락처 증가 추이"
                className="h-96"
              />

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>핵심 인사이트</CardTitle>
                  <CardDescription>
                    연락처 성장 분석을 통한 개선 방안
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">성장 하이라이트</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">최고 성장 기간:</span>
                            <Badge variant="secondary">
                              {growthData.insights.fastestGrowthPeriod}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">최고 이탈 기간:</span>
                            <Badge variant="destructive">
                              {growthData.insights.highestChurnPeriod}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">개선 추천사항</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        {growthData.insights.recommendations.map((recommendation, index) => (
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
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeSeriesChart
              filters={filters}
              title="신규 연락처 추이"
              className="h-80"
            />
            <TimeSeriesChart
              filters={filters}
              title="이탈률 변화"
              className="h-80"
            />
          </div>

          <TimeSeriesChart
            filters={filters}
            title="참여도 점수 변화"
            className="h-96"
          />
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          {renderSegmentChart()}

          {/* Performance by Segment */}
          {growthData?.segmentation && (
            <Card>
              <CardHeader>
                <CardTitle>세그먼트별 성과</CardTitle>
                <CardDescription>
                  각 세그먼트의 성장률과 참여도 비교
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {growthData.segmentation
                    .sort((a, b) => b.growthRate - a.growthRate)
                    .map((segment, index) => (
                      <div key={segment.segment} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                            <span className="text-sm font-medium text-blue-600">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{segment.segment}</p>
                            <p className="text-sm text-gray-600">
                              {segment.count.toLocaleString()}개 ({segment.percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-gray-600">성장률</p>
                            <p className={`font-medium ${
                              segment.growthRate > 0 ? 'text-green-600' : 
                              segment.growthRate < 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {segment.growthRate.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">참여도</p>
                            <p className="font-medium">{segment.engagementScore.toFixed(1)}/10</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data">
          <AnalyticsTable
            columns={tableColumns}
            data={tableData}
            title="연락처 성장 상세 데이터"
            isLoading={isLoading}
            error={error?.message}
            onRetry={() => refetch()}
            exportable={true}
            onExport={() => handleExport('csv')}
            pagination={true}
            pageSize={20}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}