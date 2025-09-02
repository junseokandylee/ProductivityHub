'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { GlobalKpiCards } from '@/components/analytics/global-kpi-cards'
import { GlobalTimeSeriesChart } from '@/components/analytics/global-timeseries-chart'
import { GlobalFunnelChart } from '@/components/analytics/global-funnel-chart'
import { QuotaProgressCard } from '@/components/analytics/quota-progress-card'
import { CostByChannelChart } from '@/components/analytics/cost-by-channel-chart'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { formatDistanceToNow } from 'date-fns'

export default function AnalyticsPrintPage() {
  const searchParams = useSearchParams()
  const { filters } = useAnalyticsFilters()
  const [isReady, setIsReady] = useState(false)

  // Parse URL parameters for filters
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const channels = searchParams.get('channels')
  
  const printFilters = {
    ...filters,
    from: startDate ? new Date(startDate) : filters.from,
    to: endDate ? new Date(endDate) : filters.to,
    channels: channels ? channels.split(',') : filters.channels
  }

  useEffect(() => {
    // Wait for all components to load before marking as ready for print
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Apply print styles
    document.body.classList.add('print-mode')
    
    return () => {
      document.body.classList.remove('print-mode')
    }
  }, [])

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          .print-page-break {
            page-break-before: always;
          }
          
          .print-no-break {
            page-break-inside: avoid;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            font-size: 12px;
            line-height: 1.4;
          }
          
          h1 { font-size: 18px; }
          h2 { font-size: 16px; }
          h3 { font-size: 14px; }
          
          .chart-container {
            height: 300px !important;
          }
          
          .grid {
            display: grid !important;
          }
        }
        
        .print-mode {
          background: white !important;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        }
        
        .print-footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #ddd;
        }
        
        .print-section {
          margin-bottom: 2rem;
        }
        
        .print-section-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 0.5rem;
        }
      `}</style>

      <div className="min-h-screen bg-white p-8 text-black">
        {/* Print Header */}
        <div className="print-header print-no-break">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Report</h1>
          <div className="mt-2 text-sm text-gray-600">
            <p>Generated on: {new Date().toLocaleString()}</p>
            <p>
              Date Range: {printFilters.from.toLocaleDateString()} - {printFilters.to.toLocaleDateString()}
            </p>
            {printFilters.channels.length > 0 && (
              <p>Channels: {printFilters.channels.join(', ')}</p>
            )}
          </div>
        </div>

        {/* KPI Summary */}
        <div className="print-section print-no-break">
          <h2 className="print-section-title">Key Performance Indicators</h2>
          <GlobalKpiCards filters={printFilters} />
        </div>

        {/* Performance Chart */}
        <div className="print-section print-page-break">
          <h2 className="print-section-title">Performance Over Time</h2>
          <div className="chart-container">
            <GlobalTimeSeriesChart filters={printFilters} height={300} />
          </div>
        </div>

        {/* Funnel Analysis */}
        <div className="print-section print-page-break">
          <h2 className="print-section-title">Conversion Funnel</h2>
          <div className="chart-container">
            <GlobalFunnelChart filters={printFilters} />
          </div>
        </div>

        {/* Cost and Quota Analysis */}
        <div className="print-section print-page-break">
          <h2 className="print-section-title">Cost & Quota Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="print-no-break">
              <h3 className="text-lg font-semibold mb-4">Quota Usage</h3>
              <QuotaProgressCard filters={printFilters} />
            </div>
            <div className="print-no-break">
              <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
              <div className="chart-container">
                <CostByChannelChart filters={printFilters} height={300} />
              </div>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="print-footer">
          <p>Political Productivity Hub - Analytics Report</p>
          <p>Confidential - For Internal Use Only</p>
          <p>Generated at: {new Date().toISOString()}</p>
        </div>

        {/* Print readiness indicator (hidden in print) */}
        {!isReady && (
          <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center print:hidden">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing report for print...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait for all charts to load</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}