'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useCostQuota } from '@/hooks/use-analytics-api'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

interface QuotaProgressCardProps {
  filters: AnalyticsFilters
  className?: string
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

function getDaysRemaining(): number {
  const now = new Date()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const diffTime = endOfMonth.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function QuotaProgressCard({ filters, className }: QuotaProgressCardProps) {
  const { data, isLoading, error, refetch } = useCostQuota(filters)

  const quotaAnalysis = useMemo(() => {
    if (!data?.quotaUsage) return null

    const {
      monthlyLimit,
      monthToDateUsage,
      remainingQuota,
      usagePercentage,
      daysRemainingInMonth,
      dailyAverageUsage,
      projectedMonthEndUsage,
      isOverQuota,
      isNearQuota
    } = data.quotaUsage

    const progressPercentage = Math.min(100, Math.round(usagePercentage))
    const isAtRisk = projectedMonthEndUsage > monthlyLimit
    const projectedOverage = Math.max(0, projectedMonthEndUsage - monthlyLimit)
    
    // Calculate recommended daily limit to stay within quota
    const recommendedDailyLimit = daysRemainingInMonth > 0 
      ? Math.floor(remainingQuota / daysRemainingInMonth)
      : 0

    // Status determination
    let status: 'healthy' | 'warning' | 'danger' | 'critical'
    let statusColor: string
    let statusText: string

    if (isOverQuota) {
      status = 'critical'
      statusColor = 'text-red-600 bg-red-50 border-red-200'
      statusText = 'Over Quota'
    } else if (usagePercentage >= 90) {
      status = 'danger'
      statusColor = 'text-red-600 bg-red-50 border-red-200'
      statusText = 'Critical Usage'
    } else if (isNearQuota || isAtRisk) {
      status = 'warning'
      statusColor = 'text-yellow-600 bg-yellow-50 border-yellow-200'
      statusText = 'At Risk'
    } else {
      status = 'healthy'
      statusColor = 'text-green-600 bg-green-50 border-green-200'
      statusText = 'On Track'
    }

    return {
      progressPercentage,
      isAtRisk,
      projectedOverage,
      recommendedDailyLimit,
      status,
      statusColor,
      statusText,
      ...data.quotaUsage
    }
  }, [data])

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="p-4">
          <Alert className="border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load quota data</span>
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

  if (!quotaAnalysis) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-8 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No quota data available</p>
          <p className="text-sm">Quota tracking not configured</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", quotaAnalysis.statusColor, className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Monthly Quota Usage</span>
          </div>
          <Badge variant="outline" className={cn("text-xs", quotaAnalysis.statusColor)}>
            {quotaAnalysis.statusText}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {formatNumber(quotaAnalysis.monthToDateUsage)} / {formatNumber(quotaAnalysis.monthlyLimit)}
            </span>
            <span className="text-muted-foreground">
              {quotaAnalysis.progressPercentage}%
            </span>
          </div>
          <Progress 
            value={quotaAnalysis.progressPercentage} 
            className={cn(
              "h-3",
              quotaAnalysis.status === 'critical' && "bg-red-100",
              quotaAnalysis.status === 'danger' && "bg-red-100", 
              quotaAnalysis.status === 'warning' && "bg-yellow-100"
            )}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Month to date</span>
            <span>{formatNumber(quotaAnalysis.remainingQuota)} remaining</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Daily Average
            </div>
            <div className="text-lg font-semibold">
              {formatNumber(quotaAnalysis.dailyAverageUsage)}
            </div>
            <div className="text-xs text-muted-foreground">messages/day</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Projected Total
            </div>
            <div className={cn(
              "text-lg font-semibold",
              quotaAnalysis.isAtRisk ? "text-red-600" : "text-gray-900"
            )}>
              {formatNumber(quotaAnalysis.projectedMonthEndUsage)}
            </div>
            <div className="text-xs text-muted-foreground">
              {quotaAnalysis.daysRemainingInMonth} days left
            </div>
          </div>
        </div>

        {/* Warnings and Recommendations */}
        {(quotaAnalysis.isAtRisk || quotaAnalysis.isNearQuota) && (
          <div className="space-y-3 pt-2 border-t">
            {quotaAnalysis.isAtRisk && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800">
                  <div className="font-medium mb-1">Projected Overage</div>
                  <div>
                    At current usage rate, you may exceed quota by{' '}
                    <span className="font-semibold">
                      {formatNumber(quotaAnalysis.projectedOverage)} messages
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendation</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>
                  Limit daily usage to{' '}
                  <span className="font-semibold">
                    {formatNumber(quotaAnalysis.recommendedDailyLimit)} messages
                  </span>{' '}
                  to stay within quota
                </div>
                <div className="text-xs">
                  Current average: {formatNumber(quotaAnalysis.dailyAverageUsage)} messages/day
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Healthy Status Message */}
        {quotaAnalysis.status === 'healthy' && (
          <div className="text-center text-sm text-green-700 bg-green-50 rounded-lg p-3">
            <div className="font-medium">✓ Usage is on track</div>
            <div className="text-xs text-green-600 mt-1">
              You can safely send up to {formatNumber(quotaAnalysis.recommendedDailyLimit)} messages per day
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}