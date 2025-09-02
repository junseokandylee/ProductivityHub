'use client';

import { create } from 'zustand';

export type AlertType = 'failure' | 'success' | 'warning';

export interface AlertNotification {
  type: AlertType;
  campaignId: string;
  triggeredAt: number;
  lastNotifiedAt: number;
  isActive: boolean;
}

interface AlertState {
  alerts: Map<string, AlertNotification>;
  
  // Check if we should show alert (not throttled)
  shouldNotify: (type: AlertType, campaignId: string, throttleMs?: number) => boolean;
  
  // Mark that we've shown an alert
  markNotified: (type: AlertType, campaignId: string) => void;
  
  // Check if alert was previously triggered (for cleared notifications)
  wasTriggered: (type: AlertType, campaignId: string) => boolean;
  
  // Clear alert state
  clearAlert: (type: AlertType, campaignId: string) => void;
  
  // Get alert key
  getAlertKey: (type: AlertType, campaignId: string) => string;
  
  // Clean up old alerts (older than 5 minutes)
  cleanup: () => void;
}

const DEFAULT_THROTTLE_MS = 60000; // 60 seconds
const CLEANUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: new Map(),

  getAlertKey: (type: AlertType, campaignId: string) => `${type}:${campaignId}`,

  shouldNotify: (type: AlertType, campaignId: string, throttleMs = DEFAULT_THROTTLE_MS) => {
    const key = get().getAlertKey(type, campaignId);
    const alert = get().alerts.get(key);
    const now = Date.now();

    if (!alert) {
      return true; // First time, show alert
    }

    // If alert is not active and enough time has passed, allow notification
    if (!alert.isActive && now - alert.lastNotifiedAt >= throttleMs) {
      return true;
    }

    // If alert is active and enough time has passed since last notification, allow
    if (alert.isActive && now - alert.lastNotifiedAt >= throttleMs) {
      return true;
    }

    return false;
  },

  markNotified: (type: AlertType, campaignId: string) => {
    set((state) => {
      const key = get().getAlertKey(type, campaignId);
      const now = Date.now();
      const alerts = new Map(state.alerts);
      
      alerts.set(key, {
        type,
        campaignId,
        triggeredAt: now,
        lastNotifiedAt: now,
        isActive: true,
      });

      return { alerts };
    });
  },

  wasTriggered: (type: AlertType, campaignId: string) => {
    const key = get().getAlertKey(type, campaignId);
    const alert = get().alerts.get(key);
    return alert?.isActive ?? false;
  },

  clearAlert: (type: AlertType, campaignId: string) => {
    set((state) => {
      const key = get().getAlertKey(type, campaignId);
      const alerts = new Map(state.alerts);
      const alert = alerts.get(key);
      
      if (alert) {
        alerts.set(key, {
          ...alert,
          isActive: false,
        });
      }

      return { alerts };
    });
  },

  cleanup: () => {
    set((state) => {
      const now = Date.now();
      const alerts = new Map(state.alerts);
      
      // Remove alerts older than threshold
      for (const [key, alert] of alerts.entries()) {
        if (now - alert.lastNotifiedAt > CLEANUP_THRESHOLD_MS) {
          alerts.delete(key);
        }
      }

      return { alerts };
    });
  },
}));