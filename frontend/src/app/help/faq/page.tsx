'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ArrowLeft, Search, Users, Upload, MessageSquare, BarChart3, Settings, CreditCard, Shield, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const faqData = [
  {
    id: 'account',
    category: '계정 & 설정',
    icon: <Settings className="h-5 w-5" />,
    color: 'bg-blue-50 text-blue-600',
    items: [
      {
        id: 'account-1',
        question: '회원가입은 어떻게 하나요?',
        answer: '홈페이지 우상단의 "회원가입" 버튼을 클릭하여 이메일과 기본 정보를 입력하시면 됩니다. 이메일 인증 완료 후 바로 사용할 수 있습니다.',
        keywords: ['회원가입', '계정', '등록', '이메일']
      },
      {
        id: 'account-2',
        question: '비밀번호를 잊어버렸습니다',
        answer: '로그인 페이지의 "비밀번호 찾기"를 클릭하고 등록된 이메일 주소를 입력하세요. 비밀번호 재설정 링크를 이메일로 보내드립니다.',
        keywords: ['비밀번호', '찾기', '재설정', '이메일']
      },
      {
        id: 'account-3',
        question: '조직 정보를 어떻게 수정하나요?',
        answer: '설정 > 조직 정보 메뉴에서 조직명, 연락처, 주소 등을 수정할 수 있습니다. 소유자 또는 관리자 권한이 필요합니다.',
        keywords: ['조직', '수정', '설정', '정보']
      },
      {
        id: 'account-4',
        question: '팀원을 초대하려면 어떻게 해야 하나요?',
        answer: '설정 > 사용자 메뉴에서 "사용자 초대" 버튼을 클릭하고 이메일 주소와 역할을 선택하여 초대할 수 있습니다.',
        keywords: ['팀원', '초대', '사용자', '권한']
      }
    ]
  },
  {
    id: 'contacts',
    category: '연락처 관리',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-green-50 text-green-600',
    items: [
      {
        id: 'contacts-1',
        question: '한번에 얼마나 많은 연락처를 업로드할 수 있나요?',
        answer: '최대 100,000개의 연락처를 한번에 업로드할 수 있습니다. CSV 또는 Excel 파일 형식을 지원합니다.',
        keywords: ['업로드', '연락처', '제한', '개수', '100000']
      },
      {
        id: 'contacts-2',
        question: '중복된 연락처는 어떻게 처리되나요?',
        answer: '전화번호, 이메일, 카카오 ID를 기준으로 자동으로 중복을 감지하고 병합합니다. 중복 제거 정확도는 95% 이상입니다.',
        keywords: ['중복', '병합', '자동', '처리']
      },
      {
        id: 'contacts-3',
        question: '연락처를 태그로 분류할 수 있나요?',
        answer: '네, 지역, 직업, 나이 등 다양한 태그를 생성하여 연락처를 분류하고 관리할 수 있습니다.',
        keywords: ['태그', '분류', '관리', '그룹']
      },
      {
        id: 'contacts-4',
        question: '연락처 검색이 느려요',
        answer: '연락처 검색은 150ms 이하로 최적화되어 있습니다. 많은 수의 연락처가 있는 경우 태그나 필터를 먼저 적용해보세요.',
        keywords: ['검색', '속도', '느림', '최적화']
      },
      {
        id: 'contacts-5',
        question: '연락처를 내보낼 수 있나요?',
        answer: '연락처 목록에서 "내보내기" 버튼을 클릭하여 CSV 또는 Excel 형식으로 내보낼 수 있습니다. 필터가 적용된 상태로도 내보내기가 가능합니다.',
        keywords: ['내보내기', 'CSV', 'Excel', '다운로드']
      }
    ]
  },
  {
    id: 'campaigns',
    category: '캠페인 & 발송',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'bg-purple-50 text-purple-600',
    items: [
      {
        id: 'campaigns-1',
        question: '한 번에 얼마나 많은 메시지를 보낼 수 있나요?',
        answer: '기본적으로 초당 50개 메시지를 발송할 수 있으며, 10,000개 메시지는 약 20분 내에 완료됩니다.',
        keywords: ['발송', '속도', '제한', '메시지', '10000']
      },
      {
        id: 'campaigns-2',
        question: 'SMS와 카카오톡 중 어느 것이 먼저 발송되나요?',
        answer: '기본 설정은 SMS 우선입니다. SMS 발송이 실패하면 자동으로 카카오톡으로 대체 발송됩니다. 채널 우선순위는 변경할 수 있습니다.',
        keywords: ['SMS', '카카오톡', '우선순위', '대체']
      },
      {
        id: 'campaigns-3',
        question: '개인화 메시지는 어떻게 만드나요?',
        answer: '{{이름}}, {{지역}} 등의 태그를 메시지에 삽입하면 각 수신자의 정보로 자동 치환됩니다.',
        keywords: ['개인화', '태그', '치환', '메시지']
      },
      {
        id: 'campaigns-4',
        question: '캠페인을 예약 발송할 수 있나요?',
        answer: '네, 캠페인 생성 시 "예약 발송"을 선택하고 원하는 날짜와 시간을 설정할 수 있습니다.',
        keywords: ['예약', '발송', '스케줄', '시간']
      },
      {
        id: 'campaigns-5',
        question: '발송 실패한 메시지는 어떻게 확인하나요?',
        answer: '캠페인 상세 페이지에서 실패한 메시지 목록과 실패 사유를 확인할 수 있습니다. 필요시 재발송도 가능합니다.',
        keywords: ['실패', '재발송', '사유', '확인']
      }
    ]
  },
  {
    id: 'analytics',
    category: '분석 & 보고서',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'bg-orange-50 text-orange-600',
    items: [
      {
        id: 'analytics-1',
        question: '발송 통계는 얼마나 자세히 볼 수 있나요?',
        answer: '발송 성공률, 열람률, 클릭률 등을 실시간으로 확인할 수 있으며, 시간대별, 채널별 세부 분석도 제공됩니다.',
        keywords: ['통계', '성공률', '열람률', '클릭률']
      },
      {
        id: 'analytics-2',
        question: '보고서를 다운로드할 수 있나요?',
        answer: '모든 분석 데이터는 PDF 또는 CSV 형태로 다운로드할 수 있습니다. 필요한 기간과 항목을 선택하여 맞춤 보고서를 생성할 수 있습니다.',
        keywords: ['보고서', '다운로드', 'PDF', 'CSV']
      },
      {
        id: 'analytics-3',
        question: 'A/B 테스트는 어떻게 진행하나요?',
        answer: '캠페인 생성 시 A/B 테스트를 활성화하고 서로 다른 메시지 버전을 설정하면 자동으로 테스트 그룹을 나누어 발송하고 결과를 비교해드립니다.',
        keywords: ['A/B', '테스트', '비교', '버전']
      },
      {
        id: 'analytics-4',
        question: '실시간 데이터 업데이트 주기는 얼마나 되나요?',
        answer: '발송 상태와 분석 데이터는 5초 이내로 실시간 업데이트됩니다.',
        keywords: ['실시간', '업데이트', '주기', '5초']
      }
    ]
  },
  {
    id: 'billing',
    category: '요금 & 결제',
    icon: <CreditCard className="h-5 w-5" />,
    color: 'bg-yellow-50 text-yellow-600',
    items: [
      {
        id: 'billing-1',
        question: '요금은 어떻게 책정되나요?',
        answer: 'SMS는 건당 20원, 카카오톡 알림톡은 건당 15원으로 실제 발송된 메시지에 대해서만 과금됩니다.',
        keywords: ['요금', 'SMS', '카카오톡', '과금']
      },
      {
        id: 'billing-2',
        question: '무료 체험이 가능한가요?',
        answer: '신규 가입 시 SMS 100건, 카카오톡 100건을 무료로 제공합니다. 추가 사용량은 선불 충전 방식으로 이용할 수 있습니다.',
        keywords: ['무료', '체험', '100건', '신규']
      },
      {
        id: 'billing-3',
        question: '월 사용량 제한이 있나요?',
        answer: '계정당 월 1,000,000건까지 발송 가능하며, 더 많은 사용량이 필요한 경우 고객지원팀에 문의해주세요.',
        keywords: ['제한', '1000000', '월', '사용량']
      },
      {
        id: 'billing-4',
        question: '결제 방법은 무엇이 있나요?',
        answer: '신용카드, 계좌이체, 무통장입금을 지원합니다. 법인 고객의 경우 세금계산서 발행도 가능합니다.',
        keywords: ['결제', '신용카드', '계좌이체', '세금계산서']
      }
    ]
  },
  {
    id: 'security',
    category: '보안 & 개인정보',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-red-50 text-red-600',
    items: [
      {
        id: 'security-1',
        question: '개인정보는 안전하게 보호되나요?',
        answer: '모든 개인정보는 암호화되어 저장되며, 국내 서버에서만 관리됩니다. 개인정보보호법을 완벽히 준수합니다.',
        keywords: ['개인정보', '암호화', '보호', '국내']
      },
      {
        id: 'security-2',
        question: '2단계 인증을 설정할 수 있나요?',
        answer: '네, 설정 > 보안에서 TOTP 앱, SMS, 이메일을 통한 2단계 인증을 설정할 수 있습니다.',
        keywords: ['2단계', '인증', 'TOTP', 'SMS']
      },
      {
        id: 'security-3',
        question: 'API 사용이 가능한가요?',
        answer: '네, RESTful API를 제공합니다. 설정 > API 토큰에서 토큰을 생성하고 권한을 설정하여 사용할 수 있습니다.',
        keywords: ['API', '토큰', 'REST', '권한']
      },
      {
        id: 'security-4',
        question: '접속 로그를 확인할 수 있나요?',
        answer: '설정 > 보안에서 최근 로그인 기록과 접속 IP를 확인할 수 있습니다. 의심스러운 접속이 발견되면 즉시 알림을 받을 수 있습니다.',
        keywords: ['로그', '접속', 'IP', '알림']
      }
    ]
  }
]

export default function FaqPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')

  // Get initial search query from URL
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setSearchQuery(q)
    }
  }, [searchParams])

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqData
    }

    const query = searchQuery.toLowerCase()
    return faqData.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query))
      )
    })).filter(category => category.items.length > 0)
  }, [searchQuery])

  const totalFilteredItems = filteredFaqs.reduce((sum, category) => sum + category.items.length, 0)

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
          <h1 className="text-3xl font-bold text-gray-900">자주 묻는 질문</h1>
          <p className="text-gray-600">
            궁금한 점을 빠르게 해결하세요
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            질문 검색
          </CardTitle>
          <CardDescription>
            키워드를 입력하여 원하는 답변을 찾아보세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="예: 연락처 업로드, SMS 발송, 요금..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                "{searchQuery}" 검색 결과: <span className="font-medium">{totalFilteredItems}개</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                검색 초기화
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Categories */}
      {filteredFaqs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              다른 키워드로 검색해보시거나 문의하기를 이용해주세요
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setSearchQuery('')}>
                전체 FAQ 보기
              </Button>
              <Link href="/help/contact">
                <Button variant="outline">문의하기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredFaqs.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    {category.icon}
                  </div>
                  <div>
                    <span>{category.category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {category.items.length}개
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {category.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        {searchQuery ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: item.question.replace(
                                new RegExp(`(${searchQuery})`, 'gi'),
                                '<mark class="bg-yellow-200">$1</mark>'
                              )
                            }}
                          />
                        ) : (
                          item.question
                        )}
                      </AccordionTrigger>
                      <AccordionContent>
                        {searchQuery ? (
                          <p
                            dangerouslySetInnerHTML={{
                              __html: item.answer.replace(
                                new RegExp(`(${searchQuery})`, 'gi'),
                                '<mark class="bg-yellow-200">$1</mark>'
                              )
                            }}
                          />
                        ) : (
                          <p>{item.answer}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.keywords.map((keyword) => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              원하는 답변을 찾지 못하셨나요?
            </h3>
            <p className="text-blue-700 mb-4">
              추가적인 도움이 필요하시면 언제든 문의해주세요
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/help/contact">
                <Button>문의하기</Button>
              </Link>
              <Link href="/help/guide">
                <Button variant="outline">사용자 가이드</Button>
              </Link>
              <Link href="/help/tutorial">
                <Button variant="outline">튜토리얼</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}