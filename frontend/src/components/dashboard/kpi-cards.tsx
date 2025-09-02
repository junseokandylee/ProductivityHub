'use client';

import { TrendingUp, TrendingDown, Send, CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIData {
  sent: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
  successRate: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
  openRate: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
  failures: {
    value: number;
    change: number;
    trend: 'up' | 'down';
  };
}

interface KPICardsProps {
  data?: KPIData;
  loading?: boolean;
  error?: string;
}

export function KPICards({ data, loading = false, error }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">데이터를 불러올 수 없습니다</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Default data when no data is provided
  const kpiData: KPIData = data || {
    sent: { value: 0, change: 0, trend: 'up' },
    successRate: { value: 0, change: 0, trend: 'up' },
    openRate: { value: 0, change: 0, trend: 'up' },
    failures: { value: 0, change: 0, trend: 'down' },
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  const formatChange = (change: number, trend: 'up' | 'down') => {
    const isPositive = trend === 'up' ? change > 0 : change < 0;
    const Icon = trend === 'up' ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center text-xs ${color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 발송된 메시지 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">발송된 메시지</CardTitle>
          <Send className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(kpiData.sent.value)}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">전월 대비</p>
            {formatChange(kpiData.sent.change, kpiData.sent.trend)}
          </div>
        </CardContent>
      </Card>

      {/* 성공률 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">성공률</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(kpiData.successRate.value)}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">전월 대비</p>
            {formatChange(kpiData.successRate.change, kpiData.successRate.trend)}
          </div>
        </CardContent>
      </Card>

      {/* 열람률 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">열람률</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercentage(kpiData.openRate.value)}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">전월 대비</p>
            {formatChange(kpiData.openRate.change, kpiData.openRate.trend)}
          </div>
        </CardContent>
      </Card>

      {/* 실패 건수 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">실패 건수</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(kpiData.failures.value)}</div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">전월 대비</p>
            {formatChange(kpiData.failures.change, kpiData.failures.trend)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}