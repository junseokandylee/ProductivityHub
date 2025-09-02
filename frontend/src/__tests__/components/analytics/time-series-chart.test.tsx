/**
 * Unit tests for TimeSeriesChart component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeSeriesChart, TimeSeriesLine } from '@/components/analytics/time-series-chart'

describe('TimeSeriesChart', () => {
  const mockLines: TimeSeriesLine[] = [
    {
      id: 'sent',
      label: 'Messages Sent',
      color: 'baseline',
      data: [
        { timestamp: '2024-01-01T00:00:00Z', value: 1000 },
        { timestamp: '2024-01-01T01:00:00Z', value: 1200 },
        { timestamp: '2024-01-01T02:00:00Z', value: 950 },
        { timestamp: '2024-01-01T03:00:00Z', value: 1400 }
      ]
    },
    {
      id: 'delivered',
      label: 'Messages Delivered',
      color: 'conversion',
      data: [
        { timestamp: '2024-01-01T00:00:00Z', value: 950 },
        { timestamp: '2024-01-01T01:00:00Z', value: 1150 },
        { timestamp: '2024-01-01T02:00:00Z', value: 900 },
        { timestamp: '2024-01-01T03:00:00Z', value: 1300 }
      ]
    }
  ]

  const defaultProps = {
    lines: mockLines
  }

  beforeEach(() => {
    // Clear any previous mocks
    jest.clearAllMocks()
  })

  it('renders with basic props', () => {
    render(<TimeSeriesChart {...defaultProps} />)
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('2 series')).toBeInTheDocument()
    expect(screen.getByText('8 data points')).toBeInTheDocument()
  })

  it('displays title when provided', () => {
    render(<TimeSeriesChart {...defaultProps} title="Campaign Performance" />)
    
    expect(screen.getByText('Campaign Performance')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Campaign Performance' })).toBeInTheDocument()
  })

  it('uses default aria-label when no title provided', () => {
    render(<TimeSeriesChart {...defaultProps} />)
    
    expect(screen.getByRole('img', { name: 'Time series chart' })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<TimeSeriesChart {...defaultProps} isLoading={true} />)
    
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton')).toHaveLength(2) // Title + chart skeleton
  })

  it('shows loading state without title', () => {
    render(<TimeSeriesChart {...defaultProps} isLoading={true} title={undefined} />)
    
    expect(screen.getAllByTestId('skeleton')).toHaveLength(1) // Only chart skeleton
  })

  it('displays error state with retry button', () => {
    const mockRetry = jest.fn()
    render(
      <TimeSeriesChart 
        {...defaultProps} 
        error="Failed to fetch data" 
        onRetry={mockRetry}
      />
    )
    
    expect(screen.getByText('Failed to load chart data: Failed to fetch data')).toBeInTheDocument()
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('displays error state without retry button when onRetry not provided', () => {
    render(<TimeSeriesChart {...defaultProps} error="Network error" />)
    
    expect(screen.getByText('Failed to load chart data: Network error')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('shows no data message when lines array is empty', () => {
    render(<TimeSeriesChart lines={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your filters or date range')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('filters out hidden lines', () => {
    const linesWithHidden: TimeSeriesLine[] = [
      ...mockLines,
      {
        id: 'opened',
        label: 'Messages Opened',
        color: 'open',
        hidden: true,
        data: [
          { timestamp: '2024-01-01T00:00:00Z', value: 500 }
        ]
      }
    ]

    render(<TimeSeriesChart lines={linesWithHidden} />)
    
    // Should still show 2 series (hidden line excluded)
    expect(screen.getByText('2 series')).toBeInTheDocument()
    // Data points should only count visible lines
    expect(screen.getByText('8 data points')).toBeInTheDocument()
  })

  it('applies custom height', () => {
    render(<TimeSeriesChart {...defaultProps} height={500} />)
    
    const chartContainer = screen.getByTestId('line-chart').parentElement
    expect(chartContainer).toHaveStyle('height: 500px')
  })

  it('applies custom className', () => {
    render(<TimeSeriesChart {...defaultProps} className="custom-chart" />)
    
    const container = screen.getByRole('img').parentElement
    expect(container).toHaveClass('custom-chart')
  })

  it('shows metadata with update time', () => {
    render(<TimeSeriesChart {...defaultProps} />)
    
    expect(screen.getByText('2 series')).toBeInTheDocument()
    expect(screen.getByText('8 data points')).toBeInTheDocument()
    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
  })

  it('handles lines with different data point counts', () => {
    const unevenLines: TimeSeriesLine[] = [
      {
        id: 'line1',
        label: 'Line 1',
        color: 'baseline',
        data: [
          { timestamp: '2024-01-01T00:00:00Z', value: 100 },
          { timestamp: '2024-01-01T01:00:00Z', value: 200 }
        ]
      },
      {
        id: 'line2',
        label: 'Line 2', 
        color: 'conversion',
        data: [
          { timestamp: '2024-01-01T00:00:00Z', value: 150 },
          { timestamp: '2024-01-01T01:00:00Z', value: 180 },
          { timestamp: '2024-01-01T02:00:00Z', value: 220 }
        ]
      }
    ]

    render(<TimeSeriesChart lines={unevenLines} />)
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('2 series')).toBeInTheDocument()
  })

  it('configures chart options correctly', () => {
    const { Line } = require('react-chartjs-2')
    
    render(<TimeSeriesChart {...defaultProps} />)
    
    expect(Line).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          datasets: expect.arrayContaining([
            expect.objectContaining({
              label: 'Messages Sent',
              borderColor: '#475569', // baseline color
              fill: false
            }),
            expect.objectContaining({
              label: 'Messages Delivered',
              borderColor: '#059669', // conversion color
              fill: false
            })
          ])
        }),
        options: expect.objectContaining({
          responsive: true,
          maintainAspectRatio: false,
          plugins: expect.objectContaining({
            legend: expect.objectContaining({
              display: true,
              position: 'top'
            }),
            tooltip: expect.objectContaining({
              backgroundColor: 'rgba(0, 0, 0, 0.8)'
            })
          }),
          scales: expect.objectContaining({
            x: expect.objectContaining({
              type: 'time',
              display: true
            }),
            y: expect.objectContaining({
              type: 'linear',
              beginAtZero: true
            })
          })
        })
      }),
      expect.anything()
    )
  })

  it('applies correct colors for each line type', () => {
    const { Line } = require('react-chartjs-2')
    
    const coloredLines: TimeSeriesLine[] = [
      { ...mockLines[0], color: 'baseline' },
      { ...mockLines[1], color: 'conversion' },
      { 
        id: 'opened', 
        label: 'Opened', 
        color: 'open',
        data: [{ timestamp: '2024-01-01T00:00:00Z', value: 100 }]
      },
      { 
        id: 'clicked', 
        label: 'Clicked', 
        color: 'click',
        data: [{ timestamp: '2024-01-01T00:00:00Z', value: 50 }]
      },
      { 
        id: 'other', 
        label: 'Other', 
        color: 'neutral',
        data: [{ timestamp: '2024-01-01T00:00:00Z', value: 25 }]
      }
    ]

    render(<TimeSeriesChart lines={coloredLines} />)
    
    const call = Line.mock.calls[0][0]
    const datasets = call.data.datasets
    
    expect(datasets[0].borderColor).toBe('#475569') // baseline
    expect(datasets[1].borderColor).toBe('#059669') // conversion
    expect(datasets[2].borderColor).toBe('#2563eb') // open
    expect(datasets[3].borderColor).toBe('#d97706') // click
    expect(datasets[4].borderColor).toBe('#6b7280') // neutral
  })

  it('handles fill option correctly', () => {
    const { Line } = require('react-chartjs-2')
    
    const filledLines: TimeSeriesLine[] = [
      { ...mockLines[0], fill: true },
      { ...mockLines[1], fill: false }
    ]

    render(<TimeSeriesChart lines={filledLines} />)
    
    const call = Line.mock.calls[0][0]
    const datasets = call.data.datasets
    
    expect(datasets[0].fill).toBe(true)
    expect(datasets[0].backgroundColor).toBe('#f8fafc') // baseline background
    expect(datasets[1].fill).toBe(false)
  })

  it('configures time scale options', () => {
    const { Line } = require('react-chartjs-2')
    
    render(
      <TimeSeriesChart 
        {...defaultProps} 
        timeFormat="HH:mm:ss"
        yAxisLabel="Count"
      />
    )
    
    const call = Line.mock.calls[0][0]
    const options = call.options
    
    expect(options.scales.x.type).toBe('time')
    expect(options.scales.y.title.text).toBe('Count')
  })

  it('supports stacked mode', () => {
    const { Line } = require('react-chartjs-2')
    
    render(<TimeSeriesChart {...defaultProps} stacked={true} />)
    
    const call = Line.mock.calls[0][0]
    const options = call.options
    
    expect(options.scales.y.stacked).toBe(true)
  })

  it('toggles grid and points display', () => {
    const { Line } = require('react-chartjs-2')
    
    render(
      <TimeSeriesChart 
        {...defaultProps} 
        showGrid={false} 
        showPoints={false}
        showLegend={false}
      />
    )
    
    const call = Line.mock.calls[0][0]
    const options = call.options
    const datasets = call.data.datasets
    
    expect(options.scales.x.grid.display).toBe(false)
    expect(options.scales.y.grid.display).toBe(false)
    expect(options.plugins.legend.display).toBe(false)
    expect(datasets[0].pointRadius).toBe(0)
  })
})

describe('TimeSeriesChart Integration', () => {
  it('works with real campaign data', () => {
    const campaignData: TimeSeriesLine[] = [
      {
        id: 'sent',
        label: 'Sent',
        color: 'baseline',
        data: [
          { timestamp: '2024-01-01T09:00:00Z', value: 5000 },
          { timestamp: '2024-01-01T10:00:00Z', value: 8000 },
          { timestamp: '2024-01-01T11:00:00Z', value: 12000 },
          { timestamp: '2024-01-01T12:00:00Z', value: 15000 }
        ]
      },
      {
        id: 'opened',
        label: 'Opened',
        color: 'open',
        data: [
          { timestamp: '2024-01-01T09:00:00Z', value: 1250 },
          { timestamp: '2024-01-01T10:00:00Z', value: 2400 },
          { timestamp: '2024-01-01T11:00:00Z', value: 3600 },
          { timestamp: '2024-01-01T12:00:00Z', value: 4500 }
        ]
      }
    ]

    render(
      <TimeSeriesChart
        lines={campaignData}
        title="Campaign Performance Over Time"
        height={400}
        showLegend={true}
        timeFormat="HH:mm"
        yAxisLabel="Message Count"
      />
    )

    expect(screen.getByText('Campaign Performance Over Time')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByText('2 series')).toBeInTheDocument()
    expect(screen.getByText('8 data points')).toBeInTheDocument()
  })
})