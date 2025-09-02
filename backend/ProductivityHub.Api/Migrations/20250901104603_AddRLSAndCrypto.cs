using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRLSAndCrypto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enable pgcrypto extension
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";");

            // Enable Row Level Security on tenant-related tables
            migrationBuilder.Sql("ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE users ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE message_history ENABLE ROW LEVEL SECURITY;");

            // Create RLS policies (these will be customized based on application requirements)
            // For now, create basic policies that require tenant_id context
            
            // Users can only see their own tenant's data (using public role for development)
            migrationBuilder.Sql(@"
                CREATE POLICY tenant_isolation_policy ON users
                FOR ALL TO public
                USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
            ");

            migrationBuilder.Sql(@"
                CREATE POLICY tenant_isolation_policy ON contacts
                FOR ALL TO public
                USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
            ");

            migrationBuilder.Sql(@"
                CREATE POLICY tenant_isolation_policy ON campaigns
                FOR ALL TO public
                USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
            ");

            // Junction table policies
            migrationBuilder.Sql(@"
                CREATE POLICY tenant_isolation_policy ON campaign_contacts
                FOR ALL TO public
                USING (EXISTS (
                    SELECT 1 FROM campaigns c 
                    WHERE c.id = campaign_id 
                    AND c.tenant_id = current_setting('app.current_tenant_id', true)::uuid
                ));
            ");

            migrationBuilder.Sql(@"
                CREATE POLICY tenant_isolation_policy ON message_history
                FOR ALL TO public
                USING (EXISTS (
                    SELECT 1 FROM campaigns c 
                    WHERE c.id = campaign_id 
                    AND c.tenant_id = current_setting('app.current_tenant_id', true)::uuid
                ));
            ");

            // Tenant table policy - users can only see their own tenant
            migrationBuilder.Sql(@"
                CREATE POLICY tenant_self_policy ON tenants
                FOR ALL TO public
                USING (id = current_setting('app.current_tenant_id', true)::uuid);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop RLS policies
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON users;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON contacts;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON campaigns;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON campaign_contacts;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON message_history;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_self_policy ON tenants;");

            // Disable Row Level Security
            migrationBuilder.Sql("ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE users DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE campaign_contacts DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE message_history DISABLE ROW LEVEL SECURITY;");

            // Note: We don't drop pgcrypto extension as it might be used by other applications
        }
    }
}
