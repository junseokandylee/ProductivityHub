'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  CampaignWizardState, 
  WizardAction, 
  WizardStep,
  initialWizardState,
  StepValidation 
} from '../types/campaign-wizard';

// Wizard Context
interface WizardContextType {
  state: CampaignWizardState;
  dispatch: React.Dispatch<WizardAction>;
  goToStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  validateCurrentStep: () => StepValidation;
  canGoToStep: (step: WizardStep) => boolean;
  resetWizard: () => void;
  saveToSessionStorage: () => void;
  loadFromSessionStorage: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

// Wizard Reducer
function wizardReducer(state: CampaignWizardState, action: WizardAction): CampaignWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_AUDIENCE':
      return { 
        ...state, 
        audience: { ...state.audience, ...action.payload }
      };
    
    case 'SET_MESSAGE':
      return { 
        ...state, 
        message: { ...state.message, ...action.payload }
      };
    
    case 'SET_CHANNELS':
      return { 
        ...state, 
        channels: { ...state.channels, ...action.payload }
      };
    
    case 'SET_REVIEW':
      return { 
        ...state, 
        review: { ...state.review, ...action.payload }
      };
    
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    
    case 'SET_ERRORS':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.step]: action.payload.errors
        }
      };
    
    case 'CLEAR_ERRORS':
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return { ...state, errors: newErrors };
    
    case 'RESET_WIZARD':
      return { ...initialWizardState };
    
    case 'HYDRATE_STATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Session Storage Key
const WIZARD_STORAGE_KEY = 'campaign-wizard-state';

// Wizard Provider Component
interface WizardProviderProps {
  children: ReactNode;
}

export function WizardProvider({ children }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);

  // Navigation functions
  const goToStep = (step: WizardStep) => {
    if (canGoToStep(step)) {
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  const goToNextStep = () => {
    const validation = validateCurrentStep();
    if (validation.isValid && state.currentStep < 4) {
      dispatch({ type: 'SET_STEP', payload: (state.currentStep + 1) as WizardStep });
    } else if (!validation.isValid) {
      dispatch({ 
        type: 'SET_ERRORS', 
        payload: { step: state.currentStep as WizardStep, errors: validation.errors }
      });
    }
  };

  const goToPreviousStep = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: (state.currentStep - 1) as WizardStep });
    }
  };

  // Validation logic
  const validateCurrentStep = (): StepValidation => {
    const errors: string[] = [];

    switch (state.currentStep) {
      case 1: // Audience Selection
        if (!state.audience.includeAll && 
            state.audience.groupIds.length === 0 && 
            state.audience.segmentIds.length === 0 &&
            Object.keys(state.audience.filterJson).length === 0) {
          errors.push('Please select at least one audience group, segment, or filter');
        }
        break;

      case 2: // Message Composition
        if (!state.message.name.trim()) {
          errors.push('Campaign name is required');
        }
        if (!state.message.messageBody.trim()) {
          errors.push('Message content is required');
        }
        if (state.message.messageBody.length > 2000) {
          errors.push('Message content must be less than 2000 characters');
        }
        break;

      case 3: // Channel Settings
        if (state.channels.channelOrder.length === 0) {
          errors.push('At least one channel must be selected');
        }
        break;

      case 4: // Review & Send
        if (!state.review.quotaOk) {
          errors.push('Campaign exceeds monthly quota limit');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Permission logic for step navigation
  const canGoToStep = (step: WizardStep): boolean => {
    // Always allow going to step 1
    if (step === 1) return true;
    
    // For other steps, validate previous steps
    for (let i = 1; i < step; i++) {
      const tempState = { ...state, currentStep: i };
      const validation = validateStepForState(tempState, i as WizardStep);
      if (!validation.isValid) {
        return false;
      }
    }
    return true;
  };

  // Helper function to validate a specific step with given state
  const validateStepForState = (checkState: CampaignWizardState, step: WizardStep): StepValidation => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!checkState.audience.includeAll && 
            checkState.audience.groupIds.length === 0 && 
            checkState.audience.segmentIds.length === 0 &&
            Object.keys(checkState.audience.filterJson).length === 0) {
          errors.push('Audience selection required');
        }
        break;
      case 2:
        if (!checkState.message.name.trim() || !checkState.message.messageBody.trim()) {
          errors.push('Message composition required');
        }
        break;
      case 3:
        if (checkState.channels.channels.length === 0) {
          errors.push('Channel configuration required');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const resetWizard = () => {
    dispatch({ type: 'RESET_WIZARD' });
    sessionStorage.removeItem(WIZARD_STORAGE_KEY);
  };

  // Session Storage functions
  const saveToSessionStorage = () => {
    try {
      const stateToSave = {
        currentStep: state.currentStep,
        audience: state.audience,
        message: state.message,
        channels: state.channels,
        review: state.review
      };
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save wizard state to session storage:', error);
    }
  };

  const loadFromSessionStorage = () => {
    try {
      const savedState = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: 'HYDRATE_STATE', payload: parsedState });
      }
    } catch (error) {
      console.warn('Failed to load wizard state from session storage:', error);
    }
  };

  // Auto-save to session storage on state changes
  useEffect(() => {
    saveToSessionStorage();
  }, [state.audience, state.message, state.channels, state.review, state.currentStep]);

  // Load from session storage on mount
  useEffect(() => {
    loadFromSessionStorage();
  }, []);

  const contextValue: WizardContextType = {
    state,
    dispatch,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    validateCurrentStep,
    canGoToStep,
    resetWizard,
    saveToSessionStorage,
    loadFromSessionStorage
  };

  return (
    <WizardContext.Provider value={contextValue}>
      {children}
    </WizardContext.Provider>
  );
}

// Custom hook to use wizard context
export function useWizard(): WizardContextType {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}