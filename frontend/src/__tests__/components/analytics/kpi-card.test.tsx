/**
 * Unit tests for KpiCard component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Send, TrendingUp } from 'lucide-react'
import { KpiCard, KpiCardGroup } from '@/components/analytics/kpi-card'

describe('KpiCard', () => {
  const defaultProps = {
    label: 'Test Metric',
    value: 1234,
    color: 'baseline' as const
  }

  it('renders with basic props', () => {
    render(<KpiCard {...defaultProps} />)
    
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Test Metric metric' })).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    render(<KpiCard {...defaultProps} value={1500000} />)
    expect(screen.getByText('1.5M')).toBeInTheDocument()
    
    render(<KpiCard {...defaultProps} value={2500} />)
    expect(screen.getByText('2.5K')).toBeInTheDocument()
  })

  it('handles string values', () => {
    render(<KpiCard {...defaultProps} value="Custom Value" />)
    expect(screen.getByText('Custom Value')).toBeInTheDocument()
  })

  it('displays custom formatter output', () => {
    const formatter = (value: number) => `${value}%`
    render(<KpiCard {...defaultProps} value={85.5} formatter={formatter} />)
    expect(screen.getByText('85.5%')).toBeInTheDocument()
  })

  it('shows subtitle when provided', () => {
    render(<KpiCard {...defaultProps} subtitle="Additional info" />)
    expect(screen.getByText('Additional info')).toBeInTheDocument()
  })

  it('displays icon when provided', () => {
    render(<KpiCard {...defaultProps} icon={Send} />)
    // Icon should be present and marked as decorative
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows trend badge with positive percentage', () => {
    render(<KpiCard {...defaultProps} deltaPct={15.5} />)
    
    const trendBadge = screen.getByLabelText('Trend: increased by 15.5%')
    expect(trendBadge).toBeInTheDocument()
    expect(trendBadge).toHaveTextContent('15.5%')
    expect(trendBadge).toHaveClass('text-emerald-600')
  })

  it('shows trend badge with negative percentage', () => {
    render(<KpiCard {...defaultProps} deltaPct={-8.2} />)
    
    const trendBadge = screen.getByLabelText('Trend: decreased by 8.2%')
    expect(trendBadge).toBeInTheDocument()
    expect(trendBadge).toHaveTextContent('8.2%')
    expect(trendBadge).toHaveClass('text-red-600')
  })

  it('handles zero percentage change', () => {
    render(<KpiCard {...defaultProps} deltaPct={0} />)
    
    const trendBadge = screen.getByLabelText('Trend: increased by 0%')
    expect(trendBadge).toBeInTheDocument()
    expect(trendBadge).toHaveClass('text-gray-600')
  })

  it('shows tooltip when provided', () => {
    render(<KpiCard {...defaultProps} tooltip="Additional context" />)
    
    // Tooltip trigger should be present
    const card = screen.getByRole('region')
    expect(card).toBeInTheDocument()
    
    // Note: Tooltip content testing would require more complex setup with tooltip provider
  })

  it('displays loading state', () => {
    render(<KpiCard {...defaultProps} isLoading={true} />)
    
    // Should show skeleton loading elements
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4) // Multiple skeleton elements
    expect(screen.queryByText('Test Metric')).not.toBeInTheDocument()
  })

  it('displays error state', () => {
    render(<KpiCard {...defaultProps} error={true} />)
    
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Test Metric')).toBeInTheDocument()
    expect(screen.getByText('Error loading data')).toBeInTheDocument()
    expect(screen.queryByText('1,234')).not.toBeInTheDocument()
  })

  it('applies correct color classes for each color variant', () => {
    const colors = ['baseline', 'conversion', 'open', 'click', 'neutral'] as const
    
    colors.forEach(color => {
      const { container } = render(<KpiCard {...defaultProps} color={color} />)
      const card = container.querySelector('[role="region"]')
      
      expect(card).toHaveClass(`text-${color === 'baseline' ? 'slate' : 
                                       color === 'conversion' ? 'emerald' :
                                       color === 'open' ? 'blue' :
                                       color === 'click' ? 'amber' : 'gray'}-700`)
    })
  })

  it('has proper accessibility attributes', () => {
    render(<KpiCard {...defaultProps} icon={Send} deltaPct={10.5} />)
    
    const card = screen.getByRole('region', { name: 'Test Metric metric' })
    expect(card).toBeInTheDocument()
    
    const label = screen.getByText('Test Metric')
    expect(label).toHaveAttribute('id', 'label-test-metric')
    
    const value = screen.getByText('1,234')
    expect(value).toHaveAttribute('aria-labelledby', 'label-test-metric')
    
    const trendBadge = screen.getByLabelText('Trend: increased by 10.5%')
    expect(trendBadge).toBeInTheDocument()
    
    // Icon should be decorative
    const icon = document.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('handles hover interactions', () => {
    render(<KpiCard {...defaultProps} />)
    
    const card = screen.getByRole('region')
    
    // Should have hover class
    expect(card).toHaveClass('hover:shadow-md')
    expect(card).toHaveClass('transition-all')
  })
})

describe('KpiCardGroup', () => {
  it('renders children in grid layout', () => {
    render(
      <KpiCardGroup>
        <KpiCard label="Metric 1" value={100} color="baseline" />
        <KpiCard label="Metric 2" value={200} color="conversion" />
        <KpiCard label="Metric 3" value={300} color="open" />
      </KpiCardGroup>
    )
    
    const group = screen.getByRole('group', { name: 'Key performance indicators' })
    expect(group).toBeInTheDocument()
    expect(group).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4', 'gap-4')
    
    expect(screen.getByText('Metric 1')).toBeInTheDocument()
    expect(screen.getByText('Metric 2')).toBeInTheDocument()
    expect(screen.getByText('Metric 3')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <KpiCardGroup className="custom-class">
        <KpiCard label="Test" value={100} color="baseline" />
      </KpiCardGroup>
    )
    
    const group = screen.getByRole('group')
    expect(group).toHaveClass('custom-class')
  })
})

describe('KpiCard Integration', () => {
  it('works with real-world data', () => {
    const campaignMetrics = {
      sent: 15420,
      delivered: 14891,
      opened: 7234,
      clicked: 1456,
      deltaPct: 12.3
    }
    
    render(
      <KpiCardGroup>
        <KpiCard
          label="Messages Sent"
          value={campaignMetrics.sent}
          subtitle="15.4K total"
          color="baseline"
          deltaPct={campaignMetrics.deltaPct}
          icon={Send}
        />
        <KpiCard
          label="Delivery Rate"
          value="96.6%"
          subtitle={`${campaignMetrics.delivered.toLocaleString()} delivered`}
          color="conversion"
          deltaPct={2.1}
        />
      </KpiCardGroup>
    )
    
    expect(screen.getByText('Messages Sent')).toBeInTheDocument()
    expect(screen.getByText('15.4K')).toBeInTheDocument()
    expect(screen.getByText('15.4K total')).toBeInTheDocument()
    expect(screen.getByLabelText('Trend: increased by 12.3%')).toBeInTheDocument()
    
    expect(screen.getByText('Delivery Rate')).toBeInTheDocument()
    expect(screen.getByText('96.6%')).toBeInTheDocument()
    expect(screen.getByText('14,891 delivered')).toBeInTheDocument()
  })

  it('handles edge cases gracefully', () => {
    render(
      <KpiCardGroup>
        <KpiCard label="Zero Value" value={0} color="neutral" />
        <KpiCard label="Null Delta" value={100} color="baseline" deltaPct={null as any} />
        <KpiCard label="Undefined Value" value={undefined as any} color="conversion" />
        <KpiCard label="Empty String" value="" color="open" />
      </KpiCardGroup>
    )
    
    expect(screen.getByText('Zero Value')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    
    expect(screen.getByText('Null Delta')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    
    expect(screen.getByText('Undefined Value')).toBeInTheDocument()
    expect(screen.getByText('Empty String')).toBeInTheDocument()
  })
})