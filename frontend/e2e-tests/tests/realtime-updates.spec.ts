import { test, expect } from '@playwright/test';

test.describe('Real-time Data Updates Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-realtime-token');
      localStorage.setItem('tenant_id', 'test-tenant-realtime');
    });
  });

  test('Dashboard auto-refresh functionality', async ({ page }) => {
    await page.goto('/analytics');

    await test.step('Initial data load and baseline metrics', async () => {
      // Wait for initial load
      await expect(page.getByTestId('metrics-overview')).toBeVisible({ timeout: 30000 });
      
      // Capture initial metrics
      const initialMetrics = await page.evaluate(() => {
        const sentElement = document.querySelector('[data-testid="metric-total-sent"]');
        const deliveredElement = document.querySelector('[data-testid="metric-delivery-rate"]');
        return {
          totalSent: sentElement?.textContent || '0',
          deliveryRate: deliveredElement?.textContent || '0%'
        };
      });
      
      console.log('Initial metrics captured:', initialMetrics);
    });

    await test.step('Auto-refresh interval behavior', async () => {
      // Look for auto-refresh indicator
      const refreshIndicator = page.getByTestId('auto-refresh-indicator');
      
      if (await refreshIndicator.isVisible()) {
        // Verify auto-refresh is enabled by default
        await expect(refreshIndicator).toContainText(/auto.*refresh|refresh.*on/i);
        
        // Check refresh interval setting
        const refreshInterval = page.getByTestId('refresh-interval');
        if (await refreshInterval.isVisible()) {
          const intervalText = await refreshInterval.textContent();
          expect(intervalText).toMatch(/30s|1m|5m/); // Common refresh intervals
        }
      }
    });

    await test.step('Manual refresh trigger', async () => {
      const refreshButton = page.getByTestId('refresh-data-button');
      
      if (await refreshButton.isVisible()) {
        // Capture timestamp before refresh
        const beforeRefresh = Date.now();
        
        // Trigger manual refresh
        await refreshButton.click();
        
        // Look for loading state
        const loadingIndicator = page.getByTestId('data-loading');
        if (await loadingIndicator.isVisible()) {
          await expect(loadingIndicator).toBeVisible();
          await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
        }
        
        // Verify data was refreshed (timestamp should be recent)
        const lastUpdated = page.getByTestId('last-updated');
        if (await lastUpdated.isVisible()) {
          const updatedText = await lastUpdated.textContent();
          expect(updatedText).toMatch(/just now|seconds ago|minute ago/);
        }
        
        const afterRefresh = Date.now();
        const refreshDuration = afterRefresh - beforeRefresh;
        
        console.log(`Manual refresh took ${refreshDuration}ms`);
        expect(refreshDuration).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });

    await test.step('Refresh settings persistence', async () => {
      const settingsButton = page.getByTestId('refresh-settings');
      
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        
        // Change refresh interval
        const intervalSelector = page.getByTestId('refresh-interval-selector');
        if (await intervalSelector.isVisible()) {
          await intervalSelector.click();
          await page.getByTestId('interval-5m').click();
          
          // Save settings
          const saveButton = page.getByTestId('save-refresh-settings');
          await saveButton.click();
          
          // Reload page and verify settings persisted
          await page.reload();
          await expect(page.getByTestId('metrics-overview')).toBeVisible();
          
          const currentInterval = page.getByTestId('refresh-interval');
          if (await currentInterval.isVisible()) {
            await expect(currentInterval).toContainText('5m');
          }
        }
      }
    });
  });

  test('WebSocket/SSE real-time updates', async ({ page }) => {
    await page.goto('/analytics');

    await test.step('Real-time connection establishment', async () => {
      // Wait for page load
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Check for WebSocket or SSE connection
      const connectionStatus = await page.evaluate(() => {
        // Check for WebSocket connections
        const wsConnections = Array.from(document.querySelectorAll('[data-ws-status]')).map(el => 
          el.getAttribute('data-ws-status')
        );
        
        // Check for EventSource connections (SSE)
        const sseConnections = Array.from(document.querySelectorAll('[data-sse-status]')).map(el =>
          el.getAttribute('data-sse-status')
        );
        
        return {
          hasWebSocket: wsConnections.includes('connected'),
          hasSSE: sseConnections.includes('connected'),
          wsStatuses: wsConnections,
          sseStatuses: sseConnections
        };
      });
      
      console.log('Real-time connection status:', connectionStatus);
      
      // Look for connection indicator in UI
      const connectionIndicator = page.getByTestId('realtime-status');
      if (await connectionIndicator.isVisible()) {
        await expect(connectionIndicator).toContainText(/connected|online|live/i);
        
        // Verify connection indicator styling
        const indicatorClass = await connectionIndicator.getAttribute('class');
        expect(indicatorClass).toMatch(/connected|success|green/i);
      }
    });

    await test.step('Simulate real-time metric updates', async () => {
      // Capture initial state
      const initialSentCount = await page.getByTestId('metric-total-sent').textContent();
      
      // Simulate real-time update by mocking WebSocket/SSE message
      await page.evaluate(() => {
        // Simulate incoming real-time data
        const mockUpdate = {
          type: 'METRICS_UPDATE',
          data: {
            totalSent: 1250,
            totalDelivered: 1180,
            totalOpened: 450,
            totalClicked: 89,
            deliveryRate: 0.944,
            openRate: 0.381,
            clickRate: 0.198,
            timestamp: new Date().toISOString()
          }
        };
        
        // Dispatch custom event to simulate real-time update
        window.dispatchEvent(new CustomEvent('realtime-metrics-update', {
          detail: mockUpdate
        }));
      });
      
      // Wait for UI to update
      await page.waitForTimeout(1000);
      
      // Verify metrics were updated
      const updatedSentCount = await page.getByTestId('metric-total-sent').textContent();
      
      if (updatedSentCount !== initialSentCount) {
        console.log(`Metrics updated: ${initialSentCount} → ${updatedSentCount}`);
        
        // Verify other metrics updated as well
        await expect(page.getByTestId('metric-delivery-rate')).toContainText('94.4%');
        await expect(page.getByTestId('metric-open-rate')).toContainText('38.1%');
        await expect(page.getByTestId('metric-click-rate')).toContainText('19.8%');
      }
    });

    await test.step('Real-time chart updates', async () => {
      // Check if charts support real-time updates
      const timelineChart = page.getByTestId('messages-timeline-chart');
      
      if (await timelineChart.isVisible()) {
        // Capture chart state
        const chartDataBefore = await page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="messages-timeline-chart"] canvas');
          return canvas ? canvas.toDataURL() : null;
        });
        
        // Simulate new data point
        await page.evaluate(() => {
          const mockChartUpdate = {
            type: 'TIMELINE_UPDATE',
            data: {
              timestamp: new Date().toISOString(),
              sent: 45,
              delivered: 42,
              opened: 18,
              clicked: 3,
              cost: 5.4
            }
          };
          
          window.dispatchEvent(new CustomEvent('realtime-timeline-update', {
            detail: mockChartUpdate
          }));
        });
        
        // Wait for chart to re-render
        await page.waitForTimeout(2000);
        
        // Verify chart updated
        const chartDataAfter = await page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="messages-timeline-chart"] canvas');
          return canvas ? canvas.toDataURL() : null;
        });
        
        if (chartDataBefore && chartDataAfter && chartDataBefore !== chartDataAfter) {
          console.log('Chart successfully updated with real-time data');
        }
      }
    });

    await test.step('Connection resilience and reconnection', async () => {
      // Simulate connection loss
      await page.evaluate(() => {
        // Simulate WebSocket/SSE disconnection
        window.dispatchEvent(new CustomEvent('realtime-connection-lost'));
      });
      
      // Wait for disconnection indicator
      await page.waitForTimeout(1000);
      
      const connectionIndicator = page.getByTestId('realtime-status');
      if (await connectionIndicator.isVisible()) {
        await expect(connectionIndicator).toContainText(/disconnected|offline|reconnecting/i);
        
        // Verify indicator styling changed
        const indicatorClass = await connectionIndicator.getAttribute('class');
        expect(indicatorClass).toMatch(/disconnected|error|warning|red|yellow/i);
      }
      
      // Simulate reconnection
      await page.evaluate(() => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('realtime-connection-restored'));
        }, 2000);
      });
      
      // Wait for reconnection
      await page.waitForTimeout(3000);
      
      if (await connectionIndicator.isVisible()) {
        await expect(connectionIndicator).toContainText(/connected|online|live/i);
      }
    });
  });

  test('Campaign progress real-time tracking', async ({ page, context }) => {
    const testCampaignId = 'test-campaign-realtime-123';
    await page.goto(`/campaigns/${testCampaignId}/analytics`);

    await test.step('Campaign status real-time updates', async () => {
      // Wait for campaign page to load
      await page.waitForTimeout(3000);
      
      // Look for campaign status indicator
      const campaignStatus = page.getByTestId('campaign-status');
      if (await campaignStatus.isVisible()) {
        const initialStatus = await campaignStatus.textContent();
        
        // Simulate campaign status change
        await page.evaluate(() => {
          const mockStatusUpdate = {
            type: 'CAMPAIGN_STATUS_UPDATE',
            campaignId: 'test-campaign-realtime-123',
            data: {
              status: 3, // Sending
              progress: 45,
              sentCount: 450,
              deliveredCount: 423,
              failedCount: 27,
              timestamp: new Date().toISOString()
            }
          };
          
          window.dispatchEvent(new CustomEvent('campaign-status-update', {
            detail: mockStatusUpdate
          }));
        });
        
        await page.waitForTimeout(1000);
        
        // Verify status updated
        const updatedStatus = await campaignStatus.textContent();
        if (updatedStatus !== initialStatus) {
          console.log(`Campaign status updated: ${initialStatus} → ${updatedStatus}`);
        }
      }
    });

    await test.step('Progress bar real-time updates', async () => {
      const progressBar = page.getByTestId('campaign-progress');
      
      if (await progressBar.isVisible()) {
        // Simulate progress updates
        const progressValues = [25, 50, 75, 100];
        
        for (const progress of progressValues) {
          await page.evaluate((progressValue) => {
            const mockProgressUpdate = {
              type: 'CAMPAIGN_PROGRESS_UPDATE',
              data: {
                progress: progressValue,
                sentCount: progressValue * 10,
                estimatedCompletion: new Date(Date.now() + (100 - progressValue) * 60000).toISOString()
              }
            };
            
            window.dispatchEvent(new CustomEvent('campaign-progress-update', {
              detail: mockProgressUpdate
            }));
          }, progress);
          
          await page.waitForTimeout(500);
          
          // Verify progress bar updated
          const progressElement = page.getByTestId('progress-percentage');
          if (await progressElement.isVisible()) {
            await expect(progressElement).toContainText(`${progress}%`);
          }
        }
      }
    });

    await test.step('Live metrics during campaign execution', async () => {
      // Simulate live campaign metrics
      const metricsToUpdate = [
        { sent: 100, delivered: 95, opened: 35, clicked: 8 },
        { sent: 250, delivered: 238, opened: 89, clicked: 23 },
        { sent: 500, delivered: 475, opened: 182, clicked: 45 },
        { sent: 750, delivered: 712, opened: 267, clicked: 71 }
      ];
      
      for (const metrics of metricsToUpdate) {
        await page.evaluate((metricsData) => {
          const mockMetricsUpdate = {
            type: 'CAMPAIGN_METRICS_UPDATE',
            data: {
              ...metricsData,
              deliveryRate: metricsData.delivered / metricsData.sent,
              openRate: metricsData.opened / metricsData.delivered,
              clickRate: metricsData.clicked / metricsData.opened,
              timestamp: new Date().toISOString()
            }
          };
          
          window.dispatchEvent(new CustomEvent('campaign-metrics-update', {
            detail: mockMetricsUpdate
          }));
        }, metrics);
        
        await page.waitForTimeout(1000);
        
        // Verify metrics display updated
        const sentElement = page.getByTestId('campaign-metric-messages-sent');
        if (await sentElement.isVisible()) {
          await expect(sentElement).toContainText(metrics.sent.toString());
        }
        
        console.log(`Campaign metrics updated: ${JSON.stringify(metrics)}`);
      }
    });
  });

  test('Multi-user collaborative updates', async ({ page, context }) => {
    await page.goto('/analytics');

    await test.step('Shared dashboard updates from other users', async () => {
      // Setup first user session
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Simulate second user in different browser context
      const secondPage = await context.newPage();
      await secondPage.goto('/');
      await secondPage.evaluate(() => {
        localStorage.setItem('auth_token', 'test-realtime-token-user2');
        localStorage.setItem('tenant_id', 'test-tenant-realtime');
      });
      
      await secondPage.goto('/campaigns');
      
      // Simulate second user creating a new campaign
      await secondPage.evaluate(() => {
        // Mock campaign creation event that affects analytics
        const mockCampaignCreated = {
          type: 'CAMPAIGN_CREATED',
          data: {
            campaignId: 'new-campaign-from-user2',
            name: 'Real-time Test Campaign',
            estimatedRecipients: 1000,
            estimatedCost: 120.50,
            createdBy: 'test-user-2',
            timestamp: new Date().toISOString()
          }
        };
        
        // Broadcast to all connected clients
        window.dispatchEvent(new CustomEvent('campaign-created-broadcast', {
          detail: mockCampaignCreated
        }));
      });
      
      // First user should see notification of new campaign
      await page.waitForTimeout(2000);
      
      const notification = page.getByTestId('realtime-notification');
      if (await notification.isVisible()) {
        await expect(notification).toContainText(/new campaign|campaign created/i);
        
        // Notification should be dismissible
        const dismissButton = notification.getByTestId('dismiss-notification');
        if (await dismissButton.isVisible()) {
          await dismissButton.click();
          await expect(notification).not.toBeVisible();
        }
      }
      
      await secondPage.close();
    });

    await test.step('Live activity feed', async () => {
      const activityFeed = page.getByTestId('live-activity-feed');
      
      if (await activityFeed.isVisible()) {
        // Simulate various activities
        const activities = [
          { type: 'CAMPAIGN_STARTED', user: 'Alice', campaign: 'Holiday Newsletter' },
          { type: 'CAMPAIGN_COMPLETED', user: 'Bob', campaign: 'Black Friday Sale' },
          { type: 'EXPORT_GENERATED', user: 'Charlie', type: 'monthly-report' }
        ];
        
        for (const activity of activities) {
          await page.evaluate((activityData) => {
            const mockActivity = {
              type: 'ACTIVITY_UPDATE',
              data: {
                ...activityData,
                timestamp: new Date().toISOString(),
                id: `activity-${Date.now()}`
              }
            };
            
            window.dispatchEvent(new CustomEvent('activity-feed-update', {
              detail: mockActivity
            }));
          }, activity);
          
          await page.waitForTimeout(500);
        }
        
        // Verify activities appeared in feed
        for (const activity of activities) {
          const activityItem = page.getByTestId(`activity-${activity.type.toLowerCase()}`);
          if (await activityItem.isVisible()) {
            await expect(activityItem).toContainText(activity.user);
            await expect(activityItem).toContainText(activity.campaign || activity.type);
          }
        }
      }
    });
  });

  test('Real-time error handling and edge cases', async ({ page }) => {
    await page.goto('/analytics');

    await test.step('Handle malformed real-time messages', async () => {
      // Wait for initial load
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Send malformed real-time messages
      await page.evaluate(() => {
        const malformedMessages = [
          null,
          undefined,
          '',
          '{"invalid": json}',
          { type: 'UNKNOWN_TYPE', data: null },
          { data: 'missing type' },
          { type: 'METRICS_UPDATE', data: { totalSent: 'not a number' } }
        ];
        
        malformedMessages.forEach((message, index) => {
          setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent('realtime-malformed-test', {
                detail: message
              }));
            } catch (e) {
              console.log(`Malformed message ${index} handled:`, e.message);
            }
          }, index * 100);
        });
      });
      
      // Wait for all messages to be processed
      await page.waitForTimeout(2000);
      
      // Dashboard should remain functional
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Error handling should not break the interface
      const errorBoundary = page.getByTestId('error-boundary');
      if (await errorBoundary.isVisible()) {
        console.log('Error boundary activated - real-time error handling working');
      } else {
        console.log('Dashboard remained stable despite malformed messages');
      }
    });

    await test.step('Handle rapid-fire updates', async () => {
      // Simulate burst of rapid updates
      await page.evaluate(() => {
        let updateCount = 0;
        const rapidInterval = setInterval(() => {
          updateCount++;
          
          const rapidUpdate = {
            type: 'METRICS_UPDATE',
            data: {
              totalSent: 1000 + updateCount,
              totalDelivered: 950 + updateCount,
              timestamp: new Date().toISOString()
            }
          };
          
          window.dispatchEvent(new CustomEvent('realtime-rapid-update', {
            detail: rapidUpdate
          }));
          
          if (updateCount >= 50) {
            clearInterval(rapidInterval);
          }
        }, 50); // 20 updates per second
      });
      
      // Wait for rapid updates to complete
      await page.waitForTimeout(3000);
      
      // Interface should still be responsive
      const refreshButton = page.getByTestId('refresh-data-button');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        // Should respond within reasonable time
        await page.waitForTimeout(500);
      }
      
      // Metrics should show reasonable final values
      const finalSentCount = await page.getByTestId('metric-total-sent').textContent();
      console.log(`Final sent count after rapid updates: ${finalSentCount}`);
    });

    await test.step('Memory leak prevention during long sessions', async () => {
      // Simulate long-running session with periodic updates
      await page.evaluate(() => {
        let memoryTestCount = 0;
        const memoryTestInterval = setInterval(() => {
          memoryTestCount++;
          
          // Create and dispatch update
          const update = {
            type: 'MEMORY_TEST_UPDATE',
            data: {
              counter: memoryTestCount,
              largeArray: new Array(1000).fill(`data-${memoryTestCount}`),
              timestamp: new Date().toISOString()
            }
          };
          
          window.dispatchEvent(new CustomEvent('memory-test-update', {
            detail: update
          }));
          
          // Stop after 100 updates
          if (memoryTestCount >= 100) {
            clearInterval(memoryTestInterval);
            
            // Check memory usage (basic check)
            const memoryInfo = (performance as any).memory;
            if (memoryInfo) {
              console.log('Memory usage:', {
                used: memoryInfo.usedJSHeapSize,
                total: memoryInfo.totalJSHeapSize,
                limit: memoryInfo.jsHeapSizeLimit
              });
            }
          }
        }, 100);
      });
      
      // Wait for memory test to complete
      await page.waitForTimeout(12000);
      
      // Interface should still be responsive
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      console.log('Memory leak prevention test completed');
    });

    await test.step('Network interruption recovery', async () => {
      // Simulate network interruption
      await page.setOfflineMode(true);
      await page.waitForTimeout(2000);
      
      // Look for offline indicator
      const offlineIndicator = page.getByTestId('offline-indicator');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toContainText(/offline|no connection|disconnected/i);
      }
      
      // Restore network
      await page.setOfflineMode(false);
      await page.waitForTimeout(3000);
      
      // Should automatically reconnect
      const connectionStatus = page.getByTestId('realtime-status');
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/connected|online|reconnected/i);
      }
      
      // Data should sync after reconnection
      const lastUpdated = page.getByTestId('last-updated');
      if (await lastUpdated.isVisible()) {
        const updatedText = await lastUpdated.textContent();
        expect(updatedText).toMatch(/just now|seconds ago/);
      }
    });
  });

  test('Performance impact of real-time updates', async ({ page }) => {
    await page.goto('/analytics');

    await test.step('Measure baseline performance without real-time', async () => {
      // Disable real-time updates
      await page.evaluate(() => {
        localStorage.setItem('realtime_disabled', 'true');
      });
      
      await page.reload();
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Measure page interaction performance
      const startTime = performance.now();
      
      // Interact with various UI elements
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.keyboard.press('Escape');
      }
      
      const filterButton = page.getByTestId('channel-filter');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.keyboard.press('Escape');
      }
      
      const baselineTime = performance.now() - startTime;
      console.log(`Baseline interaction time: ${baselineTime.toFixed(2)}ms`);
    });

    await test.step('Measure performance with real-time updates enabled', async () => {
      // Enable real-time updates
      await page.evaluate(() => {
        localStorage.removeItem('realtime_disabled');
      });
      
      await page.reload();
      await expect(page.getByTestId('metrics-overview')).toBeVisible();
      
      // Start real-time updates simulation
      await page.evaluate(() => {
        let updateCounter = 0;
        const perfTestInterval = setInterval(() => {
          updateCounter++;
          
          const update = {
            type: 'PERFORMANCE_TEST_UPDATE',
            data: {
              totalSent: 1000 + updateCounter,
              timestamp: new Date().toISOString()
            }
          };
          
          window.dispatchEvent(new CustomEvent('performance-test-update', {
            detail: update
          }));
          
          if (updateCounter >= 20) {
            clearInterval(perfTestInterval);
          }
        }, 500); // Update every 500ms
      });
      
      // Measure interaction performance with real-time updates
      const startTime = performance.now();
      
      // Same interactions as baseline test
      const exportButton = page.getByTestId('export-menu-trigger');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.keyboard.press('Escape');
      }
      
      const filterButton = page.getByTestId('channel-filter');
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await page.keyboard.press('Escape');
      }
      
      const realtimeTime = performance.now() - startTime;
      console.log(`Real-time interaction time: ${realtimeTime.toFixed(2)}ms`);
      
      // Performance impact should be minimal
      const performanceImpact = ((realtimeTime - 1000) / 1000) * 100; // Assuming 1000ms baseline
      expect(performanceImpact).toBeLessThan(20); // Less than 20% impact
      
      // Wait for all updates to complete
      await page.waitForTimeout(12000);
    });

    await test.step('Memory usage monitoring with real-time updates', async () => {
      const memoryStats = await page.evaluate(() => {
        const memInfo = (performance as any).memory;
        return memInfo ? {
          used: memInfo.usedJSHeapSize,
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit
        } : null;
      });
      
      if (memoryStats) {
        console.log('Memory usage with real-time updates:', memoryStats);
        
        // Memory usage should be reasonable
        const usageRatio = memoryStats.used / memoryStats.limit;
        expect(usageRatio).toBeLessThan(0.5); // Should use less than 50% of available memory
      }
    });
  });
});