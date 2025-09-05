using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// Korean Language Processing Controller
/// 한국어 언어 처리 컨트롤러
/// 
/// Provides comprehensive Korean linguistic processing APIs including dialect conversion,
/// honorific adjustment, cultural sensitivity validation, and morphological analysis
/// </summary>
[ApiController]
[Route("api/korean-language")]
[Authorize]
public class KoreanLanguageController : ControllerBase
{
    private readonly IKoreanLanguageProcessingService _koreanLanguageService;
    private readonly ILogger<KoreanLanguageController> _logger;

    public KoreanLanguageController(
        IKoreanLanguageProcessingService koreanLanguageService,
        ILogger<KoreanLanguageController> logger)
    {
        _koreanLanguageService = koreanLanguageService;
        _logger = logger;
    }

    /// <summary>
    /// Comprehensive Korean text analysis
    /// 종합적인 한국어 텍스트 분석
    /// </summary>
    /// <param name="request">Analysis request with text and target parameters</param>
    /// <returns>Comprehensive analysis results including dialect, honorific, morphological, cultural, and political analysis</returns>
    [HttpPost("analyze-text")]
    [ProducesResponseType(typeof(KoreanTextAnalysisResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanTextAnalysisResponse>> AnalyzeText([FromBody] KoreanTextAnalysisRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Analyzing Korean text for tenant {TenantId}. Length: {Length} characters", 
                tenantId, request.Text.Length);

            var result = await _koreanLanguageService.AnalyzeTextAsync(tenantId, request);
            
            _logger.LogInformation("Korean text analysis completed for tenant {TenantId} with confidence {Confidence:F2}", 
                tenantId, result.OverallConfidence);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for Korean text analysis");
            return BadRequest(new { Error = "잘못된 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Korean text analysis");
            return StatusCode(500, new { Error = "한국어 텍스트 분석 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Convert text between Korean regional dialects
    /// 한국어 지역 방언 간 텍스트 변환
    /// </summary>
    /// <param name="request">Dialect conversion request</param>
    /// <returns>Converted text with confidence scoring and alternatives</returns>
    [HttpPost("convert-dialect")]
    [ProducesResponseType(typeof(KoreanDialectConversionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanDialectConversionResponse>> ConvertDialect([FromBody] KoreanDialectConversionRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Converting Korean dialect to {TargetDialect} for tenant {TenantId}", 
                request.TargetDialect, tenantId);

            var result = await _koreanLanguageService.ConvertDialectAsync(tenantId, request);
            
            _logger.LogInformation("Dialect conversion completed for tenant {TenantId} with confidence {Confidence:F2}", 
                tenantId, result.ConversionConfidence);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for dialect conversion");
            return BadRequest(new { Error = "잘못된 방언 변환 요청입니다.", Details = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Unsupported dialect conversion requested");
            return BadRequest(new { Error = "지원되지 않는 방언 변환입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during dialect conversion");
            return StatusCode(500, new { Error = "방언 변환 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Adjust Korean honorific levels based on target demographics
    /// 대상 인구통계에 기반한 한국어 높임법 조정
    /// </summary>
    /// <param name="request">Honorific adjustment request</param>
    /// <returns>Adjusted text with honorific change details</returns>
    [HttpPost("adjust-formality")]
    [ProducesResponseType(typeof(KoreanHonorificAdjustmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanHonorificAdjustmentResponse>> AdjustFormality([FromBody] KoreanHonorificAdjustmentRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Adjusting Korean formality to {FormalityLevel} for tenant {TenantId}", 
                request.TargetFormalityLevel, tenantId);

            var result = await _koreanLanguageService.AdjustFormalityAsync(tenantId, request);
            
            _logger.LogInformation("Formality adjustment completed for tenant {TenantId} with confidence {Confidence:F2}", 
                tenantId, result.AdjustmentConfidence);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for formality adjustment");
            return BadRequest(new { Error = "잘못된 높임법 조정 요청입니다.", Details = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Unsupported formality level requested");
            return BadRequest(new { Error = "지원되지 않는 높임법 수준입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during formality adjustment");
            return StatusCode(500, new { Error = "높임법 조정 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Validate cultural appropriateness and sensitivity
    /// 문화적 적절성 및 민감성 검증
    /// </summary>
    /// <param name="request">Cultural validation request</param>
    /// <returns>Cultural validation results with issues and suggestions</returns>
    [HttpPost("validate-cultural")]
    [ProducesResponseType(typeof(KoreanCulturalValidationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanCulturalValidationResponse>> ValidateCultural([FromBody] KoreanCulturalValidationRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Validating cultural appropriateness with {SensitivityLevel} sensitivity for tenant {TenantId}", 
                request.SensitivityLevel, tenantId);

            var result = await _koreanLanguageService.ValidateCulturalAppropriatenessAsync(tenantId, request);
            
            _logger.LogInformation("Cultural validation completed for tenant {TenantId}. Appropriate: {IsAppropriate}, Score: {Score:F2}", 
                tenantId, result.IsAppropriate, result.AppropriatenessScore);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for cultural validation");
            return BadRequest(new { Error = "잘못된 문화적 검증 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during cultural validation");
            return StatusCode(500, new { Error = "문화적 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Batch process multiple texts for personalization
    /// 개인화를 위한 다중 텍스트 일괄 처리
    /// </summary>
    /// <param name="request">Batch personalization request</param>
    /// <returns>Batch processing results with statistics</returns>
    [HttpPost("personalize-batch")]
    [ProducesResponseType(typeof(KoreanBatchPersonalizationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    public async Task<ActionResult<KoreanBatchPersonalizationResponse>> PersonalizeBatch([FromBody] KoreanBatchPersonalizationRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            // Check batch size limits
            if (request.TextItems.Count > 10000)
            {
                return StatusCode(413, new { Error = "일괄 처리는 최대 10,000개 항목까지 지원됩니다." });
            }

            _logger.LogInformation("Processing batch personalization for {Count} items for tenant {TenantId}", 
                request.TextItems.Count, tenantId);

            var result = await _koreanLanguageService.PersonalizeBatchAsync(tenantId, request);
            
            _logger.LogInformation("Batch personalization completed for tenant {TenantId}. Success rate: {SuccessRate:F2}%, Total time: {TotalTime}ms", 
                tenantId, result.Statistics.SuccessRate * 100, result.TotalProcessingTimeMs);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for batch personalization");
            return BadRequest(new { Error = "잘못된 일괄 개인화 요청입니다.", Details = ex.Message });
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Batch processing timeout");
            return StatusCode(408, new { Error = "일괄 처리 시간이 초과되었습니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during batch personalization");
            return StatusCode(500, new { Error = "일괄 개인화 처리 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Detect Korean dialect from text
    /// 텍스트에서 한국어 방언 감지
    /// </summary>
    /// <param name="request">Text to analyze for dialect detection</param>
    /// <returns>Detected dialect information with confidence</returns>
    [HttpPost("detect-dialect")]
    [ProducesResponseType(typeof(KoreanDialectAnalysisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanDialectAnalysisDto>> DetectDialect([FromBody] DetectDialectRequest request)
    {
        try
        {
            _logger.LogInformation("Detecting Korean dialect for text with {Length} characters", request.Text.Length);

            var result = await _koreanLanguageService.DetectDialectAsync(request.Text);
            
            _logger.LogInformation("Dialect detection completed. Detected: {Dialect} with confidence {Confidence:F2}", 
                result.DetectedDialect, result.ConfidenceScore);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for dialect detection");
            return BadRequest(new { Error = "잘못된 방언 감지 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during dialect detection");
            return StatusCode(500, new { Error = "방언 감지 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Analyze Korean honorific levels and consistency
    /// 한국어 높임법 수준 및 일관성 분석
    /// </summary>
    /// <param name="request">Text to analyze for honorific levels</param>
    /// <returns>Honorific analysis with consistency checking</returns>
    [HttpPost("analyze-honorific")]
    [ProducesResponseType(typeof(KoreanHonorificAnalysisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanHonorificAnalysisDto>> AnalyzeHonorific([FromBody] AnalyzeHonorificRequest request)
    {
        try
        {
            _logger.LogInformation("Analyzing Korean honorific levels for text with {Length} characters", request.Text.Length);

            var result = await _koreanLanguageService.AnalyzeHonorificAsync(request.Text);
            
            _logger.LogInformation("Honorific analysis completed. Level: {Level}, Consistency: {Consistency:F2}", 
                result.DetectedFormalityLevel, result.ConsistencyScore);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for honorific analysis");
            return BadRequest(new { Error = "잘못된 높임법 분석 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during honorific analysis");
            return StatusCode(500, new { Error = "높임법 분석 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get available Korean dialects
    /// 사용 가능한 한국어 방언 목록 조회
    /// </summary>
    /// <returns>List of available dialects with characteristics</returns>
    [HttpGet("dialects")]
    [ProducesResponseType(typeof(List<KoreanDialectProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<KoreanDialectProfileDto>>> GetAvailableDialects()
    {
        try
        {
            _logger.LogInformation("Retrieving available Korean dialects");

            var dialectProfiles = await _koreanLanguageService.GetAvailableDialectsAsync();
            
            var dialectDtos = dialectProfiles.Select(d => new KoreanDialectProfileDto
            {
                DialectCode = d.DialectCode,
                DialectName = d.DialectName,
                RegionCode = d.RegionCode,
                RegionName = d.RegionName,
                Description = d.Description,
                UsageFrequency = d.UsageFrequency,
                IsActive = d.IsActive
            }).ToList();
            
            _logger.LogInformation("Retrieved {Count} available Korean dialects", dialectDtos.Count);
            
            return Ok(dialectDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available dialects");
            return StatusCode(500, new { Error = "방언 목록 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get honorific contexts and usage patterns
    /// 높임법 맥락 및 사용 패턴 조회
    /// </summary>
    /// <returns>List of honorific contexts with usage patterns</returns>
    [HttpGet("honorific-contexts")]
    [ProducesResponseType(typeof(List<HonorificContextDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<HonorificContextDto>>> GetHonorificContexts()
    {
        try
        {
            _logger.LogInformation("Retrieving Korean honorific contexts");

            var contexts = await _koreanLanguageService.GetHonorificContextsAsync();
            
            var contextDtos = contexts.Select(c => new HonorificContextDto
            {
                ContextCode = c.ContextCode,
                ContextName = c.ContextName,
                Description = c.Description,
                HonorificLevel = c.HonorificLevel,
                SpeechLevel = c.SpeechLevel,
                AgeRelationship = c.AgeRelationship,
                SocialStatus = c.SocialStatus,
                Formality = c.Formality,
                AppropriatenessScore = c.AppropriatenessScore,
                IsActive = c.IsActive
            }).ToList();
            
            _logger.LogInformation("Retrieved {Count} honorific contexts", contextDtos.Count);
            
            return Ok(contextDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving honorific contexts");
            return StatusCode(500, new { Error = "높임법 맥락 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get processing performance statistics
    /// 처리 성능 통계 조회
    /// </summary>
    /// <param name="hours">Statistics time range in hours (default: 24)</param>
    /// <returns>Performance statistics for the specified time range</returns>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(KoreanProcessingStatistics), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanProcessingStatistics>> GetProcessingStatistics([FromQuery] int hours = 24)
    {
        try
        {
            if (hours <= 0 || hours > 720) // Max 30 days
            {
                return BadRequest(new { Error = "시간 범위는 1시간에서 720시간(30일) 사이여야 합니다." });
            }

            _logger.LogInformation("Retrieving Korean processing statistics for last {Hours} hours", hours);

            var timeRange = TimeSpan.FromHours(hours);
            var statistics = await _koreanLanguageService.GetProcessingStatisticsAsync(timeRange);
            
            _logger.LogInformation("Retrieved processing statistics. Total requests: {TotalRequests}, Success rate: {SuccessRate:F2}%", 
                statistics.TotalRequests, statistics.SuccessRate * 100);
            
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving processing statistics");
            return StatusCode(500, new { Error = "처리 통계 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Validate text against Korean election law compliance
    /// 한국 선거법 준수성에 대한 텍스트 검증
    /// </summary>
    /// <param name="request">Election compliance validation request</param>
    /// <returns>Compliance validation with issues and suggestions</returns>
    [HttpPost("validate-election-compliance")]
    [ProducesResponseType(typeof(KoreanComplianceValidationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanComplianceValidationResult>> ValidateElectionCompliance([FromBody] ValidateElectionComplianceRequest request)
    {
        try
        {
            _logger.LogInformation("Validating Korean election law compliance for context: {Context}", request.Context);

            var result = await _koreanLanguageService.ValidateElectionComplianceAsync(request.Text, request.Context);
            
            _logger.LogInformation("Election compliance validation completed. Compliant: {IsCompliant}, Score: {Score:F2}", 
                result.IsCompliant, result.ComplianceScore);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for election compliance validation");
            return BadRequest(new { Error = "잘못된 선거법 준수성 검증 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during election compliance validation");
            return StatusCode(500, new { Error = "선거법 준수성 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get text quality metrics for Korean content
    /// 한국어 콘텐츠의 텍스트 품질 지표 조회
    /// </summary>
    /// <param name="request">Text quality evaluation request</param>
    /// <returns>Quality metrics including fluency, clarity, and engagement scores</returns>
    [HttpPost("evaluate-quality")]
    [ProducesResponseType(typeof(KoreanTextQualityMetrics), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<KoreanTextQualityMetrics>> EvaluateTextQuality([FromBody] EvaluateTextQualityRequest request)
    {
        try
        {
            _logger.LogInformation("Evaluating Korean text quality for text with {Length} characters", request.Text.Length);

            var result = await _koreanLanguageService.EvaluateTextQualityAsync(request.Text, request.TargetAudience);
            
            _logger.LogInformation("Text quality evaluation completed. Fluency: {Fluency:F2}, Clarity: {Clarity:F2}, Engagement: {Engagement:F2}", 
                result.FluencyScore, result.ClarityScore, result.EngagementScore);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for text quality evaluation");
            return BadRequest(new { Error = "잘못된 텍스트 품질 평가 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during text quality evaluation");
            return StatusCode(500, new { Error = "텍스트 품질 평가 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Generate alternative expressions for problematic terms
    /// 문제가 있는 용어에 대한 대안 표현 생성
    /// </summary>
    /// <param name="request">Alternative expressions generation request</param>
    /// <returns>List of alternative expressions with appropriateness scores</returns>
    [HttpPost("generate-alternatives")]
    [ProducesResponseType(typeof(List<KoreanAlternativeExpressionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<KoreanAlternativeExpressionDto>>> GenerateAlternatives([FromBody] GenerateAlternativesRequest request)
    {
        try
        {
            _logger.LogInformation("Generating alternative expressions for problematic text in context: {Context}", request.Context);

            var result = await _koreanLanguageService.GenerateAlternativeExpressionsAsync(
                request.ProblematicText, request.Context, request.TargetAudience);
            
            _logger.LogInformation("Generated {Count} alternative expressions", result.Count);
            
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request for generating alternatives");
            return BadRequest(new { Error = "잘못된 대안 표현 생성 요청입니다.", Details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during alternative expressions generation");
            return StatusCode(500, new { Error = "대안 표현 생성 중 오류가 발생했습니다." });
        }
    }
}

// Request DTOs for the controller endpoints
public class DetectDialectRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
}

public class AnalyzeHonorificRequest  
{
    [Required]
    public string Text { get; set; } = string.Empty;
}

public class ValidateElectionComplianceRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    [Required]
    public string Context { get; set; } = string.Empty; // "campaign", "advertisement", "debate", etc.
}

public class EvaluateTextQualityRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    public KoreanPersonalizationTarget? TargetAudience { get; set; }
}

public class GenerateAlternativesRequest
{
    [Required]
    public string ProblematicText { get; set; } = string.Empty;
    
    [Required]
    public string Context { get; set; } = string.Empty;
    
    public KoreanPersonalizationTarget? TargetAudience { get; set; }
}

// Response DTOs for controller endpoints  
public class KoreanDialectProfileDto
{
    public string DialectCode { get; set; } = string.Empty;
    public string DialectName { get; set; } = string.Empty;
    public string RegionCode { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal UsageFrequency { get; set; }
    public bool IsActive { get; set; }
}

public class HonorificContextDto
{
    public string ContextCode { get; set; } = string.Empty;
    public string ContextName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string HonorificLevel { get; set; } = string.Empty;
    public string SpeechLevel { get; set; } = string.Empty;
    public string AgeRelationship { get; set; } = string.Empty;
    public string SocialStatus { get; set; } = string.Empty;
    public string Formality { get; set; } = string.Empty;
    public decimal AppropriatenessScore { get; set; }
    public bool IsActive { get; set; }
}