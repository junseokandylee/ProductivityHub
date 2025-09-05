#!/usr/bin/env node

/**
 * Simple Route Validation Test
 * Quick verification that routes are accessible and return proper content
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:13000';
const SAMPLE_ROUTES = [
  '/',
  '/auth/login', 
  '/campaigns/personalization',
  '/compliance',
  '/settings/profile'
];

async function testRoutes() {
  console.log('🔍 Quick Route Verification Test\n');
  
  const browser = await chromium.launch({ headless: false }); // Run non-headless for debugging
  const page = await browser.newPage();
  
  // Simple auth mock
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'test_token');
    document.cookie = 'access_token=test_token; path=/';
  });
  
  const results = [];
  
  for (const route of SAMPLE_ROUTES) {
    try {
      console.log(`Testing: ${route}`);
      
      const response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      const status = response.status();
      const title = await page.title();
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      const hasContent = await page.locator('body').isVisible();
      const text = await page.locator('body').textContent();
      const hasKorean = /[가-힣]/.test(text);
      
      const result = {
        route,
        status,
        title,
        hasContent,
        hasKorean,
        textLength: text.length
      };
      
      results.push(result);
      
      console.log(`  Status: ${status}`);
      console.log(`  Title: ${title}`);
      console.log(`  Content Length: ${text.length} chars`);
      console.log(`  Korean Content: ${hasKorean ? '✅' : '❌'}`);
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      results.push({ route, error: error.message });
    }
  }
  
  await browser.close();
  
  console.log('📊 Summary:');
  console.log(`✅ Working routes: ${results.filter(r => r.status && r.status < 400).length}/${results.length}`);
  console.log(`🇰🇷 Korean content: ${results.filter(r => r.hasKorean).length}/${results.length}`);
  
  return results;
}

// Run test
testRoutes().catch(console.error);