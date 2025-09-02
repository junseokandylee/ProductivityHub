-- Validation Script for Seed Data
-- Run this after seeding to verify the data was created correctly

\echo '🔍 Political Productivity Hub - Seed Data Validation'
\echo '=================================================='

\echo ''
\echo '📊 Table Record Counts:'
\echo '----------------------'

SELECT 
    'tenants' as table_name, 
    COUNT(*) as record_count,
    'Expected: 3' as expected
FROM tenants 

UNION ALL

SELECT 
    'users' as table_name, 
    COUNT(*) as record_count,
    'Expected: 15 (5 per tenant)' as expected
FROM users 

UNION ALL

SELECT 
    'contacts' as table_name, 
    COUNT(*) as record_count,
    'Expected: ~3000 (800-1200 per tenant)' as expected
FROM contacts

UNION ALL

SELECT 
    'campaigns' as table_name, 
    COUNT(*) as record_count,
    'Expected: ~24 (5-11 per tenant)' as expected
FROM campaigns

UNION ALL

SELECT 
    'tags' as table_name, 
    COUNT(*) as record_count,
    'Expected: ~90 (~30 per tenant)' as expected
FROM tags

UNION ALL

SELECT 
    'contact_tags' as table_name, 
    COUNT(*) as record_count,
    'Expected: ~6000+ (multiple tags per contact)' as expected
FROM contact_tags

ORDER BY table_name;

\echo ''
\echo '🏢 Tenant Information:'
\echo '--------------------'

SELECT 
    id,
    name as tenant_name,
    description,
    is_active,
    created_at::date as created_date
FROM tenants
ORDER BY name;

\echo ''
\echo '👥 User Distribution by Tenant:'
\echo '------------------------------'

SELECT 
    t.name as tenant_name,
    u.role,
    COUNT(*) as user_count
FROM tenants t
JOIN users u ON t.id = u.tenant_id
GROUP BY t.name, u.role
ORDER BY t.name, u.role;

\echo ''
\echo '📝 Sample User Credentials (for testing):'
\echo '----------------------------------------'

SELECT 
    u.email,
    u.role,
    t.name as tenant_name,
    'Password123!' as password_hint
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.role = 'Owner'
ORDER BY t.name;

\echo ''
\echo '📞 Contact Statistics by Tenant:'
\echo '-------------------------------'

SELECT 
    t.name as tenant_name,
    COUNT(c.id) as total_contacts,
    COUNT(c.id) FILTER (WHERE c.is_active = true) as active_contacts,
    COUNT(c.id) FILTER (WHERE c.phone_enc IS NOT NULL) as contacts_with_phone,
    COUNT(c.id) FILTER (WHERE c.email_enc IS NOT NULL) as contacts_with_email,
    COUNT(c.id) FILTER (WHERE c.kakao_enc IS NOT NULL) as contacts_with_kakao
FROM tenants t
LEFT JOIN contacts c ON t.id = c.tenant_id
GROUP BY t.id, t.name
ORDER BY t.name;

\echo ''
\echo '🏷️  Tag Distribution:'
\echo '-------------------'

SELECT 
    t.name as tenant_name,
    COUNT(tag.id) as total_tags
FROM tenants t
LEFT JOIN tags tag ON t.id = tag.tenant_id
GROUP BY t.id, t.name
ORDER BY t.name;

\echo ''
\echo '📧 Campaign Status Distribution:'
\echo '------------------------------'

SELECT 
    t.name as tenant_name,
    c.status,
    COUNT(*) as campaign_count
FROM tenants t
LEFT JOIN campaigns c ON t.id = c.tenant_id
GROUP BY t.name, c.status
ORDER BY t.name, c.status;

\echo ''
\echo '📈 Data Quality Checks:'
\echo '---------------------'

-- Check for contacts without encrypted PII data
SELECT 
    'Contacts without phone or email' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS' 
        ELSE '⚠️  REVIEW' 
    END as status
FROM contacts 
WHERE phone_enc IS NULL AND email_enc IS NULL

UNION ALL

-- Check for users with invalid roles
SELECT 
    'Users with invalid roles' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM users 
WHERE role NOT IN ('Owner', 'Admin', 'Staff')

UNION ALL

-- Check for tenants without users
SELECT 
    'Tenants without users' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS' 
        ELSE '⚠️  REVIEW' 
    END as status
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
WHERE u.id IS NULL

UNION ALL

-- Check for campaigns without valid status
SELECT 
    'Campaigns with invalid status' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM campaigns 
WHERE status NOT IN ('Draft', 'Queued', 'Processing', 'Sending', 'Completed', 'Failed', 'Cancelled', 'Paused');

\echo ''
\echo '🎯 Sample Data Preview:'
\echo '---------------------'

\echo ''
\echo 'Sample Contacts (first 5):'
SELECT 
    c.full_name,
    CASE 
        WHEN c.phone_enc IS NOT NULL THEN '[ENCRYPTED]'
        ELSE NULL 
    END as phone_status,
    CASE 
        WHEN c.email_enc IS NOT NULL THEN '[ENCRYPTED]'
        ELSE NULL 
    END as email_status,
    c.is_active,
    t.name as tenant
FROM contacts c
JOIN tenants t ON c.tenant_id = t.id
ORDER BY c.created_at
LIMIT 5;

\echo ''
\echo 'Sample Campaigns (first 5):'
SELECT 
    c.name,
    c.status,
    c.estimated_recipients,
    c.estimated_cost,
    t.name as tenant
FROM campaigns c
JOIN tenants t ON c.tenant_id = t.id
ORDER BY c.created_at
LIMIT 5;

\echo ''
\echo '✅ Seed Data Validation Complete!'
\echo ''
\echo 'Next Steps:'
\echo '- Test login with sample credentials'
\echo '- Verify contact search and filtering'
\echo '- Test campaign creation workflow'
\echo '- Check real-time metrics and dashboard'