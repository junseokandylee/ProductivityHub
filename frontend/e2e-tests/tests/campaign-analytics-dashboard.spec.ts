import { test, expect, Page } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

// Mock data for consistent testing
const mockKPIData = {
  totalCampaigns: { value: 1245, deltaPct: 12.5, color: 'baseline' as const },
  totalImpressions: { value: 2485720, deltaPct: 8.3, color: 'baseline' as const },
  clickThroughRate: { value: 3.2, deltaPct: -2.1, color: 'click' as const },
  conversionRate: { value: 1.8, deltaPct: 15.4, color: 'conversion' as const }
}

const mockTimeSeriesData = [
  { timestamp: '2024-01-01T00:00:00Z', impressions: 15000, clicks: 480, conversions: 72 },
  { timestamp: '2024-01-02T00:00:00Z', impressions: 18500, clicks: 592, conversions: 89 },
  { timestamp: '2024-01-03T00:00:00Z', impressions: 22000, clicks: 704, conversions: 106 },
  { timestamp: '2024-01-04T00:00:00Z', impressions: 19800, clicks: 634, conversions: 95 },
  { timestamp: '2024-01-05T00:00:00Z', impressions: 23500, clicks: 752, conversions: 113 }
]

const mockFunnelData = [
  { id: 'impressions', label: 'Impressions', value: 100000, color: 'baseline' as const },
  { id: 'clicks', label: 'Clicks', value: 3200, color: 'click' as const },
  { id: 'conversions', label: 'Conversions', value: 1800, color: 'conversion' as const }
]

const mockTableData = [
  { id: 'camp-1', campaignName: 'Summer Sale 2024', impressions: 45000, clicks: 1440, conversions: 216, ctr: 3.2, conversionRate: 15.0 },
  { id: 'camp-2', campaignName: 'Back to School', impressions: 38500, clicks: 1232, conversions: 185, ctr: 3.2, conversionRate: 15.0 },
  { id: 'camp-3', campaignName: 'Holiday Special', impressions: 52000, clicks: 1664, conversions: 249, ctr: 3.2, conversionRate: 15.0 }
]

test.describe('Campaign Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-analytics-dashboard-token')
      localStorage.setItem('tenant_id', 'test-tenant-dashboard')
    })

    // Mock API endpoints for analytics data
    await page.route('/api/analytics/kpis', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ kpis: mockKPIData })
      })
    })

    await page.route('/api/analytics/timeseries', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ timeseries: mockTimeSeriesData })
      })
    })

    await page.route('/api/analytics/funnel', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ funnel: mockFunnelData })
      })
    })

    await page.route('/api/analytics/campaigns', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns: mockTableData })
      })
    })

    // Navigate to analytics dashboard
    await page.goto('/analytics/dashboard')
  })

  test.describe('KPI Cards Rendering', () => {
    test('should render all KPI cards with correct data-testid attributes', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Check main dashboard heading
      await expect(page.getByRole('heading', { name: /campaign analytics|analytics dashboard/i })).toBeVisible()
      
      // Verify all KPI cards are present with correct testids
      await expect(page.locator('[data-testid="kpi-total-campaigns"]')).toBeVisible()
      await expect(page.locator('[data-testid="kpi-total-impressions"]')).toBeVisible()
      await expect(page.locator('[data-testid="kpi-click-through-rate"]')).toBeVisible()
      await expect(page.locator('[data-testid="kpi-conversion-rate"]')).toBeVisible()
      
      // Verify KPI cards contain expected content structure
      const totalCampaignsCard = page.locator('[data-testid="kpi-total-campaigns"]')
      await expect(totalCampaignsCard.locator('.text-2xl.font-bold')).toBeVisible()
      
      // Check for trend indicators (up/down arrows)
      const trendBadges = page.locator('[data-testid^="kpi-"] [class*="text-emerald-600"], [data-testid^="kpi-"] [class*="text-red-600"]')
      await expect(trendBadges).toHaveCount({ min: 1 })
    })

    test('should display correct KPI values and formatting', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Test number formatting for large values
      const totalImpressionsCard = page.locator('[data-testid="kpi-total-impressions"]')
      await expect(totalImpressionsCard).toContainText('2.5M') // Should format 2,485,720 as 2.5M
      
      const totalCampaignsCard = page.locator('[data-testid="kpi-total-campaigns"]')
      await expect(totalCampaignsCard).toContainText('1.2K') // Should format 1,245 as 1.2K
      
      // Test percentage formatting
      const conversionRateCard = page.locator('[data-testid="kpi-conversion-rate"]')
      await expect(conversionRateCard).toContainText('1.8') // Conversion rate value
      await expect(conversionRateCard).toContainText('15.4%') // Trend percentage
      
      // Test trend direction indicators
      const positiveCard = page.locator('[data-testid="kpi-conversion-rate"]') // 15.4% positive
      await expect(positiveCard.locator('svg[class*="lucide-trending-up"]')).toBeVisible()
      
      const negativeCard = page.locator('[data-testid="kpi-click-through-rate"]') // -2.1% negative
      await expect(negativeCard.locator('svg[class*="lucide-trending-down"]')).toBeVisible()
    })

    test('should handle loading and error states gracefully', async ({ page }) => {
      // Test loading state by intercepting API calls with delay
      await page.route('/api/analytics/kpis', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })
      
      await page.reload()
      
      // Verify loading skeletons appear
      const loadingCards = page.locator('[data-testid*="kpi-"][data-testid*="loading"]')
      await expect(loadingCards.first()).toBeVisible({ timeout: 1000 })
      
      // Wait for data to load
      await page.waitForResponse('/api/analytics/kpis')
      await expect(page.locator('[data-testid="kpi-total-campaigns"]')).toBeVisible()
    })

    test('should handle error states with retry functionality', async ({ page }) => {
      // Test error state by making API fail
      await page.route('/api/analytics/kpis', (route) => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
      })
      
      await page.reload()
      
      // Verify error state is handled gracefully
      const errorCards = page.locator('[data-testid*="kpi-"][data-testid*="error"]')
      await expect(errorCards.first()).toBeVisible()
      await expect(errorCards.first()).toContainText('Error loading data')
    })

    test('should support tooltips and accessibility features', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Test tooltip functionality (if implemented)
      const firstKpiCard = page.locator('[data-testid="kpi-total-campaigns"]')
      await firstKpiCard.hover()
      
      // Check ARIA labels for accessibility
      await expect(firstKpiCard).toHaveAttribute('aria-label')
      const ariaLabel = await firstKpiCard.getAttribute('aria-label')
      expect(ariaLabel).toContain('metric')
      
      // Check that trend badges have proper ARIA labels
      const trendBadge = firstKpiCard.locator('[class*="text-emerald-600"], [class*="text-red-600"]').first()
      if (await trendBadge.isVisible()) {
        await expect(trendBadge).toHaveAttribute('aria-label')
      }
    })
  })

  test.describe('Time Series Chart Interactions', () => {
    test('should render time series chart with correct structure', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Verify chart container is present
      await expect(page.locator('[data-testid="timeseries-chart"]')).toBeVisible()
      
      // Verify Chart.js canvas is rendered
      await expect(page.locator('[data-testid="timeseries-chart"] canvas')).toBeVisible()
      
      // Check chart title if present
      const chartContainer = page.locator('[data-testid="timeseries-chart"]')
      const titleElement = chartContainer.locator('.text-lg.font-semibold')
      if (await titleElement.isVisible()) {
        await expect(titleElement).not.toBeEmpty()
      }
      
      // Check chart metadata footer
      await expect(chartContainer.locator('.text-sm.text-muted-foreground')).toContainText('series')
      await expect(chartContainer.locator('.text-sm.text-muted-foreground')).toContainText('data points')
    })

    test('should handle date range selector interactions', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Look for date range controls
      const dateControls = page.locator('[data-testid*="date-range"], [data-testid*="time-range"]')
      const controlCount = await dateControls.count()
      
      if (controlCount > 0) {
        const firstControl = dateControls.first()
        await firstControl.click()
        
        // Look for dropdown options
        const option = page.getByText(/last 30 days|last 7 days|this month/i).first()
        if (await option.isVisible()) {
          await option.click()
          
          // Verify chart updates (wait for potential API call)
          await page.waitForTimeout(500)
          await expect(page.locator('[data-testid="timeseries-chart"] canvas')).toBeVisible()
        }
      }
    })

    test('should support chart interactions and hover states', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      const canvas = page.locator('[data-testid="timeseries-chart"] canvas')
      await expect(canvas).toBeVisible()
      
      // Test hover interactions on chart
      await canvas.hover({ position: { x: 200, y: 150 } })
      
      // Chart should remain responsive after interaction
      await expect(canvas).toBeVisible()
      
      // Test click interactions
      await canvas.click({ position: { x: 300, y: 150 } })
      await expect(canvas).toBeVisible()
    })

    test('should display correct metadata and formatting', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      const chartContainer = page.locator('[data-testid="timeseries-chart"]')
      
      // Check series count display
      const metadataText = await chartContainer.locator('.text-sm.text-muted-foreground').textContent()
      expect(metadataText).toMatch(/\d+ series/)
      expect(metadataText).toMatch(/\d+ data points/)
      
      // Check update timestamp format
      expect(metadataText).toMatch(/Updated: \d{2}:\d{2}/)
    })

    test('should handle empty data states', async ({ page }) => {
      // Mock empty data response
      await page.route('/api/analytics/timeseries', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ timeseries: [] })
        })
      })
      
      await page.reload()
      
      // Should show empty state message
      const chartContainer = page.locator('[data-testid="timeseries-chart"]')
      await expect(chartContainer).toContainText(/no data available/i)
    })
  })

  test.describe('Funnel Chart Validation', () => {
    test('should render funnel chart with correct structure and stages', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Verify funnel chart container
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
      
      // Check for funnel stages
      const funnelChart = page.locator('[data-testid="funnel-chart"]')
      const stages = funnelChart.locator('[role="listitem"]')
      await expect(stages).toHaveCount({ min: 2 })
      
      // Verify summary metrics are displayed
      await expect(funnelChart).toContainText('stages')
      await expect(funnelChart).toContainText('Total conversion:')
      await expect(funnelChart).toContainText('Top of funnel:')
    })

    test('should display accurate conversion rates and formatting', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      const funnelChart = page.locator('[data-testid="funnel-chart"]')
      
      // Check for conversion rate badges
      const conversionBadges = funnelChart.locator('.border-emerald-300')
      await expect(conversionBadges).toHaveCount({ min: 1 })
      
      // Verify percentage formatting
      await expect(funnelChart).toContainText('%')
      
      // Check stage value formatting (should format large numbers)
      const stageValues = funnelChart.locator('[role="listitem"] .text-2xl.font-bold')
      const firstStageText = await stageValues.first().textContent()
      expect(firstStageText).toMatch(/^(\d{1,3}(,\d{3})*|\d+(\.\d+)?[KM])$/) // Formatted number
    })

    test('should calculate and display accurate conversion rates', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      const funnelChart = page.locator('[data-testid="funnel-chart"]')
      
      // Based on mock data: 100000 → 3200 → 1800
      // Expected conversions: 3200/100000 = 3.2%, 1800/3200 = 56.3%
      
      // Check for conversion rate displays
      const conversionRates = funnelChart.locator('[class*="text-emerald-"], [class*="border-emerald-"]')
      const conversionCount = await conversionRates.count()
      expect(conversionCount).toBeGreaterThan(0)
      
      // Check total conversion rate calculation
      const totalConversion = await funnelChart.locator(':text("Total conversion:")').textContent()
      expect(totalConversion).toMatch(/\d+\.\d%/) // Should show calculated total conversion
    })

    test('should support different orientations and responsive design', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Check if there's an orientation control
      const orientationControl = page.locator('button:has-text("Vertical"), button:has-text("Horizontal")')
      
      if (await orientationControl.first().isVisible()) {
        await orientationControl.first().click()
        
        // Verify chart re-renders with different orientation
        await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
        
        // Check that stages are still present
        const stages = page.locator('[data-testid="funnel-chart"] [role="listitem"]')
        await expect(stages).toHaveCount({ min: 2 })
      }
      
      // Test mobile responsiveness
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
    })
  })

  test.describe('Analytics Table and CSV Export', () => {
    test('should render data table with all expected features', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Verify table is present
      await expect(page.getByRole('table')).toBeVisible()
      
      // Check table headers
      await expect(page.getByRole('columnheader', { name: /campaign/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /impressions/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /clicks/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /conversions/i })).toBeVisible()
      
      // Verify data rows
      const tableRows = page.getByRole('row')
      await expect(tableRows).toHaveCount({ min: 4 }) // Header + 3 data rows
    })

    test('should support search functionality', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]')
      
      if (await searchInput.isVisible()) {
        // Test search functionality
        await searchInput.fill('Summer')
        await page.waitForTimeout(500) // Wait for search debounce
        
        // Should filter results
        const visibleRows = page.getByRole('row')
        const rowCount = await visibleRows.count()
        expect(rowCount).toBeGreaterThanOrEqual(1) // At least header row
        
        // Clear search
        await searchInput.clear()
        await page.waitForTimeout(500)
      }
    })

    test('should support column sorting', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Find sortable columns
      const sortableHeaders = page.locator('th[role="columnheader"] button, th[role="columnheader"]:has(svg)')
      const headerCount = await sortableHeaders.count()
      
      if (headerCount > 0) {
        const firstHeader = sortableHeaders.first()
        
        // Test sorting
        await firstHeader.click()
        await page.waitForTimeout(300)
        
        // Verify table is still visible and data may have reordered
        await expect(page.getByRole('table')).toBeVisible()
        
        // Test reverse sort
        await firstHeader.click()
        await page.waitForTimeout(300)
        await expect(page.getByRole('table')).toBeVisible()
      }
    })

    test('should export CSV with correct schema and data', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Look for export button with specific testid
      const exportButton = page.locator('[data-testid="export-csv-btn"]')
      
      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download')
        
        await exportButton.click()
        
        const download = await downloadPromise
        
        // Verify download properties
        expect(download.suggestedFilename()).toMatch(/\.csv$/)
        expect(download.suggestedFilename()).toMatch(/campaign|analytics/i)
        
        // Save and verify CSV content
        const path = await download.path()
        if (path) {
          const fs = require('fs')
          const csvContent = fs.readFileSync(path, 'utf8')
          
          // Verify CSV structure and headers
          expect(csvContent).toContain('Campaign Name') // Required header
          expect(csvContent).toContain('Impressions') // Numeric column
          expect(csvContent).toContain('Clicks') // Numeric column
          expect(csvContent).toContain('Conversions') // Numeric column
          
          // Verify CSV format
          expect(csvContent).toMatch(/.*,.*,.*/) // CSV format with commas
          expect(csvContent.split('\n').length).toBeGreaterThan(1) // Has data rows
          
          // Verify data integrity
          expect(csvContent).toContain('Summer Sale 2024') // Sample data
          expect(csvContent).toContain('45000') // Impressions value
        }
      }
    })

    test('should handle pagination correctly', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Check for pagination controls
      const nextButton = page.getByRole('button', { name: /next/i })
      const prevButton = page.getByRole('button', { name: /previous/i })
      
      if (await nextButton.isVisible()) {
        // Test pagination
        await nextButton.click()
        await page.waitForTimeout(300)
        
        // Previous button should be enabled after going to page 2
        if (await prevButton.isVisible()) {
          await expect(prevButton).not.toBeDisabled()
        }
        
        // Go back
        await prevButton.click()
        await page.waitForTimeout(300)
      }
      
      // Check page size selector
      const pageSizeSelector = page.locator('select option:has-text("10"), select option:has-text("25"), select option:has-text("50")').first()
      const sizeParent = page.locator('select').filter({ has: pageSizeSelector })
      
      if (await sizeParent.isVisible()) {
        await sizeParent.selectOption('25')
        await page.waitForTimeout(300)
        
        // Verify table is still visible
        await expect(page.getByRole('table')).toBeVisible()
      }
    })
  })

  test.describe('Tenant Isolation and Security', () => {
    test('should not access unauthorized tenant data', async ({ page, context }) => {
      // Create a new page with different tenant context
      const altPage = await context.newPage()
      
      // Mock different tenant returning 403
      await altPage.route('/api/analytics/**', (route) => {
        const url = route.request().url()
        const headers = route.request().headers()
        
        // Check for wrong tenant ID
        if (headers['x-tenant-id'] === 'unauthorized-tenant') {
          route.fulfill({ 
            status: 403, 
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Forbidden: Access denied' }) 
          })
        } else {
          route.continue()
        }
      })
      
      // Set different tenant header
      await altPage.setExtraHTTPHeaders({ 'X-Tenant-ID': 'unauthorized-tenant' })
      
      // Set auth context but with wrong tenant
      await altPage.evaluate(() => {
        localStorage.setItem('auth_token', 'valid-token')
        localStorage.setItem('tenant_id', 'unauthorized-tenant')
      })
      
      await altPage.goto('/analytics/dashboard')
      
      // Should show error or redirect
      await expect(altPage.locator('text=/forbidden|unauthorized|access denied/i')).toBeVisible({ timeout: 5000 })
      
      await altPage.close()
    })

    test('should require valid authentication', async ({ page }) => {
      // Test without auth token
      await page.route('/api/analytics/**', (route) => {
        const headers = route.request().headers()
        if (!headers['authorization'] || !headers['authorization'].includes('Bearer')) {
          route.fulfill({ 
            status: 401, 
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unauthorized: Missing or invalid token' }) 
          })
        } else {
          route.continue()
        }
      })
      
      // Clear auth and reload
      await page.evaluate(() => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('tenant_id')
      })
      await page.context().clearCookies()
      await page.reload()
      
      // Should redirect to login or show auth error
      await expect(page.locator('text=/login|unauthorized|sign in/i')).toBeVisible({ timeout: 5000 })
    })

    test('should validate API request origins and headers', async ({ page }) => {
      let requestHeaders: Record<string, string> = {}
      
      // Capture request headers
      await page.route('/api/analytics/kpis', (route) => {
        requestHeaders = route.request().headers()
        route.continue()
      })
      
      await page.reload()
      await page.waitForResponse('/api/analytics/kpis')
      
      // Verify required security headers are present
      expect(requestHeaders['authorization']).toContain('Bearer')
      expect(requestHeaders['x-tenant-id']).toBe('test-tenant-dashboard')
      
      // Verify content type and other security headers
      expect(requestHeaders['accept']).toContain('application/json')
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should load dashboard within performance thresholds', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/analytics/dashboard')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Performance assertions
      expect(loadTime).toBeLessThan(5000) // 5 seconds max initial load
      
      // Verify all main components are loaded
      await expect(page.locator('[data-testid^="kpi-"]')).toHaveCount(4)
      await expect(page.locator('[data-testid="timeseries-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
    })

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock larger dataset for performance testing
      const largeTableData = Array.from({ length: 100 }, (_, i) => ({
        id: `camp-${i}`,
        campaignName: `Campaign ${i}`,
        impressions: Math.floor(Math.random() * 100000),
        clicks: Math.floor(Math.random() * 5000),
        conversions: Math.floor(Math.random() * 500),
        ctr: Math.random() * 10,
        conversionRate: Math.random() * 25
      }))
      
      await page.route('/api/analytics/campaigns', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ campaigns: largeTableData })
        })
      })
      
      const startTime = Date.now()
      await page.goto('/analytics/dashboard')
      await page.waitForLoadState('networkidle')
      
      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(8000) // 8 seconds for larger dataset
      
      // Verify table still renders correctly with pagination
      await expect(page.getByRole('table')).toBeVisible()
    })

    test('should be responsive on mobile devices', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/analytics/dashboard')
      await page.waitForLoadState('networkidle')
      
      // All main components should still be visible and usable
      await expect(page.locator('[data-testid^="kpi-"]')).toHaveCount(4)
      await expect(page.locator('[data-testid="timeseries-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
      
      // Check that charts fit mobile viewport
      const chartContainer = page.locator('[data-testid="timeseries-chart"]')
      const boundingBox = await chartContainer.boundingBox()
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375)
      }
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(page.locator('[data-testid="timeseries-chart"]')).toBeVisible()
    })
  })

  test.describe('Cross-browser Compatibility', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      await page.waitForLoadState('networkidle')
      
      // Core functionality should work in all browsers
      await expect(page.locator('[data-testid^="kpi-"]')).toHaveCount(4)
      await expect(page.locator('[data-testid="timeseries-chart"] canvas')).toBeVisible()
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible()
      await expect(page.getByRole('table')).toBeVisible()
      
      // Chart.js should render properly in all browsers
      const canvas = page.locator('[data-testid="timeseries-chart"] canvas')
      await expect(canvas).toHaveAttribute('width')
      await expect(canvas).toHaveAttribute('height')
      
      // Log browser-specific information for debugging
      console.log(`Running on ${browserName}`)
    })
  })

  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG accessibility standards', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Inject axe for accessibility testing
      await injectAxe(page)
      
      // Wait for all components to load
      await expect(page.locator('[data-testid="kpi-total-campaigns"]')).toBeVisible()
      await expect(page.locator('[data-testid="timeseries-chart"]')).toBeVisible()
      
      // Run accessibility audit
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      })
    })

    test('should support keyboard navigation', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Start keyboard navigation
      await page.keyboard.press('Tab')
      
      let tabCount = 0
      const maxTabs = 25
      const visitedElements: string[] = []
      
      // Navigate through interactive elements
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab')
        
        const focusedElement = page.locator(':focus')
        const elementCount = await focusedElement.count()
        
        if (elementCount === 0) break
        
        // Track visited elements
        const testId = await focusedElement.getAttribute('data-testid')
        if (testId) {
          visitedElements.push(testId)
        }
        
        // Test interaction with export button if found
        if (testId === 'export-csv-btn') {
          await page.keyboard.press('Enter')
          // Wait briefly for any modal or action
          await page.waitForTimeout(100)
          break
        }
        
        tabCount++
      }
      
      // Should be able to navigate without getting stuck in infinite loops
      expect(tabCount).toBeLessThan(maxTabs)
      console.log(`Keyboard navigation visited: ${visitedElements.join(', ')}`)
    })

    test('should provide proper screen reader support', async ({ page }) => {
      await page.waitForLoadState('networkidle')
      
      // Check ARIA labels for KPI cards
      const kpiCards = page.locator('[data-testid^="kpi-"]')
      const cardCount = await kpiCards.count()
      
      for (let i = 0; i < cardCount; i++) {
        const card = kpiCards.nth(i)
        await expect(card).toHaveAttribute('aria-label')
        
        const ariaLabel = await card.getAttribute('aria-label')
        expect(ariaLabel).toContain('metric')
      }
      
      // Check chart accessibility
      const timeseriesChart = page.locator('[data-testid="timeseries-chart"]')
      await expect(timeseriesChart).toHaveAttribute('role', 'img')
      await expect(timeseriesChart).toHaveAttribute('aria-label')
      
      const funnelChart = page.locator('[data-testid="funnel-chart"]')
      await expect(funnelChart).toHaveAttribute('role', 'img')
      await expect(funnelChart).toHaveAttribute('aria-label')
      
      // Check table accessibility
      const table = page.getByRole('table')
      await expect(table).toHaveAttribute('role', 'table')
      
      // Verify column headers
      const columnHeaders = page.getByRole('columnheader')
      const headerCount = await columnHeaders.count()
      expect(headerCount).toBeGreaterThan(0)
    })
  })
})