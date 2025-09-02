'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageCircle,
  Search,
  Filter,
  MoreVertical,
  User,
  Clock,
  Settings,
  RefreshCw,
  MessageSquare,
  Phone,
  Mail,
  Bot,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useConversations, useMarkAsRead, useUpdateConversationStatus } from '@/lib/hooks/use-inbox';
import type { ConversationListParams, Conversation } from '@/lib/api/inbox';
import Link from 'next/link';

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'sms': return <Phone className="h-4 w-4" />;
    case 'kakao': return <MessageCircle className="h-4 w-4" />;
    case 'email': return <Mail className="h-4 w-4" />;
    case 'push': return <MessageSquare className="h-4 w-4" />;
    default: return <MessageSquare className="h-4 w-4" />;
  }
};

const getChannelLabel = (channel: string) => {
  switch (channel) {
    case 'sms': return 'SMS';
    case 'kakao': return '카카오';
    case 'email': return '이메일';
    case 'push': return '푸시';
    default: return channel;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'unread': return 'bg-blue-100 text-blue-800';
    case 'read': return 'bg-gray-100 text-gray-800';
    case 'replied': return 'bg-green-100 text-green-800';
    case 'closed': return 'bg-gray-100 text-gray-600';
    case 'assigned': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'unread': return '읽지않음';
    case 'read': return '읽음';
    case 'replied': return '답장완료';
    case 'closed': return '종료';
    case 'assigned': return '할당됨';
    default: return status;
  }
};

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const [filters, setFilters] = useState<ConversationListParams>({
    page: 1,
    pageSize: 50,
    sortBy: 'lastMessageAt',
    sortOrder: 'desc'
  });

  const { data, isLoading, error, refetch } = useConversations(filters);
  const markAsReadMutation = useMarkAsRead();
  const updateStatusMutation = useUpdateConversationStatus();

  // Handle URL params
  useEffect(() => {
    const search = searchParams.get('search');
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const assigned = searchParams.get('assigned');
    const unreadOnly = searchParams.get('unreadOnly');

    setFilters(prev => ({
      ...prev,
      search: search || undefined,
      channel: channel ? channel.split(',') : undefined,
      status: status ? status.split(',') : undefined,
      assignedToUserId: assigned || undefined,
      unreadOnly: unreadOnly === 'true',
    }));

    if (search) setSearchQuery(search);
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<ConversationListParams>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);

    // Update URL
    const params = new URLSearchParams();
    if (updatedFilters.search) params.set('search', updatedFilters.search);
    if (updatedFilters.channel?.length) params.set('channel', updatedFilters.channel.join(','));
    if (updatedFilters.status?.length) params.set('status', updatedFilters.status.join(','));
    if (updatedFilters.assignedToUserId) params.set('assigned', updatedFilters.assignedToUserId);
    if (updatedFilters.unreadOnly) params.set('unreadOnly', 'true');

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/inbox${newUrl}`, { scroll: false });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateFilters({ search: query || undefined });
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation.id);
    
    // Mark as read if unread
    if (conversation.status === 'unread') {
      markAsReadMutation.mutate(conversation.id);
    }

    // Navigate to conversation
    router.push(`/inbox/${conversation.id}`);
  };

  const handleStatusChange = (conversationId: string, status: string) => {
    updateStatusMutation.mutate({ conversationId, status });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            대화 목록을 불러올 수 없습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">통합 인박스</h1>
            <p className="text-gray-600 mt-1">
              모든 채널의 대화를 한 곳에서 관리하세요
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
            <Link href="/inbox/auto-reply">
              <Button variant="outline" size="sm">
                <Bot className="h-4 w-4 mr-2" />
                자동답장 설정
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="대화 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select onValueChange={(value) => updateFilters({ 
            channel: value === 'all' ? undefined : [value] 
          })}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="채널" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 채널</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="kakao">카카오</SelectItem>
              <SelectItem value="email">이메일</SelectItem>
              <SelectItem value="push">푸시</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => updateFilters({ 
            status: value === 'all' ? undefined : [value] 
          })}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="unread">읽지않음</SelectItem>
              <SelectItem value="read">읽음</SelectItem>
              <SelectItem value="replied">답장완료</SelectItem>
              <SelectItem value="closed">종료</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={filters.unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilters({ unreadOnly: !filters.unreadOnly })}
          >
            <Filter className="h-4 w-4 mr-2" />
            읽지않은 것만
          </Button>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{data.totalCount}</p>
                    <p className="text-gray-600 text-sm">총 대화</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">{data.unreadCount}</p>
                    <p className="text-gray-600 text-sm">읽지않음</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">
                      {data.conversations.filter(c => c.status === 'replied').length}
                    </p>
                    <p className="text-gray-600 text-sm">답장완료</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold">
                      {data.conversations.filter(c => 
                        new Date(c.lastMessageAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                    <p className="text-gray-600 text-sm">24시간 내</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>대화 목록</span>
              {data && (
                <span className="text-sm font-normal text-gray-500">
                  {data.conversations.length}개 표시 (총 {data.totalCount}개)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {/* Loading State */}
              {isLoading && (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-start space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && data && data.conversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? '검색 결과가 없습니다' : '대화가 없습니다'}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? '다른 검색어로 시도해보세요' 
                      : '새로운 메시지를 기다리고 있습니다'}
                  </p>
                </div>
              )}

              {/* Conversations */}
              {data && data.conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-start p-4 hover:bg-gray-50 cursor-pointer border-b transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleConversationClick(conversation)}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 mr-4">
                    <div className="relative">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        {getChannelIcon(conversation.channel)}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.contactName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getChannelLabel(conversation.channel)}
                        </Badge>
                        <Badge className={getStatusColor(conversation.status) + ' text-xs'}>
                          {getStatusLabel(conversation.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.lastMessageAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-2">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate flex-1 mr-4">
                        {conversation.lastMessagePreview}
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        {conversation.assignedToUserName && (
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {conversation.assignedToUserName}
                          </Badge>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(conversation.id, 'read');
                              }}
                            >
                              읽음으로 표시
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(conversation.id, 'replied');
                              }}
                            >
                              답장완료로 표시
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(conversation.id, 'closed');
                              }}
                            >
                              종료
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement assign functionality
                              }}
                            >
                              담당자 지정
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Tags */}
                    {conversation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {data && data.hasNextPage && (
                <div className="p-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => updateFilters({ page: (filters.page || 1) + 1 })}
                    disabled={isLoading}
                  >
                    더 보기
                  </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}