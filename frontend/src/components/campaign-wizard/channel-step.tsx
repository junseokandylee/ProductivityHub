'use client';

import React from 'react';
import { useWizard } from '@/lib/context/campaign-wizard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChannelPriorityList } from '@/components/ui/channel-priority-list';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useChannelStatus, useCurrentQuota } from '@/lib/hooks/use-contacts';
import { WizardStepFeedback } from '@/components/ui/wizard-feedback';

export function ChannelStep() {
  const { state, dispatch } = useWizard();
  
  // Fetch channel status and quota data
  const { 
    data: channelStatuses = [], 
    isLoading: isLoadingChannels,
    error: channelError 
  } = useChannelStatus();
  
  const { 
    data: quotaData,
    isLoading: isLoadingQuota,
    error: quotaError 
  } = useCurrentQuota();

  const handleChannelsReorder = (newOrder: string[]) => {
    dispatch({
      type: 'SET_CHANNELS',
      payload: {
        channelOrder: newOrder
      }
    });
  };

  const handleFallbackToggle = (enabled: boolean) => {
    dispatch({
      type: 'SET_CHANNELS',
      payload: {
        fallbackEnabled: enabled
      }
    });
  };

  const getValidationStatus = () => {
    if (state.channels.channelOrder.length === 0) {
      return {
        isValid: false,
        message: '최소 하나의 채널을 선택해야 합니다.',
        type: 'error' as const
      };
    }

    const primaryChannel = state.channels.channelOrder[0];
    const primaryChannelStatus = channelStatuses.find(c => c.channel === primaryChannel);
    
    if (primaryChannelStatus && !primaryChannelStatus.isEnabled) {
      return {
        isValid: false,
        message: '주 채널이 비활성화되어 있습니다. 다른 채널을 선택하거나 폴백을 활성화하세요.',
        type: 'error' as const
      };
    }

    if (primaryChannelStatus?.hasWarning && state.channels.channelOrder.length === 1 && !state.channels.fallbackEnabled) {
      return {
        isValid: true,
        message: '주 채널에 경고가 있습니다. 폴백 채널 추가를 권장합니다.',
        type: 'warning' as const
      };
    }

    return {
      isValid: true,
      message: '채널 설정이 완료되었습니다.',
      type: 'success' as const
    };
  };

  const validationStatus = getValidationStatus();

  if (isLoadingChannels || isLoadingQuota) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-500" />
            채널 우선순위 설정
          </h2>
          <p className="text-gray-600 mt-1">
            메시지 전송 채널의 우선순위와 폴백 설정을 구성합니다.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">채널 정보를 불러오는 중...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (channelError || quotaError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-500" />
            채널 우선순위 설정
          </h2>
          <p className="text-gray-600 mt-1">
            메시지 전송 채널의 우선순위와 폴백 설정을 구성합니다.
          </p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">채널 정보를 불러올 수 없습니다</p>
                <p className="text-sm text-red-700 mt-1">
                  네트워크 연결을 확인하고 페이지를 새로고침해 주세요.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  오류: {channelError?.message || quotaError?.message}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-500" />
          채널 우선순위 설정
        </h2>
        <p className="text-gray-600 mt-1">
          메시지 전송 채널의 우선순위와 폴백 설정을 구성합니다.
        </p>
      </div>

      {/* Real-time feedback */}
      <WizardStepFeedback
        stepNumber={3}
        isLoading={isLoadingChannels || isLoadingQuota}
        loadingText={isLoadingChannels ? "채널 상태를 확인하는 중..." : isLoadingQuota ? "할당량 정보를 불러오는 중..." : undefined}
      />

      {/* Quota Overview */}
      {quotaData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">오늘의 할당량 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(quotaData.channelQuotas).map(([channel, quota]) => (
                <div key={channel} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium text-sm">{channel}</p>
                    <p className="text-xs text-gray-600">
                      {quota.used.toLocaleString()} / {quota.limit.toLocaleString()}
                    </p>
                  </div>
                  <Badge 
                    variant={quota.isNearLimit ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(quota.usagePercentage)}%
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-800">전체 사용량</span>
                <span className="font-mono text-blue-800">
                  {quotaData.totalUsedToday.toLocaleString()} / {quotaData.totalDailyLimit.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Priority Configuration */}
      <ChannelPriorityList
        channels={channelStatuses}
        selectedChannels={state.channels.channelOrder}
        onChannelsReorder={handleChannelsReorder}
        fallbackEnabled={state.channels.fallbackEnabled}
        onFallbackToggle={handleFallbackToggle}
      />

      {/* Validation Status */}
      <Card className={`border-2 ${
        validationStatus.type === 'error' ? 'border-red-200 bg-red-50' :
        validationStatus.type === 'warning' ? 'border-orange-200 bg-orange-50' :
        'border-green-200 bg-green-50'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            {validationStatus.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            ) : validationStatus.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium ${
                validationStatus.type === 'error' ? 'text-red-800' :
                validationStatus.type === 'warning' ? 'text-orange-800' :
                'text-green-800'
              }`}>
                {validationStatus.type === 'error' ? '설정 오류' :
                 validationStatus.type === 'warning' ? '주의사항' :
                 '설정 완료'}
              </p>
              <p className={`text-sm mt-1 ${
                validationStatus.type === 'error' ? 'text-red-700' :
                validationStatus.type === 'warning' ? 'text-orange-700' :
                'text-green-700'
              }`}>
                {validationStatus.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {state.errors[3] && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {state.errors[3].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}