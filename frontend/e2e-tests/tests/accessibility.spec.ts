import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-a11y-token');
      localStorage.setItem('tenant_id', 'test-tenant-a11y');
    });
  });

  test('Global analytics dashboard accessibility', async ({ page }) => {
    await page.goto('/analytics');
    await injectAxe(page);

    await test.step('Wait for content to load', async () => {
      await expect(page.getByTestId('metrics-overview')).toBeVisible({ timeout: 30000 });
      
      // Wait for charts to render
      await page.waitForTimeout(2000);
    });

    await test.step('Run axe accessibility audit', async () => {
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        // Configure axe rules
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true },
          'semantic-markup': { enabled: true }
        }
      });
    });

    await test.step('Verify specific accessibility features', async () => {
      // Main landmark
      await expect(page.getByRole('main')).toHaveAttribute('aria-label', /analytics/i);
      
      // Headings structure
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toBeVisible();
      
      // Skip to main content link
      const skipLink = page.getByTestId('skip-to-main');
      if (await skipLink.isVisible()) {
        await expect(skipLink).toHaveAttribute('href', '#main-content');
      }
      
      // Metric cards accessibility
      const metricCards = page.locator('[data-testid*="metric-"]');
      const cardCount = await metricCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = metricCards.nth(i);
        await expect(card).toHaveAttribute('aria-label');
        
        // Verify metric values are announced correctly
        const ariaLabel = await card.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/\d+/); // Should contain numbers
      }
    });

    await test.step('Chart accessibility validation', async () => {
      const charts = page.locator('canvas');
      const chartCount = await charts.count();
      
      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i);
        
        // Charts should have role="img" and descriptive labels
        await expect(chart).toHaveAttribute('role', 'img');
        await expect(chart).toHaveAttribute('aria-label');
        
        const ariaLabel = await chart.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/(chart|graph|visualization)/i);
        
        // Check for data table alternative if provided
        const chartId = await chart.getAttribute('id');
        if (chartId) {
          const dataTable = page.getByTestId(`${chartId}-data-table`);
          if (await dataTable.isVisible()) {
            await expect(dataTable).toHaveAttribute('role', 'table');
            await expect(dataTable).toHaveAttribute('aria-label');
          }
        }
      }
    });

    await test.step('Filter controls accessibility', async () => {
      // Date range picker
      const dateFilter = page.getByTestId('date-range-picker');
      await expect(dateFilter).toHaveAttribute('aria-label');
      await expect(dateFilter).toHaveAttribute('role', 'button');
      
      // Channel filter dropdown
      const channelFilter = page.getByTestId('channel-filter');
      await expect(channelFilter).toHaveAttribute('aria-label');
      await expect(channelFilter).toHaveAttribute('aria-haspopup', 'listbox');
      
      // Test keyboard interaction
      await channelFilter.focus();
      await expect(channelFilter).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      // Dropdown should open and be accessible
      const dropdown = page.getByTestId('channel-filter-dropdown');
      if (await dropdown.isVisible()) {
        await expect(dropdown).toHaveAttribute('role', 'listbox');
        await expect(dropdown).toHaveAttribute('aria-label');
        
        // Options should be accessible
        const options = dropdown.locator('[role="option"]');
        const optionCount = await options.count();
        
        for (let i = 0; i < optionCount; i++) {
          const option = options.nth(i);
          await expect(option).toHaveAttribute('aria-selected');
        }
        
        // Close dropdown
        await page.keyboard.press('Escape');
      }
    });

    await test.step('Export menu accessibility', async () => {
      const exportButton = page.getByTestId('export-menu-trigger');
      await expect(exportButton).toHaveAttribute('aria-haspopup', 'menu');
      await expect(exportButton).toHaveAttribute('aria-expanded', 'false');
      
      // Open menu
      await exportButton.click();
      await expect(exportButton).toHaveAttribute('aria-expanded', 'true');
      
      // Menu should be accessible
      const exportMenu = page.getByTestId('export-menu');
      await expect(exportMenu).toHaveAttribute('role', 'menu');
      
      // Menu items
      const menuItems = exportMenu.locator('[role="menuitem"]');
      const menuItemCount = await menuItems.count();
      
      for (let i = 0; i < menuItemCount; i++) {
        const item = menuItems.nth(i);
        await expect(item).toHaveAttribute('tabindex', '-1');
      }
      
      // Close menu
      await page.keyboard.press('Escape');
      await expect(exportButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  test('Campaign analytics accessibility', async ({ page }) => {
    const campaignId = 'test-campaign-a11y';
    await page.goto(`/campaigns/${campaignId}/analytics`);
    await injectAxe(page);

    await test.step('Campaign page structure accessibility', async () => {
      // Wait for content
      await page.waitForTimeout(3000);
      
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    await test.step('A/B test widget accessibility', async () => {
      const abWidget = page.getByTestId('ab-test-widget');
      
      if (await abWidget.isVisible()) {
        // Widget should have proper semantic structure
        await expect(abWidget).toHaveAttribute('role', 'region');
        await expect(abWidget).toHaveAttribute('aria-label', /a.*b.*test/i);
        
        // Variant table accessibility
        const variantTable = page.getByTestId('ab-variant-table');
        if (await variantTable.isVisible()) {
          await expect(variantTable).toHaveAttribute('role', 'table');
          await expect(variantTable).toHaveAttribute('aria-label');
          
          // Table headers
          const headers = variantTable.locator('th');
          const headerCount = await headers.count();
          
          for (let i = 0; i < headerCount; i++) {
            const header = headers.nth(i);
            await expect(header).toHaveAttribute('scope');
          }
          
          // Statistical significance badge
          const significanceBadge = page.getByTestId('statistical-significance');
          if (await significanceBadge.isVisible()) {
            await expect(significanceBadge).toHaveAttribute('aria-label');
            
            const ariaLabel = await significanceBadge.getAttribute('aria-label');
            expect(ariaLabel).toMatch(/(significant|not significant|p-value)/i);
          }
        }
      }
    });

    await test.step('Campaign timeline accessibility', async () => {
      const timeline = page.getByTestId('campaign-timeline-chart');
      
      if (await timeline.isVisible()) {
        const canvas = timeline.locator('canvas');
        await expect(canvas).toHaveAttribute('role', 'img');
        await expect(canvas).toHaveAttribute('aria-label');
        
        // Timeline controls
        const controls = page.getByTestId('timeline-zoom-controls');
        if (await controls.isVisible()) {
          await expect(controls).toHaveAttribute('role', 'toolbar');
          await expect(controls).toHaveAttribute('aria-label', /timeline.*controls/i);
          
          // Individual control buttons
          const controlButtons = controls.locator('button');
          const buttonCount = await controlButtons.count();
          
          for (let i = 0; i < buttonCount; i++) {
            const button = controlButtons.nth(i);
            await expect(button).toHaveAttribute('aria-label');
            
            // Check if button is pressed/selected
            const ariaPressed = await button.getAttribute('aria-pressed');
            if (ariaPressed !== null) {
              expect(['true', 'false']).toContain(ariaPressed);
            }
          }
        }
      }
    });
  });

  test('Keyboard navigation comprehensive test', async ({ page }) => {
    await page.goto('/analytics');
    
    await test.step('Tab order and focus management', async () => {
      // Wait for page to load
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Start at beginning of page
      await page.keyboard.press('Home');
      
      // Track tab navigation
      const focusedElements: string[] = [];
      let tabCount = 0;
      const maxTabs = 50;
      
      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab');
        
        const focusedElement = page.locator(':focus');
        const focusedCount = await focusedElement.count();
        
        if (focusedCount === 0) {
          break; // No more focusable elements
        }
        
        const tagName = await focusedElement.evaluate(el => el.tagName);
        const testId = await focusedElement.getAttribute('data-testid') || 'no-testid';
        const ariaLabel = await focusedElement.getAttribute('aria-label') || 'no-aria-label';
        
        focusedElements.push(`${tagName}[${testId}]`);
        
        // Ensure element is visible and focusable
        await expect(focusedElement).toBeVisible();
        await expect(focusedElement).toBeFocused();
        
        tabCount++;
      }
      
      console.log(`Keyboard navigation path: ${focusedElements.join(' → ')}`);
      expect(tabCount).toBeGreaterThan(5); // Should have several focusable elements
      expect(tabCount).toBeLessThan(maxTabs); // Should complete navigation
    });

    await test.step('Reverse tab navigation', async () => {
      // Navigate backwards
      let reverseTabCount = 0;
      const maxReverseTabs = 10;
      
      while (reverseTabCount < maxReverseTabs) {
        await page.keyboard.press('Shift+Tab');
        
        const focusedElement = page.locator(':focus');
        if (await focusedElement.count() === 0) {
          break;
        }
        
        await expect(focusedElement).toBeVisible();
        await expect(focusedElement).toBeFocused();
        
        reverseTabCount++;
      }
      
      expect(reverseTabCount).toBeGreaterThan(0);
      console.log(`Reverse keyboard navigation: ${reverseTabCount} elements`);
    });

    await test.step('Interactive element activation', async () => {
      // Focus on filter control
      const dateFilter = page.getByTestId('date-range-picker');
      await dateFilter.focus();
      await expect(dateFilter).toBeFocused();
      
      // Activate with Enter
      await page.keyboard.press('Enter');
      
      // Should open dropdown/picker
      const dropdown = page.locator('[role="dialog"], [role="listbox"], [aria-expanded="true"]');
      if (await dropdown.count() > 0) {
        await expect(dropdown.first()).toBeVisible();
        
        // Close with Escape
        await page.keyboard.press('Escape');
      }
      
      // Test space activation for buttons
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await exportButton.focus();
        await page.keyboard.press(' '); // Space bar
        
        const menu = page.getByTestId('export-menu');
        if (await menu.isVisible()) {
          await page.keyboard.press('Escape');
        }
      }
    });

    await test.step('Arrow key navigation in menus', async () => {
      // Open export menu
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await exportButton.focus();
        await page.keyboard.press('Enter');
        
        const menu = page.getByTestId('export-menu');
        if (await menu.isVisible()) {
          // Test arrow navigation
          await page.keyboard.press('ArrowDown');
          
          let currentFocus = page.locator(':focus');
          if (await currentFocus.count() > 0) {
            const role = await currentFocus.getAttribute('role');
            expect(role).toBe('menuitem');
          }
          
          // Navigate through menu items
          for (let i = 0; i < 3; i++) {
            await page.keyboard.press('ArrowDown');
            currentFocus = page.locator(':focus');
            if (await currentFocus.count() > 0) {
              await expect(currentFocus).toBeFocused();
            }
          }
          
          // Close menu
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/analytics');
    
    await test.step('Verify ARIA landmarks and structure', async () => {
      // Main landmark
      const main = page.getByRole('main');
      await expect(main).toBeVisible();
      await expect(main).toHaveAttribute('aria-label');
      
      // Navigation landmark
      const nav = page.getByRole('navigation');
      if (await nav.count() > 0) {
        await expect(nav.first()).toHaveAttribute('aria-label');
      }
      
      // Banner/header landmark
      const banner = page.getByRole('banner');
      if (await banner.count() > 0) {
        await expect(banner.first()).toBeVisible();
      }
      
      // Complementary/sidebar landmark
      const complementary = page.getByRole('complementary');
      if (await complementary.count() > 0) {
        await expect(complementary.first()).toHaveAttribute('aria-label');
      }
    });

    await test.step('Live regions for dynamic content', async () => {
      // Look for live regions that announce updates
      const liveRegions = page.locator('[aria-live]');
      const liveRegionCount = await liveRegions.count();
      
      if (liveRegionCount > 0) {
        for (let i = 0; i < liveRegionCount; i++) {
          const region = liveRegions.nth(i);
          const ariaLive = await region.getAttribute('aria-live');
          expect(['polite', 'assertive', 'off']).toContain(ariaLive);
          
          // Verify live region has proper labeling if visible
          if (await region.isVisible()) {
            const hasLabel = await region.getAttribute('aria-label') || 
                            await region.getAttribute('aria-labelledby');
            if (!hasLabel) {
              console.log('Warning: Visible live region without accessible name');
            }
          }
        }
      }
      
      // Status messages
      const statusElements = page.locator('[role="status"], [role="alert"]');
      const statusCount = await statusElements.count();
      
      for (let i = 0; i < statusCount; i++) {
        const status = statusElements.nth(i);
        const role = await status.getAttribute('role');
        
        if (role === 'alert') {
          // Alerts should be immediately announced
          await expect(status).toHaveAttribute('aria-live', 'assertive');
        } else if (role === 'status') {
          // Status should be announced politely
          const ariaLive = await status.getAttribute('aria-live');
          expect(ariaLive).toMatch(/polite|assertive/);
        }
      }
    });

    await test.step('Form controls and labels', async () => {
      // Find all form controls
      const formControls = page.locator('input, select, textarea, [role="combobox"], [role="listbox"]');
      const controlCount = await formControls.count();
      
      for (let i = 0; i < controlCount; i++) {
        const control = formControls.nth(i);
        
        if (await control.isVisible()) {
          // Each control should have an accessible name
          const hasLabel = await control.getAttribute('aria-label') ||
                          await control.getAttribute('aria-labelledby') ||
                          await control.getAttribute('title');
          
          if (!hasLabel) {
            // Check for associated label element
            const id = await control.getAttribute('id');
            if (id) {
              const label = page.locator(`label[for="${id}"]`);
              if (await label.count() === 0) {
                console.log(`Warning: Form control without accessible name: ${await control.getAttribute('name') || 'unnamed'}`);
              }
            }
          }
          
          // Required fields should be announced
          const required = await control.getAttribute('required');
          if (required !== null) {
            const ariaRequired = await control.getAttribute('aria-required');
            expect(ariaRequired).toBe('true');
          }
          
          // Invalid fields should be announced
          const invalid = await control.getAttribute('aria-invalid');
          if (invalid === 'true') {
            // Should have error message
            const describedBy = await control.getAttribute('aria-describedby');
            if (describedBy) {
              const errorElement = page.locator(`#${describedBy}`);
              await expect(errorElement).toBeVisible();
            }
          }
        }
      }
    });

    await test.step('Data table accessibility', async () => {
      const tables = page.getByRole('table');
      const tableCount = await tables.count();
      
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        
        if (await table.isVisible()) {
          // Table should have accessible name
          const hasTableLabel = await table.getAttribute('aria-label') ||
                               await table.getAttribute('aria-labelledby') ||
                               await table.locator('caption').count() > 0;
          
          if (!hasTableLabel) {
            console.log('Warning: Table without accessible name');
          }
          
          // Headers should have proper scope
          const headers = table.locator('th');
          const headerCount = await headers.count();
          
          for (let j = 0; j < headerCount; j++) {
            const header = headers.nth(j);
            const scope = await header.getAttribute('scope');
            
            if (scope) {
              expect(['col', 'row', 'colgroup', 'rowgroup']).toContain(scope);
            }
          }
          
          // Complex tables should have additional markup
          const columnHeaders = await table.locator('th[scope="col"]').count();
          const rowHeaders = await table.locator('th[scope="row"]').count();
          
          if (columnHeaders > 3 || rowHeaders > 0) {
            // Complex table - verify additional accessibility features
            console.log(`Complex table detected: ${columnHeaders} column headers, ${rowHeaders} row headers`);
          }
        }
      }
    });
  });

  test('Color contrast and visual accessibility', async ({ page }) => {
    await page.goto('/analytics');
    await injectAxe(page);
    
    await test.step('Color contrast compliance', async () => {
      // Wait for content to load
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Run axe with focus on color contrast
      await checkA11y(page, undefined, {
        rules: {
          'color-contrast': { enabled: true },
          'color-contrast-enhanced': { enabled: true }
        }
      });
    });

    await test.step('Focus indicators visibility', async () => {
      const focusableElements = page.locator('button, a, input, select, textarea, [tabindex="0"]');
      const elementCount = Math.min(await focusableElements.count(), 10); // Test first 10
      
      for (let i = 0; i < elementCount; i++) {
        const element = focusableElements.nth(i);
        
        if (await element.isVisible()) {
          await element.focus();
          await expect(element).toBeFocused();
          
          // Take screenshot to verify focus indicator (manual verification needed)
          const elementId = await element.getAttribute('data-testid') || `element-${i}`;
          console.log(`Focus indicator check: ${elementId}`);
          
          // Wait briefly to see focus indicator
          await page.waitForTimeout(100);
        }
      }
    });

    await test.step('Text scaling support', async () => {
      // Test with 200% zoom (simulating 200% text size)
      await page.setViewportSize({ width: 1280, height: 720 });
      
      // Zoom to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });
      
      await page.waitForTimeout(1000);
      
      // Content should still be usable
      const metrics = page.getByTestId('metrics-overview');
      await expect(metrics).toBeVisible();
      
      // Navigation should still work
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await expect(exportButton).toBeVisible();
        // Button should be clickable even at 200% zoom
        const boundingBox = await exportButton.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThan(0);
          expect(boundingBox.height).toBeGreaterThan(0);
        }
      }
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });

    await test.step('Reduced motion support', async () => {
      // Test with reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      // Reload page with reduced motion
      await page.reload();
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Animations should be reduced or disabled
      // This is primarily tested through CSS media queries
      const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
      const animatedCount = await animatedElements.count();
      
      if (animatedCount > 0) {
        console.log(`Found ${animatedCount} potentially animated elements`);
        // Manual verification needed for actual motion reduction
      }
      
      // Reset
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });
  });

  test('Mobile accessibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');
    await injectAxe(page);
    
    await test.step('Mobile touch targets', async () => {
      await expect(page.getByTestId('mobile-analytics-layout')).toBeVisible();
      
      // All touch targets should be at least 44x44 pixels
      const touchTargets = page.locator('button, a, input, [role="button"], [role="tab"]');
      const targetCount = Math.min(await touchTargets.count(), 15); // Test subset
      
      for (let i = 0; i < targetCount; i++) {
        const target = touchTargets.nth(i);
        
        if (await target.isVisible()) {
          const boundingBox = await target.boundingBox();
          
          if (boundingBox) {
            const minSize = 44; // WCAG minimum touch target size
            
            if (boundingBox.width < minSize || boundingBox.height < minSize) {
              const testId = await target.getAttribute('data-testid') || 'unknown';
              console.log(`Warning: Touch target too small: ${testId} (${boundingBox.width}x${boundingBox.height})`);
            }
          }
        }
      }
    });

    await test.step('Mobile screen reader compatibility', async () => {
      // Run axe for mobile viewport
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    await test.step('Mobile navigation accessibility', async () => {
      // Test mobile-specific navigation
      const mobileMenuToggle = page.getByTestId('mobile-menu-toggle');
      if (await mobileMenuToggle.isVisible()) {
        await expect(mobileMenuToggle).toHaveAttribute('aria-expanded');
        await expect(mobileMenuToggle).toHaveAttribute('aria-controls');
        
        // Open menu
        await mobileMenuToggle.click();
        await expect(mobileMenuToggle).toHaveAttribute('aria-expanded', 'true');
        
        // Menu should be accessible
        const mobileMenu = page.getByTestId('mobile-menu');
        if (await mobileMenu.isVisible()) {
          await expect(mobileMenu).toHaveAttribute('role', /menu|navigation/);
        }
      }
      
      // Mobile filter controls
      const mobileFilters = page.getByTestId('mobile-filters-toggle');
      if (await mobileFilters.isVisible()) {
        await expect(mobileFilters).toHaveAttribute('aria-expanded');
        
        await mobileFilters.click();
        
        const filtersPanel = page.getByTestId('mobile-filters-panel');
        if (await filtersPanel.isVisible()) {
          await expect(filtersPanel).toHaveAttribute('role', /dialog|region/);
          
          // Should be dismissible
          await page.keyboard.press('Escape');
          await expect(mobileFilters).toHaveAttribute('aria-expanded', 'false');
        }
      }
    });
  });

  test('Error state accessibility', async ({ page }) => {
    await test.step('Accessible error messaging', async () => {
      // Mock API error
      await page.route('/api/analytics', (route) => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });
      
      await page.goto('/analytics');
      await injectAxe(page);
      
      // Error state should be accessible
      await expect(page.getByTestId('analytics-error')).toBeVisible();
      
      const errorElement = page.getByTestId('analytics-error');
      
      // Error should have appropriate role
      const role = await errorElement.getAttribute('role');
      expect(['alert', 'status']).toContain(role);
      
      // Error should have accessible description
      await expect(errorElement).toHaveAttribute('aria-label');
      
      // Retry button should be accessible
      const retryButton = page.getByTestId('retry-analytics');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toHaveAttribute('aria-label');
        
        // Button should be focusable
        await retryButton.focus();
        await expect(retryButton).toBeFocused();
      }
      
      // Run accessibility check on error state
      await checkA11y(page);
    });

    await test.step('Loading state accessibility', async () => {
      // Mock slow API
      await page.route('/api/analytics', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        route.continue();
      });
      
      await page.goto('/analytics');
      
      // Loading states should be announced
      const loadingElements = page.locator('[aria-live], [role="status"]');
      if (await loadingElements.count() > 0) {
        const loadingElement = loadingElements.first();
        await expect(loadingElement).toBeVisible();
        
        const ariaLive = await loadingElement.getAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(ariaLive);
      }
      
      // Loading spinners should have accessible names
      const spinners = page.locator('[data-testid*="loading"], .spinner, [role="progressbar"]');
      const spinnerCount = await spinners.count();
      
      for (let i = 0; i < spinnerCount; i++) {
        const spinner = spinners.nth(i);
        if (await spinner.isVisible()) {
          const hasLabel = await spinner.getAttribute('aria-label') ||
                          await spinner.getAttribute('aria-labelledby');
          
          if (!hasLabel) {
            console.log('Warning: Loading indicator without accessible name');
          }
        }
      }
    });
  });

  test('Print accessibility', async ({ page }) => {
    await page.goto('/analytics');
    
    await test.step('Print layout accessibility', async () => {
      // Navigate to print page
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        const printOption = page.getByTestId('export-pdf');
        if (await printOption.isVisible()) {
          const printPagePromise = page.waitForEvent('popup');
          await printOption.click();
          
          const printPage = await printPagePromise;
          await printPage.waitForLoadState();
          
          await injectAxe(printPage);
          
          // Print page should be accessible
          await checkA11y(printPage, undefined, {
            detailedReport: true,
            rules: {
              // Print-specific accessibility rules
              'color-contrast': { enabled: true },
              'link-in-text-block': { enabled: false }, // May not apply to print
            }
          });
          
          // Print page should have proper structure
          await expect(printPage.getByRole('main')).toBeVisible();
          
          const headings = printPage.getByRole('heading');
          const headingCount = await headings.count();
          expect(headingCount).toBeGreaterThan(0);
          
          // Tables in print should be accessible
          const tables = printPage.getByRole('table');
          const tableCount = await tables.count();
          
          for (let i = 0; i < tableCount; i++) {
            const table = tables.nth(i);
            await expect(table).toHaveAttribute('role', 'table');
            
            // Should have proper headers
            const headers = table.locator('th');
            if (await headers.count() > 0) {
              await expect(headers.first()).toHaveAttribute('scope');
            }
          }
          
          await printPage.close();
        }
      }
    });
  });
});