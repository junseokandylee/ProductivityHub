'use client';

import { useState, useEffect } from 'react';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { RecentCampaigns } from '@/components/dashboard/recent-campaigns';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { QuotaWidget } from '@/components/dashboard/quota-widget';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const { kpiMetrics, recentCampaigns, systemAlerts, quotaInfo } = useDashboardData();

  // Load dismissed alerts from localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedAlerts');
    if (dismissed) {
      try {
        setDismissedAlerts(JSON.parse(dismissed));
      } catch (error) {
        console.warn('Failed to parse dismissed alerts:', error);
      }
    }
  }, []);

  const handleDismissAlert = (alertId: string) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
  };

  // Filter out dismissed alerts
  const filteredAlerts = systemAlerts.data?.filter(alert => 
    !dismissedAlerts.includes(alert.id)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">
          캠페인 성과와 시스템 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* KPI Cards Row */}
      <KPICards
        data={kpiMetrics.data}
        loading={kpiMetrics.isLoading}
        error={kpiMetrics.isError ? '지표 데이터를 불러올 수 없습니다.' : undefined}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Recent Campaigns */}
        <div className="lg:col-span-2">
          <RecentCampaigns
            campaigns={recentCampaigns.data}
            loading={recentCampaigns.isLoading}
            error={recentCampaigns.isError ? '캠페인 데이터를 불러올 수 없습니다.' : undefined}
          />
        </div>

        {/* Right Column - Alerts & Quota */}
        <div className="space-y-6">
          <AlertsPanel
            alerts={filteredAlerts}
            loading={systemAlerts.isLoading}
            error={systemAlerts.isError ? '알림 데이터를 불러올 수 없습니다.' : undefined}
            onDismiss={handleDismissAlert}
          />
          
          <QuotaWidget
            data={quotaInfo.data}
            loading={quotaInfo.isLoading}
            error={quotaInfo.isError ? '쿼터 데이터를 불러올 수 없습니다.' : undefined}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <a
            href="/campaigns/new"
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-blue-500">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12 0 6.627 5.373 12 12 12 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm6 13h-5v5h-2v-5h-5v-2h5v-5h2v5h5v2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">새 캠페인</p>
              <p className="text-xs text-gray-500 mt-1">캠페인 만들기</p>
            </div>
          </a>

          <a
            href="/contacts/import"
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
          >
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-green-500">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">연락처 가져오기</p>
              <p className="text-xs text-gray-500 mt-1">CSV/Excel 업로드</p>
            </div>
          </a>

          <a
            href="/analytics"
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group"
          >
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-purple-500">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">분석 보고서</p>
              <p className="text-xs text-gray-500 mt-1">성과 분석</p>
            </div>
          </a>

          <a
            href="/settings"
            className="p-4 border border-dashed border-gray-300 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-colors group"
          >
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-gray-500">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">설정</p>
              <p className="text-xs text-gray-500 mt-1">시스템 설정</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
