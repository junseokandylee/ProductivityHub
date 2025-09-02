'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Bot,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  Save,
  Eye,
  Settings,
  Zap
} from 'lucide-react';
import {
  useAutoReplyConfig,
  useUpdateAutoReplyConfig,
  useCreateAutoReplyRule,
  useUpdateAutoReplyRule,
  useDeleteAutoReplyRule,
} from '@/lib/hooks/use-inbox';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Validation schemas
const timeRangeSchema = z.object({
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  days: z.array(z.number().min(0).max(6)),
});

const autoReplyRuleSchema = z.object({
  name: z.string().min(1, '규칙 이름을 입력해주세요'),
  enabled: z.boolean(),
  channels: z.array(z.enum(['sms', 'kakao', 'email', 'push'])).min(1, '최소 하나의 채널을 선택해주세요'),
  conditions: z.object({
    keywords: z.array(z.string()).optional(),
    timeRange: timeRangeSchema.optional(),
    firstMessageOnly: z.boolean().optional(),
  }),
  response: z.object({
    content: z.string().min(1, '자동 답장 내용을 입력해주세요'),
    delay: z.number().min(0).optional(),
  }),
  priority: z.number().min(1).max(10),
});

const autoReplyConfigSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(autoReplyRuleSchema),
  fallbackMessage: z.string().optional(),
  maxRepliesPerConversation: z.number().min(1).max(10).optional(),
});

type AutoReplyConfigForm = z.infer<typeof autoReplyConfigSchema>;

const CHANNEL_OPTIONS = [
  { value: 'sms', label: 'SMS', icon: Phone },
  { value: 'kakao', label: '카카오톡', icon: MessageSquare },
  { value: 'email', label: '이메일', icon: Mail },
  { value: 'push', label: '푸시알림', icon: MessageSquare },
];

const DAYS_OF_WEEK = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
];

export default function AutoReplyConfigPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateRuleDialogOpen, setIsCreateRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const { data: config, isLoading, error, refetch } = useAutoReplyConfig();
  const updateConfigMutation = useUpdateAutoReplyConfig();
  const createRuleMutation = useCreateAutoReplyRule();
  const updateRuleMutation = useUpdateAutoReplyRule();
  const deleteRuleMutation = useDeleteAutoReplyRule();

  const form = useForm<AutoReplyConfigForm>({
    resolver: zodResolver(autoReplyConfigSchema),
    defaultValues: {
      enabled: false,
      rules: [],
      fallbackMessage: '',
      maxRepliesPerConversation: 3,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'rules',
  });

  // Update form when config loads
  React.useEffect(() => {
    if (config) {
      form.reset({
        enabled: config.enabled,
        rules: config.rules || [],
        fallbackMessage: config.fallbackMessage || '',
        maxRepliesPerConversation: config.maxRepliesPerConversation || 3,
      });
    }
  }, [config, form]);

  const onSubmit = async (data: AutoReplyConfigForm) => {
    try {
      await updateConfigMutation.mutateAsync({
        enabled: data.enabled,
        fallbackMessage: data.fallbackMessage,
        maxRepliesPerConversation: data.maxRepliesPerConversation,
      });
      
      toast({
        title: "설정 저장 완료",
        description: "자동답장 설정이 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "설정을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCreateRule = async (ruleData: any) => {
    try {
      await createRuleMutation.mutateAsync(ruleData);
      setIsCreateRuleDialogOpen(false);
      refetch();
      toast({
        title: "규칙 생성 완료",
        description: "새 자동답장 규칙이 생성되었습니다.",
      });
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "규칙을 생성하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('이 규칙을 삭제하시겠습니까?')) return;
    
    try {
      await deleteRuleMutation.mutateAsync(ruleId);
      refetch();
      toast({
        title: "규칙 삭제 완료",
        description: "자동답장 규칙이 삭제되었습니다.",
      });
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "규칙을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleToggleRule = async (rule: any, enabled: boolean) => {
    try {
      await updateRuleMutation.mutateAsync({
        id: rule.id,
        rule: { ...rule, enabled }
      });
      refetch();
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "규칙을 업데이트하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            자동답장 설정을 불러올 수 없습니다. 다시 시도해주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/inbox">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                인박스로 돌아가기
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">자동답장 설정</h1>
              <p className="text-gray-600 mt-1">
                조건에 따라 자동으로 메시지에 답장하는 규칙을 설정하세요
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsCreateRuleDialogOpen(true)}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              새 규칙 추가
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Global Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>전체 설정</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Auto-Reply */}
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-1">
                        <FormLabel>자동답장 활성화</FormLabel>
                        <FormDescription>
                          모든 자동답장 규칙을 전체적으로 활성화하거나 비활성화합니다
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Max Replies Per Conversation */}
                <FormField
                  control={form.control}
                  name="maxRepliesPerConversation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>대화당 최대 자동답장 횟수</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}회
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        한 대화에서 자동으로 답장할 수 있는 최대 횟수입니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fallback Message */}
                <FormField
                  control={form.control}
                  name="fallbackMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>기본 답장 메시지</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="어떤 규칙도 만족하지 않을 때 사용할 기본 메시지를 입력하세요 (선택사항)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        모든 규칙이 적용되지 않을 때 사용할 기본 메시지입니다 (선택사항)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Auto-Reply Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>자동답장 규칙</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateRuleDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    규칙 추가
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">규칙을 불러오는 중...</p>
                  </div>
                ) : config && config.rules && config.rules.length > 0 ? (
                  <div className="space-y-4">
                    {config.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-semibold">{rule.name}</h3>
                              <Badge variant={rule.enabled ? "default" : "secondary"}>
                                {rule.enabled ? '활성' : '비활성'}
                              </Badge>
                              <Badge variant="outline">
                                우선순위 {rule.priority}
                              </Badge>
                            </div>

                            {/* Channels */}
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm text-gray-600">채널:</span>
                              {rule.channels.map((channel) => {
                                const channelOption = CHANNEL_OPTIONS.find(opt => opt.value === channel);
                                const Icon = channelOption?.icon || MessageSquare;
                                return (
                                  <Badge key={channel} variant="outline" className="text-xs">
                                    <Icon className="h-3 w-3 mr-1" />
                                    {channelOption?.label || channel}
                                  </Badge>
                                );
                              })}
                            </div>

                            {/* Conditions */}
                            {(rule.conditions.keywords?.length || rule.conditions.timeRange || rule.conditions.firstMessageOnly) && (
                              <div className="text-sm text-gray-600 mb-2">
                                <span>조건: </span>
                                {rule.conditions.keywords?.length && (
                                  <span>키워드 "{rule.conditions.keywords.join(', ')}" 포함</span>
                                )}
                                {rule.conditions.timeRange && (
                                  <span>
                                    {rule.conditions.keywords?.length ? ', ' : ''}
                                    {rule.conditions.timeRange.startHour}:00-{rule.conditions.timeRange.endHour}:00
                                  </span>
                                )}
                                {rule.conditions.firstMessageOnly && (
                                  <span>
                                    {(rule.conditions.keywords?.length || rule.conditions.timeRange) ? ', ' : ''}
                                    첫 메시지만
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Response Preview */}
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-2">
                              <p className="text-sm">
                                <Zap className="h-4 w-4 inline mr-1" />
                                답장: "{rule.response.content}"
                                {rule.response.delay && ` (${rule.response.delay}초 후)`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(enabled) => handleToggleRule(rule, enabled)}
                              disabled={updateRuleMutation.isPending}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                              disabled={deleteRuleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      자동답장 규칙이 없습니다
                    </h3>
                    <p className="text-gray-500 mb-6">
                      첫 번째 자동답장 규칙을 만들어보세요
                    </p>
                    <Button onClick={() => setIsCreateRuleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      첫 번째 규칙 만들기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateConfigMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateConfigMutation.isPending ? '저장 중...' : '설정 저장'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Create Rule Dialog */}
        <RuleDialog
          open={isCreateRuleDialogOpen}
          onOpenChange={setIsCreateRuleDialogOpen}
          rule={null}
          onSave={handleCreateRule}
        />

        {/* Edit Rule Dialog */}
        <RuleDialog
          open={!!editingRule}
          onOpenChange={(open) => !open && setEditingRule(null)}
          rule={editingRule}
          onSave={(ruleData) => {
            if (editingRule) {
              updateRuleMutation.mutate({
                id: editingRule.id,
                rule: ruleData
              });
              setEditingRule(null);
            }
          }}
        />
      </div>
    </div>
  );
}

// Rule Dialog Component
function RuleDialog({ 
  open, 
  onOpenChange, 
  rule, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  rule: any; 
  onSave: (rule: any) => void; 
}) {
  const form = useForm({
    resolver: zodResolver(autoReplyRuleSchema),
    defaultValues: rule || {
      name: '',
      enabled: true,
      channels: ['sms'],
      conditions: {
        keywords: [],
        firstMessageOnly: false,
      },
      response: {
        content: '',
        delay: 0,
      },
      priority: 5,
    },
  });

  const onSubmit = (data: any) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {rule ? '규칙 수정' : '새 자동답장 규칙'}
          </DialogTitle>
          <DialogDescription>
            메시지에 자동으로 답장할 조건과 내용을 설정하세요.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>규칙 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 영업시간 외 안내" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="channels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>적용 채널</FormLabel>
                    <div className="space-y-2">
                      {CHANNEL_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <label key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.value.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, option.value]);
                                } else {
                                  field.onChange(field.value.filter((v: string) => v !== option.value));
                                }
                              }}
                            />
                            <Icon className="h-4 w-4" />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>우선순위</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num <= 3 ? '(높음)' : num >= 8 ? '(낮음)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="response.content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>자동답장 내용</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="안녕하세요! 현재 영업시간이 아닙니다. 내일 오전 9시 이후에 답변드리겠습니다."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit">
                {rule ? '수정' : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}