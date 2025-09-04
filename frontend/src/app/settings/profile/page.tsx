'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Save,
  Upload,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  RefreshCw,
  Camera,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Check
} from 'lucide-react'
import { 
  useUserProfile, 
  useUpdateUserProfile, 
  useUploadAvatar,
  useChangePassword,
  type UserProfile 
} from '@/lib/api/settings'

const profileSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(100, '이름은 100자를 초과할 수 없습니다'),
  phone: z.string().regex(/^[0-9-+\s()]*$/, '올바른 전화번호 형식을 입력하세요').optional().or(z.literal('')),
  position: z.string().max(100, '직책은 100자를 초과할 수 없습니다').optional(),
  department: z.string().max(100, '부서는 100자를 초과할 수 없습니다').optional(),
  bio: z.string().max(500, '자기소개는 500자를 초과할 수 없습니다').optional(),
  timezone: z.string(),
  language: z.string(),
  dateFormat: z.string(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    marketing: z.boolean(),
    security: z.boolean()
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    compactMode: z.boolean(),
    defaultView: z.string()
  })
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요'),
  newPassword: z.string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력하세요')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다',
  path: ['confirmPassword']
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

const timezones = [
  { value: 'Asia/Seoul', label: '서울 (GMT+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (GMT+9)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: '뉴욕 (GMT-5/-4)' }
]

const languages = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
]

const dateFormats = [
  { value: 'YYYY-MM-DD', label: '2024-01-15' },
  { value: 'MM/DD/YYYY', label: '01/15/2024' },
  { value: 'DD/MM/YYYY', label: '15/01/2024' },
  { value: 'YYYY년 MM월 DD일', label: '2024년 01월 15일' }
]

const themes = [
  { value: 'light', label: '라이트 모드' },
  { value: 'dark', label: '다크 모드' },
  { value: 'auto', label: '시스템 설정 따름' }
]

const defaultViews = [
  { value: 'dashboard', label: '대시보드' },
  { value: 'campaigns', label: '캠페인' },
  { value: 'contacts', label: '연락처' },
  { value: 'analytics', label: '분석' }
]

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const { 
    data: profile, 
    isLoading, 
    error,
    refetch 
  } = useUserProfile()
  
  const updateProfile = useUpdateUserProfile()
  const uploadAvatar = useUploadAvatar()
  const changePassword = useChangePassword()

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      position: '',
      department: '',
      bio: '',
      timezone: 'Asia/Seoul',
      language: 'ko',
      dateFormat: 'YYYY-MM-DD',
      notifications: {
        email: true,
        push: true,
        marketing: false,
        security: true
      },
      preferences: {
        theme: 'light',
        compactMode: false,
        defaultView: 'dashboard'
      }
    }
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  // Update form when profile data is loaded
  React.useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name || '',
        phone: profile.phone || '',
        position: profile.position || '',
        department: profile.department || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'Asia/Seoul',
        language: profile.language || 'ko',
        dateFormat: profile.dateFormat || 'YYYY-MM-DD',
        notifications: {
          email: profile.notifications?.email ?? true,
          push: profile.notifications?.push ?? true,
          marketing: profile.notifications?.marketing ?? false,
          security: profile.notifications?.security ?? true
        },
        preferences: {
          theme: profile.preferences?.theme || 'light',
          compactMode: profile.preferences?.compactMode ?? false,
          defaultView: profile.preferences?.defaultView || 'dashboard'
        }
      })
    }
  }, [profile, profileForm])

  const onSubmitProfile = async (data: ProfileForm) => {
    try {
      await updateProfile.mutateAsync(data)
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필 정보가 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "프로필 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  const onSubmitPassword = async (data: PasswordForm) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      })
      
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      })
      
      passwordForm.reset()
      setIsPasswordDialogOpen(false)
    } catch (error) {
      toast({
        title: "비밀번호 변경 실패",
        description: "비밀번호 변경 중 오류가 발생했습니다. 현재 비밀번호를 확인해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "아바타 파일은 5MB 이하여야 합니다.",
        variant: "destructive",
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "잘못된 파일 형식",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    try {
      await uploadAvatar.mutateAsync(file)
      toast({
        title: "아바타 업데이트 완료",
        description: "프로필 사진이 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "아바타 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>프로필 정보를 불러오는데 실패했습니다: {error.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold text-gray-900">프로필 설정</h1>
          <p className="text-gray-600">
            개인 정보와 환경 설정을 관리합니다
          </p>
        </div>
      </div>

      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <div>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>
                  프로필 사진과 기본 정보를 설정합니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>프로필 사진</Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {profile?.avatar ? (
                        <img
                          src={profile.avatar}
                          alt="프로필 사진"
                          className="w-20 h-20 object-cover rounded-full border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-full border-2 border-gray-200 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                        disabled={uploadAvatar.isPending}
                      >
                        <Camera className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadAvatar.isPending}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadAvatar.isPending ? '업로드 중...' : '사진 변경'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        JPG, PNG 파일, 최대 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      {...profileForm.register('name')}
                      placeholder="이름을 입력하세요"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email (readonly) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="pl-10 bg-gray-50"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      이메일은 관리자만 변경할 수 있습니다
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        {...profileForm.register('phone')}
                        placeholder="010-1234-5678"
                        className="pl-10"
                      />
                    </div>
                    {profileForm.formState.errors.phone && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label htmlFor="position">직책</Label>
                    <Input
                      id="position"
                      {...profileForm.register('position')}
                      placeholder="예: 캠페인 매니저"
                    />
                    {profileForm.formState.errors.position && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.position.message}
                      </p>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department">부서</Label>
                    <Input
                      id="department"
                      {...profileForm.register('department')}
                      placeholder="예: 디지털 마케팅팀"
                    />
                    {profileForm.formState.errors.department && (
                      <p className="text-sm text-red-600">
                        {profileForm.formState.errors.department.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">자기소개</Label>
                  <Textarea
                    id="bio"
                    {...profileForm.register('bio')}
                    placeholder="간단한 자기소개를 작성하세요"
                    rows={3}
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-red-600">
                      {profileForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <div>
                <CardTitle>보안 설정</CardTitle>
                <CardDescription>
                  계정 보안과 관련된 설정을 관리합니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium">비밀번호</h4>
                <p className="text-sm text-gray-600">
                  계정 보안을 위해 주기적으로 비밀번호를 변경하세요
                </p>
              </div>
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    비밀번호 변경
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>비밀번호 변경</DialogTitle>
                    <DialogDescription>
                      보안을 위해 현재 비밀번호를 입력한 후 새 비밀번호를 설정하세요
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">현재 비밀번호</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          {...passwordForm.register('currentPassword')}
                          placeholder="현재 비밀번호를 입력하세요"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-sm text-red-600">
                          {passwordForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">새 비밀번호</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          {...passwordForm.register('newPassword')}
                          placeholder="새 비밀번호를 입력하세요"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.newPassword && (
                        <p className="text-sm text-red-600">
                          {passwordForm.formState.errors.newPassword.message}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...passwordForm.register('confirmPassword')}
                          placeholder="새 비밀번호를 다시 입력하세요"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600">
                          {passwordForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          passwordForm.reset()
                          setIsPasswordDialogOpen(false)
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={changePassword.isPending}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        {changePassword.isPending ? '변경 중...' : '비밀번호 변경'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {profile?.lastLogin && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">마지막 로그인</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(profile.lastLogin).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Localization Settings */}
        <Card>
          <CardHeader>
            <CardTitle>지역화 설정</CardTitle>
            <CardDescription>
              시간대, 언어, 날짜 형식 등을 설정합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timezone */}
                <div className="space-y-2">
                  <Label>시간대</Label>
                  <Select
                    value={profileForm.watch('timezone')}
                    onValueChange={(value) => profileForm.setValue('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label>언어</Label>
                  <Select
                    value={profileForm.watch('language')}
                    onValueChange={(value) => profileForm.setValue('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Format */}
                <div className="space-y-2">
                  <Label>날짜 형식</Label>
                  <Select
                    value={profileForm.watch('dateFormat')}
                    onValueChange={(value) => profileForm.setValue('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <Label>테마</Label>
                  <Select
                    value={profileForm.watch('preferences.theme')}
                    onValueChange={(value: 'light' | 'dark' | 'auto') => 
                      profileForm.setValue('preferences.theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <div>
                <CardTitle>알림 설정</CardTitle>
                <CardDescription>
                  받고 싶은 알림 유형을 선택하세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">이메일 알림</h4>
                    <p className="text-sm text-gray-600">
                      캠페인 상태, 시스템 업데이트 등을 이메일로 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={profileForm.watch('notifications.email')}
                    onCheckedChange={(checked) => 
                      profileForm.setValue('notifications.email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">푸시 알림</h4>
                    <p className="text-sm text-gray-600">
                      브라우저 푸시 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={profileForm.watch('notifications.push')}
                    onCheckedChange={(checked) => 
                      profileForm.setValue('notifications.push', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">마케팅 알림</h4>
                    <p className="text-sm text-gray-600">
                      새로운 기능, 팁, 프로모션 정보를 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={profileForm.watch('notifications.marketing')}
                    onCheckedChange={(checked) => 
                      profileForm.setValue('notifications.marketing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">보안 알림</h4>
                    <p className="text-sm text-gray-600">
                      로그인, 비밀번호 변경 등 보안 관련 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={profileForm.watch('notifications.security')}
                    onCheckedChange={(checked) => 
                      profileForm.setValue('notifications.security', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>환경 설정</CardTitle>
            <CardDescription>
              사용자 인터페이스 관련 설정을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Default View */}
                  <div className="space-y-2">
                    <Label>기본 화면</Label>
                    <Select
                      value={profileForm.watch('preferences.defaultView')}
                      onValueChange={(value) => 
                        profileForm.setValue('preferences.defaultView', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultViews.map((view) => (
                          <SelectItem key={view.value} value={view.value}>
                            {view.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">컴팩트 모드</h4>
                    <p className="text-sm text-gray-600">
                      더 많은 정보를 한 화면에 표시합니다
                    </p>
                  </div>
                  <Switch
                    checked={profileForm.watch('preferences.compactMode')}
                    onCheckedChange={(checked) => 
                      profileForm.setValue('preferences.compactMode', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/settings')}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={updateProfile.isPending || isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}