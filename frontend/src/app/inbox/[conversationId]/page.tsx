'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreVertical,
  User,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Settings
} from 'lucide-react';
import { 
  useConversation, 
  useMessages, 
  useSendMessage, 
  useMarkAsRead,
  useUpdateConversationStatus 
} from '@/lib/hooks/use-inbox';
import type { Message } from '@/lib/api/inbox';
import Link from 'next/link';

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'sms': return <Phone className="h-4 w-4" />;
    case 'kakao': return <MessageCircle className="h-4 w-4" />;
    case 'email': return <Mail className="h-4 w-4" />;
    default: return <MessageCircle className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sent': return <CheckCircle className="h-3 w-3 text-blue-500" />;
    case 'delivered': return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'read': return <CheckCircle className="h-3 w-3 text-green-600" />;
    case 'failed': return <XCircle className="h-3 w-3 text-red-500" />;
    case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />;
    default: return <Clock className="h-3 w-3 text-gray-400" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'sent': return '전송됨';
    case 'delivered': return '전달됨';
    case 'read': return '읽음';
    case 'failed': return '실패';
    case 'pending': return '대기중';
    default: return status;
  }
};

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [messageContent, setMessageContent] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading: conversationLoading, error: conversationError } = useConversation(conversationId);
  const { data: messagesData, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();
  const updateStatusMutation = useUpdateConversationStatus();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData?.messages]);

  // Mark as read when conversation loads
  useEffect(() => {
    if (conversation && conversation.status === 'unread') {
      markAsReadMutation.mutate(conversationId);
    }
  }, [conversation, conversationId, markAsReadMutation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || sendMessageMutation.isPending) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: messageContent.trim(),
        contentType: 'text',
      });
      setMessageContent('');
      setIsComposing(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleStatusChange = (status: string) => {
    updateStatusMutation.mutate({ conversationId, status });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (conversationError || messagesError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            대화를 불러올 수 없습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/inbox">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                인박스로 돌아가기
              </Button>
            </Link>
            {conversationLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : conversation ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getChannelIcon(conversation.channel)}
                  <h1 className="text-2xl font-bold text-gray-900">
                    {conversation.contactName}
                  </h1>
                </div>
                <Badge className={
                  conversation.status === 'unread' ? 'bg-blue-100 text-blue-800' :
                  conversation.status === 'read' ? 'bg-gray-100 text-gray-800' :
                  conversation.status === 'replied' ? 'bg-green-100 text-green-800' :
                  conversation.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                  'bg-purple-100 text-purple-800'
                }>
                  {conversation.status === 'unread' ? '읽지않음' :
                   conversation.status === 'read' ? '읽음' :
                   conversation.status === 'replied' ? '답장완료' :
                   conversation.status === 'closed' ? '종료' :
                   conversation.status === 'assigned' ? '할당됨' : conversation.status}
                </Badge>
              </div>
            ) : null}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            {conversation && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    작업
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusChange('read')}>
                    읽음으로 표시
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('replied')}>
                    답장완료로 표시
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
                    대화 종료
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserCheck className="h-4 w-4 mr-2" />
                    담당자 지정
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    태그 관리
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Contact Info Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>연락처 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversationLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : conversation ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">이름</label>
                      <p className="mt-1 font-semibold">{conversation.contactName}</p>
                    </div>
                    {conversation.contactPhone && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">전화번호</label>
                        <p className="mt-1">{conversation.contactPhone}</p>
                      </div>
                    )}
                    {conversation.contactEmail && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">이메일</label>
                        <p className="mt-1">{conversation.contactEmail}</p>
                      </div>
                    )}
                    {conversation.contactKakaoId && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">카카오 ID</label>
                        <p className="mt-1">{conversation.contactKakaoId}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">채널</label>
                      <div className="mt-1 flex items-center space-x-2">
                        {getChannelIcon(conversation.channel)}
                        <span className="capitalize">{conversation.channel}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">최초 연락</label>
                      <p className="mt-1 text-sm">
                        {new Date(conversation.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    {conversation.assignedToUserName && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">담당자</label>
                        <p className="mt-1 flex items-center space-x-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          <span>{conversation.assignedToUserName}</span>
                        </p>
                      </div>
                    )}
                    {conversation.tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">태그</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {conversation.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Messages Thread */}
          <div className="lg:col-span-3">
            <Card className="h-[700px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle>메시지</CardTitle>
              </CardHeader>
              
              {/* Messages Area */}
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-xs">
                            <Skeleton className="h-16 w-48 rounded-lg" />
                            <Skeleton className="h-3 w-20 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messagesData && messagesData.messages.length > 0 ? (
                    <div className="space-y-4" role="log" aria-live="polite" aria-label="메시지 목록">
                      {messagesData.messages
                        .slice()
                        .reverse()
                        .map((message: Message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md ${
                            message.direction === 'outbound' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white border border-gray-200'
                          } rounded-lg px-4 py-2`}>
                            {/* Message Content */}
                            <div className="whitespace-pre-wrap break-words">
                              {message.content}
                            </div>

                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment) => (
                                  <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                                    <Paperclip className="h-3 w-3" />
                                    <span>{attachment.fileName}</span>
                                    <span className="opacity-70">
                                      ({(attachment.fileSize / 1024).toFixed(1)}KB)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Timestamp and Status */}
                            <div className={`flex items-center justify-between mt-2 text-xs ${
                              message.direction === 'outbound' 
                                ? 'text-blue-100' 
                                : 'text-gray-500'
                            }`}>
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {message.direction === 'outbound' && (
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(message.status)}
                                  <span className="sr-only">{getStatusLabel(message.status)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>메시지가 없습니다</p>
                        <p className="text-sm">첫 번째 메시지를 보내보세요!</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* Typing Indicator Placeholder */}
                {isComposing && (
                  <div className="px-4 py-2 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span>메시지를 입력하고 있습니다...</span>
                    </div>
                  </div>
                )}

                {/* Message Composer */}
                <div className="flex-shrink-0 p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                    <div className="flex-1">
                      <Textarea
                        value={messageContent}
                        onChange={(e) => {
                          setMessageContent(e.target.value);
                          setIsComposing(e.target.value.length > 0);
                        }}
                        onKeyDown={handleKeyPress}
                        placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                        className="min-h-[60px] max-h-32 resize-none"
                        disabled={sendMessageMutation.isPending}
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mb-0"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="sr-only">첨부파일</span>
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="mb-0"
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">전송</span>
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}