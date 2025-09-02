import { test, expect } from '@playwright/test';
import { CampaignWizardPage } from './pages/campaign-wizard.page';
import { testCampaignData, testContactGroups } from './fixtures/test-data';

test.describe('Campaign Wizard Error Scenarios', () => {
  let campaignWizard: CampaignWizardPage;
  
  test.beforeEach(async ({ page }) => {
    campaignWizard = new CampaignWizardPage(page);
  });
  
  test('Validation Error: Empty message content', async ({ page }) => {
    await campaignWizard.goto();
    
    // Complete audience selection
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    // Fill campaign name but leave message body empty
    await campaignWizard.campaignNameInput.fill('테스트 캠페인');
    await campaignWizard.messageBodyTextarea.fill(''); // Empty message
    
    // Try to proceed to next step
    await campaignWizard.goToNextStep();
    
    // Should remain on step 2 with validation error
    await campaignWizard.expectCurrentStep(2);
    await campaignWizard.expectErrorMessage('메시지 내용은 필수입니다');
  });
  
  test('Validation Error: No audience selected', async ({ page }) => {
    await campaignWizard.goto();
    
    // Try to proceed without selecting any audience
    await campaignWizard.goToNextStep();
    
    // Should remain on step 1 with validation error
    await campaignWizard.expectCurrentStep(1);
    await campaignWizard.expectErrorMessage('최소 하나의 대상을 선택해야 합니다');
  });
  
  test('Quota Exceeded: Cost estimation shows quota limit exceeded', async ({ page }) => {
    // Mock quota exceeded scenario
    await page.route('**/api/campaigns/estimate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipientCount: 50000,
          estimatedCost: 1100000,
          quotaOk: false
        })
      });
    });
    
    await campaignWizard.goto();
    
    // Complete wizard up to review step
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      '할당량 초과 테스트',
      '할당량을 초과하는 대용량 캠페인입니다.'
    );
    await campaignWizard.goToNextStep();
    
    await campaignWizard.configureChannelPriority(['SMS'], false);
    await campaignWizard.goToNextStep();
    
    // Wait for cost estimate to load
    await campaignWizard.waitForCostEstimate();
    
    // Verify quota exceeded warning
    await campaignWizard.expectQuotaWarning();
    await campaignWizard.expectErrorMessage('할당량 초과');
    
    // Verify send button is disabled
    await expect(campaignWizard.sendButton).toBeDisabled();
  });
  
  test('Server Error: Campaign creation fails with 500 error', async ({ page }) => {
    // Mock server error on campaign creation
    await page.route('**/api/campaigns', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'SERVER_ERROR',
            title: '서버 오류',
            detail: '일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            status: 500
          })
        });
      } else {
        route.continue();
      }
    });
    
    await campaignWizard.goto();
    
    // Complete entire wizard
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      testCampaignData.name,
      testCampaignData.messageBody
    );
    await campaignWizard.goToNextStep();
    
    await campaignWizard.configureChannelPriority(['SMS'], false);
    await campaignWizard.goToNextStep();
    
    // Wait for cost estimate and confirm send
    await campaignWizard.waitForCostEstimate();
    await campaignWizard.confirmAndSend();
    await campaignWizard.confirmInModal();
    
    // Should see error message and remain on review page
    await campaignWizard.expectCurrentStep(4);
    await campaignWizard.expectErrorMessage('일시적인 서버 오류가 발생했습니다');
    
    // Verify page doesn't redirect to campaigns list
    await expect(page).not.toHaveURL(/\/campaigns$/);
  });
  
  test('Network Error: API calls fail due to network issues', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/contacts/groups', route => {
      route.abort('failed');
    });
    
    await campaignWizard.goto();
    
    // Should show network error
    await campaignWizard.expectErrorMessage('네트워크 오류');
    
    // Retry should be available
    const retryButton = page.locator('button:has-text("다시 시도")');
    await expect(retryButton).toBeVisible();
  });
  
  test('Cost Estimation Error: Estimate fails but allows manual retry', async ({ page }) => {
    // Mock estimate API to fail first time, succeed on retry
    let estimateAttempts = 0;
    await page.route('**/api/campaigns/estimate', route => {
      estimateAttempts++;
      if (estimateAttempts === 1) {
        // First attempt fails
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '추정 서비스 일시 불가'
          })
        });
      } else {
        // Second attempt succeeds
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipientCount: 12000,
            estimatedCost: 264000,
            quotaOk: true
          })
        });
      }
    });
    
    await campaignWizard.goto();
    
    // Complete wizard to review step
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      '추정 재시도 테스트',
      '비용 추정 재시도 테스트입니다.'
    );
    await campaignWizard.goToNextStep();
    
    await campaignWizard.configureChannelPriority(['SMS'], false);
    await campaignWizard.goToNextStep();
    
    // First estimate should fail
    await campaignWizard.expectErrorMessage('추정 서비스 일시 불가');
    
    // Click retry/estimate button
    await campaignWizard.estimateButton.click();
    
    // Second attempt should succeed
    await campaignWizard.waitForCostEstimate();
    await expect(campaignWizard.costEstimate).toContainText('264,000');
  });
  
  test('Form Validation: Character limit exceeded', async ({ page }) => {
    await campaignWizard.goto();
    
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    // Fill with message exceeding character limit (simulate 2000+ chars)
    const longMessage = 'A'.repeat(2001);
    await campaignWizard.fillCampaignDetails('긴 메시지 테스트', longMessage);
    
    // Character counter should show warning
    await expect(campaignWizard.characterCounter).toContainText('2001');
    await expect(campaignWizard.characterCounter).toHaveClass(/text-red/); // Should have red color for error
    
    // Try to proceed
    await campaignWizard.goToNextStep();
    
    // Should remain on step 2 with validation error
    await campaignWizard.expectCurrentStep(2);
    await campaignWizard.expectErrorMessage('2000자를 초과할 수 없습니다');
  });
  
  test('Channel Configuration Error: No channels selected', async ({ page }) => {
    await campaignWizard.goto();
    
    // Complete audience and message steps
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      '채널 오류 테스트',
      '채널 없음 테스트'
    );
    await campaignWizard.goToNextStep();
    
    // Don't configure any channels, try to proceed
    await campaignWizard.goToNextStep();
    
    // Should remain on step 3 with validation error
    await campaignWizard.expectCurrentStep(3);
    await campaignWizard.expectErrorMessage('최소 하나의 채널을 선택해야 합니다');
  });
  
  test('Offline Detection: Shows offline state and retries when online', async ({ page }) => {
    await campaignWizard.goto();
    
    // Simulate going offline
    await page.context().setOffline(true);
    
    // Try to select audience (should fail)
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    
    // Should show offline warning
    const offlineWarning = page.locator('[data-testid="offline-warning"]');
    await expect(offlineWarning).toBeVisible();
    await expect(offlineWarning).toContainText('오프라인 상태');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should automatically retry and succeed
    await page.waitForTimeout(1000); // Give time for reconnection
    await campaignWizard.waitForAudienceEstimate();
  });
});