/**
 * Unit tests for FunnelChart component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FunnelChart, FunnelStage } from '@/components/analytics/funnel-chart'

describe('FunnelChart', () => {
  const mockStages: FunnelStage[] = [
    {
      id: 'sent',
      label: 'Messages Sent',
      value: 10000,
      color: 'baseline',
      description: 'Total messages sent to contacts'
    },
    {
      id: 'delivered',
      label: 'Messages Delivered',
      value: 9500,
      color: 'conversion',
      description: 'Messages successfully delivered'
    },
    {
      id: 'opened',
      label: 'Messages Opened',
      value: 4750,
      color: 'open',
      description: 'Recipients who opened the message'
    },
    {
      id: 'clicked',
      label: 'Messages Clicked',
      value: 950,
      color: 'click',
      description: 'Recipients who clicked links'
    }
  ]

  const defaultProps = {
    stages: mockStages
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with basic props', () => {
    render(<FunnelChart {...defaultProps} />)
    
    expect(screen.getByRole('img', { name: 'Conversion funnel chart' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Funnel stages' })).toBeInTheDocument()
    
    mockStages.forEach(stage => {
      expect(screen.getByText(stage.label)).toBeInTheDocument()
      expect(screen.getByText(stage.value.toLocaleString())).toBeInTheDocument()
    })
  })

  it('displays title when provided', () => {
    render(<FunnelChart {...defaultProps} title="Campaign Conversion Funnel" />)
    
    expect(screen.getByText('Campaign Conversion Funnel')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Campaign Conversion Funnel' })).toBeInTheDocument()
  })

  it('calculates and displays total conversion rate', () => {
    render(<FunnelChart {...defaultProps} />)
    
    // Total conversion: 950 / 10000 = 9.5%
    expect(screen.getByText('Total conversion: 9.5%')).toBeInTheDocument()
    expect(screen.getByText('Top of funnel: 10,000')).toBeInTheDocument()
    expect(screen.getByText('4 stages')).toBeInTheDocument()
  })

  it('shows stage descriptions', () => {
    render(<FunnelChart {...defaultProps} />)
    
    mockStages.forEach(stage => {
      if (stage.description) {
        expect(screen.getByText(stage.description)).toBeInTheDocument()
      }
    })
  })

  it('displays conversion rates between stages', () => {
    render(<FunnelChart {...defaultProps} showConversionRates={true} />)
    
    // Conversion rates should be calculated between consecutive stages
    // delivered/sent = 9500/10000 = 95.0%
    expect(screen.getByText('95.0% conversion')).toBeInTheDocument()
    
    // opened/delivered = 4750/9500 = 50.0%
    expect(screen.getByText('50.0% conversion')).toBeInTheDocument()
    
    // clicked/opened = 950/4750 = 20.0%
    expect(screen.getByText('20.0% conversion')).toBeInTheDocument()
  })

  it('displays dropoff rates between stages', () => {
    render(<FunnelChart {...defaultProps} showDropoffRates={true} />)
    
    // Dropoff rates should be calculated as (previous - current) / previous * 100
    // (10000 - 9500) / 10000 = 5.0%
    expect(screen.getByText('-5.0%')).toBeInTheDocument()
    
    // (9500 - 4750) / 9500 = 50.0%
    expect(screen.getByText('-50.0%')).toBeInTheDocument()
    
    // (4750 - 950) / 4750 = 80.0%
    expect(screen.getByText('-80.0%')).toBeInTheDocument()
  })

  it('hides conversion and dropoff rates when disabled', () => {
    render(
      <FunnelChart 
        {...defaultProps} 
        showConversionRates={false} 
        showDropoffRates={false}
      />
    )
    
    expect(screen.queryByText(/% conversion/)).not.toBeInTheDocument()
    expect(screen.queryByText(/-\d+\.\d+%/)).not.toBeInTheDocument()
  })

  it('renders in horizontal orientation', () => {
    render(<FunnelChart {...defaultProps} orientation="horizontal" />)
    
    const container = screen.getByRole('list')
    expect(container).toHaveClass('flex', 'items-end', 'justify-center', 'gap-4')
  })

  it('renders in vertical orientation by default', () => {
    render(<FunnelChart {...defaultProps} />)
    
    const container = screen.getByRole('list')
    expect(container).toHaveClass('flex', 'flex-col', 'justify-center')
  })

  it('applies custom height', () => {
    render(<FunnelChart {...defaultProps} height={600} />)
    
    const chartContainer = screen.getByRole('list')
    expect(chartContainer).toHaveStyle('height: 600px')
  })

  it('applies custom className', () => {
    render(<FunnelChart {...defaultProps} className="custom-funnel" />)
    
    const container = screen.getByRole('img').parentElement
    expect(container).toHaveClass('custom-funnel')
  })

  it('shows loading state', () => {
    render(<FunnelChart {...defaultProps} isLoading={true} />)
    
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4) // 4 skeleton stages
  })

  it('displays error state with retry button', () => {
    const mockRetry = jest.fn()
    render(
      <FunnelChart 
        {...defaultProps} 
        error="Failed to load funnel data" 
        onRetry={mockRetry}
      />
    )
    
    expect(screen.getByText('Failed to load funnel data: Failed to load funnel data')).toBeInTheDocument()
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()
    
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('displays error state without retry button when onRetry not provided', () => {
    render(<FunnelChart {...defaultProps} error="Network error" />)
    
    expect(screen.getByText('Failed to load funnel data: Network error')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('shows no data message when stages array is empty', () => {
    render(<FunnelChart stages={[]} />)
    
    expect(screen.getByText('No funnel data available')).toBeInTheDocument()
    expect(screen.getByText('No stages to display')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('applies correct color classes for each stage', () => {
    render(<FunnelChart {...defaultProps} />)
    
    const stages = screen.getAllByRole('listitem')
    
    // Check if color classes are applied (would need to check computed styles in real test)
    expect(stages).toHaveLength(4)
    stages.forEach((stage, index) => {
      const region = stage.querySelector('[role="region"]')
      expect(region).toBeInTheDocument()
      
      // Should have color-specific classes based on mockStages[index].color
      const expectedColorClass = mockStages[index].color === 'baseline' ? 'bg-slate-100' :
                                  mockStages[index].color === 'conversion' ? 'bg-emerald-100' :
                                  mockStages[index].color === 'open' ? 'bg-blue-100' :
                                  mockStages[index].color === 'click' ? 'bg-amber-100' : 'bg-gray-100'
      
      expect(region).toHaveClass(expectedColorClass)
    })
  })

  it('has proper accessibility attributes', () => {
    render(<FunnelChart {...defaultProps} title="Test Funnel" />)
    
    const chart = screen.getByRole('img', { name: 'Test Funnel' })
    expect(chart).toBeInTheDocument()
    
    const stagesList = screen.getByRole('list', { name: 'Funnel stages' })
    expect(stagesList).toBeInTheDocument()
    
    const stages = screen.getAllByRole('listitem')
    expect(stages).toHaveLength(4)
    
    stages.forEach((stage, index) => {
      const region = stage.querySelector('[role="region"]')
      expect(region).toHaveAttribute('aria-label', 
        `${mockStages[index].label}: ${mockStages[index].value.toLocaleString()}`
      )
    })
  })

  it('handles stages with zero values', () => {
    const stagesWithZero: FunnelStage[] = [
      { id: 'sent', label: 'Sent', value: 1000, color: 'baseline' },
      { id: 'delivered', label: 'Delivered', value: 0, color: 'conversion' },
      { id: 'opened', label: 'Opened', value: 0, color: 'open' }
    ]

    render(<FunnelChart stages={stagesWithZero} showConversionRates={true} />)
    
    expect(screen.getByText('Sent')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    
    // Should handle division by zero in conversion rate calculation
    expect(screen.getByText('0.0% conversion')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeNumberStages: FunnelStage[] = [
      { id: 'stage1', label: 'Stage 1', value: 1500000, color: 'baseline' },
      { id: 'stage2', label: 'Stage 2', value: 750000, color: 'conversion' },
      { id: 'stage3', label: 'Stage 3', value: 25000, color: 'open' }
    ]

    render(<FunnelChart stages={largeNumberStages} />)
    
    expect(screen.getByText('1.5M')).toBeInTheDocument()
    expect(screen.getByText('750K')).toBeInTheDocument()
    expect(screen.getByText('25K')).toBeInTheDocument()
  })
})

describe('FunnelChart Integration', () => {
  it('works with real email campaign data', () => {
    const emailCampaignStages: FunnelStage[] = [
      {
        id: 'targeted',
        label: 'Targeted Audience',
        value: 50000,
        color: 'neutral',
        description: 'Total contacts in target segment'
      },
      {
        id: 'sent',
        label: 'Emails Sent',
        value: 48500,
        color: 'baseline',
        description: 'Successfully sent emails'
      },
      {
        id: 'delivered',
        label: 'Emails Delivered',
        value: 46200,
        color: 'conversion',
        description: 'Delivered to inbox'
      },
      {
        id: 'opened',
        label: 'Emails Opened',
        value: 13860,
        color: 'open',
        description: 'Recipients who opened email'
      },
      {
        id: 'clicked',
        label: 'Links Clicked',
        value: 2772,
        color: 'click',
        description: 'Recipients who clicked CTA'
      }
    ]

    render(
      <FunnelChart
        stages={emailCampaignStages}
        title="Email Campaign Conversion Funnel"
        height={500}
        showConversionRates={true}
        showDropoffRates={true}
        orientation="vertical"
      />
    )

    expect(screen.getByText('Email Campaign Conversion Funnel')).toBeInTheDocument()
    expect(screen.getByText('5 stages')).toBeInTheDocument()
    expect(screen.getByText('Top of funnel: 50K')).toBeInTheDocument()
    
    // Overall conversion rate: 2772 / 50000 = 5.5%
    expect(screen.getByText('Total conversion: 5.5%')).toBeInTheDocument()
    
    // All stage labels should be present
    expect(screen.getByText('Targeted Audience')).toBeInTheDocument()
    expect(screen.getByText('Emails Sent')).toBeInTheDocument()
    expect(screen.getByText('Emails Delivered')).toBeInTheDocument()
    expect(screen.getByText('Emails Opened')).toBeInTheDocument()
    expect(screen.getByText('Links Clicked')).toBeInTheDocument()
    
    // Check formatted numbers
    expect(screen.getByText('50K')).toBeInTheDocument()
    expect(screen.getByText('48.5K')).toBeInTheDocument()
    expect(screen.getByText('46.2K')).toBeInTheDocument()
    expect(screen.getByText('13.9K')).toBeInTheDocument()
    expect(screen.getByText('2,772')).toBeInTheDocument()
  })

  it('handles single stage funnel', () => {
    const singleStage: FunnelStage[] = [
      { id: 'only', label: 'Only Stage', value: 1000, color: 'baseline' }
    ]

    render(<FunnelChart stages={singleStage} />)
    
    expect(screen.getByText('Only Stage')).toBeInTheDocument()
    expect(screen.getByText('1 stages')).toBeInTheDocument()
    expect(screen.getByText('Top of funnel: 1,000')).toBeInTheDocument()
    
    // No conversion rates should be shown for single stage
    expect(screen.queryByText(/% conversion/)).not.toBeInTheDocument()
  })
})