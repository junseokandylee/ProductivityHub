'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  BarChart3 
} from 'lucide-react';

export function SpendingMonitor() {
  const spendingCategories = [
    { name: '광고비', current: 15000000, limit: 20000000, percentage: 75 },
    { name: '통신비', current: 8000000, limit: 10000000, percentage: 80 },
    { name: '교통비', current: 3000000, limit: 5000000, percentage: 60 },
    { name: '사무소비', current: 7000000, limit: 8000000, percentage: 87.5 }
  ];

  return (
    <div className="space-y-6">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>지출 주의</AlertTitle>
        <AlertDescription>
          사무소비 항목이 한도의 87.5%에 도달했습니다. 추가 지출 시 정치자금법 위반 가능성이 있습니다.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {spendingCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(category.percentage)}%
              </div>
              <Progress 
                value={category.percentage} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {category.current.toLocaleString('ko-KR')}원 / {category.limit.toLocaleString('ko-KR')}원
              </p>
              {category.percentage > 80 && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  한도 근접
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            지출 현황 상세
          </CardTitle>
          <CardDescription>정치자금법에 따른 카테고리별 지출 한도 관리</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4" />
            <p>지출 모니터링 차트가 여기에 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}