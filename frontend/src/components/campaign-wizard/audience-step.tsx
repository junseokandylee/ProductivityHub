'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWizard } from '@/lib/context/campaign-wizard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, Filter, Target, Search, Loader2, AlertCircle } from 'lucide-react';
import { useContactGroups, useContactSegments, useEstimateAudience } from '@/lib/hooks/use-contacts';
import { WizardStepFeedback, StepValidation } from '@/components/ui/wizard-feedback';
import { useDebounce } from 'react-use';

export function AudienceStep() {
  const { state, dispatch } = useWizard();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Debounce search term to avoid too many API calls
  useDebounce(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 300, [searchTerm]);

  // Fetch contact groups and segments
  const { 
    data: contactGroups = [], 
    isLoading: isLoadingGroups, 
    error: groupsError 
  } = useContactGroups(debouncedSearchTerm || undefined);
  
  const { 
    data: contactSegments = [], 
    isLoading: isLoadingSegments, 
    error: segmentsError 
  } = useContactSegments(debouncedSearchTerm || undefined);

  // Estimate audience mutation
  const estimateAudienceMutation = useEstimateAudience();

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const currentGroups = state.audience.groupIds;
    const updatedGroups = checked 
      ? [...currentGroups, groupId]
      : currentGroups.filter(id => id !== groupId);

    dispatch({
      type: 'SET_AUDIENCE',
      payload: { groupIds: updatedGroups }
    });
  };

  const handleSegmentToggle = (segmentId: string, checked: boolean) => {
    const currentSegments = state.audience.segmentIds;
    const updatedSegments = checked 
      ? [...currentSegments, segmentId]
      : currentSegments.filter(id => id !== segmentId);

    dispatch({
      type: 'SET_AUDIENCE',
      payload: { segmentIds: updatedSegments }
    });
  };

  const handleIncludeAllToggle = (checked: boolean) => {
    dispatch({
      type: 'SET_AUDIENCE',
      payload: { 
        includeAll: checked,
        // Clear other selections if including all
        ...(checked && {
          groupIds: [],
          segmentIds: [],
          filterJson: {}
        })
      }
    });
  };

  // Trigger audience estimation when selection changes
  useEffect(() => {
    if (!state.audience.includeAll && (state.audience.groupIds.length > 0 || state.audience.segmentIds.length > 0)) {
      estimateAudienceMutation.mutate({
        groupIds: state.audience.groupIds,
        segmentIds: state.audience.segmentIds,
        filterJson: state.audience.filterJson || {}
      });
    }
  }, [state.audience.groupIds, state.audience.segmentIds, state.audience.includeAll]);

  const getEstimatedCount = () => {
    if (state.audience.includeAll) {
      return 50000; // Could be fetched from API or cached
    }

    if (estimateAudienceMutation.data) {
      return estimateAudienceMutation.data.uniqueContacts;
    }

    // Fallback: calculate simple sum from displayed data
    let total = 0;
    
    state.audience.groupIds.forEach(groupId => {
      const group = contactGroups.find(g => g.id === groupId);
      if (group) total += group.count;
    });

    state.audience.segmentIds.forEach(segmentId => {
      const segment = contactSegments.find(s => s.id === segmentId);
      if (segment) total += segment.count;
    });

    return total;
  };

  // The filtering is now handled by the API with the debounced search term
  const isLoading = isLoadingGroups || isLoadingSegments;
  const hasError = groupsError || segmentsError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-500" />
          Select Your Audience
        </h2>
        <p className="text-gray-600 mt-1">
          Choose who will receive your campaign message. You can select specific groups, segments, or include all contacts.
        </p>
      </div>

      {/* Real-time feedback */}
      <WizardStepFeedback
        stepNumber={1}
        isLoading={isLoading}
        loadingText={isLoadingGroups ? "그룹 정보를 불러오는 중..." : isLoadingSegments ? "세그먼트 정보를 불러오는 중..." : undefined}
      />

      {/* Include All Option */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="include-all"
              checked={state.audience.includeAll}
              onCheckedChange={handleIncludeAllToggle}
            />
            <div className="flex-1">
              <Label htmlFor="include-all" className="text-base font-medium cursor-pointer">
                Include All Contacts
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                Send to all contacts in your database (approximately 50,000 contacts)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      {!state.audience.includeAll && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search groups and segments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Failed to load groups and segments. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!state.audience.includeAll && (
        <>
          {/* Groups Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Contact Groups
                {state.audience.groupIds.length > 0 && (
                  <Badge variant="secondary">{state.audience.groupIds.length} selected</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading groups...</span>
                </div>
              ) : contactGroups.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {debouncedSearchTerm ? 'No groups found matching your search.' : 'No contact groups available.'}
                </p>
              ) : (
                contactGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={group.id}
                      checked={state.audience.groupIds.includes(group.id)}
                      onCheckedChange={(checked) => handleGroupToggle(group.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={group.id} className="font-medium cursor-pointer">
                        {group.name}
                      </Label>
                      {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
                    </div>
                    <Badge variant="outline">{group.count.toLocaleString()} contacts</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Segments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-500" />
                Audience Segments
                {state.audience.segmentIds.length > 0 && (
                  <Badge variant="secondary">{state.audience.segmentIds.length} selected</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSegments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading segments...</span>
                </div>
              ) : contactSegments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {debouncedSearchTerm ? 'No segments found matching your search.' : 'No contact segments available.'}
                </p>
              ) : (
                contactSegments.map((segment) => (
                  <div key={segment.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={segment.id}
                      checked={state.audience.segmentIds.includes(segment.id)}
                      onCheckedChange={(checked) => handleSegmentToggle(segment.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={segment.id} className="font-medium cursor-pointer">
                        {segment.name}
                      </Label>
                      {segment.description && <p className="text-sm text-gray-500">{segment.description}</p>}
                    </div>
                    <Badge variant="outline">{segment.count.toLocaleString()} contacts</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Estimated Recipients Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Estimated Recipients</h3>
              <p className="text-sm text-gray-600">
                Based on your current selection
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-blue-600">
                  {getEstimatedCount().toLocaleString()}
                </div>
                {estimateAudienceMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
              </div>
              <div className="text-sm text-gray-500">contacts</div>
              {estimateAudienceMutation.data && !state.audience.includeAll && (
                <div className="text-xs text-blue-600 mt-1">
                  {estimateAudienceMutation.data.totalContacts !== estimateAudienceMutation.data.uniqueContacts && (
                    <>Total: {estimateAudienceMutation.data.totalContacts.toLocaleString()} | Unique: {estimateAudienceMutation.data.uniqueContacts.toLocaleString()}</>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {!state.audience.includeAll && (state.audience.groupIds.length > 0 || state.audience.segmentIds.length > 0) && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Selected:</p>
              <div className="flex flex-wrap gap-2">
                {state.audience.groupIds.map(groupId => {
                  const group = contactGroups.find(g => g.id === groupId);
                  return group ? (
                    <Badge key={groupId} variant="secondary">
                      {group.name}
                    </Badge>
                  ) : (
                    <Badge key={groupId} variant="outline">
                      Group ({groupId.slice(-4)})
                    </Badge>
                  );
                })}
                {state.audience.segmentIds.map(segmentId => {
                  const segment = contactSegments.find(s => s.id === segmentId);
                  return segment ? (
                    <Badge key={segmentId} variant="secondary">
                      {segment.name}
                    </Badge>
                  ) : (
                    <Badge key={segmentId} variant="outline">
                      Segment ({segmentId.slice(-4)})
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {state.errors[1] && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {state.errors[1].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}