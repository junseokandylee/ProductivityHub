'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Mail, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Clock, Building } from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [currentState, setCurrentState] = useState<'verifying' | 'success' | 'error' | 'expired' | 'resend'>('verifying')
  const [isResending, setIsResending] = useState(false)
  const [serverError, setServerError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  
  // Get query params
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const nextUrl = searchParams.get('next')

  // Handle verification on mount
  useEffect(() => {
    if (token && email) {
      verifyEmail(token)
    } else {
      setCurrentState('error')
      setServerError('유효하지 않은 인증 링크입니다')
    }
  }, [token, email])

  // Countdown timer for resend button
  useEffect(() => {
    if (currentState === 'error' || currentState === 'expired') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [currentState])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: verificationToken
        })
      })

      const result = await response.json()

      if (response.ok) {
        setCurrentState('success')
        
        toast({
          title: "이메일 인증 완료",
          description: "계정이 성공적으로 활성화되었습니다.",
        })

        // Auto-redirect to login or next URL after 3 seconds
        setTimeout(() => {
          const redirectUrl = nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''
          router.push(`/auth/login${redirectUrl}`)
        }, 3000)

      } else {
        if (response.status === 410 || result.code === 'TOKEN_EXPIRED') {
          setCurrentState('expired')
          setServerError('인증 링크가 만료되었습니다')
        } else {
          setCurrentState('error')
          setServerError(result.message || '이메일 인증에 실패했습니다')
        }
      }

    } catch (error) {
      setCurrentState('error')
      setServerError('네트워크 오류가 발생했습니다')
      console.error('Email verification error:', error)
    }
  }

  const handleResendVerification = async () => {
    if (!email || isResending || !canResend) return
    
    setIsResending(true)
    setServerError('')
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      })

      const result = await response.json()

      if (response.ok) {
        setCurrentState('resend')
        setCountdown(60)
        setCanResend(false)
        
        toast({
          title: "인증 이메일 재전송 완료",
          description: "새로운 인증 링크를 이메일로 보내드렸습니다.",
        })

      } else {
        throw new Error(result.message || '재전송에 실패했습니다')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '재전송 중 오류가 발생했습니다'
      setServerError(errorMessage)
      
      toast({
        title: "재전송 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const getStatusIcon = () => {
    switch (currentState) {
      case 'verifying':
        return <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
      case 'expired':
        return <AlertCircle className="h-8 w-8 text-red-600" />
      case 'resend':
        return <Mail className="h-8 w-8 text-blue-600" />
      default:
        return <Mail className="h-8 w-8 text-gray-400" />
    }
  }

  const getStatusTitle = () => {
    switch (currentState) {
      case 'verifying':
        return '이메일 인증 중'
      case 'success':
        return '인증 완료'
      case 'error':
        return '인증 실패'
      case 'expired':
        return '링크 만료'
      case 'resend':
        return '재전송 완료'
      default:
        return '이메일 인증'
    }
  }

  const getStatusDescription = () => {
    switch (currentState) {
      case 'verifying':
        return '잠시만 기다려주세요...'
      case 'success':
        return '계정이 성공적으로 활성화되었습니다. 곧 로그인 페이지로 이동합니다.'
      case 'error':
        return '인증 처리 중 문제가 발생했습니다.'
      case 'expired':
        return '인증 링크가 만료되었습니다. 새로운 링크를 요청해주세요.'
      case 'resend':
        return '새로운 인증 링크를 이메일로 보내드렸습니다.'
      default:
        return '이메일 인증을 진행하고 있습니다.'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">정치생산성허브</h1>
          <p className="text-gray-600 mt-2">이메일 인증</p>
        </div>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusTitle()}
            </CardTitle>
            <CardDescription>
              {getStatusDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Server Error Alert */}
            {serverError && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {serverError}
                </AlertDescription>
              </Alert>
            )}

            {/* Verifying State */}
            {currentState === 'verifying' && (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-600">
                  계정을 활성화하고 있습니다...
                </p>
                {email && (
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>{email}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Success State */}
            {currentState === 'success' && (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  계정 활성화 완료!
                </h3>
                <p className="text-gray-600 mb-4">
                  이메일 인증이 성공적으로 완료되었습니다.<br />
                  이제 정치생산성허브의 모든 기능을 이용할 수 있습니다.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">
                      3초 후 자동으로 로그인 페이지로 이동합니다
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {(currentState === 'error' || currentState === 'expired') && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {currentState === 'expired' ? '링크 만료됨' : '인증 실패'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {currentState === 'expired' 
                      ? '인증 링크가 만료되었습니다. 보안을 위해 인증 링크는 24시간 후 만료됩니다.'
                      : '이메일 인증 처리 중 문제가 발생했습니다.'
                    }
                  </p>
                  {email && (
                    <p className="text-sm text-gray-500">
                      계정: <strong>{email}</strong>
                    </p>
                  )}
                </div>

                {/* Resend Section */}
                {email && (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        새로운 인증 링크 받기
                      </h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        아래 버튼을 눌러 새로운 인증 링크를 받을 수 있습니다.
                      </p>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={isResending || !canResend}
                        onClick={handleResendVerification}
                      >
                        {isResending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            재전송 중...
                          </>
                        ) : !canResend ? (
                          <>
                            <Clock className="mr-2 h-4 w-4" />
                            {countdown}초 후 재전송 가능
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            새 인증 링크 받기
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resend State */}
            {currentState === 'resend' && (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  재전송 완료
                </h3>
                <p className="text-gray-600 mb-4">
                  <strong>{email}</strong>로<br />
                  새로운 인증 링크를 보내드렸습니다.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    이메일함을 확인하고 새로운 인증 링크를 클릭해주세요.<br />
                    스팸함도 확인해보세요.
                  </p>
                </div>
              </div>
            )}

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link 
                href={`/auth/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`}
                className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                로그인으로 돌아가기
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>이메일을 받지 못하셨나요? <Link href="/help/contact" className="underline">고객지원</Link>에 문의하세요.</p>
        </div>
      </div>
    </div>
  )
}