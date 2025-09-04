'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Search, 
  Shield, 
  Calendar,
  FileText,
  Lock,
  Eye,
  Database,
  Settings,
  Mail,
  Phone,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
  Trash2,
  UserCheck,
  Globe,
  Server
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const tableOfContents = [
  { id: 'section-1', title: '1. 개인정보처리방침 개요', level: 1 },
  { id: 'section-1-1', title: '1.1 처리방침의 목적', level: 2 },
  { id: 'section-1-2', title: '1.2 GDPR 준수 선언', level: 2 },
  { id: 'section-2', title: '2. 개인정보의 수집 및 이용', level: 1 },
  { id: 'section-2-1', title: '2.1 수집하는 개인정보 항목', level: 2 },
  { id: 'section-2-2', title: '2.2 개인정보 수집 방법', level: 2 },
  { id: 'section-2-3', title: '2.3 개인정보 이용 목적', level: 2 },
  { id: 'section-3', title: '3. 개인정보의 처리 및 보관', level: 1 },
  { id: 'section-3-1', title: '3.1 처리 기간', level: 2 },
  { id: 'section-3-2', title: '3.2 보관 장소 및 방법', level: 2 },
  { id: 'section-4', title: '4. 개인정보의 제3자 제공', level: 1 },
  { id: 'section-4-1', title: '4.1 제공 기준', level: 2 },
  { id: 'section-4-2', title: '4.2 제공 받는 자', level: 2 },
  { id: 'section-5', title: '5. 개인정보 처리 위탁', level: 1 },
  { id: 'section-6', title: '6. 정보주체의 권리', level: 1 },
  { id: 'section-6-1', title: '6.1 열람권', level: 2 },
  { id: 'section-6-2', title: '6.2 정정·삭제권', level: 2 },
  { id: 'section-6-3', title: '6.3 처리정지권', level: 2 },
  { id: 'section-7', title: '7. 개인정보 보호조치', level: 1 },
  { id: 'section-7-1', title: '7.1 기술적 보호조치', level: 2 },
  { id: 'section-7-2', title: '7.2 관리적 보호조치', level: 2 },
  { id: 'section-8', title: '8. 쿠키 및 추적 기술', level: 1 },
  { id: 'section-9', title: '9. 국제적 데이터 전송', level: 1 },
  { id: 'section-10', title: '10. 아동의 개인정보 보호', level: 1 },
  { id: 'section-11', title: '11. 개인정보 침해신고', level: 1 },
  { id: 'section-12', title: '12. 개인정보보호책임자', level: 1 }
]

const dataTypes = [
  { 
    category: '필수 정보', 
    items: ['이름', '이메일', '휴대폰번호', '소속 정당/기관'], 
    purpose: '회원 식별, 서비스 제공',
    retention: '회원 탈퇴 시까지'
  },
  { 
    category: '선택 정보', 
    items: ['프로필 사진', '지역구', '직책', '웹사이트'], 
    purpose: '프로필 완성, 맞춤 서비스',
    retention: '회원 탈퇴 또는 동의 철회 시까지'
  },
  { 
    category: '서비스 이용 정보', 
    items: ['접속 기록', '메시지 발송 기록', '캠페인 통계'], 
    purpose: '서비스 개선, 통계 분석',
    retention: '3년'
  },
  { 
    category: '결제 정보', 
    items: ['신용카드번호', '결제 내역'], 
    purpose: '요금 결제, 세금계산서 발행',
    retention: '5년 (전자상거래법)'
  }
]

export default function PrivacyPage() {
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
              <Shield className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">개인정보처리방침</h1>
                <p className="text-gray-600 mt-1">
                  정치생산성허브 개인정보 보호 및 처리 방침
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

        {/* GDPR & Legal Compliance Alert */}
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>GDPR 및 개인정보보호법 준수</strong> | 본 서비스는 EU GDPR, 한국 개인정보보호법을 엄격히 준수합니다.
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">GDPR 인증</Badge>
                <Badge className="bg-blue-100 text-blue-800">ISO 27001</Badge>
              </div>
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
                          ? 'bg-green-100 text-green-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      } ${item.level === 2 ? 'ml-4' : ''}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">개인정보 관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  내 정보 다운로드
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  개인정보 설정
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  계정 삭제 요청
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8 prose prose-gray max-w-none">
                
                {/* Introduction */}
                <div className="mb-8 p-6 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h2 className="text-xl font-bold text-green-900 mb-3">개인정보 보호 약속</h2>
                  <p className="text-green-800">
                    정치생산성허브는 사용자의 개인정보를 소중히 여기며, 개인정보보호법, GDPR 등 
                    관련 법령을 준수하여 개인정보를 보호합니다. 본 처리방침을 통해 수집하는 개인정보의 
                    항목, 목적, 보관기간 등을 투명하게 안내드립니다.
                  </p>
                </div>

                {/* Personal Data Overview */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">수집하는 개인정보 현황</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {dataTypes.map((dataType, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-400">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{dataType.category}</h3>
                            <Badge variant="outline">{dataType.retention}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{dataType.purpose}</p>
                          <div className="flex flex-wrap gap-2">
                            {dataType.items.map((item, itemIndex) => (
                              <Badge key={itemIndex} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Section 1 */}
                <div id="section-1" className="scroll-mt-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    1. 개인정보처리방침 개요
                  </h2>
                  
                  <div id="section-1-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">1.1 처리방침의 목적</h3>
                    <p className="mb-4">
                      본 개인정보처리방침은 정치생산성허브(이하 "회사")가 제공하는 서비스를 이용하는 
                      사용자의 개인정보를 어떻게 수집, 이용, 보관, 파기하는지에 대한 전반적인 내용을 설명합니다.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-1">
                        <li>개인정보 수집 및 이용 목적의 명확한 고지</li>
                        <li>개인정보 처리의 법적 근거 제시</li>
                        <li>정보주체의 권리와 행사 방법 안내</li>
                        <li>개인정보 보호조치 현황 공개</li>
                      </ul>
                    </div>
                  </div>

                  <div id="section-1-2" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">1.2 GDPR 준수 선언</h3>
                    <p className="mb-4">
                      회사는 EU 일반데이터보호규정(GDPR)을 완전히 준수하며, 
                      다음과 같은 데이터 보호 원칙을 따릅니다:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">합법성, 공정성, 투명성</h4>
                        <p className="text-sm">적법한 근거에 의한 공정하고 투명한 처리</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">목적 제한</h4>
                        <p className="text-sm">명확하고 정당한 목적으로만 수집 및 이용</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">데이터 최소화</h4>
                        <p className="text-sm">필요 최소한의 개인정보만 수집</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">정확성</h4>
                        <p className="text-sm">정확하고 최신의 개인정보 유지</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div id="section-2" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    2. 개인정보의 수집 및 이용
                  </h2>
                  
                  <div id="section-2-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">2.1 수집하는 개인정보 항목</h3>
                    <p className="mb-4">서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
                    
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">필수 항목 (서비스 이용에 반드시 필요)</h4>
                      <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong>회원 식별 정보:</strong> 이름, 이메일 주소, 휴대폰 번호</li>
                          <li><strong>정치 관련 정보:</strong> 소속 정당/기관, 직책, 정치인 인증서류</li>
                          <li><strong>로그인 정보:</strong> 아이디, 비밀번호 (암호화 저장)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">선택 항목 (서비스 향상을 위해 수집)</h4>
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong>프로필 정보:</strong> 프로필 사진, 지역구, 소개글</li>
                          <li><strong>선호 설정:</strong> 알림 설정, 언어 설정</li>
                          <li><strong>추가 연락처:</strong> 사무실 전화번호, 팩스번호</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">자동 수집 정보</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong>서비스 이용 기록:</strong> 접속 일시, IP 주소, 쿠키</li>
                          <li><strong>기기 정보:</strong> OS, 브라우저 종류, 화면 크기</li>
                          <li><strong>캠페인 데이터:</strong> 메시지 발송 기록, 성과 통계</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div id="section-2-2" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">2.2 개인정보 수집 방법</h3>
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      <li>회원가입 시 사용자가 직접 입력</li>
                      <li>서비스 이용 과정에서 자동 수집</li>
                      <li>공개된 정치인 정보 (선거관리위원회 등)</li>
                      <li>파트너사를 통한 연동 (사용자 동의 시)</li>
                    </ul>
                  </div>

                  <div id="section-2-3" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">2.3 개인정보 이용 목적</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-700">서비스 제공</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>회원 식별 및 인증</li>
                          <li>연락처 관리 기능 제공</li>
                          <li>메시징 서비스 제공</li>
                          <li>캠페인 분석 서비스 제공</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-green-700">서비스 개선</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>서비스 이용 통계 분석</li>
                          <li>신규 기능 개발</li>
                          <li>사용자 경험 개선</li>
                          <li>시스템 성능 최적화</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div id="section-3" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    3. 개인정보의 처리 및 보관
                  </h2>
                  
                  <div id="section-3-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">3.1 처리 기간</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">정보 구분</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">보관 기간</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">법적 근거</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-4 py-2">회원 정보</td>
                            <td className="border border-gray-300 px-4 py-2">회원 탈퇴 시까지</td>
                            <td className="border border-gray-300 px-4 py-2">이용자 동의</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-4 py-2">결제 정보</td>
                            <td className="border border-gray-300 px-4 py-2">5년</td>
                            <td className="border border-gray-300 px-4 py-2">전자상거래법</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-4 py-2">서비스 이용 기록</td>
                            <td className="border border-gray-300 px-4 py-2">3년</td>
                            <td className="border border-gray-300 px-4 py-2">통신비밀보호법</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-4 py-2">선거 관련 기록</td>
                            <td className="border border-gray-300 px-4 py-2">5년</td>
                            <td className="border border-gray-300 px-4 py-2">공직선거법</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div id="section-3-2" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">3.2 보관 장소 및 방법</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <Server className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="font-semibold">데이터 센터</h4>
                        </div>
                        <ul className="text-sm space-y-1">
                          <li>• 국내 인증받은 데이터 센터</li>
                          <li>• 24시간 보안 관제</li>
                          <li>• 이중화 백업 시스템</li>
                          <li>• 재해 복구 체계 구축</li>
                        </ul>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <Lock className="h-5 w-5 text-green-600 mr-2" />
                          <h4 className="font-semibold">보안 조치</h4>
                        </div>
                        <ul className="text-sm space-y-1">
                          <li>• AES-256 암호화</li>
                          <li>• SSL/TLS 통신 암호화</li>
                          <li>• 접근 권한 통제</li>
                          <li>• 정기 보안 감사</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4-5 */}
                <div id="section-4" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    4. 개인정보의 제3자 제공
                  </h2>
                  
                  <div id="section-4-1" className="scroll-mt-8 mb-4">
                    <h3 className="text-xl font-semibold mb-3">4.1 제공 기준</h3>
                    <p className="mb-4">
                      회사는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다. 
                      다만, 다음의 경우에는 예외적으로 제공할 수 있습니다:
                    </p>
                    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                      <ul className="list-disc list-inside space-y-2">
                        <li>사용자가 사전에 동의한 경우</li>
                        <li>법령의 규정에 의하거나 수사목적으로 법집행기관이 요구하는 경우</li>
                        <li>통계작성, 학술연구 등의 목적을 위해 특정 개인을 식별할 수 없는 형태로 제공하는 경우</li>
                      </ul>
                    </div>
                  </div>

                  <div id="section-4-2" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">4.2 제공 받는 자</h3>
                    <p className="mb-4">현재 제3자에게 개인정보를 정기적으로 제공하고 있지 않습니다.</p>
                  </div>
                </div>

                <div id="section-5" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    5. 개인정보 처리 위탁
                  </h2>
                  <p className="mb-4">
                    회사는 서비스 향상을 위해 아래와 같이 개인정보 처리업무를 외부에 위탁하고 있습니다:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">위탁업체</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">위탁업무</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">개인정보 항목</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">Amazon Web Services</td>
                          <td className="border border-gray-300 px-4 py-2">클라우드 서비스 제공</td>
                          <td className="border border-gray-300 px-4 py-2">전체 서비스 데이터</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">SendGrid</td>
                          <td className="border border-gray-300 px-4 py-2">이메일 발송</td>
                          <td className="border border-gray-300 px-4 py-2">이메일 주소, 발송 내용</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">KT</td>
                          <td className="border border-gray-300 px-4 py-2">SMS 발송</td>
                          <td className="border border-gray-300 px-4 py-2">휴대폰 번호, 발송 내용</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 6 - Data Subject Rights */}
                <div id="section-6" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200 text-purple-700">
                    6. 정보주체의 권리 (GDPR 권리 보장)
                  </h2>
                  
                  <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-400 mb-6">
                    <div className="flex items-center mb-3">
                      <UserCheck className="h-5 w-5 text-purple-600 mr-2" />
                      <h4 className="font-semibold text-purple-800">귀하의 개인정보 권리</h4>
                    </div>
                    <p className="text-purple-700">
                      정보주체는 언제든지 다음과 같은 개인정보 보호 관련 권리를 행사할 수 있습니다. 
                      모든 요청은 신속하고 투명하게 처리됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div id="section-6-1" className="scroll-mt-8">
                      <div className="bg-blue-50 p-4 rounded-lg h-full">
                        <div className="flex items-center mb-3">
                          <Eye className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="font-semibold">열람권</h4>
                        </div>
                        <ul className="text-sm space-y-1">
                          <li>• 개인정보 처리 현황 확인</li>
                          <li>• 처리목적, 항목, 기간 조회</li>
                          <li>• 제3자 제공 현황 확인</li>
                          <li>• 처리정지 요구권 고지</li>
                        </ul>
                      </div>
                    </div>

                    <div id="section-6-2" className="scroll-mt-8">
                      <div className="bg-green-50 p-4 rounded-lg h-full">
                        <div className="flex items-center mb-3">
                          <Settings className="h-5 w-5 text-green-600 mr-2" />
                          <h4 className="font-semibold">정정·삭제권</h4>
                        </div>
                        <ul className="text-sm space-y-1">
                          <li>• 잘못된 개인정보 수정</li>
                          <li>• 불필요한 개인정보 삭제</li>
                          <li>• 처리목적 달성 후 삭제</li>
                          <li>• 동의 철회 시 즉시 삭제</li>
                        </ul>
                      </div>
                    </div>

                    <div id="section-6-3" className="scroll-mt-8">
                      <div className="bg-red-50 p-4 rounded-lg h-full">
                        <div className="flex items-center mb-3">
                          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                          <h4 className="font-semibold">처리정지권</h4>
                        </div>
                        <ul className="text-sm space-y-1">
                          <li>• 개인정보 처리 중단 요구</li>
                          <li>• 마케팅 목적 처리 거부</li>
                          <li>• 자동화된 의사결정 거부</li>
                          <li>• 손해 발생 시 구제 요구</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">권리 행사 방법</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium mb-2">온라인 요청</p>
                        <ul className="text-sm space-y-1">
                          <li>• 회원정보 수정 페이지</li>
                          <li>• 개인정보 관리 설정</li>
                          <li>• 고객지원 채팅</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-2">오프라인 요청</p>
                        <ul className="text-sm space-y-1">
                          <li>• 이메일: privacy@politicalhub.kr</li>
                          <li>• 전화: 02-123-4567</li>
                          <li>• 팩스: 02-123-4568</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 7 */}
                <div id="section-7" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    7. 개인정보 보호조치
                  </h2>
                  
                  <div id="section-7-1" className="scroll-mt-8 mb-6">
                    <h3 className="text-xl font-semibold mb-3">7.1 기술적 보호조치</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3">암호화 기술</h4>
                        <ul className="text-sm space-y-1">
                          <li>• 개인정보 AES-256 암호화</li>
                          <li>• 비밀번호 단방향 해시 암호화</li>
                          <li>• 데이터베이스 암호화</li>
                          <li>• 통신구간 SSL/TLS 암호화</li>
                        </ul>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-3">보안 시스템</h4>
                        <ul className="text-sm space-y-1">
                          <li>• 침입차단시스템(방화벽)</li>
                          <li>• 침입탐지시스템(IDS)</li>
                          <li>• 웹 애플리케이션 방화벽</li>
                          <li>• DDoS 공격 방어 시스템</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div id="section-7-2" className="scroll-mt-8 mb-8">
                    <h3 className="text-xl font-semibold mb-3">7.2 관리적 보호조치</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-2">
                        <li>개인정보 처리담당자 지정 및 최소한의 인원 운영</li>
                        <li>내부관리계획 수립 및 시행</li>
                        <li>정기적인 직원 교육 및 보안 점검</li>
                        <li>개인정보 처리시스템 접근 권한 관리</li>
                        <li>접근통제시스템 설치 및 접근기록 보관</li>
                        <li>보안프로그램 설치 및 갱신</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 8-12 (abbreviated) */}
                <div id="section-8" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    8. 쿠키 및 추적 기술
                  </h2>
                  <p className="mb-4">
                    서비스 제공을 위해 쿠키를 사용하며, 사용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 
                    브라우저 설정을 통해 쿠키를 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.
                  </p>
                </div>

                <div id="section-9" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    9. 국제적 데이터 전송
                  </h2>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-center mb-3">
                      <Globe className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="font-semibold">국경 간 데이터 전송 정책</h4>
                    </div>
                    <p className="text-sm">
                      개인정보는 원칙적으로 대한민국 내에서 처리되며, 국외 전송이 필요한 경우 
                      GDPR 적정성 결정을 받은 국가이거나 적절한 보호조치를 취한 후에만 전송합니다.
                    </p>
                  </div>
                </div>

                <div id="section-10" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    10. 아동의 개인정보 보호
                  </h2>
                  <p className="mb-4">
                    본 서비스는 만 19세 이상만 이용 가능하며, 만 14세 미만 아동의 개인정보는 수집하지 않습니다. 
                    실수로 수집된 경우 즉시 삭제합니다.
                  </p>
                </div>

                <div id="section-11" className="scroll-mt-8 mb-6">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    11. 개인정보 침해신고
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">개인정보보호위원회</h4>
                      <p className="text-sm">privacy.go.kr</p>
                      <p className="text-sm">국번없이 182</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">개인정보 침해신고센터</h4>
                      <p className="text-sm">privacy.kisa.or.kr</p>
                      <p className="text-sm">국번없이 118</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">경찰청 사이버수사과</h4>
                      <p className="text-sm">ecrm.police.go.kr</p>
                      <p className="text-sm">국번없이 182</p>
                    </div>
                  </div>
                </div>

                <div id="section-12" className="scroll-mt-8 mb-8">
                  <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-200">
                    12. 개인정보보호책임자
                  </h2>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">개인정보보호책임자</h4>
                        <ul className="space-y-2 text-sm">
                          <li><strong>성명:</strong> 김개인정보</li>
                          <li><strong>직책:</strong> 정보보호팀장</li>
                          <li><strong>이메일:</strong> privacy@politicalhub.kr</li>
                          <li><strong>전화:</strong> 02-123-4567</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">개인정보보호담당자</h4>
                        <ul className="space-y-2 text-sm">
                          <li><strong>성명:</strong> 박보안담당</li>
                          <li><strong>직책:</strong> 개인정보보호담당자</li>
                          <li><strong>이메일:</strong> dpo@politicalhub.kr</li>
                          <li><strong>전화:</strong> 02-123-4568</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-12 p-6 bg-green-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">개인정보처리방침 v2.1</p>
                      <p className="text-sm text-green-700">
                        최종 수정: 2024년 1월 15일 | 시행: 2024년 1월 1일
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        GDPR 준수
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        현재 버전
                      </Badge>
                    </div>
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
              <Shield className="h-5 w-5" />
              개인정보 관련 문의
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">개인정보 문의</p>
                  <p className="text-gray-600">privacy@politicalhub.kr</p>
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
                  <p className="font-medium">처리 시간</p>
                  <p className="text-gray-600">영업일 기준 3일 이내</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" asChild>
            <Link href="/terms">이용약관 보기</Link>
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            개인정보 다운로드
          </Button>
          <Button asChild>
            <Link href="/help/contact">문의하기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}