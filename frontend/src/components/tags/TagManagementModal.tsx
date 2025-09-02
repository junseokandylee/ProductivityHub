'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { tagsAPI } from '@/lib/api/tags';
import { Tag, CreateTagRequest, UpdateTagRequest, TAG_COLORS } from '@/lib/types/tag';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Tags, 
  Users, 
  AlertCircle,
  Check 
} from 'lucide-react';

interface TagManagementModalProps {
  trigger?: React.ReactNode;
}

export default function TagManagementModal({ trigger }: TagManagementModalProps) {
  const queryClient = useQueryClient();
  
  // State
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateTagRequest>({
    name: '',
    color: TAG_COLORS[0],
    description: ''
  });

  // Queries
  const { 
    data: tags = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsAPI.getTags,
    enabled: open,
  });

  // Mutations
  const createTagMutation = useMutation({
    mutationFn: tagsAPI.createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      resetForm();
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: UpdateTagRequest }) => 
      tagsAPI.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setEditingTag(null);
      resetForm();
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: tagsAPI.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      name: '',
      color: TAG_COLORS[0],
      description: ''
    });
    setIsCreating(false);
    setEditingTag(null);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTag(null);
    resetForm();
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setIsCreating(false);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTag) {
      updateTagMutation.mutate({
        id: editingTag.id,
        data: formData
      });
    } else {
      createTagMutation.mutate(formData);
    }
  };

  const handleDelete = (tag: Tag) => {
    if (tag.contactCount > 0) {
      alert('Cannot delete tag that is in use by contacts');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${tag.name}"?`)) {
      deleteTagMutation.mutate(tag.id);
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Tags className="w-4 h-4" />
            Manage Tags
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Tag Management
          </DialogTitle>
          <DialogDescription>
            Create, edit, and organize tags for your contacts
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 h-full overflow-hidden">
          {/* Tag List */}
          <div className="flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Your Tags</h3>
              <Button 
                onClick={handleCreate}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Tag
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading tags...
              </div>
            ) : error ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error loading tags: {error.message}
                </AlertDescription>
              </Alert>
            ) : tags.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Tags className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tags yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first tag to start organizing contacts
                  </p>
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Tag
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <Card key={tag.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge 
                            style={{ backgroundColor: tag.color, color: '#fff' }}
                            className="border-0"
                          >
                            {tag.name}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {tag.contactCount} contacts
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tag)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(tag)}
                            disabled={tag.contactCount > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {tag.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {tag.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <span>Created {new Date(tag.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Form Panel */}
          {(isCreating || editingTag) && (
            <>
              <Separator orientation="vertical" />
              <div className="w-80 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingTag ? 'Edit Tag' : 'Create New Tag'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter tag name"
                          maxLength={50}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Color *</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full border-2 relative ${
                                formData.color === color 
                                  ? 'border-gray-400' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setFormData({ ...formData, color })}
                            >
                              {formData.color === color && (
                                <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Optional description"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={
                            !formData.name.trim() || 
                            createTagMutation.isPending || 
                            updateTagMutation.isPending
                          }
                          className="flex-1"
                        >
                          {editingTag ? 'Update' : 'Create'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                      </div>

                      {(createTagMutation.error || updateTagMutation.error) && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {createTagMutation.error?.message || updateTagMutation.error?.message}
                          </AlertDescription>
                        </Alert>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}