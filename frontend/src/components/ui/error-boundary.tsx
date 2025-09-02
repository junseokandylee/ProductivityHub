'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  onNavigateHome?: () => void;
  title?: string;
  description?: string;
  showDetails?: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

export function DefaultErrorFallback({ 
  error, 
  resetError, 
  onNavigateHome,
  title = '문제가 발생했습니다',
  description = '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  showDetails = false
}: ErrorFallbackProps) {
  return (
    <div 
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      role="alert"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
          </div>
          <CardTitle id="error-title" className="text-xl">
            {title}
          </CardTitle>
          <CardDescription id="error-description">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-center">
            <Button onClick={resetError} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              다시 시도
            </Button>
            {onNavigateHome && (
              <Button variant="outline" onClick={onNavigateHome} className="flex items-center gap-2">
                <Home className="w-4 h-4" aria-hidden="true" />
                홈으로
              </Button>
            )}
          </div>
          
          {showDetails && error && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription className="mt-2">
                <details>
                  <summary className="cursor-pointer font-medium">
                    개발자 정보 (클릭하여 펼치기)
                  </summary>
                  <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    <div className="text-red-600 font-bold">{error.name}</div>
                    <div className="mb-2">{error.message}</div>
                    {error.stack && (
                      <pre className="whitespace-pre-wrap text-gray-700">{error.stack}</pre>
                    )}
                  </div>
                </details>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface NetworkErrorFallbackProps extends Omit<ErrorFallbackProps, 'title' | 'description'> {
  onRetry?: () => void;
}

export function NetworkErrorFallback({ 
  resetError, 
  onRetry, 
  onNavigateHome 
}: NetworkErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      resetError();
    }
  };

  return (
    <DefaultErrorFallback
      resetError={handleRetry}
      onNavigateHome={onNavigateHome}
      title="연결에 문제가 있습니다"
      description="네트워크 연결을 확인하고 다시 시도해주세요."
    />
  );
}

interface QueryErrorFallbackProps extends Omit<ErrorFallbackProps, 'title' | 'description'> {
  onRetry?: () => void;
  queryKey?: string;
}

export function QueryErrorFallback({ 
  resetError, 
  onRetry, 
  onNavigateHome,
  queryKey
}: QueryErrorFallbackProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      resetError();
    }
  };

  return (
    <DefaultErrorFallback
      resetError={handleRetry}
      onNavigateHome={onNavigateHome}
      title="데이터를 불러올 수 없습니다"
      description="서버에서 데이터를 가져오는 중 문제가 발생했습니다."
    />
  );
}