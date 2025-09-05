'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  DollarSign,
  Eye,
  TrendingUp,
  FileText,
  Users,
  MessageSquare,
  Gavel
} from 'lucide-react';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';
import { ViolationsList } from '@/components/compliance/ViolationsList';
import { SpendingMonitor } from '@/components/compliance/SpendingMonitor';
import { RulesManager } from '@/components/compliance/RulesManager';
import { ComplianceReports } from '@/components/compliance/ComplianceReports';

export default function CompliancePage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'violations', 'spending', 'rules', 'reports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            규정 준수 모니터링
          </h1>
          <p className="text-muted-foreground">
            공직선거법, 정치자금법, 개인정보보호법 실시간 컴플라이언스 관리
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            보고서 생성
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            실시간 모니터링
          </Button>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 준수율</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <Progress value={98.5} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              지난 7일 동안
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 위반</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <p className="text-xs text-muted-foreground">
              중요: 2개, 일반: 1개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">지출 현황</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">75%</div>
            <Progress value={75} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              예산 한도 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">개인정보 동의</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">15,234</div>
            <p className="text-xs text-muted-foreground">
              유효한 동의서
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>주의 사항</AlertTitle>
        <AlertDescription>
          선거 D-14일까지 남았습니다. 
          <strong className="ml-1">공직선거법 제82조의5</strong>에 따라 인터넷 광고 제한이 적용됩니다.
        </AlertDescription>
      </Alert>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            대시보드
          </TabsTrigger>
          <TabsTrigger value="violations" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            위반 관리
          </TabsTrigger>
          <TabsTrigger value="spending" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            지출 모니터링
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Gavel className="h-4 w-4" />
            규칙 관리
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            보고서
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ComplianceDashboard />
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <ViolationsList />
        </TabsContent>

        <TabsContent value="spending" className="space-y-6">
          <SpendingMonitor />
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <RulesManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ComplianceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}