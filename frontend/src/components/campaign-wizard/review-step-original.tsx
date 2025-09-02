'use client';

import React, { useState, useEffect } from 'react';
import { useWizard } from '@/lib/context/campaign-wizard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2, 
  Users, 
  MessageSquare, 
  Settings, 
  Send,
  AlertCircle,
  DollarSign,
  Clock,
  Calendar,
  Eye,
  Edit
} from 'lucide-react';

export function ReviewStep() {
  const { state, dispatch, goToStep } = useWizard();
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);

  // Mock API call for cost estimation
  useEffect(() => {
    const estimateCost = async () => {
      // Simulate API call
      setTimeout(() => {
        const recipientCount = state.audience.includeAll ? 50000 : 
          (state.audience.groupIds.length * 1000 + state.audience.segmentIds.length * 500);
        
        const primaryChannelName = state.channels.channelOrder[0];
        const primaryChannel = state.channels.channels.find(c => c.channel === primaryChannelName);
        const costPerMessage = primaryChannel?.channel === 'SMS' ? 22 : 17;
        const estimatedCost = recipientCount * costPerMessage;
        const quotaOk = recipientCount <= 45000; // Mock quota limit

        dispatch({
          type: 'SET_REVIEW',
          payload: {
            recipientCount,
            estimatedCost,
            quotaOk,
            scheduledAt: scheduleEnabled && scheduledDate && scheduledTime 
              ? new Date(`${scheduledDate}T${scheduledTime}`)
              : undefined
          }
        });
      }, 1000);
    };

    estimateCost();
  }, [state.audience, state.channels, scheduleEnabled, scheduledDate, scheduledTime, dispatch]);

  const handleScheduleToggle = (enabled: boolean) => {
    setScheduleEnabled(enabled);
    if (!enabled) {
      setScheduledDate('');
      setScheduledTime('');
      dispatch({
        type: 'SET_REVIEW',
        payload: { scheduledAt: undefined }
      });
    }
  };

  const handleScheduleChange = () => {
    if (scheduleEnabled && scheduledDate && scheduledTime) {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
      dispatch({
        type: 'SET_REVIEW',
        payload: { scheduledAt }
      });
    }
  };

  const isScheduleValid = () => {
    if (!scheduleEnabled) return true;
    if (!scheduledDate || !scheduledTime) return false;
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    return scheduledDateTime > new Date();
  };

  const canSendCampaign = () => {
    return state.review.quotaOk && 
           confirmSend && 
           isScheduleValid() && 
           !state.isSubmitting;
  };

  const handleSendCampaign = async () => {
    if (!canSendCampaign()) return;

    dispatch({ type: 'SET_SUBMITTING', payload: true });

    try {
      // Mock API call
      console.log('Sending campaign:', {
        audience: state.audience,
        message: state.message,
        channels: state.channels,
        scheduledAt: state.review.scheduledAt
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // On success, you would typically redirect or show success message
      alert('Campaign sent successfully!');
      
    } catch (error) {
      console.error('Failed to send campaign:', error);
      alert('Failed to send campaign. Please try again.');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  };

  const getSummaryData = () => {
    // Audience summary
    const audienceSummary = state.audience.includeAll 
      ? "All contacts"
      : [
          ...state.audience.groupIds.map(id => `Group ${id.split('-')[1]}`),
          ...state.audience.segmentIds.map(id => `Segment ${id.split('-')[1]}`)
        ].join(', ') || 'Custom filters';

    // Channel summary
    const channelSummary = state.channels.channelOrder.join(' → ');

    return {
      audienceSummary,
      channelSummary
    };
  };

  const { audienceSummary, channelSummary } = getSummaryData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          Review & Send Campaign
        </h2>
        <p className="text-gray-600 mt-1">
          Review your campaign settings and send when ready. All settings can be edited before sending.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Review Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Audience */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Audience</h4>
                    <p className="text-sm text-gray-600">{audienceSummary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated {state.review.recipientCount?.toLocaleString() || '...'} recipients
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => goToStep(1)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>

              <Separator />

              {/* Message */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">{state.message.name}</h4>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-2 max-w-md">
                      {state.message.messageBody.substring(0, 150)}
                      {state.message.messageBody.length > 150 && '...'}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {state.message.messageBody.length} characters, 
                      {Object.keys(state.message.variables).length} variables
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => goToStep(2)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>

              <Separator />

              {/* Channels */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Delivery Channels</h4>
                    <p className="text-sm text-gray-600">{channelSummary}</p>
                    <div className="flex gap-1 mt-2">
                      {state.channels.channelOrder.map((channelName, index) => (
                        <Badge key={channelName} variant="secondary" className="text-xs">
                          {index + 1}. {channelName}
                          {index > 0 && state.channels.fallbackEnabled && ' (fallback)'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => goToStep(3)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="schedule-enabled"
                  checked={scheduleEnabled}
                  onCheckedChange={(checked) => handleScheduleToggle(checked as boolean)}
                />
                <div>
                  <Label htmlFor="schedule-enabled" className="font-medium cursor-pointer">
                    Schedule for later
                  </Label>
                  <p className="text-sm text-gray-600">
                    Schedule this campaign to be sent at a specific date and time
                  </p>
                </div>
              </div>

              {scheduleEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-7">
                  <div>
                    <Label htmlFor="schedule-date">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => {
                        setScheduledDate(e.target.value);
                        setTimeout(handleScheduleChange, 0);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="schedule-time">Time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => {
                        setScheduledTime(e.target.value);
                        setTimeout(handleScheduleChange, 0);
                      }}
                    />
                  </div>
                </div>
              )}

              {scheduleEnabled && !isScheduleValid() && (
                <div className="text-sm text-red-600 pl-7">
                  Please select a future date and time
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="confirm-send"
                  checked={confirmSend}
                  onCheckedChange={(checked) => setConfirmSend(checked as boolean)}
                />
                <div>
                  <Label htmlFor="confirm-send" className="font-medium cursor-pointer">
                    I confirm that I want to send this campaign
                  </Label>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. Please review all settings carefully.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel - Cost & Send */}
        <div className="space-y-6">
          {/* Cost Estimation */}
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Cost Estimation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recipients</span>
                  <span className="font-medium">
                    {state.review.recipientCount?.toLocaleString() || '...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Est. Cost</span>
                  <span className="font-medium">
                    ₩{state.review.estimatedCost?.toLocaleString() || '...'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost</span>
                  <span className="text-lg font-bold">
                    ₩{state.review.estimatedCost?.toLocaleString() || '...'}
                  </span>
                </div>
              </div>

              {/* Quota Status */}
              <div className={`p-3 rounded-lg ${
                state.review.quotaOk 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {state.review.quotaOk ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    state.review.quotaOk ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {state.review.quotaOk ? 'Quota Available' : 'Quota Exceeded'}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${
                  state.review.quotaOk ? 'text-green-700' : 'text-red-700'
                }`}>
                  {state.review.quotaOk 
                    ? 'You have sufficient quota for this campaign'
                    : 'This campaign exceeds your monthly quota limit'
                  }
                </p>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendCampaign}
                disabled={!canSendCampaign()}
                className="w-full"
                size="lg"
              >
                {state.isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : scheduleEnabled ? (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Campaign
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </>
                )}
              </Button>

              {!state.review.quotaOk && (
                <p className="text-xs text-red-600 text-center">
                  Cannot send: Quota limit exceeded
                </p>
              )}

              {!confirmSend && state.review.quotaOk && (
                <p className="text-xs text-gray-500 text-center">
                  Please confirm to enable sending
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Validation Errors */}
      {state.errors[4] && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {state.errors[4].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}