/**
 * Accessibility utilities for analytics components
 * Provides ARIA labels, screen reader support, and keyboard navigation
 */

// Generate accessible descriptions for KPI cards
export function generateKpiCardAriaLabel(
  label: string,
  value: string | number,
  deltaPct?: number,
  subtitle?: string
): string {
  let description = `${label}: ${value}`
  
  if (subtitle) {
    description += `, ${subtitle}`
  }
  
  if (deltaPct !== undefined && deltaPct !== null) {
    const direction = deltaPct > 0 ? 'increased' : deltaPct < 0 ? 'decreased' : 'unchanged'
    description += `, ${direction} by ${Math.abs(deltaPct)}%`
  }
  
  return description
}

// Generate chart descriptions for screen readers
export function generateChartDescription(
  chartType: 'line' | 'bar' | 'funnel' | 'table',
  title?: string,
  dataPoints?: number,
  series?: number
): string {
  let description = ''
  
  switch (chartType) {
    case 'line':
      description = `Line chart${title ? ` titled "${title}"` : ''}`
      break
    case 'bar':
      description = `Bar chart${title ? ` titled "${title}"` : ''}`
      break
    case 'funnel':
      description = `Funnel chart${title ? ` titled "${title}"` : ''} showing conversion stages`
      break
    case 'table':
      description = `Data table${title ? ` titled "${title}"` : ''}`
      break
  }
  
  if (series && series > 0) {
    description += ` with ${series} data series`
  }
  
  if (dataPoints && dataPoints > 0) {
    description += ` containing ${dataPoints} data points`
  }
  
  return description
}

// Generate table accessibility attributes
export function generateTableAriaAttributes(
  columns: Array<{ id: string; label: string; type?: string }>,
  totalRows: number,
  currentPage?: number,
  totalPages?: number
) {
  const description = `Table with ${columns.length} columns and ${totalRows} rows`
  const paginationInfo = currentPage && totalPages ? 
    `, showing page ${currentPage} of ${totalPages}` : ''
  
  return {
    role: 'table',
    'aria-label': description + paginationInfo,
    'aria-rowcount': totalRows + 1, // +1 for header
    'aria-colcount': columns.length
  }
}

// Generate column header attributes
export function generateColumnHeaderAttributes(
  column: { id: string; label: string; type?: string; sortable?: boolean },
  sortDirection?: 'asc' | 'desc' | null,
  sortColumn?: string
) {
  const attributes: Record<string, any> = {
    role: 'columnheader',
    'aria-label': column.label
  }
  
  if (column.sortable !== false) {
    attributes['aria-sort'] = sortColumn === column.id 
      ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none')
      : 'none'
    attributes.tabIndex = 0
    attributes['aria-label'] += ', sortable'
  }
  
  return attributes
}

// Generate cell attributes with proper type information
export function generateCellAttributes(
  value: any,
  column: { id: string; type?: string; label: string },
  rowIndex: number,
  colIndex: number
) {
  const attributes: Record<string, any> = {
    role: 'cell',
    'aria-rowindex': rowIndex + 2, // +2 because 1-indexed and account for header
    'aria-colindex': colIndex + 1 // 1-indexed
  }
  
  // Add type-specific ARIA labels for better context
  if (column.type === 'percentage') {
    attributes['aria-label'] = `${column.label}: ${value}%`
  } else if (column.type === 'currency') {
    attributes['aria-label'] = `${column.label}: ${value} won`
  } else if (column.type === 'number') {
    attributes['aria-label'] = `${column.label}: ${value}`
  }
  
  return attributes
}

// Keyboard navigation helpers
export const keyboardHandlers = {
  // Handle arrow keys for table navigation
  handleTableNavigation: (
    event: React.KeyboardEvent,
    currentRow: number,
    currentCol: number,
    maxRows: number,
    maxCols: number,
    onNavigate: (row: number, col: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        if (currentRow > 0) onNavigate(currentRow - 1, currentCol)
        break
      case 'ArrowDown':
        event.preventDefault()
        if (currentRow < maxRows - 1) onNavigate(currentRow + 1, currentCol)
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (currentCol > 0) onNavigate(currentRow, currentCol - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        if (currentCol < maxCols - 1) onNavigate(currentRow, currentCol + 1)
        break
      case 'Home':
        event.preventDefault()
        onNavigate(currentRow, 0)
        break
      case 'End':
        event.preventDefault()
        onNavigate(currentRow, maxCols - 1)
        break
      case 'PageUp':
        event.preventDefault()
        onNavigate(Math.max(0, currentRow - 10), currentCol)
        break
      case 'PageDown':
        event.preventDefault()
        onNavigate(Math.min(maxRows - 1, currentRow + 10), currentCol)
        break
    }
  },

  // Handle Enter/Space for button activation
  handleButtonActivation: (
    event: React.KeyboardEvent,
    onClick: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
}

// Screen reader announcements
export class ScreenReaderAnnouncements {
  private static announcer: HTMLDivElement | null = null

  static init() {
    if (this.announcer || typeof document === 'undefined') return

    this.announcer = document.createElement('div')
    this.announcer.setAttribute('aria-live', 'polite')
    this.announcer.setAttribute('aria-atomic', 'true')
    this.announcer.style.position = 'absolute'
    this.announcer.style.left = '-10000px'
    this.announcer.style.width = '1px'
    this.announcer.style.height = '1px'
    this.announcer.style.overflow = 'hidden'
    document.body.appendChild(this.announcer)
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announcer) this.init()
    if (!this.announcer) return

    this.announcer.setAttribute('aria-live', priority)
    this.announcer.textContent = message
    
    // Clear after announcement to allow for repeated announcements
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = ''
      }
    }, 1000)
  }

  static announceDataUpdate(type: 'chart' | 'table' | 'kpi', itemsCount?: number) {
    const typeLabel = type === 'kpi' ? 'metrics' : type
    const message = itemsCount 
      ? `${typeLabel} updated with ${itemsCount} items`
      : `${typeLabel} updated`
    
    this.announce(message)
  }

  static announceError(message: string) {
    this.announce(`Error: ${message}`, 'assertive')
  }

  static announceLoading(type: 'chart' | 'table' | 'kpi') {
    this.announce(`Loading ${type}...`)
  }
}

// Color contrast helpers
export function ensureColorContrast(
  foreground: string,
  background: string,
  minRatio = 4.5
): boolean {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  // This is a placeholder for the concept
  return true
}

// Focus management
export class FocusManager {
  private static focusStack: HTMLElement[] = []

  static saveFocus() {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement)
    }
  }

  static restoreFocus() {
    const element = this.focusStack.pop()
    if (element && element.focus) {
      element.focus()
    }
  }

  static trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }
}

// Alternative text generation for charts
export function generateChartAltText(
  chartType: 'line' | 'bar' | 'funnel',
  data: any[],
  title?: string
): string {
  if (!data.length) return `Empty ${chartType} chart`

  let altText = `${chartType} chart`
  if (title) altText += ` titled "${title}"`

  // Add basic data summary
  if (chartType === 'funnel') {
    const stages = data.length
    altText += ` showing ${stages} conversion stages`
    
    if (data.length >= 2) {
      const firstStage = data[0]
      const lastStage = data[data.length - 1]
      const conversionRate = firstStage.value > 0 
        ? ((lastStage.value / firstStage.value) * 100).toFixed(1)
        : '0'
      altText += ` with ${conversionRate}% overall conversion rate`
    }
  } else {
    altText += ` with ${data.length} data points`
    
    // Add trend information for line charts
    if (chartType === 'line' && data.length >= 2) {
      const firstValue = data[0].value || 0
      const lastValue = data[data.length - 1].value || 0
      const trend = lastValue > firstValue ? 'increasing' : 
                   lastValue < firstValue ? 'decreasing' : 'stable'
      altText += ` showing ${trend} trend`
    }
  }

  return altText
}

// Initialize screen reader announcements when this module is imported
if (typeof window !== 'undefined') {
  ScreenReaderAnnouncements.init()
}