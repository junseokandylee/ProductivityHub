'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Smartphone, MessageSquare, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { renderTemplate, getMissingTokens, type TemplateVariables } from '@/lib/utils/template';

interface MessagePreviewProps {
  title?: string;
  messageBody: string;
  variables: TemplateVariables;
  channel?: string;
  isLoading?: boolean;
  className?: string;
}

export function MessagePreview({ 
  title, 
  messageBody, 
  variables, 
  channel = 'SMS',
  isLoading = false,
  className = "" 
}: MessagePreviewProps) {
  const renderedTitle = title ? renderTemplate(title, variables, '[누락]') : undefined;
  const renderedBody = renderTemplate(messageBody, variables, '[누락]');
  const missingTokens = getMissingTokens(messageBody + (title || ''), variables);
  
  const getChannelIcon = () => {
    switch (channel) {
      case 'SMS':
        return <Smartphone className="h-4 w-4 text-green-600" />;
      case 'KAKAO':
        return <MessageSquare className="h-4 w-4 text-yellow-600" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChannelName = () => {
    switch (channel) {
      case 'SMS':
        return 'SMS 미리보기';
      case 'KAKAO':
        return '카카오톡 미리보기';
      case 'EMAIL':
        return '이메일 미리보기';
      default:
        return '메시지 미리보기';
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-blue-500" />
          {getChannelName()}
          {getChannelIcon()}
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Missing tokens warning */}
        {missingTokens.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-800">누락된 변수</p>
              <p className="text-xs text-orange-700 mt-1">
                다음 변수들이 연락처 데이터에 없어 [누락]으로 표시됩니다:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {missingTokens.map(token => (
                  <Badge key={token} variant="outline" className="text-xs">
                    {`{${token}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview content */}
        <div className="space-y-3">
          {/* Title preview (for channels that support it) */}
          {renderedTitle && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">제목</p>
              <div className="p-2 bg-gray-50 border rounded text-sm font-medium">
                {renderedTitle}
              </div>
            </div>
          )}

          {/* Body preview */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">메시지 내용</p>
            <div className={`p-3 border rounded-md text-sm whitespace-pre-wrap ${
              channel === 'SMS' ? 'bg-green-50 border-green-200' :
              channel === 'KAKAO' ? 'bg-yellow-50 border-yellow-200' :
              channel === 'EMAIL' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              {renderedBody || (
                <span className="text-gray-400 italic">메시지를 입력하세요...</span>
              )}
            </div>
          </div>
        </div>

        {/* Preview status */}
        {!isLoading && (
          <div className="flex items-center gap-1 pt-2">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-700">미리보기 준비 완료</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}