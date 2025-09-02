'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Edit3, 
  Copy, 
  Trash2, 
  Users, 
  Calendar,
  Activity,
  Loader2,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { segmentsApi, SegmentDto, segmentRuleHelpers } from '@/lib/api/segments';
import { useToast } from '@/hooks/use-toast';

interface SegmentListProps {
  onCreateNew?: () => void;
  onEdit?: (segment: SegmentDto) => void;
  onSelect?: (segment: SegmentDto) => void;
  selectionMode?: boolean;
  selectedSegmentId?: string;
}

type SortField = 'name' | 'updatedAt' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function SegmentList({ 
  onCreateNew, 
  onEdit, 
  onSelect, 
  selectionMode = false,
  selectedSegmentId 
}: SegmentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [segmentToDelete, setSegmentToDelete] = useState<SegmentDto | null>(null);
  const [segmentToClone, setSegmentToClone] = useState<SegmentDto | null>(null);
  const [cloneName, setCloneName] = useState('');

  // Fetch segments
  const { 
    data: segments, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['segments', includeInactive],
    queryFn: async () => {
      const response = await segmentsApi.getSegments(includeInactive);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch segments');
      }
      return response.data || [];
    },
  });

  // Delete segment mutation
  const deleteMutation = useMutation({
    mutationFn: async (segmentId: string) => {
      const response = await segmentsApi.deleteSegment(segmentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete segment');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      toast({
        title: "Success",
        description: "Segment deleted successfully",
      });
      setSegmentToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete segment",
        variant: "destructive",
      });
    },
  });

  // Clone segment mutation
  const cloneMutation = useMutation({
    mutationFn: async ({ segmentId, name }: { segmentId: string; name: string }) => {
      const response = await segmentsApi.cloneSegment(segmentId, { name });
      if (!response.success) {
        throw new Error(response.error || 'Failed to clone segment');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      toast({
        title: "Success",
        description: "Segment cloned successfully",
      });
      setSegmentToClone(null);
      setCloneName('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clone segment",
        variant: "destructive",
      });
    },
  });

  // Filter and sort segments
  const filteredAndSortedSegments = React.useMemo(() => {
    if (!segments) return [];

    let filtered = segments.filter(segment => 
      segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (segment.description && segment.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [segments, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleClone = (segment: SegmentDto) => {
    setSegmentToClone(segment);
    setCloneName(`Copy of ${segment.name}`);
  };

  const handleDelete = (segment: SegmentDto) => {
    setSegmentToDelete(segment);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="text-red-600 mb-2">Failed to load segments</div>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectionMode ? 'Select Segment' : 'Segments'}
            </h1>
            <p className="text-sm text-gray-500">
              {selectionMode 
                ? 'Choose a segment for this operation'
                : 'Manage your contact segments and rules'
              }
            </p>
          </div>
          {!selectionMode && onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Segment
            </Button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search segments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => setIncludeInactive(!includeInactive)}
              >
                <input 
                  type="checkbox" 
                  checked={includeInactive} 
                  readOnly
                  className="mr-2"
                />
                Include inactive segments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {sortDirection === 'asc' ? (
                  <SortAsc className="w-4 h-4 mr-2" />
                ) : (
                  <SortDesc className="w-4 h-4 mr-2" />
                )}
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSort('name')}>
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('updatedAt')}>
                Updated {sortField === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('createdAt')}>
                Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Segments List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredAndSortedSegments.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No segments found' : 'No segments yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Create your first segment to start organizing contacts'
                  }
                </p>
                {!searchTerm && !selectionMode && onCreateNew && (
                  <Button onClick={onCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Segment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedSegments.map((segment) => (
              <Card 
                key={segment.id} 
                className={`hover:shadow-md transition-shadow ${
                  selectionMode && selectedSegmentId === segment.id ? 'ring-2 ring-blue-500' : ''
                } ${selectionMode ? 'cursor-pointer' : ''}`}
                onClick={() => selectionMode && onSelect?.(segment)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {getInitials(segment.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {segment.name}
                          </h3>
                          {!segment.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        
                        {segment.description && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {segment.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {segmentRuleHelpers.countConditions(segment.rules)} conditions
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Updated {formatDate(segment.updatedAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {segment.createdByName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!selectionMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(segment)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleClone(segment)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Clone
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(segment)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Clone Dialog */}
      <Dialog open={!!segmentToClone} onOpenChange={() => setSegmentToClone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Segment</DialogTitle>
            <DialogDescription>
              Create a copy of "{segmentToClone?.name}" with a new name.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder="Enter new segment name"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentToClone(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (segmentToClone && cloneName.trim()) {
                  cloneMutation.mutate({ 
                    segmentId: segmentToClone.id, 
                    name: cloneName.trim() 
                  });
                }
              }}
              disabled={!cloneName.trim() || cloneMutation.isPending}
            >
              {cloneMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Clone Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!segmentToDelete} onOpenChange={() => setSegmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Segment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{segmentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (segmentToDelete) {
                  deleteMutation.mutate(segmentToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}