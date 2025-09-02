import { Page } from '@playwright/test';

/**
 * Setup MSW for E2E tests by injecting mocking code into the page
 */
export async function setupMSW(page: Page, scenario: 'default' | 'quota-exceeded' | 'server-error' = 'default') {
  // Setup MSW before any network requests
  await page.addInitScript(() => {
    // Import and setup MSW handlers
    if (typeof window !== 'undefined') {
      // Mark page as test environment  
      (window as any).__MSW_TEST__ = true;
      
      // Will be handled by MSW service worker
      console.log('MSW test environment detected');
    }
  });
  
  // Navigate to a special route that will activate MSW
  await page.goto('/__msw-setup');
  
  // Wait for MSW to be ready
  await page.evaluate(async () => {
    if (typeof window !== 'undefined' && (window as any).__MSW_TEST__) {
      // MSW setup completed
      return Promise.resolve();
    }
  });
  
  // Set scenario-specific environment variables via localStorage
  if (scenario === 'quota-exceeded') {
    await page.evaluate(() => {
      localStorage.setItem('PLAYWRIGHT_QUOTA_EXCEEDED', 'true');
    });
  } else if (scenario === 'server-error') {
    await page.evaluate(() => {
      localStorage.setItem('PLAYWRIGHT_SERVER_ERROR', 'true');
    });
  }
}

/**
 * Start MSW for the browser session 
 */
export async function startMSW(page: Page) {
  await page.evaluate(async () => {
    // Dynamic import MSW
    const { worker } = await import('/tests/mocks/browser.js');
    
    if ('serviceWorker' in navigator) {
      // Start the worker
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          // Use the service worker from public directory
          url: '/mockServiceWorker.js'
        }
      });
      
      console.log('MSW started successfully');
      (window as any).__MSW_READY__ = true;
    }
  });
  
  // Wait for MSW to be fully initialized
  await page.waitForFunction(() => (window as any).__MSW_READY__ === true, {
    timeout: 10000
  });
}

/**
 * Clean up MSW after tests
 */
export async function teardownMSW(page: Page) {
  await page.evaluate(async () => {
    if ((window as any).__MSW_READY__) {
      const { worker } = await import('/tests/mocks/browser.js');
      await worker.stop();
      (window as any).__MSW_READY__ = false;
      console.log('MSW stopped');
    }
  });
  
  // Clear test localStorage
  await page.evaluate(() => {
    localStorage.removeItem('PLAYWRIGHT_QUOTA_EXCEEDED');
    localStorage.removeItem('PLAYWRIGHT_SERVER_ERROR');
  });
}