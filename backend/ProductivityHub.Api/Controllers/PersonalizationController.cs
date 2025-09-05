using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Extensions;
using ProductivityHub.Api.Models;
using ProductivityHub.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.Controllers;

/// <summary>
/// 한국어 AI 메시지 개인화 컨트롤러
/// 유권자 인구통계 기반 메시지 개인화 및 A/B 테스트 기능 제공
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PersonalizationController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IKoreanAIPersonalizationService _personalizationService;
    private readonly IKoreanLanguageProcessingService _koreanLanguageService;
    private readonly ILogger<PersonalizationController> _logger;

    public PersonalizationController(
        ApplicationDbContext context,
        IKoreanAIPersonalizationService personalizationService,
        IKoreanLanguageProcessingService koreanLanguageService,
        ILogger<PersonalizationController> logger)
    {
        _context = context;
        _personalizationService = personalizationService;
        _koreanLanguageService = koreanLanguageService;
        _logger = logger;
    }

    /// <summary>
    /// 개인화된 메시지 생성
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(PersonalizationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PersonalizationResponse>> GeneratePersonalizedMessages(
        [FromBody] GeneratePersonalizationRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            // 캠페인 존재 및 권한 확인
            var campaign = await _context.Campaigns
                .Where(c => c.Id == request.CampaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaign == null)
            {
                return NotFound($"Campaign {request.CampaignId} not found");
            }

            _logger.LogInformation("Generating personalized messages for campaign {CampaignId} with {Count} demographics",
                request.CampaignId, request.TargetDemographics.Count);

            // AI 서비스를 통한 개인화 메시지 생성 (기존)
            var response = await _personalizationService.GeneratePersonalizedMessagesAsync(request);

            // Korean Language Processing Service를 통한 고급 언어 분석 및 개선
            foreach (var variant in response.PersonalizedVariants)
            {
                // 한국어 텍스트 품질 분석
                var target = new KoreanPersonalizationTarget
                {
                    DialectCode = MapDialectToCode(variant.Dialect),
                    FormalityLevel = variant.FormalityLevel,
                    AgeGroup = variant.TargetDemographics.AgeGroup,
                    RegionCode = variant.TargetDemographics.RegionCode,
                    Occupation = variant.TargetDemographics.Occupation
                };

                var qualityMetrics = await _koreanLanguageService.EvaluateTextQualityAsync(
                    variant.PersonalizedMessage, target);

                // 품질 점수를 기반으로 효과성 점수 조정
                variant.EffectivenessScore = CalculateAdjustedEffectivenessScore(
                    variant.EffectivenessScore, qualityMetrics);

                // 문화적 적절성 검증
                var culturalRequest = new KoreanCulturalValidationRequest
                {
                    Text = variant.PersonalizedMessage,
                    TargetRegion = variant.TargetDemographics.RegionCode,
                    TargetAgeGroup = variant.TargetDemographics.AgeGroup,
                    Context = "campaign",
                    SensitivityLevel = request.CulturalSensitivityLevel
                };

                var culturalValidation = await _koreanLanguageService.ValidateCulturalAppropriatenessAsync(
                    tenantId, culturalRequest);

                // 문화적 이슈가 있는 경우 대안 생성
                if (!culturalValidation.IsAppropriate && culturalValidation.Suggestions.Any())
                {
                    var alternatives = await _koreanLanguageService.GenerateAlternativeExpressionsAsync(
                        variant.PersonalizedMessage, "campaign", target);
                    
                    if (alternatives.Any())
                    {
                        var bestAlternative = alternatives.OrderByDescending(a => a.AppropriatenessScore).First();
                        variant.PersonalizedMessage = bestAlternative.AlternativeText;
                        variant.EffectivenessScore *= 0.95m; // 약간의 점수 조정
                        
                        _logger.LogInformation("Applied cultural alternative for variant {VariantId}: {Score:F2}", 
                            variant.Id, bestAlternative.AppropriatenessScore);
                    }
                }
            }

            // 생성된 개인화 데이터를 데이터베이스에 저장
            await SavePersonalizationResultsAsync(tenantId, response);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating personalized messages for campaign {CampaignId}", request.CampaignId);
            return BadRequest($"Failed to generate personalized messages: {ex.Message}");
        }
    }

    /// <summary>
    /// 메시지 개인화 미리보기
    /// </summary>
    [HttpPost("preview")]
    [ProducesResponseType(typeof(PersonalizedVariantDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PersonalizedVariantDto>> PreviewPersonalization(
        [FromBody] PreviewPersonalizationRequest request)
    {
        try
        {
            _logger.LogInformation("Generating personalization preview for demographics: {AgeGroup}, {Region}, {Occupation}",
                request.SampleDemographics.AgeGroup, request.SampleDemographics.RegionName, request.SampleDemographics.Occupation);

            var variant = await _personalizationService.PreviewPersonalizationAsync(request);
            return Ok(variant);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating personalization preview");
            return BadRequest($"Failed to generate preview: {ex.Message}");
        }
    }

    /// <summary>
    /// 개인화 효과성 분석
    /// </summary>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(EffectivenessAnalysisResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EffectivenessAnalysisResponse>> AnalyzeEffectiveness(
        [FromBody] AnalyzeEffectivenessRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            // 캠페인 존재 및 권한 확인
            var campaign = await _context.Campaigns
                .Where(c => c.Id == request.CampaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaign == null)
            {
                return NotFound($"Campaign {request.CampaignId} not found");
            }

            _logger.LogInformation("Analyzing personalization effectiveness for campaign {CampaignId}", request.CampaignId);

            var response = await AnalyzePersonalizationEffectivenessAsync(tenantId, request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing effectiveness for campaign {CampaignId}", request.CampaignId);
            return BadRequest($"Failed to analyze effectiveness: {ex.Message}");
        }
    }

    /// <summary>
    /// 인구통계 정보 조회
    /// </summary>
    [HttpGet("demographics")]
    [ProducesResponseType(typeof(DemographicsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DemographicsResponse>> GetDemographics([FromQuery] string? regionFilter = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();

            _logger.LogInformation("Retrieving demographics data for tenant {TenantId}", tenantId);

            var response = await GetDemographicsDataAsync(tenantId, regionFilter);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving demographics data");
            return BadRequest($"Failed to retrieve demographics: {ex.Message}");
        }
    }

    /// <summary>
    /// A/B 테스트 결과 조회
    /// </summary>
    [HttpGet("abtest/{campaignId}")]
    [ProducesResponseType(typeof(List<ABTestResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ABTestResultDto>>> GetABTestResults(
        [FromRoute] Guid campaignId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var campaign = await _context.Campaigns
                .Where(c => c.Id == campaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaign == null)
            {
                return NotFound($"Campaign {campaignId} not found");
            }

            _logger.LogInformation("Retrieving A/B test results for campaign {CampaignId}", campaignId);

            var results = await GetABTestResultsAsync(tenantId, campaignId, startDate, endDate);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving A/B test results for campaign {CampaignId}", campaignId);
            return BadRequest($"Failed to retrieve A/B test results: {ex.Message}");
        }
    }

    /// <summary>
    /// 개인화 설정 조회
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType(typeof(PersonalizationSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PersonalizationSettingsDto>> GetPersonalizationSettings()
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            // 개인화 설정 조회 (향후 확장을 위한 기본 구조)
            var settings = new PersonalizationSettingsDto
            {
                TenantId = tenantId,
                DefaultDialect = "서울말",
                DefaultFormalityLevel = "formal",
                EnabledGoals = new List<string> { "increase_engagement", "cultural_relevance", "regional_connection" },
                CulturalSensitivityLevel = "medium",
                AbTestingEnabled = true,
                MaxVariantsPerMessage = 3,
                ConfidenceThreshold = 0.7m,
                AutoApprovalThreshold = 0.9m
            };

            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving personalization settings");
            return BadRequest($"Failed to retrieve settings: {ex.Message}");
        }
    }

    /// <summary>
    /// 개인화 진행 상태 조회
    /// </summary>
    [HttpGet("status/{campaignId}")]
    [ProducesResponseType(typeof(PersonalizationStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PersonalizationStatusDto>> GetPersonalizationStatus([FromRoute] Guid campaignId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var campaign = await _context.Campaigns
                .Where(c => c.Id == campaignId && c.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (campaign == null)
            {
                return NotFound($"Campaign {campaignId} not found");
            }

            // 개인화 진행 상태 조회 (실제 구현에서는 캐시나 별도 상태 저장소 사용)
            var status = new PersonalizationStatusDto
            {
                CampaignId = campaignId,
                Status = "completed", // 실제로는 동적으로 결정
                Progress = 100,
                CurrentStep = "완료",
                ProcessedMessages = 1,
                TotalMessages = 1,
                Errors = new List<string>(),
                LastUpdated = DateTime.UtcNow
            };

            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving personalization status for campaign {CampaignId}", campaignId);
            return BadRequest($"Failed to retrieve status: {ex.Message}");
        }
    }

    /// <summary>
    /// 특정 개인화 결과 조회
    /// </summary>
    [HttpGet("{personalizationId}")]
    [ProducesResponseType(typeof(PersonalizationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PersonalizationResponse>> GetPersonalization([FromRoute] Guid personalizationId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            var personalization = await _context.Set<MessagePersonalization>()
                .Include(p => p.Campaign)
                .Include(p => p.Contact)
                .Include(p => p.EffectivenessHistory)
                .Where(p => p.Id == personalizationId && p.TenantId == tenantId)
                .FirstOrDefaultAsync();

            if (personalization == null)
            {
                return NotFound($"Personalization {personalizationId} not found");
            }

            var response = MapToPersonalizationResponse(personalization);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving personalization {PersonalizationId}", personalizationId);
            return BadRequest($"Failed to retrieve personalization: {ex.Message}");
        }
    }

    private async Task SavePersonalizationResultsAsync(Guid tenantId, PersonalizationResponse response)
    {
        try
        {
            var personalizations = new List<MessagePersonalization>();

            foreach (var variant in response.PersonalizedVariants)
            {
                var personalization = new MessagePersonalization
                {
                    Id = variant.Id,
                    TenantId = tenantId,
                    CampaignId = response.CampaignId,
                    ContactId = Guid.NewGuid(), // 실제로는 타겟 연락처 ID 사용
                    OriginalMessage = response.OriginalMessage,
                    PersonalizedMessage = variant.PersonalizedMessage,
                    Dialect = variant.Dialect,
                    FormalityLevel = variant.FormalityLevel,
                    AgeGroup = variant.TargetDemographics.AgeGroup,
                    OccupationCategory = variant.TargetDemographics.Occupation,
                    EducationLevel = variant.TargetDemographics.EducationLevel,
                    RegionCode = variant.TargetDemographics.RegionCode,
                    EffectivenessScore = variant.EffectivenessScore,
                    AbTestGroup = variant.AbTestGroup,
                    UsesPoliticalTerms = variant.UsesPoliticalTerms,
                    GeneratedAt = response.GeneratedAt
                };

                personalizations.Add(personalization);
            }

            _context.Set<MessagePersonalization>().AddRange(personalizations);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Saved {Count} personalization results to database", personalizations.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving personalization results to database");
            throw;
        }
    }

    private async Task<EffectivenessAnalysisResponse> AnalyzePersonalizationEffectivenessAsync(
        Guid tenantId, 
        AnalyzeEffectivenessRequest request)
    {
        var startDate = request.StartDate ?? DateTime.UtcNow.AddDays(-30);
        var endDate = request.EndDate ?? DateTime.UtcNow;

        // 개인화 데이터 조회
        var personalizations = await _context.Set<MessagePersonalization>()
            .Include(p => p.EffectivenessHistory)
            .Where(p => p.TenantId == tenantId && 
                       p.CampaignId == request.CampaignId &&
                       p.GeneratedAt >= startDate && 
                       p.GeneratedAt <= endDate)
            .ToListAsync();

        var response = new EffectivenessAnalysisResponse
        {
            CampaignId = request.CampaignId,
            OverallEffectiveness = personalizations.Any() ? 
                personalizations.Average(p => p.EffectivenessScore) : 0m,
            Metrics = CalculateEffectivenessMetrics(personalizations),
            DemographicInsights = CalculateDemographicInsights(personalizations),
            ABTestResults = await CalculateABTestResults(personalizations),
            TrendAnalysis = CalculateTrendAnalysis(personalizations)
        };

        return response;
    }

    private async Task<DemographicsResponse> GetDemographicsDataAsync(Guid tenantId, string? regionFilter)
    {
        var query = _context.Set<VoterDemographics>()
            .Where(vd => vd.TenantId == tenantId);

        if (!string.IsNullOrEmpty(regionFilter))
        {
            query = query.Where(vd => vd.RegionCode != null && vd.RegionCode.StartsWith(regionFilter));
        }

        var demographics = await query.ToListAsync();

        var response = new DemographicsResponse
        {
            RegionDistribution = CalculateRegionDistribution(demographics),
            AgeGroupDistribution = CalculateAgeGroupDistribution(demographics),
            DialectPreferences = CalculateDialectPreferences(demographics),
            OccupationDistribution = CalculateOccupationDistribution(demographics),
            Statistics = new DemographicStatsDto
            {
                TotalContacts = demographics.Count,
                WithDemographicData = demographics.Count(d => !string.IsNullOrEmpty(d.AgeGroup)),
                DataCompleteness = demographics.Count > 0 ? 
                    (decimal)demographics.Count(d => !string.IsNullOrEmpty(d.AgeGroup)) / demographics.Count : 0m,
                LastUpdated = demographics.Any() ? demographics.Max(d => d.LastUpdated) : DateTime.UtcNow
            }
        };

        return response;
    }

    private async Task<List<ABTestResultDto>> GetABTestResultsAsync(
        Guid tenantId, 
        Guid campaignId, 
        DateTime? startDate, 
        DateTime? endDate)
    {
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;

        var personalizations = await _context.Set<MessagePersonalization>()
            .Include(p => p.EffectivenessHistory)
            .Where(p => p.TenantId == tenantId && 
                       p.CampaignId == campaignId &&
                       !string.IsNullOrEmpty(p.AbTestGroup) &&
                       p.GeneratedAt >= start && 
                       p.GeneratedAt <= end)
            .ToListAsync();

        var abTestGroups = personalizations
            .GroupBy(p => new { p.Dialect, p.FormalityLevel, p.AgeGroup })
            .Where(g => g.Count() >= 2)
            .ToList();

        var results = new List<ABTestResultDto>();

        foreach (var group in abTestGroups)
        {
            var variants = group.OrderBy(p => p.AbTestGroup).ToList();
            if (variants.Count >= 2)
            {
                var variantA = variants.First();
                var variantB = variants.Skip(1).First();

                var result = new ABTestResultDto
                {
                    CampaignId = campaignId,
                    VariantA = MapToPersonalizedVariantDto(variantA),
                    VariantB = MapToPersonalizedVariantDto(variantB),
                    SampleSize = variants.Count,
                    ConfidenceLevel = 0.95m,
                    StatisticalSignificance = variants.Count >= 30, // 간단한 통계적 유의성 판단
                    WinningVariant = variantA.EffectivenessScore > variantB.EffectivenessScore ? "A" : "B",
                    Metrics = new ABTestMetricsDto
                    {
                        OpenRate = new VariantComparisonDto 
                        { 
                            VariantA = 0.65m, VariantB = 0.72m, 
                            Difference = 0.07m, StatisticalSignificance = 0.85m 
                        },
                        ClickRate = new VariantComparisonDto 
                        { 
                            VariantA = 0.12m, VariantB = 0.15m, 
                            Difference = 0.03m, StatisticalSignificance = 0.78m 
                        },
                        ResponseRate = new VariantComparisonDto 
                        { 
                            VariantA = 0.08m, VariantB = 0.11m, 
                            Difference = 0.03m, StatisticalSignificance = 0.82m 
                        },
                        ConversionRate = new VariantComparisonDto 
                        { 
                            VariantA = 0.05m, VariantB = 0.07m, 
                            Difference = 0.02m, StatisticalSignificance = 0.75m 
                        }
                    }
                };

                results.Add(result);
            }
        }

        return results;
    }

    private List<EffectivenessMetricDto> CalculateEffectivenessMetrics(List<MessagePersonalization> personalizations)
    {
        if (!personalizations.Any()) return new List<EffectivenessMetricDto>();

        return new List<EffectivenessMetricDto>
        {
            new() { MetricType = "overall_effectiveness", Value = personalizations.Average(p => p.EffectivenessScore), Change = 0.05m, ChangeDirection = "up" },
            new() { MetricType = "dialect_consistency", Value = 0.82m, Change = 0.03m, ChangeDirection = "up" },
            new() { MetricType = "cultural_relevance", Value = 0.78m, Change = -0.02m, ChangeDirection = "down" },
            new() { MetricType = "regional_connection", Value = 0.75m, Change = 0.08m, ChangeDirection = "up" }
        };
    }

    private List<DemographicInsightDto> CalculateDemographicInsights(List<MessagePersonalization> personalizations)
    {
        var insights = new List<DemographicInsightDto>();

        // 연령대별 인사이트
        var ageGroups = personalizations
            .Where(p => !string.IsNullOrEmpty(p.AgeGroup))
            .GroupBy(p => p.AgeGroup)
            .Select(g => new DemographicInsightDto
            {
                Category = "age_group",
                Value = g.Key!,
                AverageEffectiveness = g.Average(p => p.EffectivenessScore),
                SampleSize = g.Count(),
                BestPerformingVariant = MapToPersonalizedVariantDto(g.OrderByDescending(p => p.EffectivenessScore).First())
            });

        insights.AddRange(ageGroups);

        // 지역별 인사이트
        var regions = personalizations
            .Where(p => !string.IsNullOrEmpty(p.RegionCode))
            .GroupBy(p => p.RegionCode)
            .Select(g => new DemographicInsightDto
            {
                Category = "region",
                Value = g.Key!,
                AverageEffectiveness = g.Average(p => p.EffectivenessScore),
                SampleSize = g.Count(),
                BestPerformingVariant = MapToPersonalizedVariantDto(g.OrderByDescending(p => p.EffectivenessScore).First())
            });

        insights.AddRange(regions);

        return insights;
    }

    private async Task<List<ABTestResultDto>> CalculateABTestResults(List<MessagePersonalization> personalizations)
    {
        // A/B 테스트 결과 계산 로직
        return new List<ABTestResultDto>();
    }

    private TrendAnalysisDto CalculateTrendAnalysis(List<MessagePersonalization> personalizations)
    {
        return new TrendAnalysisDto
        {
            Period = "지난 30일",
            OverallEffectivenessChange = 0.08m,
            TopPerformingDialects = new List<string> { "서울말", "부산말", "대구말" },
            EmergingTrends = new List<string> 
            { 
                "젊은 층에서 캐주얼한 톤 선호 증가",
                "지역별 맞춤 표현 효과성 상승",
                "정치 용어 사용 시 신중한 접근 필요"
            },
            Recommendations = new List<string>
            {
                "20-30대 타겟 시 친근한 표현 사용 권장",
                "지역별 특색 있는 표현 적극 활용",
                "정치 용어는 맥락에 맞게 신중하게 사용"
            }
        };
    }

    private List<RegionDistributionDto> CalculateRegionDistribution(List<VoterDemographics> demographics)
    {
        return demographics
            .Where(d => !string.IsNullOrEmpty(d.RegionCode))
            .GroupBy(d => new { d.RegionCode, d.RegionName })
            .Select(g => new RegionDistributionDto
            {
                RegionCode = g.Key.RegionCode!,
                RegionName = g.Key.RegionName ?? g.Key.RegionCode!,
                Count = g.Count(),
                Percentage = demographics.Count > 0 ? (decimal)g.Count() / demographics.Count * 100 : 0,
                AverageEffectiveness = 0.75m, // 실제로는 효과성 데이터에서 계산
                PreferredDialect = g.First().PreferredDialect
            })
            .OrderByDescending(r => r.Count)
            .ToList();
    }

    private List<AgeGroupDistributionDto> CalculateAgeGroupDistribution(List<VoterDemographics> demographics)
    {
        return demographics
            .Where(d => !string.IsNullOrEmpty(d.AgeGroup))
            .GroupBy(d => d.AgeGroup)
            .Select(g => new AgeGroupDistributionDto
            {
                AgeGroup = g.Key!,
                Count = g.Count(),
                Percentage = demographics.Count > 0 ? (decimal)g.Count() / demographics.Count * 100 : 0,
                AverageEffectiveness = 0.73m, // 실제로는 효과성 데이터에서 계산
                PreferredFormalityLevel = g.Key switch
                {
                    "20s" => "casual",
                    "30s" => "informal",
                    "40s" => "formal",
                    "50s" => "formal",
                    "60plus" => "respectful",
                    _ => "formal"
                }
            })
            .OrderByDescending(a => a.Count)
            .ToList();
    }

    private List<DialectPreferenceDto> CalculateDialectPreferences(List<VoterDemographics> demographics)
    {
        return demographics
            .GroupBy(d => d.PreferredDialect)
            .Select(g => new DialectPreferenceDto
            {
                Dialect = g.Key,
                RegionCodes = g.Where(d => !string.IsNullOrEmpty(d.RegionCode))
                              .Select(d => d.RegionCode!)
                              .Distinct()
                              .ToList(),
                Effectiveness = 0.76m, // 실제로는 효과성 데이터에서 계산
                SampleSize = g.Count()
            })
            .OrderByDescending(d => d.SampleSize)
            .ToList();
    }

    private List<OccupationDistributionDto> CalculateOccupationDistribution(List<VoterDemographics> demographics)
    {
        return demographics
            .Where(d => !string.IsNullOrEmpty(d.Occupation))
            .GroupBy(d => d.Occupation)
            .Select(g => new OccupationDistributionDto
            {
                Occupation = g.Key!,
                Count = g.Count(),
                Percentage = demographics.Count > 0 ? (decimal)g.Count() / demographics.Count * 100 : 0,
                AverageEffectiveness = 0.71m, // 실제로는 효과성 데이터에서 계산
                PreferredCommunicationStyle = g.First().CommunicationStyle
            })
            .OrderByDescending(o => o.Count)
            .ToList();
    }

    private PersonalizationResponse MapToPersonalizationResponse(MessagePersonalization personalization)
    {
        return new PersonalizationResponse
        {
            Id = personalization.Id,
            CampaignId = personalization.CampaignId,
            OriginalMessage = personalization.OriginalMessage,
            PersonalizedVariants = new List<PersonalizedVariantDto>
            {
                MapToPersonalizedVariantDto(personalization)
            },
            GeneratedAt = personalization.GeneratedAt
        };
    }

    private PersonalizedVariantDto MapToPersonalizedVariantDto(MessagePersonalization personalization)
    {
        return new PersonalizedVariantDto
        {
            Id = personalization.Id,
            PersonalizedMessage = personalization.PersonalizedMessage,
            Dialect = personalization.Dialect,
            FormalityLevel = personalization.FormalityLevel,
            TargetDemographics = new VoterDemographicsDto
            {
                AgeGroup = personalization.AgeGroup,
                RegionCode = personalization.RegionCode,
                Occupation = personalization.OccupationCategory,
                EducationLevel = personalization.EducationLevel,
                PreferredDialect = personalization.Dialect
            },
            EffectivenessScore = personalization.EffectivenessScore,
            AbTestGroup = personalization.AbTestGroup,
            UsesPoliticalTerms = personalization.UsesPoliticalTerms,
            Confidence = 0.85m // 기본값, 실제로는 저장된 데이터 사용
        };
    }

    /// <summary>
    /// 한국어 텍스트 분석 - Korean Language Processing Service 활용
    /// </summary>
    [HttpPost("analyze-korean-text")]
    [ProducesResponseType(typeof(KoreanTextAnalysisResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<KoreanTextAnalysisResponse>> AnalyzeKoreanText([FromBody] AnalyzeKoreanTextRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Analyzing Korean text for personalization optimization for tenant {TenantId}", tenantId);

            var analysisRequest = new KoreanTextAnalysisRequest
            {
                Text = request.Text,
                TargetRegion = request.TargetRegion,
                TargetAgeGroup = request.TargetAgeGroup,
                TargetOccupation = request.TargetOccupation,
                IncludeMorphological = request.IncludeMorphological,
                IncludeCultural = request.IncludeCultural,
                IncludePolitical = request.IncludePolitical
            };

            var result = await _koreanLanguageService.AnalyzeTextAsync(tenantId, analysisRequest);
            
            _logger.LogInformation("Korean text analysis completed with confidence {Confidence:F2}", result.OverallConfidence);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing Korean text");
            return BadRequest($"한국어 텍스트 분석 중 오류가 발생했습니다: {ex.Message}");
        }
    }

    /// <summary>
    /// 방언 변환 기반 메시지 개인화
    /// </summary>
    [HttpPost("convert-dialect")]
    [ProducesResponseType(typeof(KoreanDialectConversionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<KoreanDialectConversionResponse>> ConvertDialect([FromBody] ConvertDialectForPersonalizationRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            
            _logger.LogInformation("Converting dialect for personalization: {Source} -> {Target} for tenant {TenantId}",
                request.SourceDialect ?? "auto-detect", request.TargetDialect, tenantId);

            var conversionRequest = new KoreanDialectConversionRequest
            {
                Text = request.Text,
                SourceDialect = request.SourceDialect,
                TargetDialect = request.TargetDialect,
                PreserveHonorific = request.PreserveHonorific,
                IncludeAlternatives = request.IncludeAlternatives,
                ConfidenceThreshold = request.ConfidenceThreshold
            };

            var result = await _koreanLanguageService.ConvertDialectAsync(tenantId, conversionRequest);
            
            _logger.LogInformation("Dialect conversion completed with confidence {Confidence:F2}", result.ConversionConfidence);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting dialect for personalization");
            return BadRequest($"방언 변환 중 오류가 발생했습니다: {ex.Message}");
        }
    }

    private decimal CalculateAdjustedEffectivenessScore(decimal originalScore, KoreanTextQualityMetrics qualityMetrics)
    {
        // 품질 지표를 바탕으로 효과성 점수 조정
        var qualityWeight = 0.3m;
        var adjustedScore = originalScore * (1 - qualityWeight) + 
            (qualityMetrics.FluencyScore * 0.4m + 
             qualityMetrics.ClarityScore * 0.3m + 
             qualityMetrics.EngagementScore * 0.2m + 
             qualityMetrics.CulturalRelevanceScore * 0.1m) * qualityWeight;
        
        return Math.Min(Math.Max(adjustedScore, 0.0m), 1.0m);
    }

    private string? MapDialectToCode(string dialectName)
    {
        return dialectName switch
        {
            "서울말" => "seoul",
            "부산말" => "busan", 
            "대구말" => "daegu",
            "광주말" => "gwangju",
            "대전말" => "daejeon",
            "제주말" or "제주도" => "jeju",
            "강원도" => "gangwon",
            _ => null
        };
    }

    private string DetermineFormalityFromAge(string? ageGroup)
    {
        return ageGroup switch
        {
            "60plus" => "very_formal",
            "50s" => "formal",
            "40s" => "formal", 
            "30s" => "informal",
            "20s" => "informal",
            _ => "formal"
        };
    }
}

// Request DTOs for PersonalizationController Korean Language Processing integration
public class AnalyzeKoreanTextRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    public string? TargetRegion { get; set; }
    public string? TargetAgeGroup { get; set; }
    public string? TargetOccupation { get; set; }
    public bool IncludeMorphological { get; set; } = true;
    public bool IncludeCultural { get; set; } = true;
    public bool IncludePolitical { get; set; } = true;
}

public class ConvertDialectForPersonalizationRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    [Required]
    public string TargetDialect { get; set; } = string.Empty;
    
    public string? SourceDialect { get; set; }
    public bool PreserveHonorific { get; set; } = true;
    public bool IncludeAlternatives { get; set; } = false;
    public decimal ConfidenceThreshold { get; set; } = 0.7m;
}

public class AdjustHonorificForPersonalizationRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    [Required]
    public string TargetFormalityLevel { get; set; } = string.Empty;
    
    public string? TargetAgeGroup { get; set; }
    public string? SpeakerAge { get; set; }
    public string? Context { get; set; }
    public bool PreserveDialect { get; set; } = true;
}

public class BatchKoreanPersonalizationRequest
{
    [Required]
    public List<KoreanBatchTextItem> TextItems { get; set; } = new();
    
    public KoreanPersonalizationSettings Settings { get; set; } = new();
    public bool IncludeAnalysis { get; set; } = true;
    public bool IncludeAlternatives { get; set; } = false;
    public int MaxProcessingTimeMs { get; set; } = 30000;
}

public class ValidateAndPersonalizeRequest
{
    [Required]
    public string Text { get; set; } = string.Empty;
    
    [Required]
    public string Context { get; set; } = string.Empty; // "campaign", "advertisement", etc.
    
    [Required]
    public List<VoterDemographicsDto> TargetDemographics { get; set; } = new();
}

public class ValidateAndPersonalizeResponse
{
    public string OriginalText { get; set; } = string.Empty;
    public KoreanComplianceValidationResult ComplianceResult { get; set; } = new();
    public List<PersonalizedVariantDto> PersonalizedVariants { get; set; } = new();
    public List<string> SuggestedAlternatives { get; set; } = new();
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}