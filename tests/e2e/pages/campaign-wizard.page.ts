import { Page, Locator, expect } from '@playwright/test';

export class CampaignWizardPage {
  readonly page: Page;
  
  // Navigation elements
  readonly stepIndicator: Locator;
  readonly nextButton: Locator;
  readonly previousButton: Locator;
  
  // Step 1: Audience Selection
  readonly includeAllCheckbox: Locator;
  readonly searchInput: Locator;
  readonly groupCheckboxes: Locator;
  readonly segmentCheckboxes: Locator;
  readonly audienceEstimate: Locator;
  
  // Step 2: Message Composition  
  readonly campaignNameInput: Locator;
  readonly messageTitleInput: Locator;
  readonly messageBodyTextarea: Locator;
  readonly tokenInserter: Locator;
  readonly characterCounter: Locator;
  readonly previewPanel: Locator;
  
  // Step 3: Channel Configuration
  readonly channelPriorityList: Locator;
  readonly fallbackToggle: Locator;
  readonly channelMoveUp: Locator;
  readonly channelMoveDown: Locator;
  
  // Step 4: Review and Send
  readonly campaignSummary: Locator;
  readonly costEstimate: Locator;
  readonly scheduleCheckbox: Locator;
  readonly scheduleDateInput: Locator;
  readonly scheduleTimeInput: Locator;
  readonly confirmCheckbox: Locator;
  readonly sendButton: Locator;
  readonly estimateButton: Locator;
  
  // Common elements
  readonly loadingSpinner: Locator;
  readonly errorAlert: Locator;
  readonly successAlert: Locator;
  readonly confirmationModal: Locator;
  readonly modalConfirmButton: Locator;
  readonly modalCancelButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Navigation
    this.stepIndicator = page.locator('[data-testid="step-indicator"]');
    this.nextButton = page.locator('button:has-text("다음")');
    this.previousButton = page.locator('button:has-text("이전")');
    
    // Step 1: Audience
    this.includeAllCheckbox = page.locator('#include-all');
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.groupCheckboxes = page.locator('[data-testid="contact-group"]');
    this.segmentCheckboxes = page.locator('[data-testid="contact-segment"]');
    this.audienceEstimate = page.locator('[data-testid="audience-estimate"]');
    
    // Step 2: Message
    this.campaignNameInput = page.locator('#campaign-name');
    this.messageTitleInput = page.locator('#message-title');
    this.messageBodyTextarea = page.locator('#message-body');
    this.tokenInserter = page.locator('[data-testid="token-inserter"]');
    this.characterCounter = page.locator('[data-testid="character-counter"]');
    this.previewPanel = page.locator('[data-testid="message-preview"]');
    
    // Step 3: Channels
    this.channelPriorityList = page.locator('[data-testid="channel-priority-list"]');
    this.fallbackToggle = page.locator('[data-testid="fallback-toggle"]');
    this.channelMoveUp = page.locator('button[data-testid="move-up"]');
    this.channelMoveDown = page.locator('button[data-testid="move-down"]');
    
    // Step 4: Review
    this.campaignSummary = page.locator('[data-testid="campaign-summary"]');
    this.costEstimate = page.locator('[data-testid="cost-estimate"]');
    this.scheduleCheckbox = page.locator('#schedule-enabled');
    this.scheduleDateInput = page.locator('#schedule-date');
    this.scheduleTimeInput = page.locator('#schedule-time');
    this.confirmCheckbox = page.locator('#confirm-send');
    this.sendButton = page.locator('button:has-text("캠페인 발송")');
    this.estimateButton = page.locator('button:has-text("추정")');
    
    // Common
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.errorAlert = page.locator('[role="alert"][data-variant="destructive"]');
    this.successAlert = page.locator('[role="alert"][data-variant="success"]');
    this.confirmationModal = page.locator('[role="dialog"]');
    this.modalConfirmButton = page.locator('[role="dialog"] button:has-text("캠페인 발송")');
    this.modalCancelButton = page.locator('[role="dialog"] button:has-text("취소")');
  }
  
  async goto() {
    await this.page.goto('/campaigns/new');
    await this.page.waitForLoadState('networkidle');
  }
  
  // Step 1: Audience Selection Actions
  async selectIncludeAll() {
    await this.includeAllCheckbox.check();
    await expect(this.includeAllCheckbox).toBeChecked();
  }
  
  async selectContactGroup(groupName: string) {
    const groupCheckbox = this.page.locator(`[data-testid="contact-group"]:has-text("${groupName}") input[type="checkbox"]`);
    await groupCheckbox.check();
    await expect(groupCheckbox).toBeChecked();
  }
  
  async selectContactSegment(segmentName: string) {
    const segmentCheckbox = this.page.locator(`[data-testid="contact-segment"]:has-text("${segmentName}") input[type="checkbox"]`);
    await segmentCheckbox.check();
    await expect(segmentCheckbox).toBeChecked();
  }
  
  async waitForAudienceEstimate() {
    await this.page.waitForSelector('[data-testid="audience-estimate"]', { state: 'visible' });
    await expect(this.audienceEstimate).toBeVisible();
  }
  
  // Step 2: Message Composition Actions
  async fillCampaignDetails(campaignName: string, messageBody: string, messageTitle?: string) {
    await this.campaignNameInput.fill(campaignName);
    
    if (messageTitle) {
      await this.messageTitleInput.fill(messageTitle);
    }
    
    await this.messageBodyTextarea.fill(messageBody);
    
    // Wait for preview to update
    await this.page.waitForTimeout(500);
  }
  
  async insertToken(token: string) {
    // Click token inserter and select token
    await this.tokenInserter.click();
    await this.page.locator(`button:has-text("{${token}}")`).click();
  }
  
  async waitForMessagePreview() {
    await expect(this.previewPanel).toBeVisible();
    await this.page.waitForSelector('[data-testid="message-preview"] .preview-content');
  }
  
  // Step 3: Channel Configuration Actions
  async configureChannelPriority(channels: string[], enableFallback: boolean = true) {
    // Wait for channel list to load
    await expect(this.channelPriorityList).toBeVisible();
    
    // Configure channel order - simplified for E2E test
    // In real implementation, this would involve drag-and-drop or up/down buttons
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const channelItem = this.page.locator(`[data-testid="channel-item"][data-channel="${channel}"]`);
      await expect(channelItem).toBeVisible();
    }
    
    // Enable fallback if requested
    if (enableFallback && channels.length > 1) {
      await this.fallbackToggle.check();
    }
  }
  
  // Step 4: Review and Send Actions
  async waitForCostEstimate() {
    await this.page.waitForSelector('[data-testid="cost-estimate"]', { state: 'visible' });
    await expect(this.costEstimate).toBeVisible();
  }
  
  async scheduleForLater(date: string, time: string) {
    await this.scheduleCheckbox.check();
    await this.scheduleDateInput.fill(date);
    await this.scheduleTimeInput.fill(time);
  }
  
  async confirmAndSend() {
    await this.confirmCheckbox.check();
    await expect(this.sendButton).toBeEnabled();
    await this.sendButton.click();
  }
  
  async confirmInModal() {
    await expect(this.confirmationModal).toBeVisible();
    await this.modalConfirmButton.click();
  }
  
  async cancelInModal() {
    await expect(this.confirmationModal).toBeVisible();
    await this.modalCancelButton.click();
  }
  
  // Navigation Actions
  async goToNextStep() {
    await expect(this.nextButton).toBeEnabled();
    await this.nextButton.click();
    await this.page.waitForLoadState('networkidle');
  }
  
  async goToPreviousStep() {
    await expect(this.previousButton).toBeEnabled();  
    await this.previousButton.click();
    await this.page.waitForLoadState('networkidle');
  }
  
  // Assertions
  async expectCurrentStep(stepNumber: number) {
    const activeStep = this.page.locator(`[data-testid="step-${stepNumber}"][data-active="true"]`);
    await expect(activeStep).toBeVisible();
  }
  
  async expectErrorMessage(message: string) {
    const errorElement = this.errorAlert.locator(`text="${message}"`);
    await expect(errorElement).toBeVisible();
  }
  
  async expectSuccessMessage(message: string) {
    const successElement = this.successAlert.locator(`text="${message}"`);
    await expect(successElement).toBeVisible();
  }
  
  async expectLoadingState(isLoading: boolean = true) {
    if (isLoading) {
      await expect(this.loadingSpinner).toBeVisible();
    } else {
      await expect(this.loadingSpinner).not.toBeVisible();
    }
  }
  
  async expectQuotaWarning() {
    const quotaWarning = this.page.locator('[data-testid="quota-warning"]');
    await expect(quotaWarning).toBeVisible();
    await expect(this.sendButton).toBeDisabled();
  }
}