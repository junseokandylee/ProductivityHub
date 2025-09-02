// Campaign Metrics Types and Interfaces
// Matches the backend API response from T-019

export interface CampaignMetricsTotals {
  sent: number;
  delivered: number;
  failed: number;
  open: number;
  click: number;
}

export interface CampaignMetricsRates {
  delivered: number; // delivered_total / sent_total
  failure: number;   // failed_total / sent_total
  open: number;      // open_total / sent_total
  click: number;     // click_total / sent_total
}

export interface ChannelMetrics {
  sent: number;
  delivered: number;
  failed: number;
}

export interface CampaignMetricsChannels {
  sms: ChannelMetrics;
  kakao: ChannelMetrics;
}

export interface TimeSeriesPoint {
  t: string; // ISO timestamp
  attempted: number;
  delivered: number;
  failed: number;
  open: number;
  click: number;
}

export interface CampaignMetricsAlert {
  triggered: boolean;
  failureRate: number;
  threshold: number;
  lastEvaluatedAt: string; // ISO timestamp
  lastTriggeredAt?: string; // ISO timestamp
  windowSeconds: number;
}

export interface CampaignMetricsResponse {
  totals: CampaignMetricsTotals;
  rates: CampaignMetricsRates;
  channels: CampaignMetricsChannels;
  timeseries: TimeSeriesPoint[] | null;
  updatedAt: string; // ISO timestamp
  alert?: CampaignMetricsAlert;
}

// UI-specific types

export type ChannelFilter = 'all' | 'sms' | 'kakao';
export type TimeWindow = 60 | 360 | 1440; // 1h, 6h, 24h in minutes

export interface MetricsFilters {
  channel: ChannelFilter;
  windowMinutes: TimeWindow;
  includeTimeseries: boolean;
}

export interface KpiData {
  label: string;
  value: number | string;
  rate?: number;
  delta?: number;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  format?: 'number' | 'percentage' | 'currency';
  tooltip?: string;
}

// Chart.js compatible data structure
export interface ChartDataPoint {
  x: string | Date;
  y: number;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  borderColor: string;
  backgroundColor: string;
  fill?: boolean;
}

export interface ChartData {
  datasets: ChartDataset[];
}

// API query options
export interface CampaignMetricsQueryOptions {
  campaignId: string;
  windowMinutes?: TimeWindow;
  includeTimeseries?: boolean;
  refetchInterval?: number;
}

// Error types
export interface MetricsError {
  message: string;
  code?: string;
  statusCode?: number;
}

// Loading states
export interface MetricsLoadingState {
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error?: MetricsError;
  lastUpdated?: Date;
}

// Utility type for component props
export interface CampaignMetricsProps {
  campaignId: string;
  initialFilters?: Partial<MetricsFilters>;
  refreshInterval?: number;
  showChannelFilter?: boolean;
  showTimeFilter?: boolean;
  className?: string;
}

// Constants
export const DEFAULT_METRICS_FILTERS: MetricsFilters = {
  channel: 'all',
  windowMinutes: 60,
  includeTimeseries: true
};

export const TIME_WINDOW_OPTIONS: Array<{ value: TimeWindow; label: string }> = [
  { value: 60, label: '1 Hour' },
  { value: 360, label: '6 Hours' },
  { value: 1440, label: '24 Hours' }
];

export const CHANNEL_FILTER_OPTIONS: Array<{ value: ChannelFilter; label: string }> = [
  { value: 'all', label: 'All Channels' },
  { value: 'sms', label: 'SMS' },
  { value: 'kakao', label: 'KakaoTalk' }
];

// Type guards
export function isValidTimeWindow(value: number): value is TimeWindow {
  return [60, 360, 1440].includes(value);
}

export function isValidChannelFilter(value: string): value is ChannelFilter {
  return ['all', 'sms', 'kakao'].includes(value);
}