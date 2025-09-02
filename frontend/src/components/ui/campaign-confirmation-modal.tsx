'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Send, 
  Users, 
  MessageSquare,
  DollarSign,
  Loader2
} from 'lucide-react';
import type { EstimateCampaignResponse } from '@/lib/api/campaigns';

interface CampaignConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  campaignData: {
    name: string;
    messageBody: string;
    channelOrder: string[];
    fallbackEnabled: boolean;
  };
  estimate: EstimateCampaignResponse | null;
}

export function CampaignConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  campaignData,
  estimate
}: CampaignConfirmationModalProps) {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [legalChecked, setLegalChecked] = useState(false);

  const canProceed = confirmChecked && legalChecked && estimate?.quotaOk;

  const handleConfirm = () => {
    if (canProceed) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setConfirmChecked(false);
    setLegalChecked(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            캠페인 발송 확인
          </DialogTitle>
          <DialogDescription>
            캠페인 발송 전 마지막 확인입니다. 발송 후에는 취소할 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Summary */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">캠페인 요약</h3>
            
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">캠페인명</span>
                </div>
                <p className="text-sm text-gray-700 pl-6">{campaignData.name}</p>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">수신자 수</span>
                </div>
                <p className="text-sm text-gray-700 pl-6">
                  {estimate ? `${estimate.recipientCount.toLocaleString()}명` : '계산 중...'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">전송 채널</span>
                </div>
                <div className="pl-6 space-y-1">
                  {campaignData.channelOrder.map((channel, index) => (
                    <Badge key={channel} variant="secondary" className="text-xs">
                      {index + 1}. {channel}
                      {index > 0 && campaignData.fallbackEnabled && ' (폴백)'}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">예상 비용</span>
                </div>
                <p className="text-sm text-gray-700 pl-6">
                  {estimate ? `${estimate.estimatedCost.toLocaleString()}원` : '계산 중...'}
                </p>
              </div>
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">메시지 미리보기</h3>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {campaignData.messageBody}
              </p>
            </div>
          </div>

          {/* Quota Warning */}
          {estimate && !estimate.quotaOk && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">할당량 초과</p>
                  <p className="text-sm text-red-700 mt-1">
                    이 캠페인은 일일 할당량을 초과합니다. 발송할 수 없습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Checkboxes */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="confirm-details"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
              />
              <Label htmlFor="confirm-details" className="text-sm leading-5">
                위 내용을 확인했으며, 캠페인 발송에 동의합니다.
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox 
                id="legal-consent"
                checked={legalChecked}
                onCheckedChange={(checked) => setLegalChecked(checked as boolean)}
              />
              <Label htmlFor="legal-consent" className="text-sm leading-5">
                정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 개인정보보호법을 준수하며, 
                수신자의 사전 동의를 받았음을 확인합니다.
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canProceed || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                캠페인 발송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}