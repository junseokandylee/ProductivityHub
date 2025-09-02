import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MetricsChart } from '../MetricsChart'
import type { TimeSeriesPoint, ChannelFilter } from '@/lib/types/campaign-metrics'

// Mock Chart.js and react-chartjs-2 to avoid canvas issues in tests
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Mocked Line Chart
    </div>
  )
}))

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn(),
  TimeScale: jest.fn()
}))

describe('MetricsChart', () => {
  const mockTimeSeriesData: TimeSeriesPoint[] = [
    {
      t: '2025-09-01T10:00:00Z',
      attempted: 1000,
      delivered: 950,
      failed: 50,
      open: 300,
      click: 50
    },
    {
      t: '2025-09-01T11:00:00Z',
      attempted: 1200,
      delivered: 1100,
      failed: 100,
      open: 400,
      click: 80
    }
  ]

  it('renders chart with data', () => {
    render(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="all" 
        isLoading={false} 
      />
    )
    
    expect(screen.getByText('Campaign Performance')).toBeInTheDocument()
    expect(screen.getByText('All Channels')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    render(
      <MetricsChart 
        data={null} 
        channelFilter="all" 
        isLoading={true} 
      />
    )
    
    expect(screen.getByText('Loading chart...')).toBeInTheDocument()
    const loadingElement = document.querySelector('.animate-pulse')
    expect(loadingElement).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('displays empty state when no data', () => {
    render(
      <MetricsChart 
        data={null} 
        channelFilter="all" 
        isLoading={false} 
      />
    )
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.getByText('Campaign metrics will appear here once available')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('displays empty state when data array is empty', () => {
    render(
      <MetricsChart 
        data={[]} 
        channelFilter="all" 
        isLoading={false} 
      />
    )
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('shows correct channel filter label', () => {
    const { rerender } = render(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="all" 
        isLoading={false} 
      />
    )
    expect(screen.getByText('All Channels')).toBeInTheDocument()

    rerender(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="sms" 
        isLoading={false} 
      />
    )
    expect(screen.getByText('SMS Only')).toBeInTheDocument()

    rerender(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="kakao" 
        isLoading={false} 
      />
    )
    expect(screen.getByText('KakaoTalk Only')).toBeInTheDocument()
  })

  it('applies custom height', () => {
    render(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="all" 
        height={500}
        isLoading={false} 
      />
    )
    
    const chartContainer = document.querySelector('[role="img"]')
    expect(chartContainer).toHaveStyle({ height: '500px' })
  })

  it('has proper accessibility attributes', () => {
    render(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="all" 
        isLoading={false} 
      />
    )
    
    const chartContainer = screen.getByRole('img')
    expect(chartContainer).toHaveAttribute('aria-label', 
      'Campaign performance chart showing delivered, failed, and attempted messages over time for All Channels'
    )
  })

  it('passes correct data to Line chart', () => {
    render(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="all" 
        isLoading={false} 
      />
    )
    
    const chartElement = screen.getByTestId('line-chart')
    const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '{}')
    
    // Check that datasets are created properly
    expect(chartData.datasets).toHaveLength(3)
    expect(chartData.datasets[0].label).toBe('Delivered')
    expect(chartData.datasets[1].label).toBe('Failed')
    expect(chartData.datasets[2].label).toBe('Attempted')
    
    // Check that data points are mapped correctly
    expect(chartData.datasets[0].data[0].y).toBe(950)
    expect(chartData.datasets[1].data[0].y).toBe(50)
    expect(chartData.datasets[2].data[0].y).toBe(1000)
  })

  it('applies custom className', () => {
    render(
      <MetricsChart 
        data={mockTimeSeriesData} 
        channelFilter="all" 
        className="custom-chart-class"
        isLoading={false} 
      />
    )
    
    const card = document.querySelector('.custom-chart-class')
    expect(card).toBeInTheDocument()
  })
})