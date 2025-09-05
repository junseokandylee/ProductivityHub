import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:13000';

// Route definitions based on route inventory - UPDATED with all implemented routes
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/signup', 
  '/auth/reset-password',
  '/auth/verify-email',
  '/terms',
  '/privacy'
];

const PROTECTED_ROUTES = [
  '/',
  '/dashboard',
  '/calendar',
  '/activity-score',
  '/contacts',
  '/contacts/import',
  '/contacts/export',
  '/contacts/deduplication',
  '/segments',
  '/campaigns',
  '/campaigns/new',
  '/campaigns/templates',
  '/campaigns/scheduled',
  '/campaigns/personalization',
  '/inbox',
  '/inbox/auto-reply',
  '/reports',
  '/reports/monthly',
  '/reports/campaigns',
  '/reports/contacts',
  '/reports/quota',
  '/analytics',
  '/analytics/campaigns',
  '/analytics/ab-tests',
  '/analytics/costs',
  '/settings',
  '/settings/profile',
  '/settings/tenant',
  '/settings/billing',
  '/settings/api-keys',
  '/settings/organization',
  '/settings/channels',
  '/settings/users',
  '/settings/quota',
  '/settings/security',
  '/help',
  '/help/guide',
  '/help/tutorial',
  '/help/faq',
  '/help/contact',
  '/notifications',
  '/compliance'
];

const DYNAMIC_ROUTES = [
  '/contacts/1',
  '/campaigns/1',
  '/campaigns/1/monitor',
  '/campaigns/1/analytics',
  '/inbox/1'
];

// Test utilities
async function loginUser(page: any) {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  // Wait for redirect after login
  await page.waitForURL(/^\/(dashboard|$)/);
}

async function expectNoErrors(page: any, route: string) {
  // Check for no 404/500 errors
  const response = await page.goto(`${BASE_URL}${route}`);
  expect(response?.status()).toBeLessThan(400);
  
  // Check for key UI elements (no blank pages)
  const hasContent = await page.locator('body').isVisible();
  expect(hasContent).toBe(true);
  
  // Check for error boundaries or error messages
  const hasError = await page.locator('text=Error').count();
  const has404 = await page.locator('text=404').count();
  const hasNotFound = await page.locator('text=Not Found').count();
  
  expect(hasError + has404 + hasNotFound).toBe(0);
}

async function expectKeyElements(page: any, route: string) {
  // Common elements that should exist on protected routes
  if (route !== '/' && !route.startsWith('/auth/')) {
    // Should have sidebar or navigation
    const hasSidebar = await page.locator('[data-testid="sidebar"], nav, .sidebar').count();
    expect(hasSidebar).toBeGreaterThan(0);
  }
  
  // Route-specific expectations
  if (route === '/') {
    await expect(page.locator('text=정치생산성허브')).toBeVisible();
  }
  
  if (route.startsWith('/contacts')) {
    await expect(page.locator('h1, h2').filter({ hasText: /연락처|Contact/ })).toBeVisible();
  }
  
  if (route.startsWith('/campaigns')) {
    await expect(page.locator('h1, h2').filter({ hasText: /캠페인|Campaign/ })).toBeVisible();
  }
  
  if (route.startsWith('/settings')) {
    await expect(page.locator('h1, h2').filter({ hasText: /설정|Settings/ })).toBeVisible();
  }
  
  if (route.startsWith('/help')) {
    await expect(page.locator('h1, h2').filter({ hasText: /도움말|Help/ })).toBeVisible();
  }
  
  // Advanced feature specific tests
  if (route === '/campaigns/personalization') {
    await expect(page.locator('h1').filter({ hasText: /AI.*개인화|개인화.*엔진/ })).toBeVisible();
  }
  
  if (route === '/compliance') {
    await expect(page.locator('h1').filter({ hasText: /규정.*준수|컴플라이언스/ })).toBeVisible();
  }
  
  if (route === '/calendar') {
    await expect(page.locator('h1').filter({ hasText: /일정|캘린더|Calendar/ })).toBeVisible();
  }
  
  if (route === '/activity-score') {
    await expect(page.locator('h1').filter({ hasText: /활동.*점수|Activity.*Score/ })).toBeVisible();
  }
  
  if (route === '/notifications') {
    await expect(page.locator('h1').filter({ hasText: /알림|Notifications/ })).toBeVisible();
  }
}

// Test suites
test.describe('Public Routes Smoke Tests', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`Should load ${route} successfully`, async ({ page }) => {
      await expectNoErrors(page, route);
      
      // Auth pages should have forms
      if (route.startsWith('/auth/')) {
        const hasForm = await page.locator('form').count();
        expect(hasForm).toBeGreaterThan(0);
      }
    });
  }
});

test.describe('Protected Routes Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication or use test credentials
    await page.addInitScript(() => {
      // Mock authentication state
      document.cookie = 'access_token=mock_token; path=/';
    });
  });

  for (const route of PROTECTED_ROUTES) {
    test(`Should load ${route} successfully when authenticated`, async ({ page }) => {
      await expectNoErrors(page, route);
      await expectKeyElements(page, route);
    });
  }
});

test.describe('Dynamic Routes Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      document.cookie = 'access_token=mock_token; path=/';
    });
  });

  for (const route of DYNAMIC_ROUTES) {
    test(`Should handle ${route} gracefully`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${route}`);
      
      // Dynamic routes might 404 without data, but should handle gracefully
      if (response?.status() === 404) {
        // Should show a proper 404 page, not a blank screen
        const hasNotFoundPage = await page.locator('text=찾을 수 없음, text=Not Found, text=404').count();
        expect(hasNotFoundPage).toBeGreaterThan(0);
      } else {
        // If route loads, it should have proper content
        expect(response?.status()).toBeLessThan(400);
        await expectKeyElements(page, route);
      }
    });
  }
});

test.describe('Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'access_token=mock_token; path=/';
    });
  });

  test('Should navigate through main sidebar links', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Test main navigation links
    const navLinks = [
      { text: '홈', href: '/' },
      { text: '연락처', href: '/contacts' },
      { text: '캠페인', href: '/campaigns' },
      { text: '인박스', href: '/inbox' },
      { text: '리포트', href: '/reports' },
      { text: '설정', href: '/settings' }
    ];
    
    for (const link of navLinks) {
      const navElement = page.locator(`a[href="${link.href}"], a:has-text("${link.text}")`).first();
      if (await navElement.count() > 0) {
        await navElement.click();
        await page.waitForURL(`**${link.href}`);
        await expectNoErrors(page, link.href);
      }
    }
  });

  test('Should have working help center link in header', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Look for help link in header/user menu
    const helpLink = page.locator('a[href="/help"], a:has-text("도움말")').first();
    if (await helpLink.count() > 0) {
      await helpLink.click();
      await page.waitForURL('**/help');
      await expectNoErrors(page, '/help');
    }
  });
});

test.describe('Error Handling Tests', () => {
  test('Should handle non-existent routes gracefully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/non-existent-route`);
    
    // Should return 404
    expect(response?.status()).toBe(404);
    
    // Should show proper 404 page
    const hasNotFoundContent = await page.locator('text=404, text=찾을 수 없음, text=페이지를 찾을 수 없습니다').count();
    expect(hasNotFoundContent).toBeGreaterThan(0);
  });

  test('Should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto(`${BASE_URL}/contacts`);
    
    // Should redirect to login or show unauthorized
    await page.waitForURL(/\/(auth\/login|unauthorized)/);
    
    const currentUrl = page.url();
    const isLoginOrUnauth = currentUrl.includes('/auth/login') || currentUrl.includes('/unauthorized');
    expect(isLoginOrUnauth).toBe(true);
  });
});

test.describe('Accessibility Tests', () => {
  test('Key pages should have proper heading structure', async ({ page }) => {
    const testRoutes = ['/', '/contacts', '/campaigns', '/settings', '/help'];
    
    for (const route of testRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      
      // Should have at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
      
      // Should have proper title
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).not.toBe('');
    }
  });

  test('Forms should have proper labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    
    const inputs = await page.locator('input[type="email"], input[type="password"]').count();
    const labels = await page.locator('label').count();
    
    // Should have labels for inputs
    expect(labels).toBeGreaterThanOrEqual(inputs);
  });
});

test.describe('Performance Tests', () => {
  test('Pages should load within reasonable time', async ({ page }) => {
    const testRoutes = ['/', '/contacts', '/campaigns'];
    
    for (const route of testRoutes) {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}${route}`);
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds (generous for development)
      expect(loadTime).toBeLessThan(5000);
    }
  });
});