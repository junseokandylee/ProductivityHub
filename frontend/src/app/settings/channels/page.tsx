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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Save,
  TestTube,
  Smartphone,
  Mail,
  MessageSquare,
  Bell,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { 
  useChannelConfigs, 
  useUpdateChannelConfig, 
  useTestChannel,
  type ChannelConfig 
} from '@/lib/api/settings'

const channelConfigSchema = z.object({
  isEnabled: z.boolean(),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  senderId: z.string().optional(),
  templateId: z.string().optional(),
  webhookUrl: z.string().url('올바른 웹훅 URL을 입력하세요').optional().or(z.literal('')),
  dailyLimit: z.number().min(0).optional(),
  monthlyLimit: z.number().min(0).optional(),
  costPerMessage: z.number().min(0).optional()
})

type ChannelConfigForm = z.infer<typeof channelConfigSchema>

const testMessageSchema = z.object({
  recipient: z.string().min(1, '수신자는 필수입니다'),
  message: z.string().min(1, '테스트 메시지는 필수입니다').max(1000, '메시지는 1000자를 초과할 수 없습니다')
})

type TestMessageForm = z.infer<typeof testMessageSchema>

const channelIcons = {
  sms: <Smartphone className="h-5 w-5" />,
  kakao: <MessageSquare className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  push: <Bell className="h-5 w-5" />
}

const channelNames = {
  sms: 'SMS',
  kakao: '카카오톡',
  email: '이메일',
  push: '푸시 알림'
}

const channelDescriptions = {
  sms: '문자 메시지를 통한 직접적인 커뮤니케이션',
  kakao: '카카오톡 비즈니스 메시지 발송',
  email: '이메일을 통한 상세한 정보 전달',
  push: '앱 푸시 알림을 통한 실시간 알림'
}

const getStatusColor = (status: string, isEnabled: boolean) => {
  if (!isEnabled) return 'bg-gray-100 text-gray-700 border-gray-300'
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 border-green-300'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'error':
      return 'bg-red-100 text-red-700 border-red-300'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

const getStatusText = (status: string, isEnabled: boolean) => {
  if (!isEnabled) return '비활성'
  switch (status) {
    case 'active':
      return '정상'
    case 'pending':
      return '설정 중'
    case 'error':
      return '오류'
    default:
      return '미설정'
  }
}

function ChannelCard({ 
  channel, 
  onUpdate,
  onTest 
}: { 
  channel: ChannelConfig
  onUpdate: (data: ChannelConfigForm) => void
  onTest: (recipient: string, message: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  
  const form = useForm<ChannelConfigForm>({
    resolver: zodResolver(channelConfigSchema),
    defaultValues: {
      isEnabled: channel.isEnabled,
      provider: channel.provider || '',
      apiKey: channel.apiKey || '',
      apiSecret: channel.apiSecret || '',
      senderId: channel.senderId || '',
      templateId: channel.templateId || '',
      webhookUrl: channel.webhookUrl || '',
      dailyLimit: channel.dailyLimit || 0,
      monthlyLimit: channel.monthlyLimit || 0,
      costPerMessage: channel.costPerMessage || 0
    }
  })

  const testForm = useForm<TestMessageForm>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: {
      recipient: '',
      message: '테스트 메시지입니다.'
    }
  })

  const handleSave = (data: ChannelConfigForm) => {
    onUpdate(data)
    setIsEditing(false)
  }

  const handleTest = (data: TestMessageForm) => {
    onTest(data.recipient, data.message)
    setIsTestDialogOpen(false)
    testForm.reset()
  }

  const maskSecret = (value: string) => {
    if (!value || value.length <= 4) return value
    return value.substring(0, 4) + '*'.repeat(value.length - 4)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              {channelIcons[channel.channel]}
            </div>
            <div>
              <CardTitle className="text-lg">{channelNames[channel.channel]}</CardTitle>
              <CardDescription>{channelDescriptions[channel.channel]}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getStatusColor(channel.status, channel.isEnabled)}
            >
              {getStatusText(channel.status, channel.isEnabled)}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings className="h-4 w-4 mr-1" />
              {isEditing ? '취소' : '설정'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isEditing ? (
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label>채널 활성화</Label>
                <p className="text-sm text-gray-600">이 채널을 사용하여 메시지를 발송합니다</p>
              </div>
              <Switch
                checked={form.watch('isEnabled')}
                onCheckedChange={(checked) => form.setValue('isEnabled', checked)}
              />
            </div>

            {form.watch('isEnabled') && (
              <>
                {/* Provider */}
                <div className="space-y-2">
                  <Label htmlFor={`${channel.channel}-provider`}>서비스 제공업체</Label>
                  <Select
                    value={form.watch('provider')}
                    onValueChange={(value) => form.setValue('provider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="제공업체를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {channel.channel === 'sms' && (
                        <>
                          <SelectItem value="nhncloud">NHN Cloud</SelectItem>
                          <SelectItem value="cafe24">카페24</SelectItem>
                          <SelectItem value="aligo">알리고</SelectItem>
                        </>
                      )}
                      {channel.channel === 'kakao' && (
                        <>
                          <SelectItem value="kakao-business">카카오 비즈니스</SelectItem>
                          <SelectItem value="bizppurio">비즈뿌리오</SelectItem>
                        </>
                      )}
                      {channel.channel === 'email' && (
                        <>
                          <SelectItem value="sendgrid">SendGrid</SelectItem>
                          <SelectItem value="ses">AWS SES</SelectItem>
                          <SelectItem value="mailgun">Mailgun</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-apikey`}>API 키</Label>
                    <div className="relative">
                      <Input
                        id={`${channel.channel}-apikey`}
                        type={showSecrets ? 'text' : 'password'}
                        {...form.register('apiKey')}
                        placeholder="API 키를 입력하세요"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowSecrets(!showSecrets)}
                      >
                        {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-secret`}>API 시크릿</Label>
                    <Input
                      id={`${channel.channel}-secret`}
                      type={showSecrets ? 'text' : 'password'}
                      {...form.register('apiSecret')}
                      placeholder="API 시크릿을 입력하세요"
                    />
                  </div>
                </div>

                {/* Channel-specific settings */}
                {channel.channel === 'sms' && (
                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-sender`}>발신번호</Label>
                    <Input
                      id={`${channel.channel}-sender`}
                      {...form.register('senderId')}
                      placeholder="010-1234-5678"
                    />
                  </div>
                )}

                {channel.channel === 'kakao' && (
                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-template`}>템플릿 ID</Label>
                    <Input
                      id={`${channel.channel}-template`}
                      {...form.register('templateId')}
                      placeholder="카카오 템플릿 ID를 입력하세요"
                    />
                  </div>
                )}

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor={`${channel.channel}-webhook`}>웹훅 URL</Label>
                  <Input
                    id={`${channel.channel}-webhook`}
                    type="url"
                    {...form.register('webhookUrl')}
                    placeholder="https://your-domain.com/webhook"
                  />
                  {form.formState.errors.webhookUrl && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.webhookUrl.message}
                    </p>
                  )}
                </div>

                {/* Limits and Cost */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-daily`}>일일 한도</Label>
                    <Input
                      id={`${channel.channel}-daily`}
                      type="number"
                      {...form.register('dailyLimit', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-monthly`}>월간 한도</Label>
                    <Input
                      id={`${channel.channel}-monthly`}
                      type="number"
                      {...form.register('monthlyLimit', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${channel.channel}-cost`}>메시지당 비용 (원)</Label>
                    <Input
                      id={`${channel.channel}-cost`}
                      type="number"
                      step="0.01"
                      {...form.register('costPerMessage', { valueAsNumber: true })}
                      placeholder="0.00"
                      min="0"
                    />
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
              <Button type="submit">
                <Save className="h-4 w-4 mr-1" />
                저장
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Current Configuration Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">제공업체</p>
                <p className="font-medium">{channel.provider || '미설정'}</p>
              </div>
              <div>
                <p className="text-gray-600">API 키</p>
                <p className="font-medium">{channel.apiKey ? maskSecret(channel.apiKey) : '미설정'}</p>
              </div>
              <div>
                <p className="text-gray-600">일일 한도</p>
                <p className="font-medium">{channel.dailyLimit?.toLocaleString() || '무제한'}</p>
              </div>
              <div>
                <p className="text-gray-600">메시지당 비용</p>
                <p className="font-medium">₩{channel.costPerMessage || 0}</p>
              </div>
            </div>

            {/* Test Result */}
            {channel.testResult && (
              <div className={`p-3 rounded-lg border ${
                channel.testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {channel.testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">
                    마지막 테스트: {new Date(channel.testResult.testedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{channel.testResult.message}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!channel.isEnabled || channel.status !== 'active'}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    테스트 발송
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{channelNames[channel.channel]} 테스트</DialogTitle>
                    <DialogDescription>
                      설정이 올바른지 테스트 메시지를 발송해보세요
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={testForm.handleSubmit(handleTest)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-recipient">수신자</Label>
                      <Input
                        id="test-recipient"
                        {...testForm.register('recipient')}
                        placeholder={
                          channel.channel === 'sms' ? '010-1234-5678' :
                          channel.channel === 'email' ? 'test@example.com' :
                          '수신자를 입력하세요'
                        }
                      />
                      {testForm.formState.errors.recipient && (
                        <p className="text-sm text-red-600">
                          {testForm.formState.errors.recipient.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="test-message">테스트 메시지</Label>
                      <Input
                        id="test-message"
                        {...testForm.register('message')}
                        placeholder="테스트 메시지를 입력하세요"
                      />
                      {testForm.formState.errors.message && (
                        <p className="text-sm text-red-600">
                          {testForm.formState.errors.message.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTestDialogOpen(false)}
                      >
                        취소
                      </Button>
                      <Button type="submit">
                        테스트 발송
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ChannelSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const { 
    data: channels, 
    isLoading, 
    error,
    refetch 
  } = useChannelConfigs()
  
  const updateChannelConfig = useUpdateChannelConfig()
  const testChannel = useTestChannel()

  const handleUpdateChannel = async (channel: string, data: ChannelConfigForm) => {
    try {
      await updateChannelConfig.mutateAsync({
        channel: channel as any,
        ...data
      })
      toast({
        title: "채널 설정 업데이트",
        description: `${channelNames[channel as keyof typeof channelNames]} 설정이 업데이트되었습니다.`,
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "채널 설정 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleTestChannel = async (channel: string, recipient: string, message: string) => {
    try {
      const result = await testChannel.mutateAsync({
        channel: channel as any,
        recipient,
        message
      })
      
      toast({
        title: result.success ? "테스트 성공" : "테스트 실패",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "테스트 실패",
        description: "테스트 발송 중 오류가 발생했습니다.",
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
            <span>채널 설정을 불러오는데 실패했습니다: {error.message}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">채널 설정</h1>
          <p className="text-gray-600">
            SMS, 카카오톡, 이메일 등 메시징 채널을 설정하고 관리합니다
          </p>
        </div>
      </div>

      {/* Channels List */}
      <div className="space-y-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j}>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : channels ? (
          channels.map((channel) => (
            <ChannelCard
              key={channel.channel}
              channel={channel}
              onUpdate={(data) => handleUpdateChannel(channel.channel, data)}
              onTest={(recipient, message) => handleTestChannel(channel.channel, recipient, message)}
            />
          ))
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              채널 설정 데이터가 없습니다. 관리자에게 문의하세요.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>채널 설정 도움말</CardTitle>
          <CardDescription>
            각 채널별 설정 방법과 주의사항을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                SMS 설정
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                SMS 발송을 위해서는 통신사 승인을 받은 발신번호가 필요합니다. 
                API 키와 발신번호를 정확히 입력하고 테스트 발송으로 확인하세요.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                카카오톡 설정
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                카카오 비즈니스 채널 등록과 템플릿 승인이 필요합니다. 
                템플릿 ID는 카카오 비즈니스 관리자에서 확인할 수 있습니다.
              </p>
            </div>

            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                이메일 설정
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                이메일 발송 서비스(SendGrid, AWS SES 등)의 API 키가 필요합니다. 
                SPF, DKIM 설정을 통해 전송률을 높일 수 있습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}