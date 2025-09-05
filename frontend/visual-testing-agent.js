#!/usr/bin/env node

/**
 * Visual Testing Agent for ProductivityHub
 * Comprehensive visual regression testing, screenshot comparison, and UI consistency validation
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:13000';
const VISUAL_TEST_DIR = './visual-tests';
const SCREENSHOTS_DIR = path.join(VISUAL_TEST_DIR, 'screenshots');
const BASELINES_DIR = path.join(VISUAL_TEST_DIR, 'baselines');
const DIFFS_DIR = path.join(VISUAL_TEST_DIR, 'diffs');
const REPORTS_DIR = path.join(VISUAL_TEST_DIR, 'reports');

// Test configurations for different viewport sizes and scenarios
const TEST_CONFIGURATIONS = {
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  laptop: { width: 1366, height: 768, deviceScaleFactor: 1 },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2 },
  mobile: { width: 375, height: 667, deviceScaleFactor: 2 },
  mobile_landscape: { width: 667, height: 375, deviceScaleFactor: 2 }
};

// Routes to test visually with their specific requirements
const VISUAL_TEST_ROUTES = {
  // Core application pages
  homepage: {
    path: '/',
    name: '홈페이지',
    waitForSelector: 'main',
    interactions: ['hover:nav', 'scroll:bottom'],
    criticalElements: ['header', 'nav', 'main', 'sidebar']
  },
  
  // Authentication flows
  login: {
    path: '/auth/login',
    name: '로그인 페이지',
    waitForSelector: 'form',
    interactions: ['focus:input[name="email"]', 'focus:input[name="password"]'],
    criticalElements: ['form', 'input', 'button']
  },
  
  // Campaign management
  campaigns: {
    path: '/campaigns',
    name: '캠페인 목록',
    waitForSelector: 'main',
    interactions: ['hover:.campaign-card', 'click:.filter-button'],
    criticalElements: ['.campaign-grid', '.filter-section', '.action-buttons']
  },
  
  campaign_new: {
    path: '/campaigns/new',
    name: '새 캠페인',
    waitForSelector: 'form',
    interactions: ['click:.step-button', 'scroll:.form-container'],
    criticalElements: ['.wizard-steps', '.form-fields', '.progress-bar']
  },
  
  // AI Features
  ai_personalization: {
    path: '/campaigns/personalization',
    name: 'AI 개인화 엔진',
    waitForSelector: '.personalization-dashboard',
    interactions: ['click:.demographic-filter', 'hover:.ai-suggestion'],
    criticalElements: ['.ai-controls', '.preview-panel', '.suggestion-cards']
  },
  
  // Compliance
  compliance: {
    path: '/compliance',
    name: '규정 준수 모니터링',
    waitForSelector: '.compliance-dashboard',
    interactions: ['click:.tab-button', 'hover:.metric-card'],
    criticalElements: ['.compliance-tabs', '.metrics-grid', '.status-indicators']
  },
  
  // Settings
  settings_profile: {
    path: '/settings/profile',
    name: '프로필 설정',
    waitForSelector: 'form',
    interactions: ['focus:.input-field', 'click:.upload-button'],
    criticalElements: ['.profile-form', '.avatar-section', '.save-button']
  },
  
  // Analytics
  analytics_campaigns: {
    path: '/analytics/campaigns',
    name: '캠페인 분석',
    waitForSelector: '.analytics-dashboard',
    interactions: ['hover:.chart-element', 'click:.date-filter'],
    criticalElements: ['.charts-container', '.filter-panel', '.stats-cards']
  },
  
  // Contact management
  contacts: {
    path: '/contacts',
    name: '연락처 관리',
    waitForSelector: '.contacts-table',
    interactions: ['click:.table-header', 'hover:.contact-row'],
    criticalElements: ['.contacts-table', '.search-bar', '.bulk-actions']
  }
};

class VisualTestingAgent {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 0.2, // 20% difference threshold
      updateBaselines: options.updateBaselines || false,
      parallelTests: options.parallelTests || 2,
      includeInteractions: options.includeInteractions !== false,
      generateReport: options.generateReport !== false,
      ...options
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      configuration: this.options,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        new: 0,
        updated: 0
      }
    };
    
    this.browser = null;
    this.contexts = new Map();
  }

  async initialize() {
    console.log('🎨 Initializing Visual Testing Agent...\n');
    
    // Create necessary directories
    await this.ensureDirectories();
    
    // Launch browser with optimal settings for visual testing
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--font-render-hinting=none', // Consistent font rendering
        '--disable-font-subpixel-positioning'
      ]
    });
    
    // Create contexts for each viewport configuration
    for (const [configName, config] of Object.entries(TEST_CONFIGURATIONS)) {
      const context = await this.browser.newContext({
        viewport: { width: config.width, height: config.height },
        deviceScaleFactor: config.deviceScaleFactor,
        hasTouch: configName.includes('mobile') || configName.includes('tablet'),
        // Ensure consistent rendering
        colorScheme: 'light',
        reducedMotion: 'reduce',
        forcedColors: 'none'
      });
      
      // Add authentication for protected routes
      await context.addInitScript(() => {
        localStorage.setItem('auth_token', 'test_token');
        document.cookie = 'access_token=test_token; path=/';
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'visual.test@example.com',
          name: '시각적 테스트 사용자'
        }));
      });
      
      this.contexts.set(configName, context);
    }
    
    console.log(`✅ Browser initialized with ${this.contexts.size} viewport configurations`);
  }

  async ensureDirectories() {
    const dirs = [VISUAL_TEST_DIR, SCREENSHOTS_DIR, BASELINES_DIR, DIFFS_DIR, REPORTS_DIR];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async runVisualTests() {
    console.log('📸 Starting visual regression tests...\n');
    
    const routeEntries = Object.entries(VISUAL_TEST_ROUTES);
    
    // Process tests in batches to avoid overwhelming the system
    for (let i = 0; i < routeEntries.length; i += this.options.parallelTests) {
      const batch = routeEntries.slice(i, i + this.options.parallelTests);
      
      await Promise.all(batch.map(([routeKey, routeConfig]) => 
        this.testRoute(routeKey, routeConfig)
      ));
    }
    
    // Generate comprehensive report
    if (this.options.generateReport) {
      await this.generateVisualReport();
    }
    
    return this.results;
  }

  async testRoute(routeKey, routeConfig) {
    console.log(`🎯 Testing route: ${routeConfig.name} (${routeConfig.path})`);
    
    const routeResults = {
      routeKey,
      routeConfig,
      viewports: {},
      timestamp: new Date().toISOString(),
      status: 'passed',
      issues: []
    };
    
    // Test across all viewport configurations
    for (const [viewportName, context] of this.contexts) {
      try {
        const viewportResult = await this.testRouteInViewport(
          routeKey, 
          routeConfig, 
          viewportName, 
          context
        );
        
        routeResults.viewports[viewportName] = viewportResult;
        
        if (viewportResult.status === 'failed') {
          routeResults.status = 'failed';
          routeResults.issues.push(...viewportResult.issues);
        }
        
      } catch (error) {
        console.log(`  ❌ ${viewportName}: ${error.message}`);
        routeResults.viewports[viewportName] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        routeResults.status = 'failed';
        routeResults.issues.push(`${viewportName}: ${error.message}`);
      }
    }
    
    // Update summary statistics
    this.results.tests.push(routeResults);
    this.results.summary.total++;
    
    if (routeResults.status === 'passed') {
      this.results.summary.passed++;
      console.log(`  ✅ Route passed on all viewports`);
    } else {
      this.results.summary.failed++;
      console.log(`  ❌ Route failed: ${routeResults.issues.length} issues found`);
    }
  }

  async testRouteInViewport(routeKey, routeConfig, viewportName, context) {
    const page = await context.newPage();
    
    try {
      // Navigate to the route
      await page.goto(`${BASE_URL}${routeConfig.path}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      
      // Wait for critical elements to load
      if (routeConfig.waitForSelector) {
        await page.waitForSelector(routeConfig.waitForSelector, { timeout: 10000 });
      }
      
      // Allow time for animations and dynamic content
      await page.waitForTimeout(1000);
      
      // Disable animations for consistent screenshots
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `
      });
      
      const results = {
        status: 'passed',
        screenshots: {},
        issues: [],
        timestamp: new Date().toISOString()
      };
      
      // Capture baseline screenshot
      const baselineScreenshot = await this.captureScreenshot(
        page, 
        routeKey, 
        viewportName, 
        'baseline'
      );
      results.screenshots.baseline = baselineScreenshot;
      
      // Capture interactive state screenshots if enabled
      if (this.options.includeInteractions && routeConfig.interactions) {
        for (const interaction of routeConfig.interactions) {
          await this.performInteraction(page, interaction);
          await page.waitForTimeout(500); // Allow interaction to complete
          
          const interactionScreenshot = await this.captureScreenshot(
            page, 
            routeKey, 
            viewportName, 
            interaction.replace(':', '_')
          );
          results.screenshots[interaction] = interactionScreenshot;
        }
      }
      
      // Compare with baseline if it exists
      const comparisonResult = await this.compareWithBaseline(
        routeKey, 
        viewportName, 
        results.screenshots
      );
      
      if (comparisonResult.hasDifferences) {
        results.status = 'failed';
        results.issues = comparisonResult.differences;
      }
      
      return results;
      
    } finally {
      await page.close();
    }
  }

  async captureScreenshot(page, routeKey, viewportName, variant) {
    const filename = `${routeKey}_${viewportName}_${variant}_${Date.now()}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      type: 'png'
    });
    
    return {
      filename,
      filepath,
      variant,
      timestamp: new Date().toISOString(),
      size: fs.statSync(filepath).size
    };
  }

  async performInteraction(page, interaction) {
    const [action, selector] = interaction.split(':');
    
    try {
      switch (action) {
        case 'click':
          await page.click(selector, { timeout: 5000 });
          break;
          
        case 'hover':
          await page.hover(selector, { timeout: 5000 });
          break;
          
        case 'focus':
          await page.focus(selector, { timeout: 5000 });
          break;
          
        case 'scroll':
          if (selector === 'bottom') {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          } else {
            await page.locator(selector).scrollIntoViewIfNeeded();
          }
          break;
          
        default:
          console.warn(`Unknown interaction: ${action}`);
      }
    } catch (error) {
      console.warn(`Interaction failed: ${interaction} - ${error.message}`);
    }
  }

  async compareWithBaseline(routeKey, viewportName, screenshots) {
    const baselineDir = path.join(BASELINES_DIR, routeKey, viewportName);
    
    if (!fs.existsSync(baselineDir) || this.options.updateBaselines) {
      // Create baseline
      await this.createBaseline(routeKey, viewportName, screenshots);
      this.results.summary.new++;
      
      return {
        hasDifferences: false,
        isNewBaseline: true,
        differences: []
      };
    }
    
    // Compare with existing baseline
    const differences = [];
    
    for (const [variant, screenshot] of Object.entries(screenshots)) {
      const baselinePath = path.join(baselineDir, `${variant}.png`);
      
      if (fs.existsSync(baselinePath)) {
        const diffResult = await this.compareImages(
          screenshot.filepath,
          baselinePath,
          routeKey,
          viewportName,
          variant
        );
        
        if (diffResult.hasDifference) {
          differences.push(diffResult);
        }
      }
    }
    
    return {
      hasDifferences: differences.length > 0,
      differences
    };
  }

  async createBaseline(routeKey, viewportName, screenshots) {
    const baselineDir = path.join(BASELINES_DIR, routeKey, viewportName);
    
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
    
    for (const [variant, screenshot] of Object.entries(screenshots)) {
      const baselinePath = path.join(baselineDir, `${variant}.png`);
      fs.copyFileSync(screenshot.filepath, baselinePath);
    }
    
    console.log(`  📁 Created baseline for ${routeKey}/${viewportName}`);
  }

  async compareImages(currentPath, baselinePath, routeKey, viewportName, variant) {
    // Simple file-based comparison (in a real implementation, you'd use image diff libraries)
    const currentHash = await this.getFileHash(currentPath);
    const baselineHash = await this.getFileHash(baselinePath);
    
    const hasDifference = currentHash !== baselineHash;
    
    if (hasDifference) {
      // Generate diff image (placeholder for actual image diff implementation)
      const diffPath = path.join(DIFFS_DIR, `${routeKey}_${viewportName}_${variant}_diff.png`);
      
      // In a real implementation, you would use a library like 'pixelmatch' or 'looks-same'
      // For now, we'll just copy the current image as diff
      fs.copyFileSync(currentPath, diffPath);
      
      return {
        variant,
        hasDifference: true,
        currentPath,
        baselinePath,
        diffPath,
        message: `Visual difference detected in ${variant} for ${routeKey}/${viewportName}`
      };
    }
    
    return { variant, hasDifference: false };
  }

  async getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }

  async generateVisualReport() {
    console.log('\n📊 Generating visual test report...');
    
    const report = {
      title: 'ProductivityHub Visual Testing Report',
      timestamp: this.results.timestamp,
      summary: this.results.summary,
      configuration: this.options,
      testResults: this.results.tests,
      metadata: {
        browserVersion: await this.browser.version(),
        totalScreenshots: this.getTotalScreenshots(),
        testDuration: this.getTestDuration()
      }
    };
    
    // Generate JSON report
    const jsonReportPath = path.join(REPORTS_DIR, `visual-test-report-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(REPORTS_DIR, `visual-test-report-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    // Generate summary markdown
    const markdownReport = this.generateMarkdownReport(report);
    const markdownReportPath = path.join(REPORTS_DIR, 'VISUAL_TEST_REPORT.md');
    fs.writeFileSync(markdownReportPath, markdownReport);
    
    console.log(`📄 Reports generated:`);
    console.log(`  - JSON: ${jsonReportPath}`);
    console.log(`  - HTML: ${htmlReportPath}`);
    console.log(`  - Markdown: ${markdownReportPath}`);
    
    return {
      jsonReport: jsonReportPath,
      htmlReport: htmlReportPath,
      markdownReport: markdownReportPath
    };
  }

  generateMarkdownReport(report) {
    const { summary, testResults } = report;
    const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
    
    let markdown = `# 🎨 Visual Testing Report - ProductivityHub

**Generated:** ${new Date(report.timestamp).toLocaleString('ko-KR')}

## 📊 Summary
- **Total Tests:** ${summary.total}
- **Passed:** ${summary.passed} ✅
- **Failed:** ${summary.failed} ❌
- **New Baselines:** ${summary.new} 📁
- **Pass Rate:** ${passRate}%

## 🖥️ Viewport Coverage
- **Desktop** (1920×1080) - High resolution desktop
- **Laptop** (1366×768) - Standard laptop screen
- **Tablet** (768×1024) - iPad portrait orientation
- **Mobile** (375×667) - iPhone portrait
- **Mobile Landscape** (667×375) - iPhone landscape

## 📋 Test Results

`;

    // Add results for each route
    for (const test of testResults) {
      const statusIcon = test.status === 'passed' ? '✅' : '❌';
      markdown += `### ${statusIcon} ${test.routeConfig.name}\n`;
      markdown += `**Route:** \`${test.routeConfig.path}\`\n\n`;
      
      // Viewport results
      for (const [viewport, result] of Object.entries(test.viewports)) {
        const vpIcon = result.status === 'passed' ? '✅' : 
                      result.status === 'error' ? '💥' : '❌';
        markdown += `- **${viewport}:** ${vpIcon} ${result.status}\n`;
      }
      
      if (test.issues.length > 0) {
        markdown += `\n**Issues:**\n`;
        test.issues.forEach(issue => {
          markdown += `- ${issue}\n`;
        });
      }
      
      markdown += '\n';
    }

    // Add configuration details
    markdown += `## ⚙️ Configuration
- **Threshold:** ${(report.configuration.threshold * 100).toFixed(0)}%
- **Include Interactions:** ${report.configuration.includeInteractions ? 'Yes' : 'No'}
- **Update Baselines:** ${report.configuration.updateBaselines ? 'Yes' : 'No'}
- **Parallel Tests:** ${report.configuration.parallelTests}

## 📈 Recommendations

`;

    if (summary.failed > 0) {
      markdown += `### 🚨 Action Required
${summary.failed} visual tests failed. Review the differences and either:
1. Fix the UI issues causing visual changes
2. Update baselines if changes are intentional

`;
    }

    if (summary.passed === summary.total) {
      markdown += `### 🎉 All Tests Passed!
Great job! All visual tests are passing. Your UI is visually consistent across all tested viewports and interactions.

`;
    }

    markdown += `## 🔧 Usage Commands

\`\`\`bash
# Run visual tests
npm run test:visual

# Update baselines (when UI changes are intentional)  
npm run test:visual:update

# Generate report only
npm run test:visual:report
\`\`\`

---
*Generated by Visual Testing Agent - ProductivityHub*
`;

    return markdown;
  }

  generateHTMLReport(report) {
    // Placeholder for HTML report generation
    // In a full implementation, this would create a rich HTML report with embedded images
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Testing Report - ProductivityHub</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 6px; }
        .passed { border-left: 4px solid #28a745; }
        .failed { border-left: 4px solid #dc3545; }
        .viewport-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .viewport-item { padding: 10px; background: #f8f9fa; border-radius: 4px; text-align: center; }
    </style>
</head>
<body>
    <h1>🎨 Visual Testing Report - ProductivityHub</h1>
    <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString('ko-KR')}</p>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <p><strong>Total Tests:</strong> ${report.summary.total}</p>
        <p><strong>Passed:</strong> ${report.summary.passed} ✅</p>
        <p><strong>Failed:</strong> ${report.summary.failed} ❌</p>
        <p><strong>Pass Rate:</strong> ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%</p>
    </div>
    
    <!-- Test results would be populated here -->
    <h2>📋 Test Results</h2>
    ${report.testResults.map(test => `
        <div class="test-result ${test.status}">
            <h3>${test.status === 'passed' ? '✅' : '❌'} ${test.routeConfig.name}</h3>
            <p><strong>Route:</strong> <code>${test.routeConfig.path}</code></p>
            <div class="viewport-grid">
                ${Object.entries(test.viewports).map(([viewport, result]) => `
                    <div class="viewport-item">
                        <strong>${viewport}</strong><br>
                        ${result.status === 'passed' ? '✅' : result.status === 'error' ? '💥' : '❌'} ${result.status}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}
</body>
</html>`;
  }

  getTotalScreenshots() {
    return this.results.tests.reduce((total, test) => {
      return total + Object.values(test.viewports).reduce((vpTotal, viewport) => {
        return vpTotal + (viewport.screenshots ? Object.keys(viewport.screenshots).length : 0);
      }, 0);
    }, 0);
  }

  getTestDuration() {
    // Calculate duration based on timestamps (simplified)
    return 'N/A';
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    // Close all contexts
    for (const context of this.contexts.values()) {
      await context.close();
    }
    this.contexts.clear();
    
    // Close browser
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Summary method for easy results access
  getSummary() {
    const { summary } = this.results;
    const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;
    
    return {
      ...summary,
      passRate: `${passRate}%`,
      status: summary.failed === 0 ? 'All tests passed' : `${summary.failed} tests failed`,
      totalScreenshots: this.getTotalScreenshots()
    };
  }
}

// Command-line interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    updateBaselines: args.includes('--update-baselines'),
    threshold: parseFloat(args.find(arg => arg.startsWith('--threshold='))?.split('=')[1]) || 0.2,
    includeInteractions: !args.includes('--no-interactions'),
    generateReport: !args.includes('--no-report'),
    parallelTests: parseInt(args.find(arg => arg.startsWith('--parallel='))?.split('=')[1]) || 2
  };
  
  const agent = new VisualTestingAgent(options);
  
  try {
    await agent.initialize();
    const results = await agent.runVisualTests();
    const summary = agent.getSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎨 VISUAL TESTING COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Status: ${summary.status}`);
    console.log(`✅ Passed: ${summary.passed}/${summary.total} tests`);
    console.log(`📸 Screenshots: ${summary.totalScreenshots} captured`);
    console.log(`📈 Pass Rate: ${summary.passRate}`);
    
    if (summary.failed > 0) {
      console.log(`\n⚠️  ${summary.failed} tests failed - review the generated report for details`);
    }
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Visual testing failed:', error);
    process.exit(1);
    
  } finally {
    await agent.cleanup();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Received SIGINT, cleaning up...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = VisualTestingAgent;