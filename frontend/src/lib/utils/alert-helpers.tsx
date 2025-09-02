'use client';

import { toast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FailureAlertData {
  failureRate: number;
  threshold: number;
  campaignId: string;
  windowSeconds?: number;
}

export interface SuccessAlertData {
  campaignId: string;
  previousFailureRate: number;
  currentFailureRate: number;
}

/**
 * Show failure rate alert toast notification
 */
export function showFailureAlert({
  failureRate,
  threshold,
  campaignId,
  windowSeconds = 60
}: FailureAlertData) {
  const failurePercent = (failureRate * 100).toFixed(1);
  const thresholdPercent = (threshold * 100).toFixed(1);
  
  // Determine severity based on how far we exceed threshold
  const exceedsBy = failureRate - threshold;
  const variant = exceedsBy >= 0.05 ? 'destructive' : 'default'; // destructive if 5%+ over threshold
  
  const icon = variant === 'destructive' 
    ? <AlertCircle className="h-4 w-4" />
    : <AlertTriangle className="h-4 w-4" />;

  return toast({
    variant,
    title: "High Failure Rate Detected",
    description: (
      <div className="space-y-2">
        <p>
          Campaign failure rate is <strong>{failurePercent}%</strong>, 
          exceeding the threshold of <strong>{thresholdPercent}%</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Evaluated over {windowSeconds} second window
        </p>
      </div>
    ),
    action: (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          // Navigate to campaign details or troubleshooting page
          window.open(`/campaigns/${campaignId}/troubleshoot`, '_blank');
        }}
        aria-label="Open troubleshooting guide for campaign"
      >
        Troubleshoot
      </Button>
    ),
    // Set duration for accessibility - allow users to dismiss manually
    duration: 15000, // Auto-dismiss after 15 seconds (longer for critical alerts)
  });
}

/**
 * Show failure rate cleared notification
 */
export function showFailureClearedAlert({
  campaignId,
  previousFailureRate,
  currentFailureRate
}: SuccessAlertData) {
  const previousPercent = (previousFailureRate * 100).toFixed(1);
  const currentPercent = (currentFailureRate * 100).toFixed(1);

  return toast({
    variant: 'default',
    title: "Failure Rate Normalized",
    description: (
      <div className="space-y-1">
        <p>
          Delivery failures have dropped from <strong>{previousPercent}%</strong> to <strong>{currentPercent}%</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Campaign performance is back within acceptable limits
        </p>
      </div>
    ),
    duration: 8000, // Auto-dismiss after 8 seconds
  });
}

/**
 * Show generic campaign alert
 */
export function showCampaignAlert(
  title: string,
  description: string,
  variant: 'default' | 'destructive' = 'default',
  campaignId?: string,
  actionLabel?: string,
  onAction?: () => void
) {
  return toast({
    variant,
    title,
    description,
    action: actionLabel && onAction ? (
      <Button variant="outline" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : undefined,
    duration: 8000,
  });
}

/**
 * Calculate failure rate from metrics data (with fallback)
 */
export function calculateFailureRate(data: any): number {
  // Primary: use computed rates from API
  if (data.rates?.failure != null) {
    return data.rates.failure;
  }
  
  // Fallback: calculate from totals
  if (data.totals?.sent > 0) {
    return data.totals.failed / data.totals.sent;
  }
  
  return 0;
}

/**
 * Get alert threshold from data or use default
 */
export function getAlertThreshold(data: any): number {
  return data.alert?.threshold ?? 0.05; // Default to 5%
}

/**
 * Check if alert should be triggered
 */
export function shouldTriggerAlert(data: any): boolean {
  // Primary: use alert status from API
  if (data.alert?.triggered != null) {
    return data.alert.triggered;
  }
  
  // Fallback: compare calculated failure rate to threshold
  const failureRate = calculateFailureRate(data);
  const threshold = getAlertThreshold(data);
  
  return failureRate > threshold;
}