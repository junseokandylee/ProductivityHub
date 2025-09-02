using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class ContactSystemAndEncryption : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enable required PostgreSQL extensions
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"unaccent\";");
            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_Email",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_KakaoId",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_Phone",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "email",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "kakao_id",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "name",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "phone",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "tags",
                table: "contacts");

            migrationBuilder.RenameColumn(
                name: "metadata",
                table: "contacts",
                newName: "notes");

            migrationBuilder.AddColumn<byte[]>(
                name: "email_enc",
                table: "contacts",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "email_hash",
                table: "contacts",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "full_name",
                table: "contacts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<byte[]>(
                name: "kakao_enc",
                table: "contacts",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "kakao_hash",
                table: "contacts",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "phone_enc",
                table: "contacts",
                type: "bytea",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "phone_hash",
                table: "contacts",
                type: "bytea",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "contact_history",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: true),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contact_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_contact_history_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_contact_history_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_contact_history_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    color = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.id);
                    table.ForeignKey(
                        name: "FK_tags_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contact_tags",
                columns: table => new
                {
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contact_tags", x => new { x.contact_id, x.tag_id });
                    table.ForeignKey(
                        name: "FK_contact_tags_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_contact_tags_tags_tag_id",
                        column: x => x.tag_id,
                        principalTable: "tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_contact_tags_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_CreatedAt_Id",
                table: "contacts",
                columns: new[] { "tenant_id", "created_at", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_EmailHash",
                table: "contacts",
                columns: new[] { "tenant_id", "email_hash" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_KakaoIdHash",
                table: "contacts",
                columns: new[] { "tenant_id", "kakao_hash" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_PhoneHash",
                table: "contacts",
                columns: new[] { "tenant_id", "phone_hash" });

            migrationBuilder.CreateIndex(
                name: "IX_contact_history_contact_id",
                table: "contact_history",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_history_tenant_id",
                table: "contact_history",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_history_user_id",
                table: "contact_history",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_ContactHistory_ContactId_OccurredAt",
                table: "contact_history",
                columns: new[] { "contact_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_contact_tags_contact_id",
                table: "contact_tags",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_tags_tag_id",
                table: "contact_tags",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_contact_tags_tenant_id",
                table: "contact_tags",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_tags_tenant_id",
                table: "tags",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_TenantId_Name",
                table: "tags",
                columns: new[] { "tenant_id", "name" },
                unique: true);
                
            // Create GIN index for full-text search on full_name
            migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Contacts_FullName_GIN\" ON contacts USING gin (full_name gin_trgm_ops);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contact_history");

            migrationBuilder.DropTable(
                name: "contact_tags");

            migrationBuilder.DropTable(
                name: "tags");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_CreatedAt_Id",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_EmailHash",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_KakaoIdHash",
                table: "contacts");

            migrationBuilder.DropIndex(
                name: "IX_Contacts_TenantId_PhoneHash",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "email_enc",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "email_hash",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "full_name",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "kakao_enc",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "kakao_hash",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "phone_enc",
                table: "contacts");

            migrationBuilder.DropColumn(
                name: "phone_hash",
                table: "contacts");

            migrationBuilder.RenameColumn(
                name: "notes",
                table: "contacts",
                newName: "metadata");

            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "contacts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "kakao_id",
                table: "contacts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "name",
                table: "contacts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "phone",
                table: "contacts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tags",
                table: "contacts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_Email",
                table: "contacts",
                columns: new[] { "tenant_id", "email" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_KakaoId",
                table: "contacts",
                columns: new[] { "tenant_id", "kakao_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Contacts_TenantId_Phone",
                table: "contacts",
                columns: new[] { "tenant_id", "phone" });
        }
    }
}
