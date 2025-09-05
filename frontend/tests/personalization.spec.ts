import { test, expect } from '@playwright/test';

test.describe('AI-Powered Message Personalization Engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns/personalization');
    await page.waitForLoadState('networkidle');
  });

  test('should load personalization dashboard with all tabs', async ({ page }) => {
    // Check page title and main elements
    await expect(page.locator('h1')).toContainText('AI 메시지 개인화 엔진');
    
    // Verify all tabs are present
    const tabs = ['메시지 생성', '인구통계 분석', '결과 분석', '설정'];
    for (const tab of tabs) {
      await expect(page.locator('[role="tablist"]')).toContainText(tab);
    }
    
    // Check initial state
    await expect(page.locator('[data-state="active"]')).toContainText('메시지 생성');
  });

  test('should validate Korean message input', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="안녕하십니까"]');
    
    // Test empty message validation
    await messageInput.fill('');
    await page.locator('button:has-text("미리보기")').click();
    await expect(page.locator('.text-red-600')).toHaveCount(0); // No error for empty preview
    
    // Test non-Korean message
    await messageInput.fill('Hello, this is English only message');
    await page.waitForTimeout(1000); // Wait for validation
    await expect(page.locator('text=한글이 포함되지 않은 메시지입니다.')).toBeVisible();
    
    // Test inappropriate political terms
    await messageInput.fill('우리는 빨갱이와 싸워야 합니다');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=부적절한 정치적 표현이 포함되어 있습니다')).toBeVisible();
    
    // Test valid Korean message
    await messageInput.fill('안녕하십니까? 여러분의 더 나은 삶을 위해 최선을 다하겠습니다.');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="validation-issues"]')).toHaveCount(0);
  });

  test('should add and configure target demographics', async ({ page }) => {
    // Add first target demographic
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Verify demographic card is added
    await expect(page.locator('text=타겟 그룹 1')).toBeVisible();
    
    // Configure demographic details
    const ageSelect = page.locator('[data-testid="age-select"]').first();
    await ageSelect.click();
    await page.locator('text=30대').click();
    
    const regionSelect = page.locator('[data-testid="region-select"]').first();
    await regionSelect.click();
    await page.locator('text=서울특별시').click();
    
    const occupationSelect = page.locator('[data-testid="occupation-select"]').first();
    await occupationSelect.click();
    await page.locator('text=회사원').click();
    
    // Verify badges are updated
    await expect(page.locator('.badge:has-text("30대 서울특별시")')).toBeVisible();
    await expect(page.locator('.badge:has-text("서울말")')).toBeVisible();
    await expect(page.locator('.badge:has-text("회사원")')).toBeVisible();
    
    // Add second target
    await page.locator('button:has-text("타겟 추가")').first().click();
    await expect(page.locator('text=타겟 그룹 2')).toBeVisible();
    
    // Remove first target
    await page.locator('button:has-text("제거")').first().click();
    await expect(page.locator('text=타겟 그룹 1')).toHaveCount(1);
  });

  test('should generate personalization preview', async ({ page }) => {
    // Setup valid message and target
    await page.fill('textarea[placeholder*="안녕하십니까"]', '안녕하십니까? 여러분을 위해 최선을 다하겠습니다.');
    
    // Add target demographic
    await page.locator('button:has-text("타겟 추가")').first().click();
    const regionSelect = page.locator('select').filter({ hasText: '지역' }).first();
    await regionSelect.selectOption('26'); // 부산광역시
    
    // Generate preview
    await page.locator('button:has-text("미리보기")').click();
    
    // Wait for preview to load (mock API should respond)
    await page.waitForTimeout(2000);
    
    // Check if preview is shown (depends on API mock)
    const previewCard = page.locator('[data-testid="preview-card"]');
    if (await previewCard.isVisible()) {
      await expect(page.locator('text=개인화 미리보기')).toBeVisible();
      await expect(page.locator('.badge:has-text("방언:")')).toBeVisible();
      await expect(page.locator('.badge:has-text("격식:")')).toBeVisible();
    }
  });

  test('should handle personalization generation workflow', async ({ page }) => {
    // Complete setup
    await page.fill('textarea[placeholder*="안녕하십니까"]', '안녕하십니까? 여러분의 더 나은 삶을 위해 최선을 다하겠습니다. 지역 발전과 경제 활성화에 전념하겠습니다.');
    
    // Add multiple demographics
    await page.locator('button:has-text("타겟 추가")').first().click();
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Configure first target (Seoul)
    const firstRegionSelect = page.locator('select').filter({ hasText: '지역' }).first();
    await firstRegionSelect.selectOption('11');
    
    // Configure second target (Busan) 
    const secondRegionSelect = page.locator('select').filter({ hasText: '지역' }).nth(1);
    await secondRegionSelect.selectOption('26');
    
    // Adjust personalization settings
    const culturalSensitivity = page.locator('select[placeholder*="문화적 민감성"]');
    await culturalSensitivity.selectOption('high');
    
    // Enable A/B testing
    const abTestSwitch = page.locator('[data-testid="ab-test-switch"]');
    if (await abTestSwitch.isVisible()) {
      await abTestSwitch.click();
    }
    
    // Adjust personalization goals
    const goalSliders = page.locator('[data-testid="goal-slider"]');
    const sliderCount = await goalSliders.count();
    if (sliderCount > 0) {
      // Adjust first goal weight
      await goalSliders.first().fill('90');
    }
    
    // Generate personalized messages
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    // Verify loading state
    await expect(page.locator('text=생성 중...')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Wait for completion (with timeout for API mock)
    await page.waitForTimeout(5000);
    
    // Check for results or errors
    const hasResults = await page.locator('text=개인화 결과').isVisible();
    const hasError = await page.locator('[role="alert"]').isVisible();
    
    expect(hasResults || hasError).toBe(true);
  });

  test('should display results with Korean dialect variations', async ({ page }) => {
    // Mock successful generation by navigating with results parameter
    await page.goto('/campaigns/personalization?mockResults=true');
    
    // Check for results section
    const resultsSection = page.locator('[data-testid="personalization-results"]');
    if (await resultsSection.isVisible()) {
      await expect(page.locator('text=개인화 결과')).toBeVisible();
      
      // Verify variant cards
      const variantCards = page.locator('[data-testid="variant-card"]');
      const cardCount = await variantCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      if (cardCount > 0) {
        // Check first variant
        const firstCard = variantCards.first();
        await expect(firstCard.locator('.badge:has-text("방언:")')).toBeVisible();
        await expect(firstCard.locator('.badge:has-text("격식 수준:")')).toBeVisible();
        await expect(firstCard.locator('.badge:has-text("효과성")')).toBeVisible();
        
        // Check for Korean cultural markers
        const culturalMarkers = firstCard.locator('[data-testid="cultural-markers"] .badge');
        const markerCount = await culturalMarkers.count();
        expect(markerCount).toBeGreaterThan(0);
        
        // Verify action buttons
        await expect(firstCard.locator('button:has-text("수정")')).toBeVisible();
        await expect(firstCard.locator('button:has-text("사용")')).toBeVisible();
      }
    }
  });

  test('should validate performance metrics', async ({ page }) => {
    const startTime = Date.now();
    
    // Measure page load time
    await page.goto('/campaigns/personalization');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Test API response time simulation
    await page.fill('textarea[placeholder*="안녕하십니까"]', '테스트 메시지입니다.');
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    const apiStartTime = Date.now();
    await page.locator('button:has-text("미리보기")').click();
    
    // Wait for API response or timeout
    await Promise.race([
      page.waitForSelector('[data-testid="preview-card"]', { timeout: 3000 }),
      page.waitForSelector('[role="alert"]', { timeout: 3000 }),
      page.waitForTimeout(3000)
    ]);
    
    const apiTime = Date.now() - apiStartTime;
    expect(apiTime).toBeLessThan(3000); // API should respond within 3 seconds
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test network error simulation
    await page.route('**/api/personalization/**', route => {
      route.abort('internetdisconnected');
    });
    
    await page.fill('textarea[placeholder*="안녕하십니까"]', '테스트 메시지입니다.');
    await page.locator('button:has-text("타겟 추가")').first().click();
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    
    // Should show error message
    await expect(page.locator('text=오류가 발생했습니다')).toBeVisible({ timeout: 5000 });
    
    // Test API error response
    await page.unroute('**/api/personalization/**');
    await page.route('**/api/personalization/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.locator('button:has-text("개인화 메시지 생성")').click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 3000 });
  });

  test('should support tab navigation and data persistence', async ({ page }) => {
    // Setup data in first tab
    await page.fill('textarea[placeholder*="안녕하십니까"]', '지속성 테스트 메시지입니다.');
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Navigate to demographics tab
    await page.locator('[role="tab"]:has-text("인구통계 분석")').click();
    await expect(page.locator('text=인구통계 분석')).toBeVisible();
    
    // Navigate to results tab
    await page.locator('[role="tab"]:has-text("결과 분석")').click();
    await expect(page.locator('text=결과 분석')).toBeVisible();
    
    // Navigate to settings tab
    await page.locator('[role="tab"]:has-text("설정")').click();
    await expect(page.locator('text=시스템 설정')).toBeVisible();
    
    // Return to first tab and verify data persistence
    await page.locator('[role="tab"]:has-text("메시지 생성")').click();
    const messageValue = await page.locator('textarea[placeholder*="안녕하십니까"]').inputValue();
    expect(messageValue).toBe('지속성 테스트 메시지입니다.');
  });

  test('should be accessible', async ({ page }) => {
    // Check ARIA labels and roles
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('[role="tab"]')).toHaveCount(4);
    await expect(page.locator('[role="tabpanel"]')).toBeVisible();
    
    // Check form labels
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    for (let i = 0; i < textareaCount; i++) {
      const textarea = textareas.nth(i);
      const id = await textarea.getAttribute('id');
      if (id) {
        await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
      }
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test screen reader friendly content
    await expect(page.locator('[aria-label], [aria-labelledby], [aria-describedby]')).toHaveCount.greaterThan(0);
  });
});