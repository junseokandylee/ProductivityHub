'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Upload, MessageSquare, BarChart3, Settings, ChevronRight, Hash } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const guideContent = [
  {
    id: 'account',
    title: '계정 설정',
    icon: <Settings className="h-5 w-5" />,
    sections: [
      {
        id: 'account-setup',
        title: '초기 계정 설정',
        content: `
          <h4 class="text-lg font-semibold mb-3">계정 생성 및 초기 설정</h4>
          <p class="mb-4">정치생산성허브를 시작하려면 먼저 계정을 생성하고 조직 정보를 설정해야 합니다.</p>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li>회원가입 후 이메일 인증을 완료하세요</li>
            <li>조직 프로필에서 캠페인 정보를 입력하세요</li>
            <li>팀원들을 초대하고 역할을 설정하세요</li>
            <li>채널 설정에서 SMS, 카카오톡 연동을 완료하세요</li>
          </ol>
          <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p class="text-sm text-blue-800"><strong>팁:</strong> 초기 설정을 완료하면 모든 기능을 원활하게 사용할 수 있습니다.</p>
          </div>
        `
      },
      {
        id: 'user-roles',
        title: '사용자 역할 관리',
        content: `
          <h4 class="text-lg font-semibold mb-3">팀원 역할과 권한</h4>
          <p class="mb-4">팀원들의 역할에 따라 적절한 권한을 부여할 수 있습니다.</p>
          <div class="space-y-3 mb-4">
            <div class="border p-3 rounded-lg">
              <h5 class="font-medium text-green-600">소유자 (Owner)</h5>
              <p class="text-sm text-gray-600">모든 기능과 설정에 접근 가능하며 결제 관리까지 담당합니다.</p>
            </div>
            <div class="border p-3 rounded-lg">
              <h5 class="font-medium text-blue-600">관리자 (Admin)</h5>
              <p class="text-sm text-gray-600">연락처 관리, 캠페인 생성/발송, 분석 조회가 가능합니다.</p>
            </div>
            <div class="border p-3 rounded-lg">
              <h5 class="font-medium text-orange-600">직원 (Staff)</h5>
              <p class="text-sm text-gray-600">연락처 조회, 캠페인 조회 등 제한적인 기능만 사용 가능합니다.</p>
            </div>
          </div>
        `
      }
    ]
  },
  {
    id: 'contacts',
    title: '연락처 관리',
    icon: <Users className="h-5 w-5" />,
    sections: [
      {
        id: 'import-contacts',
        title: '연락처 가져오기',
        content: `
          <h4 class="text-lg font-semibold mb-3">CSV/Excel 파일로 연락처 업로드</h4>
          <p class="mb-4">대량의 연락처를 한 번에 업로드하고 관리할 수 있습니다.</p>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li>연락처 메뉴에서 "가져오기" 버튼을 클릭하세요</li>
            <li>CSV 또는 Excel 파일을 선택하세요 (최대 100,000건)</li>
            <li>필드 매핑을 확인하고 조정하세요</li>
            <li>중복 처리 옵션을 선택하세요</li>
            <li>업로드를 실행하고 진행 상황을 모니터링하세요</li>
          </ol>
          <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p class="text-sm text-yellow-800"><strong>주의:</strong> 업로드 시 개인정보 보호법을 준수해주세요.</p>
          </div>
        `
      },
      {
        id: 'deduplication',
        title: '중복 연락처 처리',
        content: `
          <h4 class="text-lg font-semibold mb-3">자동 중복 제거 시스템</h4>
          <p class="mb-4">시스템이 자동으로 중복을 감지하고 병합 옵션을 제공합니다.</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>전화번호:</strong> 동일한 번호의 연락처는 자동으로 병합됩니다</li>
            <li><strong>이메일:</strong> 같은 이메일 주소를 가진 연락처를 통합합니다</li>
            <li><strong>카카오 ID:</strong> 동일한 카카오톡 ID는 하나로 관리됩니다</li>
          </ul>
          <p class="text-sm text-gray-600">중복 제거 정확도는 95% 이상을 보장합니다.</p>
        `
      },
      {
        id: 'contact-management',
        title: '연락처 관리',
        content: `
          <h4 class="text-lg font-semibold mb-3">연락처 검색 및 필터링</h4>
          <p class="mb-4">강력한 검색 및 필터링 기능으로 원하는 연락처를 빠르게 찾을 수 있습니다.</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>빠른 검색:</strong> 이름, 전화번호, 이메일로 즉시 검색</li>
            <li><strong>태그 필터:</strong> 지역, 직업, 나이 등 태그로 분류</li>
            <li><strong>고급 필터:</strong> 여러 조건을 조합한 세밀한 필터링</li>
            <li><strong>스마트 리스트:</strong> 활동 점수 기반 동적 세그먼트</li>
          </ul>
          <p class="text-sm text-gray-600">검색 응답 시간은 150ms 이하로 최적화되어 있습니다.</p>
        `
      }
    ]
  },
  {
    id: 'campaigns',
    title: '캠페인 관리',
    icon: <MessageSquare className="h-5 w-5" />,
    sections: [
      {
        id: 'create-campaign',
        title: '캠페인 생성',
        content: `
          <h4 class="text-lg font-semibold mb-3">캠페인 마법사 사용하기</h4>
          <p class="mb-4">단계별 가이드를 통해 효과적인 캠페인을 만들 수 있습니다.</p>
          <ol class="list-decimal list-inside space-y-2 mb-4">
            <li><strong>대상 선택:</strong> 발송할 연락처 그룹을 선택하세요</li>
            <li><strong>메시지 작성:</strong> 개인화된 메시지를 작성하세요</li>
            <li><strong>채널 설정:</strong> SMS, 카카오톡 우선순위를 정하세요</li>
            <li><strong>검토 및 발송:</strong> 최종 검토 후 발송을 실행하세요</li>
          </ol>
          <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p class="text-sm text-green-800"><strong>성능:</strong> 10,000개 메시지를 20분 이내에 발송할 수 있습니다.</p>
          </div>
        `
      },
      {
        id: 'personalization',
        title: '메시지 개인화',
        content: `
          <h4 class="text-lg font-semibold mb-3">개인화 태그 활용</h4>
          <p class="mb-4">수신자별로 맞춤화된 메시지를 발송할 수 있습니다.</p>
          <div class="bg-gray-50 p-4 rounded-lg font-mono text-sm mb-4">
            <p>안녕하세요 {{이름}}님,</p>
            <p>{{지역}} 지역의 {{직업}} 분들을 위한 정책을 준비했습니다.</p>
            <p>{{날짜}}까지 의견을 보내주세요.</p>
          </div>
          <p class="text-sm text-gray-600">중괄호{{}} 안에 필드명을 입력하면 자동으로 개인 정보로 대체됩니다.</p>
        `
      },
      {
        id: 'scheduling',
        title: '발송 예약',
        content: `
          <h4 class="text-lg font-semibold mb-3">최적 시간 발송 예약</h4>
          <p class="mb-4">효과적인 발송을 위한 시간대 설정과 예약 발송 기능입니다.</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>즉시 발송:</strong> 검토 완료 후 바로 발송</li>
            <li><strong>예약 발송:</strong> 지정한 날짜와 시간에 자동 발송</li>
            <li><strong>최적 시간:</strong> 수신자 활동 패턴 기반 최적 시간 추천</li>
          </ul>
        `
      }
    ]
  },
  {
    id: 'messaging',
    title: '메시징',
    icon: <MessageSquare className="h-5 w-5" />,
    sections: [
      {
        id: 'multi-channel',
        title: '다채널 발송',
        content: `
          <h4 class="text-lg font-semibold mb-3">SMS와 카카오톡 통합 발송</h4>
          <p class="mb-4">여러 채널을 활용해 도달률을 높일 수 있습니다.</p>
          <div class="space-y-3 mb-4">
            <div class="border-l-4 border-blue-500 pl-4">
              <h5 class="font-medium">1순위: SMS</h5>
              <p class="text-sm text-gray-600">가장 확실한 도달을 보장하는 기본 채널</p>
            </div>
            <div class="border-l-4 border-green-500 pl-4">
              <h5 class="font-medium">2순위: 카카오톡</h5>
              <p class="text-sm text-gray-600">SMS 실패 시 자동으로 카카오톡으로 발송</p>
            </div>
          </div>
          <p class="text-sm text-gray-600">전체 도달률 95% 이상을 목표로 최적화되어 있습니다.</p>
        `
      },
      {
        id: 'templates',
        title: '메시지 템플릿',
        content: `
          <h4 class="text-lg font-semibold mb-3">재사용 가능한 템플릿</h4>
          <p class="mb-4">자주 사용하는 메시지를 템플릿으로 저장하고 관리하세요.</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>선거 공지:</strong> 투표일, 정책 발표 등 공식 안내</li>
            <li><strong>이벤트 초대:</strong> 집회, 간담회 등 행사 안내</li>
            <li><strong>감사 인사:</strong> 지지 감사, 참여 독려 메시지</li>
            <li><strong>긴급 공지:</strong> 돌발 상황 대응 긴급 메시지</li>
          </ul>
        `
      }
    ]
  },
  {
    id: 'analytics',
    title: '분석 및 보고서',
    icon: <BarChart3 className="h-5 w-5" />,
    sections: [
      {
        id: 'real-time-monitoring',
        title: '실시간 모니터링',
        content: `
          <h4 class="text-lg font-semibold mb-3">발송 상태 실시간 추적</h4>
          <p class="mb-4">캠페인 발송 중 실시간으로 성과를 모니터링할 수 있습니다.</p>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="border p-3 rounded-lg text-center">
              <p class="text-2xl font-bold text-green-600">95%</p>
              <p class="text-sm text-gray-600">성공률</p>
            </div>
            <div class="border p-3 rounded-lg text-center">
              <p class="text-2xl font-bold text-blue-600">50/s</p>
              <p class="text-sm text-gray-600">발송 속도</p>
            </div>
          </div>
          <p class="text-sm text-gray-600">대시보드 데이터는 5초 이내로 업데이트됩니다.</p>
        `
      },
      {
        id: 'reports',
        title: '보고서 생성',
        content: `
          <h4 class="text-lg font-semibold mb-3">상세 분석 보고서</h4>
          <p class="mb-4">캠페인 성과를 분석하고 개선점을 찾을 수 있는 보고서를 제공합니다.</p>
          <ul class="list-disc list-inside space-y-2 mb-4">
            <li><strong>발송 통계:</strong> 성공/실패율, 채널별 성과</li>
            <li><strong>수신자 반응:</strong> 열람률, 클릭률, 응답률</li>
            <li><strong>비용 분석:</strong> 채널별 비용 및 ROI 계산</li>
            <li><strong>시간대 분석:</strong> 발송 시간대별 효과 분석</li>
          </ul>
          <p class="text-sm text-gray-600">모든 보고서는 PDF 또는 CSV 형태로 내보낼 수 있습니다.</p>
        `
      }
    ]
  }
]

export default function GuideePage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section]')
      let currentSection = ''

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect()
        if (rect.top <= 100 && rect.bottom > 100) {
          currentSection = section.getAttribute('data-section') || ''
        }
      })

      setActiveSection(currentSection)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Call once to set initial active section
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-section="${sectionId}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex gap-8">
        {/* Table of Contents */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">사용자 가이드</CardTitle>
                    <CardDescription>목차</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <nav className="space-y-2">
                  {guideContent.map((category) => (
                    <div key={category.id} className="space-y-1">
                      <button
                        onClick={() => scrollToSection(category.id)}
                        className={cn(
                          "flex items-center gap-2 w-full p-2 text-left text-sm font-medium rounded-lg transition-colors",
                          activeSection === category.id 
                            ? "bg-blue-50 text-blue-700 border border-blue-200" 
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        {category.icon}
                        {category.title}
                      </button>
                      <div className="ml-6 space-y-1">
                        {category.sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={cn(
                              "flex items-center gap-2 w-full p-1 text-left text-xs rounded transition-colors",
                              activeSection === section.id 
                                ? "bg-blue-50 text-blue-600" 
                                : "hover:bg-gray-50 text-gray-600"
                            )}
                          >
                            <Hash className="h-3 w-3" />
                            {section.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">사용자 가이드</h1>
              <p className="text-gray-600">
                정치생산성허브의 모든 기능을 단계별로 설명합니다
              </p>
              <div className="flex gap-2 mt-4">
                <Badge variant="outline">최신 업데이트</Badge>
                <Badge variant="secondary">완전한 가이드</Badge>
              </div>
            </div>

            {/* Guide Content */}
            {guideContent.map((category) => (
              <div key={category.id} data-section={category.id} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    {category.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                </div>

                {category.sections.map((section) => (
                  <Card key={section.id} data-section={section.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}

            {/* Navigation Links */}
            <Card className="border-dashed">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">다른 도움말 섹션</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/help/tutorial">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <PlayCircle className="h-4 w-4" />
                      튜토리얼
                    </Button>
                  </Link>
                  <Link href="/help/faq">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <MessageSquare className="h-4 w-4" />
                      자주 묻는 질문
                    </Button>
                  </Link>
                  <Link href="/help/contact">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Mail className="h-4 w-4" />
                      문의하기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}