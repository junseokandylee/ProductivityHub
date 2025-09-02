'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWizard } from '@/lib/context/campaign-wizard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TokenInserter } from '@/components/ui/token-inserter';
import { CharacterCounter } from '@/components/ui/character-counter';
import { MessagePreview } from '@/components/ui/message-preview';
import { MessageSquare, Hash, Eye, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { useSampleContact, usePreviewTemplate } from '@/lib/hooks/use-contacts';
import { WizardStepFeedback } from '@/components/ui/wizard-feedback';
import { detectTokens, renderTemplate, COMMON_TOKENS } from '@/lib/utils/template';

export function MessageStep() {
  const { state, dispatch } = useWizard();
  const [activeChannel, setActiveChannel] = useState<string>('SMS');
  const messageBodyRef = useRef<HTMLTextAreaElement>(null);
  const messageTitleRef = useRef<HTMLInputElement>(null);

  // Get sample contact based on selected audience
  const sampleContactRequest = state.audience.includeAll 
    ? null 
    : {
        groupIds: state.audience.groupIds,
        segmentIds: state.audience.segmentIds,
        filterJson: state.audience.filterJson
      };

  const { 
    data: sampleContact, 
    isLoading: isLoadingSample 
  } = useSampleContact(sampleContactRequest, true);

  // Template preview mutation
  const previewMutation = usePreviewTemplate();

  // Detected tokens from the current message
  const detectedTokens = detectTokens(state.message.messageBody + (state.message.messageTitle || ''));

  // Variables from sample contact data
  const availableVariables = sampleContact?.personalizationData || {};

  // Update preview when message or sample contact changes
  useEffect(() => {
    if (state.message.messageBody || state.message.messageTitle) {
      previewMutation.mutate({
        messageBody: state.message.messageBody,
        title: state.message.messageTitle,
        variables: availableVariables
      });
    }
  }, [state.message.messageBody, state.message.messageTitle, availableVariables]);

  const handleMessageChange = (field: keyof typeof state.message, value: string) => {
    dispatch({
      type: 'SET_MESSAGE',
      payload: { [field]: value }
    });

    // Auto-detect and update variables
    if (field === 'messageBody' || field === 'messageTitle') {
      const allContent = field === 'messageBody' 
        ? value + (state.message.messageTitle || '')
        : state.message.messageBody + value;
      
      const tokens = detectTokens(allContent);
      const variables: Record<string, string> = {};
      
      tokens.forEach(token => {
        variables[token] = availableVariables[token] || '';
      });

      dispatch({
        type: 'SET_MESSAGE',
        payload: { variables }
      });
    }
  };

  const handleTokenInsert = (token: string, newText: string, newCursorPosition: number) => {
    const isTitle = messageTitleRef.current === document.activeElement;
    const field = isTitle ? 'messageTitle' : 'messageBody';
    
    handleMessageChange(field, newText);
    
    // Set cursor position after state update
    setTimeout(() => {
      const targetRef = isTitle ? messageTitleRef : messageBodyRef;
      if (targetRef.current) {
        targetRef.current.focus();
        targetRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  const getActiveChannelInfo = () => {
    const channel = state.channels.channels.find(c => c.channel === activeChannel);
    return channel || { channel: 'SMS', isEnabled: true };
  };

  const channelInfo = getActiveChannelInfo();
  const previewData = previewMutation.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-500" />
          메시지 작성
        </h2>
        <p className="text-gray-600 mt-1">
          개인화 변수를 활용하여 효과적인 캠페인 메시지를 작성하세요.
        </p>
      </div>

      {/* Real-time feedback */}
      <WizardStepFeedback
        stepNumber={2}
        isLoading={isLoadingSample || previewMutation.isPending}
        loadingText={isLoadingSample ? "샘플 연락처를 불러오는 중..." : previewMutation.isPending ? "메시지 미리보기를 생성하는 중..." : undefined}
      />

      {/* Sample Contact Info */}
      {isLoadingSample ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-blue-700">샘플 연락처 로딩 중...</span>
          </CardContent>
        </Card>
      ) : sampleContact && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-blue-900">미리보기용 샘플 연락처</h4>
                <p className="text-sm text-blue-700 mt-1">
                  {sampleContact.name} ({sampleContact.phone || sampleContact.email || 'ID 없음'})
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                선택된 대상에서 추출
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Composition */}
        <div className="space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">캠페인 이름</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign-name">캠페인 이름 (내부 관리용)</Label>
                <Input
                  id="campaign-name"
                  placeholder="예: 선거 D-30 안내 메시지"
                  value={state.message.name}
                  onChange={(e) => handleMessageChange('name', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Message Title (for channels that support it) */}
          {(activeChannel === 'EMAIL' || activeChannel === 'KAKAO') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>메시지 제목</span>
                  <TokenInserter 
                    onInsertToken={handleTokenInsert}
                    textareaRef={messageTitleRef as any}
                    availableTokens={Object.keys(availableVariables)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="message-title">제목</Label>
                  <Input
                    id="message-title"
                    ref={messageTitleRef}
                    placeholder="메시지 제목을 입력하세요"
                    value={state.message.messageTitle || ''}
                    onChange={(e) => handleMessageChange('messageTitle', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message Body */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>메시지 내용</span>
                <div className="flex items-center gap-2">
                  <TokenInserter 
                    onInsertToken={handleTokenInsert}
                    textareaRef={messageBodyRef}
                    availableTokens={Object.keys(availableVariables)}
                  />
                  <CharacterCounter 
                    text={state.message.messageBody}
                    channel={activeChannel}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="message-body">메시지 내용</Label>
                <Textarea
                  id="message-body"
                  ref={messageBodyRef}
                  placeholder="안녕하세요 {name}님, {candidate} 후보입니다..."
                  value={state.message.messageBody}
                  onChange={(e) => handleMessageChange('messageBody', e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>
              
              {/* Token Legend */}
              {detectedTokens.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">사용된 개인화 변수:</p>
                  <div className="flex flex-wrap gap-1">
                    {detectedTokens.map(token => {
                      const hasValue = token in availableVariables;
                      return (
                        <Badge 
                          key={token} 
                          variant={hasValue ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {`{${token}}`}
                          {!hasValue && <X className="ml-1 h-2 w-2" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Variables */}
          {Object.keys(availableVariables).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-green-500" />
                  사용 가능한 개인화 변수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(availableVariables).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="font-mono text-blue-600">{`{${key}}`}</span>
                      <span className="text-gray-600 truncate ml-2">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          {/* Channel Selector */}
          {state.channels.channels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">미리보기 채널</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {state.channels.channels.map(channel => (
                    <Button
                      key={channel.channel}
                      variant={activeChannel === channel.channel ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveChannel(channel.channel)}
                    >
                      {channel.channel}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message Preview */}
          <MessagePreview
            title={state.message.messageTitle}
            messageBody={state.message.messageBody}
            variables={availableVariables}
            channel={activeChannel}
            isLoading={previewMutation.isPending}
          />

          {/* Preview Stats */}
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">미리보기 통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>렌더링된 글자 수</span>
                  <span className="font-mono">{previewData.characterCount}</span>
                </div>
                {previewData.missingVariables.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-700">누락된 변수</p>
                      <p className="text-xs text-orange-600">
                        {previewData.missingVariables.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {state.errors[2] && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {state.errors[2].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}