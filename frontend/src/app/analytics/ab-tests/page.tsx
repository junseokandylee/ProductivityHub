'use client'

import { Suspense, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalyticsFiltersBar } from '@/components/analytics/analytics-filters-bar'
import { ExportMenu } from '@/components/analytics/export-menu'
import { KpiCard, KpiCardGroup } from '@/components/analytics/kpi-card'
import { AbTestBarChart } from '@/components/analytics/ab-test-bar-chart'
import { AbVariantTable } from '@/components/analytics/ab-variant-table'
import { AbTestPerformanceWidget } from '@/components/analytics/ab-test-performance-widget'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { useAnalyticsSummary } from '@/hooks/use-analytics-api'
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AbVariant } from '@/lib/utils/ab-test-statistics'

interface AbTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'completed' | 'paused'
  testType: 'message_content' | 'send_time' | 'channel_mix' | 'targeting'
  startDate: string
  endDate?: string
  campaignId: string
  campaignName: string
  variants: Array<{
    id: string
    name: string
    allocation: number
    description?: string
  }>
  primaryMetric: 'delivery' | 'openRate' | 'clickRate' | 'conversion'
  winner?: string
  significance: number
  confidence: number
}

const mockAbTests: AbTest[] = [
  {
    id: 'test-1',
    name: '메시지 내용 A/B 테스트',
    description: '공식적 vs 친근한 톤의 메시지 효과 비교',
    status: 'running',
    testType: 'message_content',
    startDate: '2024-03-01',
    campaignId: 'camp-1',
    campaignName: '2024 지방선거 유권자 접촉',
    variants: [
      { id: 'v1', name: '공식 메시지', allocation: 50 },
      { id: 'v2', name: '친근 메시지', allocation: 50 }
    ],
    primaryMetric: 'clickRate',
    significance: 0.023,
    confidence: 95
  },
  {
    id: 'test-2',
    name: '발송 시간 최적화',
    description: '오전 vs 오후 발송 시간의 참여율 비교',
    status: 'completed',
    testType: 'send_time',
    startDate: '2024-02-15',
    endDate: '2024-02-28',
    campaignId: 'camp-2',
    campaignName: '정책 설명회 초대',
    variants: [
      { id: 'v1', name: '오전 9시', allocation: 50 },
      { id: 'v2', name: '오후 2시', allocation: 50 }
    ],
    primaryMetric: 'openRate',
    winner: 'v1',
    significance: 0.001,
    confidence: 99
  },
  {
    id: 'test-3',
    name: '채널 믹스 실험',
    description: 'SMS vs KakaoTalk 채널 효과성 비교',
    status: 'completed',
    testType: 'channel_mix',
    startDate: '2024-01-20',
    endDate: '2024-02-10',
    campaignId: 'camp-3',
    campaignName: '청년층 정책 홍보',
    variants: [
      { id: 'v1', name: 'SMS 전용', allocation: 50 },
      { id: 'v2', name: 'KakaoTalk 전용', allocation: 50 }
    ],
    primaryMetric: 'conversion',
    winner: 'v2',
    significance: 0.008,
    confidence: 99
  }
]

const mockVariantData: { [testId: string]: AbVariant[] } = {
  'test-1': [
    {
      name: '공식 메시지',
      sent: 7500,
      delivered: 7312,
      opened: 5834,
      clicked: 1423,
      conversions: 1423,
      deliveryRate: 0.975,
      openRate: 0.798,
      clickRate: 0.244,
      conversionRate: 0.190
    },
    {
      name: '친근 메시지',
      sent: 7500,
      delivered: 7285,
      opened: 6234,
      clicked: 1876,
      conversions: 1876,
      deliveryRate: 0.971,
      openRate: 0.856,
      clickRate: 0.301,
      conversionRate: 0.250
    }
  ],
  'test-2': [
    {
      name: '오전 9시',
      sent: 4375,
      delivered: 4312,
      opened: 3785,
      clicked: 1156,
      conversions: 1156,
      deliveryRate: 0.986,
      openRate: 0.878,
      clickRate: 0.305,
      conversionRate: 0.264
    },
    {
      name: '오후 2시',
      sent: 4375,
      delivered: 4298,
      opened: 3234,
      clicked: 987,
      conversions: 987,
      deliveryRate: 0.982,
      openRate: 0.752,
      clickRate: 0.305,
      conversionRate: 0.225
    }
  ],
  'test-3': [
    {
      name: 'SMS 전용',
      sent: 11050,
      delivered: 10734,
      opened: 9423,
      clicked: 2234,
      conversions: 2234,
      deliveryRate: 0.971,
      openRate: 0.878,
      clickRate: 0.237,
      conversionRate: 0.202
    },
    {
      name: 'KakaoTalk 전용',
      sent: 11050,
      delivered: 10876,
      opened: 9645,
      clicked: 2834,
      conversions: 2834,
      deliveryRate: 0.984,
      openRate: 0.887,
      clickRate: 0.294,
      conversionRate: 0.256
    }
  ]
}

export default function AbTestsAnalyticsPage() {
  const { filters, updateFilter, resetFilters } = useAnalyticsFilters()
  const [selectedTest, setSelectedTest] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredTests = mockAbTests.filter(test => {
    if (statusFilter !== 'all' && test.status !== statusFilter) return false
    return true
  })

  const activeTest = filteredTests.find(test => test.id === selectedTest)
  const activeVariants = selectedTest !== 'all' ? mockVariantData[selectedTest] || [] : []

  // Calculate summary metrics
  const runningTests = mockAbTests.filter(test => test.status === 'running').length
  const completedTests = mockAbTests.filter(test => test.status === 'completed').length
  const significantTests = mockAbTests.filter(test => test.significance < 0.05).length
  const averageUplift = mockAbTests
    .filter(test => test.status === 'completed' && test.winner)
    .reduce((sum, test) => sum + 12.5, 0) / 
    Math.max(mockAbTests.filter(test => test.status === 'completed' && test.winner).length, 1)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Clock className="h-4 w-4 text-blue-500" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'paused': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'paused': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'message_content': return '메시지 내용'
      case 'send_time': return '발송 시간'
      case 'channel_mix': return '채널 믹스'
      case 'targeting': return '타겟팅'
      default: return type
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A/B 테스트 분석</h1>
          <p className="text-muted-foreground">
            A/B 테스트 결과 및 통계적 유의성 분석
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="running">진행중</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="paused">일시중지</SelectItem>
              <SelectItem value="draft">초안</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="테스트 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 테스트</SelectItem>
              {filteredTests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span>{test.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportMenu filters={filters} />
        </div>
      </div>

      {/* Test Info Banner */}
      {activeTest && (
        <Card className={cn("p-6", getStatusColor(activeTest.status))}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">{activeTest.name}</h2>
              <p className="text-sm mb-3">{activeTest.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(activeTest.status)}
                  <span className="capitalize">{activeTest.status === 'running' ? '진행중' : activeTest.status === 'completed' ? '완료' : activeTest.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">유형:</span> {getTestTypeLabel(activeTest.testType)}
                </div>
                <div>
                  <span className="text-muted-foreground">기간:</span> 
                  {activeTest.startDate} {activeTest.endDate && ` ~ ${activeTest.endDate}`}
                </div>
                <div>
                  <span className="text-muted-foreground">변형:</span> {activeTest.variants.length}개
                </div>
              </div>
            </div>
            <div className="text-right">
              {activeTest.winner && (
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">승리 변형: {activeTest.variants.find(v => v.id === activeTest.winner)?.name}</span>
                </div>
              )}
              {activeTest.significance < 0.05 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  통계적 유의성 확인 (p &lt; 0.05)
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <KpiCardGroup>
        <KpiCard
          label="진행중인 테스트"
          value={runningTests}
          color="baseline"
          icon={Clock}
          formatter={(val) => val.toString()}
        />
        <KpiCard
          label="완료된 테스트"
          value={completedTests}
          color="conversion"
          icon={CheckCircle}
          formatter={(val) => val.toString()}
        />
        <KpiCard
          label="유의한 결과"
          value={significantTests}
          color="open"
          icon={TrendingUp}
          formatter={(val) => val.toString()}
        />
        <KpiCard
          label="평균 개선율"
          value={`${averageUplift.toFixed(1)}%`}
          deltaPct={3.2}
          color="click"
          icon={Target}
        />
      </KpiCardGroup>

      {selectedTest === 'all' ? (
        <>
          {/* All Tests Overview */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">A/B 테스트 현황</h3>
              <div className="space-y-4">
                {filteredTests.map((test) => (
                  <div key={test.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{test.name}</h4>
                          <Badge variant="outline" className={cn("text-xs", getStatusColor(test.status))}>
                            {test.status === 'running' ? '진행중' : test.status === 'completed' ? '완료' : test.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTestTypeLabel(test.testType)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>캠페인: {test.campaignName}</span>
                          <span>변형: {test.variants.length}개</span>
                          <span>주 지표: {test.primaryMetric}</span>
                          <span>{test.startDate} {test.endDate && `~ ${test.endDate}`}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {test.winner && (
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {test.variants.find(v => v.id === test.winner)?.name}
                            </span>
                          </div>
                        )}
                        {test.significance < 0.05 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            유의함 (p={test.significance.toFixed(3)})
                          </Badge>
                        )}
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedTest(test.id)}
                          >
                            자세히 보기
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Test Performance Summary Chart */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">테스트별 성과 비교</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">완료된 테스트 결과</h4>
                  <div className="space-y-3">
                    {mockAbTests.filter(test => test.status === 'completed').map((test) => {
                      const testVariants = mockVariantData[test.id] || []
                      if (testVariants.length < 2) return null
                      
                      const winner = testVariants[1] // Assume second variant won
                      const control = testVariants[0]
                      const uplift = ((winner.clickRate - control.clickRate) / control.clickRate) * 100
                      
                      return (
                        <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium text-sm">{test.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {getTestTypeLabel(test.testType)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">+{uplift.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">개선율</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">테스트 유형별 분포</h4>
                  <div className="space-y-3">
                    {['message_content', 'send_time', 'channel_mix', 'targeting'].map((type) => {
                      const count = mockAbTests.filter(test => test.testType === type).length
                      const percentage = (count / mockAbTests.length) * 100
                      
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm">{getTestTypeLabel(type)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-blue-500 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8">{count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Individual Test Analysis */}
          {activeVariants.length > 0 && (
            <>
              {/* A/B Test Bar Chart */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">변형 성과 비교</h3>
                  <Suspense fallback={<ChartSkeleton className="h-96" />}>
                    <AbTestBarChart
                      variants={activeVariants}
                      primaryMetric="clickRate"
                      metric="all"
                      showLift={true}
                      height={400}
                    />
                  </Suspense>
                </div>
              </Card>

              {/* Detailed Variant Table */}
              <Suspense fallback={<TableSkeleton />}>
                <AbVariantTable
                  variants={activeVariants}
                  primaryMetric="clickRate"
                />
              </Suspense>

              {/* Test Performance Widget */}
              {activeTest && (
                <Suspense fallback={<WidgetSkeleton />}>
                  <AbTestPerformanceWidget
                    campaignId={activeTest.campaignId}
                    filters={filters}
                    config={{
                      variants: activeTest.variants,
                      testType: activeTest.testType,
                      startDate: activeTest.startDate,
                      endDate: activeTest.endDate
                    }}
                  />
                </Suspense>
              )}
            </>
          )}

          {/* Test Recommendations */}
          {activeTest && activeTest.status === 'completed' && activeTest.winner && (
            <Card className="bg-green-50 border-green-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">추천 사항</h3>
                <div className="space-y-3 text-green-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      '{activeTest.variants.find(v => v.id === activeTest.winner)?.name}' 변형을 전체 캠페인에 적용하세요
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    <span>
                      통계적으로 유의한 결과로 신뢰할 수 있는 개선이 확인되었습니다
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>
                      예상 개선율: +{((activeVariants[1]?.clickRate || 0) - (activeVariants[0]?.clickRate || 0) / (activeVariants[0]?.clickRate || 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Loading Skeletons
function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className || "h-64 w-full"} />
}

function TableSkeleton() {
  return (
    <Card>
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function WidgetSkeleton() {
  return (
    <Card>
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}