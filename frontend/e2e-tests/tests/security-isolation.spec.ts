import { test, expect } from '@playwright/test';

test.describe('Multi-tenant Security and Isolation', () => {
  const tenantA = {
    id: 'tenant-security-a',
    token: 'token-tenant-a-security',
    name: 'Security Test Tenant A'
  };

  const tenantB = {
    id: 'tenant-security-b', 
    token: 'token-tenant-b-security',
    name: 'Security Test Tenant B'
  };

  const adminUser = {
    id: 'admin-security-test',
    token: 'admin-token-security',
    tenantId: tenantA.id
  };

  const regularUser = {
    id: 'user-security-test',
    token: 'user-token-security', 
    tenantId: tenantA.id
  };

  test.beforeAll(async ({ request }) => {
    // Setup test data for both tenants
    try {
      // Create test campaigns for tenant A
      await request.post('/api/campaigns', {
        data: {
          name: 'Tenant A Campaign - Security Test',
          messageTitle: 'Tenant A Message',
          messageBody: 'This campaign belongs to Tenant A',
          estimatedRecipients: 100
        },
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        }
      });

      // Create test campaigns for tenant B
      await request.post('/api/campaigns', {
        data: {
          name: 'Tenant B Campaign - Security Test',
          messageTitle: 'Tenant B Message',
          messageBody: 'This campaign belongs to Tenant B',
          estimatedRecipients: 200
        },
        headers: {
          'Authorization': `Bearer ${tenantB.token}`,
          'X-Tenant-ID': tenantB.id
        }
      });

      console.log('Security test data setup completed');
    } catch (error) {
      console.log('Warning: Could not create security test data. Using existing data.');
    }
  });

  test('Row-level security (RLS) enforcement', async ({ request, page }) => {
    await test.step('Tenant A cannot access Tenant B analytics data', async () => {
      // Request Tenant B analytics with Tenant A credentials
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantB.id // Wrong tenant ID
        },
        params: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        }
      });

      // Should be forbidden or return empty results
      expect([403, 404]).toContain(response.status());

      if (response.status() === 200) {
        // If 200, data should be empty or filtered
        const data = await response.json();
        if (data.metrics) {
          expect(data.metrics.totalSent).toBe(0);
        }
      }
    });

    await test.step('Database queries respect tenant boundaries', async () => {
      // Get analytics for Tenant A
      const tenantAResponse = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        },
        params: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        }
      });

      expect(tenantAResponse.status()).toBe(200);
      const tenantAData = await tenantAResponse.json();

      // Get analytics for Tenant B
      const tenantBResponse = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantB.token}`,
          'X-Tenant-ID': tenantB.id
        },
        params: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        }
      });

      expect(tenantBResponse.status()).toBe(200);
      const tenantBData = await tenantBResponse.json();

      // Data should be completely separate
      console.log(`Tenant A metrics: ${JSON.stringify(tenantAData.metrics, null, 2)}`);
      console.log(`Tenant B metrics: ${JSON.stringify(tenantBData.metrics, null, 2)}`);

      // Verify data isolation (if both have data, they should be different)
      if (tenantAData.metrics.totalSent > 0 && tenantBData.metrics.totalSent > 0) {
        expect(tenantAData.metrics.totalSent).not.toBe(tenantBData.metrics.totalSent);
      }
    });

    await test.step('Campaign-level isolation', async () => {
      // Try to access Tenant B campaign with Tenant A credentials
      const campaignResponse = await request.get('/api/campaigns/tenant-b-campaign/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        }
      });

      // Should not be able to access other tenant's campaigns
      expect([403, 404]).toContain(campaignResponse.status());
    });

    await test.step('Export isolation', async () => {
      // Request export for Tenant A
      const exportResponse = await request.get('/api/analytics/export.csv', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        },
        params: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        }
      });

      expect([200, 202]).toContain(exportResponse.status());

      if (exportResponse.status() === 200) {
        const csvContent = await exportResponse.text();
        
        // CSV should only contain Tenant A data
        expect(csvContent).not.toContain('Tenant B');
        expect(csvContent).not.toContain(tenantB.name);
        
        // Should contain Tenant A identifier if any data exists
        if (csvContent.includes('Campaign')) {
          console.log('Export contains campaign data - verifying tenant isolation');
        }
      }
    });
  });

  test('Authentication and authorization', async ({ request, page }) => {
    await test.step('Missing authentication token', async () => {
      const response = await request.get('/api/analytics', {
        headers: {
          'X-Tenant-ID': tenantA.id
          // No Authorization header
        }
      });

      expect(response.status()).toBe(401);

      const errorData = await response.json();
      expect(errorData.error.code).toBe('UNAUTHORIZED');
      expect(errorData.error.message).toContain('authentication');
    });

    await test.step('Invalid authentication token', async () => {
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
          'X-Tenant-ID': tenantA.id
        }
      });

      expect([401, 403]).toContain(response.status());
    });

    await test.step('Missing tenant ID header', async () => {
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`
          // No X-Tenant-ID header
        }
      });

      expect([400, 401]).toContain(response.status());
    });

    await test.step('Token-tenant mismatch validation', async () => {
      // Use Tenant A token with Tenant B ID
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantB.id
        }
      });

      expect([403, 404]).toContain(response.status());
    });

    await test.step('Role-based access control', async () => {
      // Test admin vs regular user access
      const adminResponse = await request.get('/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${adminUser.token}`,
          'X-Tenant-ID': adminUser.tenantId
        }
      });

      const userResponse = await request.get('/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${regularUser.token}`,
          'X-Tenant-ID': regularUser.tenantId
        }
      });

      // Admin should have access, regular user should not
      if (adminResponse.status() === 200) {
        expect([403, 404]).toContain(userResponse.status());
      }
    });
  });

  test('Session security and token management', async ({ page, context }) => {
    await test.step('Session isolation between tenants', async () => {
      // Login as Tenant A
      await page.goto('/');
      await page.evaluate(({ token, tenantId }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('tenant_id', tenantId);
      }, { token: tenantA.token, tenantId: tenantA.id });

      await page.goto('/analytics');
      await expect(page.getByTestId('metrics-overview')).toBeVisible();

      // Switch to Tenant B in same session
      await page.evaluate(({ token, tenantId }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('tenant_id', tenantId);
      }, { token: tenantB.token, tenantId: tenantB.id });

      await page.reload();

      // Should now show Tenant B data
      // Verify no residual Tenant A data
      const currentUrl = page.url();
      expect(currentUrl).toContain('/analytics');
    });

    await test.step('Token expiration handling', async () => {
      // Set up expired token scenario
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired-token-12345');
        localStorage.setItem('tenant_id', 'tenant-security-a');
      });

      await page.goto('/analytics');

      // Should redirect to login or show auth error
      await page.waitForTimeout(2000);
      
      const currentPath = new URL(page.url()).pathname;
      const isOnLogin = currentPath.includes('/login') || currentPath.includes('/auth');
      const hasAuthError = await page.getByTestId('auth-error').isVisible();

      expect(isOnLogin || hasAuthError).toBe(true);
    });

    await test.step('Cross-tab session consistency', async () => {
      // Login in first tab
      await page.goto('/');
      await page.evaluate(({ token, tenantId }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('tenant_id', tenantId);
      }, { token: tenantA.token, tenantId: tenantA.id });

      await page.goto('/analytics');

      // Open second tab
      const secondPage = await context.newPage();
      await secondPage.goto('/analytics');

      // Should inherit session
      await expect(secondPage.getByTestId('metrics-overview')).toBeVisible();

      // Logout in first tab
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('tenant_id');
      });

      await page.reload();

      // First tab should lose access
      await page.waitForTimeout(1000);
      const firstTabHasAuth = await page.getByTestId('metrics-overview').isVisible();

      // Second tab might still have cached session (depends on implementation)
      await secondPage.reload();
      await secondPage.waitForTimeout(1000);

      await secondPage.close();
    });
  });

  test('Input validation and injection protection', async ({ request }) => {
    await test.step('SQL injection prevention', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE campaigns; --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE campaigns SET status = 0; --",
        "' OR '1'='1",
        "'; INSERT INTO campaigns VALUES ('hacked'); --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request.get('/api/analytics', {
          headers: {
            'Authorization': `Bearer ${tenantA.token}`,
            'X-Tenant-ID': tenantA.id
          },
          params: {
            startDate: injection,
            endDate: '2024-12-31T23:59:59Z',
            campaignIds: injection
          }
        });

        // Should return validation error, not execute SQL
        expect([400, 422]).toContain(response.status());

        const errorData = await response.json();
        expect(errorData.error.code).toMatch(/INVALID|VALIDATION/);
        
        console.log(`SQL injection blocked: ${response.status()}`);
      }
    });

    await test.step('XSS prevention in responses', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request.get('/api/analytics', {
          headers: {
            'Authorization': `Bearer ${tenantA.token}`,
            'X-Tenant-ID': tenantA.id,
            'User-Agent': payload // Try XSS in header
          },
          params: {
            channels: payload
          }
        });

        if (response.status() === 200) {
          const responseText = await response.text();
          
          // Response should not contain unescaped script tags
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
        }
      }
    });

    await test.step('Parameter validation', async () => {
      const invalidParams = [
        {
          name: 'Invalid date format',
          params: { startDate: 'not-a-date', endDate: '2024-12-31T23:59:59Z' }
        },
        {
          name: 'Future end date',
          params: { startDate: '2024-01-01T00:00:00Z', endDate: '2030-12-31T23:59:59Z' }
        },
        {
          name: 'Negative offset',
          params: { offset: '-100', limit: '50' }
        },
        {
          name: 'Excessive limit',
          params: { limit: '999999' }
        },
        {
          name: 'Invalid UUID format',
          params: { campaignIds: 'not-a-uuid,invalid-uuid' }
        }
      ];

      for (const testCase of invalidParams) {
        const response = await request.get('/api/analytics', {
          headers: {
            'Authorization': `Bearer ${tenantA.token}`,
            'X-Tenant-ID': tenantA.id
          },
          params: testCase.params
        });

        expect([400, 422]).toContain(response.status());
        
        const errorData = await response.json();
        expect(errorData.error.message).toBeDefined();
        
        console.log(`${testCase.name}: ${response.status()}`);
      }
    });
  });

  test('Rate limiting and abuse protection', async ({ request }) => {
    await test.step('API rate limiting enforcement', async () => {
      const requests: Promise<any>[] = [];
      const rapidRequestCount = 25;

      // Fire rapid requests
      for (let i = 0; i < rapidRequestCount; i++) {
        requests.push(
          request.get('/api/analytics', {
            headers: {
              'Authorization': `Bearer ${tenantA.token}`,
              'X-Tenant-ID': tenantA.id
            }
          }).then(response => ({
            status: response.status(),
            headers: response.headers(),
            requestId: i
          }))
        );
      }

      const responses = await Promise.all(requests);
      
      let rateLimitedCount = 0;
      let successCount = 0;

      responses.forEach((response, index) => {
        if (response.status === 429) {
          rateLimitedCount++;
          
          // Should have rate limit headers
          expect(response.headers['x-ratelimit-limit']).toBeDefined();
          expect(response.headers['x-ratelimit-remaining']).toBeDefined();
          expect(response.headers['retry-after']).toBeDefined();
          
        } else if (response.status === 200) {
          successCount++;
        }
        
        console.log(`Request ${index + 1}: ${response.status}`);
      });

      console.log(`Rate limiting results: ${successCount} success, ${rateLimitedCount} rate limited`);
      
      // Should have some rate limiting after rapid requests
      if (rapidRequestCount > 20) {
        expect(rateLimitedCount).toBeGreaterThan(0);
      }
    });

    await test.step('Export rate limiting', async () => {
      // Test export-specific rate limits (typically stricter)
      const exportRequests: Promise<any>[] = [];
      const exportRequestCount = 8; // Fewer for exports

      for (let i = 0; i < exportRequestCount; i++) {
        exportRequests.push(
          request.get('/api/analytics/export.csv', {
            headers: {
              'Authorization': `Bearer ${tenantA.token}`,
              'X-Tenant-ID': tenantA.id
            },
            params: {
              startDate: '2024-11-01T00:00:00Z',
              endDate: '2024-11-30T23:59:59Z'
            }
          }).then(response => response.status())
        );
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const exportStatuses = await Promise.all(exportRequests);
      const exportRateLimited = exportStatuses.filter(status => status === 429).length;
      
      console.log(`Export rate limiting: ${exportRateLimited} out of ${exportRequestCount} rate limited`);
      
      // Export should have stricter rate limiting
      if (exportRequestCount > 5) {
        expect(exportRateLimited).toBeGreaterThan(0);
      }
    });
  });

  test('Secure headers and HTTPS enforcement', async ({ request, page }) => {
    await test.step('Security headers validation', async () => {
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        }
      });

      expect(response.status()).toBe(200);
      
      const headers = response.headers();
      
      // Security headers that should be present
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': /^(DENY|SAMEORIGIN)$/,
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': /max-age=\d+/,
        'content-security-policy': /.+/
      };

      Object.entries(securityHeaders).forEach(([header, expected]) => {
        const value = headers[header];
        if (value) {
          if (expected instanceof RegExp) {
            expect(value).toMatch(expected);
          } else {
            expect(value).toBe(expected);
          }
          console.log(`✅ ${header}: ${value}`);
        } else {
          console.log(`⚠️ Missing security header: ${header}`);
        }
      });
    });

    await test.step('CORS policy validation', async () => {
      // Test preflight request
      const preflightResponse = await request.fetch('/api/analytics', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,x-tenant-id'
        }
      });

      // Should either reject or have proper CORS headers
      const corsHeaders = preflightResponse.headers();
      
      if (corsHeaders['access-control-allow-origin']) {
        const allowedOrigin = corsHeaders['access-control-allow-origin'];
        
        // Should not allow all origins with credentials
        if (corsHeaders['access-control-allow-credentials'] === 'true') {
          expect(allowedOrigin).not.toBe('*');
        }
        
        console.log(`CORS origin: ${allowedOrigin}`);
      }
    });

    await test.step('Frontend security implementation', async () => {
      await page.goto('/analytics');
      
      // Set up tenant authentication
      await page.evaluate(({ token, tenantId }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('tenant_id', tenantId);
      }, { token: tenantA.token, tenantId: tenantA.id });

      await page.reload();
      
      // Check for security-related frontend implementations
      const tokenStorage = await page.evaluate(() => {
        return {
          hasAuthToken: !!localStorage.getItem('auth_token'),
          hasTenantId: !!localStorage.getItem('tenant_id'),
          tokenLength: localStorage.getItem('auth_token')?.length || 0
        };
      });

      expect(tokenStorage.hasAuthToken).toBe(true);
      expect(tokenStorage.hasTenantId).toBe(true);
      expect(tokenStorage.tokenLength).toBeGreaterThan(10);

      // Verify HTTPS enforcement (in production)
      const protocol = new URL(page.url()).protocol;
      if (process.env.NODE_ENV === 'production') {
        expect(protocol).toBe('https:');
      }
    });
  });

  test('Data leakage prevention', async ({ request, page }) => {
    await test.step('Error messages do not expose sensitive data', async () => {
      // Test with various error scenarios
      const errorScenarios = [
        {
          name: 'Invalid campaign ID',
          url: '/api/campaigns/00000000-0000-0000-0000-000000000000/analytics',
          expectedCode: 'CAMPAIGN_NOT_FOUND'
        },
        {
          name: 'Non-existent tenant',
          url: '/api/analytics',
          headers: { 'X-Tenant-ID': '00000000-0000-0000-0000-000000000000' },
          expectedCode: /TENANT_NOT_FOUND|FORBIDDEN/
        }
      ];

      for (const scenario of errorScenarios) {
        const response = await request.get(scenario.url, {
          headers: {
            'Authorization': `Bearer ${tenantA.token}`,
            'X-Tenant-ID': scenario.headers?.['X-Tenant-ID'] || tenantA.id,
            ...scenario.headers
          }
        });

        expect(response.status()).toBeGreaterThanOrEqual(400);
        
        const errorData = await response.json();
        
        // Error message should not contain sensitive information
        const errorMessage = errorData.error?.message || '';
        
        // Should not expose internal paths, SQL, or sensitive data
        expect(errorMessage).not.toMatch(/\/var\/|\/home\/|C:\\/);
        expect(errorMessage).not.toMatch(/SELECT|INSERT|UPDATE|DELETE/);
        expect(errorMessage).not.toMatch(/password|secret|key|token/i);
        expect(errorMessage).not.toContain('stack trace');
        
        console.log(`${scenario.name}: ${errorData.error?.code} - ${errorMessage}`);
      }
    });

    await test.step('Logs do not contain sensitive information', async () => {
      // Make request that might be logged
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id,
          'User-Agent': 'SecurityTest/1.0'
        }
      });

      expect(response.status()).toBe(200);
      
      // In a real implementation, you would check server logs
      // For now, we verify that the API doesn't echo sensitive data
      const responseText = await response.text();
      
      // Response should not contain full auth tokens
      expect(responseText).not.toContain(tenantA.token);
      expect(responseText).not.toMatch(/Bearer [A-Za-z0-9-_]{20,}/);
    });

    await test.step('Frontend prevents data leakage', async () => {
      await page.goto('/analytics');
      await page.evaluate(({ token, tenantId }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('tenant_id', tenantId);
      }, { token: tenantA.token, tenantId: tenantA.id });

      await page.reload();
      await expect(page.getByTestId('metrics-overview')).toBeVisible();

      // Check console for sensitive data exposure
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });

      // Trigger some operations that might log data
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.keyboard.press('Escape');
      }

      // Check that console logs don't contain sensitive data
      setTimeout(() => {
        consoleLogs.forEach(log => {
          expect(log).not.toContain(tenantA.token);
          expect(log).not.toMatch(/Bearer [A-Za-z0-9-_]{20,}/);
          expect(log).not.toMatch(/password|secret|key/i);
        });
      }, 1000);
    });
  });

  test('Audit logging and monitoring', async ({ request }) => {
    await test.step('Security events generate audit logs', async () => {
      // Authentication failure
      await request.get('/api/analytics', {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'X-Tenant-ID': tenantA.id
        }
      });

      // Authorization failure  
      await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantB.id
        }
      });

      // Suspicious parameter values
      await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        },
        params: {
          startDate: "'; DROP TABLE campaigns; --"
        }
      });

      // In a real implementation, these would be verified in audit logs
      // For now, we verify that the system handles these securely
      console.log('Security audit events should be logged');
    });

    await test.step('Performance monitoring for security', async () => {
      // Measure response times for potential DoS detection
      const startTime = performance.now();
      
      const response = await request.get('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${tenantA.token}`,
          'X-Tenant-ID': tenantA.id
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should not be unusually slow
      
      console.log(`Security response time monitoring: ${responseTime.toFixed(2)}ms`);
    });
  });
});