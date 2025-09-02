'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { SegmentRule, segmentsApi, segmentRuleHelpers } from '@/lib/api/segments';
import { useToast } from '@/hooks/use-toast';

interface SegmentPreviewProps {
  rules: SegmentRule;
  sampleSize?: number;
}

export function SegmentPreview({ rules, sampleSize = 10 }: SegmentPreviewProps) {
  const { toast } = useToast();
  const [lastEvaluatedRules, setLastEvaluatedRules] = useState<string>('');

  // Debounced rules for evaluation
  const [debouncedRules, setDebouncedRules] = useState(rules);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRules(rules);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [rules]);

  // Check if rules are valid and different from last evaluated
  const isValidRule = segmentRuleHelpers.isValidRule(debouncedRules);
  const rulesString = JSON.stringify(debouncedRules);
  const shouldEvaluate = isValidRule && rulesString !== lastEvaluatedRules;

  const {
    data: previewData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['segment-preview', rulesString],
    queryFn: async () => {
      if (!isValidRule) return null;
      
      try {
        const response = await segmentsApi.evaluateSegment({
          rules: debouncedRules,
          sampleSize,
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to evaluate segment');
        }
        
        setLastEvaluatedRules(rulesString);
        return response.data;
      } catch (error) {
        console.error('Preview evaluation error:', error);
        throw error;
      }
    },
    enabled: shouldEvaluate,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
  });

  const handleRefresh = useCallback(() => {
    if (isValidRule) {
      refetch();
    }
  }, [isValidRule, refetch]);

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isValidRule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Segment Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Configure conditions to see preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Segment Preview
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-300" />
            <p className="text-sm text-red-600 mb-2">Failed to load preview</p>
            <p className="text-xs text-gray-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Segment Preview
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Evaluating segment...</p>
          </div>
        ) : previewData ? (
          <>
            {/* Statistics */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {previewData.totalCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Total Contacts</div>
                </div>
                
                {previewData.executionTimeMs && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700">
                      {formatExecutionTime(previewData.executionTimeMs)}
                    </div>
                    <div className="text-xs text-gray-500">Execution Time</div>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Contacts */}
            {previewData.sampleContacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Sample Contacts</h4>
                  <Badge variant="secondary">
                    {previewData.sampleContacts.length} of {previewData.totalCount}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {previewData.sampleContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(contact.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {contact.fullName}
                          </p>
                          {!contact.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Created {new Date(contact.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {previewData.totalCount === 0 && (
              <div className="text-center py-6">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm text-gray-500">No contacts match these conditions</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your segment rules
                </p>
              </div>
            )}

            {/* Rule Summary */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Current Rules</h4>
              <div className="bg-gray-50 rounded p-3">
                <code className="text-xs text-gray-600 break-all">
                  {segmentRuleHelpers.describeRule(debouncedRules)}
                </code>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No preview data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}