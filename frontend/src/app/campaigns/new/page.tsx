'use client';

import React, { useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WizardProvider, useWizard } from '@/lib/context/campaign-wizard-context';
import { CampaignErrorProvider } from '@/lib/context/campaign-error-context';
import { WizardStep, WIZARD_STEPS } from '@/lib/types/campaign-wizard';
import { Stepper } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AudienceStep } from '@/components/campaign-wizard/audience-step';
import { MessageStep } from '@/components/campaign-wizard/message-step';
import { ChannelStep } from '@/components/campaign-wizard/channel-step';
import { ReviewStep } from '@/components/campaign-wizard/review-step';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

function CampaignWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    state,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    validateCurrentStep,
    canGoToStep,
    resetWizard
  } = useWizard();

  // Sync URL with current step
  useEffect(() => {
    const urlStep = searchParams.get('step');
    const stepNumber = urlStep ? parseInt(urlStep, 10) : 1;
    
    // Validate step number and update if different
    if (stepNumber >= 1 && stepNumber <= 4 && stepNumber !== state.currentStep) {
      if (canGoToStep(stepNumber as WizardStep)) {
        goToStep(stepNumber as WizardStep);
      } else {
        // If user tries to access invalid step, redirect to current valid step
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('step', state.currentStep.toString());
        router.replace(currentUrl.toString(), { scroll: false });
      }
    }
  }, [searchParams, state.currentStep, canGoToStep, goToStep, router]);

  // Update URL when step changes
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const urlStep = currentUrl.searchParams.get('step');
    
    if (urlStep !== state.currentStep.toString()) {
      currentUrl.searchParams.set('step', state.currentStep.toString());
      router.replace(currentUrl.toString(), { scroll: false });
    }
  }, [state.currentStep, router]);

  const handleStepClick = (step: WizardStep) => {
    if (canGoToStep(step)) {
      goToStep(step);
    }
  };

  const handleNext = () => {
    const validation = validateCurrentStep();
    if (validation.isValid) {
      goToNextStep();
    }
  };

  const handlePrevious = () => {
    goToPreviousStep();
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved progress will be lost.')) {
      resetWizard();
      router.push('/campaigns');
    }
  };

  // Prevent accidental page reload/navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if there's unsaved content
      const hasContent = state.message.name || state.message.messageBody || 
                        state.audience.groupIds.length > 0 || 
                        state.audience.segmentIds.length > 0;

      if (hasContent) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  const getCurrentStepComponent = () => {
    switch (state.currentStep) {
      case 1:
        return <AudienceStep />;
      case 2:
        return <MessageStep />;
      case 3:
        return <ChannelStep />;
      case 4:
        return <ReviewStep />;
      default:
        return <AudienceStep />;
    }
  };

  const getCompletedSteps = (): WizardStep[] => {
    const completed: WizardStep[] = [];
    
    // Check which steps have been completed
    for (let step = 1; step <= 4; step++) {
      const stepNum = step as WizardStep;
      if (stepNum < state.currentStep) {
        // Only mark as completed if all previous steps are valid
        let isCompleted = true;
        for (let checkStep = 1; checkStep <= stepNum; checkStep++) {
          // Simplified completion check - in real app you'd validate each step's data
          if (checkStep === 1 && !state.audience.includeAll && 
              state.audience.groupIds.length === 0 && 
              state.audience.segmentIds.length === 0) {
            isCompleted = false;
            break;
          }
          if (checkStep === 2 && (!state.message.name || !state.message.messageBody)) {
            isCompleted = false;
            break;
          }
          if (checkStep === 3 && state.channels.channels.length === 0) {
            isCompleted = false;
            break;
          }
        }
        if (isCompleted) {
          completed.push(stepNum);
        }
      }
    }
    
    return completed;
  };

  const validation = validateCurrentStep();
  const isFirstStep = state.currentStep === 1;
  const isLastStep = state.currentStep === 4;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">
                Create New Campaign
              </h1>
              <div className="text-sm text-gray-500">
                Step {state.currentStep} of {WIZARD_STEPS.length}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Stepper
            currentStep={state.currentStep as WizardStep}
            completedSteps={getCompletedSteps()}
            canGoToStep={canGoToStep}
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          {getCurrentStepComponent()}
        </div>

        {/* Navigation Controls */}
        <Card className="sticky bottom-4 z-10">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            </div>

            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">
                {WIZARD_STEPS[state.currentStep - 1]?.title}
              </div>
              {!validation.isValid && (
                <div className="text-xs text-red-600 mt-1">
                  {validation.errors.length === 1 
                    ? '1 error to fix' 
                    : `${validation.errors.length} errors to fix`}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {!isLastStep ? (
                <Button
                  onClick={handleNext}
                  disabled={!validation.isValid}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="text-sm text-gray-600">
                  Review and send when ready
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading overlay */}
      {state.isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="text-gray-900">Sending campaign...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main page component wrapped with providers
export default function NewCampaignPage() {
  return (
    <WizardProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }>
        <CampaignErrorProvider>
          <CampaignWizardContent />
        </CampaignErrorProvider>
      </Suspense>
    </WizardProvider>
  );
}