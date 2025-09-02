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
  TimeScale,
  TooltipItem
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { format, parseISO } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

export interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface TimeSeriesLine {
  id: string
  label: string
  data: TimeSeriesDataPoint[]
  color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral'
  fill?: boolean
  hidden?: boolean
}

export interface TimeSeriesChartProps {
  lines: TimeSeriesLine[]
  title?: string
  height?: number
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  showLegend?: boolean
  showGrid?: boolean
  showPoints?: boolean
  timeFormat?: string
  yAxisLabel?: string
  stacked?: boolean
  className?: string
  testId?: string
}

const chartColors = {
  baseline: {
    line: '#475569', // slate-600
    background: '#f1f5f9', // slate-100
    point: '#334155' // slate-700
  },
  conversion: {
    line: '#059669', // emerald-600
    background: '#d1fae5', // emerald-100
    point: '#047857' // emerald-700
  },
  open: {
    line: '#2563eb', // blue-600
    background: '#dbeafe', // blue-100
    point: '#1d4ed8' // blue-700
  },
  click: {
    line: '#d97706', // amber-600
    background: '#fef3c7', // amber-100
    point: '#b45309' // amber-700
  },
  neutral: {
    line: '#6b7280', // gray-500
    background: '#f3f4f6', // gray-100
    point: '#4b5563' // gray-600
  }
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

export function TimeSeriesChart({
  lines,
  title,
  height = 400,
  isLoading = false,
  error,
  onRetry,
  showLegend = true,
  showGrid = true,
  showPoints = true,
  timeFormat = 'MMM dd, HH:mm',
  yAxisLabel = 'Value',
  stacked = false,
  className,
  testId
}: TimeSeriesChartProps) {
  const chartData = useMemo(() => {
    if (!lines.length) return null

    // Get all unique timestamps and sort them
    const allTimestamps = Array.from(
      new Set(
        lines.flatMap(line => 
          line.data.map(point => point.timestamp)
        )
      )
    ).sort()

    const datasets = lines
      .filter(line => !line.hidden)
      .map(line => {
        const colors = chartColors[line.color]
        
        // Create data points for each timestamp
        const dataPoints = allTimestamps.map(timestamp => {
          const point = line.data.find(p => p.timestamp === timestamp)
          return {
            x: timestamp,
            y: point?.value || 0
          }
        })

        return {
          label: line.label,
          data: dataPoints,
          borderColor: colors.line,
          backgroundColor: line.fill ? colors.background : colors.line,
          fill: line.fill || false,
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: colors.point,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: showPoints ? 4 : 0,
          pointHoverRadius: showPoints ? 6 : 4,
          pointHoverBackgroundColor: colors.point,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2
        }
      })

    return {
      datasets
    }
  }, [lines, showPoints])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      legend: {
        display: showLegend,
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
              const timestamp = context[0].parsed.x
              try {
                return format(parseISO(timestamp.toString()), timeFormat)
              } catch {
                return timestamp.toString()
              }
            }
            return ''
          },
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatNumber(value)}`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        display: true,
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'normal' as const
          }
        },
        grid: {
          display: showGrid,
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
        stacked: stacked,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          font: {
            size: 12,
            weight: 'normal' as const
          }
        },
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(tickValue: string | number) {
            return formatNumber(Number(tickValue))
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
  }), [title, showLegend, showGrid, timeFormat, yAxisLabel, stacked])

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && <Skeleton className="h-6 w-48" />}
        <Skeleton className={`w-full h-[${height}px]`} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load chart data: {error}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!lines.length || !chartData) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <div 
          className="flex items-center justify-center text-muted-foreground"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)} role="img" aria-label={title || 'Time series chart'} data-testid={testId || 'timeseries-chart'}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* Chart metadata */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{lines.filter(l => !l.hidden).length} series</span>
          <span>•</span>
          <span>
            {lines.reduce((acc, line) => 
              acc + (line.hidden ? 0 : line.data.length), 0
            )} data points
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Updated: {format(new Date(), 'HH:mm')}</span>
        </div>
      </div>
    </div>
  )
}