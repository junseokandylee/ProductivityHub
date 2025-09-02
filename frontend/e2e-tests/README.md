# ProductivityHub Analytics E2E Test Suite

Comprehensive end-to-end testing suite for the ProductivityHub analytics platform, covering dashboard functionality, API contracts, performance, security, accessibility, and real-time features using Playwright.

## 📋 Overview

This test suite validates the complete contact management workflow including:
- Contact import and data processing
- Deduplication and merge functionality  
- Search and filtering performance
- Bulk operations and tagging
- Export functionality with security
- Row-level security (RLS) tenant isolation
- Performance benchmarks and security validations

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16 with `pg_trgm` and `pgcrypto` extensions
- Redis 7+ (for backend services)
- .NET 9 SDK

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI (headed mode)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Run with Playwright UI
npm run test:ui

# View test report
npm run test:report
```

## 📊 Test Suites

### 1. Contact Workflow Tests (`contact-workflow.spec.ts`)

**Complete end-to-end workflow validation:**

- **Import Process**: CSV upload with progress tracking, validation messages
- **Deduplication**: Automatic duplicate detection and merge functionality
- **Search Performance**: Korean text search with <150ms p95 requirement validation
- **Bulk Operations**: Tag application, selection management, bulk actions
- **Detail Management**: Contact editing, history tracking, audit logs
- **Export Security**: Secure token-based downloads, format validation

**Key Validations:**
- Import success for 1000+ contacts within timeout limits
- Duplicate detection accuracy ≥95% for phone/email/Kakao ID matches
- Search performance meets PRD requirements (<150ms p95)
- Mobile responsive design on various viewport sizes

### 2. Performance Tests (`performance.spec.ts`)

**Performance benchmarking and validation:**

- **Search Performance**: P95/P99 latency measurements across search scenarios
- **Bulk Operations**: Tag application performance for 1000+ contacts
- **Import Performance**: Large dataset (10K records) within 10-minute requirement
- **Export Performance**: 5K record export within 2-minute target
- **UI Responsiveness**: Interface response time under load conditions

**Performance Thresholds:**
- Search P95: <500ms (E2E overhead allowance for <150ms backend target)
- Bulk operations: <30 seconds for 1000 contacts
- Large import: <10 minutes for 10K records (PRD requirement)
- Export preparation: <2 minutes for 5K records

### 3. Security Tests (`security.spec.ts`)

**Comprehensive security validation:**

- **RLS Tenant Isolation**: Multi-tenant data separation validation
- **Authentication/Authorization**: Role-based access control testing
- **PII Protection**: Data encryption verification, secure token validation
- **XSS Protection**: Cross-site scripting attack prevention
- **SQL Injection**: Database injection attack prevention
- **API Security**: Direct API access validation with tenant isolation

**Security Validations:**
- Tenant A cannot access Tenant B data through UI or API
- Staff/Admin role permissions properly enforced
- Export tokens are encrypted and expire appropriately
- User input is properly sanitized and escaped
- SQL injection attempts are blocked without exposing errors

## 🏗️ Test Architecture

### Configuration (`playwright.config.ts`)

- **Multi-browser testing**: Chromium, Firefox, Safari, Mobile Chrome/Safari
- **Parallel execution**: Optimized for CI/CD performance
- **Web servers**: Automatic frontend (Next.js) and backend (.NET) startup
- **Reporting**: HTML, JSON, and JUnit formats for CI integration
- **Retry logic**: Automatic retry on CI failures
- **Screenshot/video**: Capture on failures for debugging

### Test Infrastructure

- **Database isolation**: Each test gets clean PostgreSQL instance via Testcontainers
- **Authentication mocking**: Configurable tenant/user context for testing
- **Data generation**: Realistic Korean contact data with configurable duplicates
- **Network monitoring**: Request/response validation for security testing
- **Performance measurement**: High-resolution timing for benchmarks

## 📈 CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/e2e-tests.yml`)

**Multi-stage pipeline:**

1. **Setup Phase**: PostgreSQL 16 + Redis services, dependency installation
2. **E2E Tests**: Parallel execution across browsers (Chromium, Firefox, Safari)
3. **Performance Tests**: Dedicated performance benchmarking with large datasets
4. **Security Tests**: Isolated security validation suite
5. **Results Aggregation**: Summary generation with performance metrics

**Artifacts Generated:**
- HTML test reports with screenshots/videos
- JSON results for programmatic analysis
- JUnit XML for CI integration
- Performance benchmark data
- Security validation results

### Environment Configuration

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:7001

# Backend  
ASPNETCORE_ENVIRONMENT=Test
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=productivity_hub_test;Username=postgres;Password=testpass123
ConnectionStrings__RedisConnection=localhost:6379
```

## 🎯 Performance Requirements Validation

**Search Performance:**
- Target: <150ms p95 (backend)
- E2E Allowance: <500ms p95 (includes network/rendering overhead)
- Measurement: Multiple search scenarios with p95/p99 calculations

**Import Performance:**
- Target: ≤10 minutes for 100K records (PRD requirement)
- Test: 10K records validation (scaled down for CI speed)
- Validation: Progress tracking, error handling, completion verification

**Export Performance:**
- Target: <2 minutes for 50K records
- Test: 5K records validation
- Security: Token-based download with expiration validation

## 🔒 Security Testing Coverage

**Row-Level Security (RLS):**
- Multi-tenant data isolation via PostgreSQL RLS
- API-level access validation with different tenant contexts
- Export token tenant validation

**Authentication & Authorization:**
- Unauthenticated access blocking
- Role-based UI element visibility (Staff vs Admin)
- API endpoint authorization validation

**Data Protection:**
- PII encryption in transit validation
- XSS attack prevention through input sanitization
- SQL injection protection with parameterized queries

## 🐛 Debugging and Troubleshooting

### Running Tests Locally

```bash
# Debug mode with browser visible
npm run test:debug

# UI mode for interactive debugging
npm run test:ui

# Run specific test file
npx playwright test contact-workflow.spec.ts

# Run specific test with grep
npx playwright test --grep "search performance"
```

### Common Issues

1. **Test Timeouts**: Increase timeout for slow operations (import/export)
2. **Database Isolation**: Ensure clean state between tests
3. **Authentication Context**: Verify tenant/user context is properly set
4. **Network Delays**: Allow for network latency in performance assertions

### CI/CD Debugging

- Check artifact uploads for detailed HTML reports
- Review screenshot/video captures for failure analysis
- Monitor performance metrics across CI runs
- Validate database state and service health

## 📝 Test Data Management

**Realistic Test Data:**
- Korean names and phone numbers using Bogus library patterns
- Configurable duplicate percentage (15-30% typical)
- PII-safe test data that can be safely logged/reported

**Data Cleanup:**
- Automatic cleanup between test runs
- Isolated tenant contexts prevent cross-test contamination
- Database migrations ensure consistent schema state

## 🔄 Maintenance and Updates

**Regular Updates:**
- Playwright version updates for latest browser support
- Test data generation updates for realism
- Performance threshold adjustments based on infrastructure changes
- Security test updates for new threat vectors

**Monitoring:**
- Performance regression detection across CI runs  
- Test flake rate monitoring and stabilization
- Coverage gap identification and test expansion