'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  CalendarIcon, 
  PlayIcon, 
  PauseIcon, 
  TrashIcon, 
  EyeIcon,
  PencilIcon,
  ClockIcon,
  RepeatIcon,
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CampaignScheduleResponse, ExecutionStatus, ScheduleType, SCHEDULE_TYPE_LABELS, AUTOMATION_TRIGGER_LABELS } from '@/lib/types/campaign-schedule';
import { getAllSchedules, toggleScheduleStatus, deleteSchedule } from '@/lib/api/campaign-schedules';

interface ScheduledCampaignsPageProps {}

function getStatusIcon(schedule: CampaignScheduleResponse) {
  if (!schedule.isActive) return <PauseIcon className="h-5 w-5 text-gray-400" />;
  if (schedule.failedExecutions > 0) return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
  if (schedule.executionCount > 0) return <PlayIcon className="h-5 w-5 text-green-500" />;
  return <ClockIcon className="h-5 w-5 text-blue-500" />;
}

function getStatusText(schedule: CampaignScheduleResponse) {
  if (!schedule.isActive) return '일시정지';
  if (schedule.failedExecutions > 0) return '실패';
  if (schedule.executionCount > 0) return '실행중';
  return '예약됨';
}

function getStatusColor(schedule: CampaignScheduleResponse) {
  if (!schedule.isActive) return 'text-gray-600 bg-gray-100';
  if (schedule.failedExecutions > 0) return 'text-red-600 bg-red-100';
  if (schedule.executionCount > 0) return 'text-green-600 bg-green-100';
  return 'text-blue-600 bg-blue-100';
}

function ScheduledCampaignCard({ schedule }: { schedule: CampaignScheduleResponse }) {
  const queryClient = useQueryClient();
  
  const toggleStatusMutation = useMutation({
    mutationFn: (isActive: boolean) => toggleScheduleStatus(schedule.id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSchedule(schedule.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-campaigns'] });
    }
  });

  const nextExecution = schedule.nextExecution ? parseISO(schedule.nextExecution) : null;
  const isUpcoming = nextExecution && nextExecution > new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(schedule)}
            <h3 className="text-lg font-medium text-gray-900">{schedule.campaignName}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(schedule)}`}>
              {getStatusText(schedule)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{SCHEDULE_TYPE_LABELS[schedule.scheduleType]}</span>
            </div>
            
            {schedule.isRecurring && (
              <div className="flex items-center gap-2">
                <RepeatIcon className="h-4 w-4" />
                <span>반복 일정</span>
              </div>
            )}
            
            {schedule.automationTrigger && schedule.automationTrigger !== 0 && (
              <div className="flex items-center gap-2">
                <BellIcon className="h-4 w-4" />
                <span>{AUTOMATION_TRIGGER_LABELS[schedule.automationTrigger]}</span>
              </div>
            )}

            <div>
              <span className="font-medium">우선순위:</span> {schedule.priority}/10
            </div>
          </div>

          {nextExecution && (
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">다음 실행 예정</div>
              <div className={`text-sm font-medium ${isUpcoming ? 'text-green-600' : 'text-red-600'}`}>
                {format(nextExecution, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })} ({schedule.timezone})
              </div>
            </div>
          )}

          {schedule.notes && (
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-1">메모</div>
              <div className="text-sm text-gray-800">{schedule.notes}</div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>총 실행: {schedule.totalExecutions}회</span>
            <span>성공: {schedule.completedExecutions}회</span>
            {schedule.failedExecutions > 0 && (
              <span className="text-red-500">실패: {schedule.failedExecutions}회</span>
            )}
            <span>생성일: {format(parseISO(schedule.createdAt), 'yyyy.MM.dd', { locale: ko })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => toggleStatusMutation.mutate(!schedule.isActive)}
            disabled={toggleStatusMutation.isPending}
            className={`p-2 rounded-lg border transition-colors ${
              schedule.isActive 
                ? 'border-orange-200 text-orange-600 hover:bg-orange-50' 
                : 'border-green-200 text-green-600 hover:bg-green-50'
            }`}
            title={schedule.isActive ? '일시정지' : '활성화'}
          >
            {schedule.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </button>

          <button
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title="수정"
          >
            <PencilIcon className="h-4 w-4" />
          </button>

          <button
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            title="상세보기"
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              if (confirm('이 일정을 삭제하시겠습니까?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title="삭제"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledCampaignsPage({}: ScheduledCampaignsPageProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'upcoming'>('all');

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['scheduled-campaigns'],
    queryFn: getAllSchedules,
  });

  const filteredSchedules = schedules.filter(schedule => {
    switch (filter) {
      case 'active':
        return schedule.isActive && schedule.executionCount === 0;
      case 'paused':
        return !schedule.isActive;
      case 'upcoming':
        return schedule.isActive && schedule.nextExecution && parseISO(schedule.nextExecution) > new Date();
      default:
        return true;
    }
  });

  const stats = {
    total: schedules.length,
    active: schedules.filter(s => s.isActive && s.executionCount === 0).length,
    paused: schedules.filter(s => !s.isActive).length,
    upcoming: schedules.filter(s => s.isActive && s.nextExecution && parseISO(s.nextExecution) > new Date()).length,
    failed: schedules.filter(s => s.failedExecutions > 0).length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <div className="flex items-center gap-3 text-red-600">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <h3 className="text-lg font-medium">데이터 로딩 오류</h3>
            </div>
            <p className="text-red-600 mt-2">예약된 캠페인 목록을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">예약된 캠페인</h1>
          <p className="text-gray-600">예약된 캠페인의 실행 일정을 관리하고 모니터링하세요.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">전체 일정</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-sm text-gray-600">활성 일정</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
            <div className="text-sm text-gray-600">예정된 일정</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.paused}</div>
            <div className="text-sm text-gray-600">일시정지</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">실행 실패</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium text-gray-700">필터:</span>
          {[
            { key: 'all', label: '전체' },
            { key: 'active', label: '활성' },
            { key: 'upcoming', label: '예정' },
            { key: 'paused', label: '일시정지' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Campaign List */}
        <div className="space-y-4">
          {filteredSchedules.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? '예약된 캠페인이 없습니다' : `${filter} 캠페인이 없습니다`}
              </h3>
              <p className="text-gray-600 mb-4">새 캠페인을 생성하여 일정을 예약해보세요.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                새 캠페인 만들기
              </button>
            </div>
          ) : (
            filteredSchedules.map(schedule => (
              <ScheduledCampaignCard key={schedule.id} schedule={schedule} />
            ))
          )}
        </div>

        {/* Info Banner */}
        {schedules.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <div className="font-medium mb-1">일정 관리 안내</div>
                <ul className="space-y-1 text-blue-600">
                  <li>• 예약된 캠페인은 설정된 시간에 자동으로 실행됩니다.</li>
                  <li>• 일시정지된 캠페인은 다시 활성화할 때까지 실행되지 않습니다.</li>
                  <li>• 반복 일정의 경우 다음 실행 시간이 자동으로 계산됩니다.</li>
                  <li>• 실행 실패 시 자동 재시도가 3회까지 진행됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}