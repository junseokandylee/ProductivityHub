# E2E Testing Setup for Political Productivity Hub

This directory contains end-to-end tests for the Political Productivity Hub campaign wizard using Playwright.

## Test Structure

```
tests/
├── e2e/
│   ├── campaign-wizard.spec.ts           # Happy path tests
│   ├── campaign-wizard-errors.spec.ts    # Error scenario tests
│   ├── campaign-wizard-accessibility.spec.ts # Accessibility tests
│   ├── pages/
│   │   └── campaign-wizard.page.ts       # Page Object Model
│   ├── fixtures/
│   │   └── test-data.ts                  # Test data constants
│   └── helpers/
│       └── msw-setup.ts                  # MSW configuration helpers
├── mocks/
│   ├── handlers.ts                       # API mock handlers
│   ├── browser.ts                        # MSW browser setup
│   └── server.ts                         # MSW Node.js setup
└── README.md                             # This file
```

## Test Coverage

### Happy Path Tests (`campaign-wizard.spec.ts`)
- ✅ Complete campaign creation flow (audience → message → channels → review → send)
- ✅ Audience selection with include all contacts
- ✅ Message composition with token insertion
- ✅ Channel priority configuration
- ✅ Scheduled campaign creation

### Error Scenario Tests (`campaign-wizard-errors.spec.ts`)
- ✅ Validation errors (empty message, no audience selected)
- ✅ Quota exceeded scenarios with cost estimation
- ✅ Server errors during campaign creation (500 responses)
- ✅ Network errors and retry mechanisms
- ✅ Form validation (character limits)
- ✅ Channel configuration errors
- ✅ Offline detection and recovery

### Accessibility Tests (`campaign-wizard-accessibility.spec.ts`)
- ✅ WCAG 2.1 AA compliance checks
- ✅ Keyboard navigation testing
- ✅ ARIA labels and roles verification
- ✅ Color contrast validation
- ✅ Modal dialog accessibility
- ✅ Error message accessibility
- ✅ Form controls accessibility

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Local Development
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test campaign-wizard.spec.ts

# Run tests with specific tag
npx playwright test --grep "Happy Path"
```

### CI/CD
Tests automatically run in GitHub Actions on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Changes to frontend, backend, or test files

## Mock Service Worker (MSW) Setup

The tests use MSW to mock API responses, providing:

### Mock Endpoints
- `GET /api/contacts/groups` - Returns test contact groups
- `GET /api/contacts/segments` - Returns test contact segments  
- `POST /api/contacts/sample` - Returns sample contact for personalization
- `POST /api/messages/preview` - Returns rendered message preview
- `GET /api/channels/status` - Returns channel availability status
- `GET /api/quotas/current` - Returns current quota usage
- `POST /api/campaigns/estimate` - Returns cost estimation
- `POST /api/campaigns` - Creates campaign (success/error scenarios)

### Error Scenarios
Tests can simulate various error conditions:
- Quota exceeded (`quotaOk: false`)
- Server errors (500 responses)
- Network failures
- Validation errors (400 responses)

## Page Object Model

The `CampaignWizardPage` class provides:
- Step navigation methods
- Form interaction helpers
- Assertion utilities
- Loading state management

### Usage Example
```typescript
const campaignWizard = new CampaignWizardPage(page);

// Navigate to wizard
await campaignWizard.goto();

// Select audience
await campaignWizard.selectContactGroup('지역구 주요 인사');
await campaignWizard.goToNextStep();

// Fill message details
await campaignWizard.fillCampaignDetails(
  'Test Campaign',
  'Hello {name}!'
);

// Assert current step
await campaignWizard.expectCurrentStep(2);
```

## Test Data

Test data is defined in `fixtures/test-data.ts`:
- Contact groups with realistic Korean names
- Contact segments with typical political demographics
- Sample campaign content with personalization tokens
- Mock API responses for all endpoints

## Accessibility Testing

Uses `@axe-core/playwright` for comprehensive accessibility validation:

### Checks Include
- Color contrast (WCAG AA standards)
- Keyboard navigation
- ARIA labels and roles
- Form accessibility
- Heading structure
- Landmark regions
- Focus management

### Running Accessibility Tests Only
```bash
npx playwright test campaign-wizard-accessibility.spec.ts
```

## Debugging

### Screenshots and Videos
- Screenshots taken on test failure
- Videos recorded for failed tests
- Test traces available for debugging

### View Test Reports
```bash
# Open HTML report after test run
npx playwright show-report
```

### Debug Failed Tests
```bash
# Run specific test in debug mode
npx playwright test campaign-wizard.spec.ts --debug

# Run with headed browser to see what's happening
npx playwright test --headed
```

## Configuration

### Environment Variables
- `PLAYWRIGHT_BASE_URL` - Base URL for tests (default: http://localhost:3000)
- `PLAYWRIGHT_QUOTA_EXCEEDED` - Simulate quota exceeded scenario
- `PLAYWRIGHT_SERVER_ERROR` - Simulate server error scenario

### Playwright Config
Key configuration options in `playwright.config.ts`:
- Test directory: `./tests/e2e`
- Browser: Chromium (primary), Firefox/Safari available
- Retries: 2 on CI, 0 locally
- Parallel execution: Enabled
- Traces: Collected on retry
- Web server: Starts Next.js dev server automatically

## Best Practices

### Writing Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Use Page Object Model for reusability
4. Test both happy path and error scenarios
5. Include accessibility checks

### Test Data
1. Use realistic Korean content for political context
2. Keep mock data minimal but representative
3. Use constants from `test-data.ts`
4. Avoid hardcoded values in tests

### Debugging
1. Use `page.pause()` to debug interactively
2. Add `await page.screenshot()` for visual debugging
3. Use `expect.soft()` for non-blocking assertions
4. Check network requests in browser dev tools

## Common Issues

### Browser Installation
If browsers fail to install:
```bash
# Install system dependencies
sudo npx playwright install-deps

# Install specific browser
npx playwright install chromium
```

### Test Flakiness
- Add proper waits: `page.waitForLoadState('networkidle')`
- Use `expect.toBeVisible()` instead of `toHaveCount()`
- Increase timeouts for slow operations
- Use `test.retry()` for flaky tests

### MSW Issues
- Ensure service worker is properly initialized
- Check network tab in browser for request interception
- Verify mock handlers match actual API endpoints
- Clear browser cache if MSW stops working

## Contributing

When adding new tests:
1. Follow existing patterns and naming conventions
2. Add both happy path and error scenarios
3. Include accessibility checks for new UI elements
4. Update test data constants as needed
5. Add proper documentation and comments