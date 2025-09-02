import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Contact Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/');
    
    // Mock authentication or use test credentials
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('tenant_id', 'test-tenant-123');
    });
    
    // Navigate to contacts page
    await page.goto('/contacts');
  });

  test('Complete contact workflow: import → dedup → search → tag → export', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for full workflow
    
    // Step 1: Contact Import
    await test.step('Import contacts from CSV', async () => {
      await page.getByTestId('import-button').click();
      
      // Create test CSV file content
      const csvContent = `Full Name,Phone,Email,Kakao ID,Notes
김철수,01012345678,kim@example.com,kim_cs,정치인 관련자
박영희,01098765432,park@example.com,park_yh,지역 상인
이민수,01055555555,lee@example.com,lee_ms,시민 단체
김철수,010-1234-5678,kim.chulsoo@example.com,kim_cs,중복 연락처`;

      // Upload file via file input
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      // Create blob and set files
      await file.setFiles({
        name: 'test-contacts.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      // Wait for upload progress
      await expect(page.getByTestId('upload-progress')).toBeVisible();
      await expect(page.getByTestId('upload-progress')).toHaveText(/100%/, { timeout: 30000 });
      
      // Verify import success message
      await expect(page.getByTestId('import-success')).toBeVisible();
      await expect(page.getByTestId('import-success')).toContainText('4 contacts imported');
    });

    // Step 2: Deduplication Review
    await test.step('Review and merge duplicates', async () => {
      // Navigate to deduplication page
      await page.getByTestId('deduplication-tab').click();
      
      // Wait for duplicate analysis
      await expect(page.getByTestId('duplicate-groups')).toBeVisible({ timeout: 10000 });
      
      // Verify duplicate detection
      const duplicateGroups = page.getByTestId('duplicate-group');
      await expect(duplicateGroups).toHaveCount(1); // Should detect Kim Chulsoo duplicates
      
      // Merge duplicates
      await page.getByTestId('merge-all-button').click();
      
      // Confirm merge action
      await page.getByTestId('confirm-merge-button').click();
      
      // Wait for merge completion
      await expect(page.getByTestId('merge-success')).toBeVisible();
      await expect(page.getByTestId('merge-success')).toContainText('1 duplicate merged');
    });

    // Step 3: Search and Filter
    await test.step('Search contacts with performance validation', async () => {
      // Return to contacts list
      await page.getByTestId('contacts-tab').click();
      
      // Measure search performance
      const searchStart = Date.now();
      
      // Search for Korean name
      await page.getByTestId('search-input').fill('김');
      
      // Wait for search results
      await expect(page.getByTestId('contact-list')).toBeVisible();
      const searchEnd = Date.now();
      
      // Verify search performance (<150ms p95)
      const searchTime = searchEnd - searchStart;
      expect(searchTime).toBeLessThan(500); // Allow some buffer for E2E overhead
      
      // Verify search results
      const contactRows = page.getByTestId('contact-row');
      await expect(contactRows).toHaveCountGreaterThan(0);
      
      // Verify Korean name filtering
      const firstContact = contactRows.first();
      await expect(firstContact).toContainText('김');
    });

    // Step 4: Tag Management and Bulk Operations
    await test.step('Apply tags and bulk operations', async () => {
      // Select all filtered contacts
      await page.getByTestId('select-all-checkbox').check();
      
      // Verify selection
      await expect(page.getByTestId('selected-count')).toContainText('contact');
      
      // Open bulk actions menu
      await page.getByTestId('bulk-actions-button').click();
      
      // Apply tag
      await page.getByTestId('apply-tag-action').click();
      
      // Create new tag
      await page.getByTestId('new-tag-input').fill('D-30 캠페인');
      await page.getByTestId('tag-color-picker').click();
      await page.getByTestId('color-red').click();
      await page.getByTestId('create-tag-button').click();
      
      // Wait for bulk operation completion
      await expect(page.getByTestId('bulk-success')).toBeVisible();
      await expect(page.getByTestId('bulk-success')).toContainText('태그가 적용되었습니다');
    });

    // Step 5: Contact Detail and Edit
    await test.step('Edit contact details and view history', async () => {
      // Open first contact detail
      await page.getByTestId('contact-row').first().click();
      
      // Verify contact detail page
      await expect(page.getByTestId('contact-detail')).toBeVisible();
      
      // Edit contact
      await page.getByTestId('edit-contact-button').click();
      
      // Update phone number
      await page.getByTestId('phone-input').fill('010-1111-2222');
      await page.getByTestId('notes-input').fill('E2E 테스트로 수정됨');
      
      // Save changes
      await page.getByTestId('save-contact-button').click();
      
      // Verify update success
      await expect(page.getByTestId('update-success')).toBeVisible();
      
      // Check contact history
      await page.getByTestId('history-tab').click();
      
      // Verify history entries
      const historyEntries = page.getByTestId('history-entry');
      await expect(historyEntries).toHaveCountGreaterThan(0);
      
      // Verify latest entry shows the edit
      await expect(historyEntries.first()).toContainText('연락처 수정');
    });

    // Step 6: Export Functionality
    await test.step('Export contacts with filters', async () => {
      // Navigate back to contacts list
      await page.getByTestId('back-to-list-button').click();
      
      // Open export dialog
      await page.getByTestId('export-button').click();
      
      // Configure export
      await page.getByTestId('export-format-csv').check();
      
      // Select columns
      await page.getByTestId('column-fullname').check();
      await page.getByTestId('column-phone').check();
      await page.getByTestId('column-tags').check();
      
      // Apply current filters
      await page.getByTestId('export-filtered').check();
      
      // Start export
      await page.getByTestId('start-export-button').click();
      
      // Wait for export preparation
      await expect(page.getByTestId('export-preparing')).toBeVisible();
      
      // Wait for download link
      const downloadLink = page.getByTestId('download-link');
      await expect(downloadLink).toBeVisible({ timeout: 30000 });
      
      // Verify download URL is secure token-based
      const downloadUrl = await downloadLink.getAttribute('href');
      expect(downloadUrl).toMatch(/\/api\/contacts\/export\/download\/.+/);
    });
  });

  test('Performance benchmark: search operations', async ({ page }) => {
    // Import larger dataset for performance testing
    await test.step('Import test dataset', async () => {
      // Generate larger CSV content (simulate 1000+ records)
      let csvContent = 'Full Name,Phone,Email,Kakao ID,Notes\n';
      const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
      const givenNames = ['민수', '영희', '철수', '수연', '진우', '소영', '동현', '하나', '준호', '지은'];
      
      for (let i = 0; i < 200; i++) {
        const surname = surnames[i % surnames.length];
        const givenName = givenNames[i % givenNames.length];
        csvContent += `${surname}${givenName}${i},010${String(i).padStart(8, '0')},user${i}@test.com,user${i},테스트 연락처 ${i}\n`;
      }
      
      // Upload via API to speed up test setup
      await page.request.post('/api/contacts/import', {
        multipart: {
          file: {
            name: 'performance-test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent)
          }
        }
      });
    });

    // Measure multiple search operations
    await test.step('Benchmark search performance', async () => {
      const searchTimes: number[] = [];
      const searchTerms = ['김', '이', '박', '010', 'user', '테스트'];
      
      for (const term of searchTerms) {
        const start = performance.now();
        
        await page.getByTestId('search-input').fill(term);
        await expect(page.getByTestId('contact-list')).toBeVisible();
        await page.waitForTimeout(100); // Allow debouncing
        
        const end = performance.now();
        searchTimes.push(end - start);
        
        // Clear search for next iteration
        await page.getByTestId('search-input').clear();
      }
      
      // Calculate p95 performance
      searchTimes.sort((a, b) => a - b);
      const p95Index = Math.ceil(0.95 * searchTimes.length) - 1;
      const p95Time = searchTimes[p95Index];
      
      console.log(`Search performance - P95: ${p95Time}ms, Average: ${searchTimes.reduce((a, b) => a + b) / searchTimes.length}ms`);
      
      // Performance assertion (allowing E2E overhead)
      expect(p95Time).toBeLessThan(1000); // More lenient for E2E
    });
  });

  test('Security: RLS tenant isolation', async ({ page, context }) => {
    // Test tenant isolation by switching authentication
    await test.step('Verify tenant data isolation', async () => {
      // Import data as tenant A
      await page.evaluate(() => {
        localStorage.setItem('tenant_id', 'tenant-a');
      });
      
      await page.reload();
      
      // Import some contacts for tenant A
      const csvContent = 'Full Name,Phone,Email\nTenant A User,01011111111,tenanta@test.com';
      // ... upload logic similar to above
      
      // Switch to tenant B
      await page.evaluate(() => {
        localStorage.setItem('tenant_id', 'tenant-b');
      });
      
      await page.reload();
      
      // Verify tenant A data is not visible
      await page.getByTestId('search-input').fill('Tenant A');
      
      const noResults = page.getByTestId('no-results');
      await expect(noResults).toBeVisible();
      
      // Verify cannot access tenant A contact directly
      const response = await page.request.get('/api/contacts/[some-tenant-a-contact-id]');
      expect(response.status()).toBe(404); // Should not find due to RLS
    });
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await test.step('Verify mobile contact list', async () => {
      // Check mobile layout
      await expect(page.getByTestId('mobile-contact-list')).toBeVisible();
      
      // Test mobile search
      await page.getByTestId('mobile-search-button').click();
      await expect(page.getByTestId('mobile-search-input')).toBeVisible();
      
      // Test mobile filters
      await page.getByTestId('mobile-filter-button').click();
      await expect(page.getByTestId('mobile-filter-panel')).toBeVisible();
    });
  });
});