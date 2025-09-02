'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showFailureAlert, showFailureClearedAlert } from '@/lib/utils/alert-helpers';

export default function TestAlertsPage() {
  const [alertCount, setAlertCount] = useState(0);

  const triggerFailureAlert = () => {
    showFailureAlert({
      failureRate: 0.08, // 8% failure rate
      threshold: 0.05,   // 5% threshold
      campaignId: 'test-campaign-123',
      windowSeconds: 60,
    });
    setAlertCount(prev => prev + 1);
  };

  const triggerSevereFailureAlert = () => {
    showFailureAlert({
      failureRate: 0.15, // 15% failure rate (severe)
      threshold: 0.05,   // 5% threshold
      campaignId: 'test-campaign-456',
      windowSeconds: 60,
    });
    setAlertCount(prev => prev + 1);
  };

  const triggerSuccessAlert = () => {
    showFailureClearedAlert({
      campaignId: 'test-campaign-123',
      previousFailureRate: 0.08,
      currentFailureRate: 0.03,
    });
    setAlertCount(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alert System Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the failure rate alerting system with different scenarios
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alert Triggers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Button 
                onClick={triggerFailureAlert}
                variant="outline"
                className="w-full"
              >
                Trigger Warning Alert (8% failure rate)
              </Button>
              
              <Button 
                onClick={triggerSevereFailureAlert}
                variant="destructive"
                className="w-full"
              >
                Trigger Severe Alert (15% failure rate)
              </Button>
              
              <Button 
                onClick={triggerSuccessAlert}
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Trigger Success Alert (Rate normalized)
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Alerts triggered: {alertCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Features Demonstrated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ Toast notifications with different severity levels</div>
            <div>✅ Auto-dismiss after 15 seconds (failure) / 8 seconds (success)</div>
            <div>✅ Manual dismiss capability</div>
            <div>✅ Troubleshoot button with external link</div>
            <div>✅ Accessible design (screen reader compatible)</div>
            <div>✅ Throttling system (alerts are deduplicated for 60 seconds)</div>
            <div>✅ Non-blocking UI (toasts don't interfere with workflows)</div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="link" asChild>
            <a href="/campaigns/test-123/monitor">
              View Campaign Monitor (with Real-time Polling)
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}