'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  Download,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  AlertCircle,
  RefreshCw,
  Trophy,
  Target,
  DollarSign,
  Users
} from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useCampaignComparison, exportReport } from '@/lib/api/reports'
import { AnalyticsTable } from '@/components/analytics/analytics-table'
import type { TableColumn } from '@/components/analytics/analytics-table'

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'completed', label: '완료됨' },
  { value: 'active', label: '진행 중' },
  { value: 'paused', label: '일시중지' }
]

const DATE_RANGE_OPTIONS = [
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
  { value: '180', label: '최근 180일' }
]

export default function CampaignComparisonPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateRange, setDateRange] = useState('30')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedTab, setSelectedTab] = useState('comparison')
  const [isExporting, setIsExporting] = useState(false)

  // Calculate date range
  const dateFilters = useMemo(() => {
    const days = parseInt(dateRange)
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      status: selectedStatus === 'all' ? undefined : [selectedStatus],
      campaignIds: selectedCampaigns.length > 0 ? selectedCampaigns : undefined
    }
  }, [dateRange, selectedStatus, selectedCampaigns])

  const { 
    data: comparisonData, 
    isLoading, 
    error, 
    refetch 
  } = useCampaignComparison(dateFilters)

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!comparisonData?.campaigns) return []
    
    return comparisonData.campaigns.filter(campaign =>
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [comparisonData?.campaigns, searchQuery])

  // Table columns for campaign comparison
  const tableColumns: TableColumn[] = [
    {
      id: 'select',
      label: '선택',
      type: 'text',
      sortable: false,
      searchable: false,
      width: '60px',
      format: (_, row) => (
        <Checkbox
          checked={selectedCampaigns.includes(row.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedCampaigns(prev => [...prev, row.id])
            } else {
              setSelectedCampaigns(prev => prev.filter(id => id !== row.id))
            }
          }}
        />
      )
    },
    {
      id: 'name',
      label: '캠페인명',
      type: 'text',
      sortable: true,
      width: '200px'
    },
    {
      id: 'status',
      label: '상태',
      type: 'badge',
      sortable: true,
      width: '100px',
      badgeColor: (value: string) => {
        switch (value) {
          case 'completed': return 'conversion'
          case 'active': return 'open'
          case 'paused': return 'neutral'
          default: return 'neutral'
        }
      },
      format: (value: string) => {
        switch (value) {
          case 'completed': return '완료'
          case 'active': return '진행중'
          case 'paused': return '일시중지'
          default: return value
        }
      }
    },
    {
      id: 'startDate',
      label: '시작일',
      type: 'date',
      sortable: true,
      width: '120px'
    },
    {
      id: 'sent',
      label: '발송',
      type: 'number',
      sortable: true,
      width: '100px'
    },
    {
      id: 'deliveryRate',
      label: '전달률',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => value >= 95 ? 'conversion' : value >= 85 ? 'open' : 'neutral'
    },
    {
      id: 'openRate',
      label: '열람률',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => value >= 20 ? 'conversion' : value >= 10 ? 'open' : 'neutral'
    },
    {
      id: 'clickRate',
      label: '클릭률',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => value >= 5 ? 'conversion' : value >= 2 ? 'open' : 'neutral'
    },
    {
      id: 'cost',
      label: '비용',
      type: 'currency',
      sortable: true,
      width: '120px'
    },
    {
      id: 'roi',
      label: 'ROI',
      type: 'percentage',
      sortable: true,
      width: '100px',
      badgeColor: (value: number) => value >= 200 ? 'conversion' : value >= 100 ? 'open' : 'neutral'
    }
  ]

  const tableData = filteredCampaigns.map(campaign => ({
    id: campaign.id,
    ...campaign
  }))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id))
    } else {
      setSelectedCampaigns([])
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!comparisonData) return

    setIsExporting(true)
    try {
      const result = await exportReport({
        reportType: 'campaigns',
        format,
        includeCharts: true,
        includeSummary: true,
        dateRange: {
          startDate: dateFilters.startDate,
          endDate: dateFilters.endDate
        },
        customFields: selectedCampaigns
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

  const renderChannelBreakdown = (channelBreakdown: any[]) => (
    <div className="flex flex-wrap gap-1">
      {channelBreakdown.map((channel, index) => (
        <Badge key={index} variant="outline" className="text-xs">
          {channel.channel}: {channel.performance.toFixed(1)}%
        </Badge>
      ))}
    </div>
  )

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>캠페인 비교 데이터를 불러오는데 실패했습니다: {error.message}</span>
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
            <h1 className="text-3xl font-bold text-gray-900">캠페인 비교 분석</h1>
            <p className="text-gray-600">
              캠페인별 성과를 비교하고 최적의 전략을 분석합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
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
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="캠페인 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filteredCampaigns.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedCampaigns.length === filteredCampaigns.length}
                  indeterminate={selectedCampaigns.length > 0 && selectedCampaigns.length < filteredCampaigns.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  전체 선택 ({selectedCampaigns.length})
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Benchmarks and Top Performer */}
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
      ) : comparisonData ? (
        <>
          {/* Top Performer */}
          {comparisonData.comparison.topPerformer && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">최고 성과 캠페인</h3>
                    <p className="text-sm text-gray-600">
                      {comparisonData.campaigns.find(c => c.id === comparisonData.comparison.topPerformer.campaignId)?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {comparisonData.comparison.topPerformer.metric}
                      </Badge>
                      <span className="text-lg font-bold text-yellow-700">
                        {comparisonData.comparison.topPerformer.value.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benchmarks */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 전달률</p>
                    <p className="text-2xl font-bold">
                      {comparisonData.comparison.benchmarks.avgDeliveryRate.toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 열람률</p>
                    <p className="text-2xl font-bold">
                      {comparisonData.comparison.benchmarks.avgOpenRate.toFixed(1)}%
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 클릭률</p>
                    <p className="text-2xl font-bold">
                      {comparisonData.comparison.benchmarks.avgClickRate.toFixed(1)}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 메시지당 비용</p>
                    <p className="text-2xl font-bold">
                      ₩{comparisonData.comparison.benchmarks.avgCostPerMessage.toFixed(0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">비교 테이블</TabsTrigger>
          <TabsTrigger value="insights">인사이트</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <AnalyticsTable
            columns={tableColumns}
            data={tableData}
            title={`캠페인 성과 비교 (${filteredCampaigns.length}개)`}
            isLoading={isLoading}
            error={error?.message}
            onRetry={() => refetch()}
            exportable={true}
            onExport={() => handleExport('csv')}
            pagination={true}
            pageSize={20}
            searchable={false} // We handle search manually
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ) : comparisonData ? (
            <>
              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>핵심 인사이트</CardTitle>
                  <CardDescription>
                    캠페인 성과 분석을 통한 개선 방안
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {comparisonData.comparison.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <div className="p-1 bg-blue-100 rounded-full">
                          <PieChart className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Campaigns Detailed Comparison */}
              {selectedCampaigns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>선택된 캠페인 상세 비교</CardTitle>
                    <CardDescription>
                      {selectedCampaigns.length}개 캠페인의 채널별 성과 분석
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {comparisonData.campaigns
                        .filter(campaign => selectedCampaigns.includes(campaign.id))
                        .map(campaign => (
                          <div key={campaign.id} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                              <Badge variant={
                                campaign.status === 'completed' ? 'default' :
                                campaign.status === 'active' ? 'secondary' : 'outline'
                              }>
                                {campaign.status === 'completed' ? '완료' :
                                 campaign.status === 'active' ? '진행중' : '일시중지'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">발송</p>
                                <p className="font-medium">{campaign.sent.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">전달률</p>
                                <p className="font-medium">{campaign.deliveryRate.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-600">열람률</p>
                                <p className="font-medium">{campaign.openRate.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-600">ROI</p>
                                <p className="font-medium">{campaign.roi.toFixed(1)}%</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600 mb-2">채널별 성과</p>
                              {renderChannelBreakdown(campaign.channelBreakdown)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}