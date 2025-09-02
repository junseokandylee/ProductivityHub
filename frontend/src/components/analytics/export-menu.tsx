'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { Download, FileText, Printer, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import type { AnalyticsFilters } from '@/hooks/use-analytics-filters'

interface ExportMenuProps {
  filters: AnalyticsFilters
  className?: string
  disabled?: boolean
}

export function ExportMenu({ filters, className, disabled }: ExportMenuProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState<string | null>(null)

  const formatDateForUrl = (date: Date) => {
    return format(date, 'yyyy-MM-dd')
  }

  const buildExportParams = () => {
    const params = new URLSearchParams()
    
    if (filters.scope === 'campaign' && filters.campaignId) {
      params.set('scope', 'campaign')
      params.set('campaignId', filters.campaignId)
    } else {
      params.set('scope', 'global')
    }
    
    params.set('startDate', formatDateForUrl(filters.from))
    params.set('endDate', formatDateForUrl(filters.to))
    
    if (filters.channels.length > 0) {
      params.set('channels', filters.channels.join(','))
    }
    
    params.set('includeTimeSeries', 'true')
    params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    
    return params
  }

  const handleCsvExport = async () => {
    setIsExporting('csv')
    
    try {
      const params = buildExportParams()
      const response = await fetch(`/api/analytics/export.csv?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`)
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm')
      const scope = filters.scope === 'campaign' ? `campaign-${filters.campaignId}` : 'global'
      link.download = `analytics-${scope}-${timestamp}.csv`
      
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export successful",
        description: "Analytics data has been downloaded as CSV file.",
      })
    } catch (error) {
      console.error('CSV export failed:', error)
      toast({
        title: "Export failed",
        description: "Failed to export analytics data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(null)
    }
  }

  const handlePdfExport = () => {
    setIsExporting('pdf')
    
    try {
      const params = buildExportParams()
      
      // Determine the correct print URL based on scope
      const printUrl = filters.scope === 'campaign' && filters.campaignId
        ? `/campaigns/${filters.campaignId}/analytics/print?${params.toString()}`
        : `/analytics/print?${params.toString()}`
      
      // Open print page in new window
      const printWindow = window.open(printUrl, '_blank', 'width=1200,height=800')
      
      if (!printWindow) {
        throw new Error('Popup blocked - please allow popups for this site')
      }

      // Wait for the page to load, then trigger print dialog
      printWindow.addEventListener('load', () => {
        // Give components time to render
        setTimeout(() => {
          printWindow.print()
        }, 2000)
      })

      toast({
        title: "Generating PDF",
        description: "Print dialog will open when the report is ready.",
      })
    } catch (error) {
      console.error('PDF export failed:', error)
      toast({
        title: "PDF export failed",
        description: "Failed to open print dialog. Please check popup settings.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(null)
    }
  }

  const isDisabled = disabled || isExporting !== null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={className}
          disabled={isDisabled}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleCsvExport}
          disabled={isDisabled}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Download CSV</span>
            <span className="text-xs text-muted-foreground">
              Spreadsheet data
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handlePdfExport}
          disabled={isDisabled}
          className="cursor-pointer"
        >
          <Printer className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Print / Save PDF</span>
            <span className="text-xs text-muted-foreground">
              Formatted report
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}