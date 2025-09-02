'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Users,
  MessageSquare,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Pause,
  Play,
  Edit,
  Copy
} from 'lucide-react';
import { useCampaign } from '@/lib/hooks/use-campaigns';
import { useCampaignDetails } from '@/hooks/use-campaign-details';
import { useCampaignMetrics } from '@/hooks/use-campaign-metrics';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return { 
        color: 'bg-green-100 text-green-800 border-green-300', 
        icon: Play, 
        text: '진행 중' 
      };
    case 'completed':
      return { 
        color: 'bg-blue-100 text-blue-800 border-blue-300', 
        icon: CheckCircle, 
        text: '완료됨' 
      };
    case 'scheduled':
      return { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
        icon: Clock, 
        text: '예약됨' 
      };
    case 'paused':
      return { 
        color: 'bg-gray-100 text-gray-800 border-gray-300', 
        icon: Pause, 
        text: '일시중지' 
      };
    case 'cancelled':
      return { 
        color: 'bg-red-100 text-red-800 border-red-300', 
        icon: XCircle, 
        text: '취소됨' 
      };
    case 'draft':
      return { 
        color: 'bg-gray-100 text-gray-600 border-gray-300', 
        icon: Edit, 
        text: '초안' 
      };
    default:
      return { 
        color: 'bg-gray-100 text-gray-800 border-gray-300', 
        icon: AlertCircle, 
        text: status 
      };
  }
};

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  
  const { data: campaign, isLoading, error } = useCampaign(campaignId);
  const { data: campaignDetails } = useCampaignDetails(campaignId);
  const { data: metrics } = useCampaignMetrics(campaignId, { 
    windowMinutes: 60,
    enabled: campaign?.status === 'active'
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          캠페인을 불러올 수 없습니다. 다시 시도해주세요.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          캠페인을 찾을 수 없습니다.
        </AlertDescription>
      </Alert>
    );
  }

  const statusConfig = getStatusConfig(campaign.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Campaign Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <StatusIcon className="h-5 w-5 text-gray-500" />
              <Badge className={statusConfig.color}>
                {statusConfig.text}
              </Badge>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>생성일:</span>
                <span>{new Date(campaign.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              {campaign.scheduledAt && (
                <div className="flex justify-between">
                  <span>예약일:</span>
                  <span>{new Date(campaign.scheduledAt).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
              {campaign.completedAt && (
                <div className="flex justify-between">
                  <span>완료일:</span>
                  <span>{new Date(campaign.completedAt).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipients Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">수신자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">
                {campaign.recipientCount?.toLocaleString() || '—'}
              </span>
              <span className="text-sm text-gray-500">명</span>
            </div>
            {metrics?.currentMetrics && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-600">성공:</span>
                  <span className="font-medium">
                    {metrics.currentMetrics.sent?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">실패:</span>
                  <span className="font-medium">
                    {metrics.currentMetrics.failed?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Rate Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">성과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {campaign.recipientCount && campaign.successCount !== undefined
                  ? `${Math.round((campaign.successCount / campaign.recipientCount) * 100)}%`
                  : '—'}
              </span>
              <span className="text-sm text-gray-500">성공률</span>
            </div>
            {metrics?.currentMetrics && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">열람률:</span>
                  <span className="font-medium">
                    {metrics.currentMetrics.opened 
                      ? `${Math.round((metrics.currentMetrics.opened / (metrics.currentMetrics.sent || 1)) * 100)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">클릭률:</span>
                  <span className="font-medium">
                    {metrics.currentMetrics.clicked
                      ? `${Math.round((metrics.currentMetrics.clicked / (metrics.currentMetrics.sent || 1)) * 100)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>캠페인 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">캠페인 이름</label>
              <p className="mt-1 text-lg font-semibold">{campaign.name}</p>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-600">채널</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {campaign.channels.map((channel) => (
                  <Badge key={channel} variant="outline">
                    {channel === 'sms' ? 'SMS' : 
                     channel === 'kakao' ? '카카오톡' :
                     channel === 'email' ? '이메일' : 
                     channel === 'push' ? '푸시알림' : channel}
                  </Badge>
                ))}
              </div>
            </div>

            {campaign.tags && campaign.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-600">태그</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {campaign.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                복제
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
              {campaign.status === 'active' && (
                <Button variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  일시중지
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Targeting Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>타겟팅 설정</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaignDetails?.targetingConfig ? (
              <>
                {campaignDetails.targetingConfig.segmentIds && campaignDetails.targetingConfig.segmentIds.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">세그먼트</label>
                    <p className="mt-1">
                      {campaignDetails.targetingConfig.segmentIds.length}개 세그먼트 선택됨
                    </p>
                  </div>
                )}

                {campaignDetails.targetingConfig.channels && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-600">우선 채널</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {campaignDetails.targetingConfig.channels.map((channel, index) => (
                          <Badge key={channel} variant="outline" className="relative">
                            <span className="absolute -top-1 -left-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                              {index + 1}
                            </span>
                            {channel === 'sms' ? 'SMS' : 
                             channel === 'kakao' ? '카카오톡' :
                             channel === 'email' ? '이메일' : channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {campaignDetails.targetingConfig.filters && Object.keys(campaignDetails.targetingConfig.filters).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-600">필터 조건</label>
                      <div className="mt-1 text-sm text-gray-600">
                        {Object.keys(campaignDetails.targetingConfig.filters).length}개 필터 적용됨
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">타겟팅 설정을 불러올 수 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* A/B Test Information */}
      {campaignDetails?.abTestConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>A/B 테스트</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">테스트 유형</label>
                <p className="mt-1 font-medium">
                  {campaignDetails.abTestConfig.testType === 'message_content' ? '메시지 내용' :
                   campaignDetails.abTestConfig.testType === 'send_time' ? '발송 시간' :
                   campaignDetails.abTestConfig.testType === 'channel_mix' ? '채널 조합' :
                   campaignDetails.abTestConfig.testType === 'targeting' ? '타겟팅' :
                   campaignDetails.abTestConfig.testType}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">시작일</label>
                <p className="mt-1 font-medium">
                  {new Date(campaignDetails.abTestConfig.startDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
              {campaignDetails.abTestConfig.endDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600">종료일</label>
                  <p className="mt-1 font-medium">
                    {new Date(campaignDetails.abTestConfig.endDate).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">변형</label>
                <p className="mt-1 font-medium">
                  {campaignDetails.abTestConfig.variants.length}개 변형
                </p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-3">
              <h4 className="font-medium">변형 할당</h4>
              {campaignDetails.abTestConfig.variants.map((variant) => (
                <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{variant.name}</span>
                    {variant.description && (
                      <p className="text-sm text-gray-600 mt-1">{variant.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">{variant.allocation}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Templates */}
      {campaignDetails?.messageTemplates && campaignDetails.messageTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>메시지 템플릿</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignDetails.messageTemplates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {template.channel === 'sms' ? 'SMS' :
                       template.channel === 'kakao' ? '카카오톡' :
                       template.channel === 'email' ? '이메일' : template.channel}
                    </Badge>
                    {template.variantId && (
                      <Badge variant="secondary" className="text-xs">
                        변형: {template.variantId}
                      </Badge>
                    )}
                  </div>
                  {template.subject && (
                    <div className="mb-2">
                      <label className="text-sm font-medium text-gray-600">제목</label>
                      <p className="mt-1">{template.subject}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">내용</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                      <p className="whitespace-pre-wrap">{template.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}