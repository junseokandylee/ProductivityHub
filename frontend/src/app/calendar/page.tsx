'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Filter,
  Search,
  Clock,
  Users,
  MessageSquare,
  Eye,
  MoreVertical
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'campaign' | 'meeting' | 'deadline' | 'reminder';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  participants?: number;
  description?: string;
}

// Mock data for calendar events
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: '시민 만남의 날 캠페인',
    date: '2024-01-15',
    time: '10:00',
    type: 'campaign',
    status: 'scheduled',
    participants: 2500,
    description: '지역 시민들과의 만남을 위한 SMS 및 카카오톡 캠페인'
  },
  {
    id: '2',
    title: '정책 발표회 알림',
    date: '2024-01-18',
    time: '14:30',
    type: 'campaign',
    status: 'scheduled',
    participants: 5200,
    description: '신규 정책 발표에 대한 사전 알림 캠페인'
  },
  {
    id: '3',
    title: '선거 운동원 회의',
    date: '2024-01-20',
    time: '09:00',
    type: 'meeting',
    status: 'scheduled',
    participants: 25,
    description: '주간 운동원 회의 및 전략 논의'
  },
  {
    id: '4',
    title: '후보자 등록 마감',
    date: '2024-01-25',
    time: '17:00',
    type: 'deadline',
    status: 'scheduled',
    description: '선거관리위원회 후보자 등록 마감일'
  }
];

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'campaign':
      return 'bg-blue-100 text-blue-800';
    case 'meeting':
      return 'bg-green-100 text-green-800';
    case 'deadline':
      return 'bg-red-100 text-red-800';
    case 'reminder':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getEventTypeText = (type: string) => {
  switch (type) {
    case 'campaign':
      return '캠페인';
    case 'meeting':
      return '회의';
    case 'deadline':
      return '마감일';
    case 'reminder':
      return '알림';
    default:
      return type;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800';
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
    case 'cancelled':
      return '취소됨';
    default:
      return status;
  }
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const upcomingEvents = getUpcomingEvents();
  const todayEvents = getEventsForDate(new Date().toISOString().split('T')[0]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              일정을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
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
            <h1 className="text-3xl font-bold text-gray-900">일정</h1>
            <p className="text-gray-600 mt-1">
              캠페인 일정과 중요한 이벤트들을 관리하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 일정
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">일정을 불러오는 중...</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today's Events */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    오늘의 일정
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todayEvents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      오늘 예정된 일정이 없습니다
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {todayEvents.map((event) => (
                        <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{event.title}</h4>
                            <Badge className={getEventTypeColor(event.type)} size="sm">
                              {getEventTypeText(event.type)}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {event.time}
                          </div>
                          {event.participants && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Users className="h-3 w-3 mr-1" />
                              {event.participants.toLocaleString()}명
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>일정 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 예정된 캠페인</span>
                    <span className="font-semibold">
                      {events.filter(e => e.type === 'campaign').length}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">이번 주 회의</span>
                    <span className="font-semibold">
                      {events.filter(e => e.type === 'meeting').length}개
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">다가오는 마감일</span>
                    <span className="font-semibold">
                      {events.filter(e => e.type === 'deadline').length}개
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Events */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      다가오는 일정
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium px-2">이번 주</span>
                      <Button variant="outline" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        예정된 일정이 없습니다
                      </h3>
                      <p className="text-gray-500 mb-6">
                        새로운 일정을 추가하여 시작하세요
                      </p>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        첫 번째 일정 만들기
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingEvents.map((event) => (
                        <Card key={event.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {event.title}
                                  </h3>
                                  <div className="flex gap-2">
                                    <Badge className={getEventTypeColor(event.type)}>
                                      {getEventTypeText(event.type)}
                                    </Badge>
                                    <Badge className={getStatusColor(event.status)}>
                                      {getStatusText(event.status)}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span>{formatDate(event.date)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{event.time}</span>
                                  </div>
                                </div>

                                {event.participants && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                                    <Users className="h-4 w-4" />
                                    <span>{event.participants.toLocaleString()}명 참여 예정</span>
                                  </div>
                                )}

                                {event.description && (
                                  <p className="text-sm text-gray-600">{event.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  보기
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Stats Footer */}
        {!isLoading && events.length > 0 && (
          <div className="mt-8 text-sm text-gray-500 text-center">
            총 {events.length}개의 예정된 일정 | 이번 주 {upcomingEvents.length}개 일정
          </div>
        )}
      </div>
    </div>
  );
}