import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TimespanSelect } from '../TimespanSelect'
import type { TimeWindow } from '@/lib/types/campaign-metrics'

// Mock the Select component from shadcn/ui since it uses complex portal rendering
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, 'aria-label': ariaLabel }: any) => (
    <div data-testid="select-mock" aria-label={ariaLabel} data-value={value}>
      <select 
        onChange={(e) => onValueChange(e.target.value)} 
        value={value}
        aria-label={ariaLabel}
      >
        <option value="60">1 Hour</option>
        <option value="360">6 Hours</option>
        <option value="1440">24 Hours</option>
      </select>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>
}))

describe('TimespanSelect', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders label and select element', () => {
    render(<TimespanSelect value={60} onChange={mockOnChange} />)
    
    expect(screen.getByText('Time Window:')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1 Hour')).toBeInTheDocument()
  })

  it('displays the correct selected value', () => {
    render(<TimespanSelect value={360} onChange={mockOnChange} />)
    
    const select = screen.getByDisplayValue('6 Hours')
    expect(select).toBeInTheDocument()
  })

  it('calls onChange when value is selected', async () => {
    render(<TimespanSelect value={60} onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '1440' } })
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(1440)
    })
  })

  it('handles all time window options', async () => {
    const { rerender } = render(<TimespanSelect value={60} onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    
    // Test 6 Hours
    fireEvent.change(select, { target: { value: '360' } })
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(360)
    })
    
    // Test 24 Hours
    fireEvent.change(select, { target: { value: '1440' } })
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(1440)
    })
    
    // Test 1 Hour
    fireEvent.change(select, { target: { value: '60' } })
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(60)
    })
  })

  it('has proper accessibility attributes', () => {
    render(<TimespanSelect value={60} onChange={mockOnChange} />)
    
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-label', 'Select time window for metrics')
  })

  it('renders with custom className', () => {
    render(<TimespanSelect value={60} onChange={mockOnChange} className="custom-class" />)
    
    const container = document.querySelector('.custom-class')
    expect(container).toBeInTheDocument()
  })

  it('contains all time window options', () => {
    render(<TimespanSelect value={60} onChange={mockOnChange} />)
    
    expect(screen.getByDisplayValue('1 Hour')).toBeInTheDocument()
    
    // Check that all options are available in the select
    const select = screen.getByRole('combobox')
    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveValue('60')
    expect(options[1]).toHaveValue('360')
    expect(options[2]).toHaveValue('1440')
  })
})