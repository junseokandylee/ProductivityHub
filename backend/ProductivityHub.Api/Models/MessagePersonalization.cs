using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace ProductivityHub.Api.Models;

/// <summary>
/// 유권자 인구통계 프로파일링 및 메시지 개인화를 위한 모델
/// </summary>
[Table("message_personalizations")]
public class MessagePersonalization
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("campaign_id")]
    public Guid CampaignId { get; set; }

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    [Required]
    [MaxLength(2000)]
    [Column("original_message")]
    public string OriginalMessage { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    [Column("personalized_message")]
    public string PersonalizedMessage { get; set; } = string.Empty;

    /// <summary>
    /// 지역 방언 설정 (서울말, 부산말, 경상도, 전라도, 충청도 등)
    /// </summary>
    [Required]
    [MaxLength(50)]
    [Column("dialect")]
    public string Dialect { get; set; } = "서울말";

    /// <summary>
    /// 높임법/존댓말 수준 (formal, informal, respectful, casual)
    /// </summary>
    [Required]
    [MaxLength(20)]
    [Column("formality_level")]
    public string FormalityLevel { get; set; } = "formal";

    /// <summary>
    /// 연령대 기반 메시지 스타일 (20s, 30s, 40s, 50s, 60plus)
    /// </summary>
    [MaxLength(20)]
    [Column("age_group")]
    public string? AgeGroup { get; set; }

    /// <summary>
    /// 직업군 기반 메시지 조정 (공무원, 자영업, 회사원, 농업 등)
    /// </summary>
    [MaxLength(50)]
    [Column("occupation_category")]
    public string? OccupationCategory { get; set; }

    /// <summary>
    /// 교육 수준 (초등학교, 중학교, 고등학교, 대학교, 대학원)
    /// </summary>
    [MaxLength(30)]
    [Column("education_level")]
    public string? EducationLevel { get; set; }

    /// <summary>
    /// 지역 코드 (시/도/구/군)
    /// </summary>
    [MaxLength(20)]
    [Column("region_code")]
    public string? RegionCode { get; set; }

    /// <summary>
    /// 개인화 효과성 점수 (0.0 - 1.0)
    /// </summary>
    [Column("effectiveness_score", TypeName = "numeric(3,2)")]
    public decimal EffectivenessScore { get; set; } = 0.0m;

    /// <summary>
    /// A/B 테스트 그룹 식별자
    /// </summary>
    [MaxLength(50)]
    [Column("ab_test_group")]
    public string? AbTestGroup { get; set; }

    /// <summary>
    /// 문화적 맥락 정보 (JSON)
    /// </summary>
    [Column("cultural_context", TypeName = "jsonb")]
    public JsonDocument? CulturalContext { get; set; }

    /// <summary>
    /// 정치적 용어 사용 여부
    /// </summary>
    [Column("uses_political_terms")]
    public bool UsesPoliticalTerms { get; set; } = false;

    /// <summary>
    /// 메시지 생성 시간
    /// </summary>
    [Column("generated_at")]
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("CampaignId")]
    public virtual Campaign Campaign { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;

    public virtual ICollection<PersonalizationEffectiveness> EffectivenessHistory { get; set; } = new List<PersonalizationEffectiveness>();
}

/// <summary>
/// 개인화 효과성 추적을 위한 모델
/// </summary>
[Table("personalization_effectiveness")]
public class PersonalizationEffectiveness
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("personalization_id")]
    public Guid PersonalizationId { get; set; }

    /// <summary>
    /// 메트릭 유형 (open_rate, click_rate, response_rate, conversion_rate)
    /// </summary>
    [Required]
    [MaxLength(50)]
    [Column("metric_type")]
    public string MetricType { get; set; } = string.Empty;

    /// <summary>
    /// 메트릭 값 (0.0 - 1.0)
    /// </summary>
    [Column("metric_value", TypeName = "numeric(5,4)")]
    public decimal MetricValue { get; set; }

    /// <summary>
    /// 측정 시점
    /// </summary>
    [Column("measured_at")]
    public DateTime MeasuredAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 추가 메타데이터 (JSON)
    /// </summary>
    [Column("metadata", TypeName = "jsonb")]
    public JsonDocument? Metadata { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("PersonalizationId")]
    public virtual MessagePersonalization Personalization { get; set; } = null!;
}

/// <summary>
/// 유권자 인구통계 프로필
/// </summary>
[Table("voter_demographics")]
public class VoterDemographics
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    [Required]
    [Column("contact_id")]
    public Guid ContactId { get; set; }

    /// <summary>
    /// 연령대 (20s, 30s, 40s, 50s, 60plus)
    /// </summary>
    [MaxLength(20)]
    [Column("age_group")]
    public string? AgeGroup { get; set; }

    /// <summary>
    /// 성별 (M, F, O)
    /// </summary>
    [MaxLength(1)]
    [Column("gender")]
    public string? Gender { get; set; }

    /// <summary>
    /// 지역 코드 (행정구역 코드)
    /// </summary>
    [MaxLength(20)]
    [Column("region_code")]
    public string? RegionCode { get; set; }

    /// <summary>
    /// 지역명 (서울특별시 강남구 등)
    /// </summary>
    [MaxLength(100)]
    [Column("region_name")]
    public string? RegionName { get; set; }

    /// <summary>
    /// 선호 방언 (서울말, 부산말, 경상도, 전라도, 충청도, 강원도, 제주도)
    /// </summary>
    [MaxLength(50)]
    [Column("preferred_dialect")]
    public string PreferredDialect { get; set; } = "서울말";

    /// <summary>
    /// 교육 수준 (초졸, 중졸, 고졸, 대졸, 대학원졸)
    /// </summary>
    [MaxLength(30)]
    [Column("education_level")]
    public string? EducationLevel { get; set; }

    /// <summary>
    /// 직업 분류 (공무원, 자영업자, 회사원, 농업, 학생, 주부, 무직, 기타)
    /// </summary>
    [MaxLength(50)]
    [Column("occupation")]
    public string? Occupation { get; set; }

    /// <summary>
    /// 소득 구간 (low, middle, high)
    /// </summary>
    [MaxLength(20)]
    [Column("income_level")]
    public string? IncomeLevel { get; set; }

    /// <summary>
    /// 정치적 성향 (진보, 보수, 중도)
    /// </summary>
    [MaxLength(20)]
    [Column("political_leaning")]
    public string? PoliticalLeaning { get; set; }

    /// <summary>
    /// 관심 이슈 (JSON 배열)
    /// </summary>
    [Column("interest_issues", TypeName = "jsonb")]
    public JsonDocument? InterestIssues { get; set; }

    /// <summary>
    /// 선호 커뮤니케이션 스타일 (formal, casual, respectful, friendly)
    /// </summary>
    [MaxLength(30)]
    [Column("communication_style")]
    public string CommunicationStyle { get; set; } = "formal";

    /// <summary>
    /// 데이터 마지막 업데이트
    /// </summary>
    [Column("last_updated")]
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;

    [ForeignKey("ContactId")]
    public virtual Contact Contact { get; set; } = null!;
}

/// <summary>
/// 한국어 언어 맥락 정보
/// </summary>
[Table("korean_language_contexts")]
public class KoreanLanguageContext
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("tenant_id")]
    public Guid TenantId { get; set; }

    /// <summary>
    /// 맥락 이름 (예: "서울_공무원_40대", "부산_자영업_50대")
    /// </summary>
    [Required]
    [MaxLength(100)]
    [Column("context_name")]
    public string ContextName { get; set; } = string.Empty;

    /// <summary>
    /// 방언 유형
    /// </summary>
    [Required]
    [MaxLength(50)]
    [Column("dialect")]
    public string Dialect { get; set; } = string.Empty;

    /// <summary>
    /// 격식 수준 (formal, informal, respectful, casual)
    /// </summary>
    [Required]
    [MaxLength(20)]
    [Column("formality")]
    public string Formality { get; set; } = string.Empty;

    /// <summary>
    /// 문화적 마커 (JSON) - 특정 단어, 표현, 관용구 등
    /// </summary>
    [Column("cultural_markers", TypeName = "jsonb")]
    public JsonDocument? CulturalMarkers { get; set; }

    /// <summary>
    /// 금기 사항 (JSON) - 사용하지 말아야 할 표현들
    /// </summary>
    [Column("taboo_expressions", TypeName = "jsonb")]
    public JsonDocument? TabooExpressions { get; set; }

    /// <summary>
    /// 추천 표현 (JSON) - 사용하면 좋은 표현들
    /// </summary>
    [Column("recommended_expressions", TypeName = "jsonb")]
    public JsonDocument? RecommendedExpressions { get; set; }

    /// <summary>
    /// 활성화 여부
    /// </summary>
    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TenantId")]
    public virtual Tenant Tenant { get; set; } = null!;
}