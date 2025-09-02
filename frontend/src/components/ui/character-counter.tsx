'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { getCharacterLimit, calculateSMSParts, CHARACTER_LIMITS } from '@/lib/utils/template';

interface CharacterCounterProps {
  text: string;
  channel?: string;
  showSMSParts?: boolean;
  className?: string;
}

export function CharacterCounter({ 
  text, 
  channel = 'SMS', 
  showSMSParts = true,
  className = "" 
}: CharacterCounterProps) {
  const currentCount = text.length;
  const limit = getCharacterLimit(channel);
  const percentage = (currentCount / limit) * 100;
  const smsParts = calculateSMSParts(text);
  
  const getCounterColor = () => {
    if (percentage > 100) return 'text-red-600';
    if (percentage > 90) return 'text-orange-600';
    if (percentage > 75) return 'text-yellow-600';
    return 'text-gray-600';
  };
  
  const getCounterVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (percentage > 100) return 'destructive';
    if (percentage > 90) return 'outline';
    return 'secondary';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Character Count */}
      <div className="flex items-center gap-1">
        {percentage > 100 ? (
          <AlertTriangle className="h-3 w-3 text-red-500" />
        ) : (
          <CheckCircle className="h-3 w-3 text-green-500" />
        )}
        <span className={`text-xs ${getCounterColor()}`}>
          {currentCount.toLocaleString()}/{limit.toLocaleString()}자
        </span>
      </div>

      {/* Channel Badge */}
      <Badge variant={getCounterVariant()} className="text-xs">
        {channel}
      </Badge>

      {/* SMS Parts (only for SMS channel) */}
      {channel === 'SMS' && showSMSParts && smsParts > 1 && (
        <Badge variant="outline" className="text-xs">
          {smsParts}건으로 분할
        </Badge>
      )}

      {/* Over limit warning */}
      {percentage > 100 && (
        <span className="text-xs text-red-600">
          (+{(currentCount - limit).toLocaleString()})
        </span>
      )}
      
      {/* Progress indicator */}
      <div className="flex-1 min-w-16 max-w-24">
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div 
            className={`h-1 rounded-full transition-all duration-200 ${
              percentage > 100 ? 'bg-red-500' :
              percentage > 90 ? 'bg-orange-500' :
              percentage > 75 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}