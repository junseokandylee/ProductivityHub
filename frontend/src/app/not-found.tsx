'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, Search, Building } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">정치생산성허브</h1>
        </div>

        {/* 404 Error Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-yellow-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">404</CardTitle>
            <CardDescription className="text-lg">
              페이지를 찾을 수 없습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
              URL을 다시 확인해주시거나 아래 버튼을 통해 이동해주세요.
            </p>

            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full" size="lg">
                  <Home className="mr-2 h-5 w-5" />
                  홈으로 가기
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                이전 페이지로
              </Button>
            </div>

            {/* Quick Links */}
            <div className="border-t pt-4 mt-6">
              <p className="text-sm text-gray-500 text-center mb-3">자주 찾는 페이지</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/contacts">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    연락처
                  </Button>
                </Link>
                <Link href="/campaigns">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    캠페인
                  </Button>
                </Link>
                <Link href="/inbox">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    인박스
                  </Button>
                </Link>
                <Link href="/help">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    도움말
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>문제가 지속될 경우 <Link href="/help/contact" className="underline">고객지원</Link>에 문의해주세요.</p>
        </div>
      </div>
    </div>
  )
}