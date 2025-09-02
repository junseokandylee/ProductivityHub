'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWizard } from '@/lib/context/campaign-wizard-context';
import { useCampaignError, ErrorDisplay } from '@/lib/context/campaign-error-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CampaignConfirmationModal } from '@/components/ui/campaign-confirmation-modal';
import { WizardStepFeedback } from '@/components/ui/wizard-feedback';
import { useToast } from '@/hooks/use-toast';
import { mapApiError } from '@/lib/utils/error-handling';
import { 
  CheckCircle2, 
  Users, 
  MessageSquare, 
  Settings, 
  Send,
  AlertCircle,
  DollarSign,
  Clock,
  Calendar,
  Eye,
  Edit,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useEstimateCampaign, useCreateCampaign } from '@/lib/hooks/use-campaigns';
import type { EstimateCampaignRequest, CreateCampaignRequest } from '@/lib/api/campaigns';

export function ReviewStep() {
  const { state, dispatch, goToStep, validateCurrentStep, resetWizard } = useWizard();
  const { addStepError, clearStepErrors, setLoading } = useCampaignError();
  const router = useRouter();
  const { toast } = useToast();
  
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // API hooks
  const estimateMutation = useEstimateCampaign();
  const createMutation = useCreateCampaign();

  // Build request payload from wizard state
  const buildEstimateRequest = (): EstimateCampaignRequest => {
    return {
      audience: {
        groupIds: state.audience.groupIds,
        segmentIds: state.audience.segmentIds,
        filterJson: state.audience.filterJson,
        includeAll: state.audience.includeAll
      },
      channels: state.channels.channelOrder.map((channelName, index) => ({
        channel: channelName,
        orderIndex: index,
        fallbackEnabled: index > 0 && state.channels.fallbackEnabled
      }))
    };
  };

  const buildCreateRequest = (): CreateCampaignRequest => {
    return {
      name: state.message.name,
      messageTitle: state.message.messageTitle,
      messageBody: state.message.messageBody,
      variables: state.message.variables,
      channels: state.channels.channelOrder.map((channelName, index) => ({
        channel: channelName,
        orderIndex: index,
        fallbackEnabled: index > 0 && state.channels.fallbackEnabled
      })),
      audience: {
        groupIds: state.audience.groupIds,
        segmentIds: state.audience.segmentIds,
        filterJson: state.audience.filterJson,
        includeAll: state.audience.includeAll
      },
      scheduledAt: scheduleEnabled && scheduledDate && scheduledTime 
        ? `${scheduledDate}T${scheduledTime}:00` 
        : undefined
    };
  };

  // Auto-estimate on component mount
  useEffect(() => {
    const request = buildEstimateRequest();
    if (state.channels.channelOrder.length > 0) {
      setLoading(true, '비용을 추정하고 있습니다...');
      estimateMutation.mutate(request, {
        onSuccess: () => {
          setLoading(false);
          clearStepErrors(4);
          setValidationError(null);
          setQuotaError(null);
        },
        onError: (error) => {
          setLoading(false);
          const mappedError = mapApiError(error);
          addStepError(4, mappedError);
        }
      });
    }
  }, []);

  const handleEstimate = () => {
    const request = buildEstimateRequest();
    setLoading(true, '비용을 다시 추정하고 있습니다...');
    clearStepErrors(4);
    setValidationError(null);
    setQuotaError(null);
    
    estimateMutation.mutate(request, {
      onSuccess: () => {
        setLoading(false);
        toast({
          title: '추정 완료',
          description: '최신 비용이 반영되었습니다.',
        });
      },
      onError: (error) => {
        setLoading(false);
        const mappedError = mapApiError(error);
        addStepError(4, mappedError);
        toast({
          title: '추정 실패',
          description: mappedError.message,
          variant: 'destructive',
        });
      }
    });
  };

  const handleSendClick = () => {
    // Clear previous errors
    setValidationError(null);
    setQuotaError(null);
    clearStepErrors(4);
    
    const validation = validateCurrentStep();
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      setValidationError(errorMessage);
      addStepError(4, {
        title: '검증 오류',
        message: errorMessage,
        severity: 'error',
        actionable: true,
        retryable: true,
      });
      return;
    }

    if (!estimateMutation.data) {
      const errorMessage = '캠페인을 발송하기 전에 비용을 추정해주세요.';
      setValidationError(errorMessage);
      addStepError(4, {
        title: '비용 추정 필요',
        message: errorMessage,
        severity: 'warning',
        actionable: true,
        retryable: true,
      });
      return;
    }

    if (!estimateMutation.data.quotaOk) {
      const errorMessage = '일일 할당량을 초과하여 캠페인을 발송할 수 없습니다.';
      setQuotaError(errorMessage);
      addStepError(4, {
        title: '할당량 초과',
        message: errorMessage,
        severity: 'error',
        actionable: false,
        retryable: false,
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSend = () => {
    const request = buildCreateRequest();
    setLoading(true, '캠페인을 발송하고 있습니다...');
    
    createMutation.mutate(request, {
      onSuccess: (response) => {
        setLoading(false);
        toast({
          title: "캠페인 발송 시작",
          description: `캠페인이 성공적으로 생성되었습니다. 발송을 시작합니다.`,
        });
        
        // Reset wizard state
        resetWizard();
        
        // Close modal
        setShowConfirmModal(false);
        
        // Redirect to campaigns list or monitoring page
        router.push('/campaigns');
      },
      onError: (error: any) => {
        setLoading(false);
        const mappedError = mapApiError(error);
        
        // Close modal first
        setShowConfirmModal(false);
        
        // Show error in step
        addStepError(4, mappedError);
        
        toast({
          title: "발송 실패",
          description: mappedError.message,
          variant: "destructive",
        });
      }
    });
  };

  // Summary data helpers
  const getSummaryData = () => {
    const audienceSummary = state.audience.includeAll
      ? "전체 연락처"
      : [
          ...state.audience.groupIds.map(id => `그룹 ${id.split('-')[1] || id}`),
          ...state.audience.segmentIds.map(id => `세그먼트 ${id.split('-')[1] || id}`)
        ].join(', ') || '맞춤 필터';

    const channelSummary = state.channels.channelOrder.join(' → ');

    return { audienceSummary, channelSummary };
  };

  const { audienceSummary, channelSummary } = getSummaryData();
  const estimate = estimateMutation.data;
  const isEstimating = estimateMutation.isPending;
  const isSending = createMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          캠페인 검토 및 발송
        </h2>
        <p className="text-gray-600 mt-1">
          캠페인 설정을 검토하고 발송하세요. 발송 전 모든 설정을 수정할 수 있습니다.
        </p>
      </div>

      {/* Real-time feedback */}
      <WizardStepFeedback
        stepNumber={4}
        isLoading={isEstimating}
        loadingText={isEstimating ? "비용을 추정하는 중..." : undefined}
      />

      {/* Inline Error Alerts */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>검증 오류</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      
      {quotaError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>할당량 초과</AlertTitle>
          <AlertDescription>
            {quotaError} 내일 다시 시도하시거나 수신자 수를 줄여주세요.
          </AlertDescription>
        </Alert>
      )}
      
      {!estimate && !isEstimating && !estimateMutation.error && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>비용 추정 필요</AlertTitle>
          <AlertDescription>
            캠페인 발송 전에 비용을 추정해주세요.
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleEstimate}
              className="p-0 h-auto ml-2 text-orange-700"
            >
              지금 추정하기
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {estimate && !estimate.quotaOk && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>할당량 부족</AlertTitle>
          <AlertDescription>
            이 캠페인은 일일 할당량을 {Math.round((estimate.recipientCount / 45000) * 100)}% 초과합니다.
            수신자를 줄이거나 내일 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* Campaign Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Audience Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                대상 설정
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => goToStep(1)}
              >
                <Edit className="h-3 w-3 mr-1" />
                수정
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">선택된 대상</p>
                <p className="text-sm text-gray-600">{audienceSummary}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">예상 수신자 수</p>
                <p className="text-sm font-mono text-gray-900">
                  {estimate ? `${estimate.recipientCount.toLocaleString()}명` : '계산 중...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                메시지 설정
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => goToStep(2)}
              >
                <Edit className="h-3 w-3 mr-1" />
                수정
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">캠페인명</p>
                <p className="text-sm text-gray-600">{state.message.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">메시지 길이</p>
                <p className="text-sm text-gray-600">{state.message.messageBody.length}자</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">개인화 변수</p>
                <p className="text-sm text-gray-600">{Object.keys(state.message.variables).length}개</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-500" />
                채널 설정
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => goToStep(3)}
              >
                <Edit className="h-3 w-3 mr-1" />
                수정
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">전송 순서</p>
                <p className="text-sm text-gray-600">{channelSummary}</p>
                <div className="flex gap-1 mt-2">
                  {state.channels.channelOrder.map((channelName, index) => (
                    <Badge key={channelName} variant="secondary" className="text-xs">
                      {index + 1}. {channelName}
                      {index > 0 && state.channels.fallbackEnabled && ' (폴백)'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Estimation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              비용 및 할당량 예상
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEstimate}
              disabled={isEstimating}
            >
              {isEstimating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  계산 중...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  다시 계산
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {estimateMutation.isError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">비용 계산 실패</p>
                  <p className="text-sm text-red-700 mt-1">
                    비용을 계산할 수 없습니다. 다시 시도해주세요.
                  </p>
                </div>
              </div>
            </div>
          ) : estimate ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">수신자 수</p>
                </div>
                <p className="text-lg font-mono text-blue-900 mt-1">
                  {estimate.recipientCount.toLocaleString()}명
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">예상 비용</p>
                </div>
                <p className="text-lg font-mono text-green-900 mt-1">
                  {estimate.estimatedCost.toLocaleString()}원
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                estimate.quotaOk 
                  ? 'bg-green-50' 
                  : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${
                    estimate.quotaOk 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`} />
                  <p className={`text-sm font-medium ${
                    estimate.quotaOk 
                      ? 'text-green-800' 
                      : 'text-red-800'
                  }`}>
                    할당량 상태
                  </p>
                </div>
                <p className={`text-lg font-mono mt-1 ${
                  estimate.quotaOk 
                    ? 'text-green-900' 
                    : 'text-red-900'
                }`}>
                  {estimate.quotaOk ? '사용 가능' : '초과됨'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">비용을 계산하는 중입니다...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Option */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            발송 일정 (선택사항)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="schedule-enabled"
              checked={scheduleEnabled}
              onCheckedChange={(checked) => setScheduleEnabled(checked as boolean)}
            />
            <Label htmlFor="schedule-enabled">예약 발송 사용</Label>
          </div>

          {scheduleEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled-date">발송 날짜</Label>
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="scheduled-time">발송 시간</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="flex justify-center pt-6">
        <Button
          size="lg"
          onClick={handleSendClick}
          disabled={!estimate || !estimate.quotaOk || isEstimating}
          className="px-8 bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4 mr-2" />
          캠페인 발송
        </Button>
      </div>

      {/* Confirmation Modal */}
      <CampaignConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSend}
        isLoading={isSending}
        campaignData={{
          name: state.message.name,
          messageBody: state.message.messageBody,
          channelOrder: state.channels.channelOrder,
          fallbackEnabled: state.channels.fallbackEnabled
        }}
        estimate={estimate}
      />

      {/* Validation Errors */}
      {state.errors[4] && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {state.errors[4].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}