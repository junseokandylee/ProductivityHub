'use client'

import React, { useMemo } from 'react'
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
  TimeScale
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TimeSeriesPoint, ChannelFilter } from '@/lib/types/campaign-metrics'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

interface MetricsChartProps {
  data: TimeSeriesPoint[] | null
  channelFilter: ChannelFilter
  isLoading?: boolean
  className?: string
  height?: number
}

export function MetricsChart({ 
  data, 
  channelFilter, 
  isLoading = false,
  className,
  height = 300
}: MetricsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    const labels = data.map(point => new Date(point.t))

    const datasets = [
      {
        label: 'Delivered',
        data: data.map(point => ({
          x: point.t,
          y: point.delivered
        })),
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: 'Failed',
        data: data.map(point => ({
          x: point.t,
          y: point.failed
        })),
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6
      },
      {
        label: 'Attempted',
        data: data.map(point => ({
          x: point.t,
          y: point.attempted
        })),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderDash: [5, 5]
      }
    ]

    return {
      labels,
      datasets
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            if (context.length > 0) {
              const date = new Date(context[0].parsed.x)
              return new Intl.DateTimeFormat('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }).format(date)
            }
            return ''
          },
          label: (context: any) => {
            const value = context.parsed.y
            const formattedValue = new Intl.NumberFormat('ko-KR').format(value)
            return `${context.dataset.label}: ${formattedValue}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MM/dd'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          maxTicksLimit: 8,
          font: {
            size: 11
          },
          color: 'rgba(0, 0, 0, 0.6)'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          },
          color: 'rgba(0, 0, 0, 0.6)',
          callback: function(value: any) {
            return new Intl.NumberFormat('ko-KR').format(value)
          }
        }
      }
    },
    elements: {
      point: {
        hoverBorderWidth: 2
      }
    },
    hover: {
      mode: 'nearest' as const,
      intersect: false
    }
  }), [])

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Campaign Performance
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="w-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            <div className="text-gray-400 text-sm">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="w-full border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center"
            style={{ height: `${height}px` }}
            role="img"
            aria-label="No chart data available"
          >
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium">No data available</div>
              <div className="text-xs mt-1">Campaign metrics will appear here once available</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const channelLabel = channelFilter === 'all' 
    ? 'All Channels' 
    : channelFilter === 'sms' 
    ? 'SMS Only' 
    : 'KakaoTalk Only'

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Campaign Performance
          <span className="text-sm font-normal text-muted-foreground">
            {channelLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          style={{ height: `${height}px` }}
          role="img"
          aria-label={`Campaign performance chart showing delivered, failed, and attempted messages over time for ${channelLabel}`}
        >
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricsChart