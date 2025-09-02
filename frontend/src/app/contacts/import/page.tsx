'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download, Eye } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { importAPI } from '@/lib/api/import';
import { ImportJobResponse, ImportJobStatus, ImportError } from '@/lib/types/import';

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
}

export default function ContactImportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
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
  });

  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => importAPI.startImport(file),
    onSuccess: (response: ImportJobResponse) => {
      setUploadState(prev => ({
        ...prev,
        jobId: response.jobId,
        status: response.status as ImportJobStatus,
        totalRows: response.totalRows,
      }));
      
      // Start SSE connection for progress updates
      startProgressStream(response.jobId);
      
      toast({
        title: "가져오기 시작됨",
        description: `${response.totalRows}개 행의 파일 처리를 시작했습니다.`,
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || '파일 업로드에 실패했습니다.';
      setUploadState(prev => ({ ...prev, errorMessage: message }));
      toast({
        title: "업로드 실패",
        description: message,
        variant: "destructive",
      });
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
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || '미리보기에 실패했습니다.';
      toast({
        title: "미리보기 실패",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Start SSE progress stream
  const startProgressStream = useCallback((jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/imports/${jobId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const progressData = JSON.parse(event.data);
        const jobStatus = progressData.jobStatus;
        
        setUploadState(prev => ({
          ...prev,
          status: jobStatus.status,
          progress: jobStatus.progress,
          processedRows: jobStatus.processedRows,
          errorRows: jobStatus.errorRows,
          processingRate: jobStatus.processingRate,
          estimatedSecondsRemaining: jobStatus.estimatedSecondsRemaining,
          errorMessage: jobStatus.errorMessage,
        }));

        if (jobStatus.status === 'completed') {
          eventSource.close();
          toast({
            title: "가져오기 완료",
            description: `${jobStatus.processedRows}개 연락처가 성공적으로 가져왔습니다.`,
          });
        } else if (jobStatus.status === 'failed') {
          eventSource.close();
          toast({
            title: "가져오기 실패",
            description: jobStatus.errorMessage || "가져오기 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };
  }, [toast]);

  // Handle file selection
  const handleFiles = useCallback((files: FileList) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const validExtensions = ['.csv', '.xls', '.xlsx'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast({
        title: "지원하지 않는 파일 형식",
        description: "CSV 또는 Excel 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "파일 크기는 100MB를 초과할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setUploadState(prev => ({
      ...prev,
      file,
      jobId: null,
      status: null,
      progress: 0,
      errorMessage: null,
    }));

    setShowPreview(false);
  }, [toast]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input change handler
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Start import
  const handleStartImport = useCallback(() => {
    if (uploadState.file) {
      uploadMutation.mutate(uploadState.file);
    }
  }, [uploadState.file, uploadMutation]);

  // Preview file
  const handlePreview = useCallback(() => {
    if (uploadState.file) {
      previewMutation.mutate(uploadState.file);
    }
  }, [uploadState.file, previewMutation]);

  // Reset upload state
  const handleReset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
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
    });
    
    setShowPreview(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format processing time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">연락처 가져오기</h1>
          <p className="text-gray-600 mt-2">
            CSV 또는 Excel 파일에서 연락처를 가져와 주소록에 추가하세요.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>파일 업로드</CardTitle>
              <CardDescription>
                CSV 또는 Excel 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!uploadState.file ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                    ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${uploadMutation.isPending ? 'pointer-events-none opacity-50' : ''}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    파일을 드래그하여 놓거나 클릭하여 선택
                  </p>
                  <p className="text-sm text-gray-600">
                    CSV, XLS, XLSX 파일만 지원 (최대 100MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{uploadState.file.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(uploadState.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={uploadState.status === 'processing'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  {!uploadState.jobId && (
                    <div className="flex space-x-3">
                      <Button
                        onClick={handlePreview}
                        variant="outline"
                        disabled={previewMutation.isPending}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        미리보기
                      </Button>
                      <Button
                        onClick={handleStartImport}
                        disabled={uploadMutation.isPending}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        가져오기 시작
                      </Button>
                    </div>
                  )}

                  {/* Import Progress */}
                  {uploadState.jobId && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>진행률</span>
                          <span>{uploadState.progress}%</span>
                        </div>
                        <Progress value={uploadState.progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">전체 행:</span>
                          <span className="ml-2 font-medium">{uploadState.totalRows.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">처리됨:</span>
                          <span className="ml-2 font-medium">{uploadState.processedRows.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">오류:</span>
                          <span className="ml-2 font-medium text-red-600">{uploadState.errorRows.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">처리 속도:</span>
                          <span className="ml-2 font-medium">
                            {uploadState.processingRate ? `${uploadState.processingRate.toFixed(1)} 행/초` : '-'}
                          </span>
                        </div>
                      </div>

                      {uploadState.estimatedSecondsRemaining && (
                        <div className="text-sm text-gray-600">
                          예상 남은 시간: {formatTime(uploadState.estimatedSecondsRemaining)}
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          uploadState.status === 'completed' ? 'default' :
                          uploadState.status === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {uploadState.status === 'pending' && '대기 중'}
                          {uploadState.status === 'processing' && '처리 중'}
                          {uploadState.status === 'completed' && '완료'}
                          {uploadState.status === 'failed' && '실패'}
                        </Badge>
                        {uploadState.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {uploadState.status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>

                      {/* Error Message */}
                      {uploadState.errorMessage && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{uploadState.errorMessage}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>가져오기 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">지원되는 파일 형식</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• CSV (.csv)</li>
                  <li>• Excel (.xls, .xlsx)</li>
                  <li>• 최대 파일 크기: 100MB</li>
                  <li>• 최대 행 수: 100,000개</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">필수 열</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <span className="font-medium">이름</span>: 연락처의 전체 이름</li>
                  <li>• <span className="font-medium">연락처</span>: 전화번호, 이메일, 카카오톡 ID 중 최소 하나</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">권장 열 이름</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>한국어</div>
                    <div>영어</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>이름, 성명</div>
                    <div>name, full_name</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>전화번호, 휴대폰</div>
                    <div>phone, mobile</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>이메일</div>
                    <div>email</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>카카오톡, 카카오</div>
                    <div>kakao, kakaoid</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>메모, 비고</div>
                    <div>notes, memo</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>태그</div>
                    <div>tags</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">데이터 처리</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 중복 연락처는 자동으로 병합됩니다</li>
                  <li>• 전화번호는 E.164 형식으로 정규화됩니다</li>
                  <li>• 이메일 주소는 소문자로 정규화됩니다</li>
                  <li>• 개인정보는 암호화되어 저장됩니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}