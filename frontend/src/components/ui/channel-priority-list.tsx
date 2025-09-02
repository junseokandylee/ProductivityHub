'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  Smartphone, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import type { ChannelStatusResponse } from '@/lib/api/contacts';

interface ChannelPriorityListProps {
  channels: ChannelStatusResponse[];
  selectedChannels: string[];
  onChannelsReorder: (newOrder: string[]) => void;
  fallbackEnabled: boolean;
  onFallbackToggle: (enabled: boolean) => void;
  className?: string;
}

export function ChannelPriorityList({
  channels,
  selectedChannels,
  onChannelsReorder,
  fallbackEnabled,
  onFallbackToggle,
  className = ""
}: ChannelPriorityListProps) {
  
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'SMS':
        return <Smartphone className="h-4 w-4 text-green-600" />;
      case 'KAKAO':
        return <MessageSquare className="h-4 w-4 text-yellow-600" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChannelName = (channel: string) => {
    switch (channel) {
      case 'SMS':
        return 'SMS';
      case 'KAKAO':
        return '카카오톡';
      case 'EMAIL':
        return '이메일';
      default:
        return channel;
    }
  };

  const getChannelStatus = (channel: ChannelStatusResponse) => {
    if (!channel.isEnabled) {
      return {
        icon: <AlertTriangle className="h-3 w-3 text-red-500" />,
        text: '비활성화',
        variant: 'destructive' as const
      };
    }
    
    if (channel.hasWarning) {
      return {
        icon: <Clock className="h-3 w-3 text-orange-500" />,
        text: '주의',
        variant: 'outline' as const
      };
    }

    return {
      icon: <CheckCircle className="h-3 w-3 text-green-500" />,
      text: '정상',
      variant: 'secondary' as const
    };
  };

  const moveChannelUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...selectedChannels];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      onChannelsReorder(newOrder);
    }
  };

  const moveChannelDown = (index: number) => {
    if (index < selectedChannels.length - 1) {
      const newOrder = [...selectedChannels];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      onChannelsReorder(newOrder);
    }
  };

  const removeChannel = (channelToRemove: string) => {
    const newOrder = selectedChannels.filter(channel => channel !== channelToRemove);
    onChannelsReorder(newOrder);
  };

  const addChannel = (channelToAdd: string) => {
    if (!selectedChannels.includes(channelToAdd)) {
      onChannelsReorder([...selectedChannels, channelToAdd]);
    }
  };

  const availableChannels = channels.filter(channel => 
    !selectedChannels.includes(channel.channel) && channel.isEnabled
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>채널 우선순위 설정</span>
          <div className="flex items-center gap-2">
            <Label htmlFor="fallback-toggle" className="text-xs">
              폴백 사용
            </Label>
            <Switch
              id="fallback-toggle"
              checked={fallbackEnabled}
              onCheckedChange={onFallbackToggle}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Channels */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">선택된 채널 ({selectedChannels.length})</Label>
          {selectedChannels.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              채널을 선택해주세요
            </div>
          ) : (
            <div className="space-y-2">
              {selectedChannels.map((channelName, index) => {
                const channel = channels.find(c => c.channel === channelName);
                if (!channel) return null;

                const status = getChannelStatus(channel);
                const isPrimary = index === 0;
                
                return (
                  <div
                    key={channelName}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      isPrimary ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Priority Badge */}
                    <Badge variant={isPrimary ? "default" : "secondary"} className="text-xs">
                      {isPrimary ? '주 채널' : `${index + 1}순위`}
                    </Badge>
                    
                    {/* Channel Info */}
                    <div className="flex items-center gap-2 flex-1">
                      {getChannelIcon(channelName)}
                      <span className="font-medium">{getChannelName(channelName)}</span>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-1">
                        {status.icon}
                        <Badge variant={status.variant} className="text-xs">
                          {status.text}
                        </Badge>
                      </div>
                      
                      {/* Quota Info */}
                      <div className="text-xs text-gray-500">
                        {channel.quotaRemaining.toLocaleString()}/{channel.dailyLimit.toLocaleString()} 남음
                      </div>
                    </div>
                    
                    {/* Move Controls */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveChannelUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveChannelDown(index)}
                        disabled={index === selectedChannels.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChannel(channelName)}
                        className="text-red-600"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Channels */}
        {availableChannels.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">사용 가능한 채널</Label>
            <div className="space-y-2">
              {availableChannels.map((channel) => {
                const status = getChannelStatus(channel);
                
                return (
                  <div
                    key={channel.channel}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getChannelIcon(channel.channel)}
                      <span className="font-medium">{getChannelName(channel.channel)}</span>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-1">
                        {status.icon}
                        <Badge variant={status.variant} className="text-xs">
                          {status.text}
                        </Badge>
                      </div>
                      
                      {/* Quota Info */}
                      <div className="text-xs text-gray-500">
                        {channel.quotaRemaining.toLocaleString()}/{channel.dailyLimit.toLocaleString()} 남음
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addChannel(channel.channel)}
                    >
                      추가
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback Information */}
        {fallbackEnabled && selectedChannels.length > 1 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">폴백 활성화</p>
                <p>주 채널 실패 시 다음 순위 채널로 자동 전환됩니다.</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}