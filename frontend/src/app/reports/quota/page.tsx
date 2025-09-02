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
  DollarSign,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  AlertCircle,
  RefreshCw,
  Clock,
  Target
} from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useQuotaConsumption, exportReport } from '@/lib/api/reports'
import { TimeSeriesChart } from '@/components/analytics/time-series-chart'
import { AnalyticsTable } from '@/components/analytics/analytics-table'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import type { TableColumn } from '@/components/analytics/analytics-table'

export default function QuotaConsumptionPage() {
  const router = useRouter()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [selectedTab, setSelectedTab] = useState('overview')
  const [isExporting, setIsExporting] = useState(false)
  
  const { filters } = useAnalyticsFilters()

  // Generate month options (current month + 11 previous months)
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i)
      const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      const label = format(date, 'yyyy년 MM월', { locale: ko })
      options.push({ value, label })
    }
    
    return options
  }, [])

  // Parse selected month
  const dateFilters = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return {
      month,
      year,
      channels: filters.channels
    }
  }, [selectedMonth, filters.channels])

  const { 
    data: quotaData, 
    isLoading, 
    error, 
    refetch 
  } = useQuotaConsumption(dateFilters)

  // Table columns for daily quota data
  const tableColumns: TableColumn[] = [
    {
      id: 'date',
      label: '날짜',
      type: 'date',
      sortable: true,
      width: '120px'
    },
    {
      id: 'dailyUsage',
      label: '일일 사용량',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'cumulativeUsage',
      label: '누적 사용량',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'remainingQuota',
      label: '잔여 할당량',
      type: 'number',
      sortable: true,
      width: '120px'
    },
    {
      id: 'usagePercentage',
      label: '사용률',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => {
        if (value >= 90) return 'neutral' // Red-like
        if (value >= 70) return 'click' // Orange-like  
        return 'conversion' // Green-like
      }
    }
  ]

  const tableData = quotaData?.data?.map(item => ({
    id: item.date,
    ...item
  })) || []

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!quotaData) return

    setIsExporting(true)
    try {
      const result = await exportReport({
        reportType: 'quota',
        format,
        includeCharts: true,
        includeSummary: true,
        dateRange: {
          startDate: `${dateFilters.year}-${dateFilters.month.toString().padStart(2, '0')}-01`,
          endDate: `${dateFilters.year}-${dateFilters.month.toString().padStart(2, '0')}-31`
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

  const getQuotaStatus = () => {
    if (!quotaData) return { status: 'unknown', color: 'gray', icon: Clock }
    
    if (quotaData.isOverQuota) {
      return { status: '할당량 초과', color: 'red', icon: AlertTriangle }
    } else if (quotaData.isNearLimit) {
      return { status: '할당량 근접', color: 'orange', icon: AlertTriangle }
    } else {
      return { status: '정상', color: 'green', icon: CheckCircle }
    }
  }

  const renderChannelBreakdown = () => {
    if (!quotaData?.channelBreakdown) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle>채널별 할당량 사용</CardTitle>
          <CardDescription>
            채널별 메시지 사용량 및 비용 분석
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotaData.channelBreakdown.map((channel, index) => (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-blue-${500 + (index * 100) % 400}`} />
                    <span className="font-medium">{channel.channel.toUpperCase()}</span>
                    <Badge variant="outline" className="text-xs">
                      {channel.usage.toLocaleString()}건
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      ₩{channel.cost.toLocaleString()}
                    </span>
                    <span className="font-medium">
                      {channel.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={channel.percentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>건당 평균: ₩{channel.avgCostPerMessage.toFixed(0)}</span>
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
            <span>할당량 데이터를 불러오는데 실패했습니다: {error.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const quotaStatus = getQuotaStatus()

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
            <h1 className="text-3xl font-bold text-gray-900">할당량 소비 분석</h1>
            <p className="text-gray-600">
              월별 메시지 할당량 사용량과 비용을 추적합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
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

      {/* Status Alert */}
      {quotaData && (quotaData.isOverQuota || quotaData.isNearLimit) && (
        <Alert className={`border-${quotaStatus.color}-200 bg-${quotaStatus.color}-50`}>
          <quotaStatus.icon className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {quotaData.isOverQuota 
                  ? `할당량을 ${(quotaData.usagePercentage - 100).toFixed(1)}% 초과했습니다.`
                  : `할당량의 ${quotaData.usagePercentage.toFixed(1)}%를 사용했습니다.`
                }
              </span>
              <Badge variant="outline">
                {quotaStatus.status}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
      ) : quotaData ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">월 할당량</p>
                  <p className="text-2xl font-bold">
                    {quotaData.quotaLimit.toLocaleString()}
                  </p>
                  <div className="text-xs text-gray-500">
                    잔여: {quotaData.remainingQuota.toLocaleString()}
                  </div>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">현재 사용량</p>
                  <p className="text-2xl font-bold">
                    {quotaData.currentUsage.toLocaleString()}
                  </p>
                  <div className="mt-2">
                    <Progress 
                      value={Math.min(quotaData.usagePercentage, 100)} 
                      className="h-2" 
                    />
                  </div>
                </div>
                <Zap className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">사용률</p>
                  <p className="text-2xl font-bold">
                    {quotaData.usagePercentage.toFixed(1)}%
                  </p>
                  <Badge
                    variant={
                      quotaData.usagePercentage >= 90 ? "destructive" :
                      quotaData.usagePercentage >= 70 ? "secondary" : "default"
                    }
                    className="mt-1"
                  >
                    {quotaStatus.status}
                  </Badge>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">예상 사용량</p>
                  <p className="text-2xl font-bold">
                    {quotaData.projectedUsage.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {quotaData.projectedUsage > quotaData.quotaLimit ? (
                      <TrendingUp className="h-3 w-3 text-red-600" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    )}
                    <span className="text-xs text-gray-500">
                      월말 기준
                    </span>
                  </div>
                </div>
                <PieChart className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="trends">사용 추이</TabsTrigger>
          <TabsTrigger value="channels">채널별 분석</TabsTrigger>
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
          ) : quotaData ? (
            <>
              {/* Usage Chart */}
              <TimeSeriesChart
                filters={filters}
                title="일별 할당량 사용 추이"
                className="h-96"
              />

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>할당량 분석 인사이트</CardTitle>
                  <CardDescription>
                    사용 패턴 분석을 통한 최적화 방안
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">사용 통계</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">일일 평균 소모율:</span>
                            <span className="font-medium">
                              {quotaData.insights.burnRate.toFixed(1)}건/일
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">예상 초과량:</span>
                            <span className={`font-medium ${
                              quotaData.insights.projectedOverage > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {quotaData.insights.projectedOverage > 0 ? 
                                `+${quotaData.insights.projectedOverage.toLocaleString()}` :
                                '없음'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">최고 사용량 일자</h4>
                        <div className="flex flex-wrap gap-1">
                          {quotaData.insights.peakUsageDays.map((date, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {format(new Date(date), 'MM/dd', { locale: ko })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">최적화 추천사항</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        {quotaData.insights.recommendations.map((recommendation, index) => (
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
              title="일일 사용량 추이"
              className="h-80"
            />
            <TimeSeriesChart
              filters={filters}
              title="누적 사용량 추이"
              className="h-80"
            />
          </div>

          <TimeSeriesChart
            filters={filters}
            title="할당량 사용률 변화"
            className="h-96"
          />
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          {renderChannelBreakdown()}

          {/* Cost Analysis */}
          {quotaData?.channelBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>채널별 비용 효율성</CardTitle>
                <CardDescription>
                  채널별 메시지당 비용 및 효율성 분석
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotaData.channelBreakdown
                    .sort((a, b) => a.avgCostPerMessage - b.avgCostPerMessage)
                    .map((channel, index) => (
                      <div key={channel.channel} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <span className="text-sm font-medium text-green-600">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{channel.channel.toUpperCase()}</p>
                            <p className="text-sm text-gray-600">
                              {channel.usage.toLocaleString()}건 사용
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-gray-600">건당 비용</p>
                            <p className="font-medium">₩{channel.avgCostPerMessage.toFixed(0)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">총 비용</p>
                            <p className="font-medium">₩{channel.cost.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">비율</p>
                            <p className="font-medium">{channel.percentage.toFixed(1)}%</p>
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
            title="일별 할당량 사용 데이터"
            isLoading={isLoading}
            error={error?.message}
            onRetry={() => refetch()}
            exportable={true}
            onExport={() => handleExport('csv')}
            pagination={true}
            pageSize={31} // Show full month
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}