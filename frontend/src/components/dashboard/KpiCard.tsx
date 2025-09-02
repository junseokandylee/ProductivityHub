'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KpiData } from '@/lib/types/campaign-metrics'

interface KpiCardProps extends Omit<KpiData, 'value'> {
  value: number | string
  className?: string
  isLoading?: boolean
}

export function KpiCard({
  label,
  value,
  rate,
  delta,
  tone = 'default',
  format = 'number',
  tooltip,
  className,
  isLoading = false
}: KpiCardProps) {
  // Format the main value based on type
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'percentage':
        return new Intl.NumberFormat('ko-KR', {
          style: 'percent',
          maximumFractionDigits: 2
        }).format(val)
      case 'currency':
        return new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW',
          maximumFractionDigits: 0
        }).format(val)
      default:
        return new Intl.NumberFormat('ko-KR').format(val)
    }
  }

  // Format rate as percentage
  const formatRate = (rate: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'percent',
      maximumFractionDigits: 1
    }).format(rate)
  }

  // Format delta with appropriate sign
  const formatDelta = (delta: number): string => {
    const sign = delta > 0 ? '+' : ''
    return `${sign}${new Intl.NumberFormat('ko-KR').format(delta)}`
  }

  // Determine colors based on tone
  const getToneStyles = (tone: KpiData['tone']) => {
    switch (tone) {
      case 'success':
        return {
          text: 'text-green-900',
          bg: 'bg-green-50',
          border: 'border-green-200',
          accent: 'text-green-600'
        }
      case 'warning':
        return {
          text: 'text-yellow-900',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          accent: 'text-yellow-600'
        }
      case 'destructive':
        return {
          text: 'text-red-900',
          bg: 'bg-red-50',
          border: 'border-red-200',
          accent: 'text-red-600'
        }
      default:
        return {
          text: 'text-gray-900',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          accent: 'text-gray-600'
        }
    }
  }

  const toneStyles = getToneStyles(tone)

  if (isLoading) {
    return (
      <Card className={cn('relative', className)}>
        <CardHeader className="pb-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        'relative transition-colors hover:shadow-md',
        toneStyles.bg,
        toneStyles.border,
        className
      )}
      title={tooltip}
      role="img"
      aria-label={`${label}: ${formatValue(value)}${rate !== undefined ? ` (${formatRate(rate)})` : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className={cn('text-sm font-medium tracking-tight', toneStyles.text)}>
            {label}
          </h3>
          {delta !== undefined && (
            <Badge 
              variant={delta > 0 ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                delta > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              )}
            >
              {formatDelta(delta)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          <div className={cn('text-2xl font-bold tabular-nums', toneStyles.text)}>
            {formatValue(value)}
          </div>
          {rate !== undefined && (
            <div className={cn('text-xs text-muted-foreground', toneStyles.accent)}>
              {formatRate(rate)} success rate
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default KpiCard