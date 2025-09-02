using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "message_content",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "priority_channels",
                table: "campaigns");

            migrationBuilder.RenameColumn(
                name: "total_recipients",
                table: "campaigns",
                newName: "quota_used");

            // Convert status column from varchar to integer with explicit casting
            migrationBuilder.Sql("ALTER TABLE campaigns ALTER COLUMN status TYPE integer USING CASE WHEN status = 'Draft' THEN 0 WHEN status = 'Scheduled' THEN 1 WHEN status = 'Running' THEN 2 WHEN status = 'Completed' THEN 3 WHEN status = 'Cancelled' THEN 4 ELSE 0 END;");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "campaigns",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<decimal>(
                name: "estimated_cost",
                table: "campaigns",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "estimated_recipients",
                table: "campaigns",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "message_body",
                table: "campaigns",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "message_title",
                table: "campaigns",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "campaigns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "variables",
                table: "campaigns",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "campaign_audience",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    group_ids = table.Column<string>(type: "jsonb", nullable: true),
                    segment_ids = table.Column<string>(type: "jsonb", nullable: true),
                    filter_json = table.Column<string>(type: "jsonb", nullable: true),
                    include_all = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_audience", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_audience_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "campaign_channels",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    channel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    order_index = table.Column<int>(type: "integer", nullable: false),
                    fallback_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_channels", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_channels_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_campaigns_created_by",
                table: "campaigns",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_campaigns_updated_by",
                table: "campaigns",
                column: "updated_by");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_audience_campaign_id",
                table: "campaign_audience",
                column: "campaign_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_campaign_channels_campaign_id",
                table: "campaign_channels",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignChannels_CampaignId_OrderIndex",
                table: "campaign_channels",
                columns: new[] { "campaign_id", "order_index" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_campaigns_users_created_by",
                table: "campaigns",
                column: "created_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_campaigns_users_updated_by",
                table: "campaigns",
                column: "updated_by",
                principalTable: "users",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_campaigns_users_created_by",
                table: "campaigns");

            migrationBuilder.DropForeignKey(
                name: "FK_campaigns_users_updated_by",
                table: "campaigns");

            migrationBuilder.DropTable(
                name: "campaign_audience");

            migrationBuilder.DropTable(
                name: "campaign_channels");

            migrationBuilder.DropIndex(
                name: "IX_campaigns_created_by",
                table: "campaigns");

            migrationBuilder.DropIndex(
                name: "IX_campaigns_updated_by",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "estimated_cost",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "estimated_recipients",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "message_body",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "message_title",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "variables",
                table: "campaigns");

            migrationBuilder.RenameColumn(
                name: "quota_used",
                table: "campaigns",
                newName: "total_recipients");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "campaigns",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "campaigns",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "message_content",
                table: "campaigns",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "priority_channels",
                table: "campaigns",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }
    }
}
