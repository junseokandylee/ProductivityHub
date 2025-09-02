'use client'

import { useMemo } from 'react'
import { ChevronDown, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface FunnelStage {
  id: string
  label: string
  value: number
  color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral'
  description?: string
}

export interface FunnelChartProps {
  stages: FunnelStage[]
  title?: string
  height?: number
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  showConversionRates?: boolean
  showDropoffRates?: boolean
  orientation?: 'vertical' | 'horizontal'
  className?: string
  testId?: string
}

const stageColors = {
  baseline: {
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-700',
    hover: 'hover:bg-slate-200'
  },
  conversion: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300', 
    text: 'text-emerald-700',
    hover: 'hover:bg-emerald-200'
  },
  open: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-200'
  },
  click: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-700',
    hover: 'hover:bg-amber-200'
  },
  neutral: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    hover: 'hover:bg-gray-200'
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

function calculateConversionRate(current: number, previous: number): number {
  if (previous === 0) return 0
  return (current / previous) * 100
}

function calculateDropoffRate(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((previous - current) / previous) * 100
}

function FunnelStageVertical({
  stage,
  index,
  isFirst,
  isLast,
  maxValue,
  previousValue,
  showConversionRates,
  showDropoffRates
}: {
  stage: FunnelStage
  index: number
  isFirst: boolean
  isLast: boolean
  maxValue: number
  previousValue?: number
  showConversionRates?: boolean
  showDropoffRates?: boolean
}) {
  const colors = stageColors[stage.color]
  const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
  const conversionRate = previousValue ? calculateConversionRate(stage.value, previousValue) : 100
  const dropoffRate = previousValue ? calculateDropoffRate(stage.value, previousValue) : 0

  return (
    <div className="space-y-2" role="listitem">
      {/* Stage bar */}
      <div className="relative">
        <div
          className={cn(
            "mx-auto border-2 rounded-lg p-4 transition-all duration-300",
            colors.bg,
            colors.border,
            colors.hover,
            "cursor-default"
          )}
          style={{ 
            width: `${Math.max(widthPercent, 20)}%`,
            minWidth: '200px'
          }}
          role="region"
          aria-label={`${stage.label}: ${formatNumber(stage.value)}`}
        >
          <div className="text-center">
            <h4 className={cn("font-semibold text-sm", colors.text)}>
              {stage.label}
            </h4>
            <p className={cn("text-2xl font-bold mt-1", colors.text)}>
              {formatNumber(stage.value)}
            </p>
            {stage.description && (
              <p className="text-xs text-gray-600 mt-1">{stage.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Conversion metrics */}
      {!isFirst && (showConversionRates || showDropoffRates) && (
        <div className="flex justify-center items-center gap-4 text-sm">
          {showConversionRates && (
            <Badge 
              variant="outline" 
              className="text-emerald-700 border-emerald-300 bg-emerald-50"
            >
              {conversionRate.toFixed(1)}% conversion
            </Badge>
          )}
          {showDropoffRates && dropoffRate > 0 && (
            <Badge 
              variant="outline" 
              className="text-red-700 border-red-300 bg-red-50"
            >
              <TrendingDown className="h-3 w-3 mr-1" />
              {dropoffRate.toFixed(1)}% dropoff
            </Badge>
          )}
        </div>
      )}

      {/* Connector arrow */}
      {!isLast && (
        <div className="flex justify-center py-2">
          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

function FunnelStageHorizontal({
  stage,
  index,
  isFirst,
  isLast,
  maxValue,
  previousValue,
  showConversionRates,
  showDropoffRates
}: {
  stage: FunnelStage
  index: number
  isFirst: boolean
  isLast: boolean
  maxValue: number
  previousValue?: number
  showConversionRates?: boolean
  showDropoffRates?: boolean
}) {
  const colors = stageColors[stage.color]
  const heightPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
  const conversionRate = previousValue ? calculateConversionRate(stage.value, previousValue) : 100
  const dropoffRate = previousValue ? calculateDropoffRate(stage.value, previousValue) : 0

  return (
    <div className="flex flex-col items-center space-y-2" role="listitem">
      {/* Stage bar */}
      <div className="relative flex-1 w-full">
        <div
          className={cn(
            "border-2 rounded-lg p-3 transition-all duration-300 w-full",
            colors.bg,
            colors.border,
            colors.hover,
            "cursor-default flex flex-col justify-center"
          )}
          style={{ 
            height: `${Math.max(heightPercent, 20)}%`,
            minHeight: '80px'
          }}
          role="region"
          aria-label={`${stage.label}: ${formatNumber(stage.value)}`}
        >
          <div className="text-center">
            <h4 className={cn("font-semibold text-xs", colors.text)}>
              {stage.label}
            </h4>
            <p className={cn("text-lg font-bold mt-1", colors.text)}>
              {formatNumber(stage.value)}
            </p>
          </div>
        </div>
      </div>

      {/* Conversion metrics */}
      {!isFirst && (showConversionRates || showDropoffRates) && (
        <div className="flex flex-col items-center gap-1 text-xs min-h-[60px]">
          {showConversionRates && (
            <Badge 
              variant="outline" 
              className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs px-1 py-0"
            >
              {conversionRate.toFixed(1)}%
            </Badge>
          )}
          {showDropoffRates && dropoffRate > 0 && (
            <Badge 
              variant="outline" 
              className="text-red-700 border-red-300 bg-red-50 text-xs px-1 py-0"
            >
              -{dropoffRate.toFixed(1)}%
            </Badge>
          )}
        </div>
      )}

      {/* Stage description */}
      {stage.description && (
        <p className="text-xs text-gray-600 text-center max-w-[80px] line-clamp-2">
          {stage.description}
        </p>
      )}
    </div>
  )
}

export function FunnelChart({
  stages,
  title,
  height = 400,
  isLoading = false,
  error,
  onRetry,
  showConversionRates = true,
  showDropoffRates = true,
  orientation = 'vertical',
  className,
  testId
}: FunnelChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...stages.map(stage => stage.value))
  }, [stages])

  const totalConversionRate = useMemo(() => {
    if (stages.length < 2) return 0
    const first = stages[0]?.value || 0
    const last = stages[stages.length - 1]?.value || 0
    return first > 0 ? (last / first) * 100 : 0
  }, [stages])

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && <Skeleton className="h-6 w-48" />}
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-center">
              <Skeleton className={`h-16 w-${80 - i * 10} rounded-lg`} />
            </div>
          ))}
        </div>
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
            <span>Failed to load funnel data: {error}</span>
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

  if (!stages.length) {
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
            <p className="text-lg font-medium">No funnel data available</p>
            <p className="text-sm">No stages to display</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn("space-y-4", className)}
      role="img"
      aria-label={title || 'Conversion funnel chart'}
      data-testid={testId || 'funnel-chart'}
    >
      {/* Header */}
      <div className="space-y-2">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        
        {/* Summary metrics */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{stages.length} stages</span>
          <span>•</span>
          <span>
            Total conversion: {totalConversionRate.toFixed(1)}%
          </span>
          <span>•</span>
          <span>
            Top of funnel: {formatNumber(stages[0]?.value || 0)}
          </span>
        </div>
      </div>

      {/* Funnel visualization */}
      <div 
        style={{ height: `${height}px` }}
        className={cn(
          "relative",
          orientation === 'horizontal' 
            ? "flex items-end justify-center gap-4 overflow-x-auto pb-4" 
            : "flex flex-col justify-center"
        )}
        role="list"
        aria-label="Funnel stages"
      >
        {stages.map((stage, index) => {
          const isFirst = index === 0
          const isLast = index === stages.length - 1
          const previousValue = isFirst ? undefined : stages[index - 1]?.value

          return orientation === 'horizontal' ? (
            <FunnelStageHorizontal
              key={stage.id}
              stage={stage}
              index={index}
              isFirst={isFirst}
              isLast={isLast}
              maxValue={maxValue}
              previousValue={previousValue}
              showConversionRates={showConversionRates}
              showDropoffRates={showDropoffRates}
            />
          ) : (
            <FunnelStageVertical
              key={stage.id}
              stage={stage}
              index={index}
              isFirst={isFirst}
              isLast={isLast}
              maxValue={maxValue}
              previousValue={previousValue}
              showConversionRates={showConversionRates}
              showDropoffRates={showDropoffRates}
            />
          )
        })}
      </div>
    </div>
  )
}