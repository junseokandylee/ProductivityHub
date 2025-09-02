'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2,
  Users,
  Settings,
  Shield,
  DollarSign,
  Smartphone,
  ChevronRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { useOrganization, useUsers, useQuotaInfo, useChannelConfigs } from '@/lib/api/settings'

interface SettingsCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  status?: 'success' | 'warning' | 'error' | 'neutral'
  badge?: string
  summary?: string
}

export default function SettingsPage() {
  const { data: organization } = useOrganization()
  const { data: users } = useUsers()
  const { data: quotaInfo } = useQuotaInfo()
  const { data: channels } = useChannelConfigs()

  const getQuotaStatus = () => {
    if (!quotaInfo) return 'neutral'
    if (quotaInfo.usagePercentage >= 90) return 'error'
    if (quotaInfo.usagePercentage >= 70) return 'warning'
    return 'success'
  }

  const getChannelsStatus = () => {
    if (!channels) return 'neutral'
    const activeChannels = channels.filter(c => c.isEnabled && c.status === 'active')
    if (activeChannels.length === 0) return 'error'
    if (activeChannels.length < channels.length / 2) return 'warning'
    return 'success'
  }

  const settingsCards: SettingsCard[] = [
    {
      title: '조직 정보',
      description: '조직 프로필, 연락처 정보 및 기본 설정을 관리합니다',
      icon: <Building2 className="h-5 w-5" />,
      href: '/settings/organization',
      status: 'neutral',
      summary: organization ? `${organization.displayName}` : '로딩 중...'
    },
    {
      title: '사용자 관리',
      description: '팀 멤버 초대, 역할 관리 및 권한 설정을 관리합니다',
      icon: <Users className="h-5 w-5" />,
      href: '/settings/users',
      status: 'neutral',
      badge: users ? `${users.length}명` : '0명',
      summary: users ? `활성 사용자 ${users.filter(u => u.status === 'active').length}명` : '로딩 중...'
    },
    {
      title: '채널 설정',
      description: 'SMS, 카카오, 이메일 등 메시징 채널을 설정합니다',
      icon: <Smartphone className="h-5 w-5" />,
      href: '/settings/channels',
      status: getChannelsStatus(),
      badge: channels ? `${channels.filter(c => c.isEnabled).length}개 활성` : '설정 필요',
      summary: channels ? `${channels.filter(c => c.status === 'active').length}개 채널 정상 작동` : '로딩 중...'
    },
    {
      title: '할당량 관리',
      description: '월간 메시지 할당량 현황 및 결제 정보를 확인합니다',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/settings/quota',
      status: getQuotaStatus(),
      badge: quotaInfo ? `${quotaInfo.usagePercentage.toFixed(0)}% 사용` : '확인 중...',
      summary: quotaInfo ? `${quotaInfo.remainingQuota.toLocaleString()}건 남음` : '로딩 중...'
    },
    {
      title: '보안 설정',
      description: '비밀번호 정책, 2FA, API 토큰 등 보안 설정을 관리합니다',
      icon: <Shield className="h-5 w-5" />,
      href: '/settings/security',
      status: 'success',
      badge: '보안',
      summary: '비밀번호 정책 및 API 토큰 관리'
    }
  ]

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">설정</h1>
        <p className="text-lg text-gray-600 mt-2">
          조직, 사용자, 채널 및 보안 설정을 관리하세요
        </p>
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">조직</p>
                <p className="text-2xl font-bold">
                  {organization?.displayName || '설정 필요'}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 사용자</p>
                <p className="text-2xl font-bold">
                  {users?.filter(u => u.status === 'active').length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 채널</p>
                <p className="text-2xl font-bold">
                  {channels?.filter(c => c.isEnabled && c.status === 'active').length || 0}
                </p>
              </div>
              <Smartphone className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">할당량 사용률</p>
                <p className="text-2xl font-bold">
                  {quotaInfo?.usagePercentage.toFixed(0) || 0}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsCards.map((setting) => (
          <Link key={setting.href} href={setting.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {setting.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{setting.title}</CardTitle>
                    {setting.badge && (
                      <Badge 
                        variant="outline" 
                        className={`mt-1 ${getStatusColor(setting.status)}`}
                      >
                        {setting.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(setting.status)}
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-600 mb-3">
                  {setting.description}
                </CardDescription>
                {setting.summary && (
                  <p className="text-sm font-medium text-gray-700">
                    {setting.summary}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 작업</CardTitle>
          <CardDescription>
            자주 사용하는 설정 작업들을 빠르게 수행하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/settings/users">
                <Users className="h-4 w-4 mr-2" />
                사용자 초대
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/channels">
                <Smartphone className="h-4 w-4 mr-2" />
                채널 테스트
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/quota">
                <DollarSign className="h-4 w-4 mr-2" />
                할당량 확인
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/security">
                <Shield className="h-4 w-4 mr-2" />
                API 토큰 생성
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 상태</CardTitle>
          <CardDescription>
            현재 시스템 구성 요소의 상태를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">데이터베이스 연결</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                정상
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">메시지 큐</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                정상
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(getChannelsStatus())}
                <span className="font-medium">메시징 서비스</span>
              </div>
              <Badge variant="outline" className={getStatusColor(getChannelsStatus())}>
                {channels?.filter(c => c.isEnabled).length || 0}개 활성
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">인증 서비스</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                정상
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}