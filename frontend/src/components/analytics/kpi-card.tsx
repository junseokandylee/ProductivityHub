'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  label: string
  value: string | number
  deltaPct?: number
  color: 'baseline' | 'conversion' | 'open' | 'click' | 'neutral'
  tooltip?: string
  icon?: React.ComponentType<{ className?: string }>
  isLoading?: boolean
  error?: boolean
  subtitle?: string
  formatter?: (value: number) => string
  testId?: string
}

const colorClasses = {
  baseline: 'text-slate-700 bg-slate-50 border-slate-200',
  conversion: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  open: 'text-blue-700 bg-blue-50 border-blue-200',
  click: 'text-amber-700 bg-amber-50 border-amber-200',
  neutral: 'text-gray-700 bg-gray-50 border-gray-200'
}

const iconBgClasses = {
  baseline: 'bg-slate-100 text-slate-600',
  conversion: 'bg-emerald-100 text-emerald-600',
  open: 'bg-blue-100 text-blue-600',
  click: 'bg-amber-100 text-amber-600',
  neutral: 'bg-gray-100 text-gray-600'
}

const trendColors = {
  positive: 'text-emerald-600 border-emerald-300 bg-emerald-50',
  negative: 'text-red-600 border-red-300 bg-red-50',
  neutral: 'text-gray-600 border-gray-300 bg-gray-50'
}

function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) return value.toString()
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  
  return num.toLocaleString()
}

function getTrendDirection(deltaPct?: number): 'up' | 'down' | 'neutral' {
  if (!deltaPct || deltaPct === 0) return 'neutral'
  return deltaPct > 0 ? 'up' : 'down'
}

function getTrendColor(deltaPct?: number, isPositiveGood = true): 'positive' | 'negative' | 'neutral' {
  if (!deltaPct || deltaPct === 0) return 'neutral'
  
  const isPositive = deltaPct > 0
  if (isPositiveGood) {
    return isPositive ? 'positive' : 'negative'
  } else {
    return isPositive ? 'negative' : 'positive'
  }
}

export function KpiCard({
  label,
  value,
  deltaPct,
  color,
  tooltip,
  icon: Icon,
  isLoading = false,
  error = false,
  subtitle,
  formatter,
  testId
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6" data-testid={testId || `kpi-${label.replace(/\s+/g, '-').toLowerCase()}-loading`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50" data-testid={testId || `kpi-${label.replace(/\s+/g, '-').toLowerCase()}-error`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-red-800" role="alert">{label}</p>
              <p className="text-sm text-red-600">Error loading data</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Minus className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const trendDirection = getTrendDirection(deltaPct)
  const trendColor = getTrendColor(deltaPct)
  const TrendIcon = trendDirection === 'up' ? TrendingUp : 
                   trendDirection === 'down' ? TrendingDown : Minus

  const formattedValue = formatter ? formatter(Number(value)) : formatNumber(value)
  const cardContent = (
    <Card 
      className={cn(
        "p-6 transition-all hover:shadow-md",
        colorClasses[color]
      )}
      role="region"
      aria-label={`${label} metric`}
      data-testid={testId || `kpi-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-gray-700" id={`label-${label.replace(/\s+/g, '-').toLowerCase()}`}>
              {label}
            </p>
            <p 
              className="text-2xl font-bold"
              aria-labelledby={`label-${label.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {formattedValue}
            </p>
          </div>
          
          {Icon && (
            <div className={cn("p-3 rounded-full", iconBgClasses[color])}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          
          {deltaPct !== undefined && deltaPct !== null && (
            <Badge 
              variant="outline"
              className={cn("text-xs px-2 py-1", trendColors[trendColor])}
              aria-label={`Trend: ${deltaPct > 0 ? 'increased' : 'decreased'} by ${Math.abs(deltaPct)}%`}
            >
              <TrendIcon className="h-3 w-3 mr-1" aria-hidden="true" />
              {Math.abs(deltaPct).toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardContent
}

export function KpiCardGroup({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div 
      className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}
      role="group"
      aria-label="Key performance indicators"
    >
      {children}
    </div>
  )
}