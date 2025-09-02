'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { WizardStep, WIZARD_STEPS } from '@/lib/types/campaign-wizard';
import { Check, ChevronRight } from 'lucide-react';

interface StepperProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  canGoToStep: (step: WizardStep) => boolean;
  onStepClick: (step: WizardStep) => void;
  className?: string;
}

export function Stepper({ 
  currentStep, 
  completedSteps, 
  canGoToStep, 
  onStepClick,
  className 
}: StepperProps) {
  return (
    <nav 
      aria-label="Campaign creation progress"
      className={cn("w-full", className)}
    >
      <ol className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.step);
          const isCurrent = step.step === currentStep;
          const isClickable = canGoToStep(step.step);
          const isLastStep = index === WIZARD_STEPS.length - 1;

          return (
            <li key={step.step} className="flex items-center flex-1">
              {/* Step Circle and Content */}
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => isClickable && onStepClick(step.step)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    {
                      // Completed step
                      "bg-green-500 border-green-500 text-white hover:bg-green-600": 
                        isCompleted,
                      // Current step
                      "bg-blue-500 border-blue-500 text-white": 
                        isCurrent && !isCompleted,
                      // Future step (accessible)
                      "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 cursor-pointer": 
                        !isCurrent && !isCompleted && isClickable,
                      // Future step (not accessible)
                      "border-gray-200 text-gray-300 cursor-not-allowed": 
                        !isCurrent && !isCompleted && !isClickable
                    }
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${step.title}. Step ${step.step} of ${WIZARD_STEPS.length}`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-medium">{step.step}</span>
                  )}
                </button>

                {/* Step Title and Description */}
                <div className="mt-2 text-center max-w-[120px]">
                  <div
                    className={cn(
                      "text-xs font-medium leading-tight",
                      {
                        "text-green-600": isCompleted,
                        "text-blue-600": isCurrent && !isCompleted,
                        "text-gray-900": !isCurrent && !isCompleted && isClickable,
                        "text-gray-400": !isCurrent && !isCompleted && !isClickable
                      }
                    )}
                  >
                    {step.title}
                  </div>
                  <div
                    className={cn(
                      "text-xs text-gray-500 mt-1",
                      {
                        "text-gray-600": isCompleted || isCurrent,
                        "text-gray-400": !isCurrent && !isCompleted && !isClickable
                      }
                    )}
                  >
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {!isLastStep && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 transition-colors duration-200",
                    {
                      "bg-green-500": completedSteps.includes((step.step + 1) as WizardStep),
                      "bg-gray-300": !completedSteps.includes((step.step + 1) as WizardStep)
                    }
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact horizontal stepper for mobile
interface CompactStepperProps {
  currentStep: WizardStep;
  totalSteps: number;
  className?: string;
}

export function CompactStepper({ currentStep, totalSteps, className }: CompactStepperProps) {
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <span className="text-sm font-medium text-gray-600">
        Step {currentStep} of {totalSteps}
      </span>
      <div className="flex space-x-1">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div
              key={stepNumber}
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-200",
                {
                  "bg-blue-500": isActive,
                  "bg-green-500": isCompleted,
                  "bg-gray-300": !isActive && !isCompleted
                }
              )}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}