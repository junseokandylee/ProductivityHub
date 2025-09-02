'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              문제가 발생했습니다
            </h1>
            
            <p className="text-gray-600 mb-8 max-w-sm">
              예기치 않은 오류가 발생했습니다. 
              잠시 후 다시 시도해 주세요.
            </p>
            
            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-left text-sm text-red-700 max-w-sm mx-auto">
                <strong>개발 모드 오류:</strong>
                <br />
                {error.message}
                {error.digest && (
                  <>
                    <br />
                    <strong>Digest:</strong> {error.digest}
                  </>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={reset}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
              
              <div className="flex space-x-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full" size="lg">
                    <Home className="w-4 h-4 mr-2" />
                    홈으로
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  size="lg"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  이전으로
                </Button>
              </div>
            </div>
            
            {/* Help Links */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">문제가 계속되나요?</p>
              <div className="flex justify-center space-x-4 text-sm">
                <Link 
                  href="/help" 
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  도움말
                </Link>
                <Link 
                  href="/help/contact" 
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  문의하기
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}