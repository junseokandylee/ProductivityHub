import { test, expect } from '@playwright/test';

// Link validation script to crawl and verify all navigation links
test.describe('Link Validation Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock authentication for protected routes
    await page.addInitScript(() => {
      document.cookie = 'access_token=mock_token; path=/';
    });
  });

  test('Should validate all navigation links in sidebar', async ({ page }) => {
    await page.goto('/');
    
    // Find all navigation links in sidebar
    const navLinks = await page.locator('nav a, .sidebar a, [data-testid="sidebar"] a').all();
    
    const brokenLinks: string[] = [];
    const validLinks: string[] = [];
    
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue; // Skip non-page links
      }
      
      try {
        // Navigate to the link
        await page.goto(href);
        
        // Check if page loads successfully
        const response = page.url();
        if (response.includes('/404') || response.includes('/error')) {
          brokenLinks.push(href);
        } else {
          validLinks.push(href);
        }
      } catch (error) {
        brokenLinks.push(href);
      }
    }
    
    // Report results
    console.log('Valid Links:', validLinks);
    console.log('Broken Links:', brokenLinks);
    
    // Test should pass if no broken links
    expect(brokenLinks.length).toBe(0);
  });

  test('Should validate all links in header/user menu', async ({ page }) => {
    await page.goto('/');
    
    // Open user menu if it exists
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu button').first();
    if (await userMenu.count() > 0) {
      await userMenu.click();
      await page.waitForTimeout(500); // Wait for menu to open
    }
    
    // Find all links in header
    const headerLinks = await page.locator('header a, .header a').all();
    
    const brokenLinks: string[] = [];
    const validLinks: string[] = [];
    
    for (const link of headerLinks) {
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      
      try {
        await page.goto(href);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/404') || currentUrl.includes('/error')) {
          brokenLinks.push(href);
        } else {
          validLinks.push(href);
        }
      } catch (error) {
        brokenLinks.push(href);
      }
    }
    
    console.log('Valid Header Links:', validLinks);
    console.log('Broken Header Links:', brokenLinks);
    
    expect(brokenLinks.length).toBe(0);
  });

  test('Should validate breadcrumb links', async ({ page }) => {
    // Test breadcrumbs on various pages
    const pagesWithBreadcrumbs = [
      '/contacts/import',
      '/contacts/export', 
      '/campaigns/new',
      '/settings/organization',
      '/settings/security',
      '/help/guide',
      '/reports/monthly'
    ];
    
    const brokenLinks: string[] = [];
    
    for (const route of pagesWithBreadcrumbs) {
      await page.goto(route);
      
      // Find breadcrumb links
      const breadcrumbs = await page.locator('.breadcrumb a, [aria-label="breadcrumb"] a, nav[aria-label="Breadcrumb"] a').all();
      
      for (const breadcrumb of breadcrumbs) {
        const href = await breadcrumb.getAttribute('href');
        if (!href || href.startsWith('#')) continue;
        
        try {
          await page.goto(href);
          
          const currentUrl = page.url();
          if (currentUrl.includes('/404') || currentUrl.includes('/error')) {
            brokenLinks.push(`${route} -> ${href}`);
          }
        } catch (error) {
          brokenLinks.push(`${route} -> ${href}`);
        }
      }
    }
    
    console.log('Broken Breadcrumb Links:', brokenLinks);
    expect(brokenLinks.length).toBe(0);
  });

  test('Should validate form action URLs', async ({ page }) => {
    const formsToCheck = [
      '/auth/login',
      '/auth/signup',
      '/auth/reset-password',
      '/help/contact'
    ];
    
    for (const route of formsToCheck) {
      await page.goto(route);
      
      // Check form action attributes
      const forms = await page.locator('form').all();
      
      for (const form of forms) {
        const action = await form.getAttribute('action');
        
        // Forms without action are okay (will submit to current page)
        if (action && !action.startsWith('/') && !action.startsWith('http')) {
          // Relative URLs should be valid
          expect(action).toMatch(/^\/|^http/);
        }
      }
    }
  });

  test('Should check for external link security', async ({ page }) => {
    await page.goto('/');
    
    // Find all external links
    const externalLinks = await page.locator('a[href^="http"]:not([href*="localhost"])').all();
    
    const unsafeLinks: string[] = [];
    
    for (const link of externalLinks) {
      const href = await link.getAttribute('href');
      const target = await link.getAttribute('target');
      const rel = await link.getAttribute('rel');
      
      if (href && target === '_blank') {
        // External links that open in new tab should have rel="noopener noreferrer"
        if (!rel || (!rel.includes('noopener') && !rel.includes('noreferrer'))) {
          unsafeLinks.push(href);
        }
      }
    }
    
    console.log('Unsafe External Links (missing rel="noopener"):', unsafeLinks);
    expect(unsafeLinks.length).toBe(0);
  });

  test('Should validate all settings sub-routes are accessible', async ({ page }) => {
    await page.goto('/settings');
    
    // Get all settings navigation links
    const settingsLinks = await page.locator('a[href^="/settings/"]').all();
    
    const brokenLinks: string[] = [];
    const validLinks: string[] = [];
    
    for (const link of settingsLinks) {
      const href = await link.getAttribute('href');
      if (!href) continue;
      
      try {
        await page.goto(href);
        
        // Should have settings-related content
        const hasSettingsContent = await page.locator('h1, h2').count();
        if (hasSettingsContent > 0) {
          validLinks.push(href);
        } else {
          brokenLinks.push(`${href} (no content)`);
        }
      } catch (error) {
        brokenLinks.push(href);
      }
    }
    
    console.log('Valid Settings Links:', validLinks);
    console.log('Broken Settings Links:', brokenLinks);
    
    expect(brokenLinks.length).toBe(0);
  });

  test('Should validate help center navigation', async ({ page }) => {
    await page.goto('/help');
    
    // Get all help navigation links
    const helpLinks = await page.locator('a[href^="/help/"]').all();
    
    const brokenLinks: string[] = [];
    const validLinks: string[] = [];
    
    for (const link of helpLinks) {
      const href = await link.getAttribute('href');
      if (!href) continue;
      
      try {
        await page.goto(href);
        
        // Should have help-related content
        const hasHelpContent = await page.locator('h1, h2').filter({ hasText: /도움말|Help|가이드|Guide|FAQ|문의|Contact/ }).count();
        if (hasHelpContent > 0) {
          validLinks.push(href);
        } else {
          brokenLinks.push(`${href} (no help content)`);
        }
      } catch (error) {
        brokenLinks.push(href);
      }
    }
    
    console.log('Valid Help Links:', validLinks);
    console.log('Broken Help Links:', brokenLinks);
    
    expect(brokenLinks.length).toBe(0);
  });
});