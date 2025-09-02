'use client';

import { useQuery } from '@tanstack/react-query';

// API types
interface KPIData {
  sent: { value: number; change: number; trend: 'up' | 'down' };
  successRate: { value: number; change: number; trend: 'up' | 'down' };
  openRate: { value: number; change: number; trend: 'up' | 'down' };
  failures: { value: number; change: number; trend: 'up' | 'down' };
}

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'paused';
  sentCount: number;
  totalRecipients: number;
  successRate: number;
  createdAt: string;
  scheduledAt?: string;
  channels: ('sms' | 'kakao' | 'email')[];
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
  actionText?: string;
  dismissible?: boolean;
}

interface QuotaData {
  current: number;
  limit: number;
  period: string;
  resetDate: string;
  warningThreshold: number;
  criticalThreshold: number;
  channels: {
    sms: { used: number; limit: number };
    kakao: { used: number; limit: number };
    email: { used: number; limit: number };
  };
}

// API client functions
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5284';

const apiClient = {
  async fetchKPIMetrics(): Promise<KPIData> {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/global-metrics`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.warn('KPI API unavailable, using mock data:', error);
      // Mock data for development
      return {
        sent: { value: 12450, change: 15.3, trend: 'up' },
        successRate: { value: 94.2, change: 2.1, trend: 'up' },
        openRate: { value: 67.8, change: -1.2, trend: 'down' },
        failures: { value: 148, change: -8.4, trend: 'down' },
      };
    }
  },

  async fetchRecentCampaigns(): Promise<Campaign[]> {
    try {
      const response = await fetch(`${API_BASE}/api/campaigns/recent`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.warn('Campaigns API unavailable, using mock data:', error);
      // Mock data for development
      return [
        {
          id: '1',
          name: '신년 인사 메시지',
          status: 'completed',
          sentCount: 8542,
          totalRecipients: 8723,
          successRate: 97.9,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          channels: ['sms', 'kakao'],
        },
        {
          id: '2', 
          name: '정책 설명회 안내',
          status: 'sending',
          sentCount: 3201,
          totalRecipients: 5400,
          successRate: 95.2,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          channels: ['sms'],
        },
        {
          id: '3',
          name: '지역 행사 초대장',
          status: 'scheduled',
          sentCount: 0,
          totalRecipients: 2100,
          successRate: 0,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          channels: ['kakao', 'email'],
        },
      ];
    }
  },

  async fetchSystemAlerts(): Promise<SystemAlert[]> {
    try {
      const response = await fetch(`${API_BASE}/api/alerts/active`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.warn('Alerts API unavailable, using mock data:', error);
      // Mock data for development
      return [
        {
          id: '1',
          type: 'warning',
          title: '쿼터 사용량 증가',
          message: '이번 달 SMS 발송 한도의 85%를 사용했습니다.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          actionUrl: '/settings/quota',
          actionText: '쿼터 확인',
          dismissible: true,
        },
        {
          id: '2',
          type: 'info',
          title: '시스템 업데이트 예정',
          message: '내일 새벽 2시-4시 정기 점검이 예정되어 있습니다.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          dismissible: true,
        },
      ];
    }
  },

  async fetchQuotaInfo(): Promise<QuotaData> {
    try {
      const response = await fetch(`${API_BASE}/api/quota/current`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.warn('Quota API unavailable, using mock data:', error);
      // Mock data for development
      return {
        current: 8642,
        limit: 10000,
        period: '월간',
        resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        warningThreshold: 80,
        criticalThreshold: 95,
        channels: {
          sms: { used: 5234, limit: 6000 },
          kakao: { used: 2408, limit: 3000 },
          email: { used: 1000, limit: 1000 },
        },
      };
    }
  },
};

// React Query hooks
export function useKPIMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'kpi-metrics'],
    queryFn: apiClient.fetchKPIMetrics,
    refetchInterval: 5000, // 5 seconds
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useRecentCampaigns() {
  return useQuery({
    queryKey: ['dashboard', 'recent-campaigns'],
    queryFn: apiClient.fetchRecentCampaigns,
    refetchInterval: 5000, // 5 seconds
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useSystemAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: apiClient.fetchSystemAlerts,
    refetchInterval: 5000, // 5 seconds
    staleTime: 15000, // 15 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useQuotaInfo() {
  return useQuery({
    queryKey: ['dashboard', 'quota'],
    queryFn: apiClient.fetchQuotaInfo,
    refetchInterval: 15000, // 15 seconds
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

// Combined hook for all dashboard data
export function useDashboardData() {
  const kpiMetrics = useKPIMetrics();
  const recentCampaigns = useRecentCampaigns();
  const systemAlerts = useSystemAlerts();
  const quotaInfo = useQuotaInfo();

  return {
    kpiMetrics,
    recentCampaigns,
    systemAlerts,
    quotaInfo,
    isLoading: kpiMetrics.isLoading || recentCampaigns.isLoading || systemAlerts.isLoading || quotaInfo.isLoading,
    hasError: kpiMetrics.isError || recentCampaigns.isError || systemAlerts.isError || quotaInfo.isError,
  };
}