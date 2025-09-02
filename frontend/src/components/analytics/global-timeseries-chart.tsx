'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimeSeriesMetrics } from '@/hooks/use-analytics-api'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface GlobalTimeSeriesChartProps {
  filters: AnalyticsFilters
  height?: number
}

const CHART_COLORS = {
  sent: '#3B82F6',      // blue
  delivered: '#10B981',  // green
  opened: '#F59E0B',     // orange
  clicked: '#8B5CF6',    // purple
  failed: '#EF4444'      // red
}

export function GlobalTimeSeriesChart({ filters, height = 400 }: GlobalTimeSeriesChartProps) {
  const { data, isLoading, error, refetch } = useTimeSeriesMetrics(filters)

  const chartData = useMemo(() => {
    if (!data) return null

    const labels = data.buckets.map(bucket => bucket.label)

    const datasets = [
      {
        label: 'Sent',
        data: data.buckets.map(bucket => bucket.sent),
        borderColor: CHART_COLORS.sent,
        backgroundColor: CHART_COLORS.sent + '10',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.sent,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Delivered',
        data: data.buckets.map(bucket => bucket.delivered),
        borderColor: CHART_COLORS.delivered,
        backgroundColor: CHART_COLORS.delivered + '10',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.delivered,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Opened',
        data: data.buckets.map(bucket => bucket.opened),
        borderColor: CHART_COLORS.opened,
        backgroundColor: CHART_COLORS.opened + '10',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.opened,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Clicked',
        data: data.buckets.map(bucket => bucket.clicked),
        borderColor: CHART_COLORS.clicked,
        backgroundColor: CHART_COLORS.clicked + '10',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.clicked,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]

    // Add failed line if there are failures
    if (data.buckets.some(bucket => bucket.failed > 0)) {
      datasets.push({
        label: 'Failed',
        data: data.buckets.map(bucket => bucket.failed),
        borderColor: CHART_COLORS.failed,
        backgroundColor: CHART_COLORS.failed + '10',
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.failed,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      })
    }

    return {
      labels,
      datasets
    }
  }, [data])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: false
      },
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 20,
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
          title: (context: TooltipItem<'line'>[]) => {
            if (context.length > 0) {
              const bucket = data?.buckets[context[0].dataIndex]
              if (bucket) {
                return format(new Date(bucket.timestamp), 'MMM dd, yyyy HH:mm')
              }
            }
            return ''
          },
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${value.toLocaleString()}`
          },
          afterBody: (context: TooltipItem<'line'>[]) => {
            if (context.length > 0) {
              const bucket = data?.buckets[context[0].dataIndex]
              if (bucket && bucket.sent > 0) {
                return [
                  '',
                  `Delivery Rate: ${bucket.deliveryRate.toFixed(1)}%`,
                  `Open Rate: ${bucket.openRate.toFixed(1)}%`,
                  `Click Rate: ${bucket.clickRate.toFixed(1)}%`
                ]
              }
            }
            return []
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        display: true,
        title: {
          display: true,
          text: getTimeAxisLabel(filters.interval),
          font: {
            size: 12,
            weight: 'normal' as const
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          maxTicksLimit: 12,
          font: {
            size: 11
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Message Count',
          font: {
            size: 12,
            weight: 'normal' as const
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(tickValue: string | number) {
            const value = Number(tickValue)
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}K`
            }
            return value.toString()
          },
          font: {
            size: 11
          }
        },
        beginAtZero: true
      }
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const,
        borderCapStyle: 'round' as const
      },
      point: {
        hoverBorderWidth: 3
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const
    }
  }), [data, filters.interval])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className={`w-full h-[${height}px]`} />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-200">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load time series data. Please try again.</span>
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
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm">Try adjusting your date range or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Metadata */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{data.metadata.totalBuckets} data points</span>
          {data.metadata.emptyBuckets > 0 && (
            <span>{data.metadata.emptyBuckets} empty intervals</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Interval: {filters.interval}</span>
          <span>•</span>
          <span>Timezone: {filters.timezone}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Summary Stats */}
      <div className="text-center text-sm text-muted-foreground mt-4">
        Performance trends over time with {data.metadata.totalBuckets} data points
      </div>
    </div>
  )
}

function getTimeAxisLabel(interval: string): string {
  switch (interval) {
    case '5m':
      return 'Time (5-minute intervals)'
    case '1h':
      return 'Time (hourly intervals)'
    case '1d':
      return 'Date (daily intervals)'
    default:
      return 'Time'
  }
}