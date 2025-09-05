import { test, expect } from '@playwright/test';

test.describe('Korean Language Processing Service', () => {
  test.beforeEach(async ({ page }) => {
    // Set up Korean language processing API mocks
    await page.route('**/api/korean-language/**', route => {
      const url = route.request().url();
      
      if (url.includes('/dialect-convert')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            originalText: '안녕하십니까? 좋은 하루 되세요.',
            convertedText: '안녕하시요? 좋은 하루 되이소.',
            sourceDialect: '서울말',
            targetDialect: '부산말',
            confidence: 0.95,
            culturalMarkers: ['경상도 억양', '~이소 어미']
          })
        });
      } else if (url.includes('/analyze-honorifics')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            text: '안녕하십니까? 도움이 필요하시면 언제든지 말씀해 주세요.',
            honorificLevel: 'high',
            appropriateContext: ['공식 회의', '선거 연설', '어르신 대상'],
            suggestions: ['더욱 정중한 표현 가능', '상황에 적합한 높임말 사용'],
            confidence: 0.92
          })
        });
      } else if (url.includes('/validate-political-terms')) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            text: '공약을 이행하겠습니다. 민생 경제를 살리겠습니다.',
            validTerms: ['공약', '이행', '민생 경제'],
            invalidTerms: [],
            suggestions: ['구체적인 공약 내용 추가', '실현 가능한 계획 제시'],
            complianceScore: 0.88,
            risks: []
          })
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, data: {} })
        });
      }
    });
  });

  test('should accurately convert Korean dialects', async ({ page }) => {
    // Test dialect conversion through personalization page
    await page.goto('/campaigns/personalization');
    await page.waitForLoadState('networkidle');
    
    // Input standard Korean message
    const originalMessage = '안녕하십니까? 여러분의 더 나은 삶을 위해 최선을 다하겠습니다.';
    await page.fill('textarea[placeholder*="안녕하십니까"]', originalMessage);
    
    // Add target demographic from different regions
    await page.locator('button:has-text("타겟 추가")').first().click();
    
    // Select Busan region (should trigger dialect conversion)
    const regionSelect = page.locator('select').filter({ hasText: /지역|region/ }).first();
    if (await regionSelect.isVisible()) {
      await regionSelect.selectOption('26'); // Busan
    }
    
    // Generate preview to test dialect conversion
    await page.locator('button:has-text("미리보기")').click();
    await page.waitForTimeout(2000);
    
    // Verify dialect conversion results
    const previewCard = page.locator('[data-testid="preview-card"]');
    if (await previewCard.isVisible()) {
      await expect(page.locator('.badge:has-text("부산말")')).toBeVisible();
      
      // Check if converted text shows dialect characteristics
      const convertedText = page.locator('[data-testid="converted-message"]');
      if (await convertedText.isVisible()) {
        const text = await convertedText.textContent();
        // Should contain Busan dialect markers
        expect(text).toMatch(/노|까|이가|예/);
      }
    }
  });

  test('should validate honorific levels appropriately', async ({ page }) => {
    // Direct API test for honorific analysis
    const response = await page.request.post('/api/korean-language/analyze-honorifics', {
      data: {
        text: '안녕하십니까? 도움이 필요하시면 언제든지 말씀해 주세요.',
        context: 'political_speech',
        targetAudience: 'general_public'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.honorificLevel).toBe('high');
    expect(data.confidence).toBeGreaterThan(0.8);
    
    // Test with inappropriate honorific level
    const casualResponse = await page.request.post('/api/korean-language/analyze-honorifics', {
      data: {
        text: '안녕? 뭐 필요한 거 있어?',
        context: 'political_speech',
        targetAudience: 'elderly'
      }
    });
    
    expect(casualResponse.status()).toBe(200);
    const casualData = await casualResponse.json();
    expect(casualData.honorificLevel).toBe('low');
    expect(casualData.suggestions).toContain('더 정중한 표현 필요');
  });

  test('should process regional dialect characteristics correctly', async ({ page }) => {
    const dialectTests = [
      {
        region: '경상도',
        input: '안녕하세요. 잘 부탁드립니다.',
        expectedMarkers: ['~노', '~카노', '억센 억양']
      },
      {
        region: '전라도', 
        input: '반갑습니다. 함께 해요.',
        expectedMarkers: ['~것이', '~잉', '부드러운 억양']
      },
      {
        region: '충청도',
        input: '좋습니다. 천천히 가봅시다.',
        expectedMarkers: ['~여', '~구만', '느린 말투']
      },
      {
        region: '제주도',
        input: '좋네요. 같이 해봅시다.',
        expectedMarkers: ['~수다', '~쿠과', '독특한 어휘']
      }
    ];
    
    for (const dialectTest of dialectTests) {
      const response = await page.request.post('/api/korean-language/dialect-convert', {
        data: {
          text: dialectTest.input,
          sourceDialect: '서울말',
          targetDialect: dialectTest.region,
          culturalContext: 'political_campaign'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.targetDialect).toBe(dialectTest.region);
      expect(data.confidence).toBeGreaterThan(0.7);
      
      // Verify cultural markers are present
      const hasExpectedMarkers = dialectTest.expectedMarkers.some(marker =>
        data.culturalMarkers.some(cm => cm.includes(marker.replace(/~/g, '')))
      );
      expect(hasExpectedMarkers).toBe(true);
    }
  });

  test('should validate political terminology compliance', async ({ page }) => {
    const politicalTests = [
      {
        text: '공약을 성실히 이행하겠습니다. 민생을 살리겠습니다.',
        expectedValid: true,
        expectedTerms: ['공약', '이행', '민생']
      },
      {
        text: '상대 후보는 거짓말쟁이입니다. 빨갱이 같은 정책입니다.',
        expectedValid: false,
        expectedInvalid: ['거짓말쟁이', '빨갱이']
      },
      {
        text: '세금을 낮추고 복지를 늘리겠습니다.',
        expectedValid: true,
        expectedTerms: ['세금', '복지']
      }
    ];
    
    for (const test of politicalTests) {
      const response = await page.request.post('/api/korean-language/validate-political-terms', {
        data: {
          text: test.text,
          context: 'election_campaign',
          strictMode: true
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      if (test.expectedValid) {
        expect(data.complianceScore).toBeGreaterThan(0.7);
        expect(data.risks).toHaveLength(0);
        
        // Check if valid terms are identified
        for (const term of test.expectedTerms) {
          expect(data.validTerms).toContain(term);
        }
      } else {
        expect(data.complianceScore).toBeLessThan(0.6);
        expect(data.risks.length).toBeGreaterThan(0);
        
        // Check if invalid terms are flagged
        for (const invalidTerm of test.expectedInvalid) {
          expect(data.invalidTerms).toContain(invalidTerm);
        }
      }
    }
  });

  test('should detect and handle cultural sensitivity', async ({ page }) => {
    const culturalTests = [
      {
        text: '어르신들을 위한 정책을 마련하겠습니다.',
        context: 'addressing_elderly',
        expectedSensitivity: 'high',
        expectedMarkers: ['존댓말', '어르신 호칭']
      },
      {
        text: '젊은이들아, 함께 바꿔보자!',
        context: 'addressing_youth', 
        expectedSensitivity: 'medium',
        expectedMarkers: ['친근한 호칭', '동등한 어조']
      },
      {
        text: '전통적인 가치를 소중히 여기겠습니다.',
        context: 'cultural_values',
        expectedSensitivity: 'high',
        expectedMarkers: ['전통 가치 존중']
      }
    ];
    
    for (const test of culturalTests) {
      const response = await page.request.post('/api/korean-language/analyze-cultural-sensitivity', {
        data: {
          text: test.text,
          context: test.context,
          demographicProfile: {
            ageGroup: test.context.includes('elderly') ? '60plus' : '30s',
            region: '서울',
            culturalBackground: 'traditional'
          }
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.sensitivityLevel).toBe(test.expectedSensitivity);
      expect(data.confidence).toBeGreaterThan(0.8);
      
      // Verify cultural markers are detected
      const hasCulturalMarkers = test.expectedMarkers.some(marker =>
        data.culturalMarkers.some(cm => cm.includes(marker))
      );
      expect(hasCulturalMarkers).toBe(true);
    }
  });

  test('should perform language processing within performance thresholds', async ({ page }) => {
    const performanceTests = [
      { endpoint: '/api/korean-language/dialect-convert', expectedTime: 500 },
      { endpoint: '/api/korean-language/analyze-honorifics', expectedTime: 200 },
      { endpoint: '/api/korean-language/validate-political-terms', expectedTime: 300 },
      { endpoint: '/api/korean-language/analyze-cultural-sensitivity', expectedTime: 400 }
    ];
    
    for (const test of performanceTests) {
      const startTime = Date.now();
      
      const response = await page.request.post(test.endpoint, {
        data: {
          text: '안녕하십니까? 여러분을 위한 정책을 제안드립니다.',
          context: 'political_speech',
          options: { fastMode: false }
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(test.expectedTime);
      
      const data = await response.json();
      expect(data).toHaveProperty('confidence');
      expect(data.confidence).toBeGreaterThan(0.7);
    }
  });

  test('should handle edge cases and error conditions', async ({ page }) => {
    // Test empty text
    let response = await page.request.post('/api/korean-language/dialect-convert', {
      data: { text: '', sourceDialect: '서울말', targetDialect: '부산말' }
    });
    expect(response.status()).toBe(400);
    
    // Test unsupported dialect
    response = await page.request.post('/api/korean-language/dialect-convert', {
      data: {
        text: '안녕하세요',
        sourceDialect: '서울말',
        targetDialect: 'unsupported_dialect'
      }
    });
    expect(response.status()).toBe(400);
    
    // Test extremely long text
    const longText = '안녕하세요. '.repeat(1000); // 5000+ characters
    response = await page.request.post('/api/korean-language/analyze-honorifics', {
      data: { text: longText, context: 'political_speech' }
    });
    expect([200, 413]).toContain(response.status()); // OK or Payload Too Large
    
    // Test non-Korean text
    response = await page.request.post('/api/korean-language/dialect-convert', {
      data: {
        text: 'Hello, this is English text only.',
        sourceDialect: '서울말',
        targetDialect: '부산말'
      }
    });
    expect(response.status()).toBe(400);
    
    // Test mixed language text
    response = await page.request.post('/api/korean-language/validate-political-terms', {
      data: {
        text: '안녕하세요 Hello 여러분 World',
        context: 'political_speech'
      }
    });
    expect(response.status()).toBe(200); // Should handle gracefully
    const data = await response.json();
    expect(data.warnings).toContain('mixed_language_detected');
  });

  test('should integrate with compliance monitoring', async ({ page }) => {
    // Test language processing integration with compliance
    await page.goto('/compliance?tab=rules');
    await page.waitForLoadState('networkidle');
    
    // Simulate adding a new Korean compliance rule
    const addRuleButton = page.locator('button:has-text("규칙 추가"), button:has-text("Add Rule")');
    if (await addRuleButton.isVisible()) {
      await addRuleButton.click();
      
      // Input rule text in Korean
      const ruleInput = page.locator('textarea, input[type="text"]').last();
      if (await ruleInput.isVisible()) {
        await ruleInput.fill('선거 기간 중 인터넷 광고는 제한됩니다.');
        
        // Should trigger Korean language validation
        await page.waitForTimeout(1000);
        
        // Check if language processing results are displayed
        const validationResults = page.locator('[data-testid="language-validation"]');
        if (await validationResults.isVisible()) {
          await expect(validationResults).toContainText(/검증|확인|분석/);
        }
      }
    }
  });

  test('should support batch processing for multiple texts', async ({ page }) => {
    const batchTexts = [
      '첫 번째 메시지입니다.',
      '두 번째 정책 제안입니다.', 
      '세 번째 공약 사항입니다.',
      '네 번째 인사말입니다.'
    ];
    
    const response = await page.request.post('/api/korean-language/batch-process', {
      data: {
        texts: batchTexts,
        operations: ['dialect-convert', 'analyze-honorifics', 'validate-political-terms'],
        sourceDialect: '서울말',
        targetDialect: '경상도',
        context: 'political_campaign'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.results).toHaveLength(batchTexts.length);
    
    for (let i = 0; i < batchTexts.length; i++) {
      const result = data.results[i];
      expect(result).toHaveProperty('originalText', batchTexts[i]);
      expect(result).toHaveProperty('dialectConversion');
      expect(result).toHaveProperty('honorificAnalysis');
      expect(result).toHaveProperty('politicalTermValidation');
      expect(result.confidence).toBeGreaterThan(0.7);
    }
    
    // Verify processing time is reasonable for batch
    expect(data.processingTimeMs).toBeLessThan(3000); // Should complete within 3 seconds
  });

  test('should maintain context across multiple operations', async ({ page }) => {
    // Test session-based context maintenance
    const sessionId = 'test-session-' + Date.now();
    
    // First operation - establish context
    let response = await page.request.post('/api/korean-language/analyze-honorifics', {
      data: {
        text: '안녕하십니까? 시민 여러분.',
        context: 'political_speech',
        sessionId: sessionId,
        demographicContext: {
          targetAge: '50plus',
          region: '서울',
          occasion: 'formal_speech'
        }
      }
    });
    
    expect(response.status()).toBe(200);
    let data = await response.json();
    expect(data.sessionId).toBe(sessionId);
    
    // Second operation - should use established context
    response = await page.request.post('/api/korean-language/dialect-convert', {
      data: {
        text: '감사합니다. 열심히 일하겠습니다.',
        sessionId: sessionId,
        targetDialect: '부산말'
        // Should inherit previous context
      }
    });
    
    expect(response.status()).toBe(200);
    data = await response.json();
    expect(data.sessionId).toBe(sessionId);
    expect(data.inheritedContext).toBe(true);
    expect(data.targetDialect).toBe('부산말');
    
    // Verify context consistency
    expect(data.contextualAdaptation).toBe(true);
    expect(data.formalityLevel).toBe('high'); // Should maintain formality from first operation
  });

  test('should provide accurate confidence scores', async ({ page }) => {
    const confidenceTests = [
      {
        text: '안녕하십니까? 저는 여러분의 대표가 되겠습니다.', // Clear, formal Korean
        expectedConfidence: 0.95,
        operation: 'analyze-honorifics'
      },
      {
        text: '뭐하노? 같이 가자.', // Clear dialect
        expectedConfidence: 0.90,
        operation: 'dialect-convert'
      },
      {
        text: 'ㅋㅋ 안녕ㅎㅎ 잘부탁 ㅇㅇ', // Internet slang, unclear
        expectedConfidence: 0.30,
        operation: 'validate-political-terms'
      },
      {
        text: '경제성장과 사회복지의 균형잡힌 발전을 추구합니다.', // Professional political terms
        expectedConfidence: 0.95,
        operation: 'validate-political-terms'
      }
    ];
    
    for (const test of confidenceTests) {
      const response = await page.request.post(`/api/korean-language/${test.operation}`, {
        data: {
          text: test.text,
          context: 'political_campaign'
        }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      
      // Allow 10% variance in confidence scores
      const confidenceDiff = Math.abs(data.confidence - test.expectedConfidence);
      expect(confidenceDiff).toBeLessThan(0.1);
      
      // High confidence should have fewer warnings
      if (data.confidence > 0.8) {
        expect(data.warnings?.length || 0).toBeLessThan(2);
      }
      
      // Low confidence should provide specific improvement suggestions
      if (data.confidence < 0.5) {
        expect(data.suggestions?.length || 0).toBeGreaterThan(0);
      }
    }
  });
});