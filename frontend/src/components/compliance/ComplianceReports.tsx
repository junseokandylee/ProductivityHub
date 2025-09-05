'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download,
  Calendar,
  BarChart3,
  Shield,
  DollarSign,
  Gavel
} from 'lucide-react';

export function ComplianceReports() {
  const reportTypes = [
    {
      name: '일일 규정 준수 보고서',
      description: '일간 규정 위반 및 준수 현황',
      icon: Calendar,
      frequency: '일간',
      lastGenerated: '2024-01-15'
    },
    {
      name: '주간 규정 준수 보고서',
      description: '주간 규정 준수 트렌드 및 분석',
      icon: BarChart3,
      frequency: '주간',
      lastGenerated: '2024-01-14'
    },
    {
      name: '월간 종합 보고서',
      description: '월간 규정 준수 종합 현황 및 권고사항',
      icon: FileText,
      frequency: '월간',
      lastGenerated: '2024-01-01'
    },
    {
      name: '선관위 제출용 보고서',
      description: '중앙선거관리위원회 제출용 공식 보고서',
      icon: Shield,
      frequency: '분기',
      lastGenerated: '2023-12-31'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">규정 준수 보고서</h3>
          <p className="text-sm text-muted-foreground">
            한국 선거법 규정 준수 현황 보고서를 생성하고 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="보고서 종류" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">일일 보고서</SelectItem>
              <SelectItem value="weekly">주간 보고서</SelectItem>
              <SelectItem value="monthly">월간 보고서</SelectItem>
              <SelectItem value="official">공식 보고서</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            보고서 생성
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportTypes.map((report) => (
          <Card key={report.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <report.icon className="h-5 w-5" />
                {report.name}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Badge variant="outline">{report.frequency}</Badge>
                  <p className="text-xs text-muted-foreground">
                    마지막 생성: {new Date(report.lastGenerated).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="h-5 w-5 text-blue-500" />
              공직선거법 보고서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">97.8%</div>
            <p className="text-xs text-muted-foreground">준수율</p>
            <Button variant="outline" size="sm" className="w-full mt-3">
              <Download className="h-4 w-4 mr-2" />
              PDF 다운로드
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-green-500" />
              정치자금법 보고서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">96.2%</div>
            <p className="text-xs text-muted-foreground">준수율</p>
            <Button variant="outline" size="sm" className="w-full mt-3">
              <Download className="h-4 w-4 mr-2" />
              Excel 다운로드
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-purple-500" />
              개인정보보호법 보고서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">99.1%</div>
            <p className="text-xs text-muted-foreground">준수율</p>
            <Button variant="outline" size="sm" className="w-full mt-3">
              <Download className="h-4 w-4 mr-2" />
              PDF 다운로드
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>보고서 히스토리</CardTitle>
          <CardDescription>생성된 보고서 목록 및 다운로드</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4" />
            <p>보고서 히스토리 테이블이 여기에 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}