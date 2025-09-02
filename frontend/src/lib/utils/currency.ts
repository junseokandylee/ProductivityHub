/**
 * Utility functions for currency formatting and localization
 */

export interface CurrencyOptions {
  currency?: string
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Format currency amount with proper localization
 */
export function formatCurrency(
  amount: number, 
  options: CurrencyOptions = {}
): string {
  const {
    currency = 'KRW',
    locale = 'ko-KR',
    minimumFractionDigits,
    maximumFractionDigits
  } = options

  // Handle special cases
  if (!isFinite(amount) || isNaN(amount)) {
    return currency === 'KRW' ? '₩0' : `${currency} 0`
  }

  // Use Intl.NumberFormat for proper localization
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: minimumFractionDigits ?? (currency === 'KRW' ? 0 : 2),
      maximumFractionDigits: maximumFractionDigits ?? (currency === 'KRW' ? 0 : 2)
    })
    
    return formatter.format(amount)
  } catch (error) {
    // Fallback for unsupported currencies
    console.warn(`Currency formatting failed for ${currency}:`, error)
    
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString(locale)}`
    }
    return `${currency} ${amount.toLocaleString(locale)}`
  }
}

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 */
export function formatCompactCurrency(
  amount: number,
  options: CurrencyOptions = {}
): string {
  const { currency = 'KRW', locale = 'ko-KR' } = options

  if (!isFinite(amount) || isNaN(amount)) {
    return formatCurrency(0, options)
  }

  const absAmount = Math.abs(amount)
  
  if (absAmount >= 1000000000) {
    const value = amount / 1000000000
    return formatCurrency(value, { ...options, maximumFractionDigits: 1 }) + 'B'
  } else if (absAmount >= 1000000) {
    const value = amount / 1000000
    return formatCurrency(value, { ...options, maximumFractionDigits: 1 }) + 'M'
  } else if (absAmount >= 1000) {
    const value = amount / 1000
    return formatCurrency(value, { ...options, maximumFractionDigits: 1 }) + 'K'
  }
  
  return formatCurrency(amount, options)
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: string, locale: string = 'ko-KR'): string {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    // Extract symbol from formatted zero
    const formatted = formatter.format(0)
    return formatted.replace(/\d/g, '').replace(/[,.\s]/g, '')
  } catch (error) {
    // Fallback symbols
    const symbols: Record<string, string> = {
      'KRW': '₩',
      'USD': '$',
      'EUR': '€',
      'JPY': '¥',
      'GBP': '£',
      'CNY': '¥'
    }
    
    return symbols[currency] || currency
  }
}

/**
 * Parse currency string back to number
 */
export function parseCurrency(currencyString: string, currency: string = 'KRW'): number {
  if (!currencyString) return 0
  
  // Remove currency symbols and formatting
  const cleanString = currencyString
    .replace(/[₩$€¥£]/g, '')
    .replace(/[A-Z]{3}/g, '') // Remove currency codes like USD, EUR
    .replace(/[,\s]/g, '')
    .trim()
  
  const number = parseFloat(cleanString)
  return isNaN(number) ? 0 : number
}

/**
 * Format currency for accessibility (screen readers)
 */
export function formatCurrencyAccessible(
  amount: number,
  options: CurrencyOptions = {}
): string {
  const { currency = 'KRW', locale = 'ko-KR' } = options
  
  const formatted = formatCurrency(amount, options)
  
  // Add currency name for screen readers
  const currencyNames: Record<string, Record<string, string>> = {
    'ko-KR': {
      'KRW': '원',
      'USD': '달러',
      'EUR': '유로',
      'JPY': '엔',
      'GBP': '파운드',
      'CNY': '위안'
    },
    'en-US': {
      'KRW': 'Korean won',
      'USD': 'US dollars',
      'EUR': 'euros',
      'JPY': 'Japanese yen',
      'GBP': 'British pounds',
      'CNY': 'Chinese yuan'
    }
  }
  
  const currencyName = currencyNames[locale]?.[currency] || currency
  
  return `${formatted} ${currencyName}`
}

/**
 * Format percentage with proper localization
 */
export function formatPercentage(
  value: number,
  options: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
): string {
  const { locale = 'ko-KR', minimumFractionDigits = 1, maximumFractionDigits = 1 } = options
  
  if (!isFinite(value) || isNaN(value)) {
    return '0.0%'
  }
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits
    })
    
    return formatter.format(value / 100)
  } catch (error) {
    return `${value.toFixed(maximumFractionDigits)}%`
  }
}