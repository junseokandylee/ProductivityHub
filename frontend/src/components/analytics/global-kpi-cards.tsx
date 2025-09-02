'use client'

import { TrendingUp, TrendingDown, Minus, Send, CheckCircle, Eye, MousePointer, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAnalyticsSummary } from '@/hooks/use-analytics-api'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

interface GlobalKpiCardsProps {
  filters: AnalyticsFilters
}

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
    isGood?: boolean
  }
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray'
  isLoading?: boolean
  error?: boolean
}

function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = 'blue', 
  isLoading,
  error 
}: KpiCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    gray: 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-sm text-red-600">Error loading data</p>
          </div>
          <div className="p-2 bg-red-100 rounded-full">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </Card>
    )
  }

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : 
                   trend?.direction === 'down' ? TrendingDown : Minus

  return (
    <Card className={cn("p-6 transition-all hover:shadow-md", colorClasses[color])}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          
          <div className="flex items-center gap-2">
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
            
            {trend && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  trend.isGood 
                    ? trend.direction === 'up' ? "text-green-600 border-green-300" : "text-red-600 border-red-300"
                    : trend.direction === 'up' ? "text-red-600 border-red-300" : "text-green-600 border-green-300"
                )}
              >
                <TrendIcon className="h-3 w-3 mr-1" />
                {trend.value}
              </Badge>
            )}
          </div>
        </div>
        
        <div className={cn("p-3 rounded-full", iconBgClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

function formatCurrency(amount: number, currency: string = 'KRW'): string {
  if (currency === 'KRW') {
    return `₩${amount.toLocaleString()}`
  }
  return `${currency} ${amount.toLocaleString()}`
}

function formatPercentage(rate: number): string {
  return `${rate.toFixed(1)}%`
}

export function GlobalKpiCards({ filters }: GlobalKpiCardsProps) {
  const { data, isLoading, error } = useAnalyticsSummary(filters)

  const cards = [
    {
      title: 'Messages Sent',
      value: data?.kpi.sent || 0,
      subtitle: formatNumber(data?.kpi.uniqueContacts || 0) + ' contacts',
      icon: Send,
      color: 'blue' as const,
      trend: {
        direction: 'up' as const,
        value: '+12.3%',
        isGood: true
      }
    },
    {
      title: 'Delivery Rate',
      value: formatPercentage(data?.rates.deliveryRate || 0),
      subtitle: formatNumber(data?.kpi.delivered || 0) + ' delivered',
      icon: CheckCircle,
      color: 'green' as const,
      trend: {
        direction: 'up' as const,
        value: '+2.1%',
        isGood: true
      }
    },
    {
      title: 'Open Rate',
      value: formatPercentage(data?.rates.openRate || 0),
      subtitle: formatNumber(data?.kpi.opened || 0) + ' opened',
      icon: Eye,
      color: 'orange' as const,
      trend: {
        direction: 'down' as const,
        value: '-0.8%',
        isGood: false
      }
    },
    {
      title: 'Click Rate',
      value: formatPercentage(data?.rates.clickRate || 0),
      subtitle: formatNumber(data?.kpi.clicked || 0) + ' clicked',
      icon: MousePointer,
      color: 'purple' as const,
      trend: {
        direction: 'up' as const,
        value: '+5.2%',
        isGood: true
      }
    }
  ]

  // Add failure rate card if there are failures
  if (data?.kpi.failed && data.kpi.failed > 0) {
    cards.push({
      title: 'Failure Rate',
      value: formatPercentage(data.rates.failureRate),
      subtitle: formatNumber(data.kpi.failed) + ' failed',
      icon: AlertCircle,
      color: 'orange' as const,
      trend: {
        direction: 'down' as const,
        value: '-1.2%',
        isGood: true // Lower failure rate is good
      }
    })
  }

  // Add cost card if there are costs
  if (data?.kpi.totalCost && data.kpi.totalCost > 0) {
    cards.push({
      title: 'Total Cost',
      value: formatCurrency(data.kpi.totalCost),
      subtitle: formatNumber(data.kpi.uniqueCampaigns) + ' campaigns',
      icon: Send, // Could use a different icon for cost
      color: 'purple' as const,
      trend: {
        direction: 'up' as const,
        value: '+8.7%',
        isGood: false
      }
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.slice(0, 4).map((card, index) => (
        <KpiCard
          key={index}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          color={card.color}
          trend={card.trend}
          isLoading={isLoading}
          error={!!error}
        />
      ))}
      
      {/* Additional cards for more metrics */}
      {cards.length > 4 && (
        <div className="md:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.slice(4).map((card, index) => (
              <KpiCard
                key={`extra-${index}`}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                color={card.color}
                trend={card.trend}
                isLoading={isLoading}
                error={!!error}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}