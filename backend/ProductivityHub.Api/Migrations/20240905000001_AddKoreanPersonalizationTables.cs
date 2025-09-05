using Microsoft.EntityFrameworkCore.Migrations;
using System.Text.Json;

#nullable disable

namespace ProductivityHub.Api.Migrations
{
    /// <summary>
    /// 한국어 메시지 개인화 시스템을 위한 데이터베이스 테이블 추가
    /// </summary>
    public partial class AddKoreanPersonalizationTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 메시지 개인화 테이블
            migrationBuilder.CreateTable(
                name: "message_personalizations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    original_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    personalized_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    dialect = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "서울말"),
                    formality_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "formal"),
                    age_group = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    occupation_category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    education_level = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    region_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    effectiveness_score = table.Column<decimal>(type: "numeric(3,2)", nullable: false, defaultValue: 0.0m),
                    ab_test_group = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    cultural_context = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    uses_political_terms = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_message_personalizations", x => x.id);
                    table.ForeignKey(
                        name: "fk_message_personalizations_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_message_personalizations_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_message_personalizations_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 개인화 효과성 추적 테이블
            migrationBuilder.CreateTable(
                name: "personalization_effectiveness",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    personalization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    metric_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    metric_value = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    measured_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    metadata = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_personalization_effectiveness", x => x.id);
                    table.ForeignKey(
                        name: "fk_personalization_effectiveness_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_personalization_effectiveness_message_personalizations_personalization_id",
                        column: x => x.personalization_id,
                        principalTable: "message_personalizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 유권자 인구통계 테이블
            migrationBuilder.CreateTable(
                name: "voter_demographics",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    contact_id = table.Column<Guid>(type: "uuid", nullable: false),
                    age_group = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    gender = table.Column<string>(type: "character varying(1)", maxLength: 1, nullable: true),
                    region_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    region_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    preferred_dialect = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "서울말"),
                    education_level = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    occupation = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    income_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    political_leaning = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    interest_issues = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    communication_style = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "formal"),
                    last_updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_voter_demographics", x => x.id);
                    table.ForeignKey(
                        name: "fk_voter_demographics_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_voter_demographics_contacts_contact_id",
                        column: x => x.contact_id,
                        principalTable: "contacts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 한국어 언어 맥락 테이블
            migrationBuilder.CreateTable(
                name: "korean_language_contexts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    context_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    dialect = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    formality = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    cultural_markers = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    taboo_expressions = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    recommended_expressions = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_korean_language_contexts", x => x.id);
                    table.ForeignKey(
                        name: "fk_korean_language_contexts_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 인덱스 생성
            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_tenant_id",
                table: "message_personalizations",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_campaign_id",
                table: "message_personalizations",
                column: "campaign_id");

            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_contact_id",
                table: "message_personalizations",
                column: "contact_id");

            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_generated_at",
                table: "message_personalizations",
                column: "generated_at");

            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_effectiveness_score",
                table: "message_personalizations",
                column: "effectiveness_score");

            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_dialect_region",
                table: "message_personalizations",
                columns: new[] { "dialect", "region_code" });

            migrationBuilder.CreateIndex(
                name: "ix_message_personalizations_ab_test_group",
                table: "message_personalizations",
                column: "ab_test_group")
                .Annotation("Npgsql:IndexInclude", new[] { "effectiveness_score", "generated_at" });

            // 효과성 테이블 인덱스
            migrationBuilder.CreateIndex(
                name: "ix_personalization_effectiveness_tenant_id",
                table: "personalization_effectiveness",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_personalization_effectiveness_personalization_id",
                table: "personalization_effectiveness",
                column: "personalization_id");

            migrationBuilder.CreateIndex(
                name: "ix_personalization_effectiveness_metric_type",
                table: "personalization_effectiveness",
                column: "metric_type");

            migrationBuilder.CreateIndex(
                name: "ix_personalization_effectiveness_measured_at",
                table: "personalization_effectiveness",
                column: "measured_at");

            // 인구통계 테이블 인덱스
            migrationBuilder.CreateIndex(
                name: "ix_voter_demographics_tenant_id",
                table: "voter_demographics",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_voter_demographics_contact_id",
                table: "voter_demographics",
                column: "contact_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_voter_demographics_region_age",
                table: "voter_demographics",
                columns: new[] { "region_code", "age_group" });

            migrationBuilder.CreateIndex(
                name: "ix_voter_demographics_occupation_education",
                table: "voter_demographics",
                columns: new[] { "occupation", "education_level" });

            migrationBuilder.CreateIndex(
                name: "ix_voter_demographics_preferred_dialect",
                table: "voter_demographics",
                column: "preferred_dialect");

            // 언어 맥락 테이블 인덱스
            migrationBuilder.CreateIndex(
                name: "ix_korean_language_contexts_tenant_id",
                table: "korean_language_contexts",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_korean_language_contexts_context_name",
                table: "korean_language_contexts",
                columns: new[] { "tenant_id", "context_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_korean_language_contexts_dialect_formality",
                table: "korean_language_contexts",
                columns: new[] { "dialect", "formality", "is_active" });

            // GIN 인덱스 (PostgreSQL 전용)
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_message_personalizations_cultural_context_gin 
                ON message_personalizations USING gin(cultural_context);
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_voter_demographics_interest_issues_gin 
                ON voter_demographics USING gin(interest_issues);
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ix_korean_language_contexts_cultural_markers_gin 
                ON korean_language_contexts USING gin(cultural_markers);
            ");

            // 파티셔닝을 위한 준비 (선택사항)
            migrationBuilder.Sql(@"
                -- 개인화 효과성 테이블을 월별 파티셔닝으로 설정 (향후 데이터 증가 대비)
                -- ALTER TABLE personalization_effectiveness PARTITION BY RANGE (measured_at);
            ");

            // 기본 데이터 삽입
            InsertDefaultKoreanLanguageContexts(migrationBuilder);
        }

        private void InsertDefaultKoreanLanguageContexts(MigrationBuilder migrationBuilder)
        {
            // 기본 한국어 언어 맥락 데이터 삽입
            var defaultContexts = new[]
            {
                new
                {
                    Id = Guid.NewGuid(),
                    TenantId = "00000000-0000-0000-0000-000000000001", // 시스템 기본값
                    ContextName = "서울_표준어",
                    Dialect = "서울말",
                    Formality = "formal",
                    CulturalMarkers = "[\"안녕하십니까\", \"감사합니다\", \"죄송합니다\", \"수고하세요\"]",
                    TabooExpressions = "[\"빨갱이\", \"종북\", \"극우\", \"극좌\"]",
                    RecommendedExpressions = "[\"시민 여러분\", \"국민 여러분\", \"이웃 여러분\", \"동네 분들\"]"
                },
                new
                {
                    Id = Guid.NewGuid(),
                    TenantId = "00000000-0000-0000-0000-000000000001",
                    ContextName = "부산_친근체",
                    Dialect = "부산말",
                    Formality = "informal",
                    CulturalMarkers = "[\"뭐하노\", \"그카네\", \"좋다아이가\", \"있다아이가\"]",
                    TabooExpressions = "[\"빨갱이\", \"종북\", \"극우\", \"극좌\"]",
                    RecommendedExpressions = "[\"우리 동네\", \"부산 사람들\", \"시민분들\", \"이웃분들\"]"
                },
                new
                {
                    Id = Guid.NewGuid(),
                    TenantId = "00000000-0000-0000-0000-000000000001",
                    ContextName = "전라도_정중체",
                    Dialect = "전라도",
                    Formality = "respectful",
                    CulturalMarkers = "[\"뭐하것이\", \"그래잉\", \"좋구만잉\", \"그려잉\"]",
                    TabooExpressions = "[\"빨갱이\", \"종북\", \"극우\", \"극좌\"]",
                    RecommendedExpressions = "[\"향토민\", \"고향분들\", \"지역민\", \"우리 마을\"]"
                }
            };

            foreach (var context in defaultContexts)
            {
                migrationBuilder.InsertData(
                    table: "korean_language_contexts",
                    columns: new[] { "id", "tenant_id", "context_name", "dialect", "formality", 
                                   "cultural_markers", "taboo_expressions", "recommended_expressions", 
                                   "is_active", "created_at", "updated_at" },
                    values: new object[] {
                        context.Id,
                        context.TenantId,
                        context.ContextName,
                        context.Dialect,
                        context.Formality,
                        context.CulturalMarkers,
                        context.TabooExpressions,
                        context.RecommendedExpressions,
                        true,
                        DateTime.UtcNow,
                        DateTime.UtcNow
                    });
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 인덱스 삭제
            migrationBuilder.DropIndex(name: "ix_korean_language_contexts_dialect_formality", table: "korean_language_contexts");
            migrationBuilder.DropIndex(name: "ix_korean_language_contexts_context_name", table: "korean_language_contexts");
            migrationBuilder.DropIndex(name: "ix_korean_language_contexts_tenant_id", table: "korean_language_contexts");

            migrationBuilder.DropIndex(name: "ix_voter_demographics_preferred_dialect", table: "voter_demographics");
            migrationBuilder.DropIndex(name: "ix_voter_demographics_occupation_education", table: "voter_demographics");
            migrationBuilder.DropIndex(name: "ix_voter_demographics_region_age", table: "voter_demographics");
            migrationBuilder.DropIndex(name: "ix_voter_demographics_contact_id", table: "voter_demographics");
            migrationBuilder.DropIndex(name: "ix_voter_demographics_tenant_id", table: "voter_demographics");

            migrationBuilder.DropIndex(name: "ix_personalization_effectiveness_measured_at", table: "personalization_effectiveness");
            migrationBuilder.DropIndex(name: "ix_personalization_effectiveness_metric_type", table: "personalization_effectiveness");
            migrationBuilder.DropIndex(name: "ix_personalization_effectiveness_personalization_id", table: "personalization_effectiveness");
            migrationBuilder.DropIndex(name: "ix_personalization_effectiveness_tenant_id", table: "personalization_effectiveness");

            migrationBuilder.DropIndex(name: "ix_message_personalizations_ab_test_group", table: "message_personalizations");
            migrationBuilder.DropIndex(name: "ix_message_personalizations_dialect_region", table: "message_personalizations");
            migrationBuilder.DropIndex(name: "ix_message_personalizations_effectiveness_score", table: "message_personalizations");
            migrationBuilder.DropIndex(name: "ix_message_personalizations_generated_at", table: "message_personalizations");
            migrationBuilder.DropIndex(name: "ix_message_personalizations_contact_id", table: "message_personalizations");
            migrationBuilder.DropIndex(name: "ix_message_personalizations_campaign_id", table: "message_personalizations");
            migrationBuilder.DropIndex(name: "ix_message_personalizations_tenant_id", table: "message_personalizations");

            // GIN 인덱스 삭제
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_korean_language_contexts_cultural_markers_gin;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_voter_demographics_interest_issues_gin;");
            migrationBuilder.Sql("DROP INDEX IF EXISTS ix_message_personalizations_cultural_context_gin;");

            // 테이블 삭제 (FK 제약 조건 때문에 순서 중요)
            migrationBuilder.DropTable(name: "personalization_effectiveness");
            migrationBuilder.DropTable(name: "korean_language_contexts");
            migrationBuilder.DropTable(name: "voter_demographics");
            migrationBuilder.DropTable(name: "message_personalizations");
        }
    }
}