import React from 'react'
import { CampaignNavigationWrapper } from '@/components/campaigns/campaign-navigation-wrapper'

interface CampaignLayoutProps {
  children: React.ReactNode
  params: {
    id: string
  }
}

export default function CampaignLayout({ children, params }: CampaignLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Navigation Wrapper */}
        <CampaignNavigationWrapper campaignId={params.id} />
        
        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}