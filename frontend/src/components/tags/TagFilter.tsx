'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { tagsAPI } from '@/lib/api/tags';
import { Tag } from '@/lib/types/tag';
import { Filter, X, Search, Tag as TagIcon, ChevronDown } from 'lucide-react';

interface TagFilterProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  className?: string;
}

export default function TagFilter({ 
  selectedTagIds, 
  onTagsChange, 
  className 
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get all available tags
  const { data: allTags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsAPI.getTags,
  });

  // Filter tags based on search term
  const filteredTags = allTags.filter(tag =>
    searchTerm === '' || tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected tags for display
  const selectedTags = allTags.filter(tag => selectedTagIds.includes(tag.id));

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
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

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  const handleSelectAll = () => {
    onTagsChange(allTags.map(tag => tag.id));
  };

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <div className="flex items-center gap-2">
        <Button
          ref={buttonRef}
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Tags
          {selectedTagIds.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedTagIds.length}
            </Badge>
          )}
          <ChevronDown className="w-4 h-4" />
        </Button>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {selectedTags.map((tag) => (
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
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            
            {selectedTags.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-muted-foreground h-6 px-2"
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-hidden z-50 shadow-lg"
        >
          <CardContent className="p-0">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tags..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filter by tags</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>

            {/* Tag List */}
            <div className="max-h-60 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading tags...
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchTerm ? 'No matching tags found' : 'No tags available'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredTags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTagIds.includes(tag.id)}
                        onCheckedChange={() => handleToggleTag(tag.id)}
                      />
                      
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{tag.name}</div>
                        {tag.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {tag.description}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {tag.contactCount}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-muted/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {selectedTagIds.length} of {allTags.length} tags selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}