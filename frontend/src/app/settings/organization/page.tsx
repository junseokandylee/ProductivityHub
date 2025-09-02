'use client'

import React, { useState } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Save,
  Upload,
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useOrganization, useUpdateOrganization } from '@/lib/api/settings'

const organizationSchema = z.object({
  name: z.string().min(1, '조직명은 필수입니다').max(100, '조직명은 100자를 초과할 수 없습니다'),
  displayName: z.string().min(1, '표시명은 필수입니다').max(100, '표시명은 100자를 초과할 수 없습니다'),
  description: z.string().max(500, '설명은 500자를 초과할 수 없습니다').optional(),
  website: z.string().url('올바른 웹사이트 URL을 입력하세요').optional().or(z.literal('')),
  phone: z.string().regex(/^[0-9-+\s()]+$/, '올바른 전화번호 형식을 입력하세요').optional().or(z.literal('')),
  email: z.string().email('올바른 이메일 주소를 입력하세요'),
  address: z.string().max(200, '주소는 200자를 초과할 수 없습니다').optional(),
  logoUrl: z.string().url('올바른 이미지 URL을 입력하세요').optional().or(z.literal('')),
  settings: z.object({
    timezone: z.string(),
    language: z.string(),
    dateFormat: z.string(),
    currency: z.string()
  })
})

type OrganizationForm = z.infer<typeof organizationSchema>

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

const currencies = [
  { value: 'KRW', label: '원 (₩)' },
  { value: 'USD', label: '달러 ($)' },
  { value: 'JPY', label: '엔 (¥)' },
  { value: 'EUR', label: '유로 (€)' }
]

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  
  const { 
    data: organization, 
    isLoading, 
    error,
    refetch 
  } = useOrganization()
  
  const updateOrganization = useUpdateOrganization()

  const form = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      logoUrl: '',
      settings: {
        timezone: 'Asia/Seoul',
        language: 'ko',
        dateFormat: 'YYYY-MM-DD',
        currency: 'KRW'
      }
    }
  })

  // Update form when organization data is loaded
  React.useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name || '',
        displayName: organization.displayName || '',
        description: organization.description || '',
        website: organization.website || '',
        phone: organization.phone || '',
        email: organization.email || '',
        address: organization.address || '',
        logoUrl: organization.logoUrl || '',
        settings: {
          timezone: organization.settings?.timezone || 'Asia/Seoul',
          language: organization.settings?.language || 'ko',
          dateFormat: organization.settings?.dateFormat || 'YYYY-MM-DD',
          currency: organization.settings?.currency || 'KRW'
        }
      })
    }
  }, [organization, form])

  const onSubmit = async (data: OrganizationForm) => {
    try {
      await updateOrganization.mutateAsync(data)
      toast({
        title: "조직 정보 업데이트 완료",
        description: "조직 정보가 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "조직 정보 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "로고 파일은 2MB 이하여야 합니다.",
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

    setIsUploading(true)
    try {
      // TODO: Implement actual file upload to storage service
      // For now, create a mock URL
      const mockUrl = `https://storage.example.com/logos/${Date.now()}-${file.name}`
      form.setValue('logoUrl', mockUrl)
      
      toast({
        title: "로고 업로드 완료",
        description: "로고가 성공적으로 업로드되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "로고 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>조직 정보를 불러오는데 실패했습니다: {error.message}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">조직 설정</h1>
          <p className="text-gray-600">
            조직의 기본 정보와 설정을 관리합니다
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Organization Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              <div>
                <CardTitle>조직 프로필</CardTitle>
                <CardDescription>
                  조직의 기본 정보를 설정합니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>조직 로고</Label>
                  <div className="flex items-center gap-4">
                    {form.watch('logoUrl') && (
                      <img
                        src={form.watch('logoUrl')}
                        alt="조직 로고"
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    )}
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploading}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? '업로드 중...' : '로고 업로드'}
                      </Label>
                      <p className="text-xs text-gray-500">
                        PNG, JPG 파일, 최대 2MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organization Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">조직명 *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="조직의 공식 명칭을 입력하세요"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">표시명 *</Label>
                    <Input
                      id="displayName"
                      {...form.register('displayName')}
                      placeholder="사용자에게 표시될 이름을 입력하세요"
                    />
                    {form.formState.errors.displayName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">조직 설명</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="조직에 대한 간단한 설명을 입력하세요"
                    rows={3}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5" />
              <div>
                <CardTitle>연락처 정보</CardTitle>
                <CardDescription>
                  조직의 연락처 정보를 설정합니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소 *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      placeholder="contact@organization.com"
                      className="pl-10"
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      {...form.register('phone')}
                      placeholder="02-1234-5678"
                      className="pl-10"
                    />
                  </div>
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">웹사이트</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      type="url"
                      {...form.register('website')}
                      placeholder="https://www.organization.com"
                      className="pl-10"
                    />
                  </div>
                  {form.formState.errors.website && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.website.message}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">주소</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="address"
                      {...form.register('address')}
                      placeholder="서울특별시 강남구..."
                      rows={2}
                      className="pl-10"
                    />
                  </div>
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.address.message}
                    </p>
                  )}
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
                    value={form.watch('settings.timezone')}
                    onValueChange={(value) => form.setValue('settings.timezone', value)}
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
                    value={form.watch('settings.language')}
                    onValueChange={(value) => form.setValue('settings.language', value)}
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
                    value={form.watch('settings.dateFormat')}
                    onValueChange={(value) => form.setValue('settings.dateFormat', value)}
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

                {/* Currency */}
                <div className="space-y-2">
                  <Label>통화</Label>
                  <Select
                    value={form.watch('settings.currency')}
                    onValueChange={(value) => form.setValue('settings.currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
            disabled={updateOrganization.isPending || isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateOrganization.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}