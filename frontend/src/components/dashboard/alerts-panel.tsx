'use client';

import Link from 'next/link';
import { AlertTriangle, Info, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
  actionText?: string;
  dismissible?: boolean;
}

interface AlertsPanelProps {
  alerts?: SystemAlert[];
  loading?: boolean;
  error?: string;
  onDismiss?: (alertId: string) => void;
}

const alertConfig = {
  error: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50 border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-800',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    badgeColor: 'bg-yellow-100 text-yellow-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800',
  },
};

const typeLabels = {
  error: '오류',
  warning: '주의',
  info: '정보',
  success: '성공',
};

export function AlertsPanel({ alerts, loading = false, error, onDismiss }: AlertsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>실시간 알림</CardTitle>
          <CardDescription>시스템 알림 및 중요 메시지</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle>실시간 알림</CardTitle>
          <CardDescription>시스템 알림 및 중요 메시지</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-6">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">알림을 불러올 수 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // Default empty state
  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>실시간 알림</CardTitle>
          <CardDescription>시스템 알림 및 중요 메시지</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">새로운 알림이 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">모든 시스템이 정상 작동 중입니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <span>실시간 알림</span>
            {alerts.filter(alert => alert.type === 'error' || alert.type === 'warning').length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alerts.filter(alert => alert.type === 'error' || alert.type === 'warning').length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>시스템 알림 및 중요 메시지</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.slice(0, 10).map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;

            return (
              <Alert key={alert.id} className={`${config.bgColor} relative`}>
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertDescription className={`font-medium ${config.textColor}`}>
                      {alert.title}
                    </AlertDescription>
                    <Badge className={`text-xs ${config.badgeColor}`}>
                      {typeLabels[alert.type]}
                    </Badge>
                  </div>
                  
                  <AlertDescription className={`text-sm ${config.textColor} opacity-90 mb-2`}>
                    {alert.message}
                  </AlertDescription>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${config.textColor} opacity-75`}>
                      {formatTime(alert.timestamp)}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      {alert.actionUrl && alert.actionText && (
                        <Link href={alert.actionUrl}>
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            {alert.actionText}
                          </Button>
                        </Link>
                      )}
                      
                      {alert.dismissible && onDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onDismiss(alert.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
        
        {alerts.length > 10 && (
          <div className="text-center pt-3 border-t mt-3">
            <Link href="/notifications">
              <Button variant="ghost" size="sm">
                모든 알림 보기 ({alerts.length})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}