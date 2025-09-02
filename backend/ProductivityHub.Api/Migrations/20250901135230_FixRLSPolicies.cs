using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixRLSPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop existing problematic policies that use 'authenticated' role
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON users;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON contacts;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON campaigns;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON campaign_contacts;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_isolation_policy ON message_history;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS tenant_self_policy ON tenants;");

            // Temporarily disable RLS for development - we'll implement proper policies later
            migrationBuilder.Sql("ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE users DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE campaign_contacts DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE message_history DISABLE ROW LEVEL SECURITY;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
