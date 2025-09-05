#!/usr/bin/env node

/**
 * Simplified Visual Testing Agent
 * Focuses on screenshot capture without complex interactions
 * Optimized for ProductivityHub application
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:13000';
const OUTPUT_DIR = './visual-tests';

// Key routes for visual testing
const VISUAL_ROUTES = [
  { path: '/', name: 'homepage', title: '홈페이지' },
  { path: '/auth/login', name: 'login', title: '로그인' },
  { path: '/campaigns', name: 'campaigns', title: '캠페인 목록' },
  { path: '/campaigns/new', name: 'campaign_new', title: '새 캠페인' },
  { path: '/campaigns/personalization', name: 'personalization', title: 'AI 개인화' },
  { path: '/compliance', name: 'compliance', title: '규정 준수' },
  { path: '/settings/profile', name: 'settings', title: '설정' }
];

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

class SimpleVisualTest {
  constructor() {
    this.browser = null;
    this.results = {
      timestamp: new Date().toISOString(),
      summary: { total: 0, passed: 0, failed: 0, screenshots: 0 },
      routes: []
    };
  }

  async init() {
    console.log('🎨 Starting Simple Visual Testing...\n');
    
    // Ensure output directories exist
    const dirs = ['screenshots', 'baselines', 'diffs', 'reports'];
    dirs.forEach(dir => {
      const fullPath = path.join(OUTPUT_DIR, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });

    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-web-security', '--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  async testRoute(route, mode = 'baseline') {
    console.log(`🎯 Testing: ${route.title} (${route.path})`);
    
    const routeResults = {
      path: route.path,
      name: route.name,
      title: route.title,
      status: 'pending',
      viewports: {},
      screenshots: 0,
      errors: []
    };

    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      try {
        const page = await this.browser.newPage();
        await page.setViewportSize(viewport);
        
        // Mock authentication
        await page.addInitScript(() => {
          localStorage.setItem('auth_token', 'test_token');
          document.cookie = 'access_token=test_token; path=/';
        });

        // Navigate to route
        const response = await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        if (response && response.ok()) {
          // Wait for content to load
          await page.waitForTimeout(2000);
          
          // Create screenshot directory
          const screenshotDir = path.join(OUTPUT_DIR, mode === 'baseline' ? 'baselines' : 'screenshots', route.name);
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }

          // Take screenshot
          const screenshotPath = path.join(screenshotDir, `${viewportName}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            animations: 'disabled'
          });

          routeResults.viewports[viewportName] = {
            status: 'success',
            screenshot: screenshotPath,
            viewport: viewport
          };
          routeResults.screenshots++;

          console.log(`  📸 ${viewportName}: ${viewport.width}x${viewport.height} ✅`);
        } else {
          throw new Error(`HTTP ${response?.status() || 'unknown'}`);
        }

        await page.close();

      } catch (error) {
        console.log(`  ❌ ${viewportName}: ${error.message}`);
        routeResults.viewports[viewportName] = {
          status: 'failed',
          error: error.message,
          viewport: viewport
        };
        routeResults.errors.push(`${viewportName}: ${error.message}`);
      }
    }

    // Determine overall route status
    const successCount = Object.values(routeResults.viewports).filter(v => v.status === 'success').length;
    routeResults.status = successCount > 0 ? 'passed' : 'failed';

    return routeResults;
  }

  async runTests(mode = 'baseline') {
    await this.init();

    console.log(`📋 Mode: ${mode.toUpperCase()}`);
    console.log(`🖥️  Viewports: ${Object.keys(VIEWPORTS).length} configurations`);
    console.log(`📍 Routes: ${VISUAL_ROUTES.length} pages\n`);

    for (const route of VISUAL_ROUTES) {
      const result = await this.testRoute(route, mode);
      this.results.routes.push(result);
      
      if (result.status === 'passed') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
      this.results.summary.screenshots += result.screenshots;
    }

    this.results.summary.total = this.results.routes.length;
    
    await this.browser.close();
    
    // Generate report
    await this.generateReport(mode);
    
    return this.results;
  }

  async generateReport(mode) {
    const report = {
      mode: mode,
      timestamp: this.results.timestamp,
      summary: this.results.summary,
      routes: this.results.routes,
      viewports: VIEWPORTS
    };

    // Save JSON report
    const jsonPath = path.join(OUTPUT_DIR, 'reports', `${mode}-report-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdown = this.generateMarkdownReport(report);
    const markdownPath = path.join(OUTPUT_DIR, 'reports', `${mode}-report.md`);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Reports generated:`);
    console.log(`   📊 JSON: ${jsonPath}`);
    console.log(`   📝 Markdown: ${markdownPath}`);

    return report;
  }

  generateMarkdownReport(report) {
    const { summary, routes, mode, timestamp } = report;
    const successRate = Math.round((summary.passed / summary.total) * 100);

    return `# 📸 Visual Testing Report - ${mode.toUpperCase()}

**Generated:** ${timestamp}

## 📊 Summary
- **Mode:** ${mode.toUpperCase()}
- **Routes Tested:** ${summary.total}
- **Passed:** ${summary.passed} ✅
- **Failed:** ${summary.failed} ❌
- **Screenshots:** ${summary.screenshots} 🖼️
- **Success Rate:** ${successRate}%

## 🖥️ Viewport Configurations
${Object.entries(VIEWPORTS).map(([name, size]) => 
  `- **${name}**: ${size.width}x${size.height}`
).join('\n')}

## 📋 Route Results

${routes.map(route => {
  const viewportResults = Object.entries(route.viewports)
    .map(([viewport, result]) => `  - ${viewport}: ${result.status === 'success' ? '✅' : '❌'} ${result.error || ''}`)
    .join('\n');
  
  return `### ${route.title} (${route.path})
- **Status:** ${route.status === 'passed' ? '✅ Passed' : '❌ Failed'}
- **Screenshots:** ${route.screenshots}
- **Viewports:**
${viewportResults}
${route.errors.length > 0 ? `- **Errors:** ${route.errors.join(', ')}` : ''}
`;
}).join('\n')}

---
*Generated by Simple Visual Test Agent - ProductivityHub*
`;
  }
}

// CLI handling
async function main() {
  const mode = process.argv.includes('--compare') ? 'compare' : 'baseline';
  const tester = new SimpleVisualTest();
  
  try {
    const results = await tester.runTests(mode);
    
    console.log('\n' + '='.repeat(60));
    console.log('📸 VISUAL TESTING COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.summary.passed}/${results.summary.total} routes`);
    console.log(`📸 Screenshots: ${results.summary.screenshots} total`);
    console.log(`🎯 Success Rate: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);
    
    process.exit(results.summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Visual testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SimpleVisualTest;