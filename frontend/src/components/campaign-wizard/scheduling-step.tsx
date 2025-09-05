'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Calendar, 
  Repeat, 
  Zap, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Settings
} from 'lucide-react';
import {
  ScheduleType,
  RecurrencePattern,
  AutomationTrigger,
  SchedulingFormData,
  SCHEDULE_TYPE_LABELS,
  RECURRENCE_PATTERN_LABELS,
  AUTOMATION_TRIGGER_LABELS,
  DAYS_OF_WEEK_LABELS,
  COMMON_TIMEZONES,
  DEFAULT_SCHEDULING_SETTINGS
} from '@/lib/types/campaign-schedule';

interface SchedulingStepProps {
  scheduling: SchedulingFormData;
  onChange: (scheduling: Partial<SchedulingFormData>) => void;
  errors?: string[];
  onNext: () => void;
  onPrevious: () => void;
}

export function SchedulingStep({ 
  scheduling, 
  onChange, 
  errors = [], 
  onNext, 
  onPrevious 
}: SchedulingStepProps) {
  const handleScheduleTypeChange = (scheduleType: ScheduleType) => {
    onChange({
      scheduleType,
      // Reset related fields when changing schedule type
      scheduledDate: undefined,
      scheduledTime: undefined,
      isRecurring: scheduleType === ScheduleType.Recurring,
      useAutomation: scheduleType === ScheduleType.Triggered
    });
  };

  const handleRecurrenceChange = (field: keyof SchedulingFormData, value: any) => {
    onChange({ [field]: value });
  };

  const handleDayOfWeekToggle = (dayIndex: number) => {
    const updatedDays = scheduling.selectedDaysOfWeek.includes(dayIndex)
      ? scheduling.selectedDaysOfWeek.filter(d => d !== dayIndex)
      : [...scheduling.selectedDaysOfWeek, dayIndex].sort();
    
    onChange({ selectedDaysOfWeek: updatedDays });
  };

  const formatNextExecution = () => {
    if (scheduling.scheduleType === ScheduleType.Immediate) {
      return '즉시 실행';
    }
    
    if (scheduling.scheduleType === ScheduleType.OneTime && scheduling.scheduledDate && scheduling.scheduledTime) {
      const scheduledDateTime = new Date(scheduling.scheduledDate);
      const [hours, minutes] = scheduling.scheduledTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
      
      return scheduledDateTime.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    }

    if (scheduling.scheduleType === ScheduleType.Recurring) {
      const pattern = RECURRENCE_PATTERN_LABELS[scheduling.recurrencePattern];
      const interval = scheduling.recurrenceInterval;
      
      let description = `${interval === 1 ? pattern : `${interval} ${pattern}마다`}`;
      
      if (scheduling.recurrencePattern === RecurrencePattern.Weekly && scheduling.selectedDaysOfWeek.length > 0) {
        const dayNames = scheduling.selectedDaysOfWeek.map(d => DAYS_OF_WEEK_LABELS[d]).join(', ');
        description += ` (${dayNames})`;
      }

      if (scheduling.recurrenceEndType === 'date' && scheduling.recurrenceEndDate) {
        description += ` - ${scheduling.recurrenceEndDate.toLocaleDateString('ko-KR')}까지`;
      } else if (scheduling.recurrenceEndType === 'occurrences') {
        description += ` - ${scheduling.maxOccurrences}회 실행`;
      }

      return description;
    }

    if (scheduling.scheduleType === ScheduleType.Triggered) {
      const trigger = AUTOMATION_TRIGGER_LABELS[scheduling.automationTrigger];
      const delay = scheduling.triggerDelay > 0 ? ` (${scheduling.triggerDelay}분 후)` : '';
      return `${trigger}${delay}`;
    }

    return '설정되지 않음';
  };

  const isValid = () => {
    if (scheduling.scheduleType === ScheduleType.OneTime) {
      return scheduling.scheduledDate && scheduling.scheduledTime;
    }
    
    if (scheduling.scheduleType === ScheduleType.Recurring) {
      if (scheduling.recurrencePattern === RecurrencePattern.Weekly) {
        return scheduling.selectedDaysOfWeek.length > 0;
      }
      return true;
    }

    if (scheduling.scheduleType === ScheduleType.Triggered) {
      return scheduling.automationTrigger !== AutomationTrigger.None;
    }

    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">캠페인 스케줄링</h2>
        <p className="text-gray-600">캠페인을 언제, 어떻게 발송할지 설정하세요</p>
      </div>

      {/* Schedule Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            발송 방식 선택
          </CardTitle>
          <CardDescription>
            캠페인을 어떻게 발송할지 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={scheduling.scheduleType.toString()}
            onValueChange={(value) => handleScheduleTypeChange(parseInt(value) as ScheduleType)}
            className="space-y-3"
          >
            {Object.entries(SCHEDULE_TYPE_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                <RadioGroupItem value={type} id={`schedule-${type}`} />
                <div className="flex-1">
                  <Label htmlFor={`schedule-${type}`} className="font-medium cursor-pointer">
                    {label}
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    {type === '0' && '캠페인을 즉시 발송합니다'}
                    {type === '1' && '원하는 날짜와 시간에 한 번 발송합니다'}
                    {type === '2' && '정기적으로 반복 발송합니다'}
                    {type === '3' && '특정 조건이 만족될 때 자동 발송합니다'}
                  </p>
                </div>
                {scheduling.scheduleType === parseInt(type) && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* One-time Schedule Settings */}
      {scheduling.scheduleType === ScheduleType.OneTime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              예약 발송 설정
            </CardTitle>
            <CardDescription>
              캠페인을 발송할 정확한 날짜와 시간을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">발송 날짜</Label>
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduling.scheduledDate ? scheduling.scheduledDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => onChange({ scheduledDate: new Date(e.target.value) })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheduled-time">발송 시간</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduling.scheduledTime || ''}
                  onChange={(e) => onChange({ scheduledTime: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">시간대</Label>
              <Select value={scheduling.timezone} onValueChange={(value) => onChange({ timezone: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="시간대를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Schedule Settings */}
      {scheduling.scheduleType === ScheduleType.Recurring && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              반복 발송 설정
            </CardTitle>
            <CardDescription>
              캠페인을 반복할 패턴을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recurrence Pattern */}
            <div className="space-y-2">
              <Label>반복 패턴</Label>
              <Select 
                value={scheduling.recurrencePattern.toString()} 
                onValueChange={(value) => handleRecurrenceChange('recurrencePattern', parseInt(value) as RecurrencePattern)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_PATTERN_LABELS).map(([pattern, label]) => (
                    <SelectItem key={pattern} value={pattern}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <Label htmlFor="recurrence-interval">반복 간격</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="recurrence-interval"
                  type="number"
                  min="1"
                  max="365"
                  value={scheduling.recurrenceInterval}
                  onChange={(e) => handleRecurrenceChange('recurrenceInterval', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">
                  {RECURRENCE_PATTERN_LABELS[scheduling.recurrencePattern]}마다
                </span>
              </div>
            </div>

            {/* Days of Week for Weekly Pattern */}
            {scheduling.recurrencePattern === RecurrencePattern.Weekly && (
              <div className="space-y-2">
                <Label>요일 선택</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK_LABELS.map((day, index) => (
                    <div key={index} className="flex items-center">
                      <Checkbox
                        id={`day-${index}`}
                        checked={scheduling.selectedDaysOfWeek.includes(index)}
                        onCheckedChange={() => handleDayOfWeekToggle(index)}
                      />
                      <Label htmlFor={`day-${index}`} className="ml-2 text-sm">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day of Month for Monthly Pattern */}
            {scheduling.recurrencePattern === RecurrencePattern.Monthly && (
              <div className="space-y-2">
                <Label htmlFor="day-of-month">매월 발송일</Label>
                <Input
                  id="day-of-month"
                  type="number"
                  min="1"
                  max="31"
                  value={scheduling.dayOfMonth}
                  onChange={(e) => handleRecurrenceChange('dayOfMonth', parseInt(e.target.value))}
                  className="w-20"
                />
                <p className="text-sm text-gray-500">
                  매월 {scheduling.dayOfMonth}일에 발송 (해당 날짜가 없는 월의 경우 마지막 날)
                </p>
              </div>
            )}

            {/* Recurrence End Options */}
            <div className="space-y-3">
              <Label>반복 종료 조건</Label>
              <RadioGroup
                value={scheduling.recurrenceEndType}
                onValueChange={(value: 'never' | 'date' | 'occurrences') => 
                  handleRecurrenceChange('recurrenceEndType', value)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="never" id="end-never" />
                  <Label htmlFor="end-never">계속 반복</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="end-date" />
                  <Label htmlFor="end-date">종료 날짜까지</Label>
                  {scheduling.recurrenceEndType === 'date' && (
                    <Input
                      type="date"
                      value={scheduling.recurrenceEndDate ? scheduling.recurrenceEndDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleRecurrenceChange('recurrenceEndDate', new Date(e.target.value))}
                      className="ml-2"
                    />
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="occurrences" id="end-occurrences" />
                  <Label htmlFor="end-occurrences">실행 횟수 제한</Label>
                  {scheduling.recurrenceEndType === 'occurrences' && (
                    <div className="flex items-center gap-2 ml-2">
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={scheduling.maxOccurrences}
                        onChange={(e) => handleRecurrenceChange('maxOccurrences', parseInt(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">회</span>
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation/Trigger Settings */}
      {scheduling.scheduleType === ScheduleType.Triggered && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              자동화 설정
            </CardTitle>
            <CardDescription>
              캠페인을 자동으로 발송할 조건을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>트리거 이벤트</Label>
              <Select 
                value={scheduling.automationTrigger.toString()} 
                onValueChange={(value) => handleRecurrenceChange('automationTrigger', parseInt(value) as AutomationTrigger)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="트리거를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUTOMATION_TRIGGER_LABELS)
                    .filter(([trigger]) => trigger !== '0') // Exclude None
                    .map(([trigger, label]) => (
                    <SelectItem key={trigger} value={trigger}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trigger Delay */}
            <div className="space-y-2">
              <Label htmlFor="trigger-delay">발송 지연 시간</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="trigger-delay"
                  type="number"
                  min="0"
                  max="43200" // 30 days in minutes
                  value={scheduling.triggerDelay}
                  onChange={(e) => handleRecurrenceChange('triggerDelay', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">분 후에 발송</span>
              </div>
              <p className="text-sm text-gray-500">
                트리거 이벤트가 발생한 후 실제 발송까지의 대기 시간
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            추가 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="priority">우선순위 (1-10)</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              max="10"
              value={scheduling.priority}
              onChange={(e) => onChange({ priority: parseInt(e.target.value) })}
              className="w-20"
            />
            <p className="text-sm text-gray-500">
              높은 숫자일수록 우선순위가 높습니다 (기본값: 5)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              placeholder="스케줄에 대한 메모를 입력하세요"
              value={scheduling.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Preview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Info className="h-5 w-5" />
            스케줄 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">발송 방식:</span>
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                {SCHEDULE_TYPE_LABELS[scheduling.scheduleType]}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">다음 실행:</span>
              <span className="text-blue-800">{formatNextExecution()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-900">우선순위:</span>
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                {scheduling.priority}/10
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 mb-2">스케줄 설정을 확인해주세요</h4>
                <ul className="space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-800">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="w-32"
        >
          이전
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext} 
          disabled={!isValid()}
          className="w-32"
        >
          다음
        </Button>
      </div>
    </div>
  );
}