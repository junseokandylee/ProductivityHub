using System.Text.Json.Serialization;

namespace ProductivityHub.Api.DTOs;

/// <summary>
/// 메시지 개인화 생성 요청 DTO
/// </summary>
public class GeneratePersonalizationRequest
{
    public Guid CampaignId { get; set; }
    public string OriginalMessage { get; set; } = string.Empty;
    public List<VoterDemographicsDto> TargetDemographics { get; set; } = new();
    public List<PersonalizationGoalDto> PersonalizationGoals { get; set; } = new();
    public bool AbTestingEnabled { get; set; } = false;
    public string CulturalSensitivityLevel { get; set; } = "medium";
}

/// <summary>
/// 메시지 개인화 응답 DTO
/// </summary>
public class PersonalizationResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string OriginalMessage { get; set; } = string.Empty;
    public List<PersonalizedVariantDto> PersonalizedVariants { get; set; } = new();
    public PersonalizedVariantDto? RecommendedVariant { get; set; }
    public KoreanCulturalAnalysisDto CulturalAnalysis { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// 개인화된 메시지 변형 DTO
/// </summary>
public class PersonalizedVariantDto
{
    public Guid Id { get; set; }
    public string PersonalizedMessage { get; set; } = string.Empty;
    public string Dialect { get; set; } = string.Empty;
    public string FormalityLevel { get; set; } = string.Empty;
    public VoterDemographicsDto TargetDemographics { get; set; } = new();
    public decimal EffectivenessScore { get; set; }
    public string? AbTestGroup { get; set; }
    public List<string> CulturalMarkers { get; set; } = new();
    public bool UsesPoliticalTerms { get; set; }
    public decimal Confidence { get; set; }
}

/// <summary>
/// 유권자 인구통계 DTO
/// </summary>
public class VoterDemographicsDto
{
    public string? AgeGroup { get; set; }
    public string? Gender { get; set; }
    public string? RegionCode { get; set; }
    public string? RegionName { get; set; }
    public string PreferredDialect { get; set; } = "서울말";
    public string? EducationLevel { get; set; }
    public string? Occupation { get; set; }
    public string? IncomeLevel { get; set; }
    public string? PoliticalLeaning { get; set; }
    public List<string> InterestIssues { get; set; } = new();
    public string CommunicationStyle { get; set; } = "formal";
}

/// <summary>
/// 한국어 문화적 분석 DTO
/// </summary>
public class KoreanCulturalAnalysisDto
{
    public decimal DialectConsistency { get; set; }
    public bool FormalityAppropriate { get; set; }
    public decimal PoliticalTermAccuracy { get; set; }
    public decimal CulturalSensitivityScore { get; set; }
    public decimal RegionalRelevance { get; set; }
    public bool AgeAppropriate { get; set; }
    public List<string> Warnings { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
}

/// <summary>
/// 개인화 목표 DTO
/// </summary>
public class PersonalizationGoalDto
{
    public string Type { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// 메시지 개인화 미리보기 요청 DTO
/// </summary>
public class PreviewPersonalizationRequest
{
    public string OriginalMessage { get; set; } = string.Empty;
    public VoterDemographicsDto SampleDemographics { get; set; } = new();
    public List<PersonalizationGoalDto> Goals { get; set; } = new();
    public string CulturalSensitivityLevel { get; set; } = "medium";
}

/// <summary>
/// 개인화 효과성 분석 요청 DTO
/// </summary>
public class AnalyzeEffectivenessRequest
{
    public Guid CampaignId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public List<string> MetricTypes { get; set; } = new();
    public string? GroupBy { get; set; } // "region", "age_group", "dialect", etc.
}

/// <summary>
/// 개인화 효과성 분석 응답 DTO
/// </summary>
public class EffectivenessAnalysisResponse
{
    public Guid CampaignId { get; set; }
    public decimal OverallEffectiveness { get; set; }
    public List<EffectivenessMetricDto> Metrics { get; set; } = new();
    public List<DemographicInsightDto> DemographicInsights { get; set; } = new();
    public List<ABTestResultDto> ABTestResults { get; set; } = new();
    public TrendAnalysisDto TrendAnalysis { get; set; } = new();
}

/// <summary>
/// 효과성 메트릭 DTO
/// </summary>
public class EffectivenessMetricDto
{
    public string MetricType { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal Change { get; set; }
    public string ChangeDirection { get; set; } = string.Empty; // "up", "down", "stable"
}

/// <summary>
/// 인구통계 인사이트 DTO
/// </summary>
public class DemographicInsightDto
{
    public string Category { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public decimal AverageEffectiveness { get; set; }
    public int SampleSize { get; set; }
    public PersonalizedVariantDto? BestPerformingVariant { get; set; }
}

/// <summary>
/// A/B 테스트 결과 DTO
/// </summary>
public class ABTestResultDto
{
    public Guid CampaignId { get; set; }
    public PersonalizedVariantDto VariantA { get; set; } = new();
    public PersonalizedVariantDto VariantB { get; set; } = new();
    public int SampleSize { get; set; }
    public decimal ConfidenceLevel { get; set; }
    public bool StatisticalSignificance { get; set; }
    public string? WinningVariant { get; set; }
    public ABTestMetricsDto Metrics { get; set; } = new();
}

/// <summary>
/// A/B 테스트 메트릭 DTO
/// </summary>
public class ABTestMetricsDto
{
    public VariantComparisonDto OpenRate { get; set; } = new();
    public VariantComparisonDto ClickRate { get; set; } = new();
    public VariantComparisonDto ResponseRate { get; set; } = new();
    public VariantComparisonDto ConversionRate { get; set; } = new();
}

/// <summary>
/// 변형 비교 DTO
/// </summary>
public class VariantComparisonDto
{
    public decimal VariantA { get; set; }
    public decimal VariantB { get; set; }
    public decimal Difference { get; set; }
    public decimal StatisticalSignificance { get; set; }
}

/// <summary>
/// 트렌드 분석 DTO
/// </summary>
public class TrendAnalysisDto
{
    public string Period { get; set; } = string.Empty;
    public decimal OverallEffectivenessChange { get; set; }
    public List<string> TopPerformingDialects { get; set; } = new();
    public List<string> EmergingTrends { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// 인구통계 정보 조회 응답 DTO
/// </summary>
public class DemographicsResponse
{
    public List<RegionDistributionDto> RegionDistribution { get; set; } = new();
    public List<AgeGroupDistributionDto> AgeGroupDistribution { get; set; } = new();
    public List<DialectPreferenceDto> DialectPreferences { get; set; } = new();
    public List<OccupationDistributionDto> OccupationDistribution { get; set; } = new();
    public DemographicStatsDto Statistics { get; set; } = new();
}

/// <summary>
/// 지역 분포 DTO
/// </summary>
public class RegionDistributionDto
{
    public string RegionCode { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
    public decimal AverageEffectiveness { get; set; }
    public string PreferredDialect { get; set; } = string.Empty;
}

/// <summary>
/// 연령대 분포 DTO
/// </summary>
public class AgeGroupDistributionDto
{
    public string AgeGroup { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
    public decimal AverageEffectiveness { get; set; }
    public string PreferredFormalityLevel { get; set; } = string.Empty;
}

/// <summary>
/// 방언 선호도 DTO
/// </summary>
public class DialectPreferenceDto
{
    public string Dialect { get; set; } = string.Empty;
    public List<string> RegionCodes { get; set; } = new();
    public decimal Effectiveness { get; set; }
    public int SampleSize { get; set; }
}

/// <summary>
/// 직업 분포 DTO
/// </summary>
public class OccupationDistributionDto
{
    public string Occupation { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
    public decimal AverageEffectiveness { get; set; }
    public string PreferredCommunicationStyle { get; set; } = string.Empty;
}

/// <summary>
/// 인구통계 통계 DTO
/// </summary>
public class DemographicStatsDto
{
    public int TotalContacts { get; set; }
    public int WithDemographicData { get; set; }
    public decimal DataCompleteness { get; set; }
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// 개인화 설정 DTO
/// </summary>
public class PersonalizationSettingsDto
{
    public Guid TenantId { get; set; }
    public string DefaultDialect { get; set; } = "서울말";
    public string DefaultFormalityLevel { get; set; } = "formal";
    public List<string> EnabledGoals { get; set; } = new();
    public string CulturalSensitivityLevel { get; set; } = "medium";
    public bool AbTestingEnabled { get; set; } = false;
    public int MaxVariantsPerMessage { get; set; } = 3;
    public decimal ConfidenceThreshold { get; set; } = 0.7m;
    public decimal AutoApprovalThreshold { get; set; } = 0.9m;
}

/// <summary>
/// 개인화 상태 DTO
/// </summary>
public class PersonalizationStatusDto
{
    public Guid CampaignId { get; set; }
    public string Status { get; set; } = string.Empty; // "processing", "completed", "failed", "cancelled"
    public int Progress { get; set; } // 0-100
    public string CurrentStep { get; set; } = string.Empty;
    public int? EstimatedTimeRemaining { get; set; }
    public int ProcessedMessages { get; set; }
    public int TotalMessages { get; set; }
    public List<string> Errors { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}