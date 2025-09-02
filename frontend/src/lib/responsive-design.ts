/**
 * Responsive design and dark mode utilities for analytics components
 */

import React, { useEffect, useState } from 'react'

// Breakpoint definitions
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export type Breakpoint = keyof typeof breakpoints

// Hook for responsive behavior
export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg')
  const [width, setWidth] = useState<number>(1024)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateBreakpoint = () => {
      const w = window.innerWidth
      setWidth(w)

      if (w >= breakpoints['2xl']) setCurrentBreakpoint('2xl')
      else if (w >= breakpoints.xl) setCurrentBreakpoint('xl')
      else if (w >= breakpoints.lg) setCurrentBreakpoint('lg')
      else if (w >= breakpoints.md) setCurrentBreakpoint('md')
      else if (w >= breakpoints.sm) setCurrentBreakpoint('sm')
      else setCurrentBreakpoint('xs')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return {
    current: currentBreakpoint,
    width,
    is: (breakpoint: Breakpoint) => currentBreakpoint === breakpoint,
    isAbove: (breakpoint: Breakpoint) => width >= breakpoints[breakpoint],
    isBelow: (breakpoint: Breakpoint) => width < breakpoints[breakpoint]
  }
}

// Dark mode detection and management
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for dark mode preference
    const checkDarkMode = () => {
      const isDarkMode = 
        document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(isDarkMode)
    }

    checkDarkMode()

    // Watch for changes in dark mode
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkDarkMode)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkDarkMode)
    }
  }, [])

  return isDark
}

// Responsive chart dimensions
export function getResponsiveChartDimensions(
  breakpoint: Breakpoint,
  type: 'kpi' | 'chart' | 'table' | 'funnel'
) {
  const dimensions = {
    kpi: {
      xs: { height: 120, cols: 1 },
      sm: { height: 140, cols: 2 },
      md: { height: 160, cols: 2 },
      lg: { height: 160, cols: 4 },
      xl: { height: 180, cols: 4 },
      '2xl': { height: 180, cols: 4 }
    },
    chart: {
      xs: { height: 300, aspectRatio: 1.2 },
      sm: { height: 350, aspectRatio: 1.4 },
      md: { height: 400, aspectRatio: 1.6 },
      lg: { height: 400, aspectRatio: 1.8 },
      xl: { height: 450, aspectRatio: 2.0 },
      '2xl': { height: 500, aspectRatio: 2.2 }
    },
    table: {
      xs: { height: 400, pageSize: 5 },
      sm: { height: 500, pageSize: 10 },
      md: { height: 600, pageSize: 10 },
      lg: { height: 600, pageSize: 15 },
      xl: { height: 700, pageSize: 15 },
      '2xl': { height: 800, pageSize: 20 }
    },
    funnel: {
      xs: { height: 400, orientation: 'vertical' as const },
      sm: { height: 500, orientation: 'vertical' as const },
      md: { height: 300, orientation: 'horizontal' as const },
      lg: { height: 350, orientation: 'horizontal' as const },
      xl: { height: 400, orientation: 'horizontal' as const },
      '2xl': { height: 450, orientation: 'horizontal' as const }
    }
  }

  return dimensions[type][breakpoint]
}

// Responsive grid configurations
export const gridConfigs = {
  kpiCards: {
    xs: 'grid-cols-1',
    sm: 'grid-cols-2',
    md: 'grid-cols-2',
    lg: 'grid-cols-4',
    xl: 'grid-cols-4',
    '2xl': 'grid-cols-4'
  },
  dashboardLayout: {
    xs: 'grid-cols-1',
    sm: 'grid-cols-1',
    md: 'grid-cols-2',
    lg: 'grid-cols-3',
    xl: 'grid-cols-3',
    '2xl': 'grid-cols-4'
  },
  chartGrid: {
    xs: 'grid-cols-1',
    sm: 'grid-cols-1',
    md: 'grid-cols-2',
    lg: 'grid-cols-2',
    xl: 'grid-cols-3',
    '2xl': 'grid-cols-3'
  }
}

// Responsive text sizes
export const textSizes = {
  title: {
    xs: 'text-lg',
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-3xl'
  },
  subtitle: {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-lg',
    '2xl': 'text-xl'
  },
  body: {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-base',
    '2xl': 'text-base'
  },
  caption: {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-sm',
    '2xl': 'text-sm'
  }
}

// Responsive spacing
export const spacing = {
  container: {
    xs: 'px-4 py-4',
    sm: 'px-6 py-6',
    md: 'px-6 py-8',
    lg: 'px-8 py-8',
    xl: 'px-8 py-10',
    '2xl': 'px-10 py-12'
  },
  section: {
    xs: 'space-y-4',
    sm: 'space-y-6',
    md: 'space-y-6',
    lg: 'space-y-8',
    xl: 'space-y-8',
    '2xl': 'space-y-10'
  },
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-4',
    xl: 'gap-6',
    '2xl': 'gap-6'
  }
}

// Dark mode color overrides for charts
export const darkModeChartColors = {
  baseline: {
    primary: '#64748b', // slate-500
    light: '#94a3b8', // slate-400
    lighter: '#cbd5e1', // slate-300
    background: 'rgba(100, 116, 139, 0.1)',
    border: '#334155' // slate-700
  },
  conversion: {
    primary: '#10b981', // emerald-500
    light: '#34d399', // emerald-400
    lighter: '#6ee7b7', // emerald-300
    background: 'rgba(16, 185, 129, 0.1)',
    border: '#047857' // emerald-700
  },
  open: {
    primary: '#3b82f6', // blue-500
    light: '#60a5fa', // blue-400
    lighter: '#93c5fd', // blue-300
    background: 'rgba(59, 130, 246, 0.1)',
    border: '#1e40af' // blue-700
  },
  click: {
    primary: '#f59e0b', // amber-500
    light: '#fbbf24', // amber-400
    lighter: '#fcd34d', // amber-300
    background: 'rgba(245, 158, 11, 0.1)',
    border: '#b45309' // amber-700
  },
  neutral: {
    primary: '#9ca3af', // gray-400
    light: '#d1d5db', // gray-300
    lighter: '#e5e7eb', // gray-200
    background: 'rgba(156, 163, 175, 0.1)',
    border: '#4b5563' // gray-600
  }
}

// Utility to get responsive classes
export function getResponsiveClasses(
  config: Record<Breakpoint, string>,
  breakpoint: Breakpoint
): string {
  const classes: string[] = []
  
  // Add classes for current breakpoint and below
  for (const [bp, className] of Object.entries(config)) {
    if (breakpoints[bp as Breakpoint] <= breakpoints[breakpoint]) {
      if (bp === 'xs') {
        classes.push(className)
      } else {
        classes.push(`${bp}:${className}`)
      }
    }
  }
  
  return classes.join(' ')
}

// Component that provides responsive context
export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const breakpoint = useBreakpoint()
  const isDark = useDarkMode()

  useEffect(() => {
    // Add responsive classes to document
    const classes = [
      `bp-${breakpoint.current}`,
      isDark ? 'dark-mode' : 'light-mode'
    ]
    
    document.documentElement.className = document.documentElement.className
      .replace(/bp-\w+|dark-mode|light-mode/g, '')
      .trim() + ' ' + classes.join(' ')
  }, [breakpoint.current, isDark])

  return React.createElement(React.Fragment, null, children)
}

// Hook for responsive chart options
export function useResponsiveChartOptions(
  type: 'line' | 'bar' | 'funnel',
  baseOptions: any = {}
) {
  const breakpoint = useBreakpoint()
  const isDark = useDarkMode()

  return useMemo(() => {
    const dimensions = getResponsiveChartDimensions(breakpoint.current, 'chart')
    
    const responsiveOptions = {
      ...baseOptions,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          display: breakpoint.isAbove('md'),
          position: breakpoint.isAbove('lg') ? 'top' : 'bottom',
          labels: {
            ...baseOptions.plugins?.legend?.labels,
            boxWidth: breakpoint.isAbove('md') ? 12 : 8,
            font: {
              size: breakpoint.isAbove('md') ? 12 : 10
            }
          }
        },
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          titleFont: {
            size: breakpoint.isAbove('md') ? 14 : 12
          },
          bodyFont: {
            size: breakpoint.isAbove('md') ? 12 : 10
          }
        }
      },
      scales: {
        ...baseOptions.scales,
        x: {
          ...baseOptions.scales?.x,
          ticks: {
            ...baseOptions.scales?.x?.ticks,
            font: {
              size: breakpoint.isAbove('md') ? 11 : 9
            },
            maxTicksLimit: breakpoint.isAbove('md') ? 12 : 8
          }
        },
        y: {
          ...baseOptions.scales?.y,
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            font: {
              size: breakpoint.isAbove('md') ? 11 : 9
            }
          }
        }
      }
    }

    // Apply dark mode overrides if needed
    if (isDark) {
      responsiveOptions.plugins = {
        ...responsiveOptions.plugins,
        tooltip: {
          ...responsiveOptions.plugins.tooltip,
          backgroundColor: 'rgba(31, 41, 55, 0.9)',
          titleColor: '#f9fafb',
          bodyColor: '#f9fafb',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        }
      }
    }

    return responsiveOptions
  }, [baseOptions, breakpoint.current, isDark])
}

import { useMemo } from 'react'