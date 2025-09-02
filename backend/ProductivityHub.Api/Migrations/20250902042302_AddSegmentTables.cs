using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSegmentTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "segments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    rules = table.Column<string>(type: "jsonb", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_segments", x => x.id);
                    table.ForeignKey(
                        name: "FK_segments_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_segments_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "segment_usage_audit",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    segment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    context = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    result_count = table.Column<int>(type: "integer", nullable: true),
                    execution_time_ms = table.Column<int>(type: "integer", nullable: true),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_segment_usage_audit", x => x.id);
                    table.ForeignKey(
                        name: "FK_segment_usage_audit_segments_segment_id",
                        column: x => x.segment_id,
                        principalTable: "segments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_segment_usage_audit_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_segment_usage_audit_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_segment_usage_audit_segment_id",
                table: "segment_usage_audit",
                column: "segment_id");

            migrationBuilder.CreateIndex(
                name: "IX_segment_usage_audit_tenant_id",
                table: "segment_usage_audit",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_segment_usage_audit_user_id",
                table: "segment_usage_audit",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_SegmentUsageAudit_OccurredAt",
                table: "segment_usage_audit",
                column: "occurred_at");

            migrationBuilder.CreateIndex(
                name: "IX_SegmentUsageAudit_Tenant_Segment_Time",
                table: "segment_usage_audit",
                columns: new[] { "tenant_id", "segment_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_Segments_CreatedBy",
                table: "segments",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_segments_tenant_id",
                table: "segments",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Segments_TenantId_Active_Updated",
                table: "segments",
                columns: new[] { "tenant_id", "is_active", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_Segments_TenantId_Name",
                table: "segments",
                columns: new[] { "tenant_id", "name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "segment_usage_audit");

            migrationBuilder.DropTable(
                name: "segments");
        }
    }
}
