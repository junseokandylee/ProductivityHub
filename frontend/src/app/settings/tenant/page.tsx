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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Save,
  Upload,
  Database,
  Globe,
  Palette,
  Shield,
  Zap,
  AlertCircle,
  RefreshCw,
  Building2,
  Link as LinkIcon,
  Crown,
  Users,
  MessageSquare,
  UserCheck,
  BarChart3,
  Key,
  Eye
} from 'lucide-react'
import { 
  useTenantSettings, 
  useUpdateTenantSettings, 
  useUploadTenantLogo,
  useUploadTenantFavicon,
  type TenantSettings 
} from '@/lib/api/settings'

const tenantSettingsSchema = z.object({
  name: z.string().min(1, '테넌트 이름은 필수입니다').max(100, '테넌트 이름은 100자를 초과할 수 없습니다'),
  domain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, '올바른 도메인 형식을 입력하세요').optional().or(z.literal('')),
  subdomain: z.string().regex(/^[a-zA-Z0-9-]+$/, '올바른 서브도메인 형식을 입력하세요 (영문, 숫자, 하이픈만 사용)').optional().or(z.literal('')),
  customDomain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, '올바른 도메인 형식을 입력하세요').optional().or(z.literal('')),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '올바른 색상 형식을 입력하세요 (#RRGGBB)'),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, '올바른 색상 형식을 입력하세요 (#RRGGBB)'),
    logoUrl: z.string().url('올바른 이미지 URL을 입력하세요').optional().or(z.literal('')),
    faviconUrl: z.string().url('올바른 이미지 URL을 입력하세요').optional().or(z.literal('')),
    customCss: z.string().optional()
  }),
  security: z.object({
    enforced2FA: z.boolean(),
    ipWhitelisting: z.boolean(),
    ssoEnabled: z.boolean(),
    passwordPolicy: z.enum(['standard', 'strict'])
  }),
  integrations: z.object({
    webhook: z.string().url('올바른 웹훅 URL을 입력하세요').optional().or(z.literal('')),
    zapier: z.boolean(),
    slack: z.string().optional(),
    teams: z.string().optional()
  })
})

type TenantSettingsForm = z.infer<typeof tenantSettingsSchema>

const passwordPolicies = [
  { 
    value: 'standard', 
    label: '표준 정책',
    description: '최소 8자, 대소문자 + 숫자 포함'
  },
  { 
    value: 'strict', 
    label: '엄격한 정책',
    description: '최소 12자, 대소문자 + 숫자 + 특수문자 포함'
  }
]

export default function TenantSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false)
  
  const { 
    data: tenantSettings, 
    isLoading, 
    error,
    refetch 
  } = useTenantSettings()
  
  const updateTenantSettings = useUpdateTenantSettings()
  const uploadTenantLogo = useUploadTenantLogo()
  const uploadTenantFavicon = useUploadTenantFavicon()

  const form = useForm<TenantSettingsForm>({
    resolver: zodResolver(tenantSettingsSchema),
    defaultValues: {
      name: '',
      domain: '',
      subdomain: '',
      customDomain: '',
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#64748B',
        logoUrl: '',
        faviconUrl: '',
        customCss: ''
      },
      security: {
        enforced2FA: false,
        ipWhitelisting: false,
        ssoEnabled: false,
        passwordPolicy: 'standard'
      },
      integrations: {
        webhook: '',
        zapier: false,
        slack: '',
        teams: ''
      }
    }
  })

  // Update form when tenant settings data is loaded
  React.useEffect(() => {
    if (tenantSettings) {
      form.reset({
        name: tenantSettings.name || '',
        domain: tenantSettings.domain || '',
        subdomain: tenantSettings.subdomain || '',
        customDomain: tenantSettings.customDomain || '',
        branding: {
          primaryColor: tenantSettings.branding?.primaryColor || '#3B82F6',
          secondaryColor: tenantSettings.branding?.secondaryColor || '#64748B',
          logoUrl: tenantSettings.branding?.logoUrl || '',
          faviconUrl: tenantSettings.branding?.faviconUrl || '',
          customCss: tenantSettings.branding?.customCss || ''
        },
        security: {
          enforced2FA: tenantSettings.security?.enforced2FA ?? false,
          ipWhitelisting: tenantSettings.security?.ipWhitelisting ?? false,
          ssoEnabled: tenantSettings.security?.ssoEnabled ?? false,
          passwordPolicy: tenantSettings.security?.passwordPolicy || 'standard'
        },
        integrations: {
          webhook: tenantSettings.integrations?.webhook || '',
          zapier: tenantSettings.integrations?.zapier ?? false,
          slack: tenantSettings.integrations?.slack || '',
          teams: tenantSettings.integrations?.teams || ''
        }
      })
    }
  }, [tenantSettings, form])

  const onSubmit = async (data: TenantSettingsForm) => {
    try {
      await updateTenantSettings.mutateAsync(data)
      toast({
        title: "테넌트 설정 업데이트 완료",
        description: "테넌트 설정이 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "테넌트 설정 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.",
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

    setIsUploadingLogo(true)
    try {
      const result = await uploadTenantLogo.mutateAsync(file)
      form.setValue('branding.logoUrl', result.logoUrl)
      toast({
        title: "로고 업로드 완료",
        description: "테넌트 로고가 성공적으로 업로드되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "로고 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "파비콘 파일은 1MB 이하여야 합니다.",
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

    setIsUploadingFavicon(true)
    try {
      const result = await uploadTenantFavicon.mutateAsync(file)
      form.setValue('branding.faviconUrl', result.faviconUrl)
      toast({
        title: "파비콘 업로드 완료",
        description: "테넌트 파비콘이 성공적으로 업로드되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "파비콘 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingFavicon(false)
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'professional':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'enterprise':
        return 'bg-gold-100 text-gold-700 border-gold-300'
      case 'custom':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>테넌트 설정을 불러오는데 실패했습니다: {error.message}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">테넌트 설정</h1>
          <p className="text-gray-600">
            조직의 테넌트 설정과 브랜딩을 관리합니다
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      {tenantSettings?.subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5" />
              <div>
                <CardTitle>현재 구독</CardTitle>
                <CardDescription>
                  구독 상태와 기능 제한을 확인하세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Badge 
                    variant="outline" 
                    className={getPlanBadgeColor(tenantSettings.subscription.plan)}
                  >
                    {tenantSettings.subscription.plan.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">구독 플랜</p>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {tenantSettings.features.maxUsers.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  최대 사용자
                </p>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {tenantSettings.features.maxCampaigns.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  최대 캠페인
                </p>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {tenantSettings.features.maxContacts.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  최대 연락처
                </p>
              </div>
            </div>

            {/* Feature Status */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tenantSettings.features.customDomain ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">커스텀 도메인</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tenantSettings.features.advancedAnalytics ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">고급 분석</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tenantSettings.features.apiAccess ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">API 접근</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tenantSettings.features.whiteLabeling ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">화이트 라벨</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5" />
              <div>
                <CardTitle>기본 설정</CardTitle>
                <CardDescription>
                  테넌트의 기본 정보를 설정합니다
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
                {/* Tenant Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">테넌트 이름 *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="조직의 테넌트 이름을 입력하세요"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Domain */}
                  <div className="space-y-2">
                    <Label htmlFor="domain">기본 도메인</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="domain"
                        {...form.register('domain')}
                        placeholder="example.com"
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.domain && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.domain.message}
                      </p>
                    )}
                  </div>

                  {/* Subdomain */}
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">서브도메인</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="subdomain"
                        {...form.register('subdomain')}
                        placeholder="myorg"
                        className="pl-10"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
                        .platform.com
                      </div>
                    </div>
                    {form.formState.errors.subdomain && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.subdomain.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Custom Domain */}
                {tenantSettings?.features?.customDomain && (
                  <div className="space-y-2">
                    <Label htmlFor="customDomain">커스텀 도메인</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="customDomain"
                        {...form.register('customDomain')}
                        placeholder="mycustomdomain.com"
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.customDomain && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.customDomain.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      커스텀 도메인 설정 후 DNS 구성이 필요합니다
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5" />
              <div>
                <CardTitle>브랜딩 설정</CardTitle>
                <CardDescription>
                  로고, 색상 등 브랜드 아이덴티티를 설정합니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Logo & Favicon Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo */}
                  <div className="space-y-2">
                    <Label>로고</Label>
                    <div className="flex items-center gap-4">
                      {form.watch('branding.logoUrl') && (
                        <img
                          src={form.watch('branding.logoUrl')}
                          alt="테넌트 로고"
                          className="w-16 h-16 object-cover rounded border"
                        />
                      )}
                      <div className="space-y-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {isUploadingLogo ? '업로드 중...' : '로고 업로드'}
                        </Button>
                        <p className="text-xs text-gray-500">
                          PNG, JPG 파일, 최대 2MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Favicon */}
                  <div className="space-y-2">
                    <Label>파비콘</Label>
                    <div className="flex items-center gap-4">
                      {form.watch('branding.faviconUrl') && (
                        <img
                          src={form.watch('branding.faviconUrl')}
                          alt="파비콘"
                          className="w-8 h-8 object-cover rounded border"
                        />
                      )}
                      <div className="space-y-2">
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFaviconUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => faviconInputRef.current?.click()}
                          disabled={isUploadingFavicon}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {isUploadingFavicon ? '업로드 중...' : '파비콘 업로드'}
                        </Button>
                        <p className="text-xs text-gray-500">
                          ICO, PNG 파일, 최대 1MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">주 색상</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="primaryColor"
                        type="color"
                        {...form.register('branding.primaryColor')}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        {...form.register('branding.primaryColor')}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                    {form.formState.errors.branding?.primaryColor && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.branding.primaryColor.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">보조 색상</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="secondaryColor"
                        type="color"
                        {...form.register('branding.secondaryColor')}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        {...form.register('branding.secondaryColor')}
                        placeholder="#64748B"
                        className="flex-1"
                      />
                    </div>
                    {form.formState.errors.branding?.secondaryColor && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.branding.secondaryColor.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Custom CSS */}
                {tenantSettings?.features?.whiteLabeling && (
                  <div className="space-y-2">
                    <Label htmlFor="customCss">커스텀 CSS</Label>
                    <Textarea
                      id="customCss"
                      {...form.register('branding.customCss')}
                      placeholder="/* 커스텀 스타일을 입력하세요 */"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      고급 사용자만 사용하세요. 잘못된 CSS는 화면 표시에 문제를 일으킬 수 있습니다.
                    </p>
                  </div>
                )}
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
                  테넌트의 보안 정책을 관리합니다
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
                {/* 2FA Enforcement */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">2단계 인증 강제</h4>
                    <p className="text-sm text-gray-600">
                      모든 사용자에게 2단계 인증을 의무화합니다
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('security.enforced2FA')}
                    onCheckedChange={(checked) => 
                      form.setValue('security.enforced2FA', checked)}
                  />
                </div>

                {/* IP Whitelisting */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">IP 화이트리스트</h4>
                    <p className="text-sm text-gray-600">
                      지정된 IP 주소에서만 접속을 허용합니다
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('security.ipWhitelisting')}
                    onCheckedChange={(checked) => 
                      form.setValue('security.ipWhitelisting', checked)}
                  />
                </div>

                {/* SSO */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Single Sign-On (SSO)</h4>
                    <p className="text-sm text-gray-600">
                      기업용 SSO 인증을 활성화합니다
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('security.ssoEnabled')}
                    onCheckedChange={(checked) => 
                      form.setValue('security.ssoEnabled', checked)}
                  />
                </div>

                {/* Password Policy */}
                <div className="space-y-2">
                  <Label>비밀번호 정책</Label>
                  <Select
                    value={form.watch('security.passwordPolicy')}
                    onValueChange={(value: 'standard' | 'strict') => 
                      form.setValue('security.passwordPolicy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {passwordPolicies.map((policy) => (
                        <SelectItem key={policy.value} value={policy.value}>
                          <div>
                            <div className="font-medium">{policy.label}</div>
                            <div className="text-xs text-gray-500">{policy.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5" />
              <div>
                <CardTitle>통합 설정</CardTitle>
                <CardDescription>
                  외부 서비스와의 연동을 설정합니다
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
                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor="webhook">웹훅 URL</Label>
                  <Input
                    id="webhook"
                    {...form.register('integrations.webhook')}
                    placeholder="https://your-webhook.com/endpoint"
                    type="url"
                  />
                  {form.formState.errors.integrations?.webhook && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.integrations.webhook.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    이벤트 발생 시 지정된 URL로 알림을 전송합니다
                  </p>
                </div>

                {/* Zapier Integration */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Zapier 통합</h4>
                    <p className="text-sm text-gray-600">
                      Zapier를 통한 자동화 워크플로우를 활성화합니다
                    </p>
                  </div>
                  <Switch
                    checked={form.watch('integrations.zapier')}
                    onCheckedChange={(checked) => 
                      form.setValue('integrations.zapier', checked)}
                  />
                </div>

                {/* Slack Integration */}
                <div className="space-y-2">
                  <Label htmlFor="slack">Slack 웹훅</Label>
                  <Input
                    id="slack"
                    {...form.register('integrations.slack')}
                    placeholder="https://hooks.slack.com/services/..."
                    type="url"
                  />
                  <p className="text-xs text-gray-500">
                    Slack 채널로 알림을 받으려면 웹훅 URL을 입력하세요
                  </p>
                </div>

                {/* Teams Integration */}
                <div className="space-y-2">
                  <Label htmlFor="teams">Microsoft Teams 웹훅</Label>
                  <Input
                    id="teams"
                    {...form.register('integrations.teams')}
                    placeholder="https://your-tenant.webhook.office.com/..."
                    type="url"
                  />
                  <p className="text-xs text-gray-500">
                    Teams 채널로 알림을 받으려면 웹훅 URL을 입력하세요
                  </p>
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
            disabled={updateTenantSettings.isPending || isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateTenantSettings.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}