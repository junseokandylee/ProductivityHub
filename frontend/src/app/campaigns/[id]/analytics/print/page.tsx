'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { GlobalKpiCards } from '@/components/analytics/global-kpi-cards'
import { GlobalTimeSeriesChart } from '@/components/analytics/global-timeseries-chart'
import { GlobalFunnelChart } from '@/components/analytics/global-funnel-chart'
import { AbTestPerformanceWidget } from '@/components/analytics/ab-test-performance-widget'
import { QuotaProgressCard } from '@/components/analytics/quota-progress-card'
import { CostByChannelChart } from '@/components/analytics/cost-by-channel-chart'
import { useAnalyticsFilters } from '@/hooks/use-analytics-filters'
import { useCampaignDetails } from '@/hooks/use-campaign-details'

interface CampaignAnalyticsPrintPageProps {
  params: Promise<{
    id: string
  }>
}

export default function CampaignAnalyticsPrintPage({ params }: CampaignAnalyticsPrintPageProps) {
  const [id, setId] = React.useState<string | null>(null)
  
  // Handle async params in client component
  React.useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])
  
  if (!id) {
    return <div>Loading...</div>
  }
  const searchParams = useSearchParams()
  const { filters } = useAnalyticsFilters()
  const [isReady, setIsReady] = useState(false)

  // Get campaign details
  const { data: campaignData, isLoading: campaignLoading } = useCampaignDetails(id)

  // Parse URL parameters for filters
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const channels = searchParams.get('channels')
  
  // Set campaign-specific scope in filters
  const printFilters = {
    ...filters,
    scope: 'campaign' as const,
    campaignId: id,
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
          <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics Report</h1>
          <div className="mt-2 text-sm text-gray-600">
            {campaignData && (
              <>
                <p className="font-medium">Campaign: {campaignData.name || `Campaign ${id}`}</p>
                <p>Status: <span className="capitalize">{campaignData.status}</span></p>
              </>
            )}
            <p>Generated on: {new Date().toLocaleString()}</p>
            <p>
              Date Range: {printFilters.from.toLocaleDateString()} - {printFilters.to.toLocaleDateString()}
            </p>
            {printFilters.channels.length > 0 && (
              <p>Channels: {printFilters.channels.join(', ')}</p>
            )}
          </div>
        </div>

        {/* Campaign Information */}
        {campaignData && (
          <div className="print-section print-no-break">
            <h2 className="print-section-title">Campaign Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Basic Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium capitalize ${
                      campaignData.status === 'active' ? 'text-green-600' :
                      campaignData.status === 'paused' ? 'text-yellow-600' :
                      campaignData.status === 'completed' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {campaignData.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-mono text-xs">
                      {new Date(campaignData.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {campaignData.scheduledAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scheduled:</span>
                      <span className="font-mono text-xs">
                        {new Date(campaignData.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {campaignData.targetingConfig && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Targeting</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Segments:</span>
                      <span className="font-mono">
                        {campaignData.targetingConfig.segmentIds?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Channels:</span>
                      <span className="font-mono">
                        {campaignData.targetingConfig.channels?.join(', ') || 'All'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {campaignData.abTestConfig && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">A/B Testing</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variants:</span>
                      <span className="font-mono">
                        {campaignData.abTestConfig.variants?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Traffic Split:</span>
                      <span className="font-mono text-xs">
                        {campaignData.abTestConfig.variants?.map(v => `${v.allocation}%`).join(' / ') || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* A/B Test Performance - Show only if campaign has A/B variants */}
        {campaignData?.abTestConfig && (
          <div className="print-section print-page-break">
            <h2 className="print-section-title">A/B Test Performance</h2>
            <AbTestPerformanceWidget
              campaignId={id}
              filters={printFilters}
              config={campaignData.abTestConfig}
            />
          </div>
        )}

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

        {/* Campaign Cost and Quota Analysis */}
        <div className="print-section print-page-break">
          <h2 className="print-section-title">Campaign Cost & Quota Impact</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="print-no-break">
              <h3 className="text-lg font-semibold mb-4">Campaign Quota Impact</h3>
              <QuotaProgressCard filters={printFilters} />
            </div>
            <div className="print-no-break">
              <h3 className="text-lg font-semibold mb-4">Campaign Cost Breakdown</h3>
              <div className="chart-container">
                <CostByChannelChart filters={printFilters} height={300} />
              </div>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="print-footer">
          <p>Political Productivity Hub - Campaign Analytics Report</p>
          <p>Campaign ID: {id}</p>
          <p>Confidential - For Internal Use Only</p>
          <p>Generated at: {new Date().toISOString()}</p>
        </div>

        {/* Print readiness indicator (hidden in print) */}
        {!isReady && (
          <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center print:hidden">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing campaign report for print...</p>
              <p className="text-sm text-gray-500 mt-2">Please wait for all charts to load</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}