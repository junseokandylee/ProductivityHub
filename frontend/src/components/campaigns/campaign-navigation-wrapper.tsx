'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Activity, BarChart3, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCampaignDetails } from '@/hooks/use-campaign-details'

interface CampaignNavigationWrapperProps {
  campaignId: string
}

export function CampaignNavigationWrapper({ campaignId }: CampaignNavigationWrapperProps) {
  const pathname = usePathname()
  const { data: campaignData, isLoading } = useCampaignDetails(campaignId)
  
  const isMonitor = pathname.includes('/monitor')
  const isAnalytics = pathname.includes('/analytics')
  const isMainPage = pathname === `/campaigns/${campaignId}` || pathname.endsWith(`/campaigns/${campaignId}`)

  return (
    <div className="space-y-6 mb-8">
      {/* Campaign Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {campaignData?.name || 'Campaign Dashboard'}
          </h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-600">
              Campaign ID: {campaignId}
            </p>
            {campaignData?.description && (
              <p className="text-gray-500 italic text-sm">
                {campaignData.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
          ) : (
            campaignData?.status && (
              <Badge 
                variant="outline" 
                className={cn(
                  "capitalize",
                  campaignData.status === 'active' && "text-green-600 border-green-300",
                  campaignData.status === 'paused' && "text-yellow-600 border-yellow-300",
                  campaignData.status === 'completed' && "text-blue-600 border-blue-300",
                  campaignData.status === 'draft' && "text-gray-600 border-gray-300",
                  campaignData.status === 'cancelled' && "text-red-600 border-red-300"
                )}
              >
                {campaignData.status}
              </Badge>
            )
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center space-x-4">
          {/* Back to Campaigns */}
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2">
            <Link href={`/campaigns/${campaignId}`}>
              <Button
                variant={isMainPage ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex items-center space-x-2",
                  isMainPage && "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <FileText className="h-4 w-4" />
                <span>세부사항</span>
              </Button>
            </Link>

            <Link href={`/campaigns/${campaignId}/monitor`}>
              <Button
                variant={isMonitor ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex items-center space-x-2",
                  isMonitor && "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <Activity className="h-4 w-4" />
                <span>실시간 모니터링</span>
              </Button>
            </Link>

            <Link href={`/campaigns/${campaignId}/analytics`}>
              <Button
                variant={isAnalytics ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex items-center space-x-2",
                  isAnalytics && "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span>분석</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Campaign Stats Summary */}
        {campaignData && (
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            {campaignData.createdAt && (
              <div>
                <span className="font-medium">Created: </span>
                {new Date(campaignData.createdAt).toLocaleDateString()}
              </div>
            )}
            {campaignData.scheduledAt && (
              <div>
                <span className="font-medium">Scheduled: </span>
                {new Date(campaignData.scheduledAt).toLocaleDateString()}
              </div>
            )}
            {campaignData.targetingConfig?.channels && (
              <div>
                <span className="font-medium">Channels: </span>
                {campaignData.targetingConfig.channels.join(', ')}
              </div>
            )}
            {campaignData.abTestConfig?.variants && (
              <div>
                <span className="font-medium">A/B Test: </span>
                {campaignData.abTestConfig.variants.length} variants
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}