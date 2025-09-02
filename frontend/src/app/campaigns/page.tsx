'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  TrendingUp,
  MoreVertical,
  Eye,
  BarChart3
} from 'lucide-react';
import { useCampaigns } from '@/lib/hooks/use-campaigns';
import type { CampaignListParams } from '@/lib/api/campaigns';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800';
    case 'paused':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '진행 중';
    case 'completed':
      return '완료됨';
    case 'scheduled':
      return '예약됨';
    case 'paused':
      return '일시중지';
    case 'cancelled':
      return '취소됨';
    case 'draft':
      return '초안';
    default:
      return status;
  }
};

export default function CampaignsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  const [params, setParams] = useState<CampaignListParams>({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Update params when search or filters change
  const updateParams = (newParams: Partial<CampaignListParams>) => {
    setParams(prev => ({ ...prev, ...newParams, page: 1 })); // Reset to page 1 when filtering
  };

  // Update search with debouncing could be added here
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateParams({ search: query || undefined });
  };

  const { data, isLoading, error, refetch } = useCampaigns(params);

  const handleCampaignClick = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load campaigns. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">캠페인</h1>
            <p className="text-gray-600 mt-1">
              메시징 캠페인을 관리하고 새로운 캠페인을 만들어보세요
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 캠페인
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="캠페인 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">캠페인을 불러오는 중...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data && data.campaigns.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? '검색 결과가 없습니다' : '캠페인이 없습니다'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery 
                  ? '다른 검색어로 시도해보세요' 
                  : '첫 번째 메시징 캠페인을 만들어보세요'}
              </p>
              {!searchQuery && (
                <Link href="/campaigns/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    첫 번째 캠페인 만들기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Campaigns List */}
        {!isLoading && data && data.campaigns.length > 0 && (
          <div className="space-y-4">
            {data.campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleCampaignClick(campaign.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {campaign.name}
                        </h3>
                        <Badge className={getStatusColor(campaign.status)}>
                          {getStatusText(campaign.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {campaign.scheduledAt 
                              ? `예약: ${new Date(campaign.scheduledAt).toLocaleDateString('ko-KR')}`
                              : `생성: ${new Date(campaign.createdAt).toLocaleDateString('ko-KR')}`}
                          </span>
                        </div>
                        
                        {campaign.recipientCount && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{campaign.recipientCount.toLocaleString()}명</span>
                          </div>
                        )}
                        
                        {campaign.successCount !== undefined && campaign.recipientCount && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>
                              성공률 {Math.round((campaign.successCount / campaign.recipientCount) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {campaign.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel === 'sms' ? 'SMS' : 
                             channel === 'kakao' ? '카카오' :
                             channel === 'email' ? '이메일' : channel}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/campaigns/${campaign.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        보기
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        분석
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination could be added here */}
            {data.hasNextPage && (
              <div className="text-center pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => updateParams({ page: (params.page || 1) + 1 })}
                >
                  더 보기
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Stats Footer */}
        {!isLoading && data && data.campaigns.length > 0 && (
          <div className="mt-8 text-sm text-gray-500 text-center">
            총 {data.totalCount.toLocaleString()}개의 캠페인 중 {data.campaigns.length}개 표시
          </div>
        )}
      </div>
    </div>
  );
}