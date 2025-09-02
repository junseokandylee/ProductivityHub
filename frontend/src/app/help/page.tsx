'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, MessageSquare, Users, PlayCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const helpSections = [
  {
    title: '사용자 가이드',
    description: '플랫폼의 모든 기능을 단계별로 설명하는 상세한 가이드입니다',
    icon: <BookOpen className="h-6 w-6" />,
    href: '/help/guide',
    color: 'bg-blue-50 text-blue-600 border-blue-200'
  },
  {
    title: '튜토리얼',
    description: '실제 사용 사례와 함께하는 단계별 튜토리얼',
    icon: <PlayCircle className="h-6 w-6" />,
    href: '/help/tutorial',
    color: 'bg-green-50 text-green-600 border-green-200'
  },
  {
    title: '자주 묻는 질문',
    description: '사용자들이 자주 묻는 질문과 답변을 확인하세요',
    icon: <MessageSquare className="h-6 w-6" />,
    href: '/help/faq',
    color: 'bg-purple-50 text-purple-600 border-purple-200'
  },
  {
    title: '문의하기',
    description: '궁금한 점이나 문제가 있으시면 언제든 문의해주세요',
    icon: <Mail className="h-6 w-6" />,
    href: '/help/contact',
    color: 'bg-orange-50 text-orange-600 border-orange-200'
  }
]

const quickLinks = [
  { title: '계정 설정', href: '/help/guide#account' },
  { title: '연락처 가져오기', href: '/help/guide#contacts' },
  { title: '캠페인 만들기', href: '/help/guide#campaigns' },
  { title: '메시지 발송', href: '/help/guide#messaging' },
  { title: '분석 보고서', href: '/help/guide#analytics' }
]

export default function HelpPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">도움말 센터</h1>
          <p className="text-gray-600">
            정치생산성허브 사용에 필요한 모든 정보를 제공합니다
          </p>
        </div>
      </div>

      {/* Welcome Section */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Users className="h-5 w-5" />
            정치생산성허브에 오신 것을 환영합니다
          </CardTitle>
          <CardDescription className="text-blue-700">
            이 플랫폼은 정치 캠페인의 연락처 관리와 다채널 메시징을 위한 통합 솔루션입니다. 
            아래 가이드를 통해 모든 기능을 효율적으로 활용해보세요.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Help Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpSections.map((section) => (
          <Card key={section.href} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${section.color}`}>
                  {section.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={section.href}>
                <Button variant="outline" className="w-full">
                  {section.title} 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 링크</CardTitle>
          <CardDescription>
            자주 찾는 도움말 항목들을 빠르게 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" className="w-full justify-start h-auto p-3">
                  <div className="text-left">
                    <p className="font-medium">{link.title}</p>
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Info */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              추가 지원이 필요하신가요?
            </h3>
            <p className="text-gray-600 mb-4">
              문제를 해결하지 못하셨다면 언제든 저희에게 문의해주세요
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/help/contact">
                <Button>문의하기</Button>
              </Link>
              <Link href="/help/faq">
                <Button variant="outline">FAQ 보기</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}