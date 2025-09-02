'use client';

import Link from 'next/link';
import { MoreHorizontal, Eye, BarChart3, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'paused';
  sentCount: number;
  totalRecipients: number;
  successRate: number;
  createdAt: string;
  scheduledAt?: string;
  channels: ('sms' | 'kakao' | 'email')[];
}

interface RecentCampaignsProps {
  campaigns?: Campaign[];
  loading?: boolean;
  error?: string;
}

const statusConfig = {
  draft: { label: '초안', color: 'bg-gray-100 text-gray-800' },
  scheduled: { label: '예약됨', color: 'bg-blue-100 text-blue-800' },
  sending: { label: '발송 중', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '완료', color: 'bg-green-100 text-green-800' },
  failed: { label: '실패', color: 'bg-red-100 text-red-800' },
  paused: { label: '일시정지', color: 'bg-orange-100 text-orange-800' },
};

const channelConfig = {
  sms: { label: 'SMS', color: 'bg-blue-100 text-blue-800' },
  kakao: { label: '카카오', color: 'bg-yellow-100 text-yellow-800' },
  email: { label: '이메일', color: 'bg-purple-100 text-purple-800' },
};

export function RecentCampaigns({ campaigns, loading = false, error }: RecentCampaignsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 캠페인</CardTitle>
          <CardDescription>최근 생성된 캠페인 목록</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-8 w-8" />
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
          <CardTitle>최근 캠페인</CardTitle>
          <CardDescription>최근 생성된 캠페인 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            <p>캠페인 데이터를 불러올 수 없습니다.</p>
            <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatProgress = (sent: number, total: number) => {
    if (total === 0) return '0%';
    return `${((sent / total) * 100).toFixed(1)}%`;
  };

  // Default empty state
  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 캠페인</CardTitle>
          <CardDescription>최근 생성된 캠페인 목록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">아직 생성된 캠페인이 없습니다.</p>
            <Link href="/campaigns/new">
              <Button className="mt-4" size="sm">
                첫 캠페인 만들기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>최근 캠페인</CardTitle>
          <CardDescription>최근 생성된 캠페인 목록</CardDescription>
        </div>
        <Link href="/campaigns">
          <Button variant="outline" size="sm">
            전체 보기
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {campaigns.slice(0, 5).map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-sm font-medium truncate">{campaign.name}</h3>
                  <Badge className={`text-xs ${statusConfig[campaign.status].color}`}>
                    {statusConfig[campaign.status].label}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatDate(campaign.createdAt)}</span>
                  
                  {campaign.status !== 'draft' && (
                    <span>
                      {formatProgress(campaign.sentCount, campaign.totalRecipients)} 
                      ({campaign.sentCount.toLocaleString()}/{campaign.totalRecipients.toLocaleString()})
                    </span>
                  )}
                  
                  {campaign.status === 'completed' && (
                    <span>성공률 {campaign.successRate.toFixed(1)}%</span>
                  )}
                </div>
                
                <div className="flex items-center space-x-1 mt-1">
                  {campaign.channels.map((channel) => (
                    <Badge
                      key={channel}
                      variant="secondary"
                      className={`text-xs ${channelConfig[channel].color}`}
                    >
                      {channelConfig[channel].label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Link href={`/campaigns/${campaign.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                
                {(campaign.status === 'completed' || campaign.status === 'sending') && (
                  <Link href={`/campaigns/${campaign.id}/analytics`}>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </Link>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaign.id}`}>상세 보기</Link>
                    </DropdownMenuItem>
                    {(campaign.status === 'completed' || campaign.status === 'sending') && (
                      <DropdownMenuItem asChild>
                        <Link href={`/campaigns/${campaign.id}/analytics`}>분석 보기</Link>
                      </DropdownMenuItem>
                    )}
                    {campaign.status === 'draft' && (
                      <DropdownMenuItem asChild>
                        <Link href={`/campaigns/${campaign.id}/edit`}>편집</Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}