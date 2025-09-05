#!/usr/bin/env node

/**
 * Production-like Route Testing
 * Tests routes using Next.js production build to avoid development quirks
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';

// All routes to test
const ALL_ROUTES = [
  // Public routes
  '/auth/login', '/auth/signup', '/auth/reset-password', '/auth/verify-email', '/terms', '/privacy',
  // Core app routes
  '/', '/dashboard', '/calendar', '/activity-score',
  // Contact management
  '/contacts', '/contacts/import', '/contacts/export', '/contacts/deduplication', '/segments',
  // Campaign management
  '/campaigns', '/campaigns/new', '/campaigns/templates', '/campaigns/scheduled', '/campaigns/personalization',
  // Communication
  '/inbox', '/inbox/auto-reply',
  // Reports & Analytics
  '/reports', '/reports/monthly', '/reports/campaigns', '/reports/contacts', '/reports/quota',
  '/analytics', '/analytics/campaigns', '/analytics/ab-tests', '/analytics/costs',
  // Settings
  '/settings', '/settings/profile', '/settings/tenant', '/settings/billing', '/settings/api-keys',
  '/settings/organization', '/settings/channels', '/settings/users', '/settings/quota', '/settings/security',
  // Help & Support
  '/help', '/help/guide', '/help/tutorial', '/help/faq', '/help/contact',
  // Additional features
  '/notifications', '/compliance',
  // Dynamic routes (will likely 404 without data, but should handle gracefully)
  '/contacts/1', '/campaigns/1', '/campaigns/1/monitor', '/campaigns/1/analytics', '/campaigns/1/analytics/print', '/inbox/1'
];

class ProductionRouteTest {
  constructor() {
    this.server = null;
    this.browser = null;
    this.results = [];
  }

  async startProductionServer() {
    console.log('🏗️  Building production version...');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
      
      buildProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Build failed with code ${code}`));
          return;
        }
        
        console.log('🚀 Starting production server...');
        
        this.server = spawn('npm', ['run', 'start', '--', '-p', '3001'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let serverReady = false;
        
        this.server.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(output);
          if (output.includes('Ready') || output.includes('started server')) {
            if (!serverReady) {
              serverReady = true;
              setTimeout(resolve, 2000); // Give server time to fully initialize
            }
          }
        });
        
        this.server.stderr.on('data', (data) => {
          console.error(data.toString());
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (!serverReady) {
            reject(new Error('Server failed to start within 30 seconds'));
          }
        }, 30000);
      });
    });
  }

  async testRoutes() {
    console.log('🧪 Starting production route tests...\n');
    
    this.browser = await chromium.launch({ headless: true });
    const page = await this.browser.newPage();
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test_token');
      document.cookie = 'access_token=test_token; path=/';
    });
    
    for (const route of ALL_ROUTES) {
      try {
        console.log(`Testing: ${route}`);
        
        const response = await page.goto(`${BASE_URL}${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        const status = response.status();
        const title = await page.title();
        
        // Wait for React hydration
        await page.waitForTimeout(1000);
        
        const hasContent = await page.locator('body').isVisible();
        const text = await page.locator('body').textContent();
        const hasKorean = /[가-힣]/.test(text);
        
        // Check for actual errors (not just the word "Error")
        const hasError = text.includes('404') || 
                        text.includes('Internal Server Error') || 
                        text.includes('500') ||
                        text.includes('페이지를 찾을 수 없습니다') ||
                        (text.includes('Error') && !text.includes('Error Boundary'));
        
        const result = {
          route,
          status,
          title: title !== 'Next.js' ? title : 'No title',
          hasContent,
          hasKorean,
          hasError,
          textLength: text.length,
          success: status < 400 && hasContent && !hasError
        };
        
        this.results.push(result);
        
        if (result.success) {
          console.log(`  ✅ ${status} - ${hasKorean ? '🇰🇷 Korean' : 'English'} (${text.length} chars)`);
        } else {
          console.log(`  ❌ ${status} - ${result.hasError ? 'Has errors' : 'No content'}`);
        }
        
      } catch (error) {
        console.log(`  💥 ${route}: ${error.message}`);
        this.results.push({
          route,
          status: null,
          error: error.message,
          success: false
        });
      }
    }
    
    await this.browser.close();
    
    // Generate summary
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const withKorean = this.results.filter(r => r.hasKorean).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION ROUTE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successful}/${total} routes (${Math.round(successful/total*100)}%)`);
    console.log(`🇰🇷 Korean Content: ${withKorean}/${total} routes`);
    console.log(`⚡ Average Load: ${Math.round(this.results.reduce((sum, r) => sum + (r.textLength || 0), 0) / this.results.length)} chars`);
    
    // Save detailed results
    fs.writeFileSync('production-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n📄 Detailed results saved to: production-test-results.json');
    
    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    
    if (this.server) {
      console.log('\n🛑 Stopping production server...');
      this.server.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.server && !this.server.killed) {
          this.server.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

// Main execution
async function main() {
  const tester = new ProductionRouteTest();
  
  try {
    await tester.startProductionServer();
    await tester.testRoutes();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
    
  } finally {
    await tester.cleanup();
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

module.exports = ProductionRouteTest;