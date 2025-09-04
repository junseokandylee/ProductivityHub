'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare,
  Calendar,
  Users,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Star,
  StarOff,
  Clock,
  Zap,
  FileText,
  Mail,
  Phone
} from 'lucide-react';

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'event' | 'announcement' | 'survey' | 'reminder';
  channels: ('sms' | 'email' | 'kakao')[];
  content: {
    subject?: string;
    body: string;
  };
  usageCount: number;
  isPopular: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  estimatedReach: number;
  avgSuccessRate: number;
}

// Mock data for campaign templates
const mockTemplates: CampaignTemplate[] = [
  {
    id: '1',
    name: '시민 집회 참석 요청',
    description: '지역 시민들에게 중요한 정책 발표 집회 참석을 요청하는 템플릿',
    category: 'event',
    channels: ['sms', 'kakao'],
    content: {
      subject: '중요 정책 발표회 참석 안내',
      body: '안녕하세요, {이름}님. 다음 주 {날짜}에 진행될 중요한 정책 발표회에 참석해주세요. 장소: {장소}, 시간: {시간}. 많은 참여 부탁드립니다.'
    },
    usageCount: 45,
    isPopular: true,
    isFavorite: true,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-12T15:30:00Z',
    createdBy: '김정치',
    estimatedReach: 2500,
    avgSuccessRate: 78
  },
  {
    id: '2',
    name: '정책 설명회 초대',
    description: '신규 정책에 대한 설명회 초대 메시지',
    category: 'announcement',
    channels: ['email', 'sms'],
    content: {
      subject: '새로운 정책 설명회 초대',
      body: '{이름}님께서 관심 가져주신 {정책명}에 대한 자세한 설명회를 개최합니다. 일시: {일시}, 장소: {장소}. 사전 등록이 필요합니다.'
    },
    usageCount: 32,
    isPopular: true,
    isFavorite: false,
    createdAt: '2024-01-08T14:20:00Z',
    updatedAt: '2024-01-14T09:15:00Z',
    createdBy: '이의원',
    estimatedReach: 1800,
    avgSuccessRate: 65
  },
  {
    id: '3',
    name: '투표 참여 독려',
    description: '선거 투표 참여를 독려하는 메시지 템플릿',
    category: 'reminder',
    channels: ['sms', 'kakao', 'email'],
    content: {
      body: '소중한 한 표의 권리를 행사하세요! 투표일: {투표일}, 투표소: {투표소}. 민주주의 발전을 위해 꼭 투표해주세요. 문의사항은 {연락처}로 연락주세요.'
    },
    usageCount: 89,
    isPopular: true,
    isFavorite: true,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-13T16:45:00Z',
    createdBy: '박선거',
    estimatedReach: 5200,
    avgSuccessRate: 82
  },
  {
    id: '4',
    name: '지역 현안 설문조사',
    description: '지역 주민 의견을 수렴하기 위한 설문조사 안내',
    category: 'survey',
    channels: ['email'],
    content: {
      subject: '지역 현안에 대한 의견을 들려주세요',
      body: '안녕하세요, {이름}님. 우리 지역의 {현안명}에 대한 여러분의 소중한 의견을 듣고자 합니다. 설문 참여 링크: {링크}. 참여 기한: {마감일}'
    },
    usageCount: 23,
    isPopular: false,
    isFavorite: false,
    createdAt: '2024-01-12T11:30:00Z',
    updatedAt: '2024-01-12T11:30:00Z',
    createdBy: '최의원',
    estimatedReach: 1200,
    avgSuccessRate: 45
  },
  {
    id: '5',
    name: '긴급 공지사항',
    description: '긴급한 상황이나 중요 공지사항 전달을 위한 템플릿',
    category: 'announcement',
    channels: ['sms', 'kakao'],
    content: {
      body: '[긴급공지] {이름}님, {공지내용}에 대해 알려드립니다. 자세한 내용은 {링크}를 확인해주세요. 문의: {연락처}'
    },
    usageCount: 67,
    isPopular: true,
    isFavorite: true,
    createdAt: '2024-01-01T20:00:00Z',
    updatedAt: '2024-01-14T12:20:00Z',
    createdBy: '정긴급',
    estimatedReach: 3800,
    avgSuccessRate: 91
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'event':
      return 'bg-blue-100 text-blue-800';
    case 'announcement':
      return 'bg-green-100 text-green-800';
    case 'survey':
      return 'bg-purple-100 text-purple-800';
    case 'reminder':
      return 'bg-yellow-100 text-yellow-800';
    case 'general':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryText = (category: string) => {
  switch (category) {
    case 'event':
      return '행사';
    case 'announcement':
      return '공지';
    case 'survey':
      return '설문';
    case 'reminder':
      return '알림';
    case 'general':
      return '일반';
    default:
      return category;
  }
};

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'sms':
      return <Phone className="h-3 w-3" />;
    case 'email':
      return <Mail className="h-3 w-3" />;
    case 'kakao':
      return <MessageSquare className="h-3 w-3" />;
    default:
      return <MessageSquare className="h-3 w-3" />;
  }
};

const getChannelText = (channel: string) => {
  switch (channel) {
    case 'sms':
      return 'SMS';
    case 'email':
      return '이메일';
    case 'kakao':
      return '카카오';
    default:
      return channel;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function CampaignTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<CampaignTemplate[]>(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleFavoriteToggle = (templateId: string) => {
    setTemplates(prev => 
      prev.map(template => 
        template.id === templateId 
          ? { ...template, isFavorite: !template.isFavorite }
          : template
      )
    );
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/campaigns/new?template=${templateId}`);
  };

  const handleEditTemplate = (templateId: string) => {
    // Navigate to template editor (would be implemented)
    console.log('Edit template:', templateId);
  };

  const handleCopyTemplate = (templateId: string) => {
    // Copy template logic (would be implemented)
    console.log('Copy template:', templateId);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(template => template.id !== templateId));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              템플릿을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
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
            <h1 className="text-3xl font-bold text-gray-900">캠페인 템플릿</h1>
            <p className="text-gray-600 mt-1">
              검증된 템플릿으로 효과적인 캠페인을 빠르게 시작하세요
            </p>
          </div>
          <Button onClick={() => router.push('/campaigns/templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            새 템플릿
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">모든 카테고리</option>
            <option value="event">행사</option>
            <option value="announcement">공지</option>
            <option value="survey">설문</option>
            <option value="reminder">알림</option>
            <option value="general">일반</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            필터
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 템플릿</p>
                  <p className="text-2xl font-bold">{templates.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">인기 템플릿</p>
                  <p className="text-2xl font-bold">
                    {templates.filter(t => t.isPopular).length}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">즐겨찾기</p>
                  <p className="text-2xl font-bold">
                    {templates.filter(t => t.isFavorite).length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 성공률</p>
                  <p className="text-2xl font-bold">
                    {Math.round(templates.reduce((sum, t) => sum + t.avgSuccessRate, 0) / templates.length)}%
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">템플릿을 불러오는 중...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredTemplates.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || categoryFilter ? '검색 결과가 없습니다' : '템플릿이 없습니다'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || categoryFilter 
                  ? '다른 검색 조건으로 시도해보세요' 
                  : '첫 번째 캠페인 템플릿을 만들어보세요'}
              </p>
              {!searchQuery && !categoryFilter && (
                <Button onClick={() => router.push('/campaigns/templates/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  첫 번째 템플릿 만들기
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Templates Grid */}
        {!isLoading && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate mb-2">
                        {template.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCategoryColor(template.category)}>
                          {getCategoryText(template.category)}
                        </Badge>
                        {template.isPopular && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            <Zap className="h-3 w-3 mr-1" />
                            인기
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFavoriteToggle(template.id)}
                      className="flex-shrink-0 ml-2"
                    >
                      {template.isFavorite ? (
                        <Star className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {template.channels.map((channel) => (
                      <Badge key={channel} variant="outline" size="sm" className="flex items-center gap-1">
                        {getChannelIcon(channel)}
                        {getChannelText(channel)}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{template.usageCount}회 사용</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>성공률 {template.avgSuccessRate}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>예상 도달: {template.estimatedReach.toLocaleString()}명</span>
                      <span>작성자: {template.createdBy}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUseTemplate(template.id)}
                        className="flex-1"
                      >
                        사용하기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyTemplate(template.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {!isLoading && filteredTemplates.length > 0 && (
          <div className="mt-8 text-sm text-gray-500 text-center">
            {filteredTemplates.length !== templates.length && (
              <>검색 결과: {filteredTemplates.length}개 | </>
            )}
            전체 {templates.length}개 템플릿 | 
            평균 사용 횟수: {Math.round(templates.reduce((sum, t) => sum + t.usageCount, 0) / templates.length)}회
          </div>
        )}
      </div>
    </div>
  );
}