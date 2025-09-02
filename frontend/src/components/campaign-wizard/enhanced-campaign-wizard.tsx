'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignErrorProvider, useCampaignError } from '@/lib/context/campaign-error-context';
import { createCampaignQueryClient } from '@/lib/query/campaign-query-client';
import { WizardProvider, useWizard } from '@/lib/context/campaign-wizard-context';
// CampaignWizard component doesn't exist yet

// Create query client instance
const queryClient = createCampaignQueryClient();

// Error-aware wizard wrapper
function ErrorAwareWizardContent() {
  const { setGlobalError, setLoading } = useCampaignError();
  
  // No global error handler needed since functions don't exist

  return <div>Campaign Wizard Coming Soon</div>;
}

// Enhanced loading wrapper that shows loading states
function LoadingAwareWizard() {
  const { isLoading, loadingMessage } = useCampaignError();
  
  return (
    <div className="relative">
      <ErrorAwareWizardContent />
      
      {/* Global loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <div>
                <h3 className="font-medium text-gray-900">처리 중...</h3>
                <p className="text-sm text-gray-600">{loadingMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main enhanced wizard component
export function EnhancedCampaignWizard() {
  return (
    <QueryClientProvider client={queryClient}>
      <CampaignErrorProvider>
        <WizardProvider>
          <LoadingAwareWizard />
        </WizardProvider>
      </CampaignErrorProvider>
    </QueryClientProvider>
  );
}