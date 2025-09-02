import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { KpiCard } from '../KpiCard'

describe('KpiCard', () => {
  const mockProps = {
    label: 'Total Sent',
    value: 1234,
    format: 'number' as const,
    tooltip: 'Total messages sent',
    tone: 'default' as const
  }

  it('renders label and value correctly', () => {
    render(<KpiCard {...mockProps} />)
    
    expect(screen.getByText('Total Sent')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument() // Korean number format
  })

  it('displays loading skeleton when isLoading is true', () => {
    render(<KpiCard {...mockProps} isLoading={true} />)
    
    // Should show loading skeletons instead of actual content
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    
    // Should not show actual label or value
    expect(screen.queryByText('Total Sent')).not.toBeInTheDocument()
    expect(screen.queryByText('1,234')).not.toBeInTheDocument()
  })

  it('formats percentage values correctly', () => {
    render(
      <KpiCard 
        {...mockProps} 
        label="Success Rate"
        value={0.85} 
        format="percentage" 
      />
    )
    
    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(
      <KpiCard 
        {...mockProps} 
        label="Revenue"
        value={50000} 
        format="currency" 
      />
    )
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('₩50,000')).toBeInTheDocument()
  })

  it('displays rate when provided', () => {
    render(<KpiCard {...mockProps} rate={0.95} />)
    
    expect(screen.getByText('95% success rate')).toBeInTheDocument()
  })

  it('displays delta badge when provided', () => {
    render(<KpiCard {...mockProps} delta={150} />)
    
    expect(screen.getByText('+150')).toBeInTheDocument()
  })

  it('applies correct tone styles', () => {
    const { rerender } = render(<KpiCard {...mockProps} tone="success" />)
    
    let card = document.querySelector('[role="img"]')
    expect(card).toHaveClass('bg-green-50', 'border-green-200')
    
    rerender(<KpiCard {...mockProps} tone="destructive" />)
    card = document.querySelector('[role="img"]')
    expect(card).toHaveClass('bg-red-50', 'border-red-200')
    
    rerender(<KpiCard {...mockProps} tone="warning" />)
    card = document.querySelector('[role="img"]')
    expect(card).toHaveClass('bg-yellow-50', 'border-yellow-200')
  })

  it('has proper accessibility attributes', () => {
    render(<KpiCard {...mockProps} />)
    
    const card = screen.getByRole('img')
    expect(card).toHaveAttribute('aria-label', 'Total Sent: 1,234')
    expect(card).toHaveAttribute('title', 'Total messages sent')
  })

  it('has proper accessibility with rate', () => {
    render(<KpiCard {...mockProps} rate={0.95} />)
    
    const card = screen.getByRole('img')
    expect(card).toHaveAttribute('aria-label', 'Total Sent: 1,234 (95%)')
  })
})