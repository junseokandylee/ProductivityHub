'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Download, 
  Eye,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { importAPI } from '@/lib/api/import';
import { ImportJobResponse, ImportJobStatus, ImportError } from '@/lib/types/import';

import { 
  LoadingSpinner, 
  ProgressWithLabels,
  LoadingCard 
} from '@/components/ui/enhanced-loading';
import { 
  ErrorBoundary, 
  DefaultErrorFallback 
} from '@/components/ui/error-boundary';
import { 
  SkipLink,
  FocusTrap, 
  Announcement,
  KeyboardShortcuts,
  VisuallyHidden,
  useReducedMotion
} from '@/components/ui/accessibility';

interface FileUploadState {
  file: File | null;
  jobId: string | null;
  status: ImportJobStatus | null;
  progress: number;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  processingRate: number | null;
  estimatedSecondsRemaining: number | null;
  errorMessage: string | null;
  errors: ImportError[];
  retryCount: number;
}

export default function EnhancedContactImportPage() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    jobId: null,
    status: null,
    progress: 0,
    totalRows: 0,
    processedRows: 0,
    errorRows: 0,
    processingRate: null,
    estimatedSecondsRemaining: null,
    errorMessage: null,
    errors: [],
    retryCount: 0,
  });

  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // File upload mutation with retry logic
  const uploadMutation = useMutation({
    mutationFn: (file: File) => importAPI.startImport(file),
    onSuccess: (response: ImportJobResponse) => {
      setUploadState(prev => ({
        ...prev,
        jobId: response.jobId,
        status: response.status as ImportJobStatus,
        totalRows: response.totalRows,
        retryCount: 0,
      }));
      
      startProgressStream(response.jobId);
      
      toast({
        title: "가져오기 시작됨",
        description: `${response.totalRows}개 행의 파일 처리를 시작했습니다.`,
      });

      setAnnouncement(`${response.totalRows}개 행의 파일 가져오기가 시작되었습니다`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || '파일 업로드에 실패했습니다.';
      setUploadState(prev => ({ 
        ...prev, 
        errorMessage: message,
        retryCount: prev.retryCount + 1 
      }));
      
      toast({
        title: "업로드 실패",
        description: message,
        variant: "destructive",
        action: uploadState.retryCount < 3 ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => retryUpload()}
          >
            재시도
          </Button>
        ) : undefined,
      });

      setAnnouncement(`업로드 실패: ${message}`);
    },
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      return failureCount < 3 && error?.message?.includes('network');
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => importAPI.previewFile(file),
    onSuccess: (preview) => {
      setShowPreview(true);
      toast({
        title: "미리보기 준비됨",
        description: `${preview.estimatedRows}개 행, ${preview.detectedColumns.length}개 열이 감지되었습니다.`,
      });
      setAnnouncement(`미리보기: ${preview.estimatedRows}개 행, ${preview.detectedColumns.length}개 열 감지됨`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || '미리보기에 실패했습니다.';
      toast({
        title: "미리보기 실패",
        description: message,
        variant: "destructive",
      });
      setAnnouncement(`미리보기 실패: ${message}`);
    },
  });

  // Progress streaming
  const startProgressStream = useCallback((jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/imports/${jobId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        setUploadState(prev => ({
          ...prev,
          status: data.status,
          progress: data.progress,
          processedRows: data.processedRows,
          errorRows: data.errorRows,
          processingRate: data.processingRate,
          estimatedSecondsRemaining: data.estimatedSecondsRemaining,
        }));

        // Announce progress milestones
        if (data.progress % 25 === 0 && data.progress > 0) {
          setAnnouncement(`가져오기 ${data.progress}% 완료, ${data.processedRows}개 처리됨`);
        }

        if (data.status === 'completed') {
          eventSource.close();
          setAnnouncement(`가져오기 완료: ${data.processedRows}개 처리, ${data.errorRows}개 오류`);
          toast({
            title: "가져오기 완료",
            description: `${data.processedRows}개 연락처가 성공적으로 가져와졌습니다.`,
            action: (
              <Button variant="outline" size="sm" onClick={() => router.push('/contacts')}>
                연락처 보기
              </Button>
            ),
          });
        } else if (data.status === 'failed') {
          eventSource.close();
          setAnnouncement('가져오기가 실패했습니다');
          toast({
            title: "가져오기 실패",
            description: "파일 처리 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
      setAnnouncement('실시간 업데이트 연결이 끊어졌습니다');
    };
  }, [router, toast]);

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.size > maxSize) {
      toast({
        title: "파일이 너무 큽니다",
        description: "파일 크기는 100MB를 초과할 수 없습니다.",
        variant: "destructive",
      });
      setAnnouncement('파일 크기가 100MB를 초과합니다');
      return;
    }

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(csv|xlsx?|xls)$/)) {
      toast({
        title: "지원되지 않는 파일 형식",
        description: "CSV 또는 Excel 파일만 지원됩니다.",
        variant: "destructive",
      });
      setAnnouncement('지원되지 않는 파일 형식입니다');
      return;
    }

    setUploadState(prev => ({ 
      ...prev, 
      file, 
      errorMessage: null,
      retryCount: 0 
    }));
    
    setAnnouncement(`${file.name} 파일이 선택되었습니다`);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const retryUpload = useCallback(() => {
    if (uploadState.file && uploadState.retryCount < 3) {
      uploadMutation.mutate(uploadState.file);
    }
  }, [uploadState.file, uploadState.retryCount, uploadMutation]);

  const resetUpload = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setUploadState({
      file: null,
      jobId: null,
      status: null,
      progress: 0,
      totalRows: 0,
      processedRows: 0,
      errorRows: 0,
      processingRate: null,
      estimatedSecondsRemaining: null,
      errorMessage: null,
      errors: [],
      retryCount: 0,
    });

    setShowPreview(false);
    setAnnouncement('업로드가 초기화되었습니다');
  }, []);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    { 
      key: 'ctrl+o', 
      description: '파일 선택', 
      action: () => fileInputRef.current?.click() 
    },
    { 
      key: 'Escape', 
      description: '취소', 
      action: resetUpload 
    },
  ], [resetUpload]);

  const getStatusColor = useCallback((status: ImportJobStatus | null) => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  const getStatusIcon = useCallback((status: ImportJobStatus | null) => {
    switch (status) {
      case 'processing':
        return <LoadingSpinner size="sm" className="text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  }, []);

  return (
    <ErrorBoundary fallback={DefaultErrorFallback}>
      <div className="min-h-screen bg-gray-50">
        <SkipLink href="#main-content">메인 콘텐츠로 건너뛰기</SkipLink>
        <KeyboardShortcuts shortcuts={shortcuts} />

        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto py-6 px-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/contacts')}
                className="flex items-center gap-2"
                aria-label="연락처 목록으로 돌아가기"
              >
                <ArrowLeft className="h-4 w-4" />
                돌아가기
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">연락처 가져오기</h1>
                <p className="text-gray-600 mt-1">
                  CSV 또는 Excel 파일에서 연락처를 가져옵니다
                </p>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="max-w-4xl mx-auto py-6 px-4">
          {/* File Upload Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                파일 업로드
              </CardTitle>
              <CardDescription>
                CSV 또는 Excel 파일을 선택하여 연락처를 가져오세요. 
                최대 100MB, 100,000개 행까지 지원됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!uploadState.file && (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="파일을 드래그하여 놓거나 클릭하여 선택하세요"
                >
                  <Upload 
                    className={`mx-auto h-12 w-12 mb-4 ${
                      dragActive ? 'text-blue-500' : 'text-gray-400'
                    }`} 
                    aria-hidden="true"
                  />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    파일을 여기에 드래그하세요
                  </p>
                  <p className="text-gray-600 mb-4">
                    또는 클릭하여 파일을 선택하세요
                  </p>
                  <Button type="button" onClick={() => fileInputRef.current?.click()}>
                    파일 선택
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="sr-only"
                    aria-describedby="file-help"
                  />
                  <div id="file-help" className="sr-only">
                    CSV 또는 Excel 파일을 선택하세요. 최대 100MB까지 지원됩니다.
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    지원 형식: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              )}

              {uploadState.file && (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" aria-hidden="true" />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {uploadState.file.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                          {uploadState.totalRows > 0 && (
                            <span className="ml-2">
                              • {uploadState.totalRows.toLocaleString()}개 행
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetUpload}
                      aria-label="파일 선택 취소"
                      disabled={uploadState.status === 'processing'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => previewMutation.mutate(uploadState.file!)}
                      variant="outline"
                      disabled={previewMutation.isLoading}
                      className="flex items-center gap-2"
                    >
                      {previewMutation.isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      미리보기
                    </Button>
                    
                    <Button
                      onClick={() => uploadMutation.mutate(uploadState.file!)}
                      disabled={uploadMutation.isLoading || uploadState.status === 'processing'}
                      className="flex items-center gap-2"
                    >
                      {uploadMutation.isLoading || uploadState.status === 'processing' ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadState.status === 'processing' ? '처리 중...' : '가져오기 시작'}
                    </Button>
                  </div>

                  {/* Error Message */}
                  {uploadState.errorMessage && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>오류 발생</AlertTitle>
                      <AlertDescription className="mt-2">
                        {uploadState.errorMessage}
                        {uploadState.retryCount < 3 && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={retryUpload}
                              className="flex items-center gap-2"
                            >
                              <RefreshCw className="h-3 w-3" />
                              재시도 ({uploadState.retryCount}/3)
                            </Button>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Section */}
          {uploadState.status === 'processing' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(uploadState.status)}
                  처리 진행 상황
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProgressWithLabels
                  value={uploadState.processedRows}
                  total={uploadState.totalRows}
                  label={`${uploadState.progress}% 완료`}
                  description={`${uploadState.processedRows.toLocaleString()} / ${uploadState.totalRows.toLocaleString()} 행 처리됨${
                    uploadState.errorRows > 0 ? ` (${uploadState.errorRows} 오류)` : ''
                  }`}
                />

                {uploadState.processingRate && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">처리 속도:</span>
                      <span className="ml-2 font-mono">
                        {uploadState.processingRate.toLocaleString()} rows/sec
                      </span>
                    </div>
                    {uploadState.estimatedSecondsRemaining && (
                      <div>
                        <span className="text-gray-600">남은 시간:</span>
                        <span className="ml-2 font-mono">
                          약 {Math.ceil(uploadState.estimatedSecondsRemaining)}초
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {(uploadState.status === 'completed' || uploadState.status === 'failed') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(uploadState.status)}
                  <span className={getStatusColor(uploadState.status)}>
                    {uploadState.status === 'completed' ? '가져오기 완료' : '가져오기 실패'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadState.status === 'completed' && (
                  <>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {uploadState.processedRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">성공</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {uploadState.errorRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">오류</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-700">
                          {uploadState.totalRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">전체</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => router.push('/contacts')}>
                        연락처 보기
                      </Button>
                      <Button variant="outline" onClick={resetUpload}>
                        새 파일 업로드
                      </Button>
                    </div>
                  </>
                )}

                {uploadState.status === 'failed' && (
                  <div className="text-center space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        파일 처리 중 오류가 발생했습니다. 파일 형식을 확인하고 다시 시도해주세요.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={retryUpload} variant="outline">
                        재시도
                      </Button>
                      <Button variant="outline" onClick={resetUpload}>
                        새 파일 선택
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {uploadState.errors.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">
                      오류 상세 정보 ({uploadState.errors.length}개)
                    </h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {uploadState.errors.slice(0, 10).map((error, index) => (
                        <div 
                          key={index} 
                          className="p-3 bg-red-50 border border-red-200 rounded text-sm"
                        >
                          <div className="font-medium text-red-800">
                            행 {error.rowNumber}: {error.field}
                          </div>
                          <div className="text-red-600 mt-1">
                            {error.message}
                          </div>
                        </div>
                      ))}
                      {uploadState.errors.length > 10 && (
                        <div className="text-center p-3 text-gray-600">
                          및 {uploadState.errors.length - 10}개의 추가 오류...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>도움말</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">지원되는 파일 형식</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>CSV 파일 (.csv)</li>
                  <li>Excel 파일 (.xlsx, .xls)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">필수 열</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li><code className="bg-gray-100 px-1 rounded">name</code> 또는 <code className="bg-gray-100 px-1 rounded">fullName</code> - 연락처 이름 (필수)</li>
                  <li><code className="bg-gray-100 px-1 rounded">phone</code> - 전화번호 (선택)</li>
                  <li><code className="bg-gray-100 px-1 rounded">email</code> - 이메일 주소 (선택)</li>
                  <li><code className="bg-gray-100 px-1 rounded">kakaoId</code> - 카카오톡 ID (선택)</li>
                </ul>
              </div>

              <div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  샘플 파일 다운로드
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Live announcements */}
        {announcement && (
          <Announcement message={announcement} priority="polite" />
        )}
      </div>
    </ErrorBoundary>
  );
}