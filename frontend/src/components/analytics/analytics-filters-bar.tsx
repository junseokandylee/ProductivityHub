'use client'

import { useState } from 'react'
import { CalendarIcon, RefreshCw, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

interface AnalyticsFiltersBarProps {
  filters: AnalyticsFilters
  onFilterChange: <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => void
  onReset: () => void
  isLoading?: boolean
  onRefresh?: () => void
  showScopeSelector?: boolean
}

const CHANNEL_OPTIONS = [
  { value: 'sms', label: 'SMS', color: 'bg-blue-500' },
  { value: 'kakao', label: 'KakaoTalk', color: 'bg-yellow-500' }
]

const INTERVAL_OPTIONS = [
  { value: '5m', label: '5 minutes', description: 'Up to 24 hours' },
  { value: '1h', label: 'Hourly', description: 'Up to 30 days' },
  { value: '1d', label: 'Daily', description: 'Up to 1 year' }
]

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' }
]

export function AnalyticsFiltersBar({ 
  filters, 
  onFilterChange, 
  onReset, 
  isLoading,
  onRefresh,
  showScopeSelector = true
}: AnalyticsFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleChannelChange = (channel: string, checked: boolean) => {
    const newChannels = checked
      ? [...filters.channels, channel]
      : filters.channels.filter(c => c !== channel)
    onFilterChange('channels', newChannels)
  }

  const handleDatePreset = (preset: string) => {
    const now = new Date()
    let from: Date
    const to = now

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        return
    }

    onFilterChange('from', from)
    onFilterChange('to', to)
  }

  const activeFiltersCount = [
    filters.channels.length > 0,
    filters.scope === 'campaign',
    filters.interval !== '1h',
    filters.conversionModel !== 'stepwise'
  ].filter(Boolean).length

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Main Filter Row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Date Range:</Label>
            <div className="flex gap-1">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset(preset.value)}
                  className="h-8"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 justify-start text-left font-normal",
                    !filters.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filters.from ? format(filters.from, "MMM dd") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.from}
                  onSelect={(date) => date && onFilterChange('from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 justify-start text-left font-normal",
                    !filters.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filters.to ? format(filters.to, "MMM dd") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.to}
                  onSelect={(date) => date && onFilterChange('to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Interval */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Interval:</Label>
            <Select value={filters.interval} onValueChange={(value) => onFilterChange('interval', value as any)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* More Filters Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8"
          >
            <Filter className="mr-2 h-3 w-3" />
            More Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          )}

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Reset
          </Button>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Channels */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Channels</Label>
                <div className="space-y-2">
                  {CHANNEL_OPTIONS.map((channel) => (
                    <div key={channel.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={channel.value}
                        checked={filters.channels.includes(channel.value)}
                        onCheckedChange={(checked) => 
                          handleChannelChange(channel.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={channel.value} className="flex items-center gap-2 text-sm">
                        <div className={cn("w-2 h-2 rounded-full", channel.color)} />
                        {channel.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope */}
              {showScopeSelector && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Scope</Label>
                  <Select value={filters.scope} onValueChange={(value) => onFilterChange('scope', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global Analytics</SelectItem>
                      <SelectItem value="campaign">Campaign Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Conversion Model */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Conversion Model</Label>
                <Select 
                  value={filters.conversionModel} 
                  onValueChange={(value) => onFilterChange('conversionModel', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stepwise">Stepwise Conversion</SelectItem>
                    <SelectItem value="absolute">Absolute from Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Active Filters Summary */}
        {(filters.channels.length > 0 || filters.scope === 'campaign') && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Label className="text-xs font-medium text-muted-foreground">Active Filters:</Label>
            
            {filters.channels.map((channel) => {
              const channelConfig = CHANNEL_OPTIONS.find(c => c.value === channel)
              return (
                <Badge key={channel} variant="secondary" className="text-xs">
                  <div className={cn("w-2 h-2 rounded-full mr-1", channelConfig?.color)} />
                  {channelConfig?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleChannelChange(channel, false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}

            {filters.scope === 'campaign' && (
              <Badge variant="secondary" className="text-xs">
                Campaign Scope
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => onFilterChange('scope', 'global')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}