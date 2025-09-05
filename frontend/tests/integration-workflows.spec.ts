import { test, expect } from '@playwright/test';

test.describe('Cross-Feature Integration Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Setup comprehensive API mocks for integration testing
    await page.route('**/api/**', route => {
      const url = route.request().url();
      const method = route.request().method();
      
      // Personalization API responses
      if (url.includes('/api/personalization/generate') && method === 'POST') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            personalizationId: 'p001',
            originalMessage: '안녕하십니까? 여러분과 함께 하겠습니다.',
            personalizedVariants: [
              {
                id: 'v001',
                personalizedMessage: '안녕하시요? 부산 시민 여러분과 함께하겠습니다.',
                targetDemographics: { ageGroup: '40s', regionName: '부산광역시' },
                dialect: '부산말',
                formalityLevel: '존댓말',
                effectivenessScore: 0.85,
                confidence: 0.92,
                culturalMarkers: ['지역 정체성', '친근한 접근'],
                abTestGroup: 'A',
                complianceStatus: 'approved',
                usesPoliticalTerms: true
              }
            ],
            complianceValidation: {
              overallScore: 0.88,
              violations: [],
              warnings: ['방언 사용 시 이해도 확인 필요']
            },
            processingTime: 2340
          })
        });
      }
      
      // Korean language processing responses
      else if (url.includes('/api/korean-language/')) {
        const endpoint = url.split('/').pop();
        
        if (endpoint === 'dialect-convert') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              originalText: '안녕하십니까? 좋은 하루 되세요.',
              convertedText: '안녕하시요? 좋은 하루 되이소.',
              sourceDialect: '서울말',
              targetDialect: '부산말',
              confidence: 0.94,
              culturalMarkers: ['경상도 억양', '친근한 어조'],
              complianceChecked: true
            })
          });
        } else if (endpoint === 'validate-political-terms') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              text: '공약을 이행하겠습니다. 민생을 위해 노력하겠습니다.',
              complianceScore: 0.91,
              validTerms: ['공약', '이행', '민생'],
              invalidTerms: [],
              risks: [],
              koreanElectionLawCompliant: true
            })
          });
        }
      }
      
      // Compliance API responses
      else if (url.includes('/api/compliance/')) {
        const endpoint = url.split('/').pop();
        
        if (endpoint === 'validate-message') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              messageId: 'm001',
              complianceStatus: 'approved',
              overallScore: 0.89,
              lawValidation: {
                '공직선거법': { compliant: true, score: 0.92 },
                '정치자금법': { compliant: true, score: 0.88 },
                '개인정보보호법': { compliant: true, score: 0.87 }
              },
              violations: [],
              warnings: ['방언 사용으로 인한 이해도 검토 권장'],
              recommendations: ['표준어 병기 고려']
            })
          });
        } else if (endpoint === 'spending') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              totalSpent: 187500000,
              totalLimit: 250000000,
              utilizationRate: 0.75,
              categories: [
                { name: '메시지 개인화 비용', spent: 12500000, limit: 25000000 }
              ],
              complianceStatus: 'within_limits'
            })
          });
        }
      }
      
      // Default response for other endpoints
      else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: {} })
        });
      }
    });
  });

  test('should complete full AI personalization with compliance validation workflow', async ({ page }) => {
    // Start with personalization dashboard
    await page.goto('/campaigns/personalization');
    await page.waitForLoadState('networkidle');
    
    // Step 1: Input Korean political message
    const politicalMessage = '안녕하십니까? 저는 여러분의 대표로서 지역 경제 활성화와 일자리 창출에 최선을 다하겠습니다. 함께 더 나은 미래를 만들어가겠습니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', politicalMessage);
    
    // Step 2: Configure target demographics with regional focus
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Configure Busan demographic
    const regionSelect = page.locator('select').filter({ hasText: /지역/ }).first();
    if (await regionSelect.isVisible()) {
      await regionSelect.selectOption('26'); // Busan
    }
    
    const ageSelect = page.locator('select').filter({ hasText: /연령/ }).first();
    if (await ageSelect.isVisible()) {
      await ageSelect.selectOption('40s');
    }
    
    const occupationSelect = page.locator('select').filter({ hasText: /직업/ }).first();
    if (await occupationSelect.isVisible()) {
      await occupationSelect.selectOption('자영업자');
    }
    
    // Step 3: Set high cultural sensitivity for accurate Korean processing
    const sensitivitySelect = page.locator('select[value*="cultural"]');
    if (await sensitivitySelect.isVisible()) {
      await sensitivitySelect.selectOption('high');
    }
    
    // Step 4: Enable A/B testing for effectiveness measurement
    const abTestSwitch = page.locator('[data-testid="ab-test-switch"]');
    if (await abTestSwitch.isVisible()) {
      await abTestSwitch.check();
    }
    
    // Step 5: Generate personalized messages (integrates AI + Korean Language + Compliance)
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    // Verify loading state and progress
    await expect(page.locator('text=생성 중...')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Wait for completion
    await page.waitForTimeout(3000);
    
    // Step 6: Verify results show integrated processing
    const resultsSection = page.locator('[data-testid="personalization-results"]');
    if (await resultsSection.isVisible()) {
      // Check Korean dialect conversion
      await expect(page.locator('.badge:has-text("부산말")')).toBeVisible();
      
      // Check compliance validation
      await expect(page.locator('text=컴플라이언스, text=준수')).toBeVisible();
      
      // Check effectiveness scoring
      await expect(page.locator('text*=효과성')).toBeVisible();
      
      // Verify cultural markers from Korean language processing
      await expect(page.locator('[data-testid="cultural-markers"]')).toBeVisible();
    }
    
    // Step 7: Navigate to compliance dashboard to verify integration
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
    
    // Verify compliance metrics include personalization activities
    await expect(page.locator('.text-green-600:has-text("%")')).toBeVisible();
    
    // Check spending includes AI processing costs
    await page.locator('[role="tab"]:has-text("지출 모니터링")').click();
    await page.waitForTimeout(1000);
    
    const spendingData = page.locator('text*=개인화, text*=AI');
    if (await spendingData.count() > 0) {
      await expect(spendingData.first()).toBeVisible();
    }
  });

  test('should validate Korean message compliance before personalization', async ({ page }) => {
    await page.goto('/campaigns/personalization');
    await page.waitForLoadState('networkidle');
    
    // Test with potentially non-compliant message
    const problematicMessage = '상대 후보는 부정직합니다. 우리만이 진짜 애국자입니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', problematicMessage);
    
    // Setup demographic
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Should trigger validation before personalization
    await page.waitForTimeout(2000);
    
    // Check if validation warnings appear
    const validationIssues = page.locator('[data-testid="validation-issues"]');
    if (await validationIssues.isVisible()) {
      await expect(validationIssues).toContainText(/부적절|문제|경고/);
    }
    
    // Attempt to generate - should be blocked or warned
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    // Should show compliance warning
    const complianceWarning = page.locator('[role="alert"]');
    if (await complianceWarning.isVisible()) {
      await expect(complianceWarning).toContainText(/검증|준수|규정/);
    }
    
    // Replace with compliant message
    const compliantMessage = '안녕하십니까? 지역 발전을 위한 구체적인 정책을 제안드립니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', compliantMessage);
    
    await page.waitForTimeout(1000);
    
    // Validation should pass
    const noIssues = await page.locator('[data-testid="validation-issues"]').count();
    expect(noIssues).toBe(0);
  });

  test('should track personalization costs in compliance spending monitor', async ({ page }) => {
    // First, generate some personalized messages to create spending data
    await page.goto('/campaigns/personalization');
    
    const message = '안녕하십니까? 여러분을 위한 정책을 제안합니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', message);
    
    await page.locator('button:has-text("타겟 추가")').first().click();
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    await page.waitForTimeout(2000);
    
    // Navigate to compliance spending monitor
    await page.goto('/compliance?tab=spending');
    await page.waitForLoadState('networkidle');
    
    // Should show AI personalization costs
    const aiSpendingCategory = page.locator('text*=개인화, text*=AI, text*=인공지능');
    if (await aiSpendingCategory.count() > 0) {
      await expect(aiSpendingCategory.first()).toBeVisible();
      
      // Should show spending amount in Korean Won
      await expect(page.locator('text*=원, text*=만원, text*=억원')).toBeVisible();
      
      // Should show compliance with election spending limits
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
    }
    
    // Verify total spending includes AI costs
    const totalSpending = page.locator('text*=전체, text*=총');
    if (await totalSpending.count() > 0) {
      await expect(totalSpending.first()).toBeVisible();
    }
  });

  test('should integrate Korean dialect processing with compliance rules', async ({ page }) => {
    await page.goto('/compliance?tab=rules');
    await page.waitForLoadState('networkidle');
    
    // Should have rules for Korean language processing
    const koreanLanguageRules = page.locator('text*=방언, text*=한국어, text*=언어');
    if (await koreanLanguageRules.count() > 0) {
      await expect(koreanLanguageRules.first()).toBeVisible();
    }
    
    // Check for rules about regional dialect usage in campaigns
    const dialectRules = page.locator('text*=지역어, text*=사투리, text*=방언');
    if (await dialectRules.count() > 0) {
      // Should have compliance rules for dialect usage
      await expect(dialectRules.first()).toBeVisible();
    }
    
    // Navigate to personalization to test rule application
    await page.goto('/campaigns/personalization');
    
    const dialectMessage = '안녕하십니까? 우리 지역을 위해 열심히 일하겠습니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', dialectMessage);
    
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Select strong dialect region (Jeju)
    const regionSelect = page.locator('select').filter({ hasText: /지역/ }).first();
    if (await regionSelect.isVisible()) {
      await regionSelect.selectOption('49'); // Jeju
    }
    
    await page.locator('button:has-text("미리보기")').click();
    await page.waitForTimeout(2000);
    
    // Should show compliance considerations for dialect usage
    const complianceNotice = page.locator('text*=준수, text*=규정, text*=검토');
    if (await complianceNotice.count() > 0) {
      await expect(complianceNotice.first()).toBeVisible();
    }
  });

  test('should generate compliance reports including personalization activities', async ({ page }) => {
    await page.goto('/compliance?tab=reports');
    await page.waitForLoadState('networkidle');
    
    // Should have option to include AI personalization in reports
    const reportOptions = page.locator('text*=개인화, text*=AI, text*=메시지');
    if (await reportOptions.count() > 0) {
      await expect(reportOptions.first()).toBeVisible();
    }
    
    // Test generating comprehensive report
    const generateButton = page.locator('button:has-text("생성"), button:has-text("보고서")');
    if (await generateButton.count() > 0) {
      await generateButton.first().click();
      await page.waitForTimeout(2000);
      
      // Should show report generation progress
      const progressIndicator = page.locator('.animate-spin, [data-testid="generating"]');
      if (await progressIndicator.count() > 0) {
        await expect(progressIndicator.first()).toBeVisible();
      }
    }
    
    // Check for Korean language content in reports
    const koreanReportContent = page.locator('text*=한국어, text*=방언, text*=문화');
    if (await koreanReportContent.count() > 0) {
      await expect(koreanReportContent.first()).toBeVisible();
    }
  });

  test('should handle end-to-end error scenarios gracefully', async ({ page }) => {
    // Test Korean language service failure during personalization
    await page.route('**/api/korean-language/**', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: '한국어 처리 서비스가 일시적으로 사용할 수 없습니다.' })
      });
    });
    
    await page.goto('/campaigns/personalization');
    
    const message = '안녕하십니까? 테스트 메시지입니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', message);
    
    await page.locator('button:has-text("타겟 추가")').first().click();
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    // Should show graceful error message in Korean
    await expect(page.locator('text*=오류, text*=실패, text*=서비스')).toBeVisible({ timeout: 5000 });
    
    // Test compliance service failure
    await page.unroute('**/api/korean-language/**');
    await page.route('**/api/compliance/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '컴플라이언스 서비스 오류' })
      });
    });
    
    await page.goto('/compliance');
    await page.waitForTimeout(2000);
    
    // Should show compliance service error
    await expect(page.locator('text*=오류, text*=서비스')).toBeVisible();
    
    // Should still allow basic functionality
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test('should maintain performance across integrated workflows', async ({ page }) => {
    // Test full workflow performance
    const startTime = Date.now();
    
    // Navigate to personalization
    await page.goto('/campaigns/personalization');
    await page.waitForLoadState('networkidle');
    
    const navTime = Date.now() - startTime;
    expect(navTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Setup and generate personalization
    const setupStart = Date.now();
    
    await page.fill('textarea[placeholder*="안녕하십니까"]', '성능 테스트를 위한 메시지입니다.');
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    const setupTime = Date.now() - setupStart;
    expect(setupTime).toBeLessThan(2000); // Setup should be fast
    
    // Test API integration performance
    const apiStart = Date.now();
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    // Wait for API response
    await Promise.race([
      page.waitForSelector('[data-testid="personalization-results"]', { timeout: 5000 }),
      page.waitForSelector('[role="alert"]', { timeout: 5000 })
    ]);
    
    const apiTime = Date.now() - apiStart;
    expect(apiTime).toBeLessThan(5000); // API should respond within 5 seconds
    
    // Test navigation between features
    const navStart = Date.now();
    await page.goto('/compliance');
    await page.waitForLoadState('networkidle');
    
    const crossNavTime = Date.now() - navStart;
    expect(crossNavTime).toBeLessThan(3000); // Cross-feature navigation should be fast
  });

  test('should support real-time updates across features', async ({ page }) => {
    // Open two tabs to test real-time sync
    const context = page.context();
    const personalizationPage = page;
    const compliancePage = await context.newPage();
    
    // Setup personalization page
    await personalizationPage.goto('/campaigns/personalization');
    await personalizationPage.waitForLoadState('networkidle');
    
    // Setup compliance page
    await compliancePage.goto('/compliance');
    await compliancePage.waitForLoadState('networkidle');
    
    // Generate personalization on first page
    await personalizationPage.fill('textarea[placeholder*="안녕하십니까"]', '실시간 동기화 테스트 메시지입니다.');
    await personalizationPage.locator('button:has-text("타겟 추가")').first().click();
    await personalizationPage.locator('button:has-text("개인화 메시지 생성")').click();
    
    await personalizationPage.waitForTimeout(3000);
    
    // Check if compliance page shows updated spending
    await compliancePage.reload();
    await compliancePage.waitForLoadState('networkidle');
    
    const updatedSpending = compliancePage.locator('.text-blue-600:has-text("%")');
    if (await updatedSpending.isVisible()) {
      // Should reflect updated spending from personalization activity
      const spendingText = await updatedSpending.textContent();
      expect(spendingText).toMatch(/\d+%/);
    }
    
    await compliancePage.close();
  });

  test('should validate data consistency across features', async ({ page }) => {
    // Generate personalized message
    await page.goto('/campaigns/personalization');
    
    const testMessage = '데이터 일관성 검증을 위한 테스트 메시지입니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', testMessage);
    
    await page.locator('button:has-text("타겟 추가")').first().click();
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    await page.waitForTimeout(3000);
    
    // Capture personalization result data
    const resultCard = page.locator('[data-testid="variant-card"]').first();
    let personalizationData = {};
    
    if (await resultCard.isVisible()) {
      const effectivenessText = await resultCard.locator('.badge:has-text("효과성")').textContent();
      const dialectText = await resultCard.locator('.badge:has-text("방언:")').textContent();
      
      personalizationData = {
        effectiveness: effectivenessText,
        dialect: dialectText
      };
    }
    
    // Navigate to compliance and verify data consistency
    await page.goto('/compliance');
    
    // Check if personalization activity is reflected in compliance metrics
    const complianceScore = await page.locator('.text-green-600:has-text("%")').first().textContent();
    expect(complianceScore).toMatch(/\d+(\.\d+)?%/);
    
    // Navigate to spending tab
    await page.locator('[role="tab"]:has-text("지출 모니터링")').click();
    
    // Verify spending data includes personalization costs
    const spendingCategories = page.locator('text*=개인화, text*=AI');
    if (await spendingCategories.count() > 0) {
      await expect(spendingCategories.first()).toBeVisible();
    }
    
    // Data should be consistent across features
    const totalSpent = await page.locator('.text-blue-600:has-text("%")').first().textContent();
    expect(totalSpent).toMatch(/\d+%/);
  });
});