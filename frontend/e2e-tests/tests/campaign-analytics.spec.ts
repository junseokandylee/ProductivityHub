import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Campaign Analytics', () => {
  let campaignId: string;

  test.beforeAll(async ({ request }) => {
    // Create test campaign via API
    const response = await request.post('/api/campaigns', {
      data: {
        name: 'E2E Test Campaign',
        messageTitle: 'Test Message',
        messageBody: 'This is a test campaign for E2E analytics testing',
        estimatedRecipients: 1000,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        abTestConfig: {
          variants: [
            { name: 'Variant A', allocation: 50, messageBody: 'Original message' },
            { name: 'Variant B', allocation: 50, messageBody: 'Alternative message' }
          ]
        }
      },
      headers: {
        'Authorization': 'Bearer test-analytics-token',
        'X-Tenant-ID': 'test-tenant-analytics'
      }
    });
    
    if (response.ok()) {
      const campaign = await response.json();
      campaignId = campaign.id;
    } else {
      // Fallback to mock ID
      campaignId = 'test-campaign-123';
    }
  });

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-analytics-token');
      localStorage.setItem('tenant_id', 'test-tenant-analytics');
    });
  });

  test('Campaign analytics page loads with all sections', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Campaign header and basic info', async () => {
      // Campaign title and status
      await expect(page.getByTestId('campaign-title')).toBeVisible();
      await expect(page.getByTestId('campaign-status')).toBeVisible();
      
      // Campaign metadata
      await expect(page.getByTestId('campaign-created-date')).toBeVisible();
      await expect(page.getByTestId('campaign-message-count')).toBeVisible();
    });

    await test.step('Campaign performance metrics', async () => {
      // Core metrics cards
      const metricCards = [
        'messages-sent',
        'delivery-rate',
        'open-rate', 
        'click-rate',
        'unsubscribe-rate',
        'total-cost'
      ];

      for (const card of metricCards) {
        await expect(page.getByTestId(`campaign-metric-${card}`)).toBeVisible();
      }

      // Verify metrics have values
      await expect(page.getByTestId('campaign-metric-messages-sent')).not.toContainText('Loading');
    });

    await test.step('Message timeline visualization', async () => {
      // Timeline chart should be visible
      await expect(page.getByTestId('campaign-timeline-chart')).toBeVisible();
      
      // Chart should have data points
      await expect(page.locator('canvas')).toBeVisible();
      
      // Timeline controls
      await expect(page.getByTestId('timeline-zoom-controls')).toBeVisible();
      await expect(page.getByTestId('timeline-24h')).toBeVisible();
      await expect(page.getByTestId('timeline-7d')).toBeVisible();
    });

    await test.step('A/B test results section', async () => {
      // A/B test widget
      await expect(page.getByTestId('ab-test-widget')).toBeVisible();
      
      // Variant comparison table
      await expect(page.getByTestId('ab-variant-table')).toBeVisible();
      
      // Statistical significance indicator
      await expect(page.getByTestId('statistical-significance')).toBeVisible();
      
      // Confidence interval display
      await expect(page.getByTestId('confidence-interval')).toBeVisible();
    });

    await test.step('Export functionality', async () => {
      // Campaign-specific export menu
      await page.getByTestId('campaign-export-menu-trigger').click();
      await expect(page.getByTestId('campaign-export-menu')).toBeVisible();
      
      // Export options
      await expect(page.getByTestId('export-campaign-csv')).toBeVisible();
      await expect(page.getByTestId('export-campaign-pdf')).toBeVisible();
      
      // Close menu
      await page.keyboard.press('Escape');
    });
  });

  test('A/B test analysis and statistical significance', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('A/B variant comparison', async () => {
      await expect(page.getByTestId('ab-variant-table')).toBeVisible();
      
      // Check variant rows
      await expect(page.getByTestId('variant-A-row')).toBeVisible();
      await expect(page.getByTestId('variant-B-row')).toBeVisible();
      
      // Verify metric columns
      const metrics = ['sent', 'delivered', 'opened', 'clicked', 'conversion-rate'];
      for (const metric of metrics) {
        await expect(page.getByTestId(`variant-A-${metric}`)).toBeVisible();
        await expect(page.getByTestId(`variant-B-${metric}`)).toBeVisible();
      }
    });

    await test.step('Statistical significance calculation', async () => {
      // Significance badge
      const significanceBadge = page.getByTestId('statistical-significance');
      await expect(significanceBadge).toBeVisible();
      
      // Should show significance level or "Not Significant"
      const badgeText = await significanceBadge.textContent();
      expect(badgeText).toMatch(/(Significant|Not Significant|p < 0\.05|p < 0\.01)/);
      
      // P-value display
      await expect(page.getByTestId('p-value')).toBeVisible();
      
      // Confidence interval
      const confidenceInterval = page.getByTestId('confidence-interval');
      await expect(confidenceInterval).toBeVisible();
      await expect(confidenceInterval).toContainText('%');
    });

    await test.step('Winner recommendation', async () => {
      // Winner badge (if test is conclusive)
      const winnerBadge = page.getByTestId('winning-variant');
      if (await winnerBadge.isVisible()) {
        const winnerText = await winnerBadge.textContent();
        expect(winnerText).toMatch(/(Variant A|Variant B) Wins/);
        
        // Lift percentage
        await expect(page.getByTestId('lift-percentage')).toBeVisible();
        await expect(page.getByTestId('lift-percentage')).toContainText('%');
      }
    });

    await test.step('Sample size and power analysis', async () => {
      // Sample size information
      await expect(page.getByTestId('sample-size-info')).toBeVisible();
      
      // Statistical power indicator
      const powerIndicator = page.getByTestId('statistical-power');
      if (await powerIndicator.isVisible()) {
        const powerText = await powerIndicator.textContent();
        expect(powerText).toContain('%');
      }
      
      // Recommendation for test duration
      const testRecommendation = page.getByTestId('test-recommendation');
      if (await testRecommendation.isVisible()) {
        await expect(testRecommendation).toContainText(/continue|stop|conclusive/i);
      }
    });
  });

  test('Campaign timeline and message flow', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Timeline chart interaction', async () => {
      const timelineChart = page.getByTestId('campaign-timeline-chart');
      await expect(timelineChart).toBeVisible();
      
      // Test zoom controls
      await page.getByTestId('timeline-24h').click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('timeRange=24h');
      
      await page.getByTestId('timeline-7d').click(); 
      await page.waitForTimeout(500);
      expect(page.url()).toContain('timeRange=7d');
      
      // Hover over chart for tooltips (if implemented)
      const canvas = page.locator('canvas').first();
      await canvas.hover({ position: { x: 100, y: 100 } });
      
      // Check for tooltip (may not be visible without real data)
      const tooltip = page.getByTestId('chart-tooltip');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toContainText(/sent|delivered|opened/);
      }
    });

    await test.step('Message flow funnel', async () => {
      // Funnel visualization
      const funnelChart = page.getByTestId('message-funnel');
      if (await funnelChart.isVisible()) {
        // Funnel steps
        await expect(page.getByTestId('funnel-sent')).toBeVisible();
        await expect(page.getByTestId('funnel-delivered')).toBeVisible();
        await expect(page.getByTestId('funnel-opened')).toBeVisible();
        await expect(page.getByTestId('funnel-clicked')).toBeVisible();
        
        // Conversion rates between steps
        await expect(page.getByTestId('delivery-rate-display')).toBeVisible();
        await expect(page.getByTestId('open-rate-display')).toBeVisible();
        await expect(page.getByTestId('click-rate-display')).toBeVisible();
      }
    });

    await test.step('Event timeline details', async () => {
      // Detailed event list
      const eventTimeline = page.getByTestId('event-timeline');
      if (await eventTimeline.isVisible()) {
        // Timeline entries
        const timelineEntries = page.getByTestId('timeline-entry');
        const entryCount = await timelineEntries.count();
        
        if (entryCount > 0) {
          // Verify first entry has required info
          const firstEntry = timelineEntries.first();
          await expect(firstEntry).toContainText(/sent|delivered|opened|clicked/);
          await expect(firstEntry).toHaveAttribute('data-timestamp');
        }
      }
    });
  });

  test('Cost analysis and quota tracking', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Campaign cost breakdown', async () => {
      // Total cost metric
      await expect(page.getByTestId('campaign-metric-total-cost')).toBeVisible();
      
      // Cost per message
      await expect(page.getByTestId('cost-per-message')).toBeVisible();
      
      // Cost by channel breakdown
      const costBreakdown = page.getByTestId('cost-by-channel');
      if (await costBreakdown.isVisible()) {
        // Channel cost entries
        const channels = ['SMS', 'KakaoTalk', 'Email', 'Push'];
        for (const channel of channels) {
          const channelCost = page.getByTestId(`cost-${channel.toLowerCase()}`);
          if (await channelCost.isVisible()) {
            await expect(channelCost).toContainText('₩');
          }
        }
      }
    });

    await test.step('Budget vs actual spending', async () => {
      // Budget comparison
      const budgetComparison = page.getByTestId('budget-comparison');
      if (await budgetComparison.isVisible()) {
        await expect(page.getByTestId('estimated-cost')).toBeVisible();
        await expect(page.getByTestId('actual-cost')).toBeVisible();
        
        // Budget variance indicator
        const budgetVariance = page.getByTestId('budget-variance');
        if (await budgetVariance.isVisible()) {
          const varianceText = await budgetVariance.textContent();
          expect(varianceText).toMatch(/[+-]?\d+(\.\d+)?%/);
        }
      }
    });

    await test.step('Quota impact', async () => {
      // Quota usage from this campaign
      const quotaImpact = page.getByTestId('quota-impact');
      if (await quotaImpact.isVisible()) {
        await expect(quotaImpact).toContainText(/quota|budget/i);
        
        // Percentage of monthly quota used
        const quotaPercentage = page.getByTestId('quota-percentage-used');
        if (await quotaPercentage.isVisible()) {
          const percentageText = await quotaPercentage.textContent();
          expect(percentageText).toMatch(/\d+(\.\d+)?%/);
        }
      }
    });
  });

  test('CSV export with campaign data', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Export campaign analytics to CSV', async () => {
      // Open export menu
      await page.getByTestId('campaign-export-menu-trigger').click();
      await expect(page.getByTestId('campaign-export-menu')).toBeVisible();
      
      // Start CSV export
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('export-campaign-csv').click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download properties
      expect(download.suggestedFilename()).toMatch(/campaign.*analytics.*\.csv/);
      
      // Save and verify CSV content
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const csvContent = fs.readFileSync(path, 'utf8');
        
        // Verify CSV structure
        expect(csvContent).toContain('Campaign Name');
        expect(csvContent).toContain('Messages Sent');
        expect(csvContent).toContain('Delivery Rate');
        expect(csvContent).toContain('Open Rate');
        expect(csvContent).toContain('Click Rate');
        
        // Verify A/B test data if present
        if (csvContent.includes('Variant')) {
          expect(csvContent).toContain('Variant A');
          expect(csvContent).toContain('Variant B');
          expect(csvContent).toContain('Statistical Significance');
        }
      }
    });
  });

  test('PDF export with print layout', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Navigate to print page and verify layout', async () => {
      // Open export menu
      await page.getByTestId('campaign-export-menu-trigger').click();
      
      // Click PDF export (should open print page)
      const printPagePromise = page.waitForEvent('popup');
      await page.getByTestId('export-campaign-pdf').click();
      
      const printPage = await printPagePromise;
      await printPage.waitForLoadState();
      
      // Verify print page structure
      await expect(printPage.getByTestId('print-campaign-header')).toBeVisible();
      await expect(printPage.getByTestId('print-campaign-metrics')).toBeVisible();
      
      // Verify A/B test section in print
      const abSection = printPage.getByTestId('print-ab-results');
      if (await abSection.isVisible()) {
        await expect(abSection).toContainText('A/B Test Results');
        await expect(printPage.getByTestId('print-variant-table')).toBeVisible();
      }
      
      // Verify charts are present for print
      const printCharts = printPage.locator('canvas');
      const chartCount = await printCharts.count();
      expect(chartCount).toBeGreaterThan(0);
      
      await printPage.close();
    });

    await test.step('Print layout optimization', async () => {
      // Navigate directly to print URL
      await page.goto(`/campaigns/${campaignId}/analytics/print`);
      
      // Check print-specific CSS
      const mediaQuery = await page.evaluate(() => {
        return window.matchMedia('print').matches;
      });
      
      // Simulate print media for layout testing
      await page.emulateMedia({ media: 'print' });
      
      // Verify print layout
      await expect(page.getByTestId('print-layout')).toBeVisible();
      
      // Check for proper page breaks
      const pageBreaks = page.locator('.print-page-break');
      if (await pageBreaks.count() > 0) {
        console.log(`Print layout has ${await pageBreaks.count()} page breaks`);
      }
      
      // Reset media emulation
      await page.emulateMedia({ media: 'screen' });
    });
  });

  test('Mobile responsiveness for campaign analytics', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Mobile layout and navigation', async () => {
      // Mobile-specific layout
      await expect(page.getByTestId('mobile-campaign-layout')).toBeVisible();
      
      // Collapsible sections on mobile
      const collapsibleSections = page.getByTestId('mobile-section-toggle');
      const sectionCount = await collapsibleSections.count();
      
      if (sectionCount > 0) {
        // Test first collapsible section
        const firstSection = collapsibleSections.first();
        await firstSection.click();
        
        // Verify section expands
        await expect(page.getByTestId('mobile-expanded-section')).toBeVisible();
      }
    });

    await test.step('Mobile chart interactions', async () => {
      // Charts should be responsive
      const mobileCharts = page.getByTestId('mobile-chart');
      const chartCount = await mobileCharts.count();
      
      if (chartCount > 0) {
        // Verify charts fit mobile viewport
        const firstChart = mobileCharts.first();
        const boundingBox = await firstChart.boundingBox();
        
        if (boundingBox) {
          expect(boundingBox.width).toBeLessThanOrEqual(375);
        }
      }
    });

    await test.step('Mobile A/B test widget', async () => {
      // A/B test results should be mobile-optimized
      const mobileAbWidget = page.getByTestId('mobile-ab-widget');
      if (await mobileAbWidget.isVisible()) {
        // Variant cards should stack on mobile
        await expect(page.getByTestId('mobile-variant-cards')).toBeVisible();
        
        // Swipeable comparison
        const swipeContainer = page.getByTestId('variant-swipe-container');
        if (await swipeContainer.isVisible()) {
          // Test swipe gesture (simulate touch)
          await swipeContainer.hover();
          await page.mouse.down();
          await page.mouse.move(100, 0);
          await page.mouse.up();
        }
      }
    });
  });

  test('Error handling and edge cases', async ({ page }) => {
    await test.step('Handle missing campaign data', async () => {
      // Try to access non-existent campaign
      await page.goto('/campaigns/non-existent-campaign/analytics');
      
      // Should show 404 or error state
      await expect(page.getByTestId('campaign-not-found')).toBeVisible();
      await expect(page.getByTestId('campaign-not-found')).toContainText('Campaign not found');
    });

    await test.step('Handle API failures gracefully', async () => {
      // Mock API failures
      await page.route('/api/campaigns/*/analytics', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      await page.goto(`/campaigns/${campaignId}/analytics`);
      
      // Should show error state
      await expect(page.getByTestId('analytics-error')).toBeVisible();
      await expect(page.getByTestId('retry-button')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('/api/campaigns/*/analytics');
      await page.getByTestId('retry-button').click();
      
      // Should attempt to reload
      await page.waitForTimeout(1000);
    });

    await test.step('Handle insufficient data for A/B testing', async () => {
      // Mock campaign with insufficient A/B test data
      await page.route('/api/campaigns/*/analytics', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metrics: { sent: 10, delivered: 8, opened: 2, clicked: 0 },
            abTestResults: null, // No A/B test data
            timeline: []
          })
        });
      });
      
      await page.goto(`/campaigns/${campaignId}/analytics`);
      
      // Should show appropriate message for insufficient data
      const abWidget = page.getByTestId('ab-test-widget');
      if (await abWidget.isVisible()) {
        await expect(page.getByTestId('insufficient-data-message')).toBeVisible();
        await expect(page.getByTestId('insufficient-data-message')).toContainText('insufficient');
      }
    });
  });

  test('Accessibility compliance for campaign analytics', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/analytics`);

    await test.step('Run accessibility audit', async () => {
      await injectAxe(page);
      
      // Wait for content to load
      await expect(page.getByTestId('campaign-metric-messages-sent')).toBeVisible();
      
      // Run accessibility checks
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    await test.step('Keyboard navigation for campaign analytics', async () => {
      // Tab through campaign analytics
      await page.keyboard.press('Tab');
      
      // Should be able to reach all interactive elements
      let tabCount = 0;
      const maxTabs = 30;
      
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        
        const focusedElement = page.locator(':focus');
        if (await focusedElement.count() === 0) {
          break;
        }
        
        // Check if we reached export menu
        const testId = await focusedElement.getAttribute('data-testid');
        if (testId === 'campaign-export-menu-trigger') {
          await page.keyboard.press('Enter');
          await expect(page.getByTestId('campaign-export-menu')).toBeVisible();
          await page.keyboard.press('Escape');
          break;
        }
        
        tabCount++;
      }
      
      expect(tabCount).toBeLessThan(maxTabs); // Should be able to navigate without getting stuck
    });

    await test.step('Screen reader support', async () => {
      // Check ARIA labels for metrics
      const metricCards = page.locator('[data-testid*="campaign-metric-"]');
      const cardCount = await metricCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = metricCards.nth(i);
        await expect(card).toHaveAttribute('aria-label');
      }
      
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
});