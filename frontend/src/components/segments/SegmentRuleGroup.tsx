'use client';

import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, GripVertical, Trash2, MoreHorizontal } from 'lucide-react';
import { SegmentRule, SegmentRuleGroup, SegmentRuleCondition, segmentRuleHelpers } from '@/lib/api/segments';
import { SegmentRuleConditionComponent } from './SegmentRuleCondition';

interface SegmentRuleGroupComponentProps {
  group: SegmentRuleGroup;
  onChange: (rule: SegmentRule) => void;
  onRemove?: () => void;
  isReadOnly?: boolean;
  level: number;
  isDraggable?: boolean;
}

export function SegmentRuleGroupComponent({ 
  group, 
  onChange, 
  onRemove, 
  isReadOnly = false,
  level = 0,
  isDraggable = false
}: SegmentRuleGroupComponentProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group-${level}-${group.operator}`,
    disabled: !isDraggable || isReadOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleOperatorChange = (operator: 'and' | 'or') => {
    onChange({
      ...group,
      operator,
    });
  };

  const handleAddCondition = () => {
    const newCondition = segmentRuleHelpers.createCondition();
    onChange({
      ...group,
      children: [...group.children, newCondition],
    });
  };

  const handleAddGroup = () => {
    const newGroup = segmentRuleHelpers.createGroup('and');
    onChange({
      ...group,
      children: [...group.children, newGroup],
    });
  };

  const handleChildChange = (index: number, newChild: SegmentRule) => {
    const newChildren = [...group.children];
    newChildren[index] = newChild;
    onChange({
      ...group,
      children: newChildren,
    });
  };

  const handleChildRemove = (index: number) => {
    const newChildren = group.children.filter((_, i) => i !== index);
    onChange({
      ...group,
      children: newChildren,
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id.split('-').pop());
      const newIndex = parseInt(over.id.split('-').pop());
      
      const newChildren = arrayMove(group.children, oldIndex, newIndex);
      onChange({
        ...group,
        children: newChildren,
      });
    }
    setDraggedIndex(null);
  };

  const canRemove = level > 0 && onRemove;
  const maxDepth = 5;
  const canAddGroups = level < maxDepth;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`border-2 border-dashed rounded-lg p-4 space-y-4 ${
        level === 0 
          ? 'border-gray-300 bg-gray-50/50' 
          : level === 1 
          ? 'border-blue-200 bg-blue-50/30'
          : level === 2
          ? 'border-green-200 bg-green-50/30'
          : 'border-purple-200 bg-purple-50/30'
      } ${isDragging ? 'shadow-lg' : ''}`}
      {...attributes}
    >
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isDraggable && !isReadOnly && (
            <button
              className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600"
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <Badge variant={level === 0 ? "default" : "secondary"}>
              {level === 0 ? 'Root Group' : `Group Level ${level}`}
            </Badge>
            
            {!isReadOnly && (
              <Select value={group.operator} onValueChange={handleOperatorChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {isReadOnly && (
              <Badge variant="outline">
                {group.operator.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleAddCondition}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Condition
                  </DropdownMenuItem>
                  {canAddGroups && (
                    <DropdownMenuItem onClick={handleAddGroup}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Group
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {canRemove && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRemove}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {group.children.length > 0 ? (
        <SortableContext 
          items={group.children.map((_, index) => `child-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {group.children.map((child, index) => {
              if (index > 0) {
                return (
                  <div key={`child-${index}`}>
                    <div className="flex justify-center my-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-2 py-1 ${
                          group.operator === 'and' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {group.operator.toUpperCase()}
                      </Badge>
                    </div>
                    {child.type === 'group' ? (
                      <SegmentRuleGroupComponent
                        group={child as SegmentRuleGroup}
                        onChange={(newChild) => handleChildChange(index, newChild)}
                        onRemove={() => handleChildRemove(index)}
                        isReadOnly={isReadOnly}
                        level={level + 1}
                        isDraggable={true}
                      />
                    ) : (
                      <SegmentRuleConditionComponent
                        condition={child as SegmentRuleCondition}
                        onChange={(newChild) => handleChildChange(index, newChild)}
                        onRemove={() => handleChildRemove(index)}
                        isReadOnly={isReadOnly}
                        isDraggable={true}
                      />
                    )}
                  </div>
                );
              }

              return (
                <div key={`child-${index}`}>
                  {child.type === 'group' ? (
                    <SegmentRuleGroupComponent
                      group={child as SegmentRuleGroup}
                      onChange={(newChild) => handleChildChange(index, newChild)}
                      onRemove={() => handleChildRemove(index)}
                      isReadOnly={isReadOnly}
                      level={level + 1}
                      isDraggable={true}
                    />
                  ) : (
                    <SegmentRuleConditionComponent
                      condition={child as SegmentRuleCondition}
                      onChange={(newChild) => handleChildChange(index, newChild)}
                      onRemove={() => handleChildRemove(index)}
                      isReadOnly={isReadOnly}
                      isDraggable={true}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm mb-4">This group is empty</p>
          {!isReadOnly && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddCondition}>
                <Plus className="w-4 h-4 mr-1" />
                Add Condition
              </Button>
              {canAddGroups && (
                <Button variant="outline" size="sm" onClick={handleAddGroup}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Group
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}