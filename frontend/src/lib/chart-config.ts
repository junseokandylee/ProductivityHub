import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  RadialLinearScale,
  ArcElement,
  TooltipItem
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { format } from 'date-fns'

// Register Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
  RadialLinearScale,
  ArcElement
)

// Design system colors
export const chartColors = {
  baseline: {
    primary: '#475569', // slate-600
    light: '#64748b', // slate-500
    lighter: '#94a3b8', // slate-400
    background: '#f8fafc', // slate-50
    border: '#e2e8f0' // slate-200
  },
  conversion: {
    primary: '#059669', // emerald-600
    light: '#10b981', // emerald-500
    lighter: '#34d399', // emerald-400
    background: '#ecfdf5', // emerald-50
    border: '#a7f3d0' // emerald-200
  },
  open: {
    primary: '#2563eb', // blue-600
    light: '#3b82f6', // blue-500
    lighter: '#60a5fa', // blue-400
    background: '#eff6ff', // blue-50
    border: '#93c5fd' // blue-200
  },
  click: {
    primary: '#d97706', // amber-600
    light: '#f59e0b', // amber-500
    lighter: '#fbbf24', // amber-400
    background: '#fffbeb', // amber-50
    border: '#fcd34d' // amber-200
  },
  neutral: {
    primary: '#6b7280', // gray-500
    light: '#9ca3af', // gray-400
    lighter: '#d1d5db', // gray-300
    background: '#f9fafb', // gray-50
    border: '#e5e7eb' // gray-200
  },
  error: {
    primary: '#dc2626', // red-600
    light: '#ef4444', // red-500
    lighter: '#f87171', // red-400
    background: '#fef2f2', // red-50
    border: '#fecaca' // red-200
  },
  warning: {
    primary: '#ea580c', // orange-600
    light: '#f97316', // orange-500
    lighter: '#fb923c', // orange-400
    background: '#fff7ed', // orange-50
    border: '#fed7aa' // orange-200
  },
  success: {
    primary: '#16a34a', // green-600
    light: '#22c55e', // green-500
    lighter: '#4ade80', // green-400
    background: '#f0fdf4', // green-50
    border: '#bbf7d0' // green-200
  }
}

// Common chart options
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
          weight: '500'
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      padding: 12,
      titleSpacing: 4,
      bodySpacing: 4,
      footerSpacing: 6,
      caretPadding: 8
    }
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)',
        borderColor: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          size: 11
        },
        color: '#6b7280'
      },
      title: {
        font: {
          size: 12,
          weight: '500'
        },
        color: '#374151'
      }
    },
    y: {
      display: true,
      position: 'left' as const,
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.05)',
        borderColor: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          size: 11
        },
        color: '#6b7280'
      },
      title: {
        font: {
          size: 12,
          weight: '500'
        },
        color: '#374151'
      },
      beginAtZero: true
    }
  },
  elements: {
    line: {
      borderJoinStyle: 'round' as const,
      borderCapStyle: 'round' as const,
      tension: 0.4
    },
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
      hoverBorderWidth: 3
    },
    bar: {
      borderRadius: 4,
      borderSkipped: false
    }
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const
  }
}

// Utility functions for formatting
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatCurrency(value: number, currency = 'KRW'): string {
  if (currency === 'KRW') {
    return `₩${value.toLocaleString()}`
  }
  return `${currency} ${value.toLocaleString()}`
}

export function formatDate(date: string | Date, format_string = 'MMM dd, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, format_string)
  } catch {
    return String(date)
  }
}

// Tooltip formatters
export const tooltipFormatters = {
  number: (context: TooltipItem<any>) => {
    const label = context.dataset.label || ''
    const value = context.parsed.y
    return `${label}: ${formatNumber(value)}`
  },
  
  percentage: (context: TooltipItem<any>) => {
    const label = context.dataset.label || ''
    const value = context.parsed.y
    return `${label}: ${formatPercentage(value)}`
  },
  
  currency: (context: TooltipItem<any>) => {
    const label = context.dataset.label || ''
    const value = context.parsed.y
    return `${label}: ${formatCurrency(value)}`
  },
  
  date: (context: TooltipItem<any>) => {
    const timestamp = context.parsed.x
    try {
      return formatDate(new Date(timestamp), 'MMM dd, yyyy HH:mm')
    } catch {
      return timestamp.toString()
    }
  }
}

// Common dataset configurations
export function createLineDataset(
  label: string,
  data: any[],
  color: keyof typeof chartColors,
  options: {
    fill?: boolean
    tension?: number
    borderWidth?: number
    pointRadius?: number
    hidden?: boolean
  } = {}
) {
  const colors = chartColors[color]
  
  return {
    label,
    data,
    borderColor: colors.primary,
    backgroundColor: options.fill ? colors.background : colors.primary,
    fill: options.fill || false,
    tension: options.tension ?? 0.4,
    borderWidth: options.borderWidth ?? 2,
    pointBackgroundColor: colors.primary,
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointRadius: options.pointRadius ?? 4,
    pointHoverRadius: (options.pointRadius ?? 4) + 2,
    pointHoverBackgroundColor: colors.primary,
    pointHoverBorderColor: '#ffffff',
    pointHoverBorderWidth: 2,
    hidden: options.hidden || false
  }
}

export function createBarDataset(
  label: string,
  data: any[],
  color: keyof typeof chartColors,
  options: {
    borderWidth?: number
    borderRadius?: number
    hidden?: boolean
  } = {}
) {
  const colors = chartColors[color]
  
  return {
    label,
    data,
    backgroundColor: colors.light,
    borderColor: colors.primary,
    borderWidth: options.borderWidth ?? 1,
    borderRadius: options.borderRadius ?? 4,
    borderSkipped: false,
    hidden: options.hidden || false
  }
}

// Time scale configurations
export const timeScaleOptions = {
  '5m': {
    unit: 'minute' as const,
    stepSize: 5,
    displayFormats: {
      minute: 'HH:mm'
    },
    tooltipFormat: 'MMM dd, HH:mm'
  },
  '1h': {
    unit: 'hour' as const,
    stepSize: 1,
    displayFormats: {
      hour: 'HH:mm'
    },
    tooltipFormat: 'MMM dd, HH:mm'
  },
  '1d': {
    unit: 'day' as const,
    stepSize: 1,
    displayFormats: {
      day: 'MMM dd'
    },
    tooltipFormat: 'MMM dd, yyyy'
  },
  '1w': {
    unit: 'week' as const,
    stepSize: 1,
    displayFormats: {
      week: 'MMM dd'
    },
    tooltipFormat: 'MMM dd, yyyy'
  },
  '1M': {
    unit: 'month' as const,
    stepSize: 1,
    displayFormats: {
      month: 'MMM yyyy'
    },
    tooltipFormat: 'MMM yyyy'
  }
}

// Accessibility configuration
export const accessibilityOptions = {
  plugins: {
    legend: {
      labels: {
        generateLabels: (chart: any) => {
          const original = ChartJS.defaults.plugins.legend.labels.generateLabels
          const labels = original.call(this, chart)
          
          labels.forEach((label: any) => {
            // Add ARIA labels for better screen reader support
            if (label.text) {
              label.ariaLabel = `Dataset: ${label.text}`
            }
          })
          
          return labels
        }
      }
    }
  },
  // Add role and aria-label to canvas
  onHover: (event: any, activeElements: any[], chart: any) => {
    const canvas = chart.canvas
    canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default'
  }
}

// Dark mode color overrides
export const darkModeOverrides = {
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      },
      ticks: {
        color: '#d1d5db'
      },
      title: {
        color: '#f3f4f6'
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      },
      ticks: {
        color: '#d1d5db'
      },
      title: {
        color: '#f3f4f6'
      }
    }
  },
  plugins: {
    legend: {
      labels: {
        color: '#f3f4f6'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(31, 41, 55, 0.9)',
      titleColor: '#f9fafb',
      bodyColor: '#f9fafb',
      borderColor: 'rgba(255, 255, 255, 0.2)'
    }
  }
}