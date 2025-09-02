'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Crown, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPValue, getSignificanceLabel, type StatisticalTest } from '@/lib/utils/ab-test-statistics'

interface WinnerBadgeProps {
  /** Statistical test result */
  test: StatisticalTest
  /** Type of winner badge */
  variant?: 'winner' | 'loser' | 'neutral' | 'control'
  /** Show detailed tooltip */
  showTooltip?: boolean
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Icon variant */
  iconVariant?: 'crown' | 'trend' | 'none'
}

export function WinnerBadge({ 
  test, 
  variant = 'neutral',
  showTooltip = true,
  className,
  size = 'md',
  iconVariant = 'trend'
}: WinnerBadgeProps) {
  const significance = getSignificanceLabel(test.pValue)
  const isSignificant = test.isSignificant
  const lift = test.liftPercentage

  // Determine badge variant and styling
  const getBadgeConfig = () => {
    if (variant === 'control') {
      return {
        variant: 'outline' as const,
        text: 'Control',
        icon: null,
        className: 'border-blue-300 text-blue-700 bg-blue-50'
      }
    }

    if (!isSignificant) {
      return {
        variant: 'outline' as const,
        text: 'Not Significant',
        icon: iconVariant === 'trend' ? <Minus className="h-3 w-3" /> : null,
        className: 'border-gray-300 text-gray-600 bg-gray-50'
      }
    }

    if (lift > 0) {
      const winnerText = variant === 'winner' ? 'Winner' : 'Positive'
      return {
        variant: 'outline' as const,
        text: winnerText,
        icon: iconVariant === 'crown' ? <Crown className="h-3 w-3" /> : 
              iconVariant === 'trend' ? <TrendingUp className="h-3 w-3" /> : null,
        className: cn(
          'border-green-300 text-green-700 bg-green-50',
          significance.level === 'highly-significant' && 'border-green-400 text-green-800 bg-green-100'
        )
      }
    } else {
      const loserText = variant === 'loser' ? 'Loser' : 'Negative'
      return {
        variant: 'outline' as const,
        text: loserText,
        icon: iconVariant === 'crown' ? null : 
              iconVariant === 'trend' ? <TrendingDown className="h-3 w-3" /> : null,
        className: cn(
          'border-red-300 text-red-700 bg-red-50',
          significance.level === 'highly-significant' && 'border-red-400 text-red-800 bg-red-100'
        )
      }
    }
  }

  const badgeConfig = getBadgeConfig()

  // Size-based styling
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 h-5',
    md: 'text-xs px-2 py-1 h-6',
    lg: 'text-sm px-3 py-1.5 h-8'
  }

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <div className="font-medium text-sm">
        {significance.label} Result
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>P-value:</span>
          <span className="font-mono">{formatPValue(test.pValue)}</span>
        </div>
        <div className="flex justify-between">
          <span>Z-score:</span>
          <span className="font-mono">{test.zScore.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Lift:</span>
          <span className={cn(
            "font-mono",
            lift > 0 ? "text-green-600" : lift < 0 ? "text-red-600" : "text-gray-500"
          )}>
            {lift >= 0 ? '+' : ''}{lift.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Confidence:</span>
          <span className="font-mono">{(test.confidenceLevel * 100).toFixed(0)}%</span>
        </div>
      </div>

      {isSignificant && (
        <div className="pt-1 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            This result is statistically significant at the {(test.confidenceLevel * 100).toFixed(0)}% confidence level.
          </div>
        </div>
      )}

      {!isSignificant && (
        <div className="pt-1 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            This difference could be due to random variation. Consider running the test longer.
          </div>
        </div>
      )}
    </div>
  )

  const badge = (
    <Badge
      variant={badgeConfig.variant}
      className={cn(
        'inline-flex items-center gap-1',
        sizeClasses[size],
        badgeConfig.className,
        className
      )}
    >
      {badgeConfig.icon}
      <span>{badgeConfig.text}</span>
      {isSignificant && (
        <div className="flex items-center">
          <div className="w-1 h-1 rounded-full bg-current ml-1" />
        </div>
      )}
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" align="center" sideOffset={4}>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Convenience components for specific use cases
export function WinnerCrown({ test, showTooltip = true, className }: Pick<WinnerBadgeProps, 'test' | 'showTooltip' | 'className'>) {
  if (!test.isSignificant || test.lift <= 0) return null
  
  return (
    <WinnerBadge 
      test={test}
      variant="winner"
      iconVariant="crown"
      showTooltip={showTooltip}
      className={className}
    />
  )
}

export function SignificanceBadge({ test, showTooltip = true, className }: Pick<WinnerBadgeProps, 'test' | 'showTooltip' | 'className'>) {
  return (
    <WinnerBadge 
      test={test}
      variant={test.lift > 0 ? 'winner' : test.lift < 0 ? 'loser' : 'neutral'}
      iconVariant="trend"
      showTooltip={showTooltip}
      className={className}
    />
  )
}

export function ControlBadge({ className }: { className?: string }) {
  const dummyTest: StatisticalTest = {
    zScore: 0,
    pValue: 1,
    isSignificant: false,
    confidenceLevel: 0.95,
    lift: 0,
    liftPercentage: 0
  }

  return (
    <WinnerBadge 
      test={dummyTest}
      variant="control"
      iconVariant="none"
      showTooltip={false}
      className={className}
    />
  )
}

// Compact inline badge for tables
export function InlineSignificanceBadge({ 
  test, 
  showLabel = false,
  className 
}: { 
  test: StatisticalTest
  showLabel?: boolean
  className?: string 
}) {
  if (!test.isSignificant) return null

  const significance = getSignificanceLabel(test.pValue)
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs px-1 py-0 h-4',
        significance.color,
        className
      )}
    >
      ✓{showLabel && ` ${significance.label}`}
    </Badge>
  )
}