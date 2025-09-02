using System;
using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_CreatedAt_Id",
                table: "contacts");

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "contacts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "campaign_variants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    allocation_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    message_content = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    subject_line = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_variants", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_variants_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_variants_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FilePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Progress = table.Column<int>(type: "integer", nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    ProcessedRows = table.Column<int>(type: "integer", nullable: false),
                    ErrorRows = table.Column<int>(type: "integer", nullable: false),
                    ProcessingRate = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    EstimatedSecondsRemaining = table.Column<int>(type: "integer", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    ErrorFilePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ColumnMapping = table.Column<string>(type: "text", nullable: true),
                    ImportOptions = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportJobs_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImportJobs_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "campaign_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    channel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    event_type = table.Column<int>(type: "integer", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    provider_message_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    failure_reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    failure_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ab_group = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    cost_amount = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    meta = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    ip = table.Column<IPAddress>(type: "inet", nullable: true),
                    user_agent_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CampaignVariantId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_campaign_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_campaign_events_campaign_variants_CampaignVariantId",
                        column: x => x.CampaignVariantId,
                        principalTable: "campaign_variants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_campaign_events_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_events_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_campaign_events_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportErrors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ImportJobId = table.Column<Guid>(type: "uuid", nullable: false),
                    RowNumber = table.Column<int>(type: "integer", nullable: false),
                    Column = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ErrorType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RawValue = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SuggestedFix = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportErrors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportErrors_ImportJobs_ImportJobId",
                        column: x => x.ImportJobId,
                        principalTable: "ImportJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "staging_contacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ImportJobId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceRowNumber = table.Column<int>(type: "integer", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PhoneRaw = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PhoneNormalized = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    PhoneHash = table.Column<byte[]>(type: "bytea", nullable: true),
                    PhoneEncrypted = table.Column<byte[]>(type: "bytea", nullable: true),
                    EmailRaw = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EmailNormalized = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EmailHash = table.Column<byte[]>(type: "bytea", nullable: true),
                    EmailEncrypted = table.Column<byte[]>(type: "bytea", nullable: true),
                    KakaoIdRaw = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    KakaoIdNormalized = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    KakaoIdHash = table.Column<byte[]>(type: "bytea", nullable: true),
                    KakaoIdEncrypted = table.Column<byte[]>(type: "bytea", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    TagNames = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ValidationStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ValidationErrors = table.Column<string>(type: "text", nullable: true),
                    IsProcessed = table.Column<bool>(type: "boolean", nullable: false),
                    ContactId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staging_contacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_staging_contacts_ImportJobs_ImportJobId",
                        column: x => x.ImportJobId,
                        principalTable: "ImportJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_staging_contacts_contacts_ContactId",
                        column: x => x.ContactId,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_staging_contacts_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "link_clicks",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<long>(type: "bigint", nullable: false),
                    url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    link_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ip = table.Column<IPAddress>(type: "inet", nullable: true),
                    user_agent_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    referrer = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    clicked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_link_clicks", x => x.id);
                    table.ForeignKey(
                        name: "FK_link_clicks_campaign_events_event_id",
                        column: x => x.event_id,
                        principalTable: "campaign_events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_link_clicks_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_link_clicks_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_link_clicks_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_List_Cover",
                table: "contacts",
                columns: new[] { "tenant_id", "updated_at", "id" })
                .Annotation("Npgsql:IndexInclude", new[] { "full_name", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_Active_Updated",
                table: "contacts",
                columns: new[] { "tenant_id", "is_active", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_CreatedAt_Id",
                table: "contacts",
                columns: new[] { "tenant_id", "created_at", "id" })
                .Annotation("Npgsql:IndexInclude", new[] { "full_name", "updated_at" });

            migrationBuilder.CreateIndex(
                name: "IX_campaign_events_campaign_id",
                table: "campaign_events",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_events_CampaignVariantId",
                table: "campaign_events",
                column: "CampaignVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_events_contact_id",
                table: "campaign_events",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignEvents_Failed",
                table: "campaign_events",
                columns: new[] { "tenant_id", "campaign_id", "occurred_at" },
                filter: "event_type = 'Failed'");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignEvents_Meta_GIN",
                table: "campaign_events",
                column: "meta");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignEvents_Tenant_Campaign_Type_Time",
                table: "campaign_events",
                columns: new[] { "tenant_id", "campaign_id", "event_type", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignEvents_Tenant_Time",
                table: "campaign_events",
                columns: new[] { "tenant_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignVariants_Campaign_Label",
                table: "campaign_variants",
                columns: new[] { "campaign_id", "label" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CampaignVariants_Tenant_Campaign",
                table: "campaign_variants",
                columns: new[] { "tenant_id", "campaign_id" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportErrors_ErrorType",
                table: "ImportErrors",
                column: "ErrorType");

            migrationBuilder.CreateIndex(
                name: "IX_ImportErrors_ImportJobId",
                table: "ImportErrors",
                column: "ImportJobId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportErrors_JobId_RowNumber",
                table: "ImportErrors",
                columns: new[] { "ImportJobId", "RowNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_CreatedAt",
                table: "ImportJobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_Status",
                table: "ImportJobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_TenantId",
                table: "ImportJobs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_TenantId_Status",
                table: "ImportJobs",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_UserId",
                table: "ImportJobs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_link_clicks_campaign_id",
                table: "link_clicks",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_LinkClicks_Contact_Time",
                table: "link_clicks",
                columns: new[] { "contact_id", "clicked_at" });

            migrationBuilder.CreateIndex(
                name: "IX_LinkClicks_EventId",
                table: "link_clicks",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "IX_LinkClicks_Tenant_Campaign_Time",
                table: "link_clicks",
                columns: new[] { "tenant_id", "campaign_id", "clicked_at" });

            migrationBuilder.CreateIndex(
                name: "IX_staging_contacts_ContactId",
                table: "staging_contacts",
                column: "ContactId");

            migrationBuilder.CreateIndex(
                name: "IX_staging_contacts_ImportJobId",
                table: "staging_contacts",
                column: "ImportJobId");

            migrationBuilder.CreateIndex(
                name: "IX_staging_contacts_TenantId",
                table: "staging_contacts",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_staging_contacts_ValidationStatus",
                table: "staging_contacts",
                column: "ValidationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_StagingContacts_JobId_IsProcessed",
                table: "staging_contacts",
                columns: new[] { "ImportJobId", "IsProcessed" });

            migrationBuilder.CreateIndex(
                name: "IX_StagingContacts_TenantId_EmailHash",
                table: "staging_contacts",
                columns: new[] { "TenantId", "EmailHash" });

            migrationBuilder.CreateIndex(
                name: "IX_StagingContacts_TenantId_KakaoIdHash",
                table: "staging_contacts",
                columns: new[] { "TenantId", "KakaoIdHash" });

            migrationBuilder.CreateIndex(
                name: "IX_StagingContacts_TenantId_PhoneHash",
                table: "staging_contacts",
                columns: new[] { "TenantId", "PhoneHash" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportErrors");

            migrationBuilder.DropTable(
                name: "link_clicks");

            migrationBuilder.DropTable(
                name: "staging_contacts");

            migrationBuilder.DropTable(
                name: "campaign_events");

            migrationBuilder.DropTable(
                name: "ImportJobs");

            migrationBuilder.DropTable(
                name: "campaign_variants");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_List_Cover",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_Active_Updated",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_CreatedAt_Id",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "contacts");

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_CreatedAt_Id",
                table: "contacts",
                columns: new[] { "tenant_id", "created_at", "id" });
        }
    }
}
