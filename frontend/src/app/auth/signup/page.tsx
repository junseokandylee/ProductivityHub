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
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Mail, Lock, User, Building, ArrowRight, AlertCircle, UserPlus, Key, Users } from 'lucide-react'

// Invite signup schema
const inviteSignupSchema = z.object({
  inviteCode: z.string().min(1, '초대 코드를 입력해주세요'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val, '이용약관에 동의해주세요'),
  agreeToPrivacy: z.boolean().refine((val) => val, '개인정보처리방침에 동의해주세요')
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
})

// Organization signup schema
const orgSignupSchema = z.object({
  organizationName: z.string().min(2, '조직명은 최소 2자 이상이어야 합니다'),
  organizationType: z.enum(['campaign', 'party', 'organization'], {
    required_error: '조직 유형을 선택해주세요'
  }),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  phone: z.string().min(10, '올바른 전화번호를 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val, '이용약관에 동의해주세요'),
  agreeToPrivacy: z.boolean().refine((val) => val, '개인정보처리방침에 동의해주세요'),
  agreeToMarketing: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
})

type InviteSignupForm = z.infer<typeof inviteSignupSchema>
type OrgSignupForm = z.infer<typeof orgSignupSchema>

const organizationTypes = [
  { value: 'campaign', label: '선거 캠페인', description: '국회의원, 지방의원 선거 캠페인' },
  { value: 'party', label: '정당', description: '정당 및 정당 소속 기관' },
  { value: 'organization', label: '시민단체', description: 'NGO, 시민사회단체 등' }
]

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState('invite')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  
  // Get redirect URL and invite code from query params
  const nextUrl = searchParams.get('next')
  const inviteCode = searchParams.get('invite')

  const inviteForm = useForm<InviteSignupForm>({
    resolver: zodResolver(inviteSignupSchema),
    defaultValues: {
      inviteCode: inviteCode || '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      agreeToPrivacy: false
    }
  })

  const orgForm = useForm<OrgSignupForm>({
    resolver: zodResolver(orgSignupSchema),
    defaultValues: {
      organizationName: '',
      organizationType: undefined,
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      agreeToPrivacy: false,
      agreeToMarketing: false
    }
  })

  // Set invite code if provided in URL
  useEffect(() => {
    if (inviteCode) {
      inviteForm.setValue('inviteCode', inviteCode)
      setActiveTab('invite')
    }
  }, [inviteCode, inviteForm])

  const handleInviteSignup = async (data: InviteSignupForm) => {
    setIsSubmitting(true)
    setServerError('')
    
    try {
      const response = await fetch('/api/auth/signup/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '회원가입에 실패했습니다')
      }

      toast({
        title: "회원가입 성공",
        description: "이메일 인증 후 로그인할 수 있습니다.",
      })

      // Redirect to verify email page
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}${nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : ''}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다'
      setServerError(errorMessage)
      
      toast({
        title: "회원가입 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOrgSignup = async (data: OrgSignupForm) => {
    setIsSubmitting(true)
    setServerError('')
    
    try {
      const response = await fetch('/api/auth/signup/organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '회원가입에 실패했습니다')
      }

      toast({
        title: "조직 등록 신청 완료",
        description: "검토 후 승인 결과를 이메일로 알려드리겠습니다.",
      })

      // Redirect to verification pending page
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}&type=organization${nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : ''}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '조직 등록 중 오류가 발생했습니다'
      setServerError(errorMessage)
      
      toast({
        title: "등록 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Building className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">정치생산성허브</h1>
          <p className="text-gray-600 mt-2">새로운 계정을 만들어 시작하세요</p>
        </div>

        {/* Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              회원가입
            </CardTitle>
            <CardDescription>
              초대를 받으셨거나 새로운 조직을 등록하세요
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invite" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  초대 코드
                </TabsTrigger>
                <TabsTrigger value="organization" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  신규 조직
                </TabsTrigger>
              </TabsList>

              {/* Invite Code Signup */}
              <TabsContent value="invite" className="space-y-4">
                <form onSubmit={inviteForm.handleSubmit(handleInviteSignup)} className="space-y-4">
                  {/* Invite Code */}
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">초대 코드</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="inviteCode"
                        placeholder="초대 코드를 입력하세요"
                        className="pl-10"
                        {...inviteForm.register('inviteCode')}
                      />
                    </div>
                    {inviteForm.formState.errors.inviteCode && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.inviteCode.message}
                      </p>
                    )}
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        placeholder="이름을 입력하세요"
                        className="pl-10"
                        {...inviteForm.register('name')}
                      />
                    </div>
                    {inviteForm.formState.errors.name && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="example@email.com"
                        className="pl-10"
                        {...inviteForm.register('email')}
                      />
                    </div>
                    {inviteForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="invite-password">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="invite-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요 (최소 8자)"
                        className="pl-10 pr-10"
                        {...inviteForm.register('password')}
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
                    {inviteForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="invite-confirmPassword">비밀번호 확인</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="invite-confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="비밀번호를 다시 입력하세요"
                        className="pl-10 pr-10"
                        {...inviteForm.register('confirmPassword')}
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
                    {inviteForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Terms Agreement */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="invite-agreeToTerms"
                        checked={inviteForm.watch('agreeToTerms')}
                        onCheckedChange={(checked) => inviteForm.setValue('agreeToTerms', checked as boolean)}
                      />
                      <Label htmlFor="invite-agreeToTerms" className="text-sm">
                        <Link href="/terms" className="text-blue-600 underline">이용약관</Link>에 동의합니다
                      </Label>
                    </div>
                    {inviteForm.formState.errors.agreeToTerms && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.agreeToTerms.message}
                      </p>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="invite-agreeToPrivacy"
                        checked={inviteForm.watch('agreeToPrivacy')}
                        onCheckedChange={(checked) => inviteForm.setValue('agreeToPrivacy', checked as boolean)}
                      />
                      <Label htmlFor="invite-agreeToPrivacy" className="text-sm">
                        <Link href="/privacy" className="text-blue-600 underline">개인정보처리방침</Link>에 동의합니다
                      </Label>
                    </div>
                    {inviteForm.formState.errors.agreeToPrivacy && (
                      <p className="text-sm text-red-600">
                        {inviteForm.formState.errors.agreeToPrivacy.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        가입 중...
                      </>
                    ) : (
                      <>
                        회원가입
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Organization Signup */}
              <TabsContent value="organization" className="space-y-4">
                <form onSubmit={orgForm.handleSubmit(handleOrgSignup)} className="space-y-4">
                  {/* Organization Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">조직명</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="organizationName"
                          placeholder="조직명을 입력하세요"
                          className="pl-10"
                          {...orgForm.register('organizationName')}
                        />
                      </div>
                      {orgForm.formState.errors.organizationName && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.organizationName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizationType">조직 유형</Label>
                      <Select onValueChange={(value) => orgForm.setValue('organizationType', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="조직 유형을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-gray-500">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {orgForm.formState.errors.organizationType && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.organizationType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">담당자 이름</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="org-name"
                          placeholder="담당자 이름을 입력하세요"
                          className="pl-10"
                          {...orgForm.register('name')}
                        />
                      </div>
                      {orgForm.formState.errors.name && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-email">이메일</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="org-email"
                          type="email"
                          placeholder="example@email.com"
                          className="pl-10"
                          {...orgForm.register('email')}
                        />
                      </div>
                      {orgForm.formState.errors.email && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="010-0000-0000"
                        {...orgForm.register('phone')}
                      />
                      {orgForm.formState.errors.phone && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-password">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="org-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="비밀번호를 입력하세요 (최소 8자)"
                          className="pl-10 pr-10"
                          {...orgForm.register('password')}
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
                      {orgForm.formState.errors.password && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-confirmPassword">비밀번호 확인</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="org-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="비밀번호를 다시 입력하세요"
                          className="pl-10 pr-10"
                          {...orgForm.register('confirmPassword')}
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
                      {orgForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600">
                          {orgForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="org-agreeToTerms"
                        checked={orgForm.watch('agreeToTerms')}
                        onCheckedChange={(checked) => orgForm.setValue('agreeToTerms', checked as boolean)}
                      />
                      <Label htmlFor="org-agreeToTerms" className="text-sm">
                        <Link href="/terms" className="text-blue-600 underline">이용약관</Link>에 동의합니다
                      </Label>
                    </div>
                    {orgForm.formState.errors.agreeToTerms && (
                      <p className="text-sm text-red-600">
                        {orgForm.formState.errors.agreeToTerms.message}
                      </p>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="org-agreeToPrivacy"
                        checked={orgForm.watch('agreeToPrivacy')}
                        onCheckedChange={(checked) => orgForm.setValue('agreeToPrivacy', checked as boolean)}
                      />
                      <Label htmlFor="org-agreeToPrivacy" className="text-sm">
                        <Link href="/privacy" className="text-blue-600 underline">개인정보처리방침</Link>에 동의합니다
                      </Label>
                    </div>
                    {orgForm.formState.errors.agreeToPrivacy && (
                      <p className="text-sm text-red-600">
                        {orgForm.formState.errors.agreeToPrivacy.message}
                      </p>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agreeToMarketing"
                        checked={orgForm.watch('agreeToMarketing')}
                        onCheckedChange={(checked) => orgForm.setValue('agreeToMarketing', checked as boolean)}
                      />
                      <Label htmlFor="agreeToMarketing" className="text-sm text-gray-600">
                        마케팅 정보 수신에 동의합니다 (선택)
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        등록 신청 중...
                      </>
                    ) : (
                      <>
                        조직 등록 신청
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link 
                  href={`/auth/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  로그인
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>회원가입 시 <Link href="/terms" className="underline">이용약관</Link> 및 <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의한 것으로 간주됩니다.</p>
        </div>
      </div>
    </div>
  )
}