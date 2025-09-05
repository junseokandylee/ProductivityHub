'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  DollarSign,
  FileText,
  Users,
  MessageSquare,
  Gavel,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ComplianceMetrics {
  category: string;
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  compliancePercentage: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  resolvedViolations: number;
  violationResolutionRate: number;
}

interface ComplianceTrend {
  date: string;
  category: string;
  compliancePercentage: number;
  violationCount: number;
}

interface ComplianceDashboardData {
  overallMetrics: ComplianceMetrics;
  recentViolations: any[];
  activeAlerts: any[];
  spendingStatus: any;
  categoryBreakdown: ComplianceMetrics[];
  trends: ComplianceTrend[];
  lastUpdated: string;
}

export function ComplianceDashboard() {
  const [dashboardData, setDashboardData] = useState<ComplianceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  const mockTrendData = [
    { date: '2024-01-01', 공직선거법: 98, 정치자금법: 95, 개인정보보호법: 99 },
    { date: '2024-01-02', 공직선거법: 97, 정치자금법: 96, 개인정보보호법: 98 },
    { date: '2024-01-03', 공직선거법: 99, 정치자금법: 94, 개인정보보호법: 97 },
    { date: '2024-01-04', 공직선거법: 96, 정치자금법: 97, 개인정보보호법: 99 },
    { date: '2024-01-05', 공직선거법: 98, 정치자금법: 95, 개인정보보호법: 98 },
    { date: '2024-01-06', 공직선거법: 99, 정치자금법: 98, 개인정보보호법: 97 },
    { date: '2024-01-07', 공직선거법: 98, 정치자금법: 96, 개인정보보호법: 99 }
  ];

  const mockCategoryData = [
    { name: '공직선거법', value: 45, color: '#3b82f6' },
    { name: '정치자금법', value: 30, color: '#10b981' },
    { name: '개인정보보호법', value: 25, color: '#8b5cf6' }
  ];

  const mockViolationData = [
    { category: '메시지 내용', count: 12, severity: 'high' },
    { category: '지출 한도', count: 5, severity: 'critical' },
    { category: '개인정보 사용', count: 8, severity: 'medium' },
    { category: '시간 제한', count: 3, severity: 'low' }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // In real implementation, this would be an API call
        // const response = await fetch('/api/compliance/dashboard');
        // const data = await response.json();
        
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setDashboardData({
          overallMetrics: {
            category: '전체',
            totalValidations: 1250,
            passedValidations: 1232,
            failedValidations: 18,
            compliancePercentage: 98.5,
            criticalViolations: 2,
            highViolations: 5,
            mediumViolations: 8,
            lowViolations: 3,
            resolvedViolations: 15,
            violationResolutionRate: 83.3
          },
          recentViolations: [],
          activeAlerts: [],
          spendingStatus: {},
          categoryBreakdown: [],
          trends: [],
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">공직선거법</CardTitle>
            <Gavel className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">97.8%</div>
            <Progress value={97.8} className="mt-2" />
            <div className="flex items-center mt-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">+1.2% 지난 주 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">정치자금법</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">96.2%</div>
            <Progress value={96.2} className="mt-2" />
            <div className="flex items-center mt-2 text-xs">
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              <span className="text-red-600">-0.5% 지난 주 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">개인정보보호법</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">99.1%</div>
            <Progress value={99.1} className="mt-2" />
            <div className="flex items-center mt-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">+0.3% 지난 주 대비</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Compliance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>규정 준수 추세 (7일)</CardTitle>
            <CardDescription>법령별 규정 준수율 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ko-KR')}
                  formatter={(value: any) => [`${value}%`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="공직선거법" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="정치자금법" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                <Line type="monotone" dataKey="개인정보보호법" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Violations by Category */}
        <Card>
          <CardHeader>
            <CardTitle>위반 유형별 분포</CardTitle>
            <CardDescription>최근 30일 위반 사항</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {mockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Violations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 위반 사항</CardTitle>
              <CardDescription>지난 24시간 발생한 위반</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockViolationData.map((violation, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      violation.severity === 'critical' ? 'bg-red-500' :
                      violation.severity === 'high' ? 'bg-orange-500' :
                      violation.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{violation.category}</p>
                      <p className="text-xs text-muted-foreground">{violation.count}건 발생</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getSeverityColor(violation.severity)}>
                    {violation.severity === 'critical' ? '심각' :
                     violation.severity === 'high' ? '높음' :
                     violation.severity === 'medium' ? '보통' : '낮음'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>자주 사용하는 기능</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start h-auto p-4">
                <MessageSquare className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium">메시지 검증</p>
                  <p className="text-xs text-muted-foreground">캠페인 메시지 사전 검증</p>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <DollarSign className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium">지출 승인</p>
                  <p className="text-xs text-muted-foreground">정치자금법 지출 한도 확인</p>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <FileText className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium">규정 준수 보고서</p>
                  <p className="text-xs text-muted-foreground">월간/분기별 보고서 생성</p>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-auto p-4">
                <Users className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <p className="text-sm font-medium">개인정보 동의 관리</p>
                  <p className="text-xs text-muted-foreground">유권자 데이터 동의 현황</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 상태</CardTitle>
          <CardDescription>실시간 모니터링 상태</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">API 서버</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">데이터베이스</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">실시간 검증</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">외부 API</span>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              정상 운영
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}