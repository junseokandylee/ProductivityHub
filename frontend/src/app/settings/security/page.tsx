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
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Shield,
  Key,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Globe,
  Users
} from 'lucide-react'
import { 
  useSecuritySettings, 
  useUpdateSecuritySettings,
  useApiTokens,
  useCreateApiToken,
  useRevokeApiToken,
  type SecuritySettings,
  type ApiToken
} from '@/lib/api/settings'

const passwordPolicySchema = z.object({
  minLength: z.number().min(6).max(128),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSpecialChars: z.boolean(),
  maxAge: z.number().min(30).max(365)
})

const sessionSettingsSchema = z.object({
  maxDuration: z.number().min(1).max(168), // hours
  idleTimeout: z.number().min(10).max(480), // minutes
  maxConcurrentSessions: z.number().min(1).max(10)
})

const twoFactorAuthSchema = z.object({
  enabled: z.boolean(),
  method: z.enum(['totp', 'sms', 'email']),
  enforcedForRoles: z.array(z.string())
})

const createApiTokenSchema = z.object({
  name: z.string().min(1, '토큰 이름은 필수입니다').max(50),
  permissions: z.array(z.string()).min(1, '최소 1개의 권한을 선택해야 합니다'),
  expiresAt: z.string().optional()
})

type PasswordPolicyForm = z.infer<typeof passwordPolicySchema>
type SessionSettingsForm = z.infer<typeof sessionSettingsSchema>
type TwoFactorAuthForm = z.infer<typeof twoFactorAuthSchema>
type CreateApiTokenForm = z.infer<typeof createApiTokenSchema>

const availablePermissions = [
  { value: 'campaigns:read', label: '캠페인 조회' },
  { value: 'campaigns:write', label: '캠페인 생성/수정' },
  { value: 'contacts:read', label: '연락처 조회' },
  { value: 'contacts:write', label: '연락처 생성/수정' },
  { value: 'analytics:read', label: '분석 데이터 조회' },
  { value: 'settings:read', label: '설정 조회' },
  { value: 'settings:write', label: '설정 수정' }
]

function PasswordPolicy({ 
  settings, 
  onUpdate 
}: { 
  settings: SecuritySettings['passwordPolicy']
  onUpdate: (data: PasswordPolicyForm) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  
  const form = useForm<PasswordPolicyForm>({
    resolver: zodResolver(passwordPolicySchema),
    defaultValues: settings
  })

  const handleSave = (data: PasswordPolicyForm) => {
    onUpdate(data)
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <div>
              <CardTitle>비밀번호 정책</CardTitle>
              <CardDescription>
                사용자 계정의 비밀번호 요구사항을 설정합니다
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? '취소' : '편집'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minLength">최소 길이</Label>
                <Input
                  id="minLength"
                  type="number"
                  min="6"
                  max="128"
                  {...form.register('minLength', { valueAsNumber: true })}
                />
                {form.formState.errors.minLength && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.minLength.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAge">만료 기간 (일)</Label>
                <Input
                  id="maxAge"
                  type="number"
                  min="30"
                  max="365"
                  {...form.register('maxAge', { valueAsNumber: true })}
                />
                {form.formState.errors.maxAge && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.maxAge.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>대문자 포함</Label>
                  <p className="text-sm text-gray-600">A-Z 문자 최소 1개 포함</p>
                </div>
                <Switch
                  checked={form.watch('requireUppercase')}
                  onCheckedChange={(checked) => form.setValue('requireUppercase', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>소문자 포함</Label>
                  <p className="text-sm text-gray-600">a-z 문자 최소 1개 포함</p>
                </div>
                <Switch
                  checked={form.watch('requireLowercase')}
                  onCheckedChange={(checked) => form.setValue('requireLowercase', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>숫자 포함</Label>
                  <p className="text-sm text-gray-600">0-9 숫자 최소 1개 포함</p>
                </div>
                <Switch
                  checked={form.watch('requireNumbers')}
                  onCheckedChange={(checked) => form.setValue('requireNumbers', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>특수문자 포함</Label>
                  <p className="text-sm text-gray-600">!@#$%^&* 등 특수문자 최소 1개 포함</p>
                </div>
                <Switch
                  checked={form.watch('requireSpecialChars')}
                  onCheckedChange={(checked) => form.setValue('requireSpecialChars', checked)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">최소 길이</p>
                <p className="font-medium">{settings.minLength}자</p>
              </div>
              <div>
                <p className="text-gray-600">만료 기간</p>
                <p className="font-medium">{settings.maxAge}일</p>
              </div>
              <div>
                <p className="text-gray-600">대문자 필수</p>
                <Badge variant={settings.requireUppercase ? "default" : "secondary"}>
                  {settings.requireUppercase ? '예' : '아니오'}
                </Badge>
              </div>
              <div>
                <p className="text-gray-600">특수문자 필수</p>
                <Badge variant={settings.requireSpecialChars ? "default" : "secondary"}>
                  {settings.requireSpecialChars ? '예' : '아니오'}
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">현재 정책 요약</h4>
              <p className="text-sm text-gray-600">
                최소 {settings.minLength}자, {settings.maxAge}일마다 변경
                {settings.requireUppercase && ', 대문자 필수'}
                {settings.requireLowercase && ', 소문자 필수'}
                {settings.requireNumbers && ', 숫자 필수'}
                {settings.requireSpecialChars && ', 특수문자 필수'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TwoFactorAuth({ 
  settings, 
  onUpdate 
}: { 
  settings: SecuritySettings['twoFactorAuth']
  onUpdate: (data: TwoFactorAuthForm) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  
  const form = useForm<TwoFactorAuthForm>({
    resolver: zodResolver(twoFactorAuthSchema),
    defaultValues: settings
  })

  const handleSave = (data: TwoFactorAuthForm) => {
    onUpdate(data)
    setIsEditing(false)
  }

  const toggleRole = (role: string) => {
    const currentRoles = form.getValues('enforcedForRoles')
    if (currentRoles.includes(role)) {
      form.setValue('enforcedForRoles', currentRoles.filter(r => r !== role))
    } else {
      form.setValue('enforcedForRoles', [...currentRoles, role])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <div>
              <CardTitle>2단계 인증 (2FA)</CardTitle>
              <CardDescription>
                계정 보안을 강화하기 위한 추가 인증 설정
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? '취소' : '편집'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>2단계 인증 활성화</Label>
                <p className="text-sm text-gray-600">추가 보안층을 제공합니다</p>
              </div>
              <Switch
                checked={form.watch('enabled')}
                onCheckedChange={(checked) => form.setValue('enabled', checked)}
              />
            </div>

            {form.watch('enabled') && (
              <>
                <div className="space-y-2">
                  <Label>인증 방법</Label>
                  <Select
                    value={form.watch('method')}
                    onValueChange={(value) => form.setValue('method', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totp">앱 기반 (TOTP)</SelectItem>
                      <SelectItem value="sms">SMS 문자</SelectItem>
                      <SelectItem value="email">이메일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>필수 역할</Label>
                  <div className="space-y-2">
                    {['Owner', 'Admin', 'Staff'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={role}
                          checked={form.watch('enforcedForRoles').includes(role)}
                          onChange={() => toggleRole(role)}
                          className="rounded"
                        />
                        <Label htmlFor={role}>
                          {role === 'Owner' ? '소유자' : role === 'Admin' ? '관리자' : '직원'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={settings.enabled ? "default" : "secondary"}>
                {settings.enabled ? '활성화됨' : '비활성화됨'}
              </Badge>
              {settings.enabled && (
                <Badge variant="outline">
                  {settings.method === 'totp' ? 'TOTP 앱' : 
                   settings.method === 'sms' ? 'SMS' : '이메일'}
                </Badge>
              )}
            </div>

            {settings.enabled && (
              <div>
                <p className="text-sm font-medium mb-2">필수 적용 역할</p>
                <div className="flex flex-wrap gap-2">
                  {settings.enforcedForRoles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role === 'Owner' ? '소유자' : role === 'Admin' ? '관리자' : '직원'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 2단계 인증을 활성화하면 계정 보안이 크게 향상됩니다.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ApiTokens({ 
  tokens, 
  onCreateToken, 
  onRevokeToken 
}: { 
  tokens: ApiToken[]
  onCreateToken: (data: CreateApiTokenForm) => void
  onRevokeToken: (tokenId: string) => void
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState<{ token: string } | null>(null)
  const { toast } = useToast()

  const form = useForm<CreateApiTokenForm>({
    resolver: zodResolver(createApiTokenSchema),
    defaultValues: {
      name: '',
      permissions: [],
      expiresAt: ''
    }
  })

  const handleCreateToken = async (data: CreateApiTokenForm) => {
    try {
      const result = await onCreateToken(data)
      setIsCreateDialogOpen(false)
      form.reset()
      // In real implementation, the API would return the token
      setShowTokenDialog({ token: 'api_token_12345678901234567890abcdef' })
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast({
        title: "토큰 복사됨",
        description: "API 토큰이 클립보드에 복사되었습니다.",
      })
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "토큰 복사에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const togglePermission = (permission: string) => {
    const currentPermissions = form.getValues('permissions')
    if (currentPermissions.includes(permission)) {
      form.setValue('permissions', currentPermissions.filter(p => p !== permission))
    } else {
      form.setValue('permissions', [...currentPermissions, permission])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <div>
              <CardTitle>API 토큰</CardTitle>
              <CardDescription>
                API 액세스를 위한 인증 토큰을 관리합니다
              </CardDescription>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                토큰 생성
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>새 API 토큰 생성</DialogTitle>
                <DialogDescription>
                  API 액세스를 위한 새로운 토큰을 생성합니다
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleCreateToken)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token-name">토큰 이름</Label>
                  <Input
                    id="token-name"
                    {...form.register('name')}
                    placeholder="예: 웹사이트 통합"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token-expires">만료일 (선택)</Label>
                  <Input
                    id="token-expires"
                    type="date"
                    {...form.register('expiresAt')}
                  />
                </div>

                <div className="space-y-3">
                  <Label>권한 선택</Label>
                  {form.formState.errors.permissions && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.permissions.message}
                    </p>
                  )}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availablePermissions.map((permission) => (
                      <div key={permission.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={permission.value}
                          checked={form.watch('permissions').includes(permission.value)}
                          onChange={() => togglePermission(permission.value)}
                          className="rounded"
                        />
                        <Label htmlFor={permission.value} className="text-sm">
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit">생성</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              API 토큰이 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              API 액세스를 위한 첫 번째 토큰을 생성하세요
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((token) => (
              <div key={token.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{token.name}</h4>
                    <Badge variant={token.status === 'active' ? 'default' : 'secondary'}>
                      {token.status === 'active' ? '활성' : '비활성'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevokeToken(token.id)}
                    disabled={token.status === 'revoked'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>생성일: {new Date(token.createdAt).toLocaleDateString()}</p>
                  {token.expiresAt && (
                    <p>만료일: {new Date(token.expiresAt).toLocaleDateString()}</p>
                  )}
                  {token.lastUsed && (
                    <p>마지막 사용: {new Date(token.lastUsed).toLocaleDateString()}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {token.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {availablePermissions.find(p => p.value === permission)?.label || permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show Token Dialog */}
        <Dialog open={!!showTokenDialog} onOpenChange={() => setShowTokenDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 API 토큰</DialogTitle>
              <DialogDescription>
                토큰이 생성되었습니다. 안전한 곳에 저장하세요. 이 창을 닫으면 다시 볼 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            {showTokenDialog && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                  {showTokenDialog.token}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToken(showTokenDialog.token)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    복사
                  </Button>
                  <Button onClick={() => setShowTokenDialog(null)}>
                    닫기
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default function SecuritySettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const { 
    data: securitySettings, 
    isLoading: isLoadingSettings, 
    error: settingsError,
    refetch: refetchSettings 
  } = useSecuritySettings()
  
  const { 
    data: apiTokens, 
    isLoading: isLoadingTokens, 
    error: tokensError,
    refetch: refetchTokens 
  } = useApiTokens()
  
  const updateSecuritySettings = useUpdateSecuritySettings()
  const createApiToken = useCreateApiToken()
  const revokeApiToken = useRevokeApiToken()

  const handleUpdatePasswordPolicy = async (data: PasswordPolicyForm) => {
    try {
      await updateSecuritySettings.mutateAsync({ passwordPolicy: data })
      toast({
        title: "비밀번호 정책 업데이트",
        description: "비밀번호 정책이 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "비밀번호 정책 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTwoFactorAuth = async (data: TwoFactorAuthForm) => {
    try {
      await updateSecuritySettings.mutateAsync({ twoFactorAuth: data })
      toast({
        title: "2단계 인증 설정 업데이트",
        description: "2단계 인증 설정이 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "2단계 인증 설정 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCreateApiToken = async (data: CreateApiTokenForm) => {
    try {
      await createApiToken.mutateAsync(data)
      toast({
        title: "API 토큰 생성 완료",
        description: "새로운 API 토큰이 생성되었습니다.",
      })
    } catch (error) {
      toast({
        title: "토큰 생성 실패",
        description: "API 토큰 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleRevokeApiToken = async (tokenId: string) => {
    try {
      await revokeApiToken.mutateAsync(tokenId)
      toast({
        title: "토큰 비활성화",
        description: "API 토큰이 비활성화되었습니다.",
      })
    } catch (error) {
      toast({
        title: "비활성화 실패",
        description: "API 토큰 비활성화 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  if (settingsError || tokensError) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>보안 설정을 불러오는데 실패했습니다: {settingsError?.message || tokensError?.message}</span>
            <Button variant="outline" size="sm" onClick={() => { refetchSettings(); refetchTokens(); }}>
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
          <h1 className="text-3xl font-bold text-gray-900">보안 설정</h1>
          <p className="text-gray-600">
            계정 보안과 API 액세스를 관리합니다
          </p>
        </div>
      </div>

      <Tabs defaultValue="policies" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="policies">보안 정책</TabsTrigger>
          <TabsTrigger value="authentication">인증</TabsTrigger>
          <TabsTrigger value="tokens">API 토큰</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-6">
          {isLoadingSettings ? (
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : securitySettings ? (
            <>
              <PasswordPolicy 
                settings={securitySettings.passwordPolicy}
                onUpdate={handleUpdatePasswordPolicy}
              />

              {/* Session Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <div>
                      <CardTitle>세션 설정</CardTitle>
                      <CardDescription>
                        사용자 세션 관리 설정
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">최대 세션 시간</p>
                      <p className="font-medium">{securitySettings.sessionSettings.maxDuration}시간</p>
                    </div>
                    <div>
                      <p className="text-gray-600">유휴 타임아웃</p>
                      <p className="font-medium">{securitySettings.sessionSettings.idleTimeout}분</p>
                    </div>
                    <div>
                      <p className="text-gray-600">동시 세션</p>
                      <p className="font-medium">최대 {securitySettings.sessionSettings.maxConcurrentSessions}개</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* IP Whitelist */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <div>
                      <CardTitle>IP 화이트리스트</CardTitle>
                      <CardDescription>
                        허용된 IP 주소에서만 접근 가능
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {securitySettings.ipWhitelist.length === 0 ? (
                    <p className="text-sm text-gray-600">모든 IP에서 접근 허용됨</p>
                  ) : (
                    <div className="space-y-2">
                      {securitySettings.ipWhitelist.map((ip, index) => (
                        <Badge key={index} variant="outline">
                          {ip}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="authentication" className="space-y-6">
          {isLoadingSettings ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ) : securitySettings ? (
            <TwoFactorAuth 
              settings={securitySettings.twoFactorAuth}
              onUpdate={handleUpdateTwoFactorAuth}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="tokens" className="space-y-6">
          {isLoadingTokens ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ) : (
            <ApiTokens 
              tokens={apiTokens || []}
              onCreateToken={handleCreateApiToken}
              onRevokeToken={handleRevokeApiToken}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>보안 상태 요약</CardTitle>
          <CardDescription>
            현재 보안 설정의 전반적인 상태를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">비밀번호 정책</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                활성
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {securitySettings?.twoFactorAuth.enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">2단계 인증</span>
              </div>
              <Badge variant="outline" className={
                securitySettings?.twoFactorAuth.enabled 
                  ? "bg-green-100 text-green-700 border-green-300"
                  : "bg-yellow-100 text-yellow-700 border-yellow-300"
              }>
                {securitySettings?.twoFactorAuth.enabled ? '활성' : '비활성'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">API 토큰</span>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                {apiTokens?.filter(t => t.status === 'active').length || 0}개 활성
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">세션 보안</span>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                구성됨
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}