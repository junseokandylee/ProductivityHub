'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { TimeWindow, TIME_WINDOW_OPTIONS } from '@/lib/types/campaign-metrics'

interface TimespanSelectProps {
  value: TimeWindow
  onChange: (value: TimeWindow) => void
  className?: string
}

export function TimespanSelect({ value, onChange, className }: TimespanSelectProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-sm font-medium text-gray-700">Time Window:</span>
      <Select 
        value={value.toString()} 
        onValueChange={(val) => onChange(Number(val) as TimeWindow)}
        aria-label="Select time window for metrics"
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select window" />
        </SelectTrigger>
        <SelectContent>
          {TIME_WINDOW_OPTIONS.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value.toString()}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default TimespanSelect