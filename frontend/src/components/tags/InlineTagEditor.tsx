'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { tagsAPI } from '@/lib/api/tags';
import { Tag } from '@/lib/types/tag';
import { Plus, X, Search, Tag as TagIcon } from 'lucide-react';

interface InlineTagEditorProps {
  contactId: string;
  currentTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  className?: string;
}

export default function InlineTagEditor({ 
  contactId, 
  currentTags, 
  onTagsChange,
  className 
}: InlineTagEditorProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get all available tags
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsAPI.getTags,
  });

  // Mutations for adding/removing tags
  const assignTagMutation = useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: string, tagId: string }) =>
      tagsAPI.assignTagToContact(contactId, { tagId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error) => {
      console.error('Failed to assign tag:', error);
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({ contactId, tagId }: { contactId: string, tagId: string }) =>
      tagsAPI.removeTagFromContact(contactId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error) => {
      console.error('Failed to remove tag:', error);
    },
  });

  // Filter available tags based on search and exclude current tags
  const currentTagIds = new Set(currentTags.map(tag => tag.id));
  const availableTags = allTags.filter(tag => 
    !currentTagIds.has(tag.id) &&
    (searchTerm === '' || tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAddTag = async (tag: Tag) => {
    try {
      await assignTagMutation.mutateAsync({ contactId, tagId: tag.id });
      
      // Optimistic update
      const updatedTags = [...currentTags, tag];
      onTagsChange?.(updatedTags);
      
      setIsOpen(false);
      setSearchTerm('');
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagMutation.mutateAsync({ contactId, tagId });
      
      // Optimistic update
      const updatedTags = currentTags.filter(tag => tag.id !== tagId);
      onTagsChange?.(updatedTags);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && availableTags.length > 0) {
      // Could implement keyboard navigation here
      e.preventDefault();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Current Tags */}
      <div className="flex flex-wrap items-center gap-1">
        {currentTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pr-1"
            style={{ 
              backgroundColor: tag.color + '20', 
              color: tag.color,
              borderColor: tag.color + '30'
            }}
          >
            {tag.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleRemoveTag(tag.id)}
              disabled={removeTagMutation.isPending}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        
        {/* Add Tag Button/Input */}
        <div className="relative">
          {!isOpen ? (
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          ) : (
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleInputFocus}
              onKeyDown={handleInputKeyDown}
              placeholder="Search tags..."
              className="h-6 w-32 text-xs"
              autoFocus
            />
          )}

          {/* Dropdown */}
          {isOpen && (
            <Card 
              ref={dropdownRef}
              className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-auto z-50 shadow-lg"
            >
              <CardContent className="p-2">
                {availableTags.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchTerm ? 'No matching tags found' : 'No more tags available'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Search className="w-3 h-3" />
                      Available tags
                    </div>
                    {availableTags.map((tag) => (
                      <Button
                        key={tag.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 h-8"
                        onClick={() => handleAddTag(tag)}
                        disabled={assignTagMutation.isPending}
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-left">{tag.name}</span>
                        {tag.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-24">
                            {tag.description}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
                
                {allTags.length === 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      No tags exist yet. Create tags in Tag Management.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}