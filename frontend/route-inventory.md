# Route Inventory - 정치생산성허브

## Complete Route Inventory (38 routes)

### 1. Home & Dashboard (2 routes)
- ✅ `/` - Main home page
- ✅ `/dashboard` - Dashboard page

### 2. Authentication Routes (4 routes)
- ✅ `/auth/login` - Login with email/password and SSO
- ✅ `/auth/signup` - Signup with invite code or organization
- ✅ `/auth/reset-password` - Password reset flow
- ✅ `/auth/verify-email` - Email verification

### 3. Contact Management (7 routes)
- ✅ `/contacts` - Contact list and management
- ✅ `/contacts/[id]` - Contact detail page
- ✅ `/contacts/import` - CSV/Excel import
- ✅ `/contacts/export` - Export functionality
- ✅ `/contacts/deduplication` - Duplicate management
- ✅ `/segments` - Contact segments and smart lists

### 4. Campaign Management (6 routes)
- ✅ `/campaigns` - Campaign list
- ✅ `/campaigns/new` - Campaign wizard
- ✅ `/campaigns/[id]` - Campaign detail
- ✅ `/campaigns/[id]/monitor` - Campaign monitoring
- ✅ `/campaigns/[id]/analytics` - Campaign analytics
- ✅ `/campaigns/[id]/analytics/print` - Print analytics

### 5. Inbox & Messaging (3 routes)
- ✅ `/inbox` - Unified inbox
- ✅ `/inbox/[conversationId]` - Conversation detail
- ✅ `/inbox/auto-reply` - Auto-reply settings

### 6. Reports & Analytics (6 routes)
- ✅ `/reports` - Reports hub
- ✅ `/reports/monthly` - Monthly reports
- ✅ `/reports/campaigns` - Campaign reports
- ✅ `/reports/contacts` - Contact reports
- ✅ `/reports/quota` - Quota reports
- ✅ `/analytics` - Global analytics
- ✅ `/analytics/print` - Print analytics

### 7. Settings & Organization (6 routes)
- ✅ `/settings` - Settings overview
- ✅ `/settings/organization` - Organization settings
- ✅ `/settings/channels` - Channel configuration
- ✅ `/settings/users` - User management
- ✅ `/settings/quota` - Quota management
- ✅ `/settings/security` - Security settings

### 8. Help & Support (5 routes)
- ✅ `/help` - Help center
- ✅ `/help/guide` - User guide
- ✅ `/help/tutorial` - Tutorials
- ✅ `/help/faq` - FAQ
- ✅ `/help/contact` - Contact support

### 9. System/Utility Routes (3 routes)
- ✅ `/unauthorized` - Unauthorized access page
- ✅ `/test-alerts` - Alert testing page
- ⚠️ `/auth/register` - Duplicate of signup (needs cleanup)

## Route Protection Analysis

### Public Routes (4 routes)
- `/auth/login`
- `/auth/signup` 
- `/auth/reset-password`
- `/auth/verify-email`

### Protected Routes (34 routes)
All other routes require authentication

## Missing Expected Routes
Based on T-059 requirements, checking for missing routes:

1. ❌ `/campaigns/create` (task expects this, but we have `/campaigns/new`)
2. ❌ Sample contact ID route (needs test data)
3. ❌ Sample campaign ID route (needs test data)
4. ❌ Sample conversation ID route (needs test data)

## Route Issues Identified

1. **Duplicate Routes**: `/auth/register` exists but `/auth/signup` is the primary signup route
2. **Test Routes**: `/test-alerts` appears to be a development/testing route
3. **Missing Test Data**: Dynamic routes like `/contacts/[id]`, `/campaigns/[id]`, `/inbox/[conversationId]` need sample data for testing

## Navigation Coverage

### Sidebar Navigation
- ✅ Home (/)
- ✅ Contacts (/contacts)
- ✅ Campaigns (/campaigns) 
- ✅ Inbox (/inbox)
- ✅ Reports (/reports)
- ✅ Settings (/settings)

### Header Navigation
- ✅ User profile dropdown with settings/help links
- ✅ Notifications
- ✅ Search functionality

## Next Steps

1. Create Playwright smoke tests for all 35 core routes (excluding duplicates/test routes)
2. Set up test data/fixtures for dynamic routes
3. Validate navigation links and breadcrumbs
4. Document any MVP limitations or stub implementations