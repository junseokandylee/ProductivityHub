import { test, expect } from '@playwright/test';
import { CampaignWizardPage } from './pages/campaign-wizard.page';
import { testCampaignData, testContactGroups } from './fixtures/test-data';

test.describe('Campaign Wizard E2E', () => {
  let campaignWizard: CampaignWizardPage;
  
  test.beforeEach(async ({ page }) => {
    campaignWizard = new CampaignWizardPage(page);
    
    // Setup MSW for API mocking
    await page.route('**/*', route => {
      // Let MSW handle API routes, pass through everything else
      if (route.request().url().includes('/api/')) {
        route.continue();
      } else {
        route.continue();
      }
    });
    
    // Start MSW service worker
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        (window as any).__MSW_ENABLED__ = true;
      }
    });
  });
  
  test('Happy Path: Complete campaign creation flow', async ({ page }) => {
    // Navigate to campaign wizard
    await campaignWizard.goto();
    await expect(page).toHaveTitle(/캠페인 마법사|Campaign Wizard/);
    
    // Step 1: Audience Selection
    await test.step('Select audience', async () => {
      await campaignWizard.expectCurrentStep(1);
      
      // Select a contact group
      await campaignWizard.selectContactGroup(testContactGroups[0].name);
      await campaignWizard.waitForAudienceEstimate();
      
      // Verify audience estimate is displayed
      await expect(campaignWizard.audienceEstimate).toContainText(testContactGroups[0].count.toString());
      
      // Proceed to next step
      await campaignWizard.goToNextStep();
    });
    
    // Step 2: Message Composition
    await test.step('Compose message with personalization', async () => {
      await campaignWizard.expectCurrentStep(2);
      
      // Fill in campaign details
      await campaignWizard.fillCampaignDetails(
        testCampaignData.name,
        testCampaignData.messageBody,
        testCampaignData.messageTitle
      );
      
      // Wait for preview to update
      await campaignWizard.waitForMessagePreview();
      
      // Verify message preview contains personalized content
      await expect(campaignWizard.previewPanel).toContainText('김유권');
      await expect(campaignWizard.previewPanel).toContainText('홍길동');
      
      // Check character counter
      await expect(campaignWizard.characterCounter).toBeVisible();
      
      // Proceed to next step
      await campaignWizard.goToNextStep();
    });
    
    // Step 3: Channel Configuration
    await test.step('Configure channel priority and fallback', async () => {
      await campaignWizard.expectCurrentStep(3);
      
      // Configure channels: SMS -> KAKAO with fallback enabled
      await campaignWizard.configureChannelPriority(['SMS', 'KAKAO'], true);
      
      // Verify channel configuration
      await expect(campaignWizard.channelPriorityList).toBeVisible();
      await expect(campaignWizard.fallbackToggle).toBeChecked();
      
      // Proceed to next step
      await campaignWizard.goToNextStep();
    });
    
    // Step 4: Review and Send
    await test.step('Review campaign and send', async () => {
      await campaignWizard.expectCurrentStep(4);
      
      // Wait for cost estimate to load
      await campaignWizard.waitForCostEstimate();
      
      // Verify campaign summary contains correct data
      await expect(campaignWizard.campaignSummary).toContainText(testCampaignData.name);
      await expect(campaignWizard.campaignSummary).toContainText('SMS → KAKAO');
      
      // Verify cost estimate is displayed
      await expect(campaignWizard.costEstimate).toContainText('264,000'); // From mock data
      
      // Confirm and send campaign
      await campaignWizard.confirmAndSend();
      
      // Handle confirmation modal
      await campaignWizard.confirmInModal();
      
      // Verify success
      await expect(page).toHaveURL(/\/campaigns$/); // Redirected to campaigns list
      
      // Check for success message
      const successToast = page.locator('.toast:has-text("캠페인 발송")');
      await expect(successToast).toBeVisible();
    });
  });
  
  test('Audience selection with include all contacts', async ({ page }) => {
    await campaignWizard.goto();
    
    // Step 1: Select "Include All"
    await campaignWizard.selectIncludeAll();
    
    // Verify that group/segment selections are disabled or hidden
    await expect(campaignWizard.groupCheckboxes.first()).not.toBeVisible();
    
    // Verify audience estimate shows large number
    await expect(campaignWizard.audienceEstimate).toContainText('50,000');
    
    await campaignWizard.goToNextStep();
    await campaignWizard.expectCurrentStep(2);
  });
  
  test('Message composition with token insertion', async ({ page }) => {
    await campaignWizard.goto();
    
    // Skip to step 2
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    // Fill basic details
    await campaignWizard.fillCampaignDetails('토큰 테스트', '안녕하세요 님!');
    
    // Insert name token
    await campaignWizard.messageBodyTextarea.click();
    await campaignWizard.messageBodyTextarea.fill('안녕하세요 ');
    
    // Simulate token insertion (would use actual token inserter in real test)
    await campaignWizard.messageBodyTextarea.fill('안녕하세요 {name}님!');
    
    // Verify preview updates
    await campaignWizard.waitForMessagePreview();
    await expect(campaignWizard.previewPanel).toContainText('김유권님!');
  });
  
  test('Channel priority reordering', async ({ page }) => {
    await campaignWizard.goto();
    
    // Navigate to step 3
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails('채널 테스트', '테스트 메시지');
    await campaignWizard.goToNextStep();
    
    // Test channel configuration
    await campaignWizard.configureChannelPriority(['SMS', 'KAKAO'], true);
    
    // Verify fallback is enabled
    await expect(campaignWizard.fallbackToggle).toBeChecked();
    
    // Verify channels are in correct order
    const firstChannel = page.locator('[data-testid="channel-item"]:first-child');
    await expect(firstChannel).toContainText('SMS');
  });
  
  test('Schedule campaign for later', async ({ page }) => {
    await campaignWizard.goto();
    
    // Complete wizard up to review step
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      '예약 테스트', 
      '예약된 캠페인입니다.'
    );
    await campaignWizard.goToNextStep();
    
    await campaignWizard.configureChannelPriority(['SMS'], false);
    await campaignWizard.goToNextStep();
    
    // Wait for cost estimate
    await campaignWizard.waitForCostEstimate();
    
    // Schedule for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    await campaignWizard.scheduleForLater(dateString, '14:00');
    
    // Verify schedule inputs are filled
    await expect(campaignWizard.scheduleDateInput).toHaveValue(dateString);
    await expect(campaignWizard.scheduleTimeInput).toHaveValue('14:00');
    
    // Verify send button text changes
    await expect(campaignWizard.sendButton).toContainText('Schedule');
  });
});