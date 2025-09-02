import { test, expect } from '@playwright/test';

test.describe('Security Testing', () => {
  test('RLS tenant isolation verification', async ({ page, context }) => {
    // Test tenant A
    await test.step('Setup Tenant A data', async () => {
      await page.goto('/');
      
      // Authenticate as Tenant A
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'tenant-a-token');
        localStorage.setItem('tenant_id', 'tenant-a-123');
        localStorage.setItem('user_id', 'user-a-456');
      });
      
      await page.goto('/contacts');
      
      // Import data for Tenant A
      const csvContent = `Full Name,Phone,Email,Kakao ID,Notes
김민수A,01011111111,kima@tenant-a.com,kim_a,Tenant A 연락처
박영희A,01022222222,parka@tenant-a.com,park_a,Tenant A 연락처
이철수A,01033333333,leea@tenant-a.com,lee_a,Tenant A 연락처`;

      await page.getByTestId('import-button').click();
      
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      await file.setFiles({
        name: 'tenant-a-contacts.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent)
      });
      
      await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 });
      
      // Store Tenant A contact IDs for later testing
      const contactElements = await page.getByTestId('contact-row').all();
      const tenantAContactIds = [];
      
      for (const element of contactElements) {
        const contactId = await element.getAttribute('data-contact-id');
        if (contactId) {
          tenantAContactIds.push(contactId);
        }
      }
      
      // Store in sessionStorage for cross-test access
      await page.evaluate((ids) => {
        sessionStorage.setItem('tenant-a-contact-ids', JSON.stringify(ids));
      }, tenantAContactIds);
    });

    // Test tenant B isolation
    await test.step('Verify Tenant B cannot access Tenant A data', async () => {
      // Switch to new context/session for Tenant B
      const tenantBPage = await context.newPage();
      await tenantBPage.goto('/');
      
      // Authenticate as Tenant B
      await tenantBPage.evaluate(() => {
        localStorage.setItem('auth_token', 'tenant-b-token');
        localStorage.setItem('tenant_id', 'tenant-b-456');
        localStorage.setItem('user_id', 'user-b-789');
      });
      
      await tenantBPage.goto('/contacts');
      
      // Verify Tenant B sees no contacts initially
      await expect(tenantBPage.getByTestId('empty-state')).toBeVisible();
      
      // Try to search for Tenant A data
      await tenantBPage.getByTestId('search-input').fill('김민수A');
      await expect(tenantBPage.getByTestId('no-results')).toBeVisible();
      
      // Try to search by phone number
      await tenantBPage.getByTestId('search-input').fill('01011111111');
      await expect(tenantBPage.getByTestId('no-results')).toBeVisible();
      
      // Import different data for Tenant B
      const tenantBCsvContent = `Full Name,Phone,Email,Kakao ID,Notes
김민수B,01044444444,kimb@tenant-b.com,kim_b,Tenant B 연락처
박영희B,01055555555,parkb@tenant-b.com,park_b,Tenant B 연락처`;

      await tenantBPage.getByTestId('import-button').click();
      
      const fileChooser = tenantBPage.waitForEvent('filechooser');
      await tenantBPage.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      await file.setFiles({
        name: 'tenant-b-contacts.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(tenantBCsvContent)
      });
      
      await expect(tenantBPage.getByTestId('import-success')).toBeVisible();
      
      // Verify Tenant B only sees their own data
      const contactCount = await tenantBPage.getByTestId('contact-row').count();
      expect(contactCount).toBe(2); // Only Tenant B's contacts
      
      // Verify search works for Tenant B's own data
      await tenantBPage.getByTestId('search-input').clear();
      await tenantBPage.getByTestId('search-input').fill('김민수B');
      
      const searchResults = tenantBPage.getByTestId('contact-row');
      await expect(searchResults).toHaveCount(1);
      await expect(searchResults.first()).toContainText('김민수B');
      
      await tenantBPage.close();
    });

    // Test direct API access isolation
    await test.step('Verify API-level tenant isolation', async () => {
      // Get Tenant A contact IDs from previous step
      const tenantAContactIds = await page.evaluate(() => {
        const stored = sessionStorage.getItem('tenant-a-contact-ids');
        return stored ? JSON.parse(stored) : [];
      });
      
      if (tenantAContactIds.length > 0) {
        const testContactId = tenantAContactIds[0];
        
        // Try to access Tenant A contact with Tenant B credentials
        await page.evaluate(() => {
          localStorage.setItem('auth_token', 'tenant-b-token');
          localStorage.setItem('tenant_id', 'tenant-b-456');
        });
        
        // Direct API call should fail due to RLS
        const response = await page.request.get(`/api/contacts/${testContactId}`, {
          headers: {
            'Authorization': 'Bearer tenant-b-token',
            'X-Tenant-Id': 'tenant-b-456'
          }
        });
        
        // Should return 404 or 403 due to RLS
        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(response.status()).toBeLessThan(500);
      }
    });

    // Test export isolation
    await test.step('Verify export tenant isolation', async () => {
      // Switch back to Tenant A
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'tenant-a-token');
        localStorage.setItem('tenant_id', 'tenant-a-123');
      });
      
      await page.reload();
      
      // Export Tenant A data
      await page.getByTestId('export-button').click();
      await page.getByTestId('export-format-csv').check();
      await page.getByTestId('start-export-button').click();
      
      const downloadLink = page.getByTestId('download-link');
      await expect(downloadLink).toBeVisible({ timeout: 30000 });
      
      const exportUrl = await downloadLink.getAttribute('href');
      expect(exportUrl).toBeTruthy();
      
      // Try to access export with Tenant B credentials
      const exportResponse = await page.request.get(exportUrl!, {
        headers: {
          'Authorization': 'Bearer tenant-b-token',
          'X-Tenant-Id': 'tenant-b-456'
        }
      });
      
      // Should fail due to token validation
      expect(exportResponse.status()).toBe(401);
    });
  });

  test('Authentication and authorization verification', async ({ page, context }) => {
    await test.step('Verify unauthenticated access is blocked', async () => {
      // Clear any existing authentication
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access contacts page without authentication
      await page.goto('/contacts');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login|\/auth/);
    });

    await test.step('Verify role-based access control', async () => {
      // Test with Staff role (limited permissions)
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'staff-token');
        localStorage.setItem('tenant_id', 'test-tenant');
        localStorage.setItem('user_role', 'Staff');
      });
      
      await page.goto('/contacts');
      
      // Staff should not see admin functions
      await expect(page.getByTestId('bulk-delete-action')).not.toBeVisible();
      await expect(page.getByTestId('user-management-link')).not.toBeVisible();
      
      // Test with Admin role (full permissions)
      await page.evaluate(() => {
        localStorage.setItem('user_role', 'Admin');
      });
      
      await page.reload();
      
      // Admin should see all functions
      await expect(page.getByTestId('import-button')).toBeVisible();
      await expect(page.getByTestId('export-button')).toBeVisible();
    });
  });

  test('Data encryption and PII protection', async ({ page }) => {
    await test.step('Verify PII data is encrypted in transit', async () => {
      await page.goto('/');
      
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'test-token');
        localStorage.setItem('tenant_id', 'security-test-tenant');
      });
      
      await page.goto('/contacts');
      
      // Import sensitive data
      const sensitiveData = `Full Name,Phone,Email,Kakao ID,Notes
홍길동,01012345678,hong@sensitive.com,hong_gd,중요 인물 연락처
김보안,01098765432,kim@secret.gov,kim_security,정부 관계자`;

      await page.getByTestId('import-button').click();
      
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      await file.setFiles({
        name: 'sensitive-contacts.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(sensitiveData)
      });
      
      // Monitor network requests to ensure data is encrypted
      page.on('response', async (response) => {
        if (response.url().includes('/api/contacts') && response.request().method() === 'POST') {
          const responseBody = await response.text().catch(() => '');
          
          // Response should not contain plain PII data
          expect(responseBody).not.toContain('01012345678');
          expect(responseBody).not.toContain('hong@sensitive.com');
        }
      });
      
      await expect(page.getByTestId('import-success')).toBeVisible();
    });

    await test.step('Verify export token security', async () => {
      await page.getByTestId('export-button').click();
      await page.getByTestId('export-format-csv').check();
      await page.getByTestId('start-export-button').click();
      
      const downloadLink = page.getByTestId('download-link');
      await expect(downloadLink).toBeVisible({ timeout: 30000 });
      
      const exportUrl = await downloadLink.getAttribute('href');
      expect(exportUrl).toBeTruthy();
      
      // Verify token is base64 encoded and not plain text
      const tokenMatch = exportUrl!.match(/\/download\/(.+)$/);
      expect(tokenMatch).toBeTruthy();
      
      const token = tokenMatch![1];
      expect(token).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
      expect(token.length).toBeGreaterThan(20); // Substantial token length
      
      // Wait some time and verify token expires
      await page.waitForTimeout(2000);
      
      // Try to access expired token (if expiration is short for testing)
      // This would need backend configuration for short expiry in test environment
    });
  });

  test('Cross-site scripting (XSS) protection', async ({ page }) => {
    await test.step('Verify XSS protection in contact data', async () => {
      await page.goto('/');
      
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'test-token');
        localStorage.setItem('tenant_id', 'xss-test-tenant');
      });
      
      await page.goto('/contacts');
      
      // Try to inject XSS through contact data
      const xssAttempts = `Full Name,Phone,Email,Notes
<script>alert('XSS')</script>,01012345678,test@xss.com,<img src=x onerror=alert('XSS')>
&lt;script&gt;alert('XSS')&lt;/script&gt;,01087654321,test2@xss.com,Normal notes`;

      await page.getByTestId('import-button').click();
      
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      await file.setFiles({
        name: 'xss-test-contacts.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(xssAttempts)
      });
      
      await expect(page.getByTestId('import-success')).toBeVisible();
      
      // Verify XSS attempts are properly escaped
      const contactRows = page.getByTestId('contact-row');
      const firstRowText = await contactRows.first().textContent();
      
      // Should show escaped content, not execute script
      expect(firstRowText).toContain('<script>');
      expect(firstRowText).not.toContain('XSS');
      
      // Verify no alert dialog appeared
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(dialogs).toHaveLength(0);
    });
  });

  test('SQL injection protection', async ({ page }) => {
    await test.step('Verify SQL injection protection in search', async () => {
      await page.goto('/');
      
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'test-token');
        localStorage.setItem('tenant_id', 'sql-test-tenant');
      });
      
      await page.goto('/contacts');
      
      // Import some normal data first
      const normalData = `Full Name,Phone,Email
정상데이터,01012345678,normal@test.com
테스트유저,01087654321,test@user.com`;

      await page.getByTestId('import-button').click();
      
      const fileChooser = page.waitForEvent('filechooser');
      await page.getByTestId('file-upload-input').click();
      const file = await fileChooser;
      
      await file.setFiles({
        name: 'normal-data.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(normalData)
      });
      
      await expect(page.getByTestId('import-success')).toBeVisible();
      
      // Try SQL injection in search
      const sqlInjectionAttempts = [
        "'; DROP TABLE contacts; --",
        "1' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#"
      ];

      for (const injection of sqlInjectionAttempts) {
        await page.getByTestId('search-input').clear();
        await page.getByTestId('search-input').fill(injection);
        
        // Should either return no results or normal results, never cause error
        await page.waitForTimeout(500);
        
        // Verify page is still functional (no database error)
        await expect(page.getByTestId('contact-list')).toBeVisible();
        
        // Verify no sensitive data is exposed
        const pageContent = await page.textContent('body');
        expect(pageContent).not.toContain('database');
        expect(pageContent).not.toContain('SQL');
        expect(pageContent).not.toContain('error');
      }
    });
  });
});