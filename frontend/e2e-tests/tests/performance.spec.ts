import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('tenant_id', 'perf-test-tenant');
    });
    
    await page.goto('/contacts');
  });

  test('Contact search performance validation', async ({ page }) => {
    // Setup: Import performance test dataset
    await test.step('Setup test dataset', async () => {
      // Create large dataset via API for performance testing
      const response = await page.request.post('/api/contacts/test-data/generate', {
        data: {
          count: 5000,
          duplicatePercentage: 15,
          tenantId: 'perf-test-tenant'
        }
      });
      
      expect(response.ok()).toBeTruthy();
    });

    // Test search performance across multiple scenarios
    await test.step('Measure search performance', async () => {
      const scenarios = [
        { term: '김', expectedType: 'Korean surname' },
        { term: '010', expectedType: 'Phone prefix' },
        { term: 'test@', expectedType: 'Email pattern' },
        { term: '서울', expectedType: 'Location' },
        { term: '', expectedType: 'Empty (all results)' }
      ];

      const measurements: Array<{ scenario: string; time: number; resultCount: number }> = [];

      for (const scenario of scenarios) {
        // Clear any existing search
        await page.getByTestId('search-input').clear();
        await page.waitForTimeout(100);

        // Measure search time
        const startTime = performance.now();
        
        await page.getByTestId('search-input').fill(scenario.term);
        
        // Wait for search to complete
        await expect(page.getByTestId('contact-list')).toBeVisible();
        await page.waitForFunction(() => {
          const loader = document.querySelector('[data-testid="search-loading"]');
          return !loader || loader.style.display === 'none';
        });

        const endTime = performance.now();
        const searchTime = endTime - startTime;

        // Get result count
        const resultCountText = await page.getByTestId('result-count').textContent();
        const resultCount = parseInt(resultCountText?.match(/\d+/)?.[0] || '0');

        measurements.push({
          scenario: `${scenario.expectedType} (${scenario.term})`,
          time: searchTime,
          resultCount
        });

        console.log(`Search "${scenario.term}": ${searchTime}ms, ${resultCount} results`);
      }

      // Calculate statistics
      const times = measurements.map(m => m.time);
      times.sort((a, b) => a - b);
      
      const p95Index = Math.ceil(0.95 * times.length) - 1;
      const p99Index = Math.ceil(0.99 * times.length) - 1;
      
      const stats = {
        min: Math.min(...times),
        max: Math.max(...times),
        avg: times.reduce((a, b) => a + b) / times.length,
        p95: times[p95Index],
        p99: times[p99Index]
      };

      console.log('Search Performance Statistics:');
      console.log(`- Min: ${stats.min}ms`);
      console.log(`- Max: ${stats.max}ms`);
      console.log(`- Average: ${stats.avg}ms`);
      console.log(`- P95: ${stats.p95}ms`);
      console.log(`- P99: ${stats.p99}ms`);

      // Performance assertions (allowing E2E overhead)
      expect(stats.p95).toBeLessThan(500); // 500ms for E2E (backend target: 150ms)
      expect(stats.p99).toBeLessThan(1000);
      expect(stats.avg).toBeLessThan(300);
    });
  });

  test('Bulk operations performance', async ({ page }) => {
    await test.step('Setup bulk test data', async () => {
      // Generate test data via API
      await page.request.post('/api/contacts/test-data/generate', {
        data: {
          count: 1000,
          duplicatePercentage: 0,
          tenantId: 'perf-test-tenant'
        }
      });
    });

    await test.step('Measure bulk tag operation', async () => {
      // Select all contacts
      await page.getByTestId('select-all-checkbox').check();
      
      // Verify selection count
      const selectionText = await page.getByTestId('selected-count').textContent();
      expect(selectionText).toContain('1000');

      // Measure bulk tag operation time
      const startTime = performance.now();
      
      await page.getByTestId('bulk-actions-button').click();
      await page.getByTestId('apply-tag-action').click();
      await page.getByTestId('existing-tag').first().click();
      await page.getByTestId('apply-tag-confirm').click();

      // Wait for operation completion
      await expect(page.getByTestId('bulk-success')).toBeVisible({ timeout: 60000 });
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;

      console.log(`Bulk tag operation (1000 contacts): ${operationTime}ms`);
      
      // Performance assertion - should complete within 30 seconds for 1000 contacts
      expect(operationTime).toBeLessThan(30000);
    });
  });

  test('Import performance validation', async ({ page }) => {
    await test.step('Large CSV import performance', async () => {
      // Generate large CSV content (10K records)
      let csvContent = 'Full Name,Phone,Email,Kakao ID,Notes\n';
      const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
      const givenNames = ['민수', '영희', '철수', '수연', '진우', '소영', '동현', '하나', '준호', '지은'];
      
      for (let i = 0; i < 10000; i++) {
        const surname = surnames[i % surnames.length];
        const givenName = givenNames[i % givenNames.length];
        csvContent += `${surname}${givenName}${i},010${String(i).padStart(8, '0')},user${i}@perf.com,user${i},성능 테스트 연락처 ${i}\n`;
      }

      // Measure import time
      const startTime = performance.now();

      // Upload file
      await page.getByTestId('import-button').click();
      
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      await file.setFiles({
        name: 'large-import-test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });

      // Wait for import completion
      await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 600000 }); // 10 minutes max
      
      const endTime = performance.now();
      const importTime = endTime - startTime;

      console.log(`Import performance (10K records): ${importTime}ms`);
      
      // Performance assertion - should complete within 10 minutes (PRD requirement)
      expect(importTime).toBeLessThan(600000); // 10 minutes
      
      // Verify import success message shows correct count
      await expect(page.getByTestId('import-success')).toContainText('10000');
    });
  });

  test('Export performance validation', async ({ page }) => {
    await test.step('Setup export test data', async () => {
      // Generate test data
      await page.request.post('/api/contacts/test-data/generate', {
        data: {
          count: 5000,
          duplicatePercentage: 0,
          tenantId: 'perf-test-tenant'
        }
      });
    });

    await test.step('Large dataset export performance', async () => {
      // Measure export preparation time
      const startTime = performance.now();

      await page.getByTestId('export-button').click();
      await page.getByTestId('export-format-csv').check();
      await page.getByTestId('start-export-button').click();

      // Wait for export to be ready
      const downloadLink = page.getByTestId('download-link');
      await expect(downloadLink).toBeVisible({ timeout: 120000 }); // 2 minutes max

      const endTime = performance.now();
      const exportTime = endTime - startTime;

      console.log(`Export performance (5K records): ${exportTime}ms`);
      
      // Performance assertion - should be ready within 2 minutes for 5K records
      expect(exportTime).toBeLessThan(120000);
    });
  });

  test('UI responsiveness under load', async ({ page }) => {
    await test.step('Setup heavy dataset', async () => {
      await page.request.post('/api/contacts/test-data/generate', {
        data: {
          count: 2000,
          duplicatePercentage: 20,
          tenantId: 'perf-test-tenant'
        }
      });
    });

    await test.step('Measure UI responsiveness', async () => {
      const interactions = [
        { action: 'search', selector: 'search-input', value: '김' },
        { action: 'filter', selector: 'filter-active', value: null },
        { action: 'sort', selector: 'sort-name', value: null },
        { action: 'pagination', selector: 'page-next', value: null }
      ];

      for (const interaction of interactions) {
        const startTime = performance.now();

        if (interaction.action === 'search') {
          await page.getByTestId(interaction.selector).fill(interaction.value!);
        } else {
          await page.getByTestId(interaction.selector).click();
        }

        // Wait for UI to update
        await page.waitForTimeout(100);
        await expect(page.getByTestId('contact-list')).toBeVisible();

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        console.log(`${interaction.action} response time: ${responseTime}ms`);
        
        // UI should remain responsive (< 100ms for interactions)
        expect(responseTime).toBeLessThan(500); // Allow E2E overhead
      }
    });
  });
});