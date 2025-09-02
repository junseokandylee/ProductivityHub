'use client';

import React, { useState, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Plus, Save, Eye } from 'lucide-react';
import { SegmentRule, SegmentRuleGroup, SegmentRuleCondition, segmentRuleHelpers } from '@/lib/api/segments';
import { SegmentRuleGroupComponent } from './SegmentRuleGroup';
import { SegmentPreview } from './SegmentPreview';
import { useToast } from '@/hooks/use-toast';

interface SegmentBuilderProps {
  initialSegment?: {
    id?: string;
    name: string;
    description?: string;
    rules: SegmentRule;
  };
  onSave?: (segment: { name: string; description?: string; rules: SegmentRule }) => Promise<void>;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

export function SegmentBuilder({ initialSegment, onSave, onCancel, isReadOnly = false }: SegmentBuilderProps) {
  const { toast } = useToast();
  const [name, setName] = useState(initialSegment?.name || '');
  const [description, setDescription] = useState(initialSegment?.description || '');
  const [rules, setRules] = useState<SegmentRule>(
    initialSegment?.rules || segmentRuleHelpers.createGroup('and')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Segment name is required",
        variant: "destructive",
      });
      return;
    }

    if (!segmentRuleHelpers.isValidRule(rules)) {
      toast({
        title: "Validation Error", 
        description: "Please configure at least one condition",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.({ name: name.trim(), description: description.trim() || undefined, rules });
      toast({
        title: "Success",
        description: initialSegment?.id ? "Segment updated successfully" : "Segment created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save segment",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRuleChange = useCallback((newRules: SegmentRule) => {
    setRules(newRules);
  }, []);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Handle drag end logic for reordering rules
    // This will be implemented in the individual rule components
  };

  const conditionCount = segmentRuleHelpers.countConditions(rules);
  const ruleDepth = segmentRuleHelpers.calculateDepth(rules);
  const ruleDescription = segmentRuleHelpers.describeRule(rules);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {initialSegment?.id ? 'Edit Segment' : 'Create Segment'}
          </h1>
          <p className="text-sm text-gray-500">
            Build dynamic segments using rules and conditions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!segmentRuleHelpers.isValidRule(rules)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          {!isReadOnly && (
            <>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                {initialSegment?.id ? 'Update' : 'Create'} Segment
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Segment Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter segment name"
                    disabled={isReadOnly}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description for this segment"
                    rows={2}
                    disabled={isReadOnly}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Builder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Segment Rules</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{conditionCount} conditions</Badge>
                  <Badge variant="outline">depth: {ruleDepth}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <div className="space-y-4">
                  <SegmentRuleGroupComponent
                    group={rules as SegmentRuleGroup}
                    onChange={handleRuleChange}
                    isReadOnly={isReadOnly}
                    level={0}
                  />
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-white border-2 border-blue-200 rounded-lg p-4 shadow-lg">
                      <div className="text-sm text-gray-500">Moving rule...</div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </CardContent>
          </Card>

          {/* Rule Description */}
          {segmentRuleHelpers.isValidRule(rules) && (
            <Card>
              <CardHeader>
                <CardTitle>Rule Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-mono text-gray-700">
                    {ruleDescription}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <SegmentPreview rules={rules} />
          </div>
        )}
      </div>
    </div>
  );
}