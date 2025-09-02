using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAlertTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create alert_policy table for configurable failure thresholds
            migrationBuilder.CreateTable(
                name: "alert_policy",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: true), // nullable for tenant defaults
                    failure_rate_threshold = table.Column<decimal>(type: "numeric(5,4)", nullable: false, defaultValue: 0.05m),
                    min_consecutive_buckets = table.Column<int>(type: "integer", nullable: false, defaultValue: 2),
                    evaluation_window_seconds = table.Column<int>(type: "integer", nullable: false, defaultValue: 60),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()"),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    updated_by = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_policy", x => x.id);
                    table.ForeignKey(
                        name: "FK_alert_policy_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.CheckConstraint("CK_alert_policy_failure_rate_threshold", "failure_rate_threshold >= 0.0001 AND failure_rate_threshold <= 1.0000");
                    table.CheckConstraint("CK_alert_policy_min_consecutive_buckets", "min_consecutive_buckets >= 1 AND min_consecutive_buckets <= 60");
                    table.CheckConstraint("CK_alert_policy_evaluation_window_seconds", "evaluation_window_seconds >= 60 AND evaluation_window_seconds <= 3600");
                });

            // Create alert_state table for tracking current alert status
            migrationBuilder.CreateTable(
                name: "alert_state",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    triggered = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    last_failure_rate = table.Column<decimal>(type: "numeric(5,4)", nullable: false, defaultValue: 0m),
                    consecutive_breaches = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_evaluated_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()"),
                    last_triggered_at = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    last_cleared_at = table.Column<DateTime>(type: "timestamptz", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamptz", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alert_state", x => x.id);
                    table.ForeignKey(
                        name: "FK_alert_state_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.CheckConstraint("CK_alert_state_last_failure_rate", "last_failure_rate >= 0.0000 AND last_failure_rate <= 1.0000");
                    table.CheckConstraint("CK_alert_state_consecutive_breaches", "consecutive_breaches >= 0");
                });

            // Create indexes for efficient queries
            migrationBuilder.CreateIndex(
                name: "IX_alert_policy_tenant_id_campaign_id",
                table: "alert_policy",
                columns: new[] { "tenant_id", "campaign_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_alert_policy_tenant_id_null_campaign",
                table: "alert_policy",
                column: "tenant_id",
                unique: true,
                filter: "campaign_id IS NULL"); // Unique tenant default policy

            migrationBuilder.CreateIndex(
                name: "IX_alert_state_tenant_id_campaign_id",
                table: "alert_state",
                columns: new[] { "tenant_id", "campaign_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_alert_state_campaign_id",
                table: "alert_state",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_alert_state_triggered_last_evaluated",
                table: "alert_state",
                columns: new[] { "triggered", "last_evaluated_at" });

            // Enable RLS on both tables
            migrationBuilder.Sql("ALTER TABLE alert_policy ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("ALTER TABLE alert_state ENABLE ROW LEVEL SECURITY;");

            // Create RLS policies for alert_policy
            migrationBuilder.Sql(@"
                CREATE POLICY alert_policy_tenant_isolation ON alert_policy 
                FOR ALL 
                USING (tenant_id = COALESCE(current_setting('rls.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
                WITH CHECK (tenant_id = COALESCE(current_setting('rls.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
            ");

            // Create RLS policies for alert_state
            migrationBuilder.Sql(@"
                CREATE POLICY alert_state_tenant_isolation ON alert_state 
                FOR ALL 
                USING (tenant_id = COALESCE(current_setting('rls.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid))
                WITH CHECK (tenant_id = COALESCE(current_setting('rls.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid));
            ");

            // Create updated_at trigger for alert_policy
            migrationBuilder.Sql(@"
                CREATE TRIGGER alert_policy_updated_at_trigger
                    BEFORE UPDATE ON alert_policy
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            ");

            // Create updated_at trigger for alert_state
            migrationBuilder.Sql(@"
                CREATE TRIGGER alert_state_updated_at_trigger
                    BEFORE UPDATE ON alert_state
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "alert_state");
            migrationBuilder.DropTable(name: "alert_policy");
        }
    }
}