'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SegmentBuilder } from './SegmentBuilder';
import { SegmentList } from './SegmentList';
import { segmentsApi, SegmentDto, CreateSegmentRequest, UpdateSegmentRequest } from '@/lib/api/segments';
import { useToast } from '@/hooks/use-toast';

type View = 'list' | 'create' | 'edit';

export function SegmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentView, setCurrentView] = useState<View>('list');
  const [editingSegment, setEditingSegment] = useState<SegmentDto | null>(null);

  // Create segment mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateSegmentRequest) => {
      const response = await segmentsApi.createSegment(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create segment');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setCurrentView('list');
      toast({
        title: "Success",
        description: "Segment created successfully",
      });
    },
    onError: (error) => {
      // Error handling is done in the SegmentBuilder component
      throw error;
    },
  });

  // Update segment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSegmentRequest }) => {
      const response = await segmentsApi.updateSegment(id, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update segment');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      setCurrentView('list');
      setEditingSegment(null);
      toast({
        title: "Success",
        description: "Segment updated successfully",
      });
    },
    onError: (error) => {
      // Error handling is done in the SegmentBuilder component
      throw error;
    },
  });

  const handleCreateNew = () => {
    setCurrentView('create');
    setEditingSegment(null);
  };

  const handleEdit = (segment: SegmentDto) => {
    setEditingSegment(segment);
    setCurrentView('edit');
  };

  const handleSave = async (segmentData: { name: string; description?: string; rules: any }) => {
    if (currentView === 'create') {
      await createMutation.mutateAsync(segmentData);
    } else if (currentView === 'edit' && editingSegment) {
      await updateMutation.mutateAsync({
        id: editingSegment.id,
        data: {
          ...segmentData,
          isActive: editingSegment.isActive, // Preserve current active state
        },
      });
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingSegment(null);
  };

  // Render based on current view
  switch (currentView) {
    case 'create':
      return (
        <SegmentBuilder
          onSave={handleSave}
          onCancel={handleCancel}
        />
      );

    case 'edit':
      return (
        <SegmentBuilder
          initialSegment={editingSegment ? {
            id: editingSegment.id,
            name: editingSegment.name,
            description: editingSegment.description,
            rules: editingSegment.rules,
          } : undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      );

    case 'list':
    default:
      return (
        <SegmentList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
        />
      );
  }
}