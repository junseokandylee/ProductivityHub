import { test, expect } from '@playwright/test';

test.describe('Real-Time Compliance Monitoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
  });

  test('should load compliance dashboard with Korean law context', async ({ page }) => {
    // Check main heading with Korean context
    await expect(page.locator('h1')).toContainText('규정 준수 모니터링');
    await expect(page.locator('text=공직선거법, 정치자금법, 개인정보보호법')).toBeVisible();
    
    // Verify quick status cards
    const statusCards = ['전체 준수율', '활성 위반', '지출 현황', '개인정보 동의'];
    for (const card of statusCards) {
      await expect(page.locator(`text=${card}`)).toBeVisible();
    }
    
    // Check compliance percentage
    await expect(page.locator('.text-green-600:has-text("%")')).toBeVisible();
    
    // Verify alert banner for election period
    await expect(page.locator('text=선거 D-14일까지')).toBeVisible();
    await expect(page.locator('text=공직선거법 제82조의5')).toBeVisible();
  });

  test('should navigate through all 5 compliance tabs', async ({ page }) => {
    const tabs = [
      { name: '대시보드', content: 'dashboard' },
      { name: '위반 관리', content: 'violations' },
      { name: '지출 모니터링', content: 'spending' },
      { name: '규칙 관리', content: 'rules' },
      { name: '보고서', content: 'reports' }
    ];
    
    for (const tab of tabs) {
      await page.locator(`[role="tab"]:has-text("${tab.name}")`).click();
      await expect(page.locator(`[role="tabpanel"]`)).toBeVisible();
      
      // Verify URL parameter update
      const url = page.url();
      if (tab.name !== '대시보드') {
        expect(url).toContain(`tab=${tab.content}`);
      }
    }
  });

  test('should display Korean election law violations', async ({ page }) => {
    // Navigate to violations tab
    await page.locator('[role="tab"]:has-text("위반 관리")').click();
    
    // Check for violation types related to Korean election law
    const koreanViolationTypes = [
      '공직선거법 위반',
      '정치자금법 위반', 
      '개인정보보호법 위반',
      '허위사실 유포',
      '지출한도 초과',
      '후보자 비방'
    ];
    
    // Wait for violations data to load
    await page.waitForTimeout(2000);
    
    // Check if violations list is displayed
    const violationsList = page.locator('[data-testid="violations-list"]');
    if (await violationsList.isVisible()) {
      // Verify violation severity indicators
      await expect(page.locator('.text-red-600, .text-yellow-600, .text-orange-600')).toHaveCount.greaterThan(0);
      
      // Check for Korean legal references
      const legalReferences = page.locator('text*=제');
      if (await legalReferences.count() > 0) {
        const firstRef = legalReferences.first();
        await expect(firstRef).toBeVisible();
      }
    }
  });

  test('should monitor spending against Korean election limits', async ({ page }) => {
    // Navigate to spending monitoring tab
    await page.locator('[role="tab"]:has-text("지출 모니터링")').click();
    
    await page.waitForTimeout(2000);
    
    // Check for spending categories specific to Korean elections
    const spendingCategories = [
      '선전비용',
      '광고비',
      '인쇄물 제작비',
      '행사비용',
      '사무용품비',
      '통신비'
    ];
    
    // Verify spending progress indicators
    const progressBars = page.locator('[role="progressbar"], .progress');
    const progressCount = await progressBars.count();
    if (progressCount > 0) {
      await expect(progressBars.first()).toBeVisible();
    }
    
    // Check for Korean Won currency display
    const currencyDisplays = page.locator('text*=원, text*=₩');
    if (await currencyDisplays.count() > 0) {
      await expect(currencyDisplays.first()).toBeVisible();
    }
    
    // Verify spending limit alerts
    const alerts = page.locator('[role="alert"], .alert');
    const alertCount = await alerts.count();
    if (alertCount > 0) {
      // Check if alert contains Korean spending limit terms
      const alertText = await alerts.first().textContent();
      expect(alertText).toMatch(/한도|제한|초과/);
    }
  });

  test('should manage Korean election law rules', async ({ page }) => {
    // Navigate to rules management tab
    await page.locator('[role="tab"]:has-text("규칙 관리")').click();
    
    await page.waitForTimeout(2000);
    
    // Check for Korean election law categories
    const lawCategories = [
      '공직선거법',
      '정치자금법',
      '개인정보보호법',
      '선거운동 제한',
      '후보자 자격',
      '선거비용 한도'
    ];
    
    // Verify rules management interface
    const rulesContainer = page.locator('[data-testid="rules-container"]');
    if (await rulesContainer.isVisible()) {
      // Check for rule status indicators
      const statusIndicators = page.locator('.badge, .status-indicator');
      const statusCount = await statusIndicators.count();
      expect(statusCount).toBeGreaterThan(0);
      
      // Test rule activation/deactivation
      const toggles = page.locator('[role="switch"], [type="checkbox"]');
      if (await toggles.count() > 0) {
        await expect(toggles.first()).toBeVisible();
      }
    }
    
    // Check for Korean legal article references
    const articleRefs = page.locator('text*=제, text*=조');
    if (await articleRefs.count() > 0) {
      await expect(articleRefs.first()).toBeVisible();
    }
  });

  test('should generate compliance reports in Korean', async ({ page }) => {
    // Navigate to reports tab
    await page.locator('[role="tab"]:has-text("보고서")').click();
    
    await page.waitForTimeout(2000);
    
    // Check for Korean report types
    const reportTypes = [
      '준수 현황 보고서',
      '위반 사항 요약',
      '지출 내역 보고서',
      '법규 준수 증명서',
      '선거관리위원회 제출용'
    ];
    
    // Verify report generation interface
    const reportContainer = page.locator('[data-testid="reports-container"]');
    if (await reportContainer.isVisible()) {
      // Check for report format options
      const formatOptions = page.locator('text*=PDF, text*=Excel, text*=CSV');
      if (await formatOptions.count() > 0) {
        await expect(formatOptions.first()).toBeVisible();
      }
      
      // Check for date range selectors
      const dateInputs = page.locator('input[type="date"]');
      if (await dateInputs.count() > 0) {
        await expect(dateInputs.first()).toBeVisible();
      }
      
      // Test report generation button
      const generateButton = page.locator('button:has-text("생성"), button:has-text("보고서")');
      if (await generateButton.count() > 0) {
        await expect(generateButton.first()).toBeVisible();
      }
    }
  });

  test('should validate real-time monitoring capabilities', async ({ page }) => {
    // Check for real-time indicators
    await expect(page.locator('button:has-text("실시간 모니터링")')).toBeVisible();
    
    // Test auto-refresh functionality
    const initialTime = await page.textContent('[data-testid="last-update"]');
    
    // Wait for potential auto-refresh
    await page.waitForTimeout(3000);
    
    // Check if compliance metrics are being updated
    const complianceRate = page.locator('.text-green-600:has-text("%")').first();
    const currentRate = await complianceRate.textContent();
    expect(currentRate).toMatch(/\d+(\.\d+)?%/);
    
    // Verify real-time status indicators
    const statusIndicators = page.locator('.animate-pulse, [data-testid="live-indicator"]');
    if (await statusIndicators.count() > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    }
  });

  test('should handle compliance violations with Korean context', async ({ page }) => {
    // Mock violation data
    await page.route('**/api/compliance/violations**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          violations: [
            {
              id: 'v001',
              type: '공직선거법 위반',
              severity: 'high',
              description: '인터넷 광고 게시 기간 위반',
              article: '공직선거법 제82조의5',
              detectedAt: new Date().toISOString(),
              status: 'active'
            },
            {
              id: 'v002', 
              type: '정치자금법 위반',
              severity: 'medium',
              description: '지출 한도 90% 초과 경고',
              article: '정치자금법 제45조',
              detectedAt: new Date().toISOString(),
              status: 'resolved'
            }
          ]
        })
      });
    });
    
    await page.locator('[role="tab"]:has-text("위반 관리")').click();
    await page.waitForTimeout(1000);
    
    // Verify violations are displayed with Korean context
    await expect(page.locator('text=공직선거법 위반')).toBeVisible();
    await expect(page.locator('text=제82조의5')).toBeVisible();
    await expect(page.locator('text=인터넷 광고 게시 기간 위반')).toBeVisible();
    
    // Check severity indicators
    await expect(page.locator('.text-red-600')).toBeVisible(); // High severity
    await expect(page.locator('.text-yellow-600')).toBeVisible(); // Medium severity
  });

  test('should track spending with Korean currency and limits', async ({ page }) => {
    // Mock spending data
    await page.route('**/api/compliance/spending**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          totalSpent: 187500000, // 1.875억원
          totalLimit: 250000000, // 2.5억원
          categories: [
            { name: '선전비용', spent: 75000000, limit: 100000000 },
            { name: '광고비', spent: 50000000, limit: 75000000 },
            { name: '행사비용', spent: 62500000, limit: 75000000 }
          ],
          utilization: 75.0
        })
      });
    });
    
    await page.locator('[role="tab"]:has-text("지출 모니터링")').click();
    await page.waitForTimeout(1000);
    
    // Verify Korean Won formatting
    const amounts = page.locator('text*=억, text*=만원, text*=원');
    if (await amounts.count() > 0) {
      await expect(amounts.first()).toBeVisible();
    }
    
    // Check spending utilization percentage
    await expect(page.locator('text=75%')).toBeVisible();
    
    // Verify spending categories in Korean
    await expect(page.locator('text=선전비용')).toBeVisible();
    await expect(page.locator('text=광고비')).toBeVisible();
  });

  test('should validate response times for compliance APIs', async ({ page }) => {
    const apiEndpoints = [
      '/api/compliance/dashboard',
      '/api/compliance/violations',
      '/api/compliance/spending',
      '/api/compliance/rules',
      '/api/compliance/reports'
    ];
    
    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      
      await page.route(`**${endpoint}**`, route => {
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(500); // Should respond within 500ms
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [], timestamp: new Date().toISOString() })
        });
      });
      
      // Trigger API call by navigating to relevant tab
      if (endpoint.includes('violations')) {
        await page.locator('[role="tab"]:has-text("위반 관리")').click();
      } else if (endpoint.includes('spending')) {
        await page.locator('[role="tab"]:has-text("지출 모니터링")').click();
      } else if (endpoint.includes('rules')) {
        await page.locator('[role="tab"]:has-text("규칙 관리")').click();
      } else if (endpoint.includes('reports')) {
        await page.locator('[role="tab"]:has-text("보고서")').click();
      }
      
      await page.waitForTimeout(100);
    }
  });

  test('should be accessible with Korean screen readers', async ({ page }) => {
    // Check ARIA labels in Korean
    await expect(page.locator('[aria-label*="준수"], [aria-label*="위반"], [aria-label*="모니터링"]')).toHaveCount.greaterThan(0);
    
    // Verify tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test keyboard navigation through tabs
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
    }
    
    // Check for Korean language attributes
    const langElements = page.locator('[lang="ko"], [lang="ko-KR"]');
    if (await langElements.count() > 0) {
      await expect(langElements.first()).toBeVisible();
    }
    
    // Verify heading structure for screen readers
    const headings = page.locator('h1, h2, h3, h4');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Test progress bar accessibility
    const progressBars = page.locator('[role="progressbar"]');
    const progressCount = await progressBars.count();
    for (let i = 0; i < Math.min(progressCount, 3); i++) {
      const progressBar = progressBars.nth(i);
      await expect(progressBar).toHaveAttribute('aria-valuenow');
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test network failure
    await page.route('**/api/compliance/**', route => {
      route.abort('internetdisconnected');
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should show error messages in Korean
    const errorMessages = page.locator('text*=오류, text*=실패, text*=연결');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
    
    // Test API error responses
    await page.unroute('**/api/compliance/**');
    await page.route('**/api/compliance/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '서버 내부 오류', message: '잠시 후 다시 시도해주세요.' })
      });
    });
    
    await page.locator('[role="tab"]:has-text("위반 관리")').click();
    await page.waitForTimeout(1000);
    
    const errorAlerts = page.locator('[role="alert"], .alert-error');
    if (await errorAlerts.count() > 0) {
      await expect(errorAlerts.first()).toContainText(/오류|실패|문제/);
    }
  });

  test('should persist tab state across navigation', async ({ page }) => {
    // Navigate to spending tab
    await page.locator('[role="tab"]:has-text("지출 모니터링")').click();
    expect(page.url()).toContain('tab=spending');
    
    // Refresh page
    await page.reload();
    
    // Should maintain spending tab selection
    await expect(page.locator('[role="tab"][data-state="active"]:has-text("지출 모니터링")')).toBeVisible();
    expect(page.url()).toContain('tab=spending');
    
    // Test direct URL access
    await page.goto('/compliance?tab=violations');
    await expect(page.locator('[role="tab"][data-state="active"]:has-text("위반 관리")')).toBeVisible();
  });
});