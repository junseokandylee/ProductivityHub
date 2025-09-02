'use client';

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Trash2, Calendar as CalendarIcon, X } from 'lucide-react';
import { SegmentRuleCondition, segmentFieldsAndOperators } from '@/lib/api/segments';

interface SegmentRuleConditionComponentProps {
  condition: SegmentRuleCondition;
  onChange: (condition: SegmentRuleCondition) => void;
  onRemove?: () => void;
  isReadOnly?: boolean;
  isDraggable?: boolean;
}

export function SegmentRuleConditionComponent({ 
  condition, 
  onChange, 
  onRemove, 
  isReadOnly = false,
  isDraggable = false
}: SegmentRuleConditionComponentProps) {
  const [localValue, setLocalValue] = useState(condition.value || '');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `condition-${condition.field}-${condition.operator}`,
    disabled: !isDraggable || isReadOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Update local value when condition changes
  useEffect(() => {
    setLocalValue(condition.value || '');
  }, [condition.value]);

  const fieldInfo = segmentFieldsAndOperators.fields[condition.field as keyof typeof segmentFieldsAndOperators.fields];
  const availableOperators = segmentFieldsAndOperators.getOperatorsForField(condition.field);

  const handleFieldChange = (field: string) => {
    const newFieldInfo = segmentFieldsAndOperators.fields[field as keyof typeof segmentFieldsAndOperators.fields];
    const newOperators = segmentFieldsAndOperators.getOperatorsForField(field);
    
    onChange({
      ...condition,
      field,
      operator: newOperators[0]?.value || 'equals',
      value: undefined,
    });
    setLocalValue('');
  };

  const handleOperatorChange = (operator: string) => {
    onChange({
      ...condition,
      operator,
      value: segmentFieldsAndOperators.operatorRequiresValue(operator) ? localValue : undefined,
    });
  };

  const handleValueChange = (value: any) => {
    setLocalValue(value);
    onChange({
      ...condition,
      value,
    });
  };

  const handleArrayValueChange = (values: string[]) => {
    onChange({
      ...condition,
      value: values,
    });
  };

  const requiresValue = segmentFieldsAndOperators.operatorRequiresValue(condition.operator);
  const requiresMultiple = segmentFieldsAndOperators.operatorRequiresMultipleValues(condition.operator);

  const renderValueInput = () => {
    if (!requiresValue) return null;

    const fieldType = fieldInfo?.type || 'string';

    if (requiresMultiple) {
      const currentValues = Array.isArray(condition.value) ? condition.value : [];
      
      return (
        <div className="space-y-2">
          <Label>Values</Label>
          <div className="space-y-2">
            {currentValues.map((val, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={val}
                  onChange={(e) => {
                    const newValues = [...currentValues];
                    newValues[index] = e.target.value;
                    handleArrayValueChange(newValues);
                  }}
                  placeholder={`Value ${index + 1}`}
                  disabled={isReadOnly}
                  className="flex-1"
                />
                {!isReadOnly && currentValues.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newValues = currentValues.filter((_, i) => i !== index);
                      handleArrayValueChange(newValues);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {!isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArrayValueChange([...currentValues, ''])}
              >
                Add Value
              </Button>
            )}
          </div>
        </div>
      );
    }

    switch (fieldType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={condition.value === true || condition.value === 'true'}
              onCheckedChange={(checked) => handleValueChange(checked)}
              disabled={isReadOnly}
            />
            <Label>{condition.value ? 'True' : 'False'}</Label>
          </div>
        );

      case 'date':
        if (condition.operator === 'days_ago' || condition.operator === 'in_last_days') {
          return (
            <div>
              <Label>Days</Label>
              <Input
                type="number"
                value={localValue}
                onChange={(e) => handleValueChange(parseInt(e.target.value) || 0)}
                placeholder="Number of days"
                disabled={isReadOnly}
                min={0}
                className="mt-1"
              />
            </div>
          );
        }

        if (condition.operator === 'between') {
          const dates = Array.isArray(condition.value) ? condition.value : ['', ''];
          return (
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={isReadOnly}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dates[0] ? new Date(dates[0]).toLocaleDateString() : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dates[0] ? new Date(dates[0]) : undefined}
                      onSelect={(date) => {
                        const newDates = [date?.toISOString() || '', dates[1]];
                        handleValueChange(newDates);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={isReadOnly}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dates[1] ? new Date(dates[1]).toLocaleDateString() : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dates[1] ? new Date(dates[1]) : undefined}
                      onSelect={(date) => {
                        const newDates = [dates[0], date?.toISOString() || ''];
                        handleValueChange(newDates);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          );
        }

        return (
          <div>
            <Label>Date</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isReadOnly} className="w-full mt-1">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {localValue ? new Date(localValue).toLocaleDateString() : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localValue ? new Date(localValue) : undefined}
                  onSelect={(date) => {
                    handleValueChange(date?.toISOString() || '');
                    setIsDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'number':
        if (condition.operator === 'between') {
          const numbers = Array.isArray(condition.value) ? condition.value : ['', ''];
          return (
            <div className="space-y-2">
              <Label>Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={numbers[0]}
                  onChange={(e) => {
                    const newNumbers = [e.target.value, numbers[1]];
                    handleValueChange(newNumbers);
                  }}
                  placeholder="Min"
                  disabled={isReadOnly}
                />
                <Input
                  type="number"
                  value={numbers[1]}
                  onChange={(e) => {
                    const newNumbers = [numbers[0], e.target.value];
                    handleValueChange(newNumbers);
                  }}
                  placeholder="Max"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          );
        }

        return (
          <div>
            <Label>Value</Label>
            <Input
              type="number"
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter number"
              disabled={isReadOnly}
              className="mt-1"
            />
          </div>
        );

      default:
        return (
          <div>
            <Label>Value</Label>
            <Input
              value={localValue}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Enter value"
              disabled={isReadOnly}
              className="mt-1"
            />
          </div>
        );
    }
  };

  const isValid = condition.field && condition.operator && (
    !requiresValue || 
    (requiresMultiple && Array.isArray(condition.value) && condition.value.length > 0 && condition.value.every(v => v)) ||
    (!requiresMultiple && condition.value !== undefined && condition.value !== '')
  );

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-white ${
        isDragging ? 'shadow-lg border-blue-300' : isValid ? 'border-gray-200' : 'border-red-200'
      }`}
      {...attributes}
    >
      <div className="flex items-start gap-4">
        {isDraggable && !isReadOnly && (
          <button
            className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 mt-6"
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Field Selection */}
          <div>
            <Label>Field</Label>
            {isReadOnly ? (
              <div className="mt-1">
                <Badge variant="outline">
                  {fieldInfo?.label || condition.field}
                </Badge>
              </div>
            ) : (
              <Select value={condition.field} onValueChange={handleFieldChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(segmentFieldsAndOperators.fields).map(([key, field]) => (
                    <SelectItem key={key} value={key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Operator Selection */}
          <div>
            <Label>Operator</Label>
            {isReadOnly ? (
              <div className="mt-1">
                <Badge variant="outline">
                  {availableOperators.find(op => op.value === condition.operator)?.label || condition.operator}
                </Badge>
              </div>
            ) : (
              <Select value={condition.operator} onValueChange={handleOperatorChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map(operator => (
                    <SelectItem key={operator.value} value={operator.value}>
                      {operator.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Value Input */}
          <div>
            {requiresValue && renderValueInput()}
          </div>
        </div>

        {/* Remove Button */}
        {!isReadOnly && onRemove && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Validation indicator */}
      {!isValid && !isReadOnly && (
        <div className="mt-2">
          <Badge variant="destructive" className="text-xs">
            Please configure all required fields
          </Badge>
        </div>
      )}
    </div>
  );
}