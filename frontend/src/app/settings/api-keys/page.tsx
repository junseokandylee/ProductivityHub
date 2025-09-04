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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Key,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Clock,
  Shield,
  Code,
  ExternalLink,
  CheckCircle,
  XCircle,
  Calendar,
  Activity,
  Info
} from 'lucide-react'
import { 
  useApiTokens, 
  useCreateApiToken, 
  useRevokeApiToken,
  type ApiToken 
} from '@/lib/api/settings'

const createTokenSchema = z.object({
  name: z.string().min(1, 'API 키 이름은 필수입니다').max(100, 'API 키 이름은 100자를 초과할 수 없습니다'),
  permissions: z.array(z.string()).min(1, '최소 하나의 권한을 선택해야 합니다'),
  expiresAt: z.string().optional()
})

type CreateTokenForm = z.infer<typeof createTokenSchema>

const availablePermissions = [
  {
    id: 'campaigns:read',
    name: '캠페인 조회',
    description: '캠페인 정보를 조회할 수 있습니다'
  },
  {
    id: 'campaigns:write',
    name: '캠페인 관리',
    description: '캠페인을 생성, 수정, 삭제할 수 있습니다'
  },
  {
    id: 'contacts:read',
    name: '연락처 조회',
    description: '연락처 정보를 조회할 수 있습니다'
  },
  {
    id: 'contacts:write',
    name: '연락처 관리',
    description: '연락처를 생성, 수정, 삭제할 수 있습니다'
  },
  {
    id: 'segments:read',
    name: '세그먼트 조회',
    description: '세그먼트 정보를 조회할 수 있습니다'
  },
  {
    id: 'segments:write',
    name: '세그먼트 관리',
    description: '세그먼트를 생성, 수정, 삭제할 수 있습니다'
  },
  {
    id: 'analytics:read',
    name: '분석 조회',
    description: '분석 데이터를 조회할 수 있습니다'
  },
  {
    id: 'webhooks:read',
    name: '웹훅 조회',
    description: '웹훅 설정을 조회할 수 있습니다'
  },
  {
    id: 'webhooks:write',
    name: '웹훅 관리',
    description: '웹훅을 생성, 수정, 삭제할 수 있습니다'
  }
]

export default function ApiKeysSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTokenData, setNewTokenData] = useState<{ token: string; name: string } | null>(null)
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set())
  
  const { 
    data: tokens, 
    isLoading, 
    error,
    refetch 
  } = useApiTokens()
  
  const createApiToken = useCreateApiToken()
  const revokeApiToken = useRevokeApiToken()

  const form = useForm<CreateTokenForm>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: '',
      permissions: [],
      expiresAt: ''
    }
  })

  const onSubmit = async (data: CreateTokenForm) => {
    try {
      const result = await createApiToken.mutateAsync({
        name: data.name,
        permissions: data.permissions,
        expiresAt: data.expiresAt || undefined
      })
      
      setNewTokenData({
        token: result.token,
        name: result.name
      })
      
      toast({
        title: "API 키 생성 완료",
        description: "새로운 API 키가 성공적으로 생성되었습니다.",
      })
      
      form.reset()
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "API 키 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleRevokeToken = async (tokenId: string, tokenName: string) => {
    if (!window.confirm(`'${tokenName}' API 키를 정말로 삭제하시겠습니까?`)) {
      return
    }

    setRevokingTokenId(tokenId)
    try {
      await revokeApiToken.mutateAsync(tokenId)
      toast({
        title: "API 키 삭제 완료",
        description: "API 키가 성공적으로 삭제되었습니다.",
      })
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "API 키 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setRevokingTokenId(null)
    }
  }

  const copyToClipboard = async (text: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedToken(tokenId)
      toast({
        title: "복사 완료",
        description: "API 키가 클립보드에 복사되었습니다.",
      })
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const toggleTokenVisibility = (tokenId: string) => {
    const newVisibleTokens = new Set(visibleTokens)
    if (newVisibleTokens.has(tokenId)) {
      newVisibleTokens.delete(tokenId)
    } else {
      newVisibleTokens.add(tokenId)
    }
    setVisibleTokens(newVisibleTokens)
  }

  const maskToken = (token: string) => {
    if (token.length <= 8) return token
    return token.substring(0, 8) + '••••••••••••••••' + token.substring(token.length - 4)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'revoked':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getPermissionColor = (permission: string) => {
    if (permission.endsWith(':write')) {
      return 'bg-orange-100 text-orange-700 border-orange-300'
    }
    return 'bg-blue-100 text-blue-700 border-blue-300'
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>API 키 정보를 불러오는데 실패했습니다: {error.message}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">API 키 관리</h1>
          <p className="text-gray-600">
            API 접근을 위한 인증 키를 생성하고 관리합니다
          </p>
        </div>
      </div>

      {/* API Documentation Link */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">API 문서</h3>
                <p className="text-gray-600">
                  API 사용법과 예제 코드를 확인하세요
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              API 문서 보기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create New Token Dialog */}
      {newTokenData && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-medium text-green-800">
                '{newTokenData.name}' API 키가 성공적으로 생성되었습니다!
              </p>
              <div className="bg-white border border-green-200 rounded p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm break-all font-mono bg-gray-100 px-2 py-1 rounded">
                    {newTokenData.token}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newTokenData.token, 'new')}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-green-700">
                ⚠️ 보안상 이 키는 다시 표시되지 않으니 안전한 곳에 보관하세요.
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setNewTokenData(null)}
                className="text-green-700 border-green-300"
              >
                확인
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5" />
              <div>
                <CardTitle>API 키 목록</CardTitle>
                <CardDescription>
                  생성된 API 키들을 관리합니다
                </CardDescription>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  새 API 키 생성
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>새 API 키 생성</DialogTitle>
                  <DialogDescription>
                    API 키 이름과 권한을 설정하세요
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Token Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">API 키 이름 *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="예: 내 웹사이트 연동"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Expiration Date */}
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">만료일 (선택사항)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      {...form.register('expiresAt')}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500">
                      설정하지 않으면 만료되지 않습니다
                    </p>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">권한 선택 *</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        API 키가 접근할 수 있는 기능을 선택하세요
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                      {availablePermissions.map((permission) => (
                        <div 
                          key={permission.id}
                          className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={form.watch('permissions').includes(permission.id)}
                            onCheckedChange={(checked) => {
                              const currentPermissions = form.watch('permissions')
                              if (checked) {
                                form.setValue('permissions', [...currentPermissions, permission.id])
                              } else {
                                form.setValue('permissions', currentPermissions.filter(p => p !== permission.id))
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={permission.id}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {permission.name}
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">
                              {permission.description}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPermissionColor(permission.id)}`}
                          >
                            {permission.id.endsWith(':write') ? '쓰기' : '읽기'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    {form.formState.errors.permissions && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.permissions.message}
                      </p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false)
                        form.reset()
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={createApiToken.isPending}
                      className="gap-2"
                    >
                      <Key className="h-4 w-4" />
                      {createApiToken.isPending ? '생성 중...' : 'API 키 생성'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-18" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tokens && tokens.length > 0 ? (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{token.name}</h3>
                      <p className="text-sm text-gray-600">
                        생성일: {new Date(token.createdAt).toLocaleDateString('ko-KR')} • 
                        생성자: {token.createdBy}
                        {token.lastUsed && (
                          <> • 마지막 사용: {new Date(token.lastUsed).toLocaleDateString('ko-KR')}</>
                        )}
                      </p>
                      {token.expiresAt && (
                        <p className="text-sm text-orange-600 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          만료일: {new Date(token.expiresAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={getStatusBadgeColor(token.status)}
                      >
                        {token.status === 'active' ? '활성' : '삭제됨'}
                      </Badge>
                      {token.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeToken(token.id, token.name)}
                          disabled={revokingTokenId === token.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {revokingTokenId === token.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Token Display */}
                  {token.status === 'active' && (
                    <div className="mb-3">
                      <Label className="text-sm text-gray-600">API 키</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                          {visibleTokens.has(token.id) ? token.token : maskToken(token.token)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTokenVisibility(token.id)}
                        >
                          {visibleTokens.has(token.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(token.token, token.id)}
                        >
                          {copiedToken === token.id ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  <div>
                    <Label className="text-sm text-gray-600">권한</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {token.permissions.map((permission) => (
                        <Badge 
                          key={permission} 
                          variant="outline"
                          className={`text-xs ${getPermissionColor(permission)}`}
                        >
                          {availablePermissions.find(p => p.id === permission)?.name || permission}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  {token.lastUsed && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Activity className="h-3 w-3" />
                        <span>최근 API 호출: {new Date(token.lastUsed).toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12">
              <Key className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                생성된 API 키가 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                API를 사용하려면 먼저 API 키를 생성해야 합니다
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    첫 번째 API 키 생성
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>새 API 키 생성</DialogTitle>
                    <DialogDescription>
                      API 키 이름과 권한을 설정하세요
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Token Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">API 키 이름 *</Label>
                      <Input
                        id="name"
                        {...form.register('name')}
                        placeholder="예: 내 웹사이트 연동"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Expiration Date */}
                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">만료일 (선택사항)</Label>
                      <Input
                        id="expiresAt"
                        type="date"
                        {...form.register('expiresAt')}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-gray-500">
                        설정하지 않으면 만료되지 않습니다
                      </p>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">권한 선택 *</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          API 키가 접근할 수 있는 기능을 선택하세요
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                        {availablePermissions.map((permission) => (
                          <div 
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={form.watch('permissions').includes(permission.id)}
                              onCheckedChange={(checked) => {
                                const currentPermissions = form.watch('permissions')
                                if (checked) {
                                  form.setValue('permissions', [...currentPermissions, permission.id])
                                } else {
                                  form.setValue('permissions', currentPermissions.filter(p => p !== permission.id))
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <Label 
                                htmlFor={permission.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.name}
                              </Label>
                              <p className="text-xs text-gray-600 mt-1">
                                {permission.description}
                              </p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPermissionColor(permission.id)}`}
                            >
                              {permission.id.endsWith(':write') ? '쓰기' : '읽기'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      
                      {form.formState.errors.permissions && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.permissions.message}
                        </p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false)
                          form.reset()
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={createApiToken.isPending}
                        className="gap-2"
                      >
                        <Key className="h-4 w-4" />
                        {createApiToken.isPending ? '생성 중...' : 'API 키 생성'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-orange-600" />
            <div>
              <CardTitle className="text-orange-900">보안 주의사항</CardTitle>
              <CardDescription>
                API 키 보안을 위한 중요한 안내사항입니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 mb-1">안전한 보관</h4>
                  <p className="text-sm text-orange-700">
                    API 키는 안전한 환경변수나 시크릿 관리 시스템에 보관하세요. 
                    코드나 공개 저장소에 직접 포함하지 마세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 mb-1">정기적 교체</h4>
                  <p className="text-sm text-orange-700">
                    보안을 위해 API 키를 정기적으로 교체하고, 
                    사용하지 않는 키는 즉시 삭제하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <Key className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 mb-1">최소 권한 원칙</h4>
                  <p className="text-sm text-orange-700">
                    필요한 최소한의 권한만 부여하고, 
                    용도별로 별도의 API 키를 생성하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900 mb-1">사용 모니터링</h4>
                  <p className="text-sm text-orange-700">
                    API 키 사용 내역을 정기적으로 확인하고, 
                    의심스러운 활동이 있으면 즉시 키를 삭제하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}