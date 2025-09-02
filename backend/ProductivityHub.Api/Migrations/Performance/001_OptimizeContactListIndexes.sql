-- Performance optimization migration for contact list queries
-- Target: <150ms p95 response time for contact list operations

-- 1. Create GIN index for full-text search on contact names
-- This supports fast text search for Korean names and other text patterns
CREATE INDEX IF NOT EXISTS ix_contacts_fullname_gin 
ON contacts USING gin(to_tsvector('simple', full_name));

-- 2. Create trigram GIN index for partial text matching
-- This supports LIKE and ILIKE queries with better performance than standard B-tree
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS ix_contacts_fullname_trigram 
ON contacts USING gin(full_name gin_trgm_ops);

-- 3. Optimize covering index for contact list queries (already defined in ApplicationDbContext)
-- The EF Core index IX_Contacts_List_Cover covers (tenant_id, updated_at, id) INCLUDE (full_name, is_active)

-- 4. Create composite index for filtered queries
-- This supports queries with tenant + active status + sorting
CREATE INDEX IF NOT EXISTS ix_contacts_tenant_active_updated 
ON contacts(tenant_id, is_active, updated_at DESC) 
WHERE deleted_at IS NULL;

-- 5. Create partial index for active contacts only (most common query pattern)
CREATE INDEX IF NOT EXISTS ix_contacts_active_only 
ON contacts(tenant_id, updated_at DESC, id) 
INCLUDE (full_name, phone_hash, email_hash, kakao_hash)
WHERE is_active = true AND deleted_at IS NULL;

-- 6. Hash-based indexes for deduplication queries are efficient for exact lookups
-- These are already defined in ApplicationDbContext: IX_Contacts_TenantId_PhoneHash, etc.

-- 7. Optimize ContactTags join performance
CREATE INDEX IF NOT EXISTS ix_contact_tags_composite 
ON contact_tags(contact_id, tag_id, tenant_id);

-- 8. Create index for tag-based filtering
CREATE INDEX IF NOT EXISTS ix_contact_tags_tag_tenant 
ON contact_tags(tag_id, tenant_id) 
INCLUDE (contact_id);

-- 9. Update table statistics to ensure optimal query planning
ANALYZE contacts;
ANALYZE contact_tags;
ANALYZE tags;

-- 10. Ensure auto-vacuum is properly configured for performance tables
-- This should be done at the database level but we document it here
/*
ALTER TABLE contacts SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 200
);

ALTER TABLE contact_tags SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);
*/

-- Performance validation queries (for monitoring)
/*
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename IN ('contacts', 'contact_tags') 
ORDER BY idx_scan DESC;

-- Check cache hit ratios
SELECT 
    tablename,
    heap_blks_read,
    heap_blks_hit,
    CASE 
        WHEN heap_blks_hit + heap_blks_read = 0 THEN 0
        ELSE ROUND(heap_blks_hit::numeric / (heap_blks_hit + heap_blks_read) * 100, 2)
    END as cache_hit_ratio
FROM pg_statio_user_tables 
WHERE tablename IN ('contacts', 'contact_tags')
ORDER BY cache_hit_ratio DESC;

-- Test query performance (example)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT c.id, c.full_name, c.is_active, c.updated_at,
       string_agg(t.name, ', ' ORDER BY t.name) as tags
FROM contacts c
LEFT JOIN contact_tags ct ON c.id = ct.contact_id
LEFT JOIN tags t ON ct.tag_id = t.id
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000000'
  AND c.deleted_at IS NULL
  AND (c.full_name ILIKE '%김%' OR c.phone_hash LIKE '%010%')
GROUP BY c.id, c.full_name, c.is_active, c.updated_at
ORDER BY c.updated_at DESC
LIMIT 20;
*/