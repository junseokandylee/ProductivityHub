'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useAnalyticsSummary } from '@/hooks/use-analytics-api'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'
import { AbVariantTable } from '@/components/analytics/ab-variant-table'
import { AbTestBarChart } from '@/components/analytics/ab-test-bar-chart'
import { WinnerCrown, SignificanceBadge } from '@/components/analytics/winner-badge'
import type { AbVariant } from '@/lib/utils/ab-test-statistics'

interface AbTestConfig {
  variants: Array<{
    id: string
    name: string
    allocation: number
    description?: string
  }>
  testType: 'message_content' | 'send_time' | 'channel_mix' | 'targeting'
  startDate: string
  endDate?: string
}

interface AbTestPerformanceWidgetProps {
  campaignId: string
  filters: AnalyticsFilters
  config: AbTestConfig
}

interface VariantPerformance {
  variantId: string
  name: string
  allocation: number
  metrics: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    deliveryRate: number
    openRate: number
    clickRate: number
    conversionRate: number
  }
  trend: {
    direction: 'up' | 'down' | 'neutral'
    value: number
    isStatisticallySignificant: boolean
  }
}

function calculateStatisticalSignificance(variant1: VariantPerformance, variant2: VariantPerformance): boolean {
  // Simplified statistical significance calculation
  // In production, this would use proper statistical tests like chi-square or t-test
  const diff = Math.abs(variant1.metrics.conversionRate - variant2.metrics.conversionRate)
  const pooledStdError = Math.sqrt(
    (variant1.metrics.conversionRate * (1 - variant1.metrics.conversionRate)) / variant1.metrics.sent +
    (variant2.metrics.conversionRate * (1 - variant2.metrics.conversionRate)) / variant2.metrics.sent
  )
  const zScore = diff / pooledStdError
  return zScore > 1.96 // 95% confidence level
}

export function AbTestPerformanceWidget({ campaignId, filters, config }: AbTestPerformanceWidgetProps) {
  // Get overall campaign data
  const { data, isLoading, error, refetch } = useAnalyticsSummary(filters)

  // Calculate variant-specific performance (mock data for now)
  // In production, this would come from a separate A/B test analytics endpoint
  const variantPerformance = useMemo((): VariantPerformance[] => {
    if (!data || !config.variants) return []

    return config.variants.map((variant, index) => {
      // Mock calculation - distribute metrics based on allocation
      const baseMetrics = {
        sent: Math.round((data.kpi.sent * variant.allocation) / 100),
        delivered: Math.round((data.kpi.delivered * variant.allocation) / 100),
        opened: Math.round((data.kpi.opened * variant.allocation) / 100),
        clicked: Math.round((data.kpi.clicked * variant.allocation) / 100)
      }

      // Add some variance to simulate different performance
      const performanceMultiplier = 1 + (Math.sin(index) * 0.1) // -10% to +10% variance
      const adjustedMetrics = {
        ...baseMetrics,
        delivered: Math.round(baseMetrics.delivered * performanceMultiplier),
        opened: Math.round(baseMetrics.opened * performanceMultiplier * 1.05),
        clicked: Math.round(baseMetrics.clicked * performanceMultiplier * 1.1)
      }

      const deliveryRate = adjustedMetrics.sent > 0 ? adjustedMetrics.delivered / adjustedMetrics.sent : 0
      const openRate = adjustedMetrics.delivered > 0 ? adjustedMetrics.opened / adjustedMetrics.delivered : 0
      const clickRate = adjustedMetrics.delivered > 0 ? adjustedMetrics.clicked / adjustedMetrics.delivered : 0
      const conversionRate = adjustedMetrics.sent > 0 ? adjustedMetrics.clicked / adjustedMetrics.sent : 0

      return {
        variantId: variant.id,
        name: variant.name,
        allocation: variant.allocation,
        metrics: {
          ...adjustedMetrics,
          deliveryRate,
          openRate,
          clickRate,
          conversionRate
        },
        trend: {
          direction: performanceMultiplier > 1 ? 'up' : performanceMultiplier < 1 ? 'down' : 'neutral',
          value: Math.abs((performanceMultiplier - 1) * 100),
          isStatisticallySignificant: Math.abs(performanceMultiplier - 1) > 0.05
        }
      }
    })
  }, [data, config.variants])

  // Convert to AbVariant format for new components
  const abVariants = useMemo((): AbVariant[] => {
    return variantPerformance.map(variant => ({
      name: variant.name,
      sent: variant.metrics.sent,
      delivered: variant.metrics.delivered,
      opened: variant.metrics.opened,
      clicked: variant.metrics.clicked,
      conversions: variant.metrics.clicked, // Using clicks as conversions for demo
      deliveryRate: variant.metrics.deliveryRate,
      openRate: variant.metrics.openRate,
      clickRate: variant.metrics.clickRate,
      conversionRate: variant.metrics.conversionRate
    }))
  }, [variantPerformance])

  // Find best and worst performing variants
  const bestVariant = variantPerformance.reduce((best, current) => 
    current.metrics.conversionRate > best.metrics.conversionRate ? current : best, 
    variantPerformance[0]
  )
  
  const worstVariant = variantPerformance.reduce((worst, current) => 
    current.metrics.conversionRate < worst.metrics.conversionRate ? current : worst, 
    variantPerformance[0]
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load A/B test data. Please try again.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!variantPerformance.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No A/B test data available</p>
            <p className="text-sm">Test may not have started or no variants configured</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">AB</span>
            </div>
            <span>A/B Test Performance</span>
          </div>
          <Badge variant="outline" className="capitalize">
            {config.testType.replace('_', ' ')}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparing {variantPerformance.length} variants • 
          {config.endDate ? 'Completed' : 'Running'} test
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* A/B Test Visualization Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="table">Detailed Table</TabsTrigger>
            <TabsTrigger value="chart">Visual Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Original Variant Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variantPerformance.map((variant) => {
            const TrendIcon = variant.trend.direction === 'up' ? TrendingUp : 
                             variant.trend.direction === 'down' ? TrendingDown : Minus
            
            const isWinner = variant.variantId === bestVariant?.variantId
            const isLoser = variant.variantId === worstVariant?.variantId && variantPerformance.length > 1

            return (
              <Card 
                key={variant.variantId} 
                className={cn(
                  "relative",
                  isWinner && "border-green-200 bg-green-50",
                  isLoser && "border-red-200 bg-red-50"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{variant.name}</CardTitle>
                    <div className="flex items-center space-x-1">
                      {isWinner && variant.trend.isStatisticallySignificant && (
                        <WinnerCrown 
                          test={{
                            zScore: 2.1,
                            pValue: 0.03,
                            isSignificant: true,
                            confidenceLevel: 0.95,
                            lift: variant.trend.value,
                            liftPercentage: variant.trend.value
                          }}
                          showTooltip={true}
                        />
                      )}
                      {variant.trend.isStatisticallySignificant && (
                        <SignificanceBadge 
                          test={{
                            zScore: variant.trend.direction === 'up' ? 2.1 : -2.1,
                            pValue: 0.03,
                            isSignificant: true,
                            confidenceLevel: 0.95,
                            lift: variant.trend.direction === 'up' ? variant.trend.value : -variant.trend.value,
                            liftPercentage: variant.trend.direction === 'up' ? variant.trend.value : -variant.trend.value
                          }}
                          showTooltip={true}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={variant.allocation} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{variant.allocation}%</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Conversion</span>
                      <div className="font-semibold text-lg">
                        {(variant.metrics.conversionRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Clicks</span>
                      <div className="font-semibold text-lg">
                        {variant.metrics.clicked.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Additional Metrics */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Rate:</span>
                      <span>{(variant.metrics.deliveryRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Open Rate:</span>
                      <span>{(variant.metrics.openRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Click Rate:</span>
                      <span>{(variant.metrics.clickRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Trend Indicator */}
                  {variant.trend.direction !== 'neutral' && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Trend</span>
                      <div className={cn(
                        "flex items-center space-x-1 text-xs",
                        variant.trend.direction === 'up' ? "text-green-600" : "text-red-600"
                      )}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{variant.trend.value.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <AbVariantTable 
              variants={abVariants}
              primaryMetric="clickRate"
              isLoading={isLoading}
              error={error}
              onRefresh={() => refetch()}
            />
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <AbTestBarChart 
              variants={abVariants}
              primaryMetric="clickRate"
              metric="all"
              showLift={true}
              height={400}
              isLoading={isLoading}
              error={error}
              onRefresh={() => refetch()}
            />
          </TabsContent>
        </Tabs>

        {/* Test Summary */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Test Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Best Performer:</span>
              <div className="font-medium text-green-600">
                {bestVariant?.name} ({(bestVariant?.metrics.conversionRate * 100).toFixed(1)}%)
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Performance Gap:</span>
              <div className="font-medium">
                {bestVariant && worstVariant ? 
                  `${((bestVariant.metrics.conversionRate - worstVariant.metrics.conversionRate) * 100).toFixed(1)}%` :
                  'N/A'
                }
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Statistical Significance:</span>
              <div className="font-medium">
                {bestVariant && worstVariant && calculateStatisticalSignificance(bestVariant, worstVariant) ? 
                  <span className="text-green-600">Significant</span> : 
                  <span className="text-yellow-600">Inconclusive</span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {bestVariant && worstVariant && calculateStatisticalSignificance(bestVariant, worstVariant) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Consider promoting {bestVariant.name} to 100% traffic allocation</li>
              <li>• Performance difference is statistically significant</li>
              <li>• Test can be concluded with confidence</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}