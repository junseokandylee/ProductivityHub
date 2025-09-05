using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Korean Language Processing Service Interface
/// 한국어 언어 처리 서비스 인터페이스
/// 
/// Provides comprehensive Korean linguistic analysis, dialect conversion,
/// honorific adjustment, and cultural sensitivity validation
/// </summary>
public interface IKoreanLanguageProcessingService
{
    /// <summary>
    /// Comprehensive Korean text analysis
    /// 종합적인 한국어 텍스트 분석
    /// </summary>
    /// <param name="tenantId">Tenant identifier</param>
    /// <param name="request">Analysis request with text and target parameters</param>
    /// <returns>Comprehensive analysis results including dialect, honorific, morphological, cultural, and political analysis</returns>
    Task<KoreanTextAnalysisResponse> AnalyzeTextAsync(Guid tenantId, KoreanTextAnalysisRequest request);

    /// <summary>
    /// Convert text between Korean regional dialects
    /// 한국어 지역 방언 간 텍스트 변환
    /// </summary>
    /// <param name="tenantId">Tenant identifier</param>
    /// <param name="request">Dialect conversion request</param>
    /// <returns>Converted text with confidence scoring and alternatives</returns>
    Task<KoreanDialectConversionResponse> ConvertDialectAsync(Guid tenantId, KoreanDialectConversionRequest request);

    /// <summary>
    /// Adjust Korean honorific levels based on target demographics
    /// 대상 인구통계에 기반한 한국어 높임법 조정
    /// </summary>
    /// <param name="tenantId">Tenant identifier</param>
    /// <param name="request">Honorific adjustment request</param>
    /// <returns>Adjusted text with honorific change details</returns>
    Task<KoreanHonorificAdjustmentResponse> AdjustFormalityAsync(Guid tenantId, KoreanHonorificAdjustmentRequest request);

    /// <summary>
    /// Validate cultural appropriateness and sensitivity
    /// 문화적 적절성 및 민감성 검증
    /// </summary>
    /// <param name="tenantId">Tenant identifier</param>
    /// <param name="request">Cultural validation request</param>
    /// <returns>Cultural validation results with issues and suggestions</returns>
    Task<KoreanCulturalValidationResponse> ValidateCulturalAppropriatenessAsync(Guid tenantId, KoreanCulturalValidationRequest request);

    /// <summary>
    /// Batch process multiple texts for personalization
    /// 개인화를 위한 다중 텍스트 일괄 처리
    /// </summary>
    /// <param name="tenantId">Tenant identifier</param>
    /// <param name="request">Batch personalization request</param>
    /// <returns>Batch processing results with statistics</returns>
    Task<KoreanBatchPersonalizationResponse> PersonalizeBatchAsync(Guid tenantId, KoreanBatchPersonalizationRequest request);

    /// <summary>
    /// Detect Korean dialect from text
    /// 텍스트에서 한국어 방언 감지
    /// </summary>
    /// <param name="text">Text to analyze</param>
    /// <returns>Detected dialect information with confidence</returns>
    Task<KoreanDialectAnalysisDto> DetectDialectAsync(string text);

    /// <summary>
    /// Analyze Korean honorific levels and consistency
    /// 한국어 높임법 수준 및 일관성 분석
    /// </summary>
    /// <param name="text">Text to analyze</param>
    /// <returns>Honorific analysis with consistency checking</returns>
    Task<KoreanHonorificAnalysisDto> AnalyzeHonorificAsync(string text);

    /// <summary>
    /// Perform morphological analysis of Korean text
    /// 한국어 텍스트의 형태소 분석 수행
    /// </summary>
    /// <param name="text">Text to analyze</param>
    /// <returns>Morphological breakdown with POS tagging and structure analysis</returns>
    Task<KoreanMorphologicalAnalysisDto> PerformMorphologicalAnalysisAsync(string text);

    /// <summary>
    /// Analyze cultural context and appropriateness
    /// 문화적 맥락 및 적절성 분석
    /// </summary>
    /// <param name="text">Text to analyze</param>
    /// <param name="targetRegion">Target region code</param>
    /// <param name="targetAgeGroup">Target age group</param>
    /// <returns>Cultural analysis with markers and recommendations</returns>
    Task<KoreanCulturalAnalysisDto> AnalyzeCulturalContextAsync(string text, string? targetRegion = null, string? targetAgeGroup = null);

    /// <summary>
    /// Analyze political terms and compliance
    /// 정치적 용어 및 준수성 분석
    /// </summary>
    /// <param name="text">Text to analyze</param>
    /// <returns>Political analysis with safety scoring and compliance issues</returns>
    Task<KoreanPoliticalAnalysisDto> AnalyzePoliticalContentAsync(string text);

    /// <summary>
    /// Get available Korean dialects
    /// 사용 가능한 한국어 방언 목록 조회
    /// </summary>
    /// <returns>List of available dialects with characteristics</returns>
    Task<List<KoreanDialectProfile>> GetAvailableDialectsAsync();

    /// <summary>
    /// Get honorific contexts and rules
    /// 높임법 맥락 및 규칙 조회
    /// </summary>
    /// <returns>List of honorific contexts with usage patterns</returns>
    Task<List<HonorificContext>> GetHonorificContextsAsync();

    /// <summary>
    /// Get cultural sensitivity rules
    /// 문화적 민감성 규칙 조회
    /// </summary>
    /// <param name="category">Rule category filter (optional)</param>
    /// <returns>List of cultural sensitivity rules</returns>
    Task<List<CulturalSensitivityRule>> GetCulturalSensitivityRulesAsync(string? category = null);

    /// <summary>
    /// Get political terminology database
    /// 정치 용어 데이터베이스 조회
    /// </summary>
    /// <param name="category">Term category filter (optional)</param>
    /// <returns>List of political terms with usage guidelines</returns>
    Task<List<PoliticalTerminology>> GetPoliticalTerminologyAsync(string? category = null);

    /// <summary>
    /// Get generational communication preferences
    /// 세대별 소통 선호도 조회
    /// </summary>
    /// <param name="generationCode">Generation code filter (optional)</param>
    /// <returns>List of generational preferences</returns>
    Task<List<GenerationalPreferences>> GetGenerationalPreferencesAsync(string? generationCode = null);

    /// <summary>
    /// Personalize text for specific target demographics
    /// 특정 대상 인구통계에 맞춰 텍스트 개인화
    /// </summary>
    /// <param name="text">Original text</param>
    /// <param name="target">Target demographic profile</param>
    /// <param name="settings">Personalization settings</param>
    /// <returns>Personalized text with analysis</returns>
    Task<KoreanPersonalizationResultDto> PersonalizeForTargetAsync(
        string text, 
        KoreanPersonalizationTarget target,
        KoreanPersonalizationSettings? settings = null);

    /// <summary>
    /// Validate text against Korean election law compliance
    /// 한국 선거법 준수성에 대한 텍스트 검증
    /// </summary>
    /// <param name="text">Text to validate</param>
    /// <param name="context">Usage context (campaign, advertisement, etc.)</param>
    /// <returns>Compliance validation with issues and suggestions</returns>
    Task<KoreanComplianceValidationResult> ValidateElectionComplianceAsync(string text, string context);

    /// <summary>
    /// Get text quality metrics for Korean content
    /// 한국어 콘텐츠의 텍스트 품질 지표 조회
    /// </summary>
    /// <param name="text">Text to evaluate</param>
    /// <param name="targetAudience">Target audience profile</param>
    /// <returns>Quality metrics including fluency, clarity, and engagement scores</returns>
    Task<KoreanTextQualityMetrics> EvaluateTextQualityAsync(string text, KoreanPersonalizationTarget? targetAudience = null);

    /// <summary>
    /// Generate alternative expressions for problematic terms
    /// 문제가 있는 용어에 대한 대안 표현 생성
    /// </summary>
    /// <param name="problematicText">Problematic text or phrase</param>
    /// <param name="context">Usage context</param>
    /// <param name="targetAudience">Target audience</param>
    /// <returns>List of alternative expressions with appropriateness scores</returns>
    Task<List<KoreanAlternativeExpressionDto>> GenerateAlternativeExpressionsAsync(
        string problematicText,
        string context,
        KoreanPersonalizationTarget? targetAudience = null);

    /// <summary>
    /// Cache linguistic analysis results for performance optimization
    /// 성능 최적화를 위한 언어 분석 결과 캐싱
    /// </summary>
    /// <param name="cacheKey">Cache key</param>
    /// <param name="result">Analysis result to cache</param>
    /// <param name="expirationMinutes">Cache expiration in minutes</param>
    Task CacheAnalysisResultAsync(string cacheKey, object result, int expirationMinutes = 60);

    /// <summary>
    /// Retrieve cached analysis results
    /// 캐시된 분석 결과 조회
    /// </summary>
    /// <typeparam name="T">Result type</typeparam>
    /// <param name="cacheKey">Cache key</param>
    /// <returns>Cached result or null if not found</returns>
    Task<T?> GetCachedAnalysisResultAsync<T>(string cacheKey) where T : class;

    /// <summary>
    /// Update linguistic models with new data
    /// 새로운 데이터로 언어 모델 업데이트
    /// </summary>
    /// <param name="modelType">Type of model to update</param>
    /// <param name="updateData">Update data in JSON format</param>
    /// <returns>Success status and update details</returns>
    Task<KoreanModelUpdateResult> UpdateLinguisticModelAsync(string modelType, string updateData);

    /// <summary>
    /// Get processing performance statistics
    /// 처리 성능 통계 조회
    /// </summary>
    /// <param name="timeRange">Time range for statistics</param>
    /// <returns>Performance statistics</returns>
    Task<KoreanProcessingStatistics> GetProcessingStatisticsAsync(TimeSpan timeRange);
}

// Supporting DTOs for additional functionality

/// <summary>
/// Korean compliance validation result
/// 한국어 준수성 검증 결과
/// </summary>
public class KoreanComplianceValidationResult
{
    public bool IsCompliant { get; set; }
    public decimal ComplianceScore { get; set; } // 0.0-1.0
    public List<KoreanComplianceIssueDto> Issues { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public string LegalContext { get; set; } = string.Empty;
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Korean text quality metrics
/// 한국어 텍스트 품질 지표
/// </summary>
public class KoreanTextQualityMetrics
{
    public decimal FluencyScore { get; set; } // 유창성 점수 (0.0-1.0)
    public decimal ClarityScore { get; set; } // 명확성 점수 (0.0-1.0)
    public decimal EngagementScore { get; set; } // 참여도 점수 (0.0-1.0)
    public decimal ReadabilityScore { get; set; } // 가독성 점수 (0.0-1.0)
    public decimal CulturalRelevanceScore { get; set; } // 문화적 관련성 점수 (0.0-1.0)
    public int SentenceCount { get; set; } // 문장 수
    public int WordCount { get; set; } // 단어 수
    public int CharacterCount { get; set; } // 글자 수
    public decimal AverageSentenceLength { get; set; } // 평균 문장 길이
    public List<string> QualityIssues { get; set; } = new(); // 품질 이슈
    public List<string> ImprovementSuggestions { get; set; } = new(); // 개선 제안
}

/// <summary>
/// Korean alternative expression DTO
/// 한국어 대안 표현 DTO
/// </summary>
public class KoreanAlternativeExpressionDto
{
    public string AlternativeText { get; set; } = string.Empty;
    public decimal AppropriatenessScore { get; set; } // 적절성 점수 (0.0-1.0)
    public string ReasonForAlternative { get; set; } = string.Empty;
    public List<string> ContextualNotes { get; set; } = new();
    public bool IsPreferred { get; set; } // 권장 대안 여부
}

/// <summary>
/// Korean model update result
/// 한국어 모델 업데이트 결과
/// </summary>
public class KoreanModelUpdateResult
{
    public bool Success { get; set; }
    public string ModelType { get; set; } = string.Empty;
    public int UpdatedRecords { get; set; }
    public List<string> UpdatedFeatures { get; set; } = new();
    public List<string> Errors { get; set; } = new();
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string Version { get; set; } = string.Empty; // 모델 버전
}

/// <summary>
/// Korean processing statistics
/// 한국어 처리 통계
/// </summary>
public class KoreanProcessingStatistics
{
    public int TotalRequests { get; set; }
    public int SuccessfulRequests { get; set; }
    public int FailedRequests { get; set; }
    public decimal SuccessRate => TotalRequests > 0 ? (decimal)SuccessfulRequests / TotalRequests : 0;
    public decimal AverageProcessingTimeMs { get; set; }
    public decimal AverageConfidenceScore { get; set; }
    public Dictionary<string, int> RequestTypeDistribution { get; set; } = new();
    public Dictionary<string, int> DialectDistribution { get; set; } = new();
    public Dictionary<string, int> ErrorTypeDistribution { get; set; } = new();
    public TimeSpan StatisticsTimeRange { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}