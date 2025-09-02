'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, RefreshCw, Building } from 'lucide-react'

// Request reset schema
const requestResetSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요')
})

// Reset password schema
const resetPasswordSchema = z.object({
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
})

type RequestResetForm = z.infer<typeof requestResetSchema>
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState<'request' | 'sent' | 'reset'>('request')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [emailSent, setEmailSent] = useState('')
  
  // Get query params
  const nextUrl = searchParams.get('next')
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const requestForm = useForm<RequestResetForm>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: email || ''
    }
  })

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  })

  // Check if token is provided in URL
  useEffect(() => {
    if (token) {
      setCurrentStep('reset')
    }
  }, [token])

  // Set email if provided in URL
  useEffect(() => {
    if (email) {
      requestForm.setValue('email', email)
    }
  }, [email, requestForm])

  const handleRequestReset = async (data: RequestResetForm) => {
    setIsSubmitting(true)
    setServerError('')
    
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: data.email
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '비밀번호 재설정 요청에 실패했습니다')
      }

      setEmailSent(data.email)
      setCurrentStep('sent')
      
      toast({
        title: "이메일 전송 완료",
        description: "비밀번호 재설정 링크를 이메일로 보내드렸습니다.",
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '요청 중 오류가 발생했습니다'
      setServerError(errorMessage)
      
      toast({
        title: "전송 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (data: ResetPasswordForm) => {
    if (!token) {
      setServerError('유효하지 않은 재설정 링크입니다')
      return
    }

    setIsSubmitting(true)
    setServerError('')
    
    try {
      const response = await fetch('/api/auth/reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          password: data.password
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '비밀번호 변경에 실패했습니다')
      }

      toast({
        title: "비밀번호 변경 완료",
        description: "새로운 비밀번호로 로그인할 수 있습니다.",
      })

      // Redirect to login page
      const redirectUrl = nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''
      router.push(`/auth/login${redirectUrl}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다'
      setServerError(errorMessage)
      
      toast({
        title: "변경 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendEmail = () => {
    if (emailSent) {
      requestForm.setValue('email', emailSent)
      setCurrentStep('request')
      setServerError('')
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
          <p className="text-gray-600 mt-2">
            {currentStep === 'request' && '비밀번호를 재설정하세요'}
            {currentStep === 'sent' && '이메일을 확인해주세요'}
            {currentStep === 'reset' && '새로운 비밀번호를 설정하세요'}
          </p>
        </div>

        {/* Reset Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 'request' && (
                <>
                  <Mail className="h-5 w-5" />
                  비밀번호 재설정 요청
                </>
              )}
              {currentStep === 'sent' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  이메일 전송 완료
                </>
              )}
              {currentStep === 'reset' && (
                <>
                  <Lock className="h-5 w-5" />
                  비밀번호 재설정
                </>
              )}
            </CardTitle>
            <CardDescription>
              {currentStep === 'request' && '가입할 때 사용한 이메일 주소를 입력하세요'}
              {currentStep === 'sent' && '이메일함에서 재설정 링크를 확인하세요'}
              {currentStep === 'reset' && '새로운 비밀번호를 입력하세요'}
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

            {/* Request Reset Form */}
            {currentStep === 'request' && (
              <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      className="pl-10"
                      {...requestForm.register('email')}
                    />
                  </div>
                  {requestForm.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {requestForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      전송 중...
                    </>
                  ) : (
                    <>
                      재설정 링크 보내기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Email Sent Confirmation */}
            {currentStep === 'sent' && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    이메일을 전송했습니다
                  </h3>
                  <p className="text-gray-600 mb-4">
                    <strong>{emailSent}</strong>로<br />
                    비밀번호 재설정 링크를 보내드렸습니다.
                  </p>
                  <p className="text-sm text-gray-500">
                    이메일이 도착하지 않았다면 스팸함을 확인해주세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendEmail}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    다시 전송하기
                  </Button>
                  <Link href={`/auth/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`}>
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      로그인으로 돌아가기
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Reset Password Form */}
            {currentStep === 'reset' && (
              <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">새 비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                      className="pl-10 pr-10"
                      {...resetForm.register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {resetForm.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {resetForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="새 비밀번호를 다시 입력하세요"
                      className="pl-10 pr-10"
                      {...resetForm.register('confirmPassword')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {resetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>비밀번호 요구사항:</strong><br />
                    • 최소 8자 이상<br />
                    • 영문 대소문자, 숫자, 특수문자 조합 권장
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      변경 중...
                    </>
                  ) : (
                    <>
                      비밀번호 변경
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Back to Login */}
            {(currentStep === 'request' || currentStep === 'reset') && (
              <div className="mt-6 text-center">
                <Link 
                  href={`/auth/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`}
                  className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  로그인으로 돌아가기
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        {currentStep === 'request' && (
          <div className="text-center text-xs text-gray-500">
            <p>계정이 기억나지 않으시나요? <Link href="/help/contact" className="underline">고객지원</Link>에 문의하세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}