'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UserFriendlyError } from '@/lib/utils/error-handling';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

// Error context interface
interface CampaignErrorContextType {
  // Global error state
  globalError: UserFriendlyError | null;
  setGlobalError: (error: UserFriendlyError | null) => void;
  clearGlobalError: () => void;
  
  // Step-specific errors
  stepErrors: Record<number, UserFriendlyError[]>;
  addStepError: (step: number, error: UserFriendlyError) => void;
  removeStepError: (step: number, index: number) => void;
  clearStepErrors: (step: number) => void;
  clearAllStepErrors: () => void;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string | null;
  setLoading: (loading: boolean, message?: string) => void;
  
  // Network status
  isOnline: boolean;
}

// Create context
const CampaignErrorContext = createContext<CampaignErrorContextType | undefined>(undefined);

// Hook to use error context
export function useCampaignError() {
  const context = useContext(CampaignErrorContext);
  if (context === undefined) {
    throw new Error('useCampaignError must be used within a CampaignErrorProvider');
  }
  return context;
}

// Error display component
interface ErrorDisplayProps {
  error: UserFriendlyError;
  onClose?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onClose, className }: ErrorDisplayProps) {
  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (error.severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'destructive';
    }
  };

  return (
    <Alert variant={getVariant()} className={className}>
      {getIcon()}
      <div className="flex-1">
        <AlertTitle>{error.title}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}

// Loading display component
interface LoadingDisplayProps {
  message: string;
  className?: string;
}

export function LoadingDisplay({ message, className }: LoadingDisplayProps) {
  return (
    <Alert variant="info" className={className}>
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        <AlertDescription>{message}</AlertDescription>
      </div>
    </Alert>
  );
}

// Provider component
interface CampaignErrorProviderProps {
  children: React.ReactNode;
}

export function CampaignErrorProvider({ children }: CampaignErrorProviderProps) {
  const [globalError, setGlobalError] = useState<UserFriendlyError | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<number, UserFriendlyError[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Clear network-related errors when coming back online
      if (globalError?.title.includes('네트워크')) {
        setGlobalError(null);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setGlobalError({
        title: '네트워크 연결 없음',
        message: '인터넷 연결을 확인해주세요.',
        severity: 'warning',
        actionable: false,
        retryable: true,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [globalError]);

  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const addStepError = useCallback((step: number, error: UserFriendlyError) => {
    setStepErrors(prev => ({
      ...prev,
      [step]: [...(prev[step] || []), error]
    }));
  }, []);

  const removeStepError = useCallback((step: number, index: number) => {
    setStepErrors(prev => ({
      ...prev,
      [step]: (prev[step] || []).filter((_, i) => i !== index)
    }));
  }, []);

  const clearStepErrors = useCallback((step: number) => {
    setStepErrors(prev => {
      const updated = { ...prev };
      delete updated[step];
      return updated;
    });
  }, []);

  const clearAllStepErrors = useCallback(() => {
    setStepErrors({});
  }, []);

  const setLoading = useCallback((loading: boolean, message?: string) => {
    setIsLoading(loading);
    setLoadingMessage(message || null);
  }, []);

  const contextValue: CampaignErrorContextType = {
    globalError,
    setGlobalError,
    clearGlobalError,
    stepErrors,
    addStepError,
    removeStepError,
    clearStepErrors,
    clearAllStepErrors,
    isLoading,
    loadingMessage,
    setLoading,
    isOnline,
  };

  return (
    <CampaignErrorContext.Provider value={contextValue}>
      {/* Global error display */}
      {globalError && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <ErrorDisplay
            error={globalError}
            onClose={clearGlobalError}
          />
        </div>
      )}
      
      {/* Global loading display */}
      {isLoading && loadingMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-md">
          <LoadingDisplay message={loadingMessage} />
        </div>
      )}
      
      {/* Offline notification */}
      {!isOnline && !globalError && (
        <div className="fixed bottom-4 left-4 z-50 max-w-md">
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>오프라인 상태</AlertTitle>
            <AlertDescription>
              인터넷 연결이 끊어졌습니다. 연결이 복구되면 자동으로 재시도됩니다.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {children}
    </CampaignErrorContext.Provider>
  );
}