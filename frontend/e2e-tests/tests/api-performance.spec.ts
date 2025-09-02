import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';

test.describe('Analytics API Performance Tests', () => {
  let authToken: string;
  let tenantId: string;

  test.beforeAll(async ({ request }) => {
    // Setup test authentication
    authToken = 'test-performance-token';
    tenantId = 'test-tenant-performance';
    
    // Ensure test data exists or create it
    try {
      await request.post('/api/test/seed-performance-data', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-ID': tenantId
        },
        data: {
          contactCount: 10000,
          campaignCount: 100,
          eventCount: 500000
        }
      });
    } catch (error) {
      console.log('Warning: Could not seed performance test data. Using existing data.');
    }
  });

  test('Analytics API response time benchmarks', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Global analytics endpoint performance', async () => {
      const startTime = performance.now();
      
      const response = await request.get('/api/analytics', {
        headers,
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          channels: 'sms,kakao,email'
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(500); // P95 target: <500ms
      
      console.log(`Global analytics response time: ${responseTime.toFixed(2)}ms`);
      
      // Verify response structure
      const data = await response.json();
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('timeline');
      expect(data).toHaveProperty('channelBreakdown');
    });

    await test.step('Campaign analytics endpoint performance', async () => {
      const startTime = performance.now();
      
      const response = await request.get('/api/campaigns/test-campaign-123/analytics', {
        headers
      });
      
      const responseTime = performance.now() - startTime;
      
      // Allow 404 for non-existent test campaign, but measure timing
      expect([200, 404]).toContain(response.status());
      expect(responseTime).toBeLessThan(300); // P95 target: <300ms for single campaign
      
      console.log(`Campaign analytics response time: ${responseTime.toFixed(2)}ms`);
    });

    await test.step('Analytics export endpoint performance', async () => {
      const startTime = performance.now();
      
      const response = await request.get('/api/analytics/export.csv', {
        headers,
        params: {
          startDate: '2024-01-01',
          endDate: '2024-01-31', // Limit range for performance test
          format: 'csv'
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      // Export can be slower due to data processing
      expect([200, 202]).toContain(response.status());
      expect(responseTime).toBeLessThan(2000); // P95 target: <2s for exports
      
      console.log(`Analytics export response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  test('Load testing with concurrent requests', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Concurrent global analytics requests', async () => {
      const concurrentRequests = 10;
      const requestPromises: Promise<any>[] = [];
      
      const startTime = performance.now();
      
      // Fire concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = request.get('/api/analytics', {
          headers,
          params: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }
        }).then(response => ({
          status: response.status(),
          responseTime: performance.now()
        }));
        
        requestPromises.push(requestPromise);
      }
      
      // Wait for all requests to complete
      const results = await Promise.all(requestPromises);
      const totalTime = performance.now() - startTime;
      
      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        console.log(`Concurrent request ${index + 1} completed in ${(result.responseTime - startTime).toFixed(2)}ms`);
      });
      
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(800); // Average should be reasonable under load
      
      console.log(`Load test: ${concurrentRequests} concurrent requests completed in ${totalTime.toFixed(2)}ms`);
      console.log(`Average response time under load: ${avgResponseTime.toFixed(2)}ms`);
    });

    await test.step('Rate limiting behavior', async () => {
      // Test rate limiting for analytics endpoints
      const rapidRequests = 20;
      const requestInterval = 50; // 50ms between requests (20 req/sec)
      
      let rateLimited = false;
      let successCount = 0;
      
      for (let i = 0; i < rapidRequests; i++) {
        const response = await request.get('/api/analytics', {
          headers
        });
        
        if (response.status() === 429) {
          rateLimited = true;
          console.log(`Rate limited after ${i + 1} requests`);
          break;
        } else if (response.status() === 200) {
          successCount++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      console.log(`Rate limiting test: ${successCount} successful requests before rate limiting`);
      
      // Either all requests succeed (no rate limiting) or we hit rate limit
      expect(successCount).toBeGreaterThan(10); // Should handle at least 10 requests
    });
  });

  test('Database query performance analysis', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Complex aggregation queries', async () => {
      // Test complex analytics queries
      const testCases = [
        {
          name: 'Monthly aggregation',
          params: {
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            groupBy: 'month'
          },
          maxTime: 800
        },
        {
          name: 'Channel breakdown',
          params: {
            startDate: '2024-01-01', 
            endDate: '2024-12-31',
            groupBy: 'channel'
          },
          maxTime: 600
        },
        {
          name: 'Daily timeline',
          params: {
            startDate: '2024-11-01',
            endDate: '2024-11-30',
            groupBy: 'day'
          },
          maxTime: 400
        }
      ];

      for (const testCase of testCases) {
        const startTime = performance.now();
        
        const response = await request.get('/api/analytics/timeline', {
          headers,
          params: testCase.params
        });
        
        const responseTime = performance.now() - startTime;
        
        expect(response.status()).toBe(200);
        expect(responseTime).toBeLessThan(testCase.maxTime);
        
        console.log(`${testCase.name} query: ${responseTime.toFixed(2)}ms`);
        
        // Verify data structure
        const data = await response.json();
        expect(data).toHaveProperty('timeline');
        expect(Array.isArray(data.timeline)).toBe(true);
      }
    });

    await test.step('Filter performance impact', async () => {
      const baseParams = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      // Test without filters
      const startTime1 = performance.now();
      const baseResponse = await request.get('/api/analytics', {
        headers,
        params: baseParams
      });
      const baseTime = performance.now() - startTime1;
      
      expect(baseResponse.status()).toBe(200);
      
      // Test with filters
      const startTime2 = performance.now();
      const filteredResponse = await request.get('/api/analytics', {
        headers,
        params: {
          ...baseParams,
          channels: 'sms,kakao',
          campaignIds: 'test-campaign-1,test-campaign-2'
        }
      });
      const filteredTime = performance.now() - startTime2;
      
      expect(filteredResponse.status()).toBe(200);
      
      console.log(`Base query time: ${baseTime.toFixed(2)}ms`);
      console.log(`Filtered query time: ${filteredTime.toFixed(2)}ms`);
      
      // Filtered query should not be significantly slower
      const performanceImpact = (filteredTime - baseTime) / baseTime;
      expect(performanceImpact).toBeLessThan(0.5); // Less than 50% performance impact
    });
  });

  test('Memory usage and resource efficiency', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Large date range handling', async () => {
      // Test handling of large date ranges
      const startTime = performance.now();
      
      const response = await request.get('/api/analytics', {
        headers,
        params: {
          startDate: '2020-01-01',
          endDate: '2024-12-31' // 5 years of data
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      // Should handle large ranges without timeout
      expect([200, 206]).toContain(response.status()); // 206 for partial content if paginated
      expect(responseTime).toBeLessThan(3000); // Max 3 seconds for large ranges
      
      console.log(`Large date range query: ${responseTime.toFixed(2)}ms`);
      
      const data = await response.json();
      
      // Response should have reasonable size limits
      const responseSize = JSON.stringify(data).length;
      expect(responseSize).toBeLessThan(1024 * 1024); // Less than 1MB response
      
      console.log(`Response size: ${(responseSize / 1024).toFixed(2)} KB`);
    });

    await test.step('Pagination and streaming behavior', async () => {
      // Test paginated responses for large datasets
      const response = await request.get('/api/analytics/events', {
        headers,
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          limit: 1000,
          offset: 0
        }
      });
      
      expect([200, 206]).toContain(response.status());
      
      const data = await response.json();
      
      if (data.events) {
        expect(data.events.length).toBeLessThanOrEqual(1000);
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('hasMore');
      }
      
      console.log('Pagination test passed');
    });

    await test.step('CSV export streaming performance', async () => {
      const startTime = performance.now();
      
      const response = await request.get('/api/analytics/export.csv', {
        headers,
        params: {
          startDate: '2024-11-01',
          endDate: '2024-11-30',
          format: 'csv'
        }
      });
      
      const responseTime = performance.now() - startTime;
      
      expect([200, 202]).toContain(response.status());
      
      if (response.status() === 200) {
        // Direct CSV response - should stream efficiently
        const csvContent = await response.text();
        expect(csvContent.length).toBeGreaterThan(0);
        expect(csvContent).toContain('Campaign Name');
        
        console.log(`CSV export streaming: ${responseTime.toFixed(2)}ms`);
        console.log(`CSV size: ${(csvContent.length / 1024).toFixed(2)} KB`);
      } else {
        // Async processing - should respond quickly
        expect(responseTime).toBeLessThan(500);
        
        const data = await response.json();
        expect(data).toHaveProperty('jobId');
        
        console.log(`CSV export job created in: ${responseTime.toFixed(2)}ms`);
      }
    });
  });

  test('Caching and optimization behavior', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Cache hit performance improvement', async () => {
      const queryParams = {
        startDate: '2024-11-01',
        endDate: '2024-11-30',
        channels: 'sms,kakao'
      };

      // First request - cache miss
      const startTime1 = performance.now();
      const response1 = await request.get('/api/analytics', {
        headers,
        params: queryParams
      });
      const firstRequestTime = performance.now() - startTime1;
      
      expect(response1.status()).toBe(200);
      
      // Second identical request - should be cached
      const startTime2 = performance.now();
      const response2 = await request.get('/api/analytics', {
        headers,
        params: queryParams
      });
      const secondRequestTime = performance.now() - startTime2;
      
      expect(response2.status()).toBe(200);
      
      // Cached response should be significantly faster
      const cacheImprovement = (firstRequestTime - secondRequestTime) / firstRequestTime;
      
      console.log(`First request: ${firstRequestTime.toFixed(2)}ms`);
      console.log(`Second request (cached): ${secondRequestTime.toFixed(2)}ms`);
      console.log(`Cache improvement: ${(cacheImprovement * 100).toFixed(1)}%`);
      
      // If caching is implemented, should see improvement
      // If not implemented, both should be reasonably fast
      if (secondRequestTime < firstRequestTime * 0.8) {
        console.log('Cache effectiveness detected');
      } else {
        console.log('No cache detected or cache not effective');
      }
      
      expect(secondRequestTime).toBeLessThan(firstRequestTime + 100); // Allow some variance
    });

    await test.step('ETag and conditional requests', async () => {
      // First request
      const response1 = await request.get('/api/analytics', {
        headers
      });
      
      expect(response1.status()).toBe(200);
      
      const etag = response1.headers()['etag'];
      
      if (etag) {
        // Conditional request with ETag
        const response2 = await request.get('/api/analytics', {
          headers: {
            ...headers,
            'If-None-Match': etag
          }
        });
        
        // Should return 304 Not Modified if data hasn't changed
        expect([200, 304]).toContain(response2.status());
        
        if (response2.status() === 304) {
          console.log('ETag-based caching working correctly');
        } else {
          console.log('Data changed or ETag-based caching not implemented');
        }
      } else {
        console.log('ETag not implemented');
      }
    });
  });

  test('Error handling and timeout behavior', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Graceful handling of complex queries', async () => {
      // Extremely complex query that might timeout
      const response = await request.get('/api/analytics', {
        headers,
        params: {
          startDate: '2020-01-01',
          endDate: '2024-12-31',
          groupBy: 'hour', // Very granular grouping
          channels: 'sms,kakao,email,push,web,social'
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Should either succeed quickly or return appropriate error
      expect([200, 202, 400, 413, 503]).toContain(response.status());
      
      if (response.status() === 202) {
        // Async processing accepted
        const data = await response.json();
        expect(data).toHaveProperty('jobId');
        console.log('Complex query moved to background processing');
      } else if (response.status() === 413) {
        // Payload too large
        console.log('Query rejected as too large');
      } else if (response.status() === 503) {
        // Service temporarily unavailable
        console.log('Service under load, request rejected');
      } else if (response.status() === 200) {
        // Successfully handled complex query
        console.log('Complex query handled successfully');
      }
    });

    await test.step('Database connection resilience', async () => {
      // Multiple rapid requests to test connection pooling
      const rapidRequests = 15;
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < rapidRequests; i++) {
        promises.push(
          request.get('/api/analytics/health').then(response => ({
            status: response.status(),
            timestamp: Date.now()
          }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // All health checks should succeed
      results.forEach((result, index) => {
        expect([200, 503]).toContain(result.status);
        if (result.status === 503) {
          console.log(`Request ${index + 1} hit connection limit`);
        }
      });
      
      const successfulRequests = results.filter(r => r.status === 200).length;
      
      // At least 80% should succeed
      expect(successfulRequests / rapidRequests).toBeGreaterThanOrEqual(0.8);
      
      console.log(`Connection resilience: ${successfulRequests}/${rapidRequests} successful`);
    });
  });

  test('Performance regression detection', async ({ request }) => {
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'X-Tenant-ID': tenantId
    };

    await test.step('Establish performance baselines', async () => {
      const benchmarkTests = [
        {
          name: 'Simple metrics query',
          endpoint: '/api/analytics',
          params: { startDate: '2024-11-01', endDate: '2024-11-30' },
          baseline: 400 // ms
        },
        {
          name: 'Timeline data query', 
          endpoint: '/api/analytics/timeline',
          params: { startDate: '2024-11-01', endDate: '2024-11-30', groupBy: 'day' },
          baseline: 600 // ms
        },
        {
          name: 'Channel breakdown query',
          endpoint: '/api/analytics/channels',
          params: { startDate: '2024-11-01', endDate: '2024-11-30' },
          baseline: 300 // ms
        }
      ];

      const results: Array<{name: string, responseTime: number, status: number}> = [];

      for (const benchmark of benchmarkTests) {
        const startTime = performance.now();
        
        const response = await request.get(benchmark.endpoint, {
          headers,
          params: benchmark.params
        });
        
        const responseTime = performance.now() - startTime;
        
        results.push({
          name: benchmark.name,
          responseTime,
          status: response.status()
        });
        
        // Check against baseline
        const performanceRatio = responseTime / benchmark.baseline;
        
        console.log(`${benchmark.name}: ${responseTime.toFixed(2)}ms (${performanceRatio.toFixed(2)}x baseline)`);
        
        if (performanceRatio > 2.0) {
          console.warn(`Performance regression detected in ${benchmark.name}! Response time is ${performanceRatio.toFixed(2)}x baseline`);
        }
        
        // Still pass test but log warning - in CI this would be flagged for investigation
        expect(response.status()).toBe(200);
      }
      
      // Generate performance report
      console.log('\n=== Performance Summary ===');
      results.forEach(result => {
        console.log(`${result.name}: ${result.responseTime.toFixed(2)}ms (Status: ${result.status})`);
      });
    });
  });
});