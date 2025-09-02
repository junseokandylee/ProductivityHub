using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class PerformanceOptimizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Critical PostgreSQL-specific optimizations for 100K+ contacts
            
            // Enable PostgreSQL extensions if not already enabled
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"btree_gin\";");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"btree_gist\";");
            
            // 2. Advanced full-text search index for contact names with trigram support
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contacts_fullname_trgm 
                ON contacts USING gin(full_name gin_trgm_ops)
                WHERE deleted_at IS NULL;
            ");
            
            // 3. Optimized composite index for tag filtering with included columns
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contact_tags_tenant_tag_optimized 
                ON contact_tags(tenant_id, tag_id) 
                INCLUDE (contact_id)
                WHERE deleted_at IS NULL;
            ");
            
            // 4. Covering index for contact search with all frequently accessed columns
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contacts_search_optimized 
                ON contacts(tenant_id, is_active, updated_at DESC, id DESC)
                INCLUDE (full_name, created_at, phone_hash, email_hash, kakao_hash)
                WHERE deleted_at IS NULL;
            ");
            
            // 5. Hash indexes for exact PII lookups (faster than btree for equality)
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contacts_phone_hash_exact 
                ON contacts USING hash(phone_hash)
                WHERE phone_hash IS NOT NULL AND deleted_at IS NULL;
            ");
            
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contacts_email_hash_exact 
                ON contacts USING hash(email_hash)
                WHERE email_hash IS NOT NULL AND deleted_at IS NULL;
            ");
            
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contacts_kakao_hash_exact 
                ON contacts USING hash(kakao_hash)
                WHERE kakao_hash IS NOT NULL AND deleted_at IS NULL;
            ");
            
            // 6. Optimized index for contact history queries
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contact_history_optimized 
                ON contact_history(tenant_id, contact_id, occurred_at DESC)
                INCLUDE (type, payload, user_name)
                WHERE deleted_at IS NULL;
            ");
            
            // 7. Bulk operations optimization index
            migrationBuilder.Sql(@"
                CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_contacts_bulk_operations 
                ON contacts(tenant_id, id, updated_at)
                WHERE is_active = true AND deleted_at IS NULL;
            ");
            
            // 8. Analyze tables for optimal query planning
            migrationBuilder.Sql("ANALYZE contacts, contact_tags, contact_history;");
            
            // 9. Set optimal PostgreSQL settings for this workload
            migrationBuilder.Sql(@"
                -- Increase statistics for better query planning on large tables
                ALTER TABLE contacts ALTER COLUMN full_name SET STATISTICS 1000;
                ALTER TABLE contacts ALTER COLUMN updated_at SET STATISTICS 1000;
                ALTER TABLE contact_tags ALTER COLUMN tag_id SET STATISTICS 1000;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop performance-specific indexes in reverse order
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contacts_bulk_operations;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contact_history_optimized;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contacts_kakao_hash_exact;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contacts_email_hash_exact;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contacts_phone_hash_exact;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contacts_search_optimized;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contact_tags_tenant_tag_optimized;");
            migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS ix_contacts_fullname_trgm;");
            
            // Reset statistics to default
            migrationBuilder.Sql(@"
                ALTER TABLE contacts ALTER COLUMN full_name SET STATISTICS DEFAULT;
                ALTER TABLE contacts ALTER COLUMN updated_at SET STATISTICS DEFAULT;
                ALTER TABLE contact_tags ALTER COLUMN tag_id SET STATISTICS DEFAULT;
            ");
        }
    }
}
