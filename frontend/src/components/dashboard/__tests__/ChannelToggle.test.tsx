import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChannelToggle } from '../ChannelToggle'
import type { ChannelFilter } from '@/lib/types/campaign-metrics'

describe('ChannelToggle', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders all channel options', () => {
    render(<ChannelToggle value="all" onChange={mockOnChange} />)
    
    expect(screen.getByText('Channel:')).toBeInTheDocument()
    expect(screen.getByText('All Channels')).toBeInTheDocument()
    expect(screen.getByText('SMS')).toBeInTheDocument()
    expect(screen.getByText('KakaoTalk')).toBeInTheDocument()
  })

  it('highlights the selected option', () => {
    render(<ChannelToggle value="sms" onChange={mockOnChange} />)
    
    const smsButton = screen.getByRole('radio', { name: 'SMS' })
    expect(smsButton).toHaveAttribute('aria-checked', 'true')
    expect(smsButton).toHaveClass('bg-white', 'text-blue-600')
    
    const allButton = screen.getByRole('radio', { name: 'All Channels' })
    expect(allButton).toHaveAttribute('aria-checked', 'false')
    expect(allButton).toHaveClass('text-gray-600')
  })

  it('calls onChange when option is clicked', () => {
    render(<ChannelToggle value="all" onChange={mockOnChange} />)
    
    const smsButton = screen.getByRole('radio', { name: 'SMS' })
    fireEvent.click(smsButton)
    
    expect(mockOnChange).toHaveBeenCalledWith('sms')
  })

  it('handles all channel options correctly', () => {
    render(<ChannelToggle value="all" onChange={mockOnChange} />)
    
    fireEvent.click(screen.getByRole('radio', { name: 'SMS' }))
    expect(mockOnChange).toHaveBeenCalledWith('sms')
    
    fireEvent.click(screen.getByRole('radio', { name: 'KakaoTalk' }))
    expect(mockOnChange).toHaveBeenCalledWith('kakao')
    
    fireEvent.click(screen.getByRole('radio', { name: 'All Channels' }))
    expect(mockOnChange).toHaveBeenCalledWith('all')
  })

  it('has proper accessibility attributes', () => {
    render(<ChannelToggle value="all" onChange={mockOnChange} />)
    
    const radioGroup = screen.getByRole('radiogroup')
    expect(radioGroup).toHaveAttribute('aria-label', 'Select channel filter')
    
    const buttons = screen.getAllByRole('radio')
    expect(buttons).toHaveLength(3)
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('aria-checked')
    })
  })

  it('supports keyboard navigation', () => {
    render(<ChannelToggle value="all" onChange={mockOnChange} />)
    
    const smsButton = screen.getByRole('radio', { name: 'SMS' })
    smsButton.focus()
    expect(smsButton).toHaveFocus()
    
    fireEvent.keyDown(smsButton, { key: 'Enter' })
    expect(mockOnChange).toHaveBeenCalledWith('sms')
  })
})