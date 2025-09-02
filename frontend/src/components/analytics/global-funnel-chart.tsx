'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, TrendingDown, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useFunnelMetrics } from '@/hooks/use-analytics-api'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

interface GlobalFunnelChartProps {
  filters: AnalyticsFilters
}

interface FunnelStageProps {
  stage: {
    name: string
    displayName: string
    count: number
    conversionRate: number
    absoluteRate: number
    dropOffRate: number
    dropOffCount: number
    order: number
    color: string
    width: number
  }
  isFirst?: boolean
  maxCount: number
}

function FunnelStage({ stage, isFirst, maxCount }: FunnelStageProps) {
  const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0

  return (
    <div className="relative">
      {/* Stage Bar */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="flex-1">
          <div 
            className="h-12 rounded-lg flex items-center justify-between px-4 text-white font-medium transition-all duration-300 hover:shadow-md"
            style={{
              backgroundColor: stage.color,
              width: `${Math.max(widthPercentage, 15)}%` // Minimum 15% for visibility
            }}
          >
            <span className="text-sm font-medium">{stage.displayName}</span>
            <span className="text-sm">{stage.count.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Conversion Rate Badge */}
        <div className="flex flex-col items-end space-y-1 min-w-[80px]">
          <Badge variant="outline" className="text-xs">
            {isFirst ? '100%' : `${stage.conversionRate.toFixed(1)}%`}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {stage.absoluteRate.toFixed(1)}% total
          </span>
        </div>
      </div>

      {/* Drop-off Indicator */}
      {!isFirst && stage.dropOffCount > 0 && (
        <div className="flex items-center space-x-2 mb-4 pl-4">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span className="text-sm text-muted-foreground">
            {stage.dropOffCount.toLocaleString()} dropped off ({stage.dropOffRate.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}

export function GlobalFunnelChart({ filters }: GlobalFunnelChartProps) {
  const { data, isLoading, error, refetch } = useFunnelMetrics(filters)

  const maxCount = useMemo(() => {
    if (!data?.stages.length) return 0
    return Math.max(...data.stages.map(stage => stage.count))
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load funnel data. Please try again.</span>
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
    )
  }

  if (!data || !data.stages.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No funnel data available</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Funnel Stages */}
      <div className="space-y-4">
        {data.stages.map((stage, index) => (
          <FunnelStage
            key={stage.name}
            stage={stage}
            isFirst={index === 0}
            maxCount={maxCount}
          />
        ))}
      </div>

      {/* Overall Performance Summary */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {data.insights.overallConversionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Overall Conversion</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {data.insights.deliveryEfficiency.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Delivery Efficiency</div>
          </div>
        </div>

        {/* Engagement Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Engagement Rate</span>
            <span>{data.insights.engagementRate.toFixed(1)}%</span>
          </div>
          <Progress value={data.insights.engagementRate} className="h-2" />
        </div>
      </div>

      {/* Insights & Recommendations */}
      {data.insights.biggestDropOff && data.insights.biggestDropOffRate > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
            Key Insights
          </h4>
          
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Biggest Drop-off: {data.insights.biggestDropOff}
                  </p>
                  <p className="text-sm text-orange-700">
                    {data.insights.biggestDropOffCount.toLocaleString()} users ({data.insights.biggestDropOffRate.toFixed(1)}% drop-off rate)
                  </p>
                </div>
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  Optimize
                </Badge>
              </div>
            </div>

            {data.insights.bestPerformingChannel && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Best Channel: {data.insights.bestPerformingChannel}
                    </p>
                    <p className="text-sm text-green-700">
                      {data.insights.bestChannelConversionRate.toFixed(1)}% conversion rate
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Top Performer
                  </Badge>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {data.insights.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recommendations:</p>
                <ul className="space-y-1">
                  {data.insights.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Channel Breakdown (if available) */}
      {data.channelFunnels && data.channelFunnels.length > 1 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Channel Performance</h4>
          <div className="grid grid-cols-1 gap-3">
            {data.channelFunnels.map((channelFunnel) => (
              <div key={channelFunnel.channel} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getChannelColor(channelFunnel.channel) }}
                  />
                  <span className="text-sm font-medium capitalize">{channelFunnel.channel}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {channelFunnel.overallConversionRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">conversion</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    sms: '#3B82F6',
    kakao: '#F59E0B',
    email: '#8B5CF6',
    push: '#10B981'
  }
  return colors[channel.toLowerCase()] || '#6B7280'
}