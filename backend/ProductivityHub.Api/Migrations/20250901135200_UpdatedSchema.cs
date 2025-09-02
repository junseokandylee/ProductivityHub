using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdatedSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "alert_policy",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: true),
                    failure_rate_threshold = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    min_consecutive_buckets = table.Column<int>(type: "integer", nullable: false),
                    evaluation_window_seconds = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    updated_by = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
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
                });

            migrationBuilder.CreateTable(
                name: "alert_state",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    triggered = table.Column<bool>(type: "boolean", nullable: false),
                    last_failure_rate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    consecutive_breaches = table.Column<int>(type: "integer", nullable: false),
                    last_evaluated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_triggered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_cleared_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                });

            migrationBuilder.CreateTable(
                name: "campaign_metrics",
                columns: table => new
                {
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sent_total = table.Column<long>(type: "bigint", nullable: false),
                    delivered_total = table.Column<long>(type: "bigint", nullable: false),
                    failed_total = table.Column<long>(type: "bigint", nullable: false),
                    open_total = table.Column<long>(type: "bigint", nullable: false),
                    click_total = table.Column<long>(type: "bigint", nullable: false),
                    sms_sent = table.Column<long>(type: "bigint", nullable: false),
                    sms_delivered = table.Column<long>(type: "bigint", nullable: false),
                    sms_failed = table.Column<long>(type: "bigint", nullable: false),
                    kakao_sent = table.Column<long>(type: "bigint", nullable: false),
                    kakao_delivered = table.Column<long>(type: "bigint", nullable: false),
                    kakao_failed = table.Column<long>(type: "bigint", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_metrics", x => x.campaign_id);
                    table.ForeignKey(
                        name: "FK_campaign_metrics_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_metrics_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "campaign_metrics_minute",
                columns: table => new
                {
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bucket_minute = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    attempted = table.Column<long>(type: "bigint", nullable: false),
                    delivered = table.Column<long>(type: "bigint", nullable: false),
                    failed = table.Column<long>(type: "bigint", nullable: false),
                    open = table.Column<long>(type: "bigint", nullable: false),
                    click = table.Column<long>(type: "bigint", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_metrics_minute", x => new { x.campaign_id, x.bucket_minute });
                    table.ForeignKey(
                        name: "FK_campaign_metrics_minute_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_metrics_minute_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contact_groups",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contact_groups", x => x.id);
                    table.ForeignKey(
                        name: "FK_contact_groups_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contact_segments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    filter_json = table.Column<string>(type: "jsonb", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contact_segments", x => x.id);
                    table.ForeignKey(
                        name: "FK_contact_segments_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contact_group_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contact_group_members", x => x.id);
                    table.ForeignKey(
                        name: "FK_contact_group_members_contact_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "contact_groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_contact_group_members_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_alert_policy_campaign_id",
                table: "alert_policy",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_alert_policy_tenant_id",
                table: "alert_policy",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_AlertPolicy_TenantId_CampaignId",
                table: "alert_policy",
                columns: new[] { "tenant_id", "campaign_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_alert_state_campaign_id",
                table: "alert_state",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_alert_state_tenant_id",
                table: "alert_state",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_AlertState_TenantId_CampaignId",
                table: "alert_state",
                columns: new[] { "tenant_id", "campaign_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AlertState_Triggered_LastEvaluated",
                table: "alert_state",
                columns: new[] { "triggered", "last_evaluated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_campaign_metrics_tenant_id",
                table: "campaign_metrics",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_metrics_updated_at",
                table: "campaign_metrics",
                column: "updated_at");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_metrics_minute_bucket_minute",
                table: "campaign_metrics_minute",
                column: "bucket_minute");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_metrics_minute_tenant_id",
                table: "campaign_metrics_minute",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignMetricsMinute_CampaignId_BucketMinute",
                table: "campaign_metrics_minute",
                columns: new[] { "campaign_id", "bucket_minute" });

            migrationBuilder.CreateIndex(
                name: "IX_contact_group_members_contact_id",
                table: "contact_group_members",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_group_members_group_id",
                table: "contact_group_members",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_ContactGroupMembers_GroupId_ContactId",
                table: "contact_group_members",
                columns: new[] { "group_id", "contact_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contact_groups_tenant_id",
                table: "contact_groups",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ContactGroups_TenantId_Name",
                table: "contact_groups",
                columns: new[] { "tenant_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contact_segments_tenant_id",
                table: "contact_segments",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ContactSegments_TenantId_Name",
                table: "contact_segments",
                columns: new[] { "tenant_id", "name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alert_policy");

            migrationBuilder.DropTable(
                name: "alert_state");

            migrationBuilder.DropTable(
                name: "campaign_metrics");

            migrationBuilder.DropTable(
                name: "campaign_metrics_minute");

            migrationBuilder.DropTable(
                name: "contact_group_members");

            migrationBuilder.DropTable(
                name: "contact_segments");

            migrationBuilder.DropTable(
                name: "contact_groups");
        }
    }
}
