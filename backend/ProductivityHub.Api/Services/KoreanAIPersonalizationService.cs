using System.Text.Json;
using System.Text.Json.Serialization;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

/// <summary>
/// 한국어 AI 개인화 서비스
/// OpenAI/Claude API를 활용한 한국 정치 캠페인 메시지 개인화
/// </summary>
public interface IKoreanAIPersonalizationService
{
    Task<PersonalizationResponse> GeneratePersonalizedMessagesAsync(GeneratePersonalizationRequest request);
    Task<PersonalizedVariantDto> PreviewPersonalizationAsync(PreviewPersonalizationRequest request);
    Task<KoreanCulturalAnalysisDto> AnalyzeCulturalContextAsync(string message, VoterDemographicsDto demographics);
    Task<List<string>> ValidatePoliticalTermsAsync(string message);
    Task<decimal> CalculateEffectivenessScoreAsync(string originalMessage, string personalizedMessage, VoterDemographicsDto demographics);
}

public class KoreanAIPersonalizationService : IKoreanAIPersonalizationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<KoreanAIPersonalizationService> _logger;
    private readonly IConfiguration _configuration;
    private readonly JsonSerializerOptions _jsonOptions;

    // 한국 지역별 방언 매핑
    private readonly Dictionary<string, string> _regionDialectMapping = new()
    {
        { "11", "서울말" }, // 서울특별시
        { "26", "부산말" }, // 부산광역시
        { "27", "대구말" }, // 대구광역시
        { "28", "인천말" }, // 인천광역시 (서울말 기반)
        { "29", "광주말" }, // 광주광역시 (전라도)
        { "30", "대전말" }, // 대전광역시 (충청도)
        { "31", "울산말" }, // 울산광역시 (경상도)
        { "41", "경기도" }, // 경기도 (서울말 기반)
        { "43", "충청북도" }, // 충청북도
        { "44", "충청남도" }, // 충청남도
        { "45", "전라북도" }, // 전라북도
        { "46", "전라남도" }, // 전라남도
        { "47", "경상북도" }, // 경상북도
        { "48", "경상남도" }, // 경상남도
        { "49", "제주도" }, // 제주도
        { "50", "강원도" }   // 강원도
    };

    // 한국 정치 용어 데이터베이스
    private readonly List<string> _koreanPoliticalTerms = new()
    {
        "국정감사", "국정조사", "대정부질문", "시정질문", "예산안", "결산안",
        "조례안", "의안", "발의", "상정", "의결", "부결", "가결", "계류",
        "민생", "복지", "일자리", "경제활성화", "지역발전", "균형발전",
        "투명행정", "소통행정", "열린행정", "시민참여", "주민자치",
        "공약", "정책", "비전", "어젠다", "로드맵", "마스터플랜",
        "선거공약", "정책공약", "핵심공약", "중점과제", "역점사업"
    };

    public KoreanAIPersonalizationService(
        HttpClient httpClient,
        ILogger<KoreanAIPersonalizationService> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _configuration = configuration;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    public async Task<PersonalizationResponse> GeneratePersonalizedMessagesAsync(GeneratePersonalizationRequest request)
    {
        try
        {
            _logger.LogInformation("Starting Korean message personalization for campaign {CampaignId}", request.CampaignId);

            var response = new PersonalizationResponse
            {
                Id = Guid.NewGuid(),
                CampaignId = request.CampaignId,
                OriginalMessage = request.OriginalMessage,
                GeneratedAt = DateTime.UtcNow
            };

            var personalizedVariants = new List<PersonalizedVariantDto>();

            // 각 타겟 인구통계별로 개인화된 변형 생성
            foreach (var demographics in request.TargetDemographics)
            {
                var variant = await GenerateVariantForDemographicsAsync(
                    request.OriginalMessage, 
                    demographics, 
                    request.PersonalizationGoals,
                    request.CulturalSensitivityLevel);

                personalizedVariants.Add(variant);

                // A/B 테스트 활성화 시 추가 변형 생성
                if (request.AbTestingEnabled && personalizedVariants.Count < 6)
                {
                    var alternativeVariant = await GenerateAlternativeVariantAsync(
                        request.OriginalMessage, 
                        demographics, 
                        variant);
                    
                    alternativeVariant.AbTestGroup = $"B{personalizedVariants.Count}";
                    personalizedVariants.Add(alternativeVariant);
                }
            }

            response.PersonalizedVariants = personalizedVariants;

            // 가장 효과적인 변형 추천
            response.RecommendedVariant = personalizedVariants
                .OrderByDescending(v => v.EffectivenessScore)
                .ThenByDescending(v => v.Confidence)
                .FirstOrDefault();

            // 문화적 분석 수행
            if (response.RecommendedVariant != null)
            {
                response.CulturalAnalysis = await AnalyzeCulturalContextAsync(
                    response.RecommendedVariant.PersonalizedMessage,
                    response.RecommendedVariant.TargetDemographics);
            }

            _logger.LogInformation("Generated {Count} personalized variants for campaign {CampaignId}", 
                personalizedVariants.Count, request.CampaignId);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating personalized messages for campaign {CampaignId}", request.CampaignId);
            throw;
        }
    }

    public async Task<PersonalizedVariantDto> PreviewPersonalizationAsync(PreviewPersonalizationRequest request)
    {
        return await GenerateVariantForDemographicsAsync(
            request.OriginalMessage,
            request.SampleDemographics,
            request.Goals,
            request.CulturalSensitivityLevel);
    }

    public async Task<KoreanCulturalAnalysisDto> AnalyzeCulturalContextAsync(string message, VoterDemographicsDto demographics)
    {
        try
        {
            var analysisPrompt = BuildCulturalAnalysisPrompt(message, demographics);
            var aiResponse = await CallAIServiceAsync(analysisPrompt, "cultural-analysis");
            
            return ParseCulturalAnalysis(aiResponse, message, demographics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing cultural context for message");
            return CreateFallbackCulturalAnalysis();
        }
    }

    public async Task<List<string>> ValidatePoliticalTermsAsync(string message)
    {
        var issues = new List<string>();

        try
        {
            var validationPrompt = BuildPoliticalTermValidationPrompt(message);
            var aiResponse = await CallAIServiceAsync(validationPrompt, "term-validation");
            
            // AI 응답에서 문제가 있는 용어들 추출
            var detectedIssues = ParsePoliticalTermValidation(aiResponse);
            issues.AddRange(detectedIssues);

            // 기본 용어 검증 로직
            var basicIssues = ValidateBasicPoliticalTerms(message);
            issues.AddRange(basicIssues);

            return issues.Distinct().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating political terms");
            return ValidateBasicPoliticalTerms(message);
        }
    }

    public async Task<decimal> CalculateEffectivenessScoreAsync(string originalMessage, string personalizedMessage, VoterDemographicsDto demographics)
    {
        try
        {
            var factors = new List<decimal>();

            // 1. 방언 일치도 (0.3 가중치)
            var dialectScore = CalculateDialectScore(personalizedMessage, demographics.PreferredDialect);
            factors.Add(dialectScore * 0.3m);

            // 2. 격식 수준 적절성 (0.2 가중치)
            var formalityScore = CalculateFormalityScore(personalizedMessage, demographics);
            factors.Add(formalityScore * 0.2m);

            // 3. 지역 관련성 (0.2 가중치)
            var regionalScore = CalculateRegionalRelevance(personalizedMessage, demographics.RegionCode);
            factors.Add(regionalScore * 0.2m);

            // 4. 연령 적절성 (0.15 가중치)
            var ageScore = CalculateAgeAppropriate(personalizedMessage, demographics.AgeGroup);
            factors.Add(ageScore * 0.15m);

            // 5. 직업군 관련성 (0.15 가중치)
            var occupationScore = CalculateOccupationRelevance(personalizedMessage, demographics.Occupation);
            factors.Add(occupationScore * 0.15m);

            var totalScore = factors.Sum();
            return Math.Min(Math.Max(totalScore, 0.0m), 1.0m);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating effectiveness score");
            return 0.5m; // 기본값
        }
    }

    private async Task<PersonalizedVariantDto> GenerateVariantForDemographicsAsync(
        string originalMessage,
        VoterDemographicsDto demographics,
        List<PersonalizationGoalDto> goals,
        string culturalSensitivityLevel)
    {
        var prompt = BuildPersonalizationPrompt(originalMessage, demographics, goals, culturalSensitivityLevel);
        var aiResponse = await CallAIServiceAsync(prompt, "personalization");

        var variant = new PersonalizedVariantDto
        {
            Id = Guid.NewGuid(),
            TargetDemographics = demographics,
            Dialect = GetDialectForRegion(demographics.RegionCode) ?? demographics.PreferredDialect,
            FormalityLevel = DetermineFormalityLevel(demographics)
        };

        // AI 응답 파싱
        ParsePersonalizationResponse(aiResponse, variant, originalMessage);

        // 효과성 점수 계산
        variant.EffectivenessScore = await CalculateEffectivenessScoreAsync(
            originalMessage, variant.PersonalizedMessage, demographics);

        // 문화적 마커 추출
        variant.CulturalMarkers = ExtractCulturalMarkers(variant.PersonalizedMessage);

        // 정치 용어 사용 여부 확인
        variant.UsesPoliticalTerms = CheckPoliticalTermUsage(variant.PersonalizedMessage);

        return variant;
    }

    private async Task<PersonalizedVariantDto> GenerateAlternativeVariantAsync(
        string originalMessage,
        VoterDemographicsDto demographics,
        PersonalizedVariantDto baseVariant)
    {
        var alternativePrompt = BuildAlternativeVariantPrompt(originalMessage, demographics, baseVariant);
        var aiResponse = await CallAIServiceAsync(alternativePrompt, "alternative-variant");

        var variant = new PersonalizedVariantDto
        {
            Id = Guid.NewGuid(),
            TargetDemographics = demographics,
            Dialect = baseVariant.Dialect,
            FormalityLevel = baseVariant.FormalityLevel,
            AbTestGroup = "B"
        };

        ParsePersonalizationResponse(aiResponse, variant, originalMessage);
        variant.EffectivenessScore = await CalculateEffectivenessScoreAsync(
            originalMessage, variant.PersonalizedMessage, demographics);

        return variant;
    }

    private string BuildPersonalizationPrompt(
        string originalMessage,
        VoterDemographicsDto demographics,
        List<PersonalizationGoalDto> goals,
        string culturalSensitivityLevel)
    {
        var goalDescriptions = goals.Select(g => $"- {g.Type}: {g.Description}").ToList();
        
        return $@"
한국 정치 캠페인 메시지를 다음 유권자 특성에 맞게 개인화해주세요:

원본 메시지: ""{originalMessage}""

유권자 정보:
- 연령대: {demographics.AgeGroup ?? "미상"}
- 지역: {demographics.RegionName ?? "미상"} ({demographics.RegionCode ?? "미상"})
- 선호 방언: {demographics.PreferredDialect}
- 교육 수준: {demographics.EducationLevel ?? "미상"}
- 직업: {demographics.Occupation ?? "미상"}
- 소통 스타일: {demographics.CommunicationStyle}

개인화 목표:
{string.Join("\n", goalDescriptions)}

문화적 민감성 수준: {culturalSensitivityLevel}

요구사항:
1. 해당 지역의 방언과 표현을 자연스럽게 사용
2. 연령대에 적합한 존댓말/반말 수준 적용
3. 직업군 특성을 고려한 메시지 조정
4. 한국 정치 용어를 정확하고 적절하게 사용
5. 문화적으로 민감한 표현 지양
6. 메시지의 핵심 내용과 의도 유지

응답은 개인화된 메시지만 제공해주세요.
";
    }

    private string BuildCulturalAnalysisPrompt(string message, VoterDemographicsDto demographics)
    {
        return $@"
다음 한국어 정치 캠페인 메시지의 문화적 적절성을 분석해주세요:

메시지: ""{message}""

유권자 정보:
- 연령대: {demographics.AgeGroup ?? "미상"}
- 지역: {demographics.RegionName ?? "미상"}
- 방언: {demographics.PreferredDialect}
- 교육 수준: {demographics.EducationLevel ?? "미상"}
- 직업: {demographics.Occupation ?? "미상"}

분석 항목:
1. 방언 일관성 (0-1 점수)
2. 격식 수준 적절성 (true/false)
3. 정치 용어 정확성 (0-1 점수)
4. 문화적 민감성 점수 (0-1 점수)
5. 지역 관련성 (0-1 점수)
6. 연령 적절성 (true/false)
7. 주의사항 (배열)
8. 개선 제안 (배열)

JSON 형식으로 응답해주세요.
";
    }

    private string BuildPoliticalTermValidationPrompt(string message)
    {
        return $@"
다음 한국어 정치 메시지에서 부적절하거나 잘못 사용된 정치 용어가 있는지 검증해주세요:

메시지: ""{message}""

검증 기준:
1. 한국 정치 용어의 정확한 사용
2. 맥락에 적합한 용어 선택
3. 법적/윤리적 문제가 있는 표현
4. 지역 차별적 표현
5. 연령/성별 차별적 표현

문제가 발견된 용어와 그 이유를 나열해주세요.
응답 형식: ["용어1: 이유", "용어2: 이유", ...]
";
    }

    private string BuildAlternativeVariantPrompt(string originalMessage, VoterDemographicsDto demographics, PersonalizedVariantDto baseVariant)
    {
        return $@"
기존 개인화 버전과 다른 스타일의 대안 메시지를 생성해주세요:

원본 메시지: ""{originalMessage}""
기존 개인화 버전: ""{baseVariant.PersonalizedMessage}""

유권자 정보: {demographics.AgeGroup}, {demographics.RegionName}, {demographics.Occupation}

요구사항:
1. 같은 의미를 다른 방식으로 표현
2. 다른 어조나 접근법 사용
3. 기존 버전과 구별되는 특성 보유
4. 동일한 방언과 격식 수준 유지

대안 메시지만 제공해주세요.
";
    }

    private async Task<string> CallAIServiceAsync(string prompt, string requestType)
    {
        try
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new InvalidOperationException("OpenAI API key not configured");
            }

            var requestBody = new
            {
                model = "gpt-4-turbo-preview",
                messages = new[]
                {
                    new { role = "system", content = "당신은 한국 정치 캠페인 메시지 개인화 전문가입니다. 한국의 지역별 방언, 문화적 특성, 정치적 맥락을 정확히 이해하고 적절한 메시지를 생성합니다." },
                    new { role = "user", content = prompt }
                },
                max_tokens = 1000,
                temperature = 0.7
            };

            var json = JsonSerializer.Serialize(requestBody, _jsonOptions);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            var responseObject = JsonSerializer.Deserialize<JsonElement>(responseJson);

            return responseObject
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AI service for request type: {RequestType}", requestType);
            throw;
        }
    }

    private void ParsePersonalizationResponse(string aiResponse, PersonalizedVariantDto variant, string originalMessage)
    {
        // AI 응답을 정리하여 개인화된 메시지 추출
        var cleanedMessage = aiResponse.Trim().Trim('"');
        
        // 불필요한 설명이나 메타데이터 제거
        var lines = cleanedMessage.Split('\n');
        var messageLines = lines.Where(line => 
            !line.StartsWith("분석:") && 
            !line.StartsWith("설명:") && 
            !line.StartsWith("Note:") && 
            !string.IsNullOrWhiteSpace(line)).ToList();

        variant.PersonalizedMessage = string.Join(" ", messageLines).Trim();
        
        // 메시지가 비어있거나 원본과 동일한 경우 기본 처리
        if (string.IsNullOrWhiteSpace(variant.PersonalizedMessage) || 
            variant.PersonalizedMessage == originalMessage)
        {
            variant.PersonalizedMessage = ApplyBasicPersonalization(originalMessage, variant.TargetDemographics);
        }

        // 신뢰도 점수 계산 (메시지 품질 기반)
        variant.Confidence = CalculateConfidenceScore(variant.PersonalizedMessage, originalMessage);
    }

    private KoreanCulturalAnalysisDto ParseCulturalAnalysis(string aiResponse, string message, VoterDemographicsDto demographics)
    {
        try
        {
            var analysis = JsonSerializer.Deserialize<KoreanCulturalAnalysisDto>(aiResponse, _jsonOptions);
            return analysis ?? CreateFallbackCulturalAnalysis();
        }
        catch
        {
            return CreateFallbackCulturalAnalysis();
        }
    }

    private KoreanCulturalAnalysisDto CreateFallbackCulturalAnalysis()
    {
        return new KoreanCulturalAnalysisDto
        {
            DialectConsistency = 0.7m,
            FormalityAppropriate = true,
            PoliticalTermAccuracy = 0.8m,
            CulturalSensitivityScore = 0.75m,
            RegionalRelevance = 0.6m,
            AgeAppropriate = true,
            Warnings = new List<string> { "AI 분석 결과를 사용할 수 없어 기본값을 적용했습니다." },
            Suggestions = new List<string> { "수동으로 문화적 적절성을 검토해주세요." }
        };
    }

    private List<string> ParsePoliticalTermValidation(string aiResponse)
    {
        try
        {
            var issues = JsonSerializer.Deserialize<List<string>>(aiResponse, _jsonOptions);
            return issues ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private List<string> ValidateBasicPoliticalTerms(string message)
    {
        var issues = new List<string>();

        // 기본적인 정치 용어 검증 로직
        var problematicTerms = new Dictionary<string, string>
        {
            { "빨갱이", "정치적으로 부적절한 표현" },
            { "종북", "정치적으로 부적절한 표현" },
            { "극우", "정치적으로 민감한 표현" },
            { "극좌", "정치적으로 민감한 표현" }
        };

        foreach (var term in problematicTerms)
        {
            if (message.Contains(term.Key))
            {
                issues.Add($"{term.Key}: {term.Value}");
            }
        }

        return issues;
    }

    private string? GetDialectForRegion(string? regionCode)
    {
        if (string.IsNullOrEmpty(regionCode) || regionCode.Length < 2)
            return null;

        var prefix = regionCode.Substring(0, 2);
        return _regionDialectMapping.GetValueOrDefault(prefix, "서울말");
    }

    private string DetermineFormalityLevel(VoterDemographicsDto demographics)
    {
        // 연령대와 직업을 고려한 격식 수준 결정
        return demographics.AgeGroup switch
        {
            "60plus" => "respectful",
            "50s" => "formal",
            "40s" => "formal",
            "30s" => "informal",
            "20s" => "casual",
            _ => "formal"
        };
    }

    private decimal CalculateDialectScore(string message, string expectedDialect)
    {
        // 방언별 특징적 표현 검사
        var dialectMarkers = new Dictionary<string, List<string>>
        {
            { "부산말", new List<string> { "~네", "~거든", "~아이가", "~하나" } },
            { "경상도", new List<string> { "~카노", "~데이", "~노", "~나" } },
            { "전라도", new List<string> { "~것이", "~잉", "~께", "~라우" } },
            { "충청도", new List<string> { "~여", "~구만", "~디", "~것이유" } },
            { "제주도", new List<string> { "~우꽈", "~쿠과", "~멘", "~수다" } }
        };

        if (dialectMarkers.TryGetValue(expectedDialect, out var markers))
        {
            var foundMarkers = markers.Count(marker => message.Contains(marker));
            return Math.Min(foundMarkers * 0.3m, 1.0m);
        }

        return 0.5m; // 기본 점수
    }

    private decimal CalculateFormalityScore(string message, VoterDemographicsDto demographics)
    {
        var expectedFormality = DetermineFormalityLevel(demographics);
        
        // 격식체 마커 검사
        var formalMarkers = new[] { "습니다", "입니다", "하겠습니다", "드립니다" };
        var informalMarkers = new[] { "해요", "이에요", "예요", "할게요" };
        var casualMarkers = new[] { "해", "야", "지", "네" };

        var formalCount = formalMarkers.Count(marker => message.Contains(marker));
        var informalCount = informalMarkers.Count(marker => message.Contains(marker));
        var casualCount = casualMarkers.Count(marker => message.Contains(marker));

        return expectedFormality switch
        {
            "formal" or "respectful" => formalCount > 0 ? 1.0m : 0.3m,
            "informal" => informalCount > 0 ? 1.0m : (formalCount > 0 ? 0.7m : 0.3m),
            "casual" => casualCount > 0 ? 1.0m : 0.5m,
            _ => 0.5m
        };
    }

    private decimal CalculateRegionalRelevance(string message, string? regionCode)
    {
        if (string.IsNullOrEmpty(regionCode))
            return 0.5m;

        // 지역별 관련 키워드 검사
        var regionalKeywords = new Dictionary<string, List<string>>
        {
            { "11", new List<string> { "서울", "한강", "강남", "강북", "시청", "명동" } },
            { "26", new List<string> { "부산", "해운대", "광안리", "동래", "부산항", "감천" } },
            { "27", new List<string> { "대구", "동성로", "수성구", "달성", "팔공산" } }
        };

        var prefix = regionCode.Length >= 2 ? regionCode.Substring(0, 2) : regionCode;
        
        if (regionalKeywords.TryGetValue(prefix, out var keywords))
        {
            var foundKeywords = keywords.Count(keyword => message.Contains(keyword));
            return Math.Min(foundKeywords * 0.4m, 1.0m);
        }

        return 0.5m;
    }

    private decimal CalculateAgeAppropriate(string message, string? ageGroup)
    {
        if (string.IsNullOrEmpty(ageGroup))
            return 0.5m;

        // 연령대별 적절한 표현 검사
        var ageAppropriateTerms = new Dictionary<string, List<string>>
        {
            { "20s", new List<string> { "청년", "미래", "기회", "도전", "혁신" } },
            { "30s", new List<string> { "일자리", "주택", "육아", "경력", "안정" } },
            { "40s", new List<string> { "교육", "가정", "중산층", "자녀", "경력" } },
            { "50s", new List<string> { "은퇴", "건강", "노후", "경험", "안정" } },
            { "60plus", new List<string> { "복지", "건강", "노인", "경로", "존경" } }
        };

        if (ageAppropriateTerms.TryGetValue(ageGroup, out var terms))
        {
            var foundTerms = terms.Count(term => message.Contains(term));
            return Math.Min(foundTerms * 0.3m + 0.4m, 1.0m);
        }

        return 0.5m;
    }

    private decimal CalculateOccupationRelevance(string message, string? occupation)
    {
        if (string.IsNullOrEmpty(occupation))
            return 0.5m;

        // 직업별 관련 키워드
        var occupationKeywords = new Dictionary<string, List<string>>
        {
            { "공무원", new List<string> { "행정", "공공", "시민", "봉사", "투명", "공정" } },
            { "자영업자", new List<string> { "소상공인", "경영", "매출", "임대료", "규제", "지원" } },
            { "회사원", new List<string> { "직장", "근로", "급여", "승진", "워라밸", "복지" } },
            { "농업", new List<string> { "농민", "농촌", "농산물", "가격", "지원", "귀농" } }
        };

        if (occupationKeywords.TryGetValue(occupation, out var keywords))
        {
            var foundKeywords = keywords.Count(keyword => message.Contains(keyword));
            return Math.Min(foundKeywords * 0.3m + 0.4m, 1.0m);
        }

        return 0.5m;
    }

    private List<string> ExtractCulturalMarkers(string message)
    {
        var markers = new List<string>();

        // 한국 특유의 문화적 표현 검출
        var culturalExpressions = new[]
        {
            "안녕하십니까", "감사합니다", "죄송합니다", "수고하세요",
            "정성껏", "마음을 다해", "최선을 다해", "함께",
            "우리", "이웃", "동네", "마을", "지역"
        };

        foreach (var expression in culturalExpressions)
        {
            if (message.Contains(expression))
            {
                markers.Add(expression);
            }
        }

        return markers;
    }

    private bool CheckPoliticalTermUsage(string message)
    {
        return _koreanPoliticalTerms.Any(term => message.Contains(term));
    }

    private string ApplyBasicPersonalization(string originalMessage, VoterDemographicsDto demographics)
    {
        var message = originalMessage;

        // 기본적인 격식 수준 조정
        var formalityLevel = DetermineFormalityLevel(demographics);
        
        if (formalityLevel == "respectful" && !message.Contains("습니다"))
        {
            message = message.Replace("해요", "습니다").Replace("이에요", "입니다");
        }
        else if (formalityLevel == "casual" && message.Contains("습니다"))
        {
            message = message.Replace("습니다", "해").Replace("입니다", "야");
        }

        return message;
    }

    private decimal CalculateConfidenceScore(string personalizedMessage, string originalMessage)
    {
        if (string.IsNullOrWhiteSpace(personalizedMessage) || personalizedMessage == originalMessage)
            return 0.3m;

        var lengthRatio = (decimal)personalizedMessage.Length / originalMessage.Length;
        var lengthScore = lengthRatio switch
        {
            >= 0.7m and <= 1.5m => 1.0m,
            >= 0.5m and < 0.7m => 0.8m,
            >= 1.5m and <= 2.0m => 0.8m,
            _ => 0.5m
        };

        var hasKoreanChars = personalizedMessage.Any(c => c >= '가' && c <= '힣');
        var koreanScore = hasKoreanChars ? 1.0m : 0.3m;

        return (lengthScore + koreanScore) / 2;
    }
}