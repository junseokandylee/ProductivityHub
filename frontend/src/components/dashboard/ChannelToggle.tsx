'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ChannelFilter, CHANNEL_FILTER_OPTIONS } from '@/lib/types/campaign-metrics'

interface ChannelToggleProps {
  value: ChannelFilter
  onChange: (value: ChannelFilter) => void
  className?: string
}

export function ChannelToggle({ value, onChange, className }: ChannelToggleProps) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <span className="text-sm font-medium text-gray-700 mr-2">Channel:</span>
      <div 
        className="inline-flex items-center rounded-lg bg-gray-100 p-1"
        role="radiogroup" 
        aria-label="Select channel filter"
      >
        {CHANNEL_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              value === option.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ChannelToggle