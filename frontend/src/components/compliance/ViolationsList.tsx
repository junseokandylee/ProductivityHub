'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  XCircle, 
  Clock, 
  CheckCircle,
  Eye,
  MessageSquare,
  Calendar,
  User,
  ExternalLink,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ComplianceViolation {
  id: number;
  ruleCode: string;
  violationType: string;
  severity: string;
  description: string;
  resourceType: string;
  resourceId: number;
  campaignId?: number;
  userId?: number;
  status: string;
  actionTaken: string;
  riskScore: number;
  estimatedPenalty?: number;
  legalReference?: string;
  remediationSteps?: string;
  resolutionNotes?: string;
  resolvedBy?: number;
  resolvedAt?: string;
  requiresReporting: boolean;
  isReported: boolean;
  reportedAt?: string;
  reportingReference?: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  rule?: {
    name: string;
    legalCategory: string;
  };
  user?: {
    fullName: string;
    email: string;
  };
  campaign?: {
    name: string;
  };
}

export function ViolationsList() {
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedViolation, setSelectedViolation] = useState<ComplianceViolation | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Mock data for demonstration
  const mockViolations: ComplianceViolation[] = [
    {
      id: 1,
      ruleCode: 'ELECTION_LAW_001',
      violationType: 'MESSAGE_CONTENT',
      severity: 'HIGH',
      description: '후보자 비방성 내용이 포함된 메시지가 감지되었습니다.',
      resourceType: 'MESSAGE',
      resourceId: 12345,
      campaignId: 1,
      userId: 1,
      status: 'ACTIVE',
      actionTaken: 'BLOCKED',
      riskScore: 85,
      estimatedPenalty: 1000000,
      legalReference: '공직선거법 제110조',
      requiresReporting: true,
      isReported: false,
      occurredAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      rule: {
        name: '후보자 비방 금지',
        legalCategory: '공직선거법'
      },
      user: {
        fullName: '김선거',
        email: 'kim@example.com'
      },
      campaign: {
        name: '2024 국회의원 선거'
      }
    },
    {
      id: 2,
      ruleCode: 'FUNDING_LAW_002',
      violationType: 'SPENDING_LIMIT',
      severity: 'CRITICAL',
      description: '광고비 지출 한도 95%에 도달했습니다.',
      resourceType: 'SPENDING',
      resourceId: 67890,
      campaignId: 1,
      userId: 2,
      status: 'ACKNOWLEDGED',
      actionTaken: 'WARNED',
      riskScore: 95,
      legalReference: '정치자금법 제34조',
      requiresReporting: false,
      isReported: false,
      occurredAt: '2024-01-14T14:20:00Z',
      createdAt: '2024-01-14T14:20:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
      rule: {
        name: '광고비 지출 한도',
        legalCategory: '정치자금법'
      },
      user: {
        fullName: '이재정',
        email: 'lee@example.com'
      },
      campaign: {
        name: '2024 국회의원 선거'
      }
    },
    {
      id: 3,
      ruleCode: 'PRIVACY_LAW_001',
      violationType: 'CONSENT_VIOLATION',
      severity: 'MEDIUM',
      description: '유효하지 않은 개인정보 사용 동의로 메시지 발송이 차단되었습니다.',
      resourceType: 'CONTACT',
      resourceId: 11223,
      userId: 3,
      status: 'RESOLVED',
      actionTaken: 'BLOCKED',
      riskScore: 60,
      legalReference: '개인정보보호법 제15조',
      resolutionNotes: '해당 연락처의 동의를 재수집하고 유효성을 확인했습니다.',
      resolvedBy: 1,
      resolvedAt: '2024-01-15T11:45:00Z',
      requiresReporting: false,
      isReported: false,
      occurredAt: '2024-01-13T16:10:00Z',
      createdAt: '2024-01-13T16:10:00Z',
      updatedAt: '2024-01-15T11:45:00Z',
      rule: {
        name: '개인정보 사용 동의',
        legalCategory: '개인정보보호법'
      },
      user: {
        fullName: '박개인',
        email: 'park@example.com'
      }
    }
  ];

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        setLoading(true);
        // In real implementation, this would be an API call
        // const response = await fetch('/api/compliance/violations');
        // const data = await response.json();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setViolations(mockViolations);
      } catch (error) {
        console.error('Failed to fetch violations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-red-100 text-red-800 border-red-200';
      case 'ACKNOWLEDGED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ESCALATED': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'REPORTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <XCircle className="h-4 w-4" />;
      case 'ACKNOWLEDGED': return <Clock className="h-4 w-4" />;
      case 'ESCALATED': return <AlertTriangle className="h-4 w-4" />;
      case 'RESOLVED': return <CheckCircle className="h-4 w-4" />;
      case 'REPORTED': return <ExternalLink className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredViolations = violations.filter(violation => {
    const matchesSearch = violation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         violation.rule?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         violation.ruleCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || violation.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || violation.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleResolveViolation = async (violationId: number) => {
    try {
      // In real implementation, this would be an API call
      // await fetch(`/api/compliance/violations/${violationId}/status`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: 'RESOLVED', resolution: resolutionNotes })
      // });

      setViolations(prevViolations =>
        prevViolations.map(violation =>
          violation.id === violationId
            ? { 
                ...violation, 
                status: 'RESOLVED', 
                resolutionNotes,
                resolvedAt: new Date().toISOString(),
                resolvedBy: 1 // Current user ID
              }
            : violation
        )
      );

      setIsResolveDialogOpen(false);
      setResolutionNotes('');
      setSelectedViolation(null);
    } catch (error) {
      console.error('Failed to resolve violation:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>위반 사항 필터</CardTitle>
          <CardDescription>검색 및 필터 조건으로 위반 사항을 찾아보세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="위반 사항 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="심각도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 심각도</SelectItem>
                <SelectItem value="CRITICAL">심각</SelectItem>
                <SelectItem value="HIGH">높음</SelectItem>
                <SelectItem value="MEDIUM">보통</SelectItem>
                <SelectItem value="LOW">낮음</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="ACTIVE">활성</SelectItem>
                <SelectItem value="ACKNOWLEDGED">확인됨</SelectItem>
                <SelectItem value="ESCALATED">에스컬레이션</SelectItem>
                <SelectItem value="RESOLVED">해결됨</SelectItem>
                <SelectItem value="REPORTED">신고됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Violations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            위반 사항 목록 ({filteredViolations.length}건)
          </CardTitle>
          <CardDescription>발견된 규정 위반 사항과 처리 상태</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>위반 내용</TableHead>
                  <TableHead>법령</TableHead>
                  <TableHead>심각도</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>위험 점수</TableHead>
                  <TableHead>발생 시간</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredViolations.map((violation) => (
                  <TableRow key={violation.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{violation.rule?.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {violation.description}
                        </p>
                        {violation.legalReference && (
                          <p className="text-xs text-blue-600 mt-1">
                            {violation.legalReference}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{violation.rule?.legalCategory}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity === 'CRITICAL' ? '심각' :
                         violation.severity === 'HIGH' ? '높음' :
                         violation.severity === 'MEDIUM' ? '보통' : '낮음'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(violation.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(violation.status)}
                          {violation.status === 'ACTIVE' ? '활성' :
                           violation.status === 'ACKNOWLEDGED' ? '확인됨' :
                           violation.status === 'ESCALATED' ? '에스컬레이션' :
                           violation.status === 'RESOLVED' ? '해결됨' : '신고됨'}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          violation.riskScore >= 80 ? 'bg-red-500' :
                          violation.riskScore >= 60 ? 'bg-orange-500' :
                          violation.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span>{violation.riskScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(violation.occurredAt).toLocaleDateString('ko-KR')}
                        <br />
                        <span className="text-muted-foreground">
                          {new Date(violation.occurredAt).toLocaleTimeString('ko-KR')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedViolation(violation)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            상세 보기
                          </DropdownMenuItem>
                          {violation.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedViolation(violation);
                                setIsResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              해결 처리
                            </DropdownMenuItem>
                          )}
                          {violation.requiresReporting && !violation.isReported && (
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              선관위 신고
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredViolations.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">위반 사항이 없습니다</p>
              <p className="text-muted-foreground">
                현재 필터 조건에 해당하는 위반 사항을 찾을 수 없습니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Violation Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>위반 사항 해결</DialogTitle>
            <DialogDescription>
              위반 사항을 해결 처리하고 해결 내용을 기록하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedViolation && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{selectedViolation.rule?.name}</AlertTitle>
                <AlertDescription>{selectedViolation.description}</AlertDescription>
              </Alert>
            )}
            <div>
              <label className="text-sm font-medium">해결 내용</label>
              <Textarea
                placeholder="위반 사항을 어떻게 해결했는지 자세히 설명해주세요..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsResolveDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                onClick={() => selectedViolation && handleResolveViolation(selectedViolation.id)}
                disabled={!resolutionNotes.trim()}
              >
                해결 처리
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Violation Detail Dialog */}
      {selectedViolation && !isResolveDialogOpen && (
        <Dialog open={!!selectedViolation} onOpenChange={() => setSelectedViolation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>위반 사항 상세 정보</DialogTitle>
              <DialogDescription>
                위반 사항의 자세한 내용과 처리 상태를 확인하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">위반 유형</label>
                  <p className="text-sm">{selectedViolation.rule?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">관련 법령</label>
                  <p className="text-sm">{selectedViolation.rule?.legalCategory}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">심각도</label>
                  <Badge className={getSeverityColor(selectedViolation.severity)}>
                    {selectedViolation.severity === 'CRITICAL' ? '심각' :
                     selectedViolation.severity === 'HIGH' ? '높음' :
                     selectedViolation.severity === 'MEDIUM' ? '보통' : '낮음'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">위험 점수</label>
                  <p className="text-sm">{selectedViolation.riskScore}/100</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">위반 내용</label>
                <p className="text-sm bg-muted p-3 rounded mt-2">
                  {selectedViolation.description}
                </p>
              </div>

              {selectedViolation.legalReference && (
                <div>
                  <label className="text-sm font-medium">법적 근거</label>
                  <p className="text-sm text-blue-600">{selectedViolation.legalReference}</p>
                </div>
              )}

              {selectedViolation.estimatedPenalty && (
                <div>
                  <label className="text-sm font-medium">예상 과태료</label>
                  <p className="text-sm text-red-600">
                    {selectedViolation.estimatedPenalty.toLocaleString('ko-KR')}원
                  </p>
                </div>
              )}

              {selectedViolation.resolutionNotes && (
                <div>
                  <label className="text-sm font-medium">해결 내용</label>
                  <p className="text-sm bg-green-50 p-3 rounded mt-2">
                    {selectedViolation.resolutionNotes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium">발생 시간</label>
                  <p>{new Date(selectedViolation.occurredAt).toLocaleString('ko-KR')}</p>
                </div>
                {selectedViolation.resolvedAt && (
                  <div>
                    <label className="font-medium">해결 시간</label>
                    <p>{new Date(selectedViolation.resolvedAt).toLocaleString('ko-KR')}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}