/**
 * Unit tests for AnalyticsTable component
 */

import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyticsTable, TableColumn, TableRow } from '@/components/analytics/analytics-table'

describe('AnalyticsTable', () => {
  const mockColumns: TableColumn[] = [
    { id: 'campaign', label: 'Campaign Name', type: 'text', sortable: true },
    { id: 'sent', label: 'Messages Sent', type: 'number', sortable: true },
    { id: 'deliveryRate', label: 'Delivery Rate', type: 'percentage', sortable: true },
    { id: 'cost', label: 'Cost', type: 'currency', sortable: true },
    { id: 'status', label: 'Status', type: 'badge', sortable: false, badgeColor: (value) => value === 'Active' ? 'conversion' : 'neutral' },
    { id: 'createdAt', label: 'Created', type: 'date', sortable: true }
  ]

  const mockData: TableRow[] = [
    {
      id: 'row1',
      campaign: 'Spring Sale Campaign',
      sent: 15000,
      deliveryRate: 96.5,
      cost: 450000,
      status: 'Active',
      createdAt: '2024-01-15'
    },
    {
      id: 'row2',
      campaign: 'Product Launch',
      sent: 8500,
      deliveryRate: 94.2,
      cost: 255000,
      status: 'Completed',
      createdAt: '2024-01-10'
    },
    {
      id: 'row3',
      campaign: 'Newsletter Weekly',
      sent: 25000,
      deliveryRate: 98.1,
      cost: 125000,
      status: 'Active',
      createdAt: '2024-01-20'
    }
  ]

  const defaultProps = {
    columns: mockColumns,
    data: mockData
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders table with data', () => {
    render(<AnalyticsTable {...defaultProps} />)
    
    // Check headers
    mockColumns.forEach(column => {
      expect(screen.getByText(column.label)).toBeInTheDocument()
    })
    
    // Check data rows
    expect(screen.getByText('Spring Sale Campaign')).toBeInTheDocument()
    expect(screen.getByText('15,000')).toBeInTheDocument()
    expect(screen.getByText('96.5%')).toBeInTheDocument()
    expect(screen.getByText('₩450,000')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays title when provided', () => {
    render(<AnalyticsTable {...defaultProps} title="Campaign Performance" />)
    
    expect(screen.getByText('Campaign Performance')).toBeInTheDocument()
  })

  it('formats different data types correctly', () => {
    render(<AnalyticsTable {...defaultProps} />)
    
    // Number formatting
    expect(screen.getByText('15,000')).toBeInTheDocument()
    expect(screen.getByText('25,000')).toBeInTheDocument()
    
    // Percentage formatting
    expect(screen.getByText('96.5%')).toBeInTheDocument()
    expect(screen.getByText('94.2%')).toBeInTheDocument()
    
    // Currency formatting
    expect(screen.getByText('₩450,000')).toBeInTheDocument()
    expect(screen.getByText('₩255,000')).toBeInTheDocument()
    
    // Date formatting
    expect(screen.getByText('1/15/2024')).toBeInTheDocument()
    expect(screen.getByText('1/10/2024')).toBeInTheDocument()
  })

  it('renders badges with correct colors', () => {
    render(<AnalyticsTable {...defaultProps} />)
    
    const activeBadges = screen.getAllByText('Active')
    const completedBadge = screen.getByText('Completed')
    
    // Active badges should have conversion color
    activeBadges.forEach(badge => {
      expect(badge).toHaveClass('text-emerald-700', 'bg-emerald-100')
    })
    
    // Completed badge should have neutral color
    expect(completedBadge).toHaveClass('text-gray-700', 'bg-gray-100')
  })

  it('shows loading state', () => {
    render(<AnalyticsTable {...defaultProps} isLoading={true} />)
    
    expect(screen.queryByText('Spring Sale Campaign')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton')).toHaveLength(30) // Headers + rows * columns
  })

  it('displays error state with retry button', () => {
    const mockRetry = jest.fn()
    render(
      <AnalyticsTable 
        {...defaultProps} 
        error="Failed to load table data" 
        onRetry={mockRetry}
      />
    )
    
    expect(screen.getByText('Failed to load table data: Failed to load table data')).toBeInTheDocument()
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('shows no data message when data array is empty', () => {
    render(<AnalyticsTable {...defaultProps} data={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
    
    // Headers should still be visible
    expect(screen.getByText('Campaign Name')).toBeInTheDocument()
  })

  it('supports search functionality', async () => {
    const user = userEvent.setup()
    render(<AnalyticsTable {...defaultProps} searchable={true} />)
    
    const searchInput = screen.getByPlaceholderText('Search...')
    expect(searchInput).toBeInTheDocument()
    
    // Search for "Spring"
    await user.type(searchInput, 'Spring')
    
    // Should show only Spring Sale Campaign
    expect(screen.getByText('Spring Sale Campaign')).toBeInTheDocument()
    expect(screen.queryByText('Product Launch')).not.toBeInTheDocument()
    expect(screen.queryByText('Newsletter Weekly')).not.toBeInTheDocument()
  })

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup()
    render(<AnalyticsTable {...defaultProps} searchable={true} />)
    
    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'nonexistent')
    
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('supports column sorting', async () => {
    const user = userEvent.setup()
    render(<AnalyticsTable {...defaultProps} sortable={true} />)
    
    // Click on Messages Sent header to sort
    const sentHeader = screen.getByText('Messages Sent')
    await user.click(sentHeader)
    
    // Should show ascending sort indicator
    const headerElement = sentHeader.closest('th')
    expect(headerElement).toHaveAttribute('aria-sort', 'ascending')
    
    // Click again to reverse sort
    await user.click(sentHeader)
    expect(headerElement).toHaveAttribute('aria-sort', 'descending')
    
    // Click third time to clear sort
    await user.click(sentHeader)
    expect(headerElement).toHaveAttribute('aria-sort', 'none')
  })

  it('disables sorting for non-sortable columns', () => {
    render(<AnalyticsTable {...defaultProps} sortable={true} />)
    
    const statusHeader = screen.getByText('Status')
    const headerElement = statusHeader.closest('th')
    
    // Status column is marked as sortable: false
    expect(headerElement).not.toHaveClass('cursor-pointer')
  })

  it('supports pagination', () => {
    const largeData: TableRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: `row${i}`,
      campaign: `Campaign ${i}`,
      sent: (i + 1) * 1000,
      deliveryRate: 95 + (i % 5),
      cost: (i + 1) * 10000,
      status: i % 2 === 0 ? 'Active' : 'Completed',
      createdAt: '2024-01-01'
    }))

    render(<AnalyticsTable {...defaultProps} data={largeData} pageSize={10} />)
    
    // Should show first 10 rows
    expect(screen.getByText('Campaign 0')).toBeInTheDocument()
    expect(screen.getByText('Campaign 9')).toBeInTheDocument()
    expect(screen.queryByText('Campaign 10')).not.toBeInTheDocument()
    
    // Should show pagination info
    expect(screen.getByText('Showing 1 to 10 of 25 results')).toBeInTheDocument()
    
    // Should have pagination controls
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('navigates through pages', async () => {
    const user = userEvent.setup()
    const largeData: TableRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: `row${i}`,
      campaign: `Campaign ${i}`,
      sent: 1000,
      deliveryRate: 95,
      cost: 10000,
      status: 'Active',
      createdAt: '2024-01-01'
    }))

    render(<AnalyticsTable {...defaultProps} data={largeData} pageSize={10} />)
    
    // Click next page
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    
    // Should show next 10 rows
    expect(screen.getByText('Campaign 10')).toBeInTheDocument()
    expect(screen.getByText('Campaign 19')).toBeInTheDocument()
    expect(screen.queryByText('Campaign 0')).not.toBeInTheDocument()
    
    expect(screen.getByText('Showing 11 to 20 of 25 results')).toBeInTheDocument()
  })

  it('supports export functionality', async () => {
    const user = userEvent.setup()
    const mockExport = jest.fn()
    
    render(
      <AnalyticsTable 
        {...defaultProps} 
        exportable={true} 
        onExport={mockExport}
      />
    )
    
    const exportButton = screen.getByRole('button', { name: /export/i })
    expect(exportButton).toBeInTheDocument()
    
    await user.click(exportButton)
    expect(mockExport).toHaveBeenCalledTimes(1)
  })

  it('applies custom formatter', () => {
    const customColumns: TableColumn[] = [
      {
        id: 'custom',
        label: 'Custom Field',
        type: 'text',
        format: (value) => `Custom: ${value}`
      }
    ]
    
    const customData: TableRow[] = [
      { id: 'row1', custom: 'test value' }
    ]

    render(
      <AnalyticsTable 
        columns={customColumns} 
        data={customData}
      />
    )
    
    expect(screen.getByText('Custom: test value')).toBeInTheDocument()
  })

  it('handles null and undefined values', () => {
    const dataWithNulls: TableRow[] = [
      {
        id: 'row1',
        campaign: null,
        sent: undefined,
        deliveryRate: 0,
        cost: '',
        status: 'Active',
        createdAt: null
      }
    ]

    render(<AnalyticsTable {...defaultProps} data={dataWithNulls} />)
    
    // Should show dashes for null/undefined values
    const cells = screen.getAllByText('-')
    expect(cells.length).toBeGreaterThan(0)
    
    // Should show 0 for zero values
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<AnalyticsTable {...defaultProps} title="Test Table" />)
    
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Check column headers have proper attributes
    const headers = screen.getAllByRole('columnheader')
    headers.forEach((header, index) => {
      const column = mockColumns[index]
      if (column.sortable !== false) {
        expect(header).toHaveAttribute('aria-sort', 'none')
        expect(header).toHaveAttribute('tabIndex', '0')
      }
    })
    
    // Check rows and cells have proper attributes
    const rows = screen.getAllByRole('row')
    // First row is header, data rows start from index 1
    for (let i = 1; i < rows.length; i++) {
      const cells = within(rows[i]).getAllByRole('cell')
      cells.forEach((cell, cellIndex) => {
        expect(cell).toHaveAttribute('aria-rowindex', (i + 1).toString())
        expect(cell).toHaveAttribute('aria-colindex', (cellIndex + 1).toString())
      })
    }
  })

  it('updates search results count correctly', async () => {
    const user = userEvent.setup()
    render(<AnalyticsTable {...defaultProps} searchable={true} />)
    
    // Initial state shows all data
    expect(screen.getByText('3 total rows')).toBeInTheDocument()
    
    // Search for "Active" (should match 2 rows)
    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'Active')
    
    // Should show filtered count
    expect(screen.getByText('(filtered from 3 total)')).toBeInTheDocument()
  })

  it('resets page when searching', async () => {
    const user = userEvent.setup()
    const largeData: TableRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: `row${i}`,
      campaign: `Campaign ${i}`,
      sent: 1000,
      deliveryRate: 95,
      cost: 10000,
      status: 'Active',
      createdAt: '2024-01-01'
    }))

    render(
      <AnalyticsTable 
        {...defaultProps} 
        data={largeData} 
        pageSize={10} 
        searchable={true}
      />
    )
    
    // Go to page 2
    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    expect(screen.getByText('Showing 11 to 20 of 25 results')).toBeInTheDocument()
    
    // Search for something
    const searchInput = screen.getByPlaceholderText('Search...')
    await user.type(searchInput, 'Campaign 0')
    
    // Should reset to page 1
    expect(screen.getByText('Showing 1 to 1 of 1 results')).toBeInTheDocument()
  })

  it('disables features when props are false', () => {
    render(
      <AnalyticsTable 
        {...defaultProps} 
        searchable={false}
        sortable={false}
        exportable={false}
        pagination={false}
      />
    )
    
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    
    // Column headers should not be clickable
    const headers = screen.getAllByRole('columnheader')
    headers.forEach(header => {
      expect(header).not.toHaveClass('cursor-pointer')
    })
  })
})

describe('AnalyticsTable Integration', () => {
  it('works with real analytics data', () => {
    const analyticsData: TableRow[] = [
      {
        id: 'campaign1',
        name: 'Black Friday Sale',
        type: 'Promotional',
        audience: 'Premium Customers',
        sent: 45000,
        delivered: 43200,
        opened: 17280,
        clicked: 3456,
        deliveryRate: 96.0,
        openRate: 40.0,
        clickRate: 20.0,
        revenue: 2400000,
        cost: 180000,
        roi: 1233.3,
        createdAt: '2024-01-15T09:00:00Z',
        status: 'Completed'
      },
      {
        id: 'campaign2',
        name: 'Welcome Series - Week 1',
        type: 'Automation',
        audience: 'New Subscribers',
        sent: 12000,
        delivered: 11640,
        opened: 4656,
        clicked: 698,
        deliveryRate: 97.0,
        openRate: 40.0,
        clickRate: 15.0,
        revenue: 156000,
        cost: 24000,
        roi: 550.0,
        createdAt: '2024-01-20T14:30:00Z',
        status: 'Active'
      }
    ]

    const analyticsColumns: TableColumn[] = [
      { id: 'name', label: 'Campaign Name', type: 'text', sortable: true, searchable: true },
      { id: 'type', label: 'Type', type: 'badge', badgeColor: (value) => value === 'Promotional' ? 'click' : 'neutral' },
      { id: 'sent', label: 'Sent', type: 'number', sortable: true },
      { id: 'deliveryRate', label: 'Delivery Rate', type: 'percentage', sortable: true },
      { id: 'openRate', label: 'Open Rate', type: 'percentage', sortable: true },
      { id: 'clickRate', label: 'Click Rate', type: 'percentage', sortable: true },
      { id: 'revenue', label: 'Revenue', type: 'currency', sortable: true },
      { id: 'roi', label: 'ROI', type: 'percentage', sortable: true, format: (value) => `${value.toFixed(1)}%` },
      { id: 'status', label: 'Status', type: 'badge', badgeColor: (value) => value === 'Active' ? 'conversion' : 'baseline' }
    ]

    render(
      <AnalyticsTable
        columns={analyticsColumns}
        data={analyticsData}
        title="Campaign Performance Analysis"
        searchable={true}
        sortable={true}
        exportable={true}
        pagination={true}
        pageSize={10}
      />
    )

    expect(screen.getByText('Campaign Performance Analysis')).toBeInTheDocument()
    expect(screen.getByText('Black Friday Sale')).toBeInTheDocument()
    expect(screen.getByText('Welcome Series - Week 1')).toBeInTheDocument()
    
    // Check formatted values
    expect(screen.getByText('45,000')).toBeInTheDocument()
    expect(screen.getByText('96.0%')).toBeInTheDocument()
    expect(screen.getByText('₩2,400,000')).toBeInTheDocument()
    expect(screen.getByText('1233.3%')).toBeInTheDocument() // Custom ROI formatting
    
    // Check badges
    expect(screen.getByText('Promotional')).toHaveClass('text-amber-700')
    expect(screen.getByText('Active')).toHaveClass('text-emerald-700')
    expect(screen.getByText('Completed')).toHaveClass('text-slate-700')
  })
})