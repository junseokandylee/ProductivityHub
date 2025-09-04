'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Calendar,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Scale
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const tableOfContents = [
  { id: 'section-1', title: '1. 서비스 정의 및 범위', level: 1 },
  { id: 'section-1-1', title: '1.1 서비스 개요', level: 2 },
  { id: 'section-1-2', title: '1.2 정치 캠페인 관리 기능', level: 2 },
  { id: 'section-2', title: '2. 이용 약관 동의', level: 1 },
  { id: 'section-2-1', title: '2.1 약관의 효력', level: 2 },
  { id: 'section-2-2', title: '2.2 약관의 변경', level: 2 },
  { id: 'section-3', title: '3. 회원 가입 및 계정 관리', level: 1 },
  { id: 'section-3-1', title: '3.1 회원 자격', level: 2 },
  { id: 'section-3-2', title: '3.2 정치인 및 정당 인증', level: 2 },
  { id: 'section-3-3', title: '3.3 계정 보안', level: 2 },
  { id: 'section-4', title: '4. 서비스 이용', level: 1 },
  { id: 'section-4-1', title: '4.1 연락처 관리', level: 2 },
  { id: 'section-4-2', title: '4.2 메시징 서비스', level: 2 },
  { id: 'section-4-3', title: '4.3 캠페인 분석', level: 2 },
  { id: 'section-5', title: '5. 정치관계법 준수', level: 1 },
  { id: 'section-5-1', title: '5.1 공직선거법 준수', level: 2 },
  { id: 'section-5-2', title: '5.2 정치자금법 준수', level: 2 },
  { id: 'section-5-3', title: '5.3 개인정보보호법 준수', level: 2 },
  { id: 'section-6', title: '6. 금지 행위', level: 1 },
  { id: 'section-7', title: '7. 콘텐츠 및 지적재산권', level: 1 },
  { id: 'section-8', title: '8. 요금 및 결제', level: 1 },
  { id: 'section-9', title: '9. 서비스 중단 및 해지', level: 1 },
  { id: 'section-10', title: '10. 책임 제한', level: 1 },
  { id: 'section-11', title: '11. 분쟁 해결', level: 1 },
  { id: 'section-12', title: '12. 기타 조항', level: 1 }
]

export default function TermsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('section-1')

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const filteredToc = tableOfContents.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">이용약관</h1>
                <p className="text-gray-600 mt-1">
                  정치생산성허브 서비스 이용약관
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <div>
              <div>최종 수정일: 2024년 1월 15일</div>
              <div>시행일: 2024년 1월 1일</div>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>현재 버전: v2.1</strong> | 이전 버전과의 주요 변경사항은 개인정보 처리 방침 강화 및 AI 기능 관련 조항 추가입니다.
              </div>
              <Button variant="outline" size="sm">
                변경 내역 보기
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  목차
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="항목 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {filteredToc.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeSection === item.id
                          ? 'bg-blue-100 text-blue-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      } ${item.level === 2 ? 'ml-4' : ''}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8 prose prose-gray max-w-none">
                
                {/* Introduction */}
                <div className="mb-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h2 className="text-xl font-bold text-blue-900 mb-3">중요 안내</h2>
                  <p className="text-blue-800">
                    본 이용약관은 정치생산성허브 서비스를 이용하는 모든 사용자에게 적용됩니다. 
                    서비스 이용 전 반드시 전문을 읽고 동의해주시기 바랍니다. 
                    특히 정치 캠페인 관련 법적 준수사항을 주의 깊게 확인하시기 바랍니다.
                  </p>
                </div>

                {/* Section 1 */}
                <div id="section-1" className="scroll-mt-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    1. 서비스 정의 및 범위
                  </h2>
                  
                  <div id="section-1-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">1.1 서비스 개요</h3>
                    <p className="mb-4">
                      "정치생산성허브"(이하 "서비스")는 정치인, 정당, 정치 캠페인 관계자들이 
                      유권자와의 소통을 효율적으로 관리할 수 있도록 지원하는 통합 플랫폼입니다.
                    </p>
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      <li>연락처 관리 및 세그먼테이션</li>
                      <li>SMS, 카카오톡, 이메일 멀티채널 메시징</li>
                      <li>캠페인 성과 분석 및 리포팅</li>
                      <li>정치관계법 준수 지원 도구</li>
                    </ul>
                  </div>

                  <div id="section-1-2" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">1.2 정치 캠페인 관리 기능</h3>
                    <p className="mb-4">
                      본 서비스는 대한민국 정치관계법을 준수하는 범위 내에서 다음과 같은 기능을 제공합니다:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-1">
                        <li>합법적 정치 광고 및 홍보물 발송</li>
                        <li>정책 설명회 및 토론회 안내</li>
                        <li>공식 정치 활동 보고</li>
                        <li>법적 기준에 부합하는 후원금 모집 안내</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div id="section-2" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    2. 이용 약관 동의
                  </h2>
                  
                  <div id="section-2-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">2.1 약관의 효력</h3>
                    <p className="mb-4">
                      사용자는 서비스 회원가입 시 본 약관에 동의함으로써 약관의 모든 내용에 구속됩니다. 
                      약관에 동의하지 않는 경우 서비스를 이용할 수 없습니다.
                    </p>
                  </div>

                  <div id="section-2-2" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">2.2 약관의 변경</h3>
                    <p className="mb-4">
                      회사는 필요에 따라 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 
                      또는 이메일 통지를 통해 사용자에게 알립니다. 변경사항은 공지일로부터 7일 후 효력이 발생합니다.
                    </p>
                  </div>
                </div>

                {/* Section 3 */}
                <div id="section-3" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    3. 회원 가입 및 계정 관리
                  </h2>
                  
                  <div id="section-3-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">3.1 회원 자격</h3>
                    <p className="mb-4">다음 요건을 모두 충족하는 자만이 회원으로 가입할 수 있습니다:</p>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <ul className="list-disc list-inside space-y-2">
                        <li>만 19세 이상의 대한민국 국민</li>
                        <li>정치인, 정당 관계자, 또는 정치 캠페인 담당자</li>
                        <li>정치관계법상 결격사유가 없는 자</li>
                        <li>실명 및 실제 연락처 정보 제공이 가능한 자</li>
                      </ul>
                    </div>
                  </div>

                  <div id="section-3-2" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">3.2 정치인 및 정당 인증</h3>
                    <p className="mb-4">
                      정치인 또는 정당 관계자는 신분 확인을 위해 다음 서류를 제출해야 합니다:
                    </p>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li>공직선거법에 따른 후보자 등록증 사본</li>
                      <li>정당 가입증 또는 임명장</li>
                      <li>신분증 사본 (주민등록증, 운전면허증 등)</li>
                    </ul>
                  </div>

                  <div id="section-3-3" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">3.3 계정 보안</h3>
                    <p className="mb-4">
                      회원은 계정의 보안을 유지할 책임이 있으며, 제3자의 무단 사용으로 인한 
                      피해에 대해서는 회원에게 책임이 있습니다.
                    </p>
                  </div>
                </div>

                {/* Section 4 */}
                <div id="section-4" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    4. 서비스 이용
                  </h2>
                  
                  <div id="section-4-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">4.1 연락처 관리</h3>
                    <p className="mb-4">
                      연락처 수집 및 관리 시 개인정보보호법을 준수해야 하며, 
                      수집된 개인정보는 정치적 목적에만 사용할 수 있습니다.
                    </p>
                  </div>

                  <div id="section-4-2" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">4.2 메시징 서비스</h3>
                    <p className="mb-4">
                      메시지 발송 시 다음 사항을 준수해야 합니다:
                    </p>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li>수신자의 사전 동의 확보</li>
                      <li>발송인 정보 명시</li>
                      <li>수신거부 방법 안내</li>
                      <li>선거기간 중 제한사항 준수</li>
                    </ul>
                  </div>

                  <div id="section-4-3" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">4.3 캠페인 분석</h3>
                    <p className="mb-4">
                      제공되는 분석 데이터는 참고용이며, 실제 선거 결과나 여론과 차이가 있을 수 있습니다. 
                      분석 결과에 대한 최종 해석과 활용은 사용자의 책임입니다.
                    </p>
                  </div>
                </div>

                {/* Section 5 */}
                <div id="section-5" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200 text-red-700">
                    5. 정치관계법 준수 (중요)
                  </h2>
                  
                  <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-400 mb-6">
                    <div className="flex items-center mb-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <h4 className="font-semibold text-red-800">필수 준수사항</h4>
                    </div>
                    <p className="text-red-700">
                      본 서비스 사용 시 대한민국의 모든 정치관계법을 준수해야 하며, 
                      법 위반으로 인한 모든 책임은 사용자에게 있습니다.
                    </p>
                  </div>

                  <div id="section-5-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">5.1 공직선거법 준수</h3>
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      <li>선거운동 제한기간 준수</li>
                      <li>허용된 선거운동 방법만 사용</li>
                      <li>선거비용 한도 준수</li>
                      <li>허위사실 유포 금지</li>
                      <li>타 후보자 비방 금지</li>
                    </ul>
                  </div>

                  <div id="section-5-2" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">5.2 정치자금법 준수</h3>
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      <li>정치자금 조달 및 사용 기준 준수</li>
                      <li>후원금 모집 시 법정 절차 이행</li>
                      <li>정치자금 수입·지출 보고</li>
                    </ul>
                  </div>

                  <div id="section-5-3" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">5.3 개인정보보호법 준수</h3>
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      <li>개인정보 수집·이용 동의 확보</li>
                      <li>개인정보 처리방침 공개</li>
                      <li>개인정보 안전성 확보조치 이행</li>
                      <li>개인정보 처리 현황 통지</li>
                    </ul>
                  </div>
                </div>

                {/* Section 6 */}
                <div id="section-6" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    6. 금지 행위
                  </h2>
                  <p className="mb-4">다음 행위는 엄격히 금지됩니다:</p>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <ul className="list-disc list-inside space-y-2">
                      <li>허위사실 유포 또는 비방</li>
                      <li>불법적인 정치자금 조달</li>
                      <li>개인정보 무단 수집 및 이용</li>
                      <li>스팸 메시지 발송</li>
                      <li>시스템 해킹 또는 악용</li>
                      <li>타인의 계정 무단 사용</li>
                      <li>저작권 침해</li>
                    </ul>
                  </div>
                </div>

                {/* Section 7-12 (abbreviated for space) */}
                <div id="section-7" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    7. 콘텐츠 및 지적재산권
                  </h2>
                  <p className="mb-4">
                    서비스 내 모든 콘텐츠의 지적재산권은 회사에 귀속되며, 
                    사용자가 업로드한 콘텐츠에 대한 책임은 사용자에게 있습니다.
                  </p>
                </div>

                <div id="section-8" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    8. 요금 및 결제
                  </h2>
                  <p className="mb-4">
                    서비스 이용료는 요금표에 따르며, 결제한 요금은 원칙적으로 환불되지 않습니다. 
                    단, 법령에 따른 청약철회권 행사 시는 예외입니다.
                  </p>
                </div>

                <div id="section-9" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    9. 서비스 중단 및 해지
                  </h2>
                  <p className="mb-4">
                    회사는 시스템 점검, 기술적 문제, 법적 요구 등의 사유로 
                    서비스를 일시적으로 중단할 수 있습니다.
                  </p>
                </div>

                <div id="section-10" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    10. 책임 제한
                  </h2>
                  <p className="mb-4">
                    회사는 사용자의 정치관계법 위반, 선거 결과, 정치적 손실에 대해 책임지지 않습니다. 
                    서비스 사용으로 인한 모든 법적 책임은 사용자에게 있습니다.
                  </p>
                </div>

                <div id="section-11" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    11. 분쟁 해결
                  </h2>
                  <p className="mb-4">
                    본 약관에 관한 분쟁은 대한민국 법을 준거법으로 하며, 
                    서울중앙지방법원을 전속 관할법원으로 합니다.
                  </p>
                </div>

                <div id="section-12" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    12. 기타 조항
                  </h2>
                  <p className="mb-4">
                    본 약관의 일부가 무효가 되더라도 나머지 조항은 계속 유효합니다. 
                    약관에서 정하지 않은 사항은 관련 법령에 따릅니다.
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-12 p-6 bg-gray-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">이용약관 v2.1</p>
                      <p className="text-sm text-gray-600">
                        최종 수정: 2024년 1월 15일 | 시행: 2024년 1월 1일
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      현재 버전
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              문의 및 지원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">이메일 문의</p>
                  <p className="text-gray-600">legal@politicalhub.kr</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">전화 문의</p>
                  <p className="text-gray-600">02-123-4567</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">운영 시간</p>
                  <p className="text-gray-600">평일 09:00-18:00</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" asChild>
            <Link href="/privacy">개인정보처리방침 보기</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/help">도움말 센터</Link>
          </Button>
          <Button asChild>
            <Link href="/help/contact">문의하기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}