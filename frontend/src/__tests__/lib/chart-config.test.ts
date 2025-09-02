/**
 * Unit tests for chart configuration utilities
 */

import {
  chartColors,
  defaultChartOptions,
  formatNumber,
  formatPercentage,
  formatCurrency,
  formatDate,
  createLineDataset,
  createBarDataset,
  timeScaleOptions,
  tooltipFormatters
} from '@/lib/chart-config'

describe('Chart Colors', () => {
  it('defines all required color variants', () => {
    const requiredColors = ['baseline', 'conversion', 'open', 'click', 'neutral', 'error', 'warning', 'success']
    
    requiredColors.forEach(color => {
      expect(chartColors[color as keyof typeof chartColors]).toBeDefined()
      expect(chartColors[color as keyof typeof chartColors]).toHaveProperty('primary')
      expect(chartColors[color as keyof typeof chartColors]).toHaveProperty('light')
      expect(chartColors[color as keyof typeof chartColors]).toHaveProperty('lighter')
      expect(chartColors[color as keyof typeof chartColors]).toHaveProperty('background')
      expect(chartColors[color as keyof typeof chartColors]).toHaveProperty('border')
    })
  })

  it('has valid hex color values', () => {
    const hexColorRegex = /^#[0-9a-f]{6}$/i
    
    Object.values(chartColors).forEach(colorSet => {
      expect(colorSet.primary).toMatch(hexColorRegex)
      expect(colorSet.light).toMatch(hexColorRegex)
      expect(colorSet.lighter).toMatch(hexColorRegex)
      expect(colorSet.border).toMatch(hexColorRegex)
      // background can be hex or rgba
      expect(colorSet.background).toMatch(/^(#[0-9a-f]{6}|rgba?\(.+\))$/i)
    })
  })
})

describe('Default Chart Options', () => {
  it('has required configuration structure', () => {
    expect(defaultChartOptions).toHaveProperty('responsive', true)
    expect(defaultChartOptions).toHaveProperty('maintainAspectRatio', false)
    expect(defaultChartOptions).toHaveProperty('interaction')
    expect(defaultChartOptions).toHaveProperty('plugins')
    expect(defaultChartOptions).toHaveProperty('scales')
    expect(defaultChartOptions).toHaveProperty('elements')
    expect(defaultChartOptions).toHaveProperty('animation')
  })

  it('configures accessibility features', () => {
    expect(defaultChartOptions.plugins.legend.labels.usePointStyle).toBe(true)
    expect(defaultChartOptions.plugins.tooltip.displayColors).toBe(true)
    expect(defaultChartOptions.interaction.mode).toBe('index')
    expect(defaultChartOptions.interaction.intersect).toBe(false)
  })

  it('sets appropriate font sizes', () => {
    expect(defaultChartOptions.plugins.legend.labels.font.size).toBe(12)
    expect(defaultChartOptions.scales.x.ticks.font.size).toBe(11)
    expect(defaultChartOptions.scales.y.ticks.font.size).toBe(11)
  })
})

describe('Number Formatting', () => {
  it('formats numbers correctly', () => {
    expect(formatNumber(1234)).toBe('1,234')
    expect(formatNumber(1500)).toBe('1.5K')
    expect(formatNumber(2500000)).toBe('2.5M')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(1000)).toBe('1.0K')
    expect(formatNumber(1000000)).toBe('1.0M')
  })

  it('handles edge cases', () => {
    expect(formatNumber(-1234)).toBe('-1,234')
    expect(formatNumber(0.5)).toBe('1') // Should round
    expect(formatNumber(999.9)).toBe('1,000') // Should round up
  })
})

describe('Percentage Formatting', () => {
  it('formats percentages correctly', () => {
    expect(formatPercentage(95.5)).toBe('95.5%')
    expect(formatPercentage(100)).toBe('100.0%')
    expect(formatPercentage(0)).toBe('0.0%')
    expect(formatPercentage(0.1)).toBe('0.1%')
  })
})

describe('Currency Formatting', () => {
  it('formats KRW currency correctly', () => {
    expect(formatCurrency(1000)).toBe('₩1,000')
    expect(formatCurrency(1500000)).toBe('₩1,500,000')
    expect(formatCurrency(0)).toBe('₩0')
  })

  it('supports other currencies', () => {
    expect(formatCurrency(1000, 'USD')).toBe('USD 1,000')
    expect(formatCurrency(1000, 'EUR')).toBe('EUR 1,000')
  })
})

describe('Date Formatting', () => {
  it('formats dates correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00Z')
    expect(formatDate(testDate)).toBe('Jan 15, 2024')
    expect(formatDate(testDate, 'yyyy-MM-dd')).toBe('2024-01-15')
    expect(formatDate(testDate, 'MMM dd, yyyy HH:mm')).toBe('Jan 15, 2024 10:30')
  })

  it('formats string dates correctly', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024')
    expect(formatDate('2024-01-15T10:30:00Z', 'HH:mm')).toBe('10:30')
  })

  it('handles invalid dates', () => {
    expect(formatDate('invalid-date')).toBe('invalid-date')
    expect(formatDate(null as any)).toBe('null')
  })
})

describe('Dataset Creation', () => {
  describe('createLineDataset', () => {
    it('creates line dataset with default options', () => {
      const data = [10, 20, 30, 40]
      const dataset = createLineDataset('Test Line', data, 'baseline')
      
      expect(dataset.label).toBe('Test Line')
      expect(dataset.data).toEqual(data)
      expect(dataset.borderColor).toBe(chartColors.baseline.primary)
      expect(dataset.backgroundColor).toBe(chartColors.baseline.primary)
      expect(dataset.fill).toBe(false)
      expect(dataset.tension).toBe(0.4)
      expect(dataset.borderWidth).toBe(2)
      expect(dataset.pointRadius).toBe(4)
      expect(dataset.hidden).toBe(false)
    })

    it('applies custom options', () => {
      const data = [10, 20, 30]
      const dataset = createLineDataset('Custom Line', data, 'conversion', {
        fill: true,
        tension: 0.2,
        borderWidth: 3,
        pointRadius: 6,
        hidden: true
      })
      
      expect(dataset.fill).toBe(true)
      expect(dataset.backgroundColor).toBe(chartColors.conversion.background)
      expect(dataset.tension).toBe(0.2)
      expect(dataset.borderWidth).toBe(3)
      expect(dataset.pointRadius).toBe(6)
      expect(dataset.pointHoverRadius).toBe(8)
      expect(dataset.hidden).toBe(true)
    })

    it('works with all color variants', () => {
      const colors = ['baseline', 'conversion', 'open', 'click', 'neutral'] as const
      
      colors.forEach(color => {
        const dataset = createLineDataset('Test', [1, 2, 3], color)
        expect(dataset.borderColor).toBe(chartColors[color].primary)
        expect(dataset.pointBackgroundColor).toBe(chartColors[color].primary)
      })
    })
  })

  describe('createBarDataset', () => {
    it('creates bar dataset with default options', () => {
      const data = [10, 20, 30, 40]
      const dataset = createBarDataset('Test Bar', data, 'open')
      
      expect(dataset.label).toBe('Test Bar')
      expect(dataset.data).toEqual(data)
      expect(dataset.backgroundColor).toBe(chartColors.open.light)
      expect(dataset.borderColor).toBe(chartColors.open.primary)
      expect(dataset.borderWidth).toBe(1)
      expect(dataset.borderRadius).toBe(4)
      expect(dataset.borderSkipped).toBe(false)
      expect(dataset.hidden).toBe(false)
    })

    it('applies custom options', () => {
      const data = [5, 10, 15]
      const dataset = createBarDataset('Custom Bar', data, 'click', {
        borderWidth: 2,
        borderRadius: 8,
        hidden: true
      })
      
      expect(dataset.borderWidth).toBe(2)
      expect(dataset.borderRadius).toBe(8)
      expect(dataset.hidden).toBe(true)
    })
  })
})

describe('Time Scale Options', () => {
  it('defines all time intervals', () => {
    const intervals = ['5m', '1h', '1d', '1w', '1M']
    
    intervals.forEach(interval => {
      expect(timeScaleOptions[interval as keyof typeof timeScaleOptions]).toBeDefined()
      const config = timeScaleOptions[interval as keyof typeof timeScaleOptions]
      
      expect(config).toHaveProperty('unit')
      expect(config).toHaveProperty('stepSize')
      expect(config).toHaveProperty('displayFormats')
      expect(config).toHaveProperty('tooltipFormat')
    })
  })

  it('has correct step sizes', () => {
    expect(timeScaleOptions['5m'].stepSize).toBe(5)
    expect(timeScaleOptions['1h'].stepSize).toBe(1)
    expect(timeScaleOptions['1d'].stepSize).toBe(1)
    expect(timeScaleOptions['1w'].stepSize).toBe(1)
    expect(timeScaleOptions['1M'].stepSize).toBe(1)
  })

  it('has appropriate display formats', () => {
    expect(timeScaleOptions['5m'].displayFormats.minute).toBe('HH:mm')
    expect(timeScaleOptions['1h'].displayFormats.hour).toBe('HH:mm')
    expect(timeScaleOptions['1d'].displayFormats.day).toBe('MMM dd')
    expect(timeScaleOptions['1w'].displayFormats.week).toBe('MMM dd')
    expect(timeScaleOptions['1M'].displayFormats.month).toBe('MMM yyyy')
  })
})

describe('Tooltip Formatters', () => {
  const mockTooltipItem = {
    dataset: { label: 'Test Dataset' },
    parsed: { y: 1500, x: 1640995200000 }, // Jan 01, 2022 timestamp
    dataIndex: 0
  }

  it('formats number tooltips correctly', () => {
    const result = tooltipFormatters.number(mockTooltipItem as any)
    expect(result).toBe('Test Dataset: 1.5K')
  })

  it('formats percentage tooltips correctly', () => {
    const percentageItem = { ...mockTooltipItem, parsed: { ...mockTooltipItem.parsed, y: 85.5 } }
    const result = tooltipFormatters.percentage(percentageItem as any)
    expect(result).toBe('Test Dataset: 85.5%')
  })

  it('formats currency tooltips correctly', () => {
    const currencyItem = { ...mockTooltipItem, parsed: { ...mockTooltipItem.parsed, y: 250000 } }
    const result = tooltipFormatters.currency(currencyItem as any)
    expect(result).toBe('Test Dataset: ₩250,000')
  })

  it('formats date tooltips correctly', () => {
    const result = tooltipFormatters.date(mockTooltipItem as any)
    // Should format the timestamp as a readable date
    expect(result).toMatch(/Jan \d{2}, 2022 \d{2}:\d{2}/)
  })

  it('handles invalid dates in date formatter', () => {
    const invalidDateItem = { ...mockTooltipItem, parsed: { ...mockTooltipItem.parsed, x: 'invalid' } }
    const result = tooltipFormatters.date(invalidDateItem as any)
    expect(result).toBe('invalid')
  })

  it('handles missing dataset labels', () => {
    const noLabelItem = { ...mockTooltipItem, dataset: {} }
    const result = tooltipFormatters.number(noLabelItem as any)
    expect(result).toBe(': 1.5K')
  })
})

describe('Integration Tests', () => {
  it('creates consistent color scheme across all utilities', () => {
    const testColors = ['baseline', 'conversion', 'open', 'click', 'neutral'] as const
    
    testColors.forEach(color => {
      const lineDataset = createLineDataset('Line', [1, 2, 3], color)
      const barDataset = createBarDataset('Bar', [1, 2, 3], color)
      
      // Line and bar datasets should use colors from the same color scheme
      expect(lineDataset.borderColor).toBe(chartColors[color].primary)
      expect(barDataset.borderColor).toBe(chartColors[color].primary)
      expect(barDataset.backgroundColor).toBe(chartColors[color].light)
    })
  })

  it('provides complete configuration for real-world usage', () => {
    // Test that all required pieces work together
    const mockData = [
      { x: '2024-01-01T00:00:00Z', y: 1000 },
      { x: '2024-01-01T01:00:00Z', y: 1500 },
      { x: '2024-01-01T02:00:00Z', y: 1200 }
    ]

    const dataset = createLineDataset('Campaign Performance', mockData, 'baseline', { fill: true })
    
    // Should work with defaultChartOptions
    const chartConfig = {
      data: { datasets: [dataset] },
      options: {
        ...defaultChartOptions,
        scales: {
          ...defaultChartOptions.scales,
          x: {
            ...defaultChartOptions.scales.x,
            type: 'time' as const,
            time: timeScaleOptions['1h']
          }
        },
        plugins: {
          ...defaultChartOptions.plugins,
          tooltip: {
            ...defaultChartOptions.plugins.tooltip,
            callbacks: {
              label: tooltipFormatters.number
            }
          }
        }
      }
    }

    expect(chartConfig.data.datasets).toHaveLength(1)
    expect(chartConfig.options.responsive).toBe(true)
    expect(chartConfig.options.scales.x.type).toBe('time')
    expect(chartConfig.options.plugins.tooltip.callbacks.label).toBe(tooltipFormatters.number)
  })
})