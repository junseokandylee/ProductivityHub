using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProductivityHub.Api.DTOs;

/// <summary>
/// Korean text analysis request DTO
/// 한국어 텍스트 분석 요청 DTO
/// </summary>
public class KoreanTextAnalysisRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    public string? SourceDialect { get; set; } // 원본 방언 (자동 감지 시 null)
    public string? TargetRegion { get; set; } // 대상 지역
    public string? TargetAgeGroup { get; set; } // 대상 연령대
    public string? TargetOccupation { get; set; } // 대상 직업
    public bool IncludeMorphological { get; set; } = true; // 형태소 분석 포함 여부
    public bool IncludeCultural { get; set; } = true; // 문화적 분석 포함 여부
    public bool IncludePolitical { get; set; } = true; // 정치적 분석 포함 여부
}

/// <summary>
/// Korean text analysis response DTO
/// 한국어 텍스트 분석 응답 DTO
/// </summary>
public class KoreanTextAnalysisResponse
{
    public Guid AnalysisId { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public KoreanDialectAnalysisDto DialectAnalysis { get; set; } = new();
    public KoreanHonorificAnalysisDto HonorificAnalysis { get; set; } = new();
    public KoreanMorphologicalAnalysisDto? MorphologicalAnalysis { get; set; }
    public KoreanCulturalAnalysisDto? CulturalAnalysis { get; set; }
    public KoreanPoliticalAnalysisDto? PoliticalAnalysis { get; set; }
    public List<string> Warnings { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
    public decimal OverallConfidence { get; set; }
    public int ProcessingTimeMs { get; set; }
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean dialect conversion request DTO
/// 한국어 방언 변환 요청 DTO
/// </summary>
public class KoreanDialectConversionRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    [Required]
    public string TargetDialect { get; set; } = string.Empty; // "seoul", "busan", "daegu", etc.
    
    public string? SourceDialect { get; set; } // 원본 방언 (자동 감지 시 null)
    public bool PreserveHonorific { get; set; } = true; // 높임법 유지 여부
    public bool IncludeAlternatives { get; set; } = false; // 대안 변환 포함 여부
    public decimal ConfidenceThreshold { get; set; } = 0.7m; // 신뢰도 임계값
}

/// <summary>
/// Korean dialect conversion response DTO
/// 한국어 방언 변환 응답 DTO
/// </summary>
public class KoreanDialectConversionResponse
{
    public Guid ConversionId { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string ConvertedText { get; set; } = string.Empty;
    public string SourceDialect { get; set; } = string.Empty;
    public string TargetDialect { get; set; } = string.Empty;
    public List<KoreanDialectVariantDto> AlternativeVariants { get; set; } = new();
    public List<KoreanConversionStepDto> ConversionSteps { get; set; } = new();
    public decimal ConversionConfidence { get; set; }
    public List<string> ConversionWarnings { get; set; } = new();
    public DateTime ConvertedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean honorific adjustment request DTO
/// 한국어 높임법 조정 요청 DTO
/// </summary>
public class KoreanHonorificAdjustmentRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    [Required]
    public string TargetFormalityLevel { get; set; } = string.Empty; // "very_formal", "formal", "informal", "casual"
    
    public string? TargetAgeGroup { get; set; } // 대상 연령대
    public string? SpeakerAge { get; set; } // 화자 연령대
    public string? Context { get; set; } // "business", "political", "personal", etc.
    public bool PreserveDialect { get; set; } = true; // 방언 유지 여부
}

/// <summary>
/// Korean honorific adjustment response DTO
/// 한국어 높임법 조정 응답 DTO
/// </summary>
public class KoreanHonorificAdjustmentResponse
{
    public Guid AdjustmentId { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string AdjustedText { get; set; } = string.Empty;
    public string OriginalFormalityLevel { get; set; } = string.Empty;
    public string TargetFormalityLevel { get; set; } = string.Empty;
    public List<KoreanHonorificChangeDto> HonorificChanges { get; set; } = new();
    public List<string> CulturalNotes { get; set; } = new();
    public decimal AdjustmentConfidence { get; set; }
    public DateTime AdjustedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean cultural validation request DTO
/// 한국어 문화적 검증 요청 DTO
/// </summary>
public class KoreanCulturalValidationRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    public string? TargetRegion { get; set; } // 대상 지역
    public string? TargetAgeGroup { get; set; } // 대상 연령대
    public string? TargetGender { get; set; } // 대상 성별
    public string? Context { get; set; } // "campaign", "business", "casual", etc.
    public string SensitivityLevel { get; set; } = "medium"; // "low", "medium", "high"
    public List<string> SpecificConcerns { get; set; } = new(); // 특정 우려사항
}

/// <summary>
/// Korean cultural validation response DTO
/// 한국어 문화적 검증 응답 DTO
/// </summary>
public class KoreanCulturalValidationResponse
{
    public Guid ValidationId { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public bool IsAppropriate { get; set; }
    public decimal AppropriatenessScore { get; set; } // 0.0-1.0
    public List<KoreanCulturalIssueDto> CulturalIssues { get; set; } = new();
    public List<KoreanCulturalSuggestionDto> Suggestions { get; set; } = new();
    public KoreanCulturalContextDto CulturalContext { get; set; } = new();
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean batch text personalization request DTO
/// 한국어 일괄 텍스트 개인화 요청 DTO
/// </summary>
public class KoreanBatchPersonalizationRequest
{
    [Required]
    public List<KoreanBatchTextItem> TextItems { get; set; } = new();
    
    public KoreanPersonalizationSettings Settings { get; set; } = new();
    public bool IncludeAnalysis { get; set; } = true; // 분석 결과 포함 여부
    public bool IncludeAlternatives { get; set; } = false; // 대안 버전 포함 여부
    public int MaxProcessingTimeMs { get; set; } = 30000; // 최대 처리 시간
}

/// <summary>
/// Korean batch text personalization response DTO
/// 한국어 일괄 텍스트 개인화 응답 DTO
/// </summary>
public class KoreanBatchPersonalizationResponse
{
    public Guid BatchId { get; set; }
    public List<KoreanPersonalizationResultDto> Results { get; set; } = new();
    public KoreanBatchStatisticsDto Statistics { get; set; } = new();
    public List<string> BatchWarnings { get; set; } = new();
    public List<string> BatchErrors { get; set; } = new();
    public int TotalProcessingTimeMs { get; set; }
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}

// Supporting DTOs

/// <summary>
/// Korean dialect analysis details
/// 한국어 방언 분석 세부사항
/// </summary>
public class KoreanDialectAnalysisDto
{
    public string DetectedDialect { get; set; } = string.Empty;
    public decimal ConfidenceScore { get; set; }
    public List<KoreanDialectMarkerDto> DialectMarkers { get; set; } = new();
    public List<KoreanRegionalCharacteristicDto> RegionalCharacteristics { get; set; } = new();
    public string RegionCode { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
}

/// <summary>
/// Korean honorific analysis details
/// 한국어 높임법 분석 세부사항
/// </summary>
public class KoreanHonorificAnalysisDto
{
    public string DetectedFormalityLevel { get; set; } = string.Empty;
    public string SpeechLevel { get; set; } = string.Empty; // "하십시오체", "해요체", etc.
    public List<KoreanHonorificMarkerDto> HonorificMarkers { get; set; } = new();
    public bool IsConsistent { get; set; } // 높임법 일관성
    public decimal ConsistencyScore { get; set; }
    public List<string> InconsistencyWarnings { get; set; } = new();
}

/// <summary>
/// Korean morphological analysis details
/// 한국어 형태소 분석 세부사항
/// </summary>
public class KoreanMorphologicalAnalysisDto
{
    public List<KoreanTokenDto> Tokens { get; set; } = new();
    public List<KoreanMorphemeDto> Morphemes { get; set; } = new();
    public List<KoreanParticleAnalysisDto> Particles { get; set; } = new();
    public List<KoreanVerbConjugationDto> VerbConjugations { get; set; } = new();
    public KoreanSentenceStructureDto SentenceStructure { get; set; } = new();
    public decimal AnalysisConfidence { get; set; }
}

/// <summary>
/// Korean cultural analysis details
/// 한국어 문화적 분석 세부사항
/// </summary>
public class KoreanCulturalAnalysisDto
{
    public List<KoreanCulturalMarkerDto> CulturalMarkers { get; set; } = new();
    public List<KoreanGenerationalReferenceDto> GenerationalReferences { get; set; } = new();
    public List<KoreanRegionalReferenceDto> RegionalReferences { get; set; } = new();
    public decimal CulturalAppropriatenessScore { get; set; }
    public string RecommendedAgeGroup { get; set; } = string.Empty;
    public string RecommendedRegion { get; set; } = string.Empty;
}

/// <summary>
/// Korean political analysis details
/// 한국어 정치적 분석 세부사항
/// </summary>
public class KoreanPoliticalAnalysisDto
{
    public List<KoreanPoliticalTermDto> PoliticalTerms { get; set; } = new();
    public List<KoreanComplianceIssueDto> ComplianceIssues { get; set; } = new();
    public decimal SafetyScore { get; set; } // 안전성 점수 (0.0-1.0)
    public bool IsElectionLawCompliant { get; set; }
    public List<string> RecommendedAlternatives { get; set; } = new();
    public List<string> LegalWarnings { get; set; } = new();
}

/// <summary>
/// Korean dialect variant DTO
/// 한국어 방언 변형 DTO
/// </summary>
public class KoreanDialectVariantDto
{
    public string VariantText { get; set; } = string.Empty;
    public string DialectCode { get; set; } = string.Empty;
    public string DialectName { get; set; } = string.Empty;
    public decimal ConfidenceScore { get; set; }
    public List<string> KeyDifferences { get; set; } = new();
    public string UsageContext { get; set; } = string.Empty;
}

/// <summary>
/// Korean conversion step DTO
/// 한국어 변환 단계 DTO
/// </summary>
public class KoreanConversionStepDto
{
    public int StepNumber { get; set; }
    public string StepDescription { get; set; } = string.Empty;
    public string BeforeText { get; set; } = string.Empty;
    public string AfterText { get; set; } = string.Empty;
    public string RuleApplied { get; set; } = string.Empty;
    public decimal StepConfidence { get; set; }
}

/// <summary>
/// Korean honorific change DTO
/// 한국어 높임법 변경 DTO
/// </summary>
public class KoreanHonorificChangeDto
{
    public string OriginalPhrase { get; set; } = string.Empty;
    public string ChangedPhrase { get; set; } = string.Empty;
    public string ChangeType { get; set; } = string.Empty; // "verb_ending", "noun_modifier", etc.
    public string ChangeReason { get; set; } = string.Empty;
    public decimal ChangeConfidence { get; set; }
}

/// <summary>
/// Korean cultural issue DTO
/// 한국어 문화적 이슈 DTO
/// </summary>
public class KoreanCulturalIssueDto
{
    public string IssueType { get; set; } = string.Empty; // "age_inappropriate", "region_insensitive", etc.
    public string Severity { get; set; } = string.Empty; // "critical", "warning", "info"
    public string Description { get; set; } = string.Empty;
    public string ProblematicText { get; set; } = string.Empty;
    public int StartPosition { get; set; }
    public int EndPosition { get; set; }
    public List<string> SuggestedAlternatives { get; set; } = new();
}

/// <summary>
/// Korean cultural suggestion DTO
/// 한국어 문화적 제안 DTO
/// </summary>
public class KoreanCulturalSuggestionDto
{
    public string SuggestionType { get; set; } = string.Empty; // "dialect_adjustment", "formality_change", etc.
    public string SuggestionText { get; set; } = string.Empty;
    public string Rationale { get; set; } = string.Empty;
    public decimal ImprovementScore { get; set; } // 개선 점수
    public bool IsOptional { get; set; }
}

/// <summary>
/// Korean cultural context DTO
/// 한국어 문화적 맥락 DTO
/// </summary>
public class KoreanCulturalContextDto
{
    public string RecommendedDialect { get; set; } = string.Empty;
    public string RecommendedFormalityLevel { get; set; } = string.Empty;
    public List<string> CulturalConsiderations { get; set; } = new();
    public List<string> RegionalSensitivities { get; set; } = new();
    public List<string> GenerationalPreferences { get; set; } = new();
}

/// <summary>
/// Korean batch text item DTO
/// 한국어 일괄 처리 텍스트 항목 DTO
/// </summary>
public class KoreanBatchTextItem
{
    public string ItemId { get; set; } = string.Empty; // 클라이언트 지정 ID
    public string Text { get; set; } = string.Empty;
    public KoreanPersonalizationTarget Target { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new(); // 추가 메타데이터
}

/// <summary>
/// Korean personalization target DTO
/// 한국어 개인화 대상 DTO
/// </summary>
public class KoreanPersonalizationTarget
{
    public string? DialectCode { get; set; }
    public string? FormalityLevel { get; set; }
    public string? AgeGroup { get; set; }
    public string? RegionCode { get; set; }
    public string? Occupation { get; set; }
    public string? Gender { get; set; }
    public string? EducationLevel { get; set; }
}

/// <summary>
/// Korean personalization settings DTO
/// 한국어 개인화 설정 DTO
/// </summary>
public class KoreanPersonalizationSettings
{
    public decimal ConfidenceThreshold { get; set; } = 0.7m;
    public bool IncludeMorphological { get; set; } = true;
    public bool IncludeCultural { get; set; } = true;
    public bool IncludePolitical { get; set; } = true;
    public bool PreserveOriginalWhenUncertain { get; set; } = true;
    public string CulturalSensitivityLevel { get; set; } = "medium";
}

/// <summary>
/// Korean personalization result DTO
/// 한국어 개인화 결과 DTO
/// </summary>
public class KoreanPersonalizationResultDto
{
    public string ItemId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string PersonalizedText { get; set; } = string.Empty;
    public KoreanTextAnalysisResponse? Analysis { get; set; }
    public List<KoreanDialectVariantDto> AlternativeVariants { get; set; } = new();
    public List<string> ProcessingErrors { get; set; } = new();
    public List<string> ProcessingWarnings { get; set; } = new();
    public int ProcessingTimeMs { get; set; }
}

/// <summary>
/// Korean batch processing statistics DTO
/// 한국어 일괄 처리 통계 DTO
/// </summary>
public class KoreanBatchStatisticsDto
{
    public int TotalItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public decimal SuccessRate => TotalItems > 0 ? (decimal)SuccessfulItems / TotalItems : 0;
    public decimal AverageConfidence { get; set; }
    public int AverageProcessingTimeMs { get; set; }
    public Dictionary<string, int> DialectDistribution { get; set; } = new();
    public Dictionary<string, int> FormalityDistribution { get; set; } = new();
}

// Detailed analysis DTOs

public class KoreanDialectMarkerDto
{
    public string Marker { get; set; } = string.Empty;
    public string MarkerType { get; set; } = string.Empty; // "phonetic", "lexical", "syntactic"
    public decimal Confidence { get; set; }
    public string RegionCode { get; set; } = string.Empty;
}

public class KoreanRegionalCharacteristicDto
{
    public string Characteristic { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Prevalence { get; set; } // 출현 빈도
}

public class KoreanHonorificMarkerDto
{
    public string Marker { get; set; } = string.Empty;
    public string MarkerType { get; set; } = string.Empty; // "verb_ending", "noun_modifier", "particle"
    public string HonorificLevel { get; set; } = string.Empty;
    public int Position { get; set; }
}

public class KoreanTokenDto
{
    public string Text { get; set; } = string.Empty;
    public int StartPosition { get; set; }
    public int EndPosition { get; set; }
    public string TokenType { get; set; } = string.Empty;
}

public class KoreanMorphemeDto
{
    public string Surface { get; set; } = string.Empty; // 표면형
    public string Lemma { get; set; } = string.Empty; // 기본형
    public string PartOfSpeech { get; set; } = string.Empty; // 품사
    public string Features { get; set; } = string.Empty; // 형태적 특징
}

public class KoreanParticleAnalysisDto
{
    public string Particle { get; set; } = string.Empty; // 조사
    public string Function { get; set; } = string.Empty; // 기능
    public string AttachedWord { get; set; } = string.Empty; // 결합 단어
    public bool IsAppropriate { get; set; } // 적절성
}

public class KoreanVerbConjugationDto
{
    public string BaseForm { get; set; } = string.Empty; // 기본형
    public string ConjugatedForm { get; set; } = string.Empty; // 활용형
    public string HonorificLevel { get; set; } = string.Empty; // 높임 수준
    public string Tense { get; set; } = string.Empty; // 시제
    public string Mood { get; set; } = string.Empty; // 법
}

public class KoreanSentenceStructureDto
{
    public string Structure { get; set; } = string.Empty; // "SOV", "SVO", etc.
    public List<string> Clauses { get; set; } = new(); // 절 구조
    public bool IsComplete { get; set; } // 문장 완성도
}

public class KoreanCulturalMarkerDto
{
    public string Marker { get; set; } = string.Empty;
    public string MarkerType { get; set; } = string.Empty; // "generational", "regional", "occupational"
    public string CulturalContext { get; set; } = string.Empty;
    public decimal Appropriateness { get; set; }
}

public class KoreanGenerationalReferenceDto
{
    public string Reference { get; set; } = string.Empty;
    public string TargetGeneration { get; set; } = string.Empty;
    public string ReferenceType { get; set; } = string.Empty; // "slang", "cultural_event", "historical_reference"
    public decimal RelevanceScore { get; set; }
}

public class KoreanRegionalReferenceDto
{
    public string Reference { get; set; } = string.Empty;
    public string TargetRegion { get; set; } = string.Empty;
    public string ReferenceType { get; set; } = string.Empty; // "local_landmark", "regional_issue", "dialect_term"
    public decimal RelevanceScore { get; set; }
}

public class KoreanPoliticalTermDto
{
    public string Term { get; set; } = string.Empty;
    public string TermType { get; set; } = string.Empty; // "party", "policy", "position"
    public bool IsNeutral { get; set; }
    public bool IsControversial { get; set; }
    public decimal SafetyScore { get; set; }
    public List<string> Alternatives { get; set; } = new();
}

public class KoreanComplianceIssueDto
{
    public string IssueType { get; set; } = string.Empty; // "election_law", "political_fund_law"
    public string Severity { get; set; } = string.Empty; // "critical", "warning", "info"
    public string Description { get; set; } = string.Empty;
    public string LegalReference { get; set; } = string.Empty;
    public List<string> Suggestions { get; set; } = new();
}