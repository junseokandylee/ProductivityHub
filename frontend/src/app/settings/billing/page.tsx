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
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  CreditCard,
  Download,
  AlertCircle,
  RefreshCw,
  Crown,
  Calendar,
  Users,
  MessageSquare,
  UserCheck,
  TrendingUp,
  Check,
  X,
  DollarSign,
  FileText,
  ExternalLink,
  Shield,
  Zap,
  Star
} from 'lucide-react'
import { 
  useBillingInfo, 
  useUpdatePaymentMethod, 
  useChangePlan,
  useCancelSubscription,
  useDownloadInvoice,
  type BillingInfo 
} from '@/lib/api/settings'

const paymentMethodSchema = z.object({
  token: z.string().min(1, '결제 수단을 선택해주세요')
})

const cancelSubscriptionSchema = z.object({
  reason: z.string().min(10, '취소 사유를 10자 이상 입력해주세요').max(500, '취소 사유는 500자를 초과할 수 없습니다')
})

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>
type CancelSubscriptionForm = z.infer<typeof cancelSubscriptionSchema>

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29000,
    period: 'month',
    description: '개인 및 소규모 팀을 위한 기본 플랜',
    features: [
      '사용자 5명까지',
      '캠페인 20개까지', 
      '연락처 5,000개까지',
      '메시지 10,000건/월',
      '기본 분석',
      '이메일 지원'
    ],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99000,
    period: 'month', 
    description: '성장하는 팀을 위한 전문가 플랜',
    features: [
      '사용자 25명까지',
      '캠페인 100개까지',
      '연락처 50,000개까지', 
      '메시지 100,000건/월',
      '고급 분석 및 리포트',
      '우선 지원',
      'API 접근',
      '커스텀 도메인'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299000,
    period: 'month',
    description: '대규모 조직을 위한 기업용 플랜',
    features: [
      '무제한 사용자',
      '무제한 캠페인',
      '무제한 연락처',
      '메시지 1,000,000건/월',
      '고급 분석 + 커스텀 리포트',
      '전용 계정 매니저',
      '화이트 라벨링',
      'SSO 통합',
      '우선 지원 + 전화 지원'
    ],
    popular: false
  }
]

export default function BillingSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  
  const { 
    data: billingInfo, 
    isLoading, 
    error,
    refetch 
  } = useBillingInfo()
  
  const updatePaymentMethod = useUpdatePaymentMethod()
  const changePlan = useChangePlan()
  const cancelSubscription = useCancelSubscription()
  const downloadInvoice = useDownloadInvoice()

  const paymentForm = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      token: ''
    }
  })

  const cancelForm = useForm<CancelSubscriptionForm>({
    resolver: zodResolver(cancelSubscriptionSchema),
    defaultValues: {
      reason: ''
    }
  })

  const handleChangePlan = async (planId: string) => {
    try {
      await changePlan.mutateAsync({ planId })
      toast({
        title: "플랜 변경 완료",
        description: `${plans.find(p => p.id === planId)?.name} 플랜으로 성공적으로 변경되었습니다.`,
      })
      setIsChangePlanDialogOpen(false)
      setSelectedPlan(null)
    } catch (error) {
      toast({
        title: "플랜 변경 실패",
        description: "플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePaymentMethod = async (data: PaymentMethodForm) => {
    try {
      await updatePaymentMethod.mutateAsync(data)
      toast({
        title: "결제 수단 업데이트 완료",
        description: "결제 수단이 성공적으로 업데이트되었습니다.",
      })
      setIsPaymentDialogOpen(false)
      paymentForm.reset()
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "결제 수단 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCancelSubscription = async (data: CancelSubscriptionForm) => {
    try {
      await cancelSubscription.mutateAsync({
        cancelAtPeriodEnd: true,
        reason: data.reason
      })
      toast({
        title: "구독 취소 요청 완료",
        description: "현재 결제 주기 종료 후 구독이 취소됩니다.",
      })
      setIsCancelDialogOpen(false)
      cancelForm.reset()
    } catch (error) {
      toast({
        title: "취소 요청 실패", 
        description: "구독 취소 요청 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await downloadInvoice.mutateAsync(invoiceId)
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: "인보이스 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const getUsagePercentage = (current: number, limit: number) => {
    return limit === 0 ? 0 : Math.min((current / limit) * 100, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'trial':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'suspended':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>결제 정보를 불러오는데 실패했습니다: {error.message}</span>
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
          <h1 className="text-3xl font-bold text-gray-900">결제 관리</h1>
          <p className="text-gray-600">
            구독, 결제 수단, 인보이스를 관리합니다
          </p>
        </div>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5" />
            <div>
              <CardTitle>현재 구독</CardTitle>
              <CardDescription>
                구독 플랜과 상태를 확인하세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-6 w-16 mx-auto mb-1" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          ) : billingInfo ? (
            <>
              {/* Subscription Info */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">
                      {plans.find(p => p.id === billingInfo.subscription.plan)?.name || billingInfo.subscription.plan.toUpperCase()} 플랜
                    </h3>
                    <Badge variant="outline" className={getStatusColor(billingInfo.subscription.status)}>
                      {billingInfo.subscription.status === 'active' ? '활성' :
                       billingInfo.subscription.status === 'trial' ? '체험' :
                       billingInfo.subscription.status === 'suspended' ? '일시정지' :
                       billingInfo.subscription.status === 'cancelled' ? '취소됨' : billingInfo.subscription.status}
                    </Badge>
                  </div>
                  <p className="text-gray-600">
                    {billingInfo.subscription.status === 'trial' && billingInfo.subscription.trialEnd ? (
                      <>체험 기간: {new Date(billingInfo.subscription.trialEnd).toLocaleDateString('ko-KR')}까지</>
                    ) : (
                      <>다음 결제일: {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}</>
                    )}
                  </p>
                  {billingInfo.subscription.cancelAtPeriodEnd && (
                    <p className="text-orange-600 text-sm mt-1">
                      이 구독은 {new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString('ko-KR')}에 취소됩니다.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Dialog open={isChangePlanDialogOpen} onOpenChange={setIsChangePlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">플랜 변경</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>플랜 변경</DialogTitle>
                        <DialogDescription>
                          필요에 맞는 플랜을 선택하세요
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`relative border rounded-lg p-6 cursor-pointer transition-all hover:shadow-md ${
                              selectedPlan === plan.id ? 'border-blue-500 ring-2 ring-blue-200' : 
                              plan.id === billingInfo.subscription.plan ? 'border-green-500' : 'border-gray-200'
                            } ${plan.popular ? 'ring-2 ring-blue-100' : ''}`}
                            onClick={() => setSelectedPlan(plan.id)}
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <Badge className="bg-blue-600">인기</Badge>
                              </div>
                            )}
                            
                            {plan.id === billingInfo.subscription.plan && (
                              <div className="absolute top-3 right-3">
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                  현재 플랜
                                </Badge>
                              </div>
                            )}

                            <div className="text-center mb-6">
                              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                              <div className="mb-2">
                                <span className="text-3xl font-bold">₩{plan.price.toLocaleString()}</span>
                                <span className="text-gray-600">/{plan.period === 'month' ? '월' : '연'}</span>
                              </div>
                              <p className="text-sm text-gray-600">{plan.description}</p>
                            </div>

                            <ul className="space-y-2 mb-6">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsChangePlanDialogOpen(false)}>
                          취소
                        </Button>
                        <Button
                          onClick={() => selectedPlan && handleChangePlan(selectedPlan)}
                          disabled={!selectedPlan || selectedPlan === billingInfo.subscription.plan || changePlan.isPending}
                        >
                          {changePlan.isPending ? '변경 중...' : '플랜 변경'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {!billingInfo.subscription.cancelAtPeriodEnd && (
                    <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-red-600 hover:text-red-700">
                          구독 취소
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>구독 취소</DialogTitle>
                          <DialogDescription>
                            정말로 구독을 취소하시겠습니까? 현재 결제 주기가 끝날 때까지 서비스를 이용할 수 있습니다.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={cancelForm.handleSubmit(handleCancelSubscription)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reason">취소 사유를 알려주세요</Label>
                            <textarea
                              id="reason"
                              {...cancelForm.register('reason')}
                              placeholder="구독을 취소하는 이유를 자세히 알려주세요..."
                              className="w-full p-3 border rounded-md resize-none h-32"
                            />
                            {cancelForm.formState.errors.reason && (
                              <p className="text-sm text-red-600">
                                {cancelForm.formState.errors.reason.message}
                              </p>
                            )}
                          </div>

                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => {
                                setIsCancelDialogOpen(false)
                                cancelForm.reset()
                              }}
                            >
                              취소
                            </Button>
                            <Button
                              type="submit"
                              variant="destructive"
                              disabled={cancelSubscription.isPending}
                            >
                              {cancelSubscription.isPending ? '처리 중...' : '구독 취소'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {billingInfo.usage.users.current.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" />
                      / {billingInfo.usage.users.limit === -1 ? '무제한' : billingInfo.usage.users.limit.toLocaleString()}
                    </div>
                  </div>
                  {billingInfo.usage.users.limit !== -1 && (
                    <Progress 
                      value={getUsagePercentage(billingInfo.usage.users.current, billingInfo.usage.users.limit)} 
                      className="h-2"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">사용자</p>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {billingInfo.usage.campaigns.current.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      / {billingInfo.usage.campaigns.limit === -1 ? '무제한' : billingInfo.usage.campaigns.limit.toLocaleString()}
                    </div>
                  </div>
                  {billingInfo.usage.campaigns.limit !== -1 && (
                    <Progress 
                      value={getUsagePercentage(billingInfo.usage.campaigns.current, billingInfo.usage.campaigns.limit)} 
                      className="h-2"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">캠페인</p>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {billingInfo.usage.contacts.current.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      / {billingInfo.usage.contacts.limit === -1 ? '무제한' : billingInfo.usage.contacts.limit.toLocaleString()}
                    </div>
                  </div>
                  {billingInfo.usage.contacts.limit !== -1 && (
                    <Progress 
                      value={getUsagePercentage(billingInfo.usage.contacts.current, billingInfo.usage.contacts.limit)} 
                      className="h-2"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">연락처</p>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {billingInfo.usage.messages.current.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      / {billingInfo.usage.messages.limit === -1 ? '무제한' : billingInfo.usage.messages.limit.toLocaleString()}
                    </div>
                  </div>
                  {billingInfo.usage.messages.limit !== -1 && (
                    <Progress 
                      value={getUsagePercentage(billingInfo.usage.messages.current, billingInfo.usage.messages.limit)} 
                      className="h-2"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">메시지 (이번 달)</p>
                </div>
              </div>

              {/* Upcoming Invoice */}
              {billingInfo.upcomingInvoice && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">다음 결제 예정</h4>
                      <p className="text-sm text-blue-700">
                        {new Date(billingInfo.upcomingInvoice.date).toLocaleDateString('ko-KR')} - 
                        ₩{billingInfo.upcomingInvoice.amount.toLocaleString()}
                      </p>
                    </div>
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" />
            <div>
              <CardTitle>결제 수단</CardTitle>
              <CardDescription>
                등록된 결제 수단을 관리합니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-6 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ) : billingInfo?.paymentMethod ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs font-medium">
                  {billingInfo.paymentMethod.brand.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">**** **** **** {billingInfo.paymentMethod.last4}</p>
                  <p className="text-sm text-gray-600">
                    만료일: {billingInfo.paymentMethod.expiryMonth.toString().padStart(2, '0')}/{billingInfo.paymentMethod.expiryYear}
                  </p>
                </div>
              </div>
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">변경</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>결제 수단 변경</DialogTitle>
                    <DialogDescription>
                      새로운 결제 수단을 등록하세요
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={paymentForm.handleSubmit(handleUpdatePaymentMethod)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>결제 수단</Label>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">
                          실제 구현에서는 Stripe, 이니시스 등의 결제 위젯이 표시됩니다.
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full"
                          onClick={() => paymentForm.setValue('token', 'mock_payment_token_' + Date.now())}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          신용카드/체크카드 등록
                        </Button>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsPaymentDialogOpen(false)
                          paymentForm.reset()
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={updatePaymentMethod.isPending || !paymentForm.watch('token')}
                      >
                        {updatePaymentMethod.isPending ? '등록 중...' : '등록'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">결제 수단이 등록되지 않았습니다</h3>
              <p className="text-gray-600 mb-4">
                구독을 계속 이용하려면 결제 수단을 등록해주세요
              </p>
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>결제 수단 등록</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>결제 수단 등록</DialogTitle>
                    <DialogDescription>
                      결제 수단을 등록하여 구독을 활성화하세요
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={paymentForm.handleSubmit(handleUpdatePaymentMethod)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>결제 수단</Label>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">
                          실제 구현에서는 Stripe, 이니시스 등의 결제 위젯이 표시됩니다.
                        </p>
                        <Button 
                          type="button"
                          variant="outline" 
                          className="w-full"
                          onClick={() => paymentForm.setValue('token', 'mock_payment_token_' + Date.now())}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          신용카드/체크카드 등록
                        </Button>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsPaymentDialogOpen(false)
                          paymentForm.reset()
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={updatePaymentMethod.isPending || !paymentForm.watch('token')}
                      >
                        {updatePaymentMethod.isPending ? '등록 중...' : '등록'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle>결제 내역</CardTitle>
              <CardDescription>
                과거 결제 내역과 인보이스를 확인하세요
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-6 h-6 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
            <div className="space-y-3">
              {billingInfo.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        인보이스 #{invoice.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.date).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">₩{invoice.amount.toLocaleString()}</p>
                      <Badge 
                        variant="outline" 
                        className={getInvoiceStatusColor(invoice.status)}
                      >
                        {invoice.status === 'paid' ? '결제완료' :
                         invoice.status === 'pending' ? '결제대기' :
                         invoice.status === 'failed' ? '결제실패' : invoice.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      disabled={downloadInvoice.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">결제 내역이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}