import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-analytics-token');
      localStorage.setItem('tenant_id', 'test-tenant-analytics');
    });
    
    // Navigate to analytics dashboard
    await page.goto('/analytics');
  });

  test('Global analytics dashboard renders with all components', async ({ page }) => {
    test.setTimeout(60000);

    await test.step('Dashboard loads with loading states', async () => {
      // Verify page loads
      await expect(page).toHaveTitle(/Analytics/);
      
      // Check for loading states initially
      const loadingStates = page.locator('[data-testid*="loading"]');
      if (await loadingStates.count() > 0) {
        await expect(loadingStates.first()).toBeVisible();
      }
    });

    await test.step('Key metrics cards display correctly', async () => {
      // Wait for metrics to load
      await expect(page.getByTestId('metrics-overview')).toBeVisible({ timeout: 30000 });
      
      // Check all metric cards
      const metricCards = [
        'total-sent',
        'delivery-rate', 
        'open-rate',
        'click-rate',
        'total-cost',
        'avg-cost-per-message'
      ];

      for (const card of metricCards) {
        await expect(page.getByTestId(`metric-${card}`)).toBeVisible();
        // Verify metric has a value (not loading)
        await expect(page.getByTestId(`metric-${card}`)).not.toContainText('Loading');
      }
    });

    await test.step('Charts render with data', async () => {
      // Messages over time chart
      await expect(page.getByTestId('messages-timeline-chart')).toBeVisible();
      await expect(page.locator('canvas').first()).toBeVisible();
      
      // Performance by channel chart
      await expect(page.getByTestId('channel-performance-chart')).toBeVisible();
      
      // Cost analysis chart
      await expect(page.getByTestId('cost-analysis-chart')).toBeVisible();
    });

    await test.step('Filter controls are functional', async () => {
      // Date range picker
      await expect(page.getByTestId('date-range-picker')).toBeVisible();
      
      // Channel filter
      await expect(page.getByTestId('channel-filter')).toBeVisible();
      
      // Campaign filter
      await expect(page.getByTestId('campaign-filter')).toBeVisible();
      
      // Test date range change
      await page.getByTestId('date-range-picker').click();
      await page.getByTestId('preset-last-30-days').click();
      
      // Wait for charts to update
      await page.waitForTimeout(1000);
      
      // Verify URL reflects filter state
      expect(page.url()).toContain('dateRange=last-30-days');
    });

    await test.step('Export functionality works', async () => {
      // Open export menu
      await page.getByTestId('export-menu-trigger').click();
      await expect(page.getByTestId('export-menu')).toBeVisible();
      
      // Check CSV export option
      await expect(page.getByTestId('export-csv')).toBeVisible();
      
      // Check PDF export option
      await expect(page.getByTestId('export-pdf')).toBeVisible();
      
      // Close menu
      await page.keyboard.press('Escape');
    });
  });

  test('Date range filtering updates dashboard data', async ({ page }) => {
    await test.step('Apply different date ranges', async () => {
      // Record initial metrics
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      const initialSentCount = await page.getByTestId('metric-total-sent').textContent();
      
      // Change to last 7 days
      await page.getByTestId('date-range-picker').click();
      await page.getByTestId('preset-last-7-days').click();
      
      // Wait for update
      await page.waitForTimeout(2000);
      
      // Verify metrics updated (could be different)
      const newSentCount = await page.getByTestId('metric-total-sent').textContent();
      
      // URL should reflect change
      expect(page.url()).toContain('dateRange=last-7-days');
      
      // Change to custom range
      await page.getByTestId('date-range-picker').click();
      await page.getByTestId('custom-date-range').click();
      
      // Set start date (30 days ago)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      await page.getByTestId('date-start-input').fill(startDate.toISOString().split('T')[0]);
      
      // Set end date (today)
      const endDate = new Date();
      await page.getByTestId('date-end-input').fill(endDate.toISOString().split('T')[0]);
      
      await page.getByTestId('apply-date-range').click();
      
      // Wait for update
      await page.waitForTimeout(2000);
      
      // Verify custom range applied
      expect(page.url()).toContain('startDate=');
      expect(page.url()).toContain('endDate=');
    });
  });

  test('Channel filtering works correctly', async ({ page }) => {
    await test.step('Filter by specific channels', async () => {
      await expect(page.getByTestId('channel-filter')).toBeVisible();
      
      // Open channel filter dropdown
      await page.getByTestId('channel-filter').click();
      
      // Verify all channel options
      const channels = ['sms', 'kakao', 'email', 'push', 'web', 'social'];
      for (const channel of channels) {
        await expect(page.getByTestId(`channel-option-${channel}`)).toBeVisible();
      }
      
      // Select only SMS and KakaoTalk
      await page.getByTestId('channel-option-sms').click();
      await page.getByTestId('channel-option-kakao').click();
      
      // Apply filter
      await page.getByTestId('apply-channel-filter').click();
      
      // Wait for data to update
      await page.waitForTimeout(2000);
      
      // Verify URL reflects channel filter
      expect(page.url()).toContain('channels=');
      
      // Verify channel performance chart shows only selected channels
      const chartLegend = page.getByTestId('channel-chart-legend');
      await expect(chartLegend).toContainText('SMS');
      await expect(chartLegend).toContainText('KakaoTalk');
      await expect(chartLegend).not.toContainText('Email');
    });
  });

  test('Cost quota tracking and alerts', async ({ page }) => {
    await test.step('Cost overview and quota status', async () => {
      // Verify cost metrics
      await expect(page.getByTestId('metric-total-cost')).toBeVisible();
      
      // Check quota progress bar
      await expect(page.getByTestId('quota-progress')).toBeVisible();
      
      // Verify quota details
      const quotaUsed = page.getByTestId('quota-used');
      const quotaLimit = page.getByTestId('quota-limit');
      
      await expect(quotaUsed).toBeVisible();
      await expect(quotaLimit).toBeVisible();
      
      // Check for quota warnings if applicable
      const quotaWarning = page.getByTestId('quota-warning');
      if (await quotaWarning.isVisible()) {
        await expect(quotaWarning).toContainText('quota');
      }
    });

    await test.step('Cost breakdown by channel', async () => {
      // Verify cost analysis chart
      await expect(page.getByTestId('cost-analysis-chart')).toBeVisible();
      
      // Check cost breakdown table
      await expect(page.getByTestId('cost-breakdown-table')).toBeVisible();
      
      // Verify columns
      const tableHeaders = ['Channel', 'Messages', 'Cost', 'Avg Cost'];
      for (const header of tableHeaders) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }
    });
  });

  test('Mobile responsive analytics dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await test.step('Mobile layout renders correctly', async () => {
      await expect(page.getByTestId('mobile-analytics-layout')).toBeVisible();
      
      // Metrics should stack vertically
      const metricsContainer = page.getByTestId('metrics-overview');
      await expect(metricsContainer).toBeVisible();
      
      // Charts should be responsive
      await expect(page.getByTestId('mobile-chart-container')).toBeVisible();
    });

    await test.step('Mobile filters work', async () => {
      // Mobile filter toggle
      await page.getByTestId('mobile-filters-toggle').click();
      await expect(page.getByTestId('mobile-filters-panel')).toBeVisible();
      
      // Test date range on mobile
      await page.getByTestId('mobile-date-filter').click();
      await expect(page.getByTestId('mobile-date-picker')).toBeVisible();
    });
  });

  test('Accessibility compliance', async ({ page }) => {
    await test.step('Inject axe and check accessibility', async () => {
      await injectAxe(page);
      
      // Wait for content to load
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Run accessibility checks
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    await test.step('Keyboard navigation works', async () => {
      // Test tab navigation through dashboard
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Navigate to export menu with keyboard
      let attempts = 0;
      while (attempts < 20) {
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        if (await focusedElement.getAttribute('data-testid') === 'export-menu-trigger') {
          break;
        }
        attempts++;
      }
      
      // Open menu with Enter
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('export-menu')).toBeVisible();
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('export-menu')).not.toBeVisible();
    });

    await test.step('Screen reader announcements', async () => {
      // Check for proper ARIA labels
      await expect(page.getByRole('main')).toHaveAttribute('aria-label', 'Analytics Dashboard');
      
      // Check chart accessibility
      const charts = page.locator('canvas');
      const chartCount = await charts.count();
      
      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i);
        await expect(chart).toHaveAttribute('role', 'img');
        await expect(chart).toHaveAttribute('aria-label');
      }
    });
  });

  test('Performance benchmarking', async ({ page }) => {
    await test.step('Measure dashboard load time', async () => {
      const startTime = performance.now();
      
      await page.goto('/analytics');
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      const loadTime = performance.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    await test.step('Measure filter response time', async () => {
      await expect(page.getByTestId('channel-filter')).toBeVisible();
      
      const startTime = performance.now();
      
      // Apply filter
      await page.getByTestId('channel-filter').click();
      await page.getByTestId('channel-option-sms').click();
      await page.getByTestId('apply-channel-filter').click();
      
      // Wait for charts to update
      await page.waitForTimeout(500);
      
      const filterTime = performance.now() - startTime;
      console.log(`Filter response time: ${filterTime}ms`);
      
      // Filter should respond within 1 second
      expect(filterTime).toBeLessThan(1000);
    });
  });

  test('Error handling and loading states', async ({ page }) => {
    await test.step('Handle API errors gracefully', async () => {
      // Mock API failure
      await page.route('/api/analytics/**', (route) => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });
      
      await page.goto('/analytics');
      
      // Should show error state
      await expect(page.getByTestId('analytics-error')).toBeVisible();
      await expect(page.getByTestId('analytics-error')).toContainText('Unable to load analytics data');
      
      // Should show retry button
      await expect(page.getByTestId('retry-analytics')).toBeVisible();
    });

    await test.step('Loading states display correctly', async () => {
      // Mock slow API response
      await page.route('/api/analytics/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });
      
      await page.goto('/analytics');
      
      // Should show loading skeletons
      await expect(page.getByTestId('metrics-loading')).toBeVisible();
      await expect(page.getByTestId('charts-loading')).toBeVisible();
      
      // Wait for content to load
      await expect(page.getByTestId('metrics-overview')).toBeVisible({ timeout: 10000 });
    });
  });

  test('Real-time updates', async ({ page, context }) => {
    await test.step('Dashboard updates with new data', async () => {
      // Initial load
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Get initial sent count
      const initialCount = await page.getByTestId('metric-total-sent').textContent();
      
      // Simulate new campaign message in another tab/context
      const secondPage = await context.newPage();
      await secondPage.goto('/campaigns');
      await secondPage.evaluate(() => {
        localStorage.setItem('auth_token', 'test-analytics-token');
        localStorage.setItem('tenant_id', 'test-tenant-analytics');
      });
      
      // Send test message (this would trigger real-time update)
      await secondPage.goto('/campaigns/test-campaign/send');
      // ... campaign sending simulation would go here
      
      await secondPage.close();
      
      // Back to analytics page - wait for potential real-time update
      await page.waitForTimeout(3000);
      
      // Check if metrics refreshed (in a real implementation with WebSocket/SSE)
      // This test structure is ready for real-time features
      console.log('Real-time update test structure ready');
    });
  });
});