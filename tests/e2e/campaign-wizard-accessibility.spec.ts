import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations, configureAxe } from '@axe-core/playwright';
import { CampaignWizardPage } from './pages/campaign-wizard.page';
import { testContactGroups, testCampaignData } from './fixtures/test-data';

test.describe('Campaign Wizard Accessibility', () => {
  let campaignWizard: CampaignWizardPage;
  
  test.beforeEach(async ({ page }) => {
    campaignWizard = new CampaignWizardPage(page);
    
    // Inject axe-core for accessibility testing
    await injectAxe(page);
    
    // Configure axe-core with specific rules
    await configureAxe(page, {
      rules: {
        // Enable specific accessibility rules for forms and navigation
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'form-labels': { enabled: true },
        'heading-order': { enabled: true },
        'landmark-roles': { enabled: true }
      }
    });
  });
  
  test('Accessibility: Campaign wizard landing page', async ({ page }) => {
    await campaignWizard.goto();
    
    // Check accessibility of the initial page
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
    
    // Check specific accessibility concerns for the wizard
    await test.step('Verify keyboard navigation', async () => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Should be able to navigate to include-all checkbox
      await page.keyboard.press('Tab');
      await expect(campaignWizard.includeAllCheckbox).toBeFocused();
      
      // Continue tabbing through available elements
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
    
    await test.step('Verify ARIA labels and roles', async () => {
      // Check that form elements have proper labels
      await expect(campaignWizard.includeAllCheckbox).toHaveAttribute('aria-labelledby');
      
      // Check for proper heading hierarchy
      const mainHeading = page.locator('h2').first();
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toHaveAccessibleName();
      
      // Check for proper role attributes
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await expect(searchInput).toHaveAttribute('role', 'searchbox');
      }
    });
  });
  
  test('Accessibility: Audience selection step', async ({ page }) => {
    await campaignWizard.goto();
    
    await test.step('Check form controls accessibility', async () => {
      // Select a group to make checkboxes visible
      const firstGroupCheckbox = page.locator('[data-testid="contact-group"] input[type="checkbox"]').first();
      
      if (await firstGroupCheckbox.isVisible()) {
        // Check that checkboxes have proper labels
        await expect(firstGroupCheckbox).toHaveAttribute('id');
        
        const checkboxId = await firstGroupCheckbox.getAttribute('id');
        const associatedLabel = page.locator(`label[for="${checkboxId}"]`);
        await expect(associatedLabel).toBeVisible();
      }
    });
    
    // Run full accessibility check on this step
    await checkA11y(page, '[data-testid="audience-step"], main', {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
  
  test('Accessibility: Message composition step', async ({ page }) => {
    await campaignWizard.goto();
    
    // Navigate to message step
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await test.step('Check form accessibility', async () => {
      // Verify textarea has proper label
      await expect(campaignWizard.messageBodyTextarea).toHaveAttribute('id', 'message-body');
      const textareaLabel = page.locator('label[for="message-body"]');
      await expect(textareaLabel).toBeVisible();
      
      // Verify input fields have labels
      await expect(campaignWizard.campaignNameInput).toHaveAttribute('id', 'campaign-name');
      const nameLabel = page.locator('label[for="campaign-name"]');
      await expect(nameLabel).toBeVisible();
    });
    
    await test.step('Check keyboard accessibility', async () => {
      // Should be able to tab to and focus form elements
      await campaignWizard.campaignNameInput.focus();
      await expect(campaignWizard.campaignNameInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(campaignWizard.messageBodyTextarea).toBeFocused();
    });
    
    // Fill in form data for complete accessibility test
    await campaignWizard.fillCampaignDetails(
      testCampaignData.name,
      testCampaignData.messageBody
    );
    
    // Check accessibility after form is filled
    await checkA11y(page, '[data-testid="message-step"], main', {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
  
  test('Accessibility: Channel configuration step', async ({ page }) => {
    await campaignWizard.goto();
    
    // Navigate to channels step
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      testCampaignData.name,
      testCampaignData.messageBody
    );
    await campaignWizard.goToNextStep();
    
    await test.step('Check interactive elements accessibility', async () => {
      // Check fallback toggle accessibility
      if (await campaignWizard.fallbackToggle.isVisible()) {
        await expect(campaignWizard.fallbackToggle).toHaveAttribute('role', 'switch');
        await expect(campaignWizard.fallbackToggle).toHaveAttribute('aria-checked');
      }
      
      // Check channel list accessibility
      const channelItems = page.locator('[data-testid="channel-item"]');
      const firstItem = channelItems.first();
      
      if (await firstItem.isVisible()) {
        // Should have proper ARIA labels for screen readers
        await expect(firstItem).toHaveAttribute('aria-label');
      }
    });
    
    // Run accessibility check
    await checkA11y(page, '[data-testid="channel-step"], main', {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
  
  test('Accessibility: Review and send step', async ({ page }) => {
    await campaignWizard.goto();
    
    // Complete wizard to review step
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      testCampaignData.name,
      testCampaignData.messageBody
    );
    await campaignWizard.goToNextStep();
    
    await campaignWizard.configureChannelPriority(['SMS'], false);
    await campaignWizard.goToNextStep();
    
    // Wait for content to load
    await campaignWizard.waitForCostEstimate();
    
    await test.step('Check review section accessibility', async () => {
      // Verify summary sections have proper headings
      const summaryHeadings = page.locator('h3, h4').filter({ hasText: /요약|설정|비용/ });
      await expect(summaryHeadings.first()).toBeVisible();
      
      // Check confirmation checkboxes
      const confirmCheckbox = campaignWizard.confirmCheckbox;
      await expect(confirmCheckbox).toHaveAttribute('id', 'confirm-send');
      
      const confirmLabel = page.locator('label[for="confirm-send"]');
      await expect(confirmLabel).toBeVisible();
      
      // Check send button accessibility
      await expect(campaignWizard.sendButton).toHaveAccessibleName();
      await expect(campaignWizard.sendButton).toHaveAttribute('type', 'button');
    });
    
    await test.step('Check keyboard navigation on final step', async () => {
      // Should be able to navigate to confirm checkbox
      await campaignWizard.confirmCheckbox.focus();
      await expect(campaignWizard.confirmCheckbox).toBeFocused();
      
      // Tab to send button
      await page.keyboard.press('Tab');
      await expect(campaignWizard.sendButton).toBeFocused();
    });
    
    // Run comprehensive accessibility check
    await checkA11y(page, '[data-testid="review-step"], main', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      includedImpacts: ['critical', 'serious', 'moderate', 'minor']
    });
  });
  
  test('Accessibility: Modal dialogs', async ({ page }) => {
    await campaignWizard.goto();
    
    // Complete entire wizard to trigger confirmation modal
    await campaignWizard.selectContactGroup(testContactGroups[0].name);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.fillCampaignDetails(
      testCampaignData.name,
      testCampaignData.messageBody
    );
    await campaignWizard.goToNextStep();
    
    await campaignWizard.configureChannelPriority(['SMS'], false);
    await campaignWizard.goToNextStep();
    
    await campaignWizard.waitForCostEstimate();
    await campaignWizard.confirmAndSend();
    
    // Check modal accessibility
    await test.step('Verify modal dialog accessibility', async () => {
      await expect(campaignWizard.confirmationModal).toBeVisible();
      
      // Modal should have proper ARIA attributes
      await expect(campaignWizard.confirmationModal).toHaveAttribute('role', 'dialog');
      await expect(campaignWizard.confirmationModal).toHaveAttribute('aria-modal', 'true');
      
      // Should have accessible title
      const modalTitle = page.locator('[role="dialog"] h2, [role="dialog"] .modal-title');
      if (await modalTitle.isVisible()) {
        await expect(modalTitle).toHaveAccessibleName();
      }
      
      // Focus should be trapped within modal
      await campaignWizard.modalConfirmButton.focus();
      await expect(campaignWizard.modalConfirmButton).toBeFocused();
      
      // Tab navigation should stay within modal
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      const isWithinModal = await focusedElement.locator('..').locator('[role="dialog"]').count() > 0;
      expect(isWithinModal).toBeTruthy();
    });
    
    // Check accessibility of modal content
    await checkA11y(page, '[role="dialog"]', {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
  
  test('Accessibility: Error states and alerts', async ({ page }) => {
    await campaignWizard.goto();
    
    // Trigger validation error by trying to proceed without audience selection
    await campaignWizard.goToNextStep();
    
    await test.step('Check error message accessibility', async () => {
      // Error messages should have proper ARIA attributes
      const errorAlert = page.locator('[role="alert"]').first();
      
      if (await errorAlert.isVisible()) {
        await expect(errorAlert).toHaveAttribute('role', 'alert');
        
        // Error should be announced to screen readers
        const errorText = await errorAlert.textContent();
        expect(errorText).toBeTruthy();
        expect(errorText?.length).toBeGreaterThan(0);
      }
    });
    
    // Check color contrast of error messages
    await checkA11y(page, '[role="alert"], .error-message', {
      rules: {
        'color-contrast': { enabled: true }
      },
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });
  
  test('Accessibility: Color contrast and visual elements', async ({ page }) => {
    await campaignWizard.goto();
    
    // Check overall color contrast across the application
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
        'color-contrast-enhanced': { enabled: true }
      },
      detailedReport: true,
      detailedReportOptions: { html: true },
      includedImpacts: ['critical', 'serious']
    });
    
    // Get any violations and log them for debugging
    const violations = await getViolations(page);
    if (violations.length > 0) {
      console.log('Accessibility violations found:', violations);
      
      // Report critical violations
      const criticalViolations = violations.filter(v => v.impact === 'critical');
      if (criticalViolations.length > 0) {
        console.error('Critical accessibility violations:', criticalViolations);
      }
    }
  });
});