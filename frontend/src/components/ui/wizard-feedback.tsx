'use client';

import React from 'react';
import { useCampaignError } from '@/lib/context/campaign-error-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  RefreshCw,
  AlertTriangle,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react';

// Real-time feedback for wizard steps
interface WizardStepFeedbackProps {
  stepNumber: number;
  title?: string;
  isLoading?: boolean;
  loadingText?: string;
  progress?: number; // 0-100
  className?: string;
}

export function WizardStepFeedback({ 
  stepNumber, 
  title,
  isLoading = false,
  loadingText,
  progress,
  className 
}: WizardStepFeedbackProps) {
  const { stepErrors, isOnline } = useCampaignError();
  const errors = stepErrors[stepNumber] || [];

  // Don't render if no feedback to show
  if (!isLoading && errors.length === 0 && !loadingText && progress === undefined) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Loading indicator with progress */}
      {isLoading && (
        <Alert variant="info">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle className="flex items-center justify-between">
            <span>{title || '처리 중...'}</span>
            {!isOnline && <WifiOff className="h-3 w-3 text-gray-400" />}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{loadingText || '잠시만 기다려주세요.'}</p>
              {progress !== undefined && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-gray-500">{progress}% 완료</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error alerts */}
      {errors.map((error, index) => (
        <Alert 
          key={index} 
          variant={error.severity === 'warning' ? 'warning' : 'destructive'}
        >
          {error.severity === 'warning' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{error.message}</p>
              {error.actionable && (
                <p className="text-xs opacity-75">
                  {error.retryable ? '다시 시도하거나 설정을 확인해주세요.' : '설정을 수정해주세요.'}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Network status warning */}
      {!isOnline && (
        <Alert variant="warning">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>오프라인 상태</AlertTitle>
          <AlertDescription>
            인터넷 연결이 끊어져 일부 기능이 제한됩니다. 연결이 복구되면 자동으로 재시도됩니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Success feedback component
interface SuccessFeedbackProps {
  title: string;
  description: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  className?: string;
}

export function SuccessFeedback({ 
  title, 
  description, 
  action, 
  className 
}: SuccessFeedbackProps) {
  return (
    <Alert variant="success" className={className}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>{description}</p>
          {action && (
            <Button 
              variant="link" 
              size="sm" 
              onClick={action.onClick}
              className="p-0 h-auto text-green-700"
            >
              {action.text}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Operation status tracker
interface OperationStatusProps {
  operations: Array<{
    name: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    message?: string;
    progress?: number;
  }>;
  className?: string;
}

export function OperationStatus({ operations, className }: OperationStatusProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'in-progress':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'in-progress':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {operations.map((operation, index) => (
        <div 
          key={index} 
          className="flex items-center gap-2 p-2 rounded-md bg-gray-50"
        >
          {getStatusIcon(operation.status)}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${getStatusColor(operation.status)}`}>
              {operation.name}
            </p>
            {operation.message && (
              <p className="text-xs text-gray-500 truncate">
                {operation.message}
              </p>
            )}
            {operation.progress !== undefined && operation.status === 'in-progress' && (
              <div className="mt-1">
                <Progress value={operation.progress} className="h-1" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Retry button component
interface RetryButtonProps {
  onRetry: () => void;
  isRetrying?: boolean;
  disabled?: boolean;
  text?: string;
  className?: string;
}

export function RetryButton({ 
  onRetry, 
  isRetrying = false, 
  disabled = false,
  text = '다시 시도',
  className 
}: RetryButtonProps) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onRetry}
      disabled={disabled || isRetrying}
      className={className}
    >
      {isRetrying ? (
        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3 mr-2" />
      )}
      {isRetrying ? '재시도 중...' : text}
    </Button>
  );
}

// Step validation indicator
interface StepValidationProps {
  isValid: boolean;
  isValidating?: boolean;
  errors?: string[];
  warnings?: string[];
  className?: string;
}

export function StepValidation({ 
  isValid, 
  isValidating = false,
  errors = [],
  warnings = [],
  className 
}: StepValidationProps) {
  if (isValidating) {
    return (
      <div className={`flex items-center gap-2 text-sm text-blue-600 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>검증 중...</span>
      </div>
    );
  }

  if (!isValid && errors.length > 0) {
    return (
      <div className={`flex items-start gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">오류가 있습니다:</p>
          <ul className="text-xs mt-1 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (warnings.length > 0) {
    return (
      <div className={`flex items-start gap-2 text-sm text-orange-600 ${className}`}>
        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">주의사항:</p>
          <ul className="text-xs mt-1 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (isValid) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
        <CheckCircle2 className="h-3 w-3" />
        <span>검증 완료</span>
      </div>
    );
  }

  return null;
}