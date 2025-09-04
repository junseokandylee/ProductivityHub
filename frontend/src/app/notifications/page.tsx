'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Bell,
  Search,
  Filter,
  CheckCheck,
  X,
  Archive,
  Settings,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  MessageSquare,
  Shield,
  CreditCard,
  Users,
  BarChart3,
  Mail,
  Calendar,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react'

// Mock notification data
const mockNotifications = [
  {
    id: '1',
    title: '캠페인 "서울시장 선거" 발송 완료',
    message: '총 15,234명에게 SMS가 성공적으로 발송되었습니다.',
    type: '캠페인',
    category: 'campaign',
    priority: 'high',
    isRead: false,
    createdAt: '2024-01-15T09:30:00Z',
    icon: <MessageSquare className="h-4 w-4" />,
    actionUrl: '/campaigns/123'
  },
  {
    id: '2',
    title: '보안 알림: 새로운 로그인 감지',
    message: '서울 지역에서 새로운 기기로 로그인이 감지되었습니다.',
    type: '보안',
    category: 'security',
    priority: 'high',
    isRead: false,
    createdAt: '2024-01-15T08:45:00Z',
    icon: <Shield className="h-4 w-4" />,
    actionUrl: '/settings/security'
  },
  {
    id: '3',
    title: '연락처 가져오기 완료',
    message: '1,234개의 새로운 연락처가 성공적으로 추가되었습니다.',
    type: '시스템',
    category: 'system',
    priority: 'medium',
    isRead: true,
    createdAt: '2024-01-15T07:20:00Z',
    icon: <Users className="h-4 w-4" />,
    actionUrl: '/contacts'
  },
  {
    id: '4',
    title: '결제 알림: 월간 구독료 청구',
    message: '2024년 1월 월간 구독료 ₩29,900이 청구되었습니다.',
    type: '결제',
    category: 'billing',
    priority: 'low',
    isRead: true,
    createdAt: '2024-01-15T06:00:00Z',
    icon: <CreditCard className="h-4 w-4" />,
    actionUrl: '/settings/billing'
  },
  {
    id: '5',
    title: '분석 보고서 생성 완료',
    message: '12월 캠페인 성과 분석 보고서가 준비되었습니다.',
    type: '시스템',
    category: 'system',
    priority: 'medium',
    isRead: false,
    createdAt: '2024-01-14T22:15:00Z',
    icon: <BarChart3 className="h-4 w-4" />,
    actionUrl: '/analytics'
  },
  {
    id: '6',
    title: '예약된 캠페인 발송 예정',
    message: '캠페인 "지역 행사 안내"가 내일 오전 9시에 발송 예정입니다.',
    type: '캠페인',
    category: 'campaign',
    priority: 'medium',
    isRead: true,
    createdAt: '2024-01-14T18:30:00Z',
    icon: <Calendar className="h-4 w-4" />,
    actionUrl: '/campaigns/456'
  }
]

const categoryMap = {
  system: { label: '시스템', color: 'bg-blue-100 text-blue-800' },
  campaign: { label: '캠페인', color: 'bg-green-100 text-green-800' },
  security: { label: '보안', color: 'bg-red-100 text-red-800' },
  billing: { label: '결제', color: 'bg-purple-100 text-purple-800' }
}

const priorityMap = {
  high: { label: '높음', color: 'bg-red-100 text-red-800' },
  medium: { label: '보통', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: '낮음', color: 'bg-gray-100 text-gray-800' }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest')

  // Filter notifications based on current filters
  const filteredNotifications = notifications
    .filter(notif => {
      if (searchQuery && !notif.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !notif.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedCategory !== 'all' && notif.category !== selectedCategory) {
        return false
      }
      if (selectedPriority !== 'all' && notif.priority !== selectedPriority) {
        return false
      }
      if (showUnreadOnly && notif.isRead) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority as keyof typeof priorityOrder] - 
                 priorityOrder[a.priority as keyof typeof priorityOrder]
        default:
          return 0
      }
    })

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    )
  }

  const handleMarkAsUnread = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: false } : notif
      )
    )
  }

  const handleBulkMarkAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => 
        selectedItems.includes(notif.id) ? { ...notif, isRead: true } : notif
      )
    )
    setSelectedItems([])
  }

  const handleBulkDelete = () => {
    setNotifications(prev => 
      prev.filter(notif => !selectedItems.includes(notif.id))
    )
    setSelectedItems([])
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredNotifications.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredNotifications.map(n => n.id))
    }
  }

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}일 전`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell className="h-8 w-8 text-blue-600" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">알림 센터</h1>
              <p className="text-gray-600 mt-1">
                시스템 알림과 중요한 업데이트를 확인하세요
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            알림 설정
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">읽지 않음</p>
                  <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
                </div>
                <Bell className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">전체 알림</p>
                  <p className="text-2xl font-bold text-blue-600">{notifications.length}</p>
                </div>
                <Archive className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">높은 우선순위</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {notifications.filter(n => n.priority === 'high').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">오늘 알림</p>
                  <p className="text-2xl font-bold text-green-600">
                    {notifications.filter(n => {
                      const today = new Date()
                      const notifDate = new Date(n.createdAt)
                      return notifDate.toDateString() === today.toDateString()
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="알림 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    <SelectItem value="system">시스템</SelectItem>
                    <SelectItem value="campaign">캠페인</SelectItem>
                    <SelectItem value="security">보안</SelectItem>
                    <SelectItem value="billing">결제</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="우선순위" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 우선순위</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unread-only" 
                    checked={showUnreadOnly}
                    onCheckedChange={(checked) => setShowUnreadOnly(!!checked)}
                  />
                  <label htmlFor="unread-only" className="text-sm font-medium cursor-pointer">
                    읽지 않은 알림만
                  </label>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">최신순</SelectItem>
                    <SelectItem value="oldest">과거순</SelectItem>
                    <SelectItem value="priority">우선순위순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{selectedItems.length}개의 알림이 선택되었습니다.</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkMarkAsRead}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  읽음 처리
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                  <X className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? '검색 결과가 없습니다' : '알림이 없습니다'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery 
                    ? '다른 검색어로 시도해보세요' 
                    : '새로운 알림이 도착하면 여기에 표시됩니다'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedItems.length === filteredNotifications.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {selectedItems.length === filteredNotifications.length 
                          ? '모두 선택 해제' 
                          : '모두 선택'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {filteredNotifications.length}개의 알림
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Items */}
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`transition-all ${
                    !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
                  } ${selectedItems.includes(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedItems.includes(notification.id)}
                        onCheckedChange={() => handleItemSelect(notification.id)}
                      />
                      
                      <div className={`p-2 rounded-lg ${categoryMap[notification.category as keyof typeof categoryMap]?.color || 'bg-gray-100'}`}>
                        {notification.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                              )}
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center gap-3 text-sm">
                              <Badge className={categoryMap[notification.category as keyof typeof categoryMap]?.color}>
                                {notification.type}
                              </Badge>
                              <Badge variant="outline" className={priorityMap[notification.priority as keyof typeof priorityMap]?.color}>
                                {priorityMap[notification.priority as keyof typeof priorityMap]?.label}
                              </Badge>
                              <span className="text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {notification.isRead ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsUnread(notification.id)}
                              >
                                읽지 않음으로 표시
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                읽음 처리
                              </Button>
                            )}
                            
                            {notification.actionUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={notification.actionUrl}>
                                  보기
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Load More */}
        {filteredNotifications.length > 0 && (
          <div className="text-center pt-6">
            <Button variant="outline">
              더 많은 알림 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}