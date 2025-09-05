#!/usr/bin/env node

/**
 * Development-Friendly Route Test
 * Improved route testing that works around Next.js development quirks
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:13000';

// Sample routes for quick verification
const SAMPLE_ROUTES = [
  '/',
  '/auth/login',
  '/campaigns',
  '/campaigns/personalization',  // AI feature
  '/compliance',                 // Compliance feature
  '/settings/profile',
  '/analytics/campaigns'
];

class DevelopmentRouteTest {
  constructor() {
    this.browser = null;
    this.context = null;
    this.results = [];
  }

  async init() {
    console.log('🧪 Starting Development Route Test...\n');
    
    this.browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
    
    // Create a persistent context to avoid session issues
    this.context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1200, height: 800 }
    });
    
    // Add global auth mocking
    await this.context.addInitScript(() => {
      // Mock auth for all pages in this context
      localStorage.setItem('auth_token', 'test_token');
      document.cookie = 'access_token=test_token; path=/';
      
      // Mock user data
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자'
      }));
    });
  }

  async testRoute(route) {
    const page = await this.context.newPage();
    
    try {
      console.log(`Testing: ${route}`);
      
      // Set longer timeout for development server
      page.setDefaultTimeout(15000);
      
      // Navigate with custom handling
      const response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      // Wait for Next.js hydration
      await page.waitForTimeout(2000);
      
      const status = response ? response.status() : null;
      
      // More lenient content checking
      let hasContent = false;
      let title = '';
      let hasKorean = false;
      let textLength = 0;
      
      try {
        hasContent = await page.locator('body').isVisible();
        title = await page.title();
        
        const text = await page.evaluate(() => {
          return document.body.textContent || '';
        });
        
        textLength = text.length;
        hasKorean = /[가-힣]/.test(text);
        
        // Check for actual errors, not just development warnings
        const hasRealError = text.includes('404') || 
                            text.includes('페이지를 찾을 수 없습니다') ||
                            (status >= 400 && status < 500);
        
        const result = {
          route,
          status,
          title: title !== 'Next.js' ? title : 'Default',
          hasContent,
          hasKorean,
          textLength,
          hasRealError,
          success: hasContent && textLength > 100 && !hasRealError
        };
        
        this.results.push(result);
        
        if (result.success) {
          console.log(`  ✅ Working - ${hasKorean ? '🇰🇷 Korean' : 'English'} (${textLength} chars)`);
        } else if (hasRealError) {
          console.log(`  ❌ Error detected`);
        } else {
          console.log(`  ⚠️  Limited content (${textLength} chars)`);
        }
        
      } catch (contentError) {
        console.log(`  💥 Content check failed: ${contentError.message}`);
        this.results.push({
          route,
          status,
          error: contentError.message,
          success: false
        });
      }
      
    } catch (error) {
      console.log(`  💥 Navigation failed: ${error.message}`);
      this.results.push({
        route,
        status: null,
        error: error.message,
        success: false
      });
      
    } finally {
      await page.close();
    }
  }

  async runTests() {
    await this.init();
    
    console.log('🔍 Testing sample routes for development verification...\n');
    
    for (const route of SAMPLE_ROUTES) {
      await this.testRoute(route);
    }
    
    await this.cleanup();
    
    // Summary
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const withKorean = this.results.filter(r => r.hasKorean).length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 DEVELOPMENT TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Working: ${successful}/${total} routes`);
    console.log(`🇰🇷 Korean: ${withKorean}/${total} routes`);
    console.log(`🎯 Success Rate: ${Math.round(successful/total*100)}%`);
    
    if (successful === total) {
      console.log('\n🎉 All sample routes working correctly!');
      console.log('The development server is properly serving all routes.');
    } else {
      console.log('\n⚠️  Some routes need attention.');
    }
    
    // Save results
    fs.writeFileSync('dev-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Results saved to: dev-test-results.json');
    
    return successful === total;
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const tester = new DevelopmentRouteTest();
  
  try {
    const allWorking = await tester.runTests();
    process.exit(allWorking ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DevelopmentRouteTest;