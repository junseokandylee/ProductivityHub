using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ProductivityHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignMetricsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Campaign Metrics aggregate table
            migrationBuilder.CreateTable(
                name: "campaign_metrics",
                columns: table => new
                {
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sent_total = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    delivered_total = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    failed_total = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    open_total = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    click_total = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    sms_sent = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    sms_delivered = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    sms_failed = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    kakao_sent = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    kakao_delivered = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    kakao_failed = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_campaign_metrics", x => x.campaign_id);
                    table.ForeignKey(
                        name: "fk_campaign_metrics_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_campaign_metrics_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Campaign Metrics minute-level time-series table
            migrationBuilder.CreateTable(
                name: "campaign_metrics_minute",
                columns: table => new
                {
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bucket_minute = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    attempted = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    delivered = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    failed = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    open = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    click = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_campaign_metrics_minute", x => new { x.campaign_id, x.bucket_minute });
                    table.ForeignKey(
                        name: "fk_campaign_metrics_minute_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_campaign_metrics_minute_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Indexes for efficient queries
            migrationBuilder.CreateIndex(
                name: "ix_campaign_metrics_tenant_id",
                table: "campaign_metrics",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_campaign_metrics_updated_at",
                table: "campaign_metrics",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "ix_campaign_metrics_minute_tenant_id",
                table: "campaign_metrics_minute",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_campaign_metrics_minute_bucket_minute",
                table: "campaign_metrics_minute",
                column: "bucket_minute")
                .Annotation("Npgsql:IndexMethod", "brin"); // BRIN index for time-series data

            migrationBuilder.CreateIndex(
                name: "ix_campaign_metrics_minute_campaign_bucket",
                table: "campaign_metrics_minute", 
                columns: new[] { "campaign_id", "bucket_minute" });

            // RLS policies for multi-tenant isolation
            migrationBuilder.Sql(@"
                ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY campaign_metrics_tenant_isolation ON campaign_metrics
                    FOR ALL 
                    TO authenticated_user
                    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE campaign_metrics_minute ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY campaign_metrics_minute_tenant_isolation ON campaign_metrics_minute
                    FOR ALL 
                    TO authenticated_user
                    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
            ");

            // Function to automatically update updated_at timestamp
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION update_campaign_metrics_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            ");

            // Triggers for automatic timestamp updates
            migrationBuilder.Sql(@"
                CREATE TRIGGER campaign_metrics_update_timestamp
                    BEFORE UPDATE ON campaign_metrics
                    FOR EACH ROW
                    EXECUTE FUNCTION update_campaign_metrics_updated_at();
            ");

            migrationBuilder.Sql(@"
                CREATE TRIGGER campaign_metrics_minute_update_timestamp
                    BEFORE UPDATE ON campaign_metrics_minute
                    FOR EACH ROW
                    EXECUTE FUNCTION update_campaign_metrics_updated_at();
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop triggers and functions
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS campaign_metrics_update_timestamp ON campaign_metrics;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS campaign_metrics_minute_update_timestamp ON campaign_metrics_minute;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS update_campaign_metrics_updated_at();");

            // Drop RLS policies
            migrationBuilder.Sql("DROP POLICY IF EXISTS campaign_metrics_tenant_isolation ON campaign_metrics;");
            migrationBuilder.Sql("DROP POLICY IF EXISTS campaign_metrics_minute_tenant_isolation ON campaign_metrics_minute;");

            migrationBuilder.DropTable(name: "campaign_metrics_minute");
            migrationBuilder.DropTable(name: "campaign_metrics");
        }
    }
}