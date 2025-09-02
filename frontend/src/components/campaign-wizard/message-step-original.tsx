'use client';

import React, { useState, useEffect } from 'react';
import { useWizard } from '@/lib/context/campaign-wizard-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Hash, Eye, Plus, X } from 'lucide-react';

export function MessageStep() {
  const { state, dispatch } = useWizard();
  const [messagePreview, setMessagePreview] = useState('');
  const [newVariableName, setNewVariableName] = useState('');
  const [newVariableValue, setNewVariableValue] = useState('');

  // Common message variables
  const commonVariables = [
    { name: 'firstName', example: 'John' },
    { name: 'lastName', example: 'Doe' },
    { name: 'fullName', example: 'John Doe' },
    { name: 'district', example: 'Seoul Gangnam' },
    { name: 'candidateName', example: 'Kim MinJun' }
  ];

  // Update message preview when content or variables change
  useEffect(() => {
    let preview = state.message.messageBody;
    
    // Replace variables in the preview
    Object.entries(state.message.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      preview = preview.replace(regex, value || `{${key}}`);
    });

    setMessagePreview(preview);
  }, [state.message.messageBody, state.message.variables]);

  const handleMessageChange = (field: keyof typeof state.message, value: string) => {
    dispatch({
      type: 'SET_MESSAGE',
      payload: { [field]: value }
    });
  };

  const handleVariableChange = (variableName: string, value: string) => {
    dispatch({
      type: 'SET_MESSAGE',
      payload: {
        variables: {
          ...state.message.variables,
          [variableName]: value
        }
      }
    });
  };

  const addCommonVariable = (variableName: string) => {
    const example = commonVariables.find(v => v.name === variableName)?.example || '';
    
    dispatch({
      type: 'SET_MESSAGE',
      payload: {
        variables: {
          ...state.message.variables,
          [variableName]: example
        }
      }
    });

    // Insert variable into message body at cursor position
    const variableTag = `{{${variableName}}}`;
    const currentMessage = state.message.messageBody;
    const updatedMessage = currentMessage + (currentMessage ? ' ' : '') + variableTag;
    
    handleMessageChange('messageBody', updatedMessage);
  };

  const addCustomVariable = () => {
    if (newVariableName.trim() && !state.message.variables[newVariableName]) {
      dispatch({
        type: 'SET_MESSAGE',
        payload: {
          variables: {
            ...state.message.variables,
            [newVariableName]: newVariableValue
          }
        }
      });

      // Insert variable into message body
      const variableTag = `{{${newVariableName}}}`;
      const currentMessage = state.message.messageBody;
      const updatedMessage = currentMessage + (currentMessage ? ' ' : '') + variableTag;
      
      handleMessageChange('messageBody', updatedMessage);
      
      setNewVariableName('');
      setNewVariableValue('');
    }
  };

  const removeVariable = (variableName: string) => {
    const { [variableName]: removed, ...remainingVariables } = state.message.variables;
    dispatch({
      type: 'SET_MESSAGE',
      payload: { variables: remainingVariables }
    });
  };

  const insertVariableAtCursor = (variableName: string, textareaRef: HTMLTextAreaElement | null) => {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const text = state.message.messageBody;
    const variableTag = `{{${variableName}}}`;
    
    const newText = text.substring(0, start) + variableTag + text.substring(end);
    handleMessageChange('messageBody', newText);

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textareaRef.focus();
      textareaRef.setSelectionRange(start + variableTag.length, start + variableTag.length);
    }, 0);
  };

  const getCharacterCount = () => state.message.messageBody.length;
  const getCharacterStatus = () => {
    const count = getCharacterCount();
    if (count > 2000) return { color: 'text-red-600', message: 'Message too long' };
    if (count > 1800) return { color: 'text-orange-600', message: 'Approaching limit' };
    return { color: 'text-gray-600', message: 'Good length' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-500" />
          Compose Your Message
        </h2>
        <p className="text-gray-600 mt-1">
          Create your campaign message with personalization variables to engage your audience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Composition */}
        <div className="space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., D-30 Election Notice"
                  value={state.message.name}
                  onChange={(e) => handleMessageChange('name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="message-title">Message Title (Optional)</Label>
                <Input
                  id="message-title"
                  placeholder="e.g., Important Update"
                  value={state.message.messageTitle || ''}
                  onChange={(e) => handleMessageChange('messageTitle', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for Kakao messages and internal organization
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card>
            <CardHeader>
              <CardTitle>Message Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="message-body">Message *</Label>
                <Textarea
                  id="message-body"
                  placeholder="Enter your campaign message here. Use {{variableName}} for personalization."
                  value={state.message.messageBody}
                  onChange={(e) => handleMessageChange('messageBody', e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm ${getCharacterStatus().color}`}>
                    {getCharacterCount()}/2000 characters - {getCharacterStatus().message}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variable Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Common Variables */}
              <div>
                <Label className="text-sm font-medium">Quick Insert</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {commonVariables.map((variable) => (
                    <Button
                      key={variable.name}
                      variant="outline"
                      size="sm"
                      onClick={() => addCommonVariable(variable.name)}
                      disabled={variable.name in state.message.variables}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {variable.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custom Variable */}
              <div>
                <Label className="text-sm font-medium">Add Custom Variable</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Variable name"
                    value={newVariableName}
                    onChange={(e) => setNewVariableName(e.target.value.replace(/\s/g, ''))}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Example value"
                    value={newVariableValue}
                    onChange={(e) => setNewVariableValue(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addCustomVariable} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Active Variables */}
              {Object.keys(state.message.variables).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Active Variables</Label>
                  <div className="space-y-2 mt-2">
                    {Object.entries(state.message.variables).map(([name, value]) => (
                      <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Badge variant="secondary" className="font-mono">
                          {`{{${name}}}`}
                        </Badge>
                        <Input
                          value={value}
                          onChange={(e) => handleVariableChange(name, e.target.value)}
                          placeholder="Example value"
                          className="flex-1 h-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariable(name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Message Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* SMS Preview */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">SMS Preview</Label>
                  <div className="mt-2 p-4 bg-gray-900 text-white rounded-lg font-mono text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <div>
                        {messagePreview || (
                          <span className="text-gray-400">Your message will appear here...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kakao Preview */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Kakao Preview</Label>
                  <div className="mt-2 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      {state.message.messageTitle && (
                        <div className="font-semibold text-gray-900 mb-2">
                          {state.message.messageTitle}
                        </div>
                      )}
                      <div className="text-gray-800 text-sm leading-relaxed">
                        {messagePreview || (
                          <span className="text-gray-400">Your message will appear here...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Stats */}
                <div className="text-xs text-gray-500 space-y-1">
                  <div>SMS Length: {messagePreview.length} characters</div>
                  <div>Estimated SMS Parts: {Math.ceil(messagePreview.length / 70)}</div>
                  <div>Variables: {Object.keys(state.message.variables).length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Validation Errors */}
      {state.errors[2] && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">
            {state.errors[2].map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}