'use client'

import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCostQuota } from '@/hooks/use-analytics-api'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'
import { formatCurrency, formatCurrencyAccessible } from '@/lib/utils/currency'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

interface CostByChannelChartProps {
  filters: AnalyticsFilters
  height?: number
}

const CHANNEL_COLORS = {
  sms: '#3B82F6',      // blue
  kakao: '#F59E0B',    // orange
  email: '#8B5CF6',    // purple
  push: '#10B981'      // green
}

// Currency formatting moved to utility file

export function CostByChannelChart({ filters, height = 300 }: CostByChannelChartProps) {
  const { data, isLoading, error, refetch } = useCostQuota(filters)

  const chartData = useMemo(() => {
    if (!data?.channelCosts.length) return null

    // Sort channels by cost descending
    const sortedChannels = [...data.channelCosts].sort((a, b) => b.cost - a.cost)

    return {
      labels: sortedChannels.map(channel => {
        const channelName = channel.channel.charAt(0).toUpperCase() + channel.channel.slice(1)
        return `${channelName} (${channel.percentageOfTotal.toFixed(1)}%)`
      }),
      datasets: [{
        data: sortedChannels.map(channel => channel.cost),
        backgroundColor: sortedChannels.map(channel => 
          CHANNEL_COLORS[channel.channel as keyof typeof CHANNEL_COLORS] || '#6B7280'
        ),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8
      }]
    }
  }, [data])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 'normal' as const
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const channelData = data?.channelCosts[context.dataIndex]
            if (!channelData) return ''
            
            const cost = formatCurrency(channelData.cost, { currency: data?.totalCost.currency })
            const messageCount = channelData.messageCount.toLocaleString()
            const avgCost = formatCurrency(channelData.averageCostPerMessage, { currency: data?.totalCost.currency })
            
            return [
              `Cost: ${cost}`,
              `Messages: ${messageCount}`,
              `Avg per message: ${avgCost}`
            ]
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 750
    },
    cutout: '60%', // Makes it a doughnut instead of pie
    elements: {
      arc: {
        borderJoinStyle: 'round' as const
      }
    }
  }), [data])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load cost data. Please try again.</span>
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

  if (!data || !chartData) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height: `${height}px` }}>
        <div className="text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No cost data available</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div style={{ height: `${height}px` }} className="relative">
        <Doughnut data={chartData} options={chartOptions} />
        
        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div 
              className="text-2xl font-bold text-gray-900"
              aria-label={formatCurrencyAccessible(data.totalCost.total, { currency: data.totalCost.currency })}
            >
              {formatCurrency(data.totalCost.total, { currency: data.totalCost.currency })}
            </div>
            <div className="text-sm text-muted-foreground">Total Cost</div>
            <div className="text-xs text-muted-foreground mt-1">
              {data.totalCost.totalMessages.toLocaleString()} messages
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {data.channelCosts.map((channel) => (
          <div key={channel.channel} className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[channel.channel as keyof typeof CHANNEL_COLORS] || '#6B7280' }}
              />
              <span className="font-medium capitalize">{channel.channel}</span>
            </div>
            <div className="font-semibold text-lg">
              {formatCurrency(channel.cost, { currency: data.totalCost.currency })}
            </div>
            <div className="text-xs text-muted-foreground">
              {channel.messageCount.toLocaleString()} msgs
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(channel.averageCostPerMessage, { currency: data.totalCost.currency })}/msg
            </div>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      {data.totalCost.averageCostPerMessage && (
        <div className="text-center text-sm text-muted-foreground">
          Average cost per message: {formatCurrency(data.totalCost.averageCostPerMessage, { currency: data.totalCost.currency })}
        </div>
      )}
    </div>
  )
}