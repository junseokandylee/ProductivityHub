'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Download, FileText, Filter, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { contactsAPI } from '@/lib/api/contacts';
import { Contact, Tag } from '@/lib/types/contact';

interface ExportConfig {
  format: 'csv' | 'xlsx';
  columns: string[];
  includeHeaders: boolean;
  filters: {
    isActive?: boolean;
    tagIds: string[];
    searchQuery?: string;
  };
}

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  errorMessage?: string;
  totalRecords: number;
  processedRecords: number;
  startedAt: string;
  completedAt?: string;
}

const AVAILABLE_COLUMNS = [
  { key: 'fullName', label: '이름', required: true },
  { key: 'phone', label: '전화번호', required: false },
  { key: 'email', label: '이메일', required: false },
  { key: 'kakaoId', label: '카카오 ID', required: false },
  { key: 'notes', label: '메모', required: false },
  { key: 'tags', label: '태그', required: false },
  { key: 'isActive', label: '활성 상태', required: false },
  { key: 'createdAt', label: '생성일', required: false },
  { key: 'updatedAt', label: '수정일', required: false },
];

export default function ContactExportPage() {
  const { toast } = useToast();
  
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    columns: ['fullName', 'phone', 'email'],
    includeHeaders: true,
    filters: {
      tagIds: [],
    },
  });

  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);

  // Fetch contacts count for estimation
  const { data: contactsResponse } = useQuery({
    queryKey: ['contacts', 'estimate', exportConfig.filters],
    queryFn: () => contactsAPI.searchContacts({
      ...exportConfig.filters,
      limit: 1, // Just get the count
    }),
    keepPreviousData: true,
  });

  // Fetch tags for filtering
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => contactsAPI.getTags(),
  });

  // Export mutation (mock implementation)
  const exportMutation = useMutation({
    mutationFn: async (config: ExportConfig) => {
      // Mock API call - in real implementation this would be:
      // return exportAPI.createExportJob(config);
      
      // Simulate API response
      const mockJobId = `export_${Date.now()}`;
      const mockJob: ExportJob = {
        id: mockJobId,
        status: 'pending',
        progress: 0,
        totalRecords: contactsResponse?.totalCount || 0,
        processedRecords: 0,
        startedAt: new Date().toISOString(),
      };

      // Simulate processing
      setTimeout(() => {
        setExportJob(prev => prev ? { ...prev, status: 'processing', progress: 25 } : null);
        
        setTimeout(() => {
          setExportJob(prev => prev ? { ...prev, progress: 50 } : null);
          
          setTimeout(() => {
            setExportJob(prev => prev ? { ...prev, progress: 75 } : null);
            
            setTimeout(() => {
              setExportJob(prev => prev ? {
                ...prev,
                status: 'completed',
                progress: 100,
                downloadUrl: `/api/export/download/${mockJobId}`,
                processedRecords: prev.totalRecords,
                completedAt: new Date().toISOString(),
              } : null);
            }, 1000);
          }, 1000);
        }, 1000);
      }, 500);

      return mockJob;
    },
    onSuccess: (job) => {
      setExportJob(job);
      toast({
        title: '내보내기 작업이 시작되었습니다.',
        description: '진행 상황을 모니터링할 수 있습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '내보내기 실패',
        description: error.message || '내보내기 작업 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
    if (column?.required && !checked) return;

    setExportConfig(prev => ({
      ...prev,
      columns: checked
        ? [...prev.columns, columnKey]
        : prev.columns.filter(col => col !== columnKey),
    }));
  };

  const handleTagFilter = (tagId: string) => {
    setExportConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        tagIds: prev.filters.tagIds.includes(tagId)
          ? prev.filters.tagIds.filter(id => id !== tagId)
          : [...prev.filters.tagIds, tagId],
      },
    }));
  };

  const handleStatusFilter = (status: string) => {
    const newFilter = status === 'all' ? undefined : status === 'active';
    setExportConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        isActive: newFilter,
      },
    }));
  };

  const handleStartExport = () => {
    exportMutation.mutate(exportConfig);
  };

  const handleDownload = () => {
    if (exportJob?.downloadUrl) {
      // In a real implementation, this would trigger a download
      toast({
        title: '다운로드 시작됨',
        description: `${exportConfig.format.toUpperCase()} 파일 다운로드가 시작되었습니다.`,
      });
    }
  };

  const getEstimatedFileSize = (recordCount: number, columnCount: number) => {
    // Rough estimation: ~100 bytes per field, plus headers and formatting
    const bytesPerRecord = columnCount * 100;
    const totalBytes = (recordCount * bytesPerRecord) + 1000; // Add header overhead
    
    if (totalBytes < 1024) return `${totalBytes}B`;
    if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)}KB`;
    return `${Math.round(totalBytes / (1024 * 1024))}MB`;
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분 ${seconds % 60}초`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              연락처로 돌아가기
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">연락처 내보내기</h1>
            <p className="text-gray-600 mt-1">원하는 형식으로 연락처 데이터를 내보내세요</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>내보내기 형식</span>
              </CardTitle>
              <CardDescription>내보낼 파일의 형식을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportConfig.format === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportConfig(prev => ({ ...prev, format: 'csv' }))}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportConfig.format === 'csv'}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-sm text-gray-500">쉼표로 구분된 값</div>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportConfig.format === 'xlsx' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportConfig(prev => ({ ...prev, format: 'xlsx' }))}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="format"
                      value="xlsx"
                      checked={exportConfig.format === 'xlsx'}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Excel (XLSX)</div>
                      <div className="text-sm text-gray-500">Microsoft Excel 파일</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={exportConfig.includeHeaders}
                  onCheckedChange={(checked) => 
                    setExportConfig(prev => ({ ...prev, includeHeaders: !!checked }))
                  }
                />
                <label className="text-sm font-medium">첫 번째 행에 헤더 포함</label>
              </div>
            </CardContent>
          </Card>

          {/* Column Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>포함할 열</span>
              </CardTitle>
              <CardDescription>내보낼 데이터 열을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {AVAILABLE_COLUMNS.map((column) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      checked={exportConfig.columns.includes(column.key)}
                      disabled={column.required}
                      onCheckedChange={(checked) => handleColumnToggle(column.key, !!checked)}
                    />
                    <label className={`text-sm ${column.required ? 'font-medium' : ''}`}>
                      {column.label}
                      {column.required && (
                        <Badge variant="secondary" className="ml-2 text-xs">필수</Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>필터</span>
              </CardTitle>
              <CardDescription>내보낼 연락처를 필터링하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">연락처 상태</label>
                <Select 
                  value={exportConfig.filters.isActive === undefined ? 'all' : exportConfig.filters.isActive ? 'active' : 'inactive'} 
                  onValueChange={handleStatusFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="active">활성만</SelectItem>
                    <SelectItem value="inactive">비활성만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tag Filter */}
              {tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">태그</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={exportConfig.filters.tagIds.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-blue-100"
                        onClick={() => handleTagFilter(tag.id)}
                      >
                        {tag.name} ({tag.contactCount})
                      </Badge>
                    ))}
                  </div>
                  {exportConfig.filters.tagIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      선택된 태그가 있는 연락처만 내보내집니다
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary and Export */}
        <div className="space-y-6">
          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle>내보내기 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>형식:</span>
                  <Badge variant="outline">{exportConfig.format.toUpperCase()}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>연락처 수:</span>
                  <span className="font-medium">
                    {contactsResponse ? contactsResponse.totalCount.toLocaleString() : '-'}개
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>포함된 열:</span>
                  <span className="font-medium">{exportConfig.columns.length}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>예상 파일 크기:</span>
                  <span className="font-medium">
                    {contactsResponse ? getEstimatedFileSize(contactsResponse.totalCount, exportConfig.columns.length) : '-'}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">적용된 필터</p>
                <div className="space-y-1">
                  {exportConfig.filters.isActive !== undefined && (
                    <div className="text-sm text-gray-600">
                      • 상태: {exportConfig.filters.isActive ? '활성만' : '비활성만'}
                    </div>
                  )}
                  {exportConfig.filters.tagIds.length > 0 && (
                    <div className="text-sm text-gray-600">
                      • 태그: {exportConfig.filters.tagIds.length}개 선택됨
                    </div>
                  )}
                  {exportConfig.filters.isActive === undefined && exportConfig.filters.tagIds.length === 0 && (
                    <div className="text-sm text-gray-500">필터 없음 (전체)</div>
                  )}
                </div>
              </div>

              <Button 
                className="w-full"
                onClick={handleStartExport}
                disabled={exportMutation.isLoading || (exportJob?.status === 'processing')}
              >
                {exportMutation.isLoading || (exportJob?.status === 'processing') ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    내보내는 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    내보내기 시작
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Export Progress */}
          {exportJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {exportJob.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : exportJob.status === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                  <span>내보내기 진행상황</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>상태:</span>
                    <Badge 
                      variant={
                        exportJob.status === 'completed' ? 'default' : 
                        exportJob.status === 'failed' ? 'destructive' : 'secondary'
                      }
                    >
                      {exportJob.status === 'pending' && '대기중'}
                      {exportJob.status === 'processing' && '처리중'}
                      {exportJob.status === 'completed' && '완료'}
                      {exportJob.status === 'failed' && '실패'}
                    </Badge>
                  </div>
                  
                  {exportJob.status !== 'pending' && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>진행률:</span>
                        <span>{exportJob.progress}%</span>
                      </div>
                      <Progress value={exportJob.progress} className="h-2" />
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>처리된 레코드:</span>
                    <span>{exportJob.processedRecords.toLocaleString()} / {exportJob.totalRecords.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>소요 시간:</span>
                    <span>{formatDuration(exportJob.startedAt, exportJob.completedAt)}</span>
                  </div>
                </div>

                {exportJob.status === 'completed' && exportJob.downloadUrl && (
                  <>
                    <Separator />
                    <Button className="w-full" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      파일 다운로드
                    </Button>
                  </>
                )}

                {exportJob.status === 'failed' && exportJob.errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{exportJob.errorMessage}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}