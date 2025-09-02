'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, PlayCircle, CheckCircle, Users, Upload, Send, BarChart3, Clock, ChevronRight, Hash } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const tutorialContent = [
  {
    id: 'getting-started',
    title: '시작하기',
    icon: <PlayCircle className="h-5 w-5" />,
    description: '처음 사용자를 위한 기본 설정 가이드',
    estimatedTime: '10분',
    difficulty: 'easy',
    sections: [
      {
        id: 'first-login',
        title: '첫 로그인과 초기 설정',
        steps: [
          {
            title: '회원가입 완료',
            description: '이메일 인증을 통해 계정을 활성화합니다.',
            action: '이메일에서 인증 링크를 클릭하세요',
            image: null
          },
          {
            title: '조직 정보 입력',
            description: '캠페인 조직의 기본 정보를 입력합니다.',
            action: '설정 > 조직 정보에서 필수 항목을 채우세요',
            image: null
          },
          {
            title: '채널 연동 설정',
            description: 'SMS, 카카오톡 발송을 위한 API 설정을 완료합니다.',
            action: '설정 > 채널에서 각 서비스 연동을 활성화하세요',
            image: null
          }
        ]
      },
      {
        id: 'team-setup',
        title: '팀원 초대하기',
        steps: [
          {
            title: '팀원 추가',
            description: '협업할 팀원들을 플랫폼에 초대합니다.',
            action: '설정 > 사용자에서 이메일로 팀원을 초대하세요',
            image: null
          },
          {
            title: '역할 설정',
            description: '각 팀원의 권한과 역할을 지정합니다.',
            action: '초대 시 Admin 또는 Staff 역할을 선택하세요',
            image: null
          }
        ]
      }
    ]
  },
  {
    id: 'first-campaign',
    title: '첫 캠페인 만들기',
    icon: <Send className="h-5 w-5" />,
    description: '실제 캠페인을 생성하고 발송하는 전체 과정',
    estimatedTime: '20분',
    difficulty: 'medium',
    sections: [
      {
        id: 'prepare-contacts',
        title: '연락처 준비하기',
        steps: [
          {
            title: '연락처 파일 준비',
            description: 'Excel 또는 CSV 형식의 연락처 파일을 준비합니다.',
            action: '이름, 전화번호, 이메일 컬럼이 포함된 파일을 준비하세요',
            image: null
          },
          {
            title: '연락처 업로드',
            description: '준비한 파일을 시스템에 업로드합니다.',
            action: '연락처 > 가져오기 버튼을 클릭하고 파일을 선택하세요',
            image: null
          },
          {
            title: '필드 매핑 확인',
            description: '파일의 각 컬럼이 올바른 필드로 매핑되었는지 확인합니다.',
            action: '매핑 화면에서 각 컬럼을 적절한 필드로 연결하세요',
            image: null
          },
          {
            title: '중복 처리 설정',
            description: '중복된 연락처에 대한 처리 방식을 선택합니다.',
            action: '"자동 병합" 또는 "수동 검토" 중 하나를 선택하세요',
            image: null
          }
        ]
      },
      {
        id: 'create-first-campaign',
        title: '캠페인 생성하기',
        steps: [
          {
            title: '새 캠페인 시작',
            description: '캠페인 마법사를 통해 새로운 캠페인을 시작합니다.',
            action: '캠페인 > 새 캠페인 만들기를 클릭하세요',
            image: null
          },
          {
            title: '대상 선택',
            description: '메시지를 받을 연락처 그룹을 선택합니다.',
            action: '전체 연락처 또는 특정 태그를 선택하세요',
            image: null
          },
          {
            title: '메시지 작성',
            description: '발송할 메시지 내용을 작성합니다.',
            action: '개인화 태그({{이름}})를 활용해 메시지를 작성하세요',
            image: null
          },
          {
            title: '채널 설정',
            description: 'SMS, 카카오톡 등 발송 채널의 우선순위를 설정합니다.',
            action: '1순위 SMS, 2순위 카카오톡으로 설정을 권장합니다',
            image: null
          },
          {
            title: '미리보기 확인',
            description: '실제 발송될 메시지의 모습을 미리 확인합니다.',
            action: '미리보기에서 개인화가 올바르게 적용되었는지 확인하세요',
            image: null
          }
        ]
      },
      {
        id: 'send-campaign',
        title: '캠페인 발송하기',
        steps: [
          {
            title: '최종 검토',
            description: '발송 전 모든 설정을 마지막으로 검토합니다.',
            action: '대상 수, 메시지 내용, 예상 비용을 확인하세요',
            image: null
          },
          {
            title: '발송 실행',
            description: '캠페인을 실제로 발송합니다.',
            action: '"지금 발송" 또는 "예약 발송"을 선택하세요',
            image: null
          },
          {
            title: '실시간 모니터링',
            description: '발송 진행 상황을 실시간으로 모니터링합니다.',
            action: '발송 상태 페이지에서 성공/실패 현황을 확인하세요',
            image: null
          }
        ]
      }
    ]
  },
  {
    id: 'contact-management',
    title: '연락처 고급 관리',
    icon: <Users className="h-5 w-5" />,
    description: '연락처 태그, 세그먼트, 스마트 리스트 활용법',
    estimatedTime: '15분',
    difficulty: 'medium',
    sections: [
      {
        id: 'tagging-system',
        title: '태그 시스템 활용하기',
        steps: [
          {
            title: '태그 생성',
            description: '연락처 분류를 위한 태그를 생성합니다.',
            action: '연락처 > 태그 관리에서 새 태그를 만드세요',
            image: null
          },
          {
            title: '연락처에 태그 적용',
            description: '개별 또는 일괄로 연락처에 태그를 적용합니다.',
            action: '연락처를 선택하고 태그 추가 버튼을 클릭하세요',
            image: null
          },
          {
            title: '태그별 필터링',
            description: '특정 태그를 가진 연락처들을 빠르게 찾습니다.',
            action: '왼쪽 사이드바에서 태그를 클릭해 필터링하세요',
            image: null
          }
        ]
      },
      {
        id: 'smart-segments',
        title: '스마트 세그먼트 만들기',
        steps: [
          {
            title: '동적 세그먼트 생성',
            description: '조건에 따라 자동으로 업데이트되는 그룹을 만듭니다.',
            action: '연락처 > 세그먼트 > 새 세그먼트를 클릭하세요',
            image: null
          },
          {
            title: '조건 설정',
            description: '연령, 지역, 활동점수 등의 조건을 설정합니다.',
            action: '원하는 필터 조건들을 조합해서 설정하세요',
            image: null
          },
          {
            title: '세그먼트 활용',
            description: '생성한 세그먼트를 캠페인 대상으로 사용합니다.',
            action: '캠페인 생성 시 대상 선택에서 세그먼트를 선택하세요',
            image: null
          }
        ]
      }
    ]
  },
  {
    id: 'analytics-guide',
    title: '분석과 최적화',
    icon: <BarChart3 className="h-5 w-5" />,
    description: '캠페인 성과 분석과 개선 방법',
    estimatedTime: '12분',
    difficulty: 'advanced',
    sections: [
      {
        id: 'reading-analytics',
        title: '분석 데이터 읽기',
        steps: [
          {
            title: '기본 지표 이해',
            description: '발송률, 도달률, 열람률 등 기본 지표의 의미를 파악합니다.',
            action: '분석 > 캠페인 분석에서 각 지표의 툴팁을 확인하세요',
            image: null
          },
          {
            title: '시간대별 성과',
            description: '발송 시간대에 따른 성과 차이를 분석합니다.',
            action: '시간대별 차트에서 가장 효과적인 시간을 찾으세요',
            image: null
          },
          {
            title: '채널별 성과',
            description: 'SMS와 카카오톡의 성과를 비교 분석합니다.',
            action: '채널별 성과 탭에서 각 채널의 효율성을 비교하세요',
            image: null
          }
        ]
      },
      {
        id: 'optimization',
        title: '캠페인 최적화하기',
        steps: [
          {
            title: 'A/B 테스트 설정',
            description: '다른 메시지 버전으로 효과를 테스트합니다.',
            action: '캠페인 생성 시 A/B 테스트 옵션을 활성화하세요',
            image: null
          },
          {
            title: '개인화 최적화',
            description: '개인화 태그 사용이 성과에 미치는 영향을 분석합니다.',
            action: '개인화를 사용한 캠페인과 일반 캠페인을 비교하세요',
            image: null
          },
          {
            title: '발송 시간 최적화',
            description: '분석 결과를 바탕으로 최적의 발송 시간을 찾습니다.',
            action: '성과가 좋았던 시간대에 다음 캠페인을 예약하세요',
            image: null
          }
        ]
      }
    ]
  }
]

const difficultyColors = {
  easy: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-50 text-red-700 border-red-200'
}

const difficultyLabels = {
  easy: '초급',
  medium: '중급',
  advanced: '고급'
}

export default function TutorialPage() {
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
    handleScroll()
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
                    <CardTitle className="text-lg">튜토리얼</CardTitle>
                    <CardDescription>단계별 가이드</CardDescription>
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
                  {tutorialContent.map((tutorial) => (
                    <div key={tutorial.id} className="space-y-1">
                      <button
                        onClick={() => scrollToSection(tutorial.id)}
                        className={cn(
                          "flex items-center gap-2 w-full p-2 text-left text-sm font-medium rounded-lg transition-colors",
                          activeSection === tutorial.id 
                            ? "bg-blue-50 text-blue-700 border border-blue-200" 
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        {tutorial.icon}
                        <div>
                          <div>{tutorial.title}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {tutorial.estimatedTime}
                          </div>
                        </div>
                      </button>
                      <div className="ml-6 space-y-1">
                        {tutorial.sections.map((section) => (
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">실습 튜토리얼</h1>
              <p className="text-gray-600">
                단계별 가이드를 따라하며 실제로 기능을 사용해보세요
              </p>
              <div className="flex gap-2 mt-4">
                <Badge variant="outline">실습 위주</Badge>
                <Badge variant="secondary">단계별 진행</Badge>
              </div>
            </div>

            {/* Tutorial Content */}
            {tutorialContent.map((tutorial) => (
              <div key={tutorial.id} data-section={tutorial.id} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      {tutorial.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{tutorial.title}</h2>
                      <p className="text-gray-600 mt-1">{tutorial.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={difficultyColors[tutorial.difficulty as keyof typeof difficultyColors]}>
                      {difficultyLabels[tutorial.difficulty as keyof typeof difficultyLabels]}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {tutorial.estimatedTime}
                    </Badge>
                  </div>
                </div>

                {tutorial.sections.map((section, sectionIndex) => (
                  <Card key={section.id} data-section={section.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                          {sectionIndex + 1}
                        </div>
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {section.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex gap-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-full text-sm font-medium flex-shrink-0">
                              {stepIndex + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                              {step.action && (
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                  <p className="text-sm text-blue-800">
                                    <strong>실습:</strong> {step.action}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}

            {/* Completion Message */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">튜토리얼 완료!</h3>
                    <p className="text-green-700">모든 기능을 마스터하셨습니다</p>
                  </div>
                </div>
                <p className="text-sm text-green-800 mb-4">
                  이제 정치생산성허브의 모든 기능을 자유자재로 사용할 수 있습니다. 
                  실제 캠페인을 진행하면서 더 많은 노하우를 쌓아보세요.
                </p>
                <div className="flex gap-3">
                  <Link href="/campaigns">
                    <Button className="gap-2">
                      <Send className="h-4 w-4" />
                      첫 캠페인 시작하기
                    </Button>
                  </Link>
                  <Link href="/help/faq">
                    <Button variant="outline">추가 도움말 보기</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Links */}
            <Card className="border-dashed">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">다른 도움말 섹션</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/help/guide">
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <PlayCircle className="h-4 w-4" />
                      사용자 가이드
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