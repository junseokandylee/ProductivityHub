'use client';

import Link from 'next/link';
import { CreditCard, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface QuotaData {
  current: number;
  limit: number;
  period: string;
  resetDate: string;
  warningThreshold: number;
  criticalThreshold: number;
  channels: {
    sms: { used: number; limit: number };
    kakao: { used: number; limit: number };
    email: { used: number; limit: number };
  };
}

interface QuotaWidgetProps {
  data?: QuotaData;
  loading?: boolean;
  error?: string;
}

export function QuotaWidget({ data, loading = false, error }: QuotaWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-20" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-32" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <CreditCard className="h-5 w-5" />
            <span>쿼터 사용량</span>
          </CardTitle>
          <CardDescription>월간 발송 한도 및 사용량</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-6">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">쿼터 정보를 불러올 수 없습니다.</p>
            <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default data when no data is provided
  const quotaData: QuotaData = data || {
    current: 0,
    limit: 10000,
    period: '월간',
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    warningThreshold: 80,
    criticalThreshold: 95,
    channels: {
      sms: { used: 0, limit: 5000 },
      kakao: { used: 0, limit: 3000 },
      email: { used: 0, limit: 2000 },
    },
  };

  const usagePercentage = (quotaData.current / quotaData.limit) * 100;
  const isWarning = usagePercentage >= quotaData.warningThreshold;
  const isCritical = usagePercentage >= quotaData.criticalThreshold;
  
  const formatNumber = (num: number) => num.toLocaleString();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  };

  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusBadge = () => {
    if (isCritical) {
      return <Badge variant="destructive" className="text-xs">위험</Badge>;
    }
    if (isWarning) {
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">주의</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 text-xs">정상</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>쿼터 사용량</span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>{quotaData.period} 발송 한도 및 사용량</CardDescription>
        </div>
        <Link href="/settings/quota">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-1" />
            설정
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 전체 사용량 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">전체 사용량</span>
            <span className="text-sm text-gray-600">
              {formatNumber(quotaData.current)} / {formatNumber(quotaData.limit)}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-3"
          />
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{usagePercentage.toFixed(1)}% 사용</span>
            <span>{formatDate(quotaData.resetDate)} 리셋</span>
          </div>
        </div>

        {/* 경고 메시지 */}
        {isCritical && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">쿼터 한도 임박</span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              발송 한도의 95%를 초과했습니다. 추가 발송이 제한될 수 있습니다.
            </p>
          </div>
        )}

        {isWarning && !isCritical && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">사용량 증가</span>
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              발송 한도의 80%를 초과했습니다. 사용량을 모니터링하세요.
            </p>
          </div>
        )}

        {/* 채널별 사용량 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">채널별 사용량</h4>
          
          {Object.entries(quotaData.channels).map(([channel, { used, limit }]) => {
            const channelPercentage = (used / limit) * 100;
            const channelNames = {
              sms: 'SMS',
              kakao: '카카오',
              email: '이메일',
            };

            return (
              <div key={channel} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">{channelNames[channel as keyof typeof channelNames]}</span>
                  <span className="text-xs text-gray-600">
                    {formatNumber(used)} / {formatNumber(limit)}
                  </span>
                </div>
                <Progress value={channelPercentage} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* 액션 버튼들 */}
        <div className="flex space-x-2 pt-2">
          <Link href="/reports/quota" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              상세 리포트
            </Button>
          </Link>
          <Link href="/settings/billing" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              요금제 변경
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}