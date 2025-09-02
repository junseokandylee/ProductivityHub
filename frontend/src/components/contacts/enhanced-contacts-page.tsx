'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from 'react-use';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Download, 
  Trash2,
  Tag as TagIcon,
  Users,
  ArrowUpDown,
  X,
  Undo2
} from 'lucide-react';

import { contactsAPI } from '@/lib/api/contacts';
import { Contact, ContactSearchParams } from '@/lib/types/contact';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  LoadingSpinner, 
  LoadingTableRows, 
  LoadingCard,
  Skeleton 
} from '@/components/ui/enhanced-loading';
import { 
  ErrorBoundary, 
  QueryErrorFallback 
} from '@/components/ui/error-boundary';
import { 
  SkipLink, 
  FocusTrap, 
  Announcement,
  KeyboardShortcuts,
  RovingTabIndex,
  VisuallyHidden,
  useReducedMotion
} from '@/components/ui/accessibility';

const columnHelper = createColumnHelper<Contact>();

interface BulkAction {
  type: 'tag' | 'delete' | 'export' | 'activate' | 'deactivate';
  data?: any;
}

export default function EnhancedContactsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [undoStack, setUndoStack] = useState<Array<{
    action: string;
    data: any;
    timestamp: number;
  }>>([]);

  // Debounce search with accessibility announcement
  useDebounce(() => {
    setDebouncedSearchQuery(searchQuery);
    if (searchQuery) {
      setAnnouncement(`"${searchQuery}"로 검색 중...`);
    }
  }, 350, [searchQuery]);

  // Search params with memoization
  const searchParams: ContactSearchParams = useMemo(() => ({
    search: debouncedSearchQuery || undefined,
    isActive: isActiveFilter,
    tagIds: selectedTags.length > 0 ? selectedTags : undefined,
    limit: 50,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  }), [debouncedSearchQuery, isActiveFilter, selectedTags]);

  // Main contacts query
  const {
    data: contactsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['contacts', searchParams],
    queryFn: () => contactsAPI.searchContacts(searchParams),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    enabled: !debouncedSearchQuery || debouncedSearchQuery.length >= 1,
    onSuccess: (data) => {
      setAnnouncement(`${data.totalCount}개의 연락처를 찾았습니다`);
    },
    onError: () => {
      setAnnouncement('연락처를 불러오는 중 오류가 발생했습니다');
    }
  });

  // Tags query
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => contactsAPI.getTags(),
    staleTime: 1000 * 60 * 5,
  });

  // Bulk delete mutation with undo
  const bulkDeleteMutation = useMutation({
    mutationFn: (contactIds: string[]) => contactsAPI.bulkDelete(contactIds),
    onSuccess: (_, contactIds) => {
      // Add to undo stack
      const undoData = {
        action: 'bulk_delete',
        data: { contactIds },
        timestamp: Date.now()
      };
      setUndoStack(prev => [...prev.slice(-4), undoData]);
      
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedContacts([]);
      
      toast({
        title: "연락처 삭제됨",
        description: `${contactIds.length}개의 연락처가 삭제되었습니다.`,
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUndo}
            className="ml-2"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            실행 취소
          </Button>
        ),
      });
      
      setAnnouncement(`${contactIds.length}개의 연락처가 삭제되었습니다. 실행 취소가 가능합니다.`);
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "연락처 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      setAnnouncement('연락처 삭제에 실패했습니다');
    }
  });

  // Undo mutation
  const undoMutation = useMutation({
    mutationFn: (undoData: any) => {
      // Implement undo logic based on action type
      switch (undoData.action) {
        case 'bulk_delete':
          return contactsAPI.restoreContacts(undoData.data.contactIds);
        default:
          return Promise.resolve();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: "실행 취소됨",
        description: "작업이 취소되었습니다.",
      });
      setAnnouncement('작업이 실행 취소되었습니다');
    }
  });

  // Event handlers
  const handleContactView = useCallback((contactId: string) => {
    router.push(`/contacts/${contactId}`);
  }, [router]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleTagFilter = useCallback((tagId: string, checked: boolean) => {
    setSelectedTags(prev => 
      checked 
        ? [...prev, tagId]
        : prev.filter(id => id !== tagId)
    );
  }, []);

  const handleActiveFilter = useCallback((value: boolean | undefined) => {
    setIsActiveFilter(value);
  }, []);

  const handleSelectContact = useCallback((contactId: string, selected: boolean) => {
    setSelectedContacts(prev =>
      selected 
        ? [...prev, contactId]
        : prev.filter(id => id !== contactId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && contactsResponse?.contacts) {
      setSelectedContacts(contactsResponse.contacts.map(c => c.id));
      setAnnouncement(`${contactsResponse.contacts.length}개의 연락처가 모두 선택되었습니다`);
    } else {
      setSelectedContacts([]);
      setAnnouncement('모든 선택이 해제되었습니다');
    }
  }, [contactsResponse?.contacts]);

  const handleBulkDelete = useCallback(() => {
    if (selectedContacts.length === 0) return;
    setShowDeleteDialog(true);
  }, [selectedContacts]);

  const confirmBulkDelete = useCallback(() => {
    bulkDeleteMutation.mutate(selectedContacts);
    setShowDeleteDialog(false);
  }, [selectedContacts, bulkDeleteMutation]);

  const handleUndo = useCallback(() => {
    const lastAction = undoStack[undoStack.length - 1];
    if (lastAction && Date.now() - lastAction.timestamp < 30000) { // 30 second limit
      undoMutation.mutate(lastAction);
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, undoMutation]);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    { key: 'ctrl+a', description: '모두 선택', action: () => handleSelectAll(true) },
    { key: 'ctrl+d', description: '선택 해제', action: () => handleSelectAll(false) },
    { key: 'Delete', description: '선택된 항목 삭제', action: handleBulkDelete },
    { key: 'ctrl+z', description: '실행 취소', action: handleUndo },
    { key: 'ctrl+f', description: '검색', action: () => {
      const searchInput = document.querySelector('input[placeholder*="검색"]') as HTMLInputElement;
      searchInput?.focus();
    }},
  ], [handleSelectAll, handleBulkDelete, handleUndo]);

  // Table columns with accessibility
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => {
                table.toggleAllPageRowsSelected(!!value);
                handleSelectAll(!!value);
              }}
              aria-label="모든 연락처 선택"
            />
            <VisuallyHidden>선택</VisuallyHidden>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => {
                row.toggleSelected(!!value);
                handleSelectContact(row.original.id, !!value);
              }}
              aria-label={`${row.original.fullName} 선택`}
            />
          </div>
        ),
        size: 50,
      }),
      columnHelper.accessor('fullName', {
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium text-left justify-start"
          >
            이름
            <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
            <VisuallyHidden>
              이름 정렬 {column.getIsSorted() === 'asc' ? '오름차순' : '내림차순'}
            </VisuallyHidden>
          </Button>
        ),
        cell: info => (
          <button
            onClick={() => handleContactView(info.row.original.id)}
            className="font-medium text-gray-900 hover:text-blue-600 focus:outline-none focus:underline text-left"
            aria-label={`${info.getValue()} 연락처 상세보기`}
          >
            {info.getValue()}
          </button>
        ),
        size: 200,
      }),
      columnHelper.accessor('phone', {
        header: '전화번호',
        cell: info => (
          <div className="text-gray-600 font-mono text-sm">
            {info.getValue() || (
              <span className="text-gray-400" aria-label="전화번호 없음">-</span>
            )}
          </div>
        ),
        size: 150,
      }),
      columnHelper.accessor('email', {
        header: '이메일',
        cell: info => (
          <div className="text-gray-600 text-sm">
            {info.getValue() || (
              <span className="text-gray-400" aria-label="이메일 없음">-</span>
            )}
          </div>
        ),
        size: 200,
      }),
      columnHelper.accessor('kakaoId', {
        header: '카카오 ID',
        cell: info => (
          <div className="text-gray-600 text-sm">
            {info.getValue() || (
              <span className="text-gray-400" aria-label="카카오 ID 없음">-</span>
            )}
          </div>
        ),
        size: 120,
      }),
      columnHelper.accessor('tags', {
        header: '태그',
        cell: info => (
          <div className="flex flex-wrap gap-1" role="list" aria-label="태그 목록">
            {info.getValue().length > 0 ? (
              info.getValue().map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: tag.color, color: tag.color }}
                  role="listitem"
                >
                  {tag.name}
                </Badge>
              ))
            ) : (
              <span className="text-gray-400 text-xs" aria-label="태그 없음">태그 없음</span>
            )}
          </div>
        ),
        size: 200,
      }),
      columnHelper.accessor('isActive', {
        header: '상태',
        cell: info => (
          <Badge 
            variant={info.getValue() ? 'default' : 'secondary'}
            aria-label={`상태: ${info.getValue() ? '활성' : '비활성'}`}
          >
            {info.getValue() ? '활성' : '비활성'}
          </Badge>
        ),
        size: 80,
      }),
      columnHelper.accessor('updatedAt', {
        header: '수정일',
        cell: info => (
          <time 
            dateTime={info.getValue()}
            className="text-gray-500 text-sm"
          >
            {new Date(info.getValue()).toLocaleDateString('ko-KR')}
          </time>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: <VisuallyHidden>작업</VisuallyHidden>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                aria-label={`${row.original.fullName} 작업 메뉴`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleContactView(row.original.id)}>
                <Users className="w-4 h-4 mr-2" />
                상세보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleContactView(row.original.id)}>
                <TagIcon className="w-4 h-4 mr-2" />
                태그 관리
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => {
                  setSelectedContacts([row.original.id]);
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 50,
      }),
    ],
    [handleContactView, handleSelectAll, handleSelectContact]
  );

  // React Table instance
  const table = useReactTable({
    data: contactsResponse?.contacts || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Virtualization
  const { rows } = table.getRowModel();
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 15,
  });

  const items = virtualizer.getVirtualItems();

  // Error boundary fallback
  const errorFallback = useCallback((props: any) => (
    <QueryErrorFallback
      {...props}
      onRetry={() => refetch()}
    />
  ), [refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SkipLink href="#main-content">메인 콘텐츠로 건너뛰기</SkipLink>
        
        {/* Header Skeleton */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </header>

        <main id="main-content" className="max-w-7xl mx-auto py-6 px-4">
          {/* Search Skeleton */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="flex-1 h-10" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </Card>

          {/* Table Skeleton */}
          <Card>
            <LoadingTableRows count={8} />
          </Card>
        </main>
        
        <Announcement message="연락처 목록을 불러오는 중입니다" />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={errorFallback}>
      <div className="min-h-screen bg-gray-50">
        <SkipLink href="#main-content">메인 콘텐츠로 건너뛰기</SkipLink>
        <KeyboardShortcuts shortcuts={shortcuts} />
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">연락처 관리</h1>
                <p className="text-gray-600 mt-1">
                  {contactsResponse?.totalCount?.toLocaleString() || 0}개의 연락처
                  {selectedContacts.length > 0 && (
                    <span className="ml-2">
                      ({selectedContacts.length}개 선택됨)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedContacts.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2"
                    aria-label={`선택된 ${selectedContacts.length}개 연락처 삭제`}
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제 ({selectedContacts.length})
                  </Button>
                )}
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  연락처 추가
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="max-w-7xl mx-auto py-6 px-4">
          {/* Search and Filters */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <label htmlFor="contact-search" className="sr-only">
                    연락처 검색
                  </label>
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" 
                    aria-hidden="true"
                  />
                  <Input
                    id="contact-search"
                    placeholder="이름, 전화번호, 이메일, 카카오 ID로 검색..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`pl-10 ${isFetching ? 'opacity-75' : ''}`}
                    aria-describedby="search-help"
                  />
                  <div id="search-help" className="sr-only">
                    연락처의 이름, 전화번호, 이메일 또는 카카오 ID로 검색할 수 있습니다
                  </div>
                  {isFetching && (
                    <div 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      aria-label="검색 중"
                    >
                      <LoadingSpinner size="sm" className="text-blue-600" />
                    </div>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      aria-label={`필터 메뉴 ${
                        selectedTags.length > 0 || isActiveFilter !== undefined 
                          ? `(${selectedTags.length + (isActiveFilter !== undefined ? 1 : 0)}개 적용됨)` 
                          : ''
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      필터
                      {(selectedTags.length > 0 || isActiveFilter !== undefined) && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {selectedTags.length + (isActiveFilter !== undefined ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80" align="end">
                    <div className="px-2 py-1.5 text-sm font-medium">상태 필터</div>
                    <RovingTabIndex orientation="vertical">
                      <DropdownMenuCheckboxItem
                        checked={isActiveFilter === undefined}
                        onCheckedChange={() => handleActiveFilter(undefined)}
                        role="option"
                      >
                        전체
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={isActiveFilter === true}
                        onCheckedChange={() => handleActiveFilter(true)}
                        role="option"
                      >
                        활성
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={isActiveFilter === false}
                        onCheckedChange={() => handleActiveFilter(false)}
                        role="option"
                      >
                        비활성
                      </DropdownMenuCheckboxItem>
                    </RovingTabIndex>
                    
                    {tags && tags.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm font-medium">태그 필터</div>
                        <RovingTabIndex orientation="vertical">
                          {tags.slice(0, 10).map((tag) => (
                            <DropdownMenuCheckboxItem
                              key={tag.id}
                              checked={selectedTags.includes(tag.id)}
                              onCheckedChange={(checked) => {
                                handleTagFilter(tag.id, !!checked);
                              }}
                              role="option"
                            >
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                  aria-hidden="true"
                                />
                                {tag.name}
                                <span className="text-xs text-gray-500">
                                  ({tag.contactCount})
                                </span>
                              </div>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </RovingTabIndex>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTags([]);
                        setIsActiveFilter(undefined);
                        setAnnouncement('모든 필터가 초기화되었습니다');
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      필터 초기화
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex" style={{ width: table.getTotalSize() }}>
                  {table.getHeaderGroups()[0].headers.map((header) => (
                    <div
                      key={header.id}
                      className="font-medium text-gray-900 text-sm"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  ))}
                </div>
              </div>

              {/* Virtualized Table Body */}
              <div
                ref={parentRef}
                className="overflow-auto"
                style={{ height: '600px' }}
                role="grid"
                aria-label="연락처 목록"
                aria-rowcount={rows.length}
              >
                {contactsResponse?.contacts.length === 0 ? (
                  // Enhanced Empty State
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className="w-24 h-24 mx-auto mb-4 text-gray-300" aria-hidden="true">
                      <Users size={96} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery || selectedTags.length > 0 || isActiveFilter !== undefined
                        ? '검색 결과가 없습니다'
                        : '연락처가 없습니다'}
                    </h3>
                    <p className="text-gray-600 text-center max-w-sm mb-6">
                      {searchQuery || selectedTags.length > 0 || isActiveFilter !== undefined
                        ? '검색 조건에 맞는 연락처가 없습니다. 다른 검색어나 필터를 시도해보세요.'
                        : '첫 번째 연락처를 추가하여 시작하세요.'}
                    </p>
                    <div className="flex gap-2">
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        연락처 추가
                      </Button>
                      {(searchQuery || selectedTags.length > 0 || isActiveFilter !== undefined) && (
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedTags([]);
                            setIsActiveFilter(undefined);
                          }}
                        >
                          필터 초기화
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: virtualizer.getTotalSize(),
                      position: 'relative',
                    }}
                  >
                    {items.map((virtualItem) => {
                      const row = rows[virtualItem.index] as Row<Contact>;
                      return (
                        <div
                          key={row.id}
                          data-index={virtualItem.index}
                          ref={(node) => virtualizer.measureElement(node)}
                          className={`absolute top-0 left-0 w-full px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            virtualItem.index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } ${
                            !prefersReducedMotion ? 'transition-colors duration-150' : ''
                          }`}
                          style={{
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                          role="row"
                          aria-rowindex={virtualItem.index + 1}
                        >
                          <div className="flex" style={{ width: table.getTotalSize() }}>
                            {row.getVisibleCells().map((cell) => (
                              <div
                                key={cell.id}
                                className="flex items-center"
                                style={{ width: cell.column.getSize() }}
                                role="gridcell"
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mt-6">
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 text-red-500">
                  <AlertTriangle size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  연결에 문제가 있습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  연락처를 불러오는 중 오류가 발생했습니다.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  다시 시도
                </Button>
              </div>
            </Card>
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <FocusTrap active={showDeleteDialog}>
              <AlertDialogHeader>
                <AlertDialogTitle>연락처 삭제 확인</AlertDialogTitle>
                <AlertDialogDescription>
                  선택한 {selectedContacts.length}개의 연락처를 삭제하시겠습니까?
                  이 작업은 30초 내에 실행 취소할 수 있습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                  취소
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmBulkDelete}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </FocusTrap>
          </AlertDialogContent>
        </AlertDialog>

        {/* Live announcements */}
        {announcement && (
          <Announcement message={announcement} />
        )}
      </div>
    </ErrorBoundary>
  );
}