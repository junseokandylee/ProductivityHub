using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Models;

/// <summary>
/// Korean dialect profile with regional characteristics and conversion rules
/// 한국어 방언 프로필 - 지역별 특성 및 변환 규칙
/// </summary>
public class KoreanDialectProfile
{
    public int Id { get; set; }
    public string DialectCode { get; set; } = string.Empty; // "seoul", "busan", "daegu", etc.
    public string DialectName { get; set; } = string.Empty; // "서울말", "부산말", etc.
    public string RegionCode { get; set; } = string.Empty; // "11", "26", "27", etc. (행정구역코드)
    public string RegionName { get; set; } = string.Empty; // "서울", "부산", etc.
    public string Description { get; set; } = string.Empty;
    
    // Linguistic characteristics
    public string PhoneticCharacteristics { get; set; } = string.Empty; // JSON: 음성학적 특징
    public string SyntacticPatterns { get; set; } = string.Empty; // JSON: 문법적 패턴
    public string VocabularyVariations { get; set; } = string.Empty; // JSON: 어휘 변형
    public string IntonationPatterns { get; set; } = string.Empty; // JSON: 억양 패턴
    
    // Conversion rules
    public string ConversionRules { get; set; } = string.Empty; // JSON: 표준어→방언 변환 규칙
    public string ExampleMappings { get; set; } = string.Empty; // JSON: 예시 매핑
    
    // Cultural context
    public string CulturalMarkers { get; set; } = string.Empty; // JSON: 문화적 표지
    public string RegionalIssues { get; set; } = string.Empty; // JSON: 지역별 관심사
    public decimal UsageFrequency { get; set; } // 사용 빈도 (0.0-1.0)
    
    // Metadata
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Honorific context for appropriate respect levels
/// 높임법 맥락 - 적절한 존대 수준
/// </summary>
public class HonorificContext
{
    public int Id { get; set; }
    public string ContextCode { get; set; } = string.Empty; // "elder_to_younger", "formal_business", etc.
    public string ContextName { get; set; } = string.Empty; // "연장자→연소자", "공식 업무" etc.
    public string Description { get; set; } = string.Empty;
    
    // Honorific levels
    public string HonorificLevel { get; set; } = string.Empty; // "격식체", "비격식체", "존댓말", "반말"
    public string SpeechLevel { get; set; } = string.Empty; // "하십시오체", "해요체", "해체" etc.
    public string VerbEndings { get; set; } = string.Empty; // JSON: 동사 어미 패턴
    public string NounModifiers { get; set; } = string.Empty; // JSON: 명사 수식어 패턴
    
    // Usage contexts
    public string AgeRelationship { get; set; } = string.Empty; // "older", "younger", "peer", "unknown"
    public string SocialStatus { get; set; } = string.Empty; // "higher", "equal", "lower", "unknown"
    public string Formality { get; set; } = string.Empty; // "very_formal", "formal", "informal", "casual"
    public string ProfessionalContext { get; set; } = string.Empty; // JSON: 직업별 맥락
    
    // Conversion patterns
    public string ConversionRules { get; set; } = string.Empty; // JSON: 높임법 변환 규칙
    public string ExampleTransformations { get; set; } = string.Empty; // JSON: 변환 예시
    
    // Metadata
    public decimal AppropriatenessScore { get; set; } // 적절성 점수 (0.0-1.0)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean political terminology with usage guidelines
/// 한국 정치 용어 - 사용 지침
/// </summary>
public class PoliticalTerminology
{
    public int Id { get; set; }
    public string Term { get; set; } = string.Empty; // 정치 용어
    public string Category { get; set; } = string.Empty; // "party", "policy", "position", "law" etc.
    public string Definition { get; set; } = string.Empty; // 용어 정의
    
    // Usage context
    public string UsageContext { get; set; } = string.Empty; // JSON: 사용 맥락
    public string RegionalVariations { get; set; } = string.Empty; // JSON: 지역별 표현 차이
    public string FormalityLevel { get; set; } = string.Empty; // "formal", "informal", "neutral"
    
    // Appropriateness
    public bool IsNeutral { get; set; } // 중립적 용어 여부
    public bool IsControversial { get; set; } // 논란의 여지가 있는 용어
    public string AlternativeTerms { get; set; } = string.Empty; // JSON: 대체 용어들
    public string UsageGuidelines { get; set; } = string.Empty; // 사용 지침
    
    // Compliance
    public bool ElectionLawCompliant { get; set; } = true; // 공직선거법 준수
    public string LegalRestrictions { get; set; } = string.Empty; // 법적 제한사항
    public string ComplianceNotes { get; set; } = string.Empty; // 준수 관련 참고사항
    
    // Metadata
    public decimal SafetyScore { get; set; } // 안전성 점수 (0.0-1.0)
    public string SourceReferences { get; set; } = string.Empty; // JSON: 참조 출처
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Cultural sensitivity validation rules
/// 문화적 민감성 검증 규칙
/// </summary>
public class CulturalSensitivityRule
{
    public int Id { get; set; }
    public string RuleCode { get; set; } = string.Empty; // "age_respect", "gender_neutral", etc.
    public string RuleName { get; set; } = string.Empty; // "연령대 존중", "성 중립적 표현" etc.
    public string Category { get; set; } = string.Empty; // "age", "gender", "region", "religion", etc.
    public string Description { get; set; } = string.Empty;
    
    // Rule definition
    public string ValidationPattern { get; set; } = string.Empty; // JSON: 검증 패턴 (정규식, 키워드 등)
    public string ProblematicPatterns { get; set; } = string.Empty; // JSON: 문제가 될 수 있는 패턴
    public string PositivePatterns { get; set; } = string.Empty; // JSON: 권장 패턴
    
    // Severity and action
    public string Severity { get; set; } = string.Empty; // "critical", "warning", "info"
    public string Action { get; set; } = string.Empty; // "block", "warn", "suggest"
    public string SuggestionMessage { get; set; } = string.Empty; // 제안 메시지
    public string AlternativeSuggestions { get; set; } = string.Empty; // JSON: 대안 제안
    
    // Context awareness
    public string ApplicableRegions { get; set; } = string.Empty; // JSON: 적용 지역
    public string ApplicableAgeGroups { get; set; } = string.Empty; // JSON: 적용 연령대
    public string ApplicableContexts { get; set; } = string.Empty; // JSON: 적용 맥락
    
    // Metadata
    public decimal ConfidenceLevel { get; set; } // 신뢰도 (0.0-1.0)
    public int Priority { get; set; } = 1; // 우선순위 (1=highest)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean language processing result with confidence scoring
/// 한국어 처리 결과 - 신뢰도 점수 포함
/// </summary>
public class LanguagePersonalizationResult
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string ProcessedText { get; set; } = string.Empty;
    
    // Processing details
    public string DetectedDialect { get; set; } = string.Empty;
    public string TargetDialect { get; set; } = string.Empty;
    public string OriginalHonorificLevel { get; set; } = string.Empty;
    public string TargetHonorificLevel { get; set; } = string.Empty;
    
    // Demographics context
    public string TargetAgeGroup { get; set; } = string.Empty;
    public string TargetRegion { get; set; } = string.Empty;
    public string TargetOccupation { get; set; } = string.Empty;
    public string TargetEducationLevel { get; set; } = string.Empty;
    
    // Processing analysis
    public string MorphologicalAnalysis { get; set; } = string.Empty; // JSON: 형태소 분석 결과
    public string CulturalMarkers { get; set; } = string.Empty; // JSON: 감지된 문화적 표지
    public string PoliticalTerms { get; set; } = string.Empty; // JSON: 정치적 용어 분석
    public string SensitivityWarnings { get; set; } = string.Empty; // JSON: 민감성 경고
    
    // Confidence scoring
    public decimal OverallConfidence { get; set; } // 전체 신뢰도 (0.0-1.0)
    public decimal DialectAccuracy { get; set; } // 방언 정확도
    public decimal HonorificAccuracy { get; set; } // 높임법 정확도
    public decimal CulturalAppropriateness { get; set; } // 문화적 적절성
    public decimal PoliticalCompliance { get; set; } // 정치적 준수성
    
    // Quality metrics
    public decimal FluencyScore { get; set; } // 자연스러움 점수
    public decimal ClarityScore { get; set; } // 명확성 점수
    public decimal EngagementScore { get; set; } // 참여도 점수
    
    // Processing metadata
    public int ProcessingTimeMs { get; set; } // 처리 시간 (밀리초)
    public string ProcessingVersion { get; set; } = string.Empty; // 처리 엔진 버전
    public bool HasWarnings { get; set; } // 경고 존재 여부
    public bool HasErrors { get; set; } // 오류 존재 여부
    
    // Audit trail
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    public string ProcessedBy { get; set; } = string.Empty; // 사용자 또는 시스템
    public string SessionId { get; set; } = string.Empty; // 처리 세션 ID
}

/// <summary>
/// Korean morphological analysis result
/// 한국어 형태소 분석 결과
/// </summary>
public class KoreanMorphologicalAnalysis
{
    public int Id { get; set; }
    public string OriginalText { get; set; } = string.Empty;
    public string TokenizedText { get; set; } = string.Empty; // JSON: 토큰화 결과
    
    // Morphological breakdown
    public string Morphemes { get; set; } = string.Empty; // JSON: 형태소 분석
    public string PartOfSpeech { get; set; } = string.Empty; // JSON: 품사 태깅
    public string SentenceStructure { get; set; } = string.Empty; // JSON: 문장 구조 분석
    
    // Korean-specific analysis
    public string ParticleAnalysis { get; set; } = string.Empty; // JSON: 조사 분석
    public string VerbConjugation { get; set; } = string.Empty; // JSON: 동사 활용 분석
    public string HonorificMarkers { get; set; } = string.Empty; // JSON: 높임 표지 분석
    public string DialectMarkers { get; set; } = string.Empty; // JSON: 방언 표지 분석
    
    // Quality metrics
    public decimal AnalysisConfidence { get; set; } // 분석 신뢰도
    public bool IsComplete { get; set; } = true; // 분석 완료 여부
    public string AnalysisErrors { get; set; } = string.Empty; // JSON: 분석 오류
    
    // Metadata
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
    public string AnalyzerVersion { get; set; } = string.Empty;
}

/// <summary>
/// Korean generational communication preferences
/// 한국인 세대별 소통 선호도
/// </summary>
public class GenerationalPreferences
{
    public int Id { get; set; }
    public string GenerationCode { get; set; } = string.Empty; // "baby_boomer", "gen_x", "millennial", "gen_z"
    public string GenerationName { get; set; } = string.Empty; // "베이비부머", "X세대", "밀레니얼", "Z세대"
    public string AgeRange { get; set; } = string.Empty; // "1955-1963", "1964-1980", etc.
    
    // Communication preferences
    public string PreferredFormalityLevel { get; set; } = string.Empty; // 선호 격식 수준
    public string PreferredDialect { get; set; } = string.Empty; // 선호 방언
    public string CommunicationStyle { get; set; } = string.Empty; // 소통 스타일
    
    // Language characteristics
    public string TypicalExpressions { get; set; } = string.Empty; // JSON: 특징적 표현
    public string AvoidedTerms { get; set; } = string.Empty; // JSON: 기피 용어
    public string PreferredTerms { get; set; } = string.Empty; // JSON: 선호 용어
    
    // Cultural references
    public string CulturalReferences { get; set; } = string.Empty; // JSON: 문화적 참조점
    public string HistoricalContext { get; set; } = string.Empty; // JSON: 역사적 맥락
    public string SharedExperiences { get; set; } = string.Empty; // JSON: 공통 경험
    
    // Political engagement
    public string PoliticalEngagementStyle { get; set; } = string.Empty; // 정치 참여 스타일
    public string PreferredPoliticalTerms { get; set; } = string.Empty; // JSON: 선호 정치 용어
    public string SensitivePoliticalTopics { get; set; } = string.Empty; // JSON: 민감한 정치 주제
    
    // Metadata
    public decimal ReliabilityScore { get; set; } // 신뢰성 점수 (0.0-1.0)
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}