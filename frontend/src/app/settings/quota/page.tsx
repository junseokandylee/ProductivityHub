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
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Bell,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  Target
} from 'lucide-react'
import { 
  useQuotaInfo, 
  useUpdateQuotaAlerts,
  type QuotaInfo 
} from '@/lib/api/settings'

const alertSettingsSchema = z.object({
  enabled: z.boolean(),
  thresholds: z.array(z.number().min(1).max(100)),
  recipients: z.array(z.string().email())
})

type AlertSettingsForm = z.infer<typeof alertSettingsSchema>

const planFeatures = {
  starter: {
    name: 'Starter',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    features: ['월 5,000건 발송', '기본 분석', '1개 채널', '이메일 지원']
  },
  professional: {
    name: 'Professional',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    features: ['월 50,000건 발송', '고급 분석', '모든 채널', '우선 지원', 'API 액세스']
  },
  enterprise: {
    name: 'Enterprise',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    features: ['무제한 발송', '맞춤형 분석', '전용 지원', 'SLA 보장', '온프레미스']
  },
  custom: {
    name: 'Custom',
    color: 'bg-green-100 text-green-700 border-green-300',
    features: ['맞춤형 한도', '전용 기능', '24/7 지원', '맞춤형 계약']
  }
}

function QuotaOverview({ quota }: { quota: QuotaInfo }) {
  const usagePercentage = (quota.currentUsage / quota.monthlyLimit) * 100
  const remainingDays = Math.ceil((new Date(quota.resetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const getUsageStatus = () => {
    if (usagePercentage >= 95) return { color: 'red', icon: AlertTriangle, text: '위험' }
    if (usagePercentage >= 80) return { color: 'yellow', icon: AlertTriangle, text: '주의' }
    return { color: 'green', icon: CheckCircle, text: '정상' }
  }

  const status = getUsageStatus()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Current Usage */}
      <Card className={usagePercentage >= 90 ? 'border-red-200' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            현재 사용량
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">
                  {quota.currentUsage.toLocaleString()}
                </span>
                <span className="text-sm text-gray-600">
                  / {quota.monthlyLimit.toLocaleString()}건
                </span>
              </div>
              <Progress value={usagePercentage} className="h-3" />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <status.icon className={`h-4 w-4 text-${status.color}-600`} />
                <span className="text-sm font-medium">{status.text}</span>
              </div>
              <span className="text-sm text-gray-600">
                {usagePercentage.toFixed(1)}% 사용
              </span>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {quota.remainingQuota.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">건 남음</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            요금제 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={planFeatures[quota.plan].color}>
                {planFeatures[quota.plan].name}
              </Badge>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                업그레이드
              </Button>
            </div>
            
            <div className="space-y-2">
              {planFeatures[quota.plan].features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            결제 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">다음 결제일</p>
              <p className="font-medium">
                {new Date(quota.billingInfo.nextBillingDate).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                {remainingDays}일 남음
              </p>
            </div>

            {quota.billingInfo.lastPayment && (
              <div>
                <p className="text-sm text-gray-600">마지막 결제</p>
                <p className="font-medium">
                  ₩{quota.billingInfo.lastPayment.amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(quota.billingInfo.lastPayment.date).toLocaleDateString()} - {quota.billingInfo.lastPayment.method}
                </p>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full">
              결제 정보 관리
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ChannelUsage({ channels }: { channels: QuotaInfo['channelLimits'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>채널별 사용 현황</CardTitle>
        <CardDescription>
          각 채널별 메시지 사용량과 비용을 확인하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {channels.map((channel, index) => (
            <div key={channel.channel} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{channel.channel.toUpperCase()}</span>
                  <Badge variant="outline" className="text-xs">
                    {channel.usage.toLocaleString()}건
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="font-medium">₩{channel.cost.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    {channel.limit > 0 ? `${((channel.usage / channel.limit) * 100).toFixed(1)}%` : '무제한'}
                  </p>
                </div>
              </div>
              
              {channel.limit > 0 && (
                <Progress 
                  value={(channel.usage / channel.limit) * 100} 
                  className="h-2" 
                />
              )}
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>{channel.usage.toLocaleString()} / {channel.limit > 0 ? channel.limit.toLocaleString() : '∞'}</span>
                <span>건당 평균 ₩{(channel.cost / Math.max(channel.usage, 1)).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AlertSettings({ 
  alertSettings, 
  onUpdate 
}: { 
  alertSettings: QuotaInfo['alertSettings']
  onUpdate: (data: AlertSettingsForm) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  
  const form = useForm<AlertSettingsForm>({
    resolver: zodResolver(alertSettingsSchema),
    defaultValues: {
      enabled: alertSettings.enabled,
      thresholds: alertSettings.thresholds,
      recipients: alertSettings.recipients
    }
  })

  const handleSave = (data: AlertSettingsForm) => {
    onUpdate(data)
    setIsEditing(false)
  }

  const addThreshold = () => {
    const currentThresholds = form.getValues('thresholds')
    if (currentThresholds.length < 5) {
      form.setValue('thresholds', [...currentThresholds, 80])
    }
  }

  const removeThreshold = (index: number) => {
    const currentThresholds = form.getValues('thresholds')
    form.setValue('thresholds', currentThresholds.filter((_, i) => i !== index))
  }

  const addRecipient = () => {
    const currentRecipients = form.getValues('recipients')
    if (currentRecipients.length < 10) {
      form.setValue('recipients', [...currentRecipients, ''])
    }
  }

  const removeRecipient = (index: number) => {
    const currentRecipients = form.getValues('recipients')
    form.setValue('recipients', currentRecipients.filter((_, i) => i !== index))
  }

  const updateRecipient = (index: number, email: string) => {
    const currentRecipients = form.getValues('recipients')
    const newRecipients = [...currentRecipients]
    newRecipients[index] = email
    form.setValue('recipients', newRecipients)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <div>
              <CardTitle>할당량 알림 설정</CardTitle>
              <CardDescription>
                사용량이 임계치에 도달하면 알림을 받습니다
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
            {/* Enable Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <Label>알림 활성화</Label>
                <p className="text-sm text-gray-600">할당량 알림을 받으려면 활성화하세요</p>
              </div>
              <Switch
                checked={form.watch('enabled')}
                onCheckedChange={(checked) => form.setValue('enabled', checked)}
              />
            </div>

            {form.watch('enabled') && (
              <>
                {/* Thresholds */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>알림 임계치 (%)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addThreshold}
                      disabled={form.watch('thresholds').length >= 5}
                    >
                      임계치 추가
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.watch('thresholds').map((threshold, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={threshold}
                          onChange={(e) => {
                            const thresholds = form.getValues('thresholds')
                            thresholds[index] = parseInt(e.target.value)
                            form.setValue('thresholds', thresholds)
                          }}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-600">% 사용 시 알림</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeThreshold(index)}
                          disabled={form.watch('thresholds').length <= 1}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>알림 수신자</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRecipient}
                      disabled={form.watch('recipients').length >= 10}
                    >
                      수신자 추가
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.watch('recipients').map((recipient, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="email"
                          value={recipient}
                          onChange={(e) => updateRecipient(index, e.target.value)}
                          placeholder="email@example.com"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(index)}
                          disabled={form.watch('recipients').length <= 1}
                        >
                          ×
                        </Button>
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
              <Badge variant={alertSettings.enabled ? "default" : "secondary"}>
                {alertSettings.enabled ? '활성' : '비활성'}
              </Badge>
              {alertSettings.enabled && (
                <span className="text-sm text-gray-600">
                  {alertSettings.thresholds.length}개 임계치 설정됨
                </span>
              )}
            </div>

            {alertSettings.enabled && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">알림 임계치</p>
                  <div className="flex flex-wrap gap-2">
                    {alertSettings.thresholds.sort((a, b) => a - b).map((threshold, index) => (
                      <Badge key={index} variant="outline">
                        {threshold}%
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">알림 수신자</p>
                  <div className="flex flex-wrap gap-2">
                    {alertSettings.recipients.map((recipient, index) => (
                      <Badge key={index} variant="outline">
                        {recipient}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function QuotaSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const { 
    data: quotaInfo, 
    isLoading, 
    error,
    refetch 
  } = useQuotaInfo()
  
  const updateQuotaAlerts = useUpdateQuotaAlerts()

  const handleUpdateAlerts = async (data: AlertSettingsForm) => {
    try {
      await updateQuotaAlerts.mutateAsync(data)
      toast({
        title: "알림 설정 업데이트",
        description: "할당량 알림 설정이 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "알림 설정 업데이트 중 오류가 발생했습니다.",
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
            <span>할당량 정보를 불러오는데 실패했습니다: {error.message}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">할당량 관리</h1>
          <p className="text-gray-600">
            월간 메시지 할당량과 사용량을 확인하고 관리합니다
          </p>
        </div>
      </div>

      {/* Usage Alert */}
      {quotaInfo && quotaInfo.usagePercentage >= 80 && (
        <Alert className={quotaInfo.usagePercentage >= 95 ? "border-red-200" : "border-yellow-200"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {quotaInfo.usagePercentage >= 95 ? (
              <>
                <strong>할당량 거의 소진:</strong> 월간 할당량의 {quotaInfo.usagePercentage.toFixed(1)}%를 사용했습니다. 
                추가 메시지 발송을 위해 요금제 업그레이드를 고려하세요.
              </>
            ) : (
              <>
                <strong>할당량 주의:</strong> 월간 할당량의 {quotaInfo.usagePercentage.toFixed(1)}%를 사용했습니다.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quotaInfo ? (
        <div className="space-y-6">
          {/* Quota Overview */}
          <QuotaOverview quota={quotaInfo} />

          {/* Channel Usage */}
          <ChannelUsage channels={quotaInfo.channelLimits} />

          {/* Alert Settings */}
          <AlertSettings 
            alertSettings={quotaInfo.alertSettings}
            onUpdate={handleUpdateAlerts}
          />

          {/* Plan Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>요금제 비교</CardTitle>
              <CardDescription>
                현재 요금제와 다른 요금제를 비교해보세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(planFeatures).map(([planKey, plan]) => (
                  <div 
                    key={planKey}
                    className={`p-4 rounded-lg border-2 ${
                      quotaInfo.plan === planKey ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{plan.name}</h3>
                      {quotaInfo.plan === planKey && (
                        <Badge>현재 플랜</Badge>
                      )}
                    </div>
                    
                    <ul className="space-y-1 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {quotaInfo.plan !== planKey && (
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        업그레이드
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}