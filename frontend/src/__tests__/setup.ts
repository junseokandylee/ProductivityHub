/**
 * Test setup for analytics visualization components
 */

import '@testing-library/jest-dom'

// Mock Chart.js to avoid canvas rendering issues in tests
jest.mock('react-chartjs-2', () => ({
  Line: jest.fn(() => <div data-testid="line-chart">Line Chart</div>),
  Bar: jest.fn(() => <div data-testid="bar-chart">Bar Chart</div>),
  Pie: jest.fn(() => <div data-testid="pie-chart">Pie Chart</div>)
}))

// Mock chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    defaults: {
      plugins: {
        legend: {
          labels: {
            generateLabels: jest.fn()
          }
        }
      }
    }
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn(),
  TimeScale: jest.fn(),
  RadialLinearScale: jest.fn(),
  ArcElement: jest.fn()
}))

// Mock chartjs-adapter-date-fns
jest.mock('chartjs-adapter-date-fns', () => ({}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))

// Mock react-hook-form if needed
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
    watch: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(),
    reset: jest.fn()
  }),
  Controller: ({ render }: any) => render({ field: { onChange: jest.fn(), value: '' } })
}))

// Suppress console warnings during tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

// Extend expect with custom matchers if needed
expect.extend({
  toBeAccessible(received) {
    // Custom matcher for accessibility testing
    const pass = received.getAttribute('aria-label') || received.getAttribute('role')
    return {
      message: () => 
        pass 
          ? `Expected element not to have accessibility attributes`
          : `Expected element to have accessibility attributes`,
      pass
    }
  }
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R
    }
  }
}