'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from 'react-use';
import { Search, Filter, Plus, MoreHorizontal, TrendingUp, Activity } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { contactsAPI } from '@/lib/api/contacts';
import { Contact, ContactSearchParams } from '@/lib/types/contact';
import { ContactWithScore } from '@/lib/api/activity-score';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import SmartLists from './smart-lists';

const columnHelper = createColumnHelper<Contact | ContactWithScore>();

// Activity score badge component
const ActivityScoreBadge = ({ score }: { score: number }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return '높음';
    if (score >= 30) return '중간';
    return '낮음';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`text-xs ${getScoreColor(score)}`}>
        {score.toFixed(1)}
      </Badge>
      <span className="text-xs text-gray-500">{getScoreLabel(score)}</span>
    </div>
  );
};

export default function ContactsWithSmartLists() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [selectedSmartList, setSelectedSmartList] = useState<string | null>(null);
  const [smartListContacts, setSmartListContacts] = useState<ContactWithScore[]>([]);
  
  // Debounce the search query with performance optimization
  useDebounce(() => {
    setDebouncedSearchQuery(searchQuery);
  }, 350, [searchQuery]);

  // Prepare search params
  const searchParams: ContactSearchParams = useMemo(() => ({
    search: debouncedSearchQuery || undefined,
    isActive: isActiveFilter,
    tagIds: selectedTags.length > 0 ? selectedTags : undefined,
    limit: 50,
    sortBy: 'activityScore', // Sort by activity score by default
    sortOrder: 'desc',
  }), [debouncedSearchQuery, isActiveFilter, selectedTags]);

  // Fetch contacts data with performance optimizations
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
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    enabled: (!debouncedSearchQuery || debouncedSearchQuery.length >= 1) && !selectedSmartList,
  });

  // Fetch tags for filtering
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => contactsAPI.getTags(),
    staleTime: 1000 * 60 * 5,
  });

  // Use smart list contacts when selected, otherwise use search results
  const displayContacts = selectedSmartList ? smartListContacts : (contactsResponse?.contacts || []);

  // Memoized router navigation for performance
  const handleContactView = useCallback((contactId: string) => {
    router.push(`/contacts/${contactId}`);
  }, [router]);

  // Check if contact has activity score
  const hasActivityScore = (contact: Contact | ContactWithScore): contact is ContactWithScore => {
    return 'activityScore' in contact;
  };

  // Table columns definition with activity score
  const columns = useMemo(
    () => [
      columnHelper.accessor('fullName', {
        header: '이름',
        cell: info => (
          <div className="font-medium text-gray-900">
            {info.getValue()}
          </div>
        ),
        size: 180,
      }),
      columnHelper.display({
        id: 'activityScore',
        header: () => (
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            활동 점수
          </div>
        ),
        cell: ({ row }) => {
          const contact = row.original;
          if (hasActivityScore(contact)) {
            return <ActivityScoreBadge score={contact.activityScore} />;
          }
          return <span className="text-gray-400 text-xs">-</span>;
        },
        size: 120,
      }),
      columnHelper.accessor('phone', {
        header: '전화번호',
        cell: info => (
          <div className="text-gray-600 font-mono text-sm">
            {info.getValue() || '-'}
          </div>
        ),
        size: 140,
      }),
      columnHelper.accessor('email', {
        header: '이메일',
        cell: info => (
          <div className="text-gray-600 text-sm">
            {info.getValue() || '-'}
          </div>
        ),
        size: 180,
      }),
      columnHelper.accessor('kakaoId', {
        header: '카카오 ID',
        cell: info => (
          <div className="text-gray-600 text-sm">
            {info.getValue() || '-'}
          </div>
        ),
        size: 110,
      }),
      columnHelper.accessor('tags', {
        header: '태그',
        cell: info => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().slice(0, 2).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
            {info.getValue().length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{info.getValue().length - 2}
              </Badge>
            )}
          </div>
        ),
        size: 150,
      }),
      columnHelper.accessor('isActive', {
        header: '상태',
        cell: info => (
          <Badge variant={info.getValue() ? 'default' : 'secondary'}>
            {info.getValue() ? '활성' : '비활성'}
          </Badge>
        ),
        size: 70,
      }),
      columnHelper.display({
        id: 'lastActivity',
        header: '마지막 활동',
        cell: ({ row }) => {
          const contact = row.original;
          if (hasActivityScore(contact) && contact.lastActivityAt) {
            return (
              <div className="text-gray-500 text-sm">
                {new Date(contact.lastActivityAt).toLocaleDateString('ko-KR')}
              </div>
            );
          }
          return <span className="text-gray-400 text-xs">-</span>;
        },
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleContactView(row.original.id)}>
                보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleContactView(row.original.id)}>
                수정
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">삭제</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 50,
      }),
    ],
    [handleContactView]
  );

  // React Table instance
  const table = useReactTable({
    data: displayContacts,
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
    scrollMargin: parentRef.current?.offsetTop ?? 0,
    lanes: 1,
  });

  const items = virtualizer.getVirtualItems();

  // Handle search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    // Clear smart list selection when searching
    if (selectedSmartList) {
      setSelectedSmartList(null);
      setSmartListContacts([]);
    }
  }, [selectedSmartList]);

  // Handle tag filter
  const handleTagFilter = useCallback((tagId: string, checked: boolean) => {
    setSelectedTags(prev => 
      checked 
        ? [...prev, tagId]
        : prev.filter(id => id !== tagId)
    );
    // Clear smart list selection when filtering
    if (selectedSmartList) {
      setSelectedSmartList(null);
      setSmartListContacts([]);
    }
  }, [selectedSmartList]);

  // Handle active filter
  const handleActiveFilter = useCallback((value: boolean | undefined) => {
    setIsActiveFilter(value);
    // Clear smart list selection when filtering
    if (selectedSmartList) {
      setSelectedSmartList(null);
      setSmartListContacts([]);
    }
  }, [selectedSmartList]);

  // Handle smart list contacts change
  const handleSmartListContactsChange = useCallback((contacts: ContactWithScore[]) => {
    setSmartListContacts(contacts);
  }, []);

  // Handle smart list selection
  const handleSmartListSelect = useCallback((listId: string | null) => {
    setSelectedSmartList(listId);
    // Clear search and filters when selecting smart list
    if (listId && listId !== 'all-contacts') {
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setSelectedTags([]);
      setIsActiveFilter(undefined);
    }
  }, []);

  // Get total count
  const totalCount = selectedSmartList 
    ? smartListContacts.length
    : (contactsResponse?.totalCount || 0);

  // Loading state
  if (isLoading && !selectedSmartList) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          {/* Header skeleton and loading content */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto py-6 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-8 bg-gray-300 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto py-6 px-4">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <Card className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className="col-span-9">
                <Card className="mb-6 p-6">
                  <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                </Card>
                <Card className="p-6">
                  <div className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  연락처 관리
                  {selectedSmartList && (
                    <Badge variant="outline" className="ml-2">
                      Smart List
                    </Badge>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  {totalCount.toLocaleString()}개의 연락처
                  {selectedSmartList && selectedSmartList !== 'all-contacts' && (
                    <span className="text-blue-600 ml-1">(필터링됨)</span>
                  )}
                </p>
              </div>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                연락처 추가
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="grid grid-cols-12 gap-6">
            {/* Smart Lists Sidebar */}
            <div className="col-span-3">
              <SmartLists
                onContactsChange={handleSmartListContactsChange}
                selectedList={selectedSmartList}
                onListSelect={handleSmartListSelect}
              />
            </div>

            {/* Main Content Area */}
            <div className="col-span-9">
              {/* Search and Filters - Hide when smart list is active */}
              {(!selectedSmartList || selectedSmartList === 'all-contacts') && (
                <Card className="mb-6">
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="이름, 전화번호, 이메일, 카카오 ID로 검색..."
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className={`pl-10 ${isFetching ? 'opacity-75' : ''}`}
                        />
                        {isFetching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex items-center gap-2">
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
                          <DropdownMenuCheckboxItem
                            checked={isActiveFilter === undefined}
                            onCheckedChange={() => handleActiveFilter(undefined)}
                          >
                            전체
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={isActiveFilter === true}
                            onCheckedChange={() => handleActiveFilter(true)}
                          >
                            활성
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={isActiveFilter === false}
                            onCheckedChange={() => handleActiveFilter(false)}
                          >
                            비활성
                          </DropdownMenuCheckboxItem>
                          
                          {tags && tags.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-sm font-medium">태그 필터</div>
                              {tags.slice(0, 10).map((tag) => (
                                <DropdownMenuCheckboxItem
                                  key={tag.id}
                                  checked={selectedTags.includes(tag.id)}
                                  onCheckedChange={(checked) => {
                                    handleTagFilter(tag.id, !!checked);
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: tag.color }}
                                    />
                                    {tag.name}
                                    <span className="text-xs text-gray-500">({tag.contactCount})</span>
                                  </div>
                                </DropdownMenuCheckboxItem>
                              ))}
                            </>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTags([]);
                              setIsActiveFilter(undefined);
                            }}
                          >
                            필터 초기화
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              )}

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
                  >
                    {displayContacts.length === 0 ? (
                      // Empty State
                      <div className="flex flex-col items-center justify-center h-full py-12">
                        <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={1} 
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {selectedSmartList ? '해당하는 연락처가 없습니다' : '연락처가 없습니다'}
                        </h3>
                        <p className="text-gray-600 text-center max-w-sm mb-6">
                          {selectedSmartList
                            ? '선택한 Smart List에 해당하는 연락처가 없습니다.'
                            : searchQuery || selectedTags.length > 0 || isActiveFilter !== undefined
                            ? '검색 조건에 맞는 연락처가 없습니다. 다른 검색어나 필터를 시도해보세요.'
                            : '첫 번째 연락처를 추가하여 시작하세요.'
                          }
                        </p>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          연락처 추가
                        </Button>
                      </div>
                    ) : (
                      <div
                        style={{
                          height: virtualizer.getTotalSize(),
                          position: 'relative',
                        }}
                      >
                        {items.map((virtualItem) => {
                          const row = rows[virtualItem.index] as Row<Contact | ContactWithScore>;
                          return (
                            <div
                              key={row.id}
                              data-index={virtualItem.index}
                              ref={(node) => virtualizer.measureElement(node)}
                              className={`absolute top-0 left-0 w-full px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                virtualItem.index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              }`}
                              style={{
                                transform: `translateY(${virtualItem.start}px)`,
                              }}
                            >
                              <div className="flex" style={{ width: table.getTotalSize() }}>
                                {row.getVisibleCells().map((cell) => (
                                  <div
                                    key={cell.id}
                                    className="flex items-center"
                                    style={{ width: cell.column.getSize() }}
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
                    <p className="text-red-600 mb-4">연락처를 불러오는 중 오류가 발생했습니다.</p>
                    <Button onClick={() => refetch()} variant="outline">
                      다시 시도
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}