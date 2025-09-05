// Campaign Scheduling Types

export enum ScheduleType {
  Immediate = 0,
  OneTime = 1,
  Recurring = 2,
  Triggered = 3
}

export enum RecurrencePattern {
  Daily = 1,
  Weekly = 2,
  Monthly = 3,
  Yearly = 4,
  Custom = 5
}

export enum AutomationTrigger {
  None = 0,
  ContactAdded = 1,
  ContactUpdated = 2,
  ContactTagged = 3,
  ContactBirthday = 4,
  ContactAnniversary = 5,
  CampaignCompleted = 6,
  DateBased = 7,
  CustomEvent = 8
}

export enum ExecutionStatus {
  Scheduled = 0,
  Running = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4,
  Skipped = 5,
  Retrying = 6
}

export interface SchedulingSettings {
  scheduleType: ScheduleType;
  scheduledAt?: Date;
  timezone: string;

  // Recurring schedule properties
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceDaysOfWeek?: number[]; // [0-6] for Sun-Sat
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: Date;
  maxOccurrences?: number;

  // Automation properties
  automationTrigger?: AutomationTrigger;
  triggerConditions?: Record<string, any>;
  triggerDelayMinutes: number;

  priority: number;
  notes?: string;
}

export interface CreateCampaignScheduleRequest {
  campaignId: string;
  scheduleType: ScheduleType;
  scheduledAt?: string; // ISO string
  timezone: string;

  // Recurring schedule properties
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string; // ISO string
  maxOccurrences?: number;

  // Automation properties
  automationTrigger?: AutomationTrigger;
  triggerConditions?: Record<string, any>;
  triggerDelayMinutes: number;

  priority: number;
  notes?: string;
}

export interface UpdateCampaignScheduleRequest {
  scheduleType: ScheduleType;
  scheduledAt?: string; // ISO string
  timezone: string;

  // Recurring schedule properties
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string; // ISO string
  maxOccurrences?: number;

  // Automation properties
  automationTrigger?: AutomationTrigger;
  triggerConditions?: Record<string, any>;
  triggerDelayMinutes: number;

  priority: number;
  notes?: string;
}

export interface CampaignScheduleResponse {
  id: string;
  campaignId: string;
  campaignName: string;
  scheduleType: ScheduleType;
  scheduledAt?: string; // ISO string
  timezone: string;

  // Recurring schedule properties
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string; // ISO string
  maxOccurrences?: number;
  occurrenceCount: number;

  // Automation properties
  automationTrigger?: AutomationTrigger;
  triggerConditions?: Record<string, any>;
  triggerDelayMinutes: number;

  // Status properties
  isActive: boolean;
  nextExecution?: string; // ISO string
  lastExecution?: string; // ISO string
  executionCount: number;
  priority: number;
  notes?: string;

  // Audit properties
  createdAt: string; // ISO string
  createdBy: string;
  createdByName: string;
  updatedAt: string; // ISO string
  updatedBy?: string;
  updatedByName?: string;

  // Related executions summary
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  lastExecutionDate?: string; // ISO string
  lastExecutionStatus?: ExecutionStatus;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  messageTitleTemplate?: string;
  messageBodyTemplate: string;
  templateVariables?: Record<string, string>;
  defaultChannels?: string[];
  defaultPriority: number;
  category?: string;
  tags?: string[];
  isPublic: boolean;
  usageCount: number;
  lastUsed?: string; // ISO string
  isActive: boolean;
  createdAt: string; // ISO string
  createdBy: string;
  createdByName: string;
  updatedAt: string; // ISO string
  updatedBy?: string;
  updatedByName?: string;
}

export interface UpcomingExecutionItem {
  scheduleId: string;
  campaignId: string;
  campaignName: string;
  scheduledExecution: string; // ISO string
  scheduleType: ScheduleType;
  isRecurring: boolean;
  timezone: string;
  priority: number;
}

// Frontend-specific types for the scheduling UI
export interface SchedulingFormData {
  scheduleType: ScheduleType;
  scheduledDate?: Date;
  scheduledTime?: string; // HH:MM format
  timezone: string;

  // Recurring options
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  selectedDaysOfWeek: number[];
  dayOfMonth: number;
  recurrenceEndType: 'never' | 'date' | 'occurrences';
  recurrenceEndDate?: Date;
  maxOccurrences: number;

  // Automation options
  useAutomation: boolean;
  automationTrigger: AutomationTrigger;
  triggerDelay: number; // in minutes
  triggerConditions: Record<string, any>;

  priority: number;
  notes: string;
}

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingFormData = {
  scheduleType: ScheduleType.Immediate,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  isRecurring: false,
  recurrencePattern: RecurrencePattern.Daily,
  recurrenceInterval: 1,
  selectedDaysOfWeek: [],
  dayOfMonth: 1,
  recurrenceEndType: 'never',
  maxOccurrences: 10,
  useAutomation: false,
  automationTrigger: AutomationTrigger.None,
  triggerDelay: 0,
  triggerConditions: {},
  priority: 5,
  notes: ''
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  [ScheduleType.Immediate]: '즉시 발송',
  [ScheduleType.OneTime]: '예약 발송',
  [ScheduleType.Recurring]: '반복 발송',
  [ScheduleType.Triggered]: '자동화 발송'
};

export const RECURRENCE_PATTERN_LABELS: Record<RecurrencePattern, string> = {
  [RecurrencePattern.Daily]: '매일',
  [RecurrencePattern.Weekly]: '매주',
  [RecurrencePattern.Monthly]: '매월',
  [RecurrencePattern.Yearly]: '매년',
  [RecurrencePattern.Custom]: '사용자 정의'
};

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  [AutomationTrigger.None]: '없음',
  [AutomationTrigger.ContactAdded]: '연락처 추가 시',
  [AutomationTrigger.ContactUpdated]: '연락처 수정 시',
  [AutomationTrigger.ContactTagged]: '태그 지정 시',
  [AutomationTrigger.ContactBirthday]: '생일',
  [AutomationTrigger.ContactAnniversary]: '기념일',
  [AutomationTrigger.CampaignCompleted]: '캠페인 완료 후',
  [AutomationTrigger.DateBased]: '날짜 기반',
  [AutomationTrigger.CustomEvent]: '사용자 정의 이벤트'
};

export const DAYS_OF_WEEK_LABELS = [
  '일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'
];

export const COMMON_TIMEZONES = [
  { value: 'Asia/Seoul', label: '한국 표준시 (KST)' },
  { value: 'UTC', label: '협정 세계시 (UTC)' },
  { value: 'America/New_York', label: '미국 동부시간 (EST/EDT)' },
  { value: 'America/Los_Angeles', label: '미국 서부시간 (PST/PDT)' },
  { value: 'Europe/London', label: '영국 표준시 (GMT/BST)' },
  { value: 'Asia/Tokyo', label: '일본 표준시 (JST)' },
  { value: 'Asia/Shanghai', label: '중국 표준시 (CST)' }
];