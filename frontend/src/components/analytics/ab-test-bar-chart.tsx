'use client'

import React, { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  analyzeAbTest,
  formatPValue,
  getSignificanceLabel,
  type AbVariant,
  type AbTestResult
} from '@/lib/utils/ab-test-statistics'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface AbTestBarChartProps {
  variants: AbVariant[]
  primaryMetric?: 'delivery' | 'openRate' | 'clickRate' | 'conversion'
  metric?: 'all' | 'delivery' | 'openRate' | 'clickRate' | 'conversion'
  showLift?: boolean
  height?: number
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  className?: string
}

// Colorblind-safe palette optimized for data visualization
const COLORBLIND_SAFE_COLORS = {
  primary: '#2563EB',     // blue - control
  success: '#059669',     // green - positive lift  
  warning: '#D97706',     // orange - negative lift
  neutral: '#6B7280',     // gray - neutral
  accent: '#7C3AED'       // purple - highlight
}

const METRIC_COLORS = {
  delivery: COLORBLIND_SAFE_COLORS.primary,
  openRate: COLORBLIND_SAFE_COLORS.success, 
  clickRate: COLORBLIND_SAFE_COLORS.accent,
  conversion: COLORBLIND_SAFE_COLORS.warning
}

export function AbTestBarChart({ 
  variants, 
  primaryMetric = 'clickRate',
  metric = 'all',
  showLift = true,
  height = 400,
  isLoading, 
  error, 
  onRefresh,
  className 
}: AbTestBarChartProps) {
  const chartData = useMemo(() => {
    if (!variants || variants.length < 2) return null

    const [control, ...testVariants] = variants
    const analyses = testVariants.map(test => 
      analyzeAbTest(control, test, primaryMetric)
    )

    // Determine which metrics to show
    const metricsToShow = metric === 'all' 
      ? ['delivery', 'openRate', 'clickRate'] 
      : [metric]

    const labels = variants.map(v => v.name)

    const datasets = metricsToShow.map((metricKey) => {
      const metricName = {
        delivery: 'Delivery Rate',
        openRate: 'Open Rate', 
        clickRate: 'Click Rate',
        conversion: 'Conversion Rate'
      }[metricKey]

      const data = variants.map(variant => {
        const rate = variant[`${metricKey}Rate` as keyof AbVariant] as number
        return showLift ? rate * 100 : rate * 100 // Show as percentage
      })

      return {
        label: metricName,
        data,
        backgroundColor: variants.map((variant, index) => {
          const baseColor = METRIC_COLORS[metricKey as keyof typeof METRIC_COLORS]
          
          if (index === 0) {
            // Control variant - use base color
            return baseColor + '90' // 90% opacity
          }

          // Test variant - check if it's a winner
          const analysis = analyses[index - 1]
          const metricTest = analysis[`${metricKey}Test` as keyof AbTestResult] as any
          
          if (metricTest?.isSignificant) {
            return metricTest.lift > 0 
              ? COLORBLIND_SAFE_COLORS.success + '90'  // Winner - green
              : COLORBLIND_SAFE_COLORS.warning + '90'  // Loser - orange
          }
          
          return baseColor + '60' // Not significant - muted
        }),
        borderColor: variants.map((variant, index) => {
          const baseColor = METRIC_COLORS[metricKey as keyof typeof METRIC_COLORS]
          
          if (index === 0) {
            return baseColor
          }

          const analysis = analyses[index - 1]
          const metricTest = analysis[`${metricKey}Test` as keyof AbTestResult] as any
          
          if (metricTest?.isSignificant) {
            return metricTest.lift > 0 
              ? COLORBLIND_SAFE_COLORS.success 
              : COLORBLIND_SAFE_COLORS.warning
          }
          
          return baseColor
        }),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false
      }
    })

    return { labels, datasets }
  }, [variants, primaryMetric, metric, showLift])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
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
      title: {
        display: true,
        text: metric === 'all' ? 'A/B Test Performance Comparison' : 
              `${metric.charAt(0).toUpperCase() + metric.slice(1)} Rate Comparison`,
        font: {
          size: 16,
          weight: 'bold' as const
        },
        padding: {
          bottom: 20
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
          afterLabel: (context: TooltipItem<'bar'>) => {
            const variantIndex = context.dataIndex
            const datasetIndex = context.datasetIndex
            
            if (variantIndex === 0) {
              return 'Control (Baseline)'
            }

            const metricKey = metric === 'all' 
              ? ['delivery', 'openRate', 'clickRate'][datasetIndex]
              : metric

            const testVariantIndex = variantIndex - 1
            const analyses = variants.slice(1).map(test => 
              analyzeAbTest(variants[0], test, primaryMetric)
            )
            
            if (analyses[testVariantIndex]) {
              const analysis = analyses[testVariantIndex]
              const metricTest = analysis[`${metricKey}Test` as keyof AbTestResult] as any
              
              if (metricTest) {
                const lift = metricTest.liftPercentage.toFixed(1)
                const pValue = formatPValue(metricTest.pValue)
                const significance = metricTest.isSignificant ? '✓ Significant' : '✗ Not Significant'
                
                return [
                  `Lift: ${lift >= 0 ? '+' : ''}${lift}%`,
                  `P-value: ${pValue}`,
                  significance
                ]
              }
            }
            
            return ''
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: 'normal' as const
          }
        }
      },
      y: {
        beginAtZero: true,
        max: showLift ? 100 : undefined,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            return `${value}%`
          }
        },
        title: {
          display: true,
          text: 'Rate (%)',
          font: {
            size: 12,
            weight: 'normal' as const
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    animation: {
      duration: 750,
      easing: 'easeInOutCubic' as const
    }
  }), [metric, showLift, primaryMetric, variants])

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
        <div className="flex justify-center space-x-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-18" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className={cn("border-red-200", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load A/B test data</span>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (!variants || variants.length < 2) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground", className)} 
           style={{ height: `${height}px` }}>
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No A/B test data available</p>
          <p className="text-sm">Need at least 2 variants to compare</p>
        </div>
      </div>
    )
  }

  if (!chartData) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div style={{ height: `${height}px` }} className="relative" role="img" aria-label="A/B test performance bar chart showing conversion rates and statistical significance">
        <Bar data={chartData} options={chartOptions} />
      </div>
      
      {/* Legend for significance indicators */}
      <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORBLIND_SAFE_COLORS.success + '90' }} />
          <span>Significant Winner</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORBLIND_SAFE_COLORS.warning + '90' }} />
          <span>Significant Loser</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORBLIND_SAFE_COLORS.neutral + '60' }} />
          <span>Not Significant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORBLIND_SAFE_COLORS.primary + '90' }} />
          <span>Control Baseline</span>
        </div>
      </div>
    </div>
  )
}