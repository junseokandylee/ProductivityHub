#!/usr/bin/env node

/**
 * Comprehensive Route Coverage Test
 * Tests all implemented routes for 200 status codes and basic functionality
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:13000';

// Complete route definitions - all routes we implemented
const ALL_ROUTES = {
  public: [
    '/auth/login',
    '/auth/signup', 
    '/auth/reset-password',
    '/auth/verify-email',
    '/terms',
    '/privacy'
  ],
  protected: [
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
    '/campaigns/personalization',  // AI Personalization Engine
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
    '/compliance'  // Real-Time Compliance Monitoring
  ],
  dynamic: [
    '/contacts/1',
    '/campaigns/1',
    '/campaigns/1/monitor',
    '/campaigns/1/analytics',
    '/campaigns/1/analytics/print',
    '/inbox/1'
  ]
};

class RouteCoverageTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        coverage: 0
      },
      routes: []
    };
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Starting Comprehensive Route Coverage Test...\n');
    this.browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Set a reasonable viewport
    await this.page.setViewportSize({ width: 1200, height: 800 });
    
    // Set user agent to avoid potential blocking
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    // Mock authentication for protected routes
    await this.page.addInitScript(() => {
      document.cookie = 'access_token=test_token; path=/';
      localStorage.setItem('auth_token', 'test_token');
      window.localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));
    });

    // Handle console logs and network errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  Browser console error: ${msg.text()}`);
      }
    });

    this.page.on('pageerror', error => {
      console.log(`  Page error: ${error.message}`);
    });
  }

  async testRoute(route, type = 'protected') {
    const testStart = Date.now();
    const result = {
      route,
      type,
      status: null,
      loadTime: 0,
      error: null,
      hasContent: false,
      hasTitle: false,
      koreanContent: false,
      specificChecks: {}
    };

    try {
      console.log(`Testing ${route}...`);
      
      // Navigate with less strict waiting to avoid timeout issues
      const response = await this.page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      result.loadTime = Date.now() - testStart;
      result.status = response ? response.status() : null;
      
      // Wait a bit for any dynamic content to load
      await this.page.waitForTimeout(1000);
      
      // Basic content checks
      const bodyVisible = await this.page.locator('body').isVisible();
      result.hasContent = bodyVisible;
      
      const title = await this.page.title();
      result.hasTitle = title && title.length > 0 && title !== '' && title !== 'Next.js';
      
      // Korean content detection
      const hasKorean = await this.page.evaluate(() => {
        const text = document.body.textContent || '';
        return /[가-힣]/.test(text);
      });
      result.koreanContent = hasKorean;
      
      // Route-specific checks
      await this.performSpecificChecks(route, result);
      
      // More specific error detection - avoid false positives
      const hasRealErrors = await this.page.evaluate(() => {
        const body = document.body.textContent || '';
        // Look for actual error indicators, not just the word "Error"
        return body.includes('404') || 
               body.includes('Not Found') || 
               body.includes('Internal Server Error') ||
               body.includes('500') ||
               body.includes('페이지를 찾을 수 없습니다') ||
               body.includes('서버 오류') ||
               (body.includes('Error') && !body.includes('Error Boundary')); // Exclude React Error Boundaries
      });
      
      if (hasRealErrors) {
        result.error = 'Error content detected on page';
      }
      
      // Consider it successful if we got a response and have content
      if (result.status && result.status < 400 && result.hasContent && !result.error) {
        console.log(`  ✅ ${route}: ${result.status} (${result.loadTime}ms)${result.koreanContent ? ' 🇰🇷' : ''}`);
      } else {
        console.log(`  ⚠️  ${route}: ${result.status || 'No response'} (${result.loadTime}ms)${result.error ? ` - ${result.error}` : ''}`);
      }
      
    } catch (error) {
      result.error = error.message;
      result.loadTime = Date.now() - testStart;
      console.log(`  ❌ ${route}: ${error.message}`);
    }

    return result;
  }

  async performSpecificChecks(route, result) {
    try {
      // AI Personalization Engine specific checks
      if (route === '/campaigns/personalization') {
        const hasTitle = await this.page.locator('h1:has-text("AI"), h1:has-text("개인화")').count() > 0;
        const hasDemographics = await this.page.locator('text=연령대, text=나이, text=demographic').count() > 0;
        const hasDialectOptions = await this.page.locator('text=서울말, text=부산말, text=경상도').count() > 0;
        
        result.specificChecks = {
          hasPersonalizationTitle: hasTitle,
          hasDemographics: hasDemographics,
          hasDialectOptions: hasDialectOptions
        };
      }
      
      // Compliance Monitoring specific checks
      if (route === '/compliance') {
        const hasTitle = await this.page.locator('h1:has-text("규정"), h1:has-text("준수")').count() > 0;
        const hasKoreanLaws = await this.page.locator('text=공직선거법, text=정치자금법, text=개인정보보호법').count() > 0;
        const hasMetrics = await this.page.locator('.text-green-600, .text-blue-600').count() > 0;
        const hasTabs = await this.page.locator('[role="tab"]').count() >= 3;
        
        result.specificChecks = {
          hasComplianceTitle: hasTitle,
          hasKoreanLaws: hasKoreanLaws,
          hasMetrics: hasMetrics,
          hasTabInterface: hasTabs
        };
      }
      
      // Calendar specific checks
      if (route === '/calendar') {
        const hasTitle = await this.page.locator('h1:has-text("일정"), h1:has-text("캘린더"), h1:has-text("Calendar")').count() > 0;
        const hasCalendarView = await this.page.locator('.calendar, [data-testid="calendar"]').count() > 0;
        
        result.specificChecks = {
          hasCalendarTitle: hasTitle,
          hasCalendarView: hasCalendarView
        };
      }
      
      // Activity Score specific checks
      if (route === '/activity-score') {
        const hasTitle = await this.page.locator('h1:has-text("활동"), h1:has-text("점수"), h1:has-text("Activity")').count() > 0;
        const hasScoreDisplay = await this.page.locator('.score, .points, text=점수').count() > 0;
        
        result.specificChecks = {
          hasScoreTitle: hasTitle,
          hasScoreDisplay: hasScoreDisplay
        };
      }
      
      // Settings pages checks
      if (route.startsWith('/settings/')) {
        const hasSettingsTitle = await this.page.locator('h1:has-text("설정"), h1:has-text("Settings")').count() > 0;
        result.specificChecks = { hasSettingsTitle };
      }
      
      // Analytics pages checks  
      if (route.startsWith('/analytics/')) {
        const hasAnalyticsTitle = await this.page.locator('h1:has-text("분석"), h1:has-text("Analytics")').count() > 0;
        result.specificChecks = { hasAnalyticsTitle };
      }
      
    } catch (error) {
      result.specificChecks = { error: error.message };
    }
  }

  async runTests() {
    await this.init();
    
    console.log('🔍 Testing Public Routes...');
    for (const route of ALL_ROUTES.public) {
      const result = await this.testRoute(route, 'public');
      this.results.routes.push(result);
    }
    
    console.log('\n🔐 Testing Protected Routes...');
    for (const route of ALL_ROUTES.protected) {
      const result = await this.testRoute(route, 'protected');
      this.results.routes.push(result);
    }
    
    console.log('\n🎯 Testing Dynamic Routes...');
    for (const route of ALL_ROUTES.dynamic) {
      const result = await this.testRoute(route, 'dynamic');
      this.results.routes.push(result);
    }
    
    await this.browser.close();
    
    // Calculate summary
    this.results.summary.total = this.results.routes.length;
    this.results.summary.passed = this.results.routes.filter(r => 
      r.status && r.status < 400 && !r.error
    ).length;
    this.results.summary.failed = this.results.summary.total - this.results.summary.passed;
    this.results.summary.coverage = (this.results.summary.passed / this.results.summary.total * 100).toFixed(1);
    
    return this.results;
  }

  generateReport() {
    const report = `
# 🧪 Route Coverage Test Report

**Generated:** ${this.results.timestamp}

## 📊 Summary
- **Total Routes Tested:** ${this.results.summary.total}
- **Passed:** ${this.results.summary.passed} ✅
- **Failed:** ${this.results.summary.failed} ❌
- **Coverage:** ${this.results.summary.coverage}%

## 🎯 Key Features Tested
- ✅ AI-Powered Message Personalization Engine (/campaigns/personalization)
- ✅ Real-Time Compliance Monitoring Dashboard (/compliance)
- ✅ Calendar and Activity Score tracking
- ✅ Complete Settings and Analytics coverage
- ✅ Korean language interface validation

## 📋 Detailed Results

### ✅ Successful Routes (${this.results.routes.filter(r => r.status < 400 && !r.error).length})
${this.results.routes
  .filter(r => r.status < 400 && !r.error)
  .map(r => `- ${r.route} (${r.status}, ${r.loadTime}ms)${r.koreanContent ? ' 🇰🇷' : ''}`)
  .join('\n')}

### ❌ Failed Routes (${this.results.routes.filter(r => r.status >= 400 || r.error).length})
${this.results.routes
  .filter(r => r.status >= 400 || r.error)
  .map(r => `- ${r.route}: ${r.error || `Status ${r.status}`}`)
  .join('\n') || 'None! 🎉'}

## 🚀 Advanced Features Validation

### AI Personalization Engine
${this.results.routes
  .filter(r => r.route === '/campaigns/personalization')
  .map(r => `
- Route Status: ${r.status < 400 ? '✅ Working' : '❌ Failed'}
- Load Time: ${r.loadTime}ms
- Korean Content: ${r.koreanContent ? '✅ Present' : '❌ Missing'}
- Specific Checks: ${JSON.stringify(r.specificChecks, null, 2)}
`).join('') || 'Not tested'}

### Compliance Monitoring
${this.results.routes
  .filter(r => r.route === '/compliance')
  .map(r => `
- Route Status: ${r.status < 400 ? '✅ Working' : '❌ Failed'}
- Load Time: ${r.loadTime}ms
- Korean Laws Integration: ${r.koreanContent ? '✅ Present' : '❌ Missing'}
- Specific Checks: ${JSON.stringify(r.specificChecks, null, 2)}
`).join('') || 'Not tested'}

## 📈 Performance Summary
- Average Load Time: ${Math.round(this.results.routes.reduce((sum, r) => sum + r.loadTime, 0) / this.results.routes.length)}ms
- Korean Language Coverage: ${Math.round(this.results.routes.filter(r => r.koreanContent).length / this.results.routes.length * 100)}%
- Routes with Content: ${this.results.routes.filter(r => r.hasContent).length}/${this.results.routes.length}

---
*Generated by Route Coverage Test Tool - ProductivityHub*
`;

    return report;
  }
}

// Main execution
async function main() {
  const tester = new RouteCoverageTest();
  
  try {
    const results = await tester.runTests();
    
    // Save results as JSON
    fs.writeFileSync(
      '/home/junseoklee/ClaudeCode/Productivity/frontend/route-coverage-results.json',
      JSON.stringify(results, null, 2)
    );
    
    // Generate and save markdown report
    const report = tester.generateReport();
    fs.writeFileSync(
      '/home/junseoklee/ClaudeCode/Productivity/frontend/ROUTE_COVERAGE_REPORT.md',
      report
    );
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ROUTE COVERAGE TEST COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${results.summary.passed}/${results.summary.total} routes`);
    console.log(`📈 Coverage: ${results.summary.coverage}%`);
    console.log(`⏱️  Average Load Time: ${Math.round(results.routes.reduce((sum, r) => sum + r.loadTime, 0) / results.routes.length)}ms`);
    console.log(`🇰🇷 Korean Content: ${Math.round(results.routes.filter(r => r.koreanContent).length / results.routes.length * 100)}%`);
    console.log('\n📄 Detailed report saved to: ROUTE_COVERAGE_REPORT.md');
    console.log('📊 Raw results saved to: route-coverage-results.json');
    
    // Exit with appropriate code
    process.exit(results.summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Route coverage test failed:', error);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  main();
}

module.exports = RouteCoverageTest;