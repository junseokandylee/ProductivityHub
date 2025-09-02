'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ArrowUpDown, Search, Download } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type ColumnType = 'text' | 'number' | 'percentage' | 'currency' | 'date' | 'badge'

export interface TableColumn {
  id: string
  label: string
  type: ColumnType
  sortable?: boolean
  searchable?: boolean
  width?: string
  format?: (value: any) => string
  badgeColor?: (value: any) => 'baseline' | 'conversion' | 'open' | 'click' | 'neutral'
  className?: string
}

export interface TableRow {
  id: string
  [key: string]: any
}

export interface AnalyticsTableProps {
  columns: TableColumn[]
  data: TableRow[]
  title?: string
  isLoading?: boolean
  error?: string
  onRetry?: () => void
  searchable?: boolean
  sortable?: boolean
  exportable?: boolean
  onExport?: () => void
  pagination?: boolean
  pageSize?: number
  className?: string
  testId?: string
}

type SortDirection = 'asc' | 'desc' | null

const badgeColors = {
  baseline: 'bg-slate-100 text-slate-700 border-slate-300',
  conversion: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  open: 'bg-blue-100 text-blue-700 border-blue-300',
  click: 'bg-amber-100 text-amber-700 border-amber-300',
  neutral: 'bg-gray-100 text-gray-700 border-gray-300'
}

function formatValue(value: any, column: TableColumn): string {
  if (value === null || value === undefined) return '-'
  
  if (column.format) {
    return column.format(value)
  }

  switch (column.type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    case 'percentage':
      return typeof value === 'number' ? `${value.toFixed(1)}%` : String(value)
    case 'currency':
      return typeof value === 'number' ? `₩${value.toLocaleString()}` : String(value)
    case 'date':
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return String(value)
      }
    default:
      return String(value)
  }
}

function getSortValue(value: any, column: TableColumn): any {
  if (value === null || value === undefined) return ''
  
  switch (column.type) {
    case 'number':
    case 'percentage':
    case 'currency':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0
    case 'date':
      return new Date(value).getTime()
    default:
      return String(value).toLowerCase()
  }
}

function TableSkeleton({ columns, rows = 5 }: { columns: TableColumn[], rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="border rounded-lg">
        <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {/* Header */}
          {columns.map((column) => (
            <div key={column.id} className="p-4 border-b">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) =>
            columns.map((column) => (
              <div key={`${i}-${column.id}`} className="p-4 border-b">
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function AnalyticsTable({
  columns,
  data,
  title,
  isLoading = false,
  error,
  onRetry,
  searchable = true,
  sortable = true,
  exportable = false,
  onExport,
  pagination = true,
  pageSize = 10,
  className,
  testId
}: AnalyticsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    const searchableColumns = columns.filter(col => col.searchable !== false)
    
    return data.filter(row =>
      searchableColumns.some(column =>
        String(row[column.id] || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    )
  }, [data, searchTerm, columns])

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData

    const column = columns.find(col => col.id === sortColumn)
    if (!column) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = getSortValue(a[sortColumn], column)
      const bValue = getSortValue(b[sortColumn], column)

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortColumn, sortDirection, columns])

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = pagination ? Math.ceil(sortedData.length / pageSize) : 1

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId)
    if (!column || (column.sortable === false)) return

    if (sortColumn === columnId) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <TableSkeleton columns={columns} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load table data: {error}</span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)} data-testid={testId || 'analytics-table'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        
        <div className="flex items-center gap-2">
          {/* Search */}
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset to first page when searching
                }}
                className="pl-9 w-64"
              />
            </div>
          )}
          
          {/* Export */}
          {exportable && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
              data-testid="export-csv-btn"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width }}
                  className={cn(
                    column.className,
                    (sortable && column.sortable !== false) && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {(sortable && column.sortable !== false) && (
                      <div className="flex flex-col">
                        {sortColumn === column.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-32 text-center text-muted-foreground"
                >
                  {searchTerm ? 'No results found' : 'No data available'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow 
                  key={row.id}
                  className="hover:bg-muted/50"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        column.className,
                        column.type === 'number' || column.type === 'currency' || column.type === 'percentage' 
                          ? 'text-right' 
                          : 'text-left'
                      )}
                    >
                      {column.type === 'badge' ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            column.badgeColor ? 
                              badgeColors[column.badgeColor(row[column.id])] : 
                              badgeColors.neutral
                          )}
                        >
                          {formatValue(row[column.id], column)}
                        </Badge>
                      ) : (
                        formatValue(row[column.id], column)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
            {sortedData.length} results
            {searchTerm && ` (filtered from ${data.length} total)`}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <Select
              value={currentPage.toString()}
              onValueChange={(value) => setCurrentPage(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{data.length} total rows</span>
          <span>•</span>
          <span>{columns.length} columns</span>
        </div>
        <div>
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}