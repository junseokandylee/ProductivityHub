using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// Korean Election Law Compliance Controller
/// Provides real-time compliance validation for 공직선거법, 정치자금법, and 개인정보보호법
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ComplianceController : ControllerBase
{
    private readonly IKoreanElectionLawComplianceService _complianceService;
    private readonly IKoreanLanguageProcessingService _koreanLanguageService;
    private readonly ILogger<ComplianceController> _logger;

    public ComplianceController(
        IKoreanElectionLawComplianceService complianceService,
        IKoreanLanguageProcessingService koreanLanguageService,
        ILogger<ComplianceController> logger)
    {
        _complianceService = complianceService;
        _koreanLanguageService = koreanLanguageService;
        _logger = logger;
    }

    /// <summary>
    /// Validate message content for Korean election law compliance
    /// 메시지 콘텐츠의 공직선거법 규정 준수 검증
    /// </summary>
    [HttpPost("validate-message")]
    public async Task<ActionResult<ComplianceValidationResult>> ValidateMessage([FromBody] ValidateMessageRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Validating message content with Korean language processing for tenant {TenantId}", tenantId);

            // 기존 컴플라이언스 서비스 검증
            var basicResult = await _complianceService.ValidateMessageContentAsync(
                tenantId, 
                request.Content, 
                request.Channel, 
                request.CampaignId);

            // Korean Language Processing Service를 통한 고급 검증
            var koreanValidationResult = await _koreanLanguageService.ValidateElectionComplianceAsync(
                request.Content, request.Channel);

            // 두 결과를 통합하여 종합적인 컴플라이언스 결과 생성
            var enhancedResult = MergeComplianceResults(basicResult, koreanValidationResult, request.Content);

            _logger.LogInformation("Enhanced message validation completed. Compliant: {IsCompliant}, Issues: {IssueCount}",
                enhancedResult.IsCompliant, enhancedResult.Issues?.Count ?? 0);

            return Ok(enhancedResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating message content");
            return StatusCode(500, new { Error = "메시지 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Validate campaign spending against 정치자금법 limits
    /// 캠페인 지출의 정치자금법 한도 검증
    /// </summary>
    [HttpPost("validate-spending")]
    public async Task<ActionResult<ComplianceValidationResult>> ValidateSpending([FromBody] ValidateSpendingRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var result = await _complianceService.ValidateSpendingAsync(
                tenantId, 
                request.Amount, 
                request.Category, 
                request.CampaignId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating spending");
            return StatusCode(500, new { Error = "지출 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Validate data usage for 개인정보보호법 compliance
    /// 개인정보 사용의 개인정보보호법 준수 검증
    /// </summary>
    [HttpPost("validate-privacy")]
    public async Task<ActionResult<ComplianceValidationResult>> ValidatePrivacy([FromBody] ValidatePrivacyRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var result = await _complianceService.ValidateDataUsageAsync(
                tenantId, 
                request.ContactId, 
                request.Purpose, 
                request.DataCategories);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating privacy");
            return StatusCode(500, new { Error = "개인정보 사용 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get compliance dashboard data
    /// 규정 준수 대시보드 데이터 조회
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<ComplianceDashboardData>> GetDashboard()
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var dashboard = await _complianceService.GetDashboardDataAsync(tenantId);
            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compliance dashboard");
            return StatusCode(500, new { Error = "대시보드 데이터 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get spending compliance status
    /// 지출 규정 준수 상태 조회
    /// </summary>
    [HttpGet("spending-status")]
    public async Task<ActionResult<SpendingComplianceStatus>> GetSpendingStatus([FromQuery] string? category = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var status = await _complianceService.GetSpendingStatusAsync(tenantId, category);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting spending status");
            return StatusCode(500, new { Error = "지출 상태 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get active compliance violations
    /// 활성 규정 위반 사항 조회
    /// </summary>
    [HttpGet("violations")]
    public async Task<ActionResult<List<ComplianceViolation>>> GetViolations([FromQuery] string? severity = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var violations = await _complianceService.GetActiveViolationsAsync(tenantId, severity);
            return Ok(violations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting violations");
            return StatusCode(500, new { Error = "위반 사항 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Update violation status
    /// 위반 사항 상태 업데이트
    /// </summary>
    [HttpPut("violations/{violationId}/status")]
    public async Task<ActionResult<ComplianceViolation>> UpdateViolationStatus(
        int violationId, 
        [FromBody] UpdateViolationStatusRequest request)
    {
        try
        {
            var userId = HttpContext.GetUserId();
            
            var violation = await _complianceService.UpdateViolationStatusAsync(
                violationId, 
                request.Status, 
                request.Resolution, 
                userId);

            return Ok(violation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating violation status");
            return StatusCode(500, new { Error = "위반 사항 상태 업데이트 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Escalate compliance violation
    /// 규정 위반 사항 에스컬레이션
    /// </summary>
    [HttpPost("violations/{violationId}/escalate")]
    public async Task<ActionResult<ComplianceViolation>> EscalateViolation(
        int violationId, 
        [FromBody] EscalateViolationRequest request)
    {
        try
        {
            var violation = await _complianceService.EscalateViolationAsync(violationId, request.Reason);
            return Ok(violation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error escalating violation");
            return StatusCode(500, new { Error = "위반 사항 에스컬레이션 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get compliance rules
    /// 규정 준수 규칙 조회
    /// </summary>
    [HttpGet("rules")]
    public async Task<ActionResult<List<ComplianceRule>>> GetRules(
        [FromQuery] string? category = null, 
        [FromQuery] string? ruleType = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var rules = await _complianceService.GetActiveRulesAsync(tenantId, category, ruleType);
            return Ok(rules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compliance rules");
            return StatusCode(500, new { Error = "규정 준수 규칙 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Create new compliance rule
    /// 새로운 규정 준수 규칙 생성
    /// </summary>
    [HttpPost("rules")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ComplianceRule>> CreateRule([FromBody] CreateComplianceRuleRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var userId = HttpContext.GetUserId();

            var rule = new ComplianceRule
            {
                TenantId = tenantId,
                RuleCode = request.RuleCode,
                Name = request.Name,
                Description = request.Description,
                LegalCategory = request.LegalCategory,
                RuleType = request.RuleType,
                Severity = request.Severity,
                ValidationConfig = request.ValidationConfig,
                Action = request.Action,
                LegalReference = request.LegalReference,
                ApplicableChannels = request.ApplicableChannels,
                TimingRestrictions = request.TimingRestrictions,
                ViolationMessage = request.ViolationMessage,
                RemediationSuggestion = request.RemediationSuggestion,
                Priority = request.Priority,
                CreatedBy = userId
            };

            var createdRule = await _complianceService.CreateRuleAsync(rule);
            return CreatedAtAction(nameof(GetRules), new { }, createdRule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating compliance rule");
            return StatusCode(500, new { Error = "규정 준수 규칙 생성 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Update compliance rule
    /// 규정 준수 규칙 업데이트
    /// </summary>
    [HttpPut("rules/{ruleId}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ComplianceRule>> UpdateRule(int ruleId, [FromBody] UpdateComplianceRuleRequest request)
    {
        try
        {
            var userId = HttpContext.GetUserId();

            var rule = new ComplianceRule
            {
                Id = ruleId,
                Name = request.Name,
                Description = request.Description,
                Severity = request.Severity,
                ValidationConfig = request.ValidationConfig,
                Action = request.Action,
                LegalReference = request.LegalReference,
                ApplicableChannels = request.ApplicableChannels,
                TimingRestrictions = request.TimingRestrictions,
                ViolationMessage = request.ViolationMessage,
                RemediationSuggestion = request.RemediationSuggestion,
                Priority = request.Priority,
                IsActive = request.IsActive,
                UpdatedBy = userId
            };

            var updatedRule = await _complianceService.UpdateRuleAsync(rule);
            return Ok(updatedRule);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating compliance rule");
            return StatusCode(500, new { Error = "규정 준수 규칙 업데이트 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Deactivate compliance rule
    /// 규정 준수 규칙 비활성화
    /// </summary>
    [HttpDelete("rules/{ruleId}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> DeactivateRule(int ruleId)
    {
        try
        {
            var success = await _complianceService.DeactivateRuleAsync(ruleId);
            if (success)
            {
                return Ok(new { Message = "규칙이 성공적으로 비활성화되었습니다." });
            }
            return NotFound(new { Error = "규칙을 찾을 수 없습니다." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating compliance rule");
            return StatusCode(500, new { Error = "규칙 비활성화 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Generate compliance report
    /// 규정 준수 보고서 생성
    /// </summary>
    [HttpPost("reports/generate")]
    public async Task<ActionResult<ComplianceReport>> GenerateReport([FromBody] GenerateReportRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var report = await _complianceService.GenerateComplianceReportAsync(
                tenantId, 
                request.FromDate, 
                request.ToDate, 
                request.Category);

            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance report");
            return StatusCode(500, new { Error = "규정 준수 보고서 생성 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Export compliance data
    /// 규정 준수 데이터 내보내기
    /// </summary>
    [HttpPost("reports/export")]
    public async Task<ActionResult> ExportComplianceData([FromBody] ExportDataRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var data = await _complianceService.ExportComplianceDataAsync(
                tenantId, 
                request.FromDate, 
                request.ToDate, 
                request.Format);

            var contentType = request.Format.ToLower() switch
            {
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "csv" => "text/csv",
                "json" => "application/json",
                _ => "application/octet-stream"
            };

            var fileName = $"compliance-report-{DateTime.UtcNow:yyyyMMdd}.{request.Format}";
            
            return File(data, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting compliance data");
            return StatusCode(500, new { Error = "데이터 내보내기 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get compliance metrics
    /// 규정 준수 지표 조회
    /// </summary>
    [HttpGet("metrics")]
    public async Task<ActionResult<List<ComplianceMetrics>>> GetMetrics(
        [FromQuery] DateTime fromDate, 
        [FromQuery] DateTime toDate)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var metrics = await _complianceService.GetComplianceMetricsAsync(tenantId, fromDate, toDate);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compliance metrics");
            return StatusCode(500, new { Error = "지표 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get active compliance alerts
    /// 활성 규정 준수 알림 조회
    /// </summary>
    [HttpGet("alerts")]
    public async Task<ActionResult<List<ComplianceAlert>>> GetAlerts()
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var alerts = await _complianceService.GetActiveAlertsAsync(tenantId);
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compliance alerts");
            return StatusCode(500, new { Error = "알림 조회 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Validate political terms in content
    /// 콘텐츠의 정치적 용어 검증
    /// </summary>
    [HttpPost("validate-political-terms")]
    public async Task<ActionResult<PoliticalTermValidationResult>> ValidatePoliticalTerms([FromBody] ValidatePoliticalTermsRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var result = await _complianceService.ValidatePoliticalTermsAsync(tenantId, request.Content);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating political terms");
            return StatusCode(500, new { Error = "정치적 용어 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// Get content alternatives for problematic terms
    /// 문제가 있는 용어에 대한 대안 콘텐츠 제안
    /// </summary>
    [HttpPost("suggest-alternatives")]
    public async Task<ActionResult<List<string>>> SuggestAlternatives([FromBody] SuggestAlternativesRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            var suggestions = await _complianceService.SuggestAlternativeContentAsync(
                tenantId, 
                request.Content, 
                request.ProblematicTerms);
            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error suggesting alternatives");
            return StatusCode(500, new { Error = "대안 제안 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// 한국어 언어 처리를 통한 고급 컴플라이언스 검증
    /// Advanced compliance validation using Korean Language Processing
    /// </summary>
    [HttpPost("validate-korean-compliance")]
    public async Task<ActionResult<EnhancedComplianceValidationResult>> ValidateKoreanCompliance([FromBody] ValidateKoreanComplianceRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Performing advanced Korean compliance validation for tenant {TenantId}", tenantId);

            // 1. Korean Language Processing Service를 통한 컴플라이언스 검증
            var koreanComplianceResult = await _koreanLanguageService.ValidateElectionComplianceAsync(
                request.Content, request.Context);

            // 2. 문화적 적절성 검증
            var culturalValidationRequest = new KoreanCulturalValidationRequest
            {
                Text = request.Content,
                TargetRegion = request.TargetRegion,
                TargetAgeGroup = request.TargetAgeGroup,
                Context = request.Context,
                SensitivityLevel = request.SensitivityLevel,
                SpecificConcerns = request.SpecificConcerns
            };

            var culturalValidationResult = await _koreanLanguageService.ValidateCulturalAppropriatenessAsync(
                tenantId, culturalValidationRequest);

            // 3. 정치 용어 분석
            var politicalAnalysis = await _koreanLanguageService.AnalyzePoliticalContentAsync(request.Content);

            // 4. 텍스트 품질 평가
            var qualityMetrics = await _koreanLanguageService.EvaluateTextQualityAsync(request.Content);

            // 5. 종합 결과 생성
            var enhancedResult = new EnhancedComplianceValidationResult
            {
                ContentText = request.Content,
                Context = request.Context,
                ElectionLawCompliance = koreanComplianceResult,
                CulturalValidation = culturalValidationResult,
                PoliticalAnalysis = politicalAnalysis,
                QualityMetrics = qualityMetrics,
                OverallCompliant = koreanComplianceResult.IsCompliant && culturalValidationResult.IsAppropriate,
                OverallScore = CalculateOverallComplianceScore(koreanComplianceResult, culturalValidationResult, politicalAnalysis),
                ValidatedAt = DateTime.UtcNow
            };

            // 6. 문제가 있는 경우 대안 생성
            if (!enhancedResult.OverallCompliant)
            {
                var alternatives = await _koreanLanguageService.GenerateAlternativeExpressionsAsync(
                    request.Content, request.Context);
                enhancedResult.SuggestedAlternatives = alternatives.Take(5).ToList();
            }

            _logger.LogInformation("Advanced Korean compliance validation completed. Overall compliant: {IsCompliant}, Score: {Score:F2}",
                enhancedResult.OverallCompliant, enhancedResult.OverallScore);

            return Ok(enhancedResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing advanced Korean compliance validation");
            return StatusCode(500, new { Error = "고급 한국어 컴플라이언스 검증 중 오류가 발생했습니다." });
        }
    }

    /// <summary>
    /// 일괄 컴플라이언스 검증 - Korean Language Processing 활용
    /// Batch compliance validation using Korean Language Processing
    /// </summary>
    [HttpPost("validate-batch-korean")]
    public async Task<ActionResult<BatchKoreanComplianceValidationResponse>> ValidateBatchKoreanCompliance([FromBody] BatchKoreanComplianceValidationRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            if (request.ContentItems.Count > 1000)
            {
                return StatusCode(413, new { Error = "일괄 검증은 최대 1,000개 항목까지 지원됩니다." });
            }

            _logger.LogInformation("Processing batch Korean compliance validation for {Count} items for tenant {TenantId}",
                request.ContentItems.Count, tenantId);

            var results = new List<BatchComplianceResultItem>();
            var semaphore = new SemaphoreSlim(Environment.ProcessorCount);

            var tasks = request.ContentItems.Select(async (item, index) =>
            {
                await semaphore.WaitAsync();
                try
                {
                    var result = new BatchComplianceResultItem
                    {
                        ItemId = item.ItemId,
                        OriginalContent = item.Content,
                        Context = item.Context
                    };

                    try
                    {
                        // Korean Language Processing Service를 통한 검증
                        var complianceResult = await _koreanLanguageService.ValidateElectionComplianceAsync(
                            item.Content, item.Context);

                        var culturalValidationRequest = new KoreanCulturalValidationRequest
                        {
                            Text = item.Content,
                            Context = item.Context,
                            SensitivityLevel = request.SensitivityLevel
                        };

                        var culturalResult = await _koreanLanguageService.ValidateCulturalAppropriatenessAsync(
                            tenantId, culturalValidationRequest);

                        result.IsCompliant = complianceResult.IsCompliant && culturalResult.IsAppropriate;
                        result.ComplianceScore = CalculateOverallComplianceScore(complianceResult, culturalResult, null);
                        result.Issues = MapComplianceIssues(complianceResult, culturalResult);
                        result.Success = true;

                        // 문제가 있는 경우 상위 3개 대안만 생성 (성능상 이유)
                        if (!result.IsCompliant && request.GenerateAlternatives)
                        {
                            var alternatives = await _koreanLanguageService.GenerateAlternativeExpressionsAsync(
                                item.Content, item.Context);
                            result.SuggestedAlternatives = alternatives.Take(3).Select(a => a.AlternativeText).ToList();
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Success = false;
                        result.ErrorMessage = ex.Message;
                        _logger.LogWarning(ex, "Failed to validate item {ItemId} in batch", item.ItemId);
                    }

                    return result;
                }
                finally
                {
                    semaphore.Release();
                }
            });

            var taskResults = await Task.WhenAll(tasks);
            results.AddRange(taskResults);

            var response = new BatchKoreanComplianceValidationResponse
            {
                BatchId = Guid.NewGuid(),
                Results = results,
                Statistics = new BatchComplianceStatistics
                {
                    TotalItems = results.Count,
                    CompliantItems = results.Count(r => r.IsCompliant),
                    NonCompliantItems = results.Count(r => !r.IsCompliant),
                    FailedItems = results.Count(r => !r.Success),
                    AverageComplianceScore = results.Where(r => r.Success).Any() 
                        ? results.Where(r => r.Success).Average(r => r.ComplianceScore) 
                        : 0m
                },
                ProcessedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Batch Korean compliance validation completed. Total: {Total}, Compliant: {Compliant}, Failed: {Failed}",
                response.Statistics.TotalItems, response.Statistics.CompliantItems, response.Statistics.FailedItems);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing batch Korean compliance validation");
            return StatusCode(500, new { Error = "일괄 한국어 컴플라이언스 검증 처리 중 오류가 발생했습니다." });
        }
    }

    private ComplianceValidationResult MergeComplianceResults(
        ComplianceValidationResult basicResult,
        KoreanComplianceValidationResult koreanResult,
        string originalContent)
    {
        // 기존 결과와 Korean Language Processing 결과를 통합
        var mergedResult = new ComplianceValidationResult
        {
            IsCompliant = basicResult.IsCompliant && koreanResult.IsCompliant,
            Content = originalContent,
            Channel = basicResult.Channel,
            Issues = new List<string>()
        };

        // 기존 이슈 추가
        if (basicResult.Issues != null)
        {
            mergedResult.Issues.AddRange(basicResult.Issues);
        }

        // Korean Language Processing에서 발견된 이슈 추가
        if (!koreanResult.IsCompliant && koreanResult.Issues.Any())
        {
            var koreanIssues = koreanResult.Issues
                .Where(i => i.Severity == "critical" || i.Severity == "warning")
                .Select(i => $"한국어 검증: {i.Description}")
                .ToList();
            mergedResult.Issues.AddRange(koreanIssues);
        }

        // 추천 사항 통합
        var recommendations = new List<string>();
        if (basicResult.Recommendations != null)
        {
            recommendations.AddRange(basicResult.Recommendations);
        }
        if (koreanResult.Recommendations.Any())
        {
            recommendations.AddRange(koreanResult.Recommendations.Take(3));
        }
        mergedResult.Recommendations = recommendations;

        return mergedResult;
    }

    private decimal CalculateOverallComplianceScore(
        KoreanComplianceValidationResult complianceResult,
        KoreanCulturalValidationResponse culturalResult,
        KoreanPoliticalAnalysisDto? politicalAnalysis)
    {
        var scores = new List<decimal>
        {
            complianceResult.ComplianceScore * 0.5m, // 컴플라이언스 50%
            culturalResult.AppropriatenessScore * 0.3m // 문화적 적절성 30%
        };

        if (politicalAnalysis != null)
        {
            scores.Add(politicalAnalysis.SafetyScore * 0.2m); // 정치적 안전성 20%
        }

        return scores.Sum();
    }

    private List<string> MapComplianceIssues(
        KoreanComplianceValidationResult complianceResult,
        KoreanCulturalValidationResponse culturalResult)
    {
        var issues = new List<string>();

        // 컴플라이언스 이슈 매핑
        if (complianceResult.Issues.Any())
        {
            issues.AddRange(complianceResult.Issues
                .Where(i => i.Severity == "critical")
                .Select(i => $"선거법 준수: {i.Description}"));
        }

        // 문화적 이슈 매핑
        if (culturalResult.CulturalIssues.Any())
        {
            issues.AddRange(culturalResult.CulturalIssues
                .Where(i => i.Severity == "critical" || i.Severity == "warning")
                .Select(i => $"문화적 적절성: {i.Description}"));
        }

        return issues;
    }
}

// Additional DTOs for enhanced Korean compliance validation
public class ValidateKoreanComplianceRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]  
    public string Context { get; set; } = string.Empty;
    
    public string? TargetRegion { get; set; }
    public string? TargetAgeGroup { get; set; }
    public string SensitivityLevel { get; set; } = "medium";
    public List<string> SpecificConcerns { get; set; } = new();
}

public class EnhancedComplianceValidationResult
{
    public string ContentText { get; set; } = string.Empty;
    public string Context { get; set; } = string.Empty;
    public KoreanComplianceValidationResult ElectionLawCompliance { get; set; } = new();
    public KoreanCulturalValidationResponse CulturalValidation { get; set; } = new();
    public KoreanPoliticalAnalysisDto PoliticalAnalysis { get; set; } = new();
    public KoreanTextQualityMetrics QualityMetrics { get; set; } = new();
    public bool OverallCompliant { get; set; }
    public decimal OverallScore { get; set; }
    public List<KoreanAlternativeExpressionDto> SuggestedAlternatives { get; set; } = new();
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;
}

public class BatchKoreanComplianceValidationRequest
{
    [Required]
    public List<BatchComplianceContentItem> ContentItems { get; set; } = new();
    
    public string SensitivityLevel { get; set; } = "medium";
    public bool GenerateAlternatives { get; set; } = false;
}

public class BatchComplianceContentItem
{
    [Required]
    public string ItemId { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    public string Context { get; set; } = string.Empty;
}

public class BatchKoreanComplianceValidationResponse
{
    public Guid BatchId { get; set; }
    public List<BatchComplianceResultItem> Results { get; set; } = new();
    public BatchComplianceStatistics Statistics { get; set; } = new();
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}

public class BatchComplianceResultItem
{
    public string ItemId { get; set; } = string.Empty;
    public string OriginalContent { get; set; } = string.Empty;
    public string Context { get; set; } = string.Empty;
    public bool Success { get; set; }
    public bool IsCompliant { get; set; }
    public decimal ComplianceScore { get; set; }
    public List<string> Issues { get; set; } = new();
    public List<string> SuggestedAlternatives { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public class BatchComplianceStatistics
{
    public int TotalItems { get; set; }
    public int CompliantItems { get; set; }
    public int NonCompliantItems { get; set; }
    public int FailedItems { get; set; }
    public decimal ComplianceRate => TotalItems > 0 ? (decimal)CompliantItems / TotalItems : 0;
    public decimal AverageComplianceScore { get; set; }
}

// Request DTOs
public class ValidateMessageRequest
{
    [Required] public string Content { get; set; } = null!;
    [Required] public string Channel { get; set; } = null!;
    public int? CampaignId { get; set; }
}

public class ValidateSpendingRequest
{
    [Required] public decimal Amount { get; set; }
    [Required] public string Category { get; set; } = null!;
    public int? CampaignId { get; set; }
}

public class ValidatePrivacyRequest
{
    [Required] public int ContactId { get; set; }
    [Required] public string Purpose { get; set; } = null!;
    [Required] public string DataCategories { get; set; } = null!;
}

public class UpdateViolationStatusRequest
{
    [Required] public string Status { get; set; } = null!;
    public string? Resolution { get; set; }
}

public class EscalateViolationRequest
{
    [Required] public string Reason { get; set; } = null!;
}

public class CreateComplianceRuleRequest
{
    [Required] public string RuleCode { get; set; } = null!;
    [Required] public string Name { get; set; } = null!;
    public string? Description { get; set; }
    [Required] public string LegalCategory { get; set; } = null!;
    [Required] public string RuleType { get; set; } = null!;
    [Required] public string Severity { get; set; } = null!;
    [Required] public System.Text.Json.JsonDocument ValidationConfig { get; set; } = null!;
    [Required] public string Action { get; set; } = null!;
    public string? LegalReference { get; set; }
    public string? ApplicableChannels { get; set; }
    public System.Text.Json.JsonDocument? TimingRestrictions { get; set; }
    public string? ViolationMessage { get; set; }
    public string? RemediationSuggestion { get; set; }
    public int Priority { get; set; } = 1;
}

public class UpdateComplianceRuleRequest
{
    [Required] public string Name { get; set; } = null!;
    public string? Description { get; set; }
    [Required] public string Severity { get; set; } = null!;
    [Required] public System.Text.Json.JsonDocument ValidationConfig { get; set; } = null!;
    [Required] public string Action { get; set; } = null!;
    public string? LegalReference { get; set; }
    public string? ApplicableChannels { get; set; }
    public System.Text.Json.JsonDocument? TimingRestrictions { get; set; }
    public string? ViolationMessage { get; set; }
    public string? RemediationSuggestion { get; set; }
    public int Priority { get; set; } = 1;
    public bool IsActive { get; set; } = true;
}

public class GenerateReportRequest
{
    [Required] public DateTime FromDate { get; set; }
    [Required] public DateTime ToDate { get; set; }
    public string? Category { get; set; }
}

public class ExportDataRequest
{
    [Required] public DateTime FromDate { get; set; }
    [Required] public DateTime ToDate { get; set; }
    public string Format { get; set; } = "xlsx";
}

public class ValidatePoliticalTermsRequest
{
    [Required] public string Content { get; set; } = null!;
}

public class SuggestAlternativesRequest
{
    [Required] public string Content { get; set; } = null!;
    [Required] public List<string> ProblematicTerms { get; set; } = new();
}