using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

/// <summary>
/// 한국어 개인화 시스템 테스트 데이터 생성 서비스
/// </summary>
public interface IKoreanPersonalizationSeedService
{
    Task SeedDemoDataAsync(Guid tenantId);
    Task SeedKoreanLanguageContextsAsync(Guid tenantId);
    Task SeedVoterDemographicsAsync(Guid tenantId, List<Guid> contactIds);
}

public class KoreanPersonalizationSeedService : IKoreanPersonalizationSeedService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<KoreanPersonalizationSeedService> _logger;

    public KoreanPersonalizationSeedService(
        ApplicationDbContext context,
        ILogger<KoreanPersonalizationSeedService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedDemoDataAsync(Guid tenantId)
    {
        try
        {
            _logger.LogInformation("Starting Korean personalization demo data seeding for tenant {TenantId}", tenantId);

            // 1. 한국어 언어 맥락 데이터 생성
            await SeedKoreanLanguageContextsAsync(tenantId);

            // 2. 연락처 데이터가 있는지 확인하고 유권자 인구통계 생성
            var existingContacts = await _context.Contacts
                .Where(c => c.TenantId == tenantId)
                .Select(c => c.Id)
                .Take(100)
                .ToListAsync();

            if (existingContacts.Any())
            {
                await SeedVoterDemographicsAsync(tenantId, existingContacts);
            }
            else
            {
                _logger.LogWarning("No existing contacts found for tenant {TenantId}. Creating sample contacts first.", tenantId);
                await SeedSampleContactsAsync(tenantId);
                
                var newContactIds = await _context.Contacts
                    .Where(c => c.TenantId == tenantId)
                    .Select(c => c.Id)
                    .Take(50)
                    .ToListAsync();
                    
                await SeedVoterDemographicsAsync(tenantId, newContactIds);
            }

            // 3. 샘플 개인화 데이터 생성
            await SeedSamplePersonalizationsAsync(tenantId);

            _logger.LogInformation("Korean personalization demo data seeding completed for tenant {TenantId}", tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding Korean personalization demo data for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task SeedKoreanLanguageContextsAsync(Guid tenantId)
    {
        var existingContexts = await _context.Set<KoreanLanguageContext>()
            .Where(klc => klc.TenantId == tenantId)
            .AnyAsync();

        if (existingContexts)
        {
            _logger.LogInformation("Korean language contexts already exist for tenant {TenantId}", tenantId);
            return;
        }

        var contexts = new List<KoreanLanguageContext>
        {
            new KoreanLanguageContext
            {
                TenantId = tenantId,
                ContextName = "서울_공무원_40대",
                Dialect = "서울말",
                Formality = "formal",
                CulturalMarkers = JsonDocument.Parse(@"[""안녕하십니까"", ""감사합니다"", ""시민 여러분"", ""정성껏""]"),
                TabooExpressions = JsonDocument.Parse(@"[""빨갱이"", ""종북"", ""극우"", ""극좌""]"),
                RecommendedExpressions = JsonDocument.Parse(@"[""시민 여러분께"", ""지역 발전을 위해"", ""투명한 행정으로"", ""소통하는 정치""]")
            },
            new KoreanLanguageContext
            {
                TenantId = tenantId,
                ContextName = "부산_자영업_50대",
                Dialect = "부산말",
                Formality = "informal",
                CulturalMarkers = JsonDocument.Parse(@"[""뭐하노"", ""그카네"", ""좋다아이가"", ""우리 동네""]"),
                TabooExpressions = JsonDocument.Parse(@"[""빨갱이"", ""종북"", ""극우"", ""극좌""]"),
                RecommendedExpressions = JsonDocument.Parse(@"[""우리 부산 사람들"", ""지역 경제 살리기"", ""소상공인을 위한"", ""함께 하는 부산""]")
            },
            new KoreanLanguageContext
            {
                TenantId = tenantId,
                ContextName = "전라도_농업_60대",
                Dialect = "전라도",
                Formality = "respectful",
                CulturalMarkers = JsonDocument.Parse(@"[""뭐하것이"", ""그래잉"", ""좋구만잉"", ""향토민""]"),
                TabooExpressions = JsonDocument.Parse(@"[""빨갱이"", ""종북"", ""극우"", ""극좌""]"),
                RecommendedExpressions = JsonDocument.Parse(@"[""농민 여러분께"", ""우리 고향을 위해"", ""전통과 발전"", ""농촌 살리기""]")
            },
            new KoreanLanguageContext
            {
                TenantId = tenantId,
                ContextName = "경상도_회사원_30대",
                Dialect = "경상도",
                Formality = "informal",
                CulturalMarkers = JsonDocument.Parse(@"[""뭐하노"", ""그래카노"", ""좋다예"", ""워킹맘""]"),
                TabooExpressions = JsonDocument.Parse(@"[""빨갱이"", ""종북"", ""극우"", ""극좌""]"),
                RecommendedExpressions = JsonDocument.Parse(@"[""직장인 여러분"", ""일과 가정의 균형"", ""청년을 위한 정책"", ""미래 세대""]")
            },
            new KoreanLanguageContext
            {
                TenantId = tenantId,
                ContextName = "충청도_교육_40대",
                Dialect = "충청도",
                Formality = "formal",
                CulturalMarkers = JsonDocument.Parse(@"[""뭐하여"", ""그래구만"", ""좋다여"", ""아이들""]"),
                TabooExpressions = JsonDocument.Parse(@"[""빨갱이"", ""종북"", ""극우"", ""극좌""]"),
                RecommendedExpressions = JsonDocument.Parse(@"[""교육 가족 여러분"", ""우리 아이들의 미래"", ""품격 있는 교육"", ""지역 인재 양성""]")
            }
        };

        _context.Set<KoreanLanguageContext>().AddRange(contexts);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Count} Korean language contexts for tenant {TenantId}", contexts.Count, tenantId);
    }

    public async Task SeedVoterDemographicsAsync(Guid tenantId, List<Guid> contactIds)
    {
        var existingDemographics = await _context.Set<VoterDemographics>()
            .Where(vd => vd.TenantId == tenantId)
            .CountAsync();

        if (existingDemographics > 0)
        {
            _logger.LogInformation("Voter demographics already exist for tenant {TenantId} (count: {Count})", tenantId, existingDemographics);
            return;
        }

        var random = new Random();
        var ageGroups = new[] { "20s", "30s", "40s", "50s", "60plus" };
        var genders = new[] { "M", "F" };
        var regions = new[]
        {
            ("11", "서울특별시", "서울말"),
            ("26", "부산광역시", "부산말"),
            ("27", "대구광역시", "경상도"),
            ("29", "광주광역시", "전라도"),
            ("30", "대전광역시", "충청도"),
            ("41", "경기도", "서울말"),
            ("45", "전라북도", "전라도"),
            ("47", "경상북도", "경상도"),
            ("48", "경상남도", "경상도")
        };
        var occupations = new[] { "공무원", "자영업자", "회사원", "농업", "학생", "주부", "전문직", "기타" };
        var educationLevels = new[] { "고졸", "대졸", "대학원졸" };
        var incomeLevels = new[] { "low", "middle", "high" };
        var politicalLeanings = new[] { "진보", "보수", "중도" };
        var communicationStyles = new[] { "formal", "casual", "respectful", "friendly" };

        var demographics = new List<VoterDemographics>();

        foreach (var contactId in contactIds)
        {
            var region = regions[random.Next(regions.Length)];
            var ageGroup = ageGroups[random.Next(ageGroups.Length)];
            var occupation = occupations[random.Next(occupations.Length)];

            // 연령대와 직업에 따른 소통 스타일 결정
            var communicationStyle = (ageGroup, occupation) switch
            {
                ("60plus", _) => "respectful",
                ("50s", "공무원") => "formal",
                ("20s", _) => "casual",
                ("30s", "회사원") => "friendly",
                _ => communicationStyles[random.Next(communicationStyles.Length)]
            };

            // 관심 이슈 생성
            var allIssues = new[] { "경제", "교육", "복지", "안전", "환경", "교통", "주택", "일자리", "의료", "문화" };
            var interestCount = random.Next(2, 5);
            var interests = allIssues.OrderBy(x => random.Next()).Take(interestCount).ToArray();

            var demographic = new VoterDemographics
            {
                TenantId = tenantId,
                ContactId = contactId,
                AgeGroup = ageGroup,
                Gender = genders[random.Next(genders.Length)],
                RegionCode = region.Item1,
                RegionName = region.Item2,
                PreferredDialect = region.Item3,
                EducationLevel = educationLevels[random.Next(educationLevels.Length)],
                Occupation = occupation,
                IncomeLevel = incomeLevels[random.Next(incomeLevels.Length)],
                PoliticalLeaning = politicalLeanings[random.Next(politicalLeanings.Length)],
                InterestIssues = JsonDocument.Parse(JsonSerializer.Serialize(interests)),
                CommunicationStyle = communicationStyle,
                LastUpdated = DateTime.UtcNow
            };

            demographics.Add(demographic);
        }

        _context.Set<VoterDemographics>().AddRange(demographics);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Count} voter demographics for tenant {TenantId}", demographics.Count, tenantId);
    }

    private async Task SeedSampleContactsAsync(Guid tenantId)
    {
        var sampleContacts = new List<Contact>();
        var koreanNames = new[]
        {
            "김철수", "이영희", "박민수", "최수정", "정대한", "강미영", "윤성호", "임지영",
            "한상우", "조은지", "신동현", "오혜진", "노준호", "권소영", "문재인", "안지원",
            "황태희", "서민지", "배준영", "양수현", "고민정", "송하늘", "유진우", "전미래",
            "허정호", "남궁민", "제갈성", "사공은", "선우진", "남전원", "독고강", "서문석",
            "동방현", "위은총", "형지혜", "뚜영수", "갈현준", "초민영", "변성민", "검태윤"
        };

        for (int i = 0; i < 50; i++)
        {
            var contact = new Contact
            {
                TenantId = tenantId,
                FullName = koreanNames[i % koreanNames.Length] + (i > koreanNames.Length - 1 ? $"{i}" : ""),
                IsActive = true,
                ActivityScore = new Random().Next(0, 100),
                LastActivityAt = DateTime.UtcNow.AddDays(-new Random().Next(1, 365))
            };

            sampleContacts.Add(contact);
        }

        _context.Contacts.AddRange(sampleContacts);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Count} sample contacts for tenant {TenantId}", sampleContacts.Count, tenantId);
    }

    private async Task SeedSamplePersonalizationsAsync(Guid tenantId)
    {
        var existingPersonalizations = await _context.Set<MessagePersonalization>()
            .Where(mp => mp.TenantId == tenantId)
            .AnyAsync();

        if (existingPersonalizations)
        {
            _logger.LogInformation("Sample personalizations already exist for tenant {TenantId}", tenantId);
            return;
        }

        // 샘플 캠페인이 있는지 확인
        var sampleCampaign = await _context.Campaigns
            .Where(c => c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (sampleCampaign == null)
        {
            _logger.LogWarning("No campaigns found for tenant {TenantId}. Skipping sample personalizations.", tenantId);
            return;
        }

        var sampleContacts = await _context.Contacts
            .Where(c => c.TenantId == tenantId)
            .Take(10)
            .ToListAsync();

        if (!sampleContacts.Any())
        {
            _logger.LogWarning("No contacts found for tenant {TenantId}. Skipping sample personalizations.", tenantId);
            return;
        }

        var sampleMessages = new[]
        {
            "안녕하십니까? 저는 여러분의 더 나은 삶을 위해 최선을 다하겠습니다.",
            "우리 지역 발전을 위해 함께 노력하겠습니다. 많은 관심과 참여 부탁드립니다.",
            "시민 여러분의 목소리에 귀 기울이며, 소통하는 정치를 실현하겠습니다.",
            "교육과 복지, 일자리 창출을 통해 희망찬 미래를 만들어가겠습니다."
        };

        var personalizations = new List<MessagePersonalization>();
        var random = new Random();

        foreach (var contact in sampleContacts)
        {
            var originalMessage = sampleMessages[random.Next(sampleMessages.Length)];
            var dialects = new[] { "서울말", "부산말", "경상도", "전라도", "충청도" };
            var formalityLevels = new[] { "formal", "informal", "respectful", "casual" };

            var personalization = new MessagePersonalization
            {
                TenantId = tenantId,
                CampaignId = sampleCampaign.Id,
                ContactId = contact.Id,
                OriginalMessage = originalMessage,
                PersonalizedMessage = GeneratePersonalizedMessage(originalMessage, random),
                Dialect = dialects[random.Next(dialects.Length)],
                FormalityLevel = formalityLevels[random.Next(formalityLevels.Length)],
                AgeGroup = new[] { "20s", "30s", "40s", "50s", "60plus" }[random.Next(5)],
                OccupationCategory = new[] { "공무원", "자영업자", "회사원", "농업" }[random.Next(4)],
                EffectivenessScore = (decimal)(random.NextDouble() * 0.4 + 0.6), // 0.6-1.0
                UsesPoliticalTerms = random.Next(2) == 1,
                GeneratedAt = DateTime.UtcNow.AddDays(-random.Next(1, 30))
            };

            personalizations.Add(personalization);
        }

        _context.Set<MessagePersonalization>().AddRange(personalizations);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Count} sample personalizations for tenant {TenantId}", personalizations.Count, tenantId);
    }

    private string GeneratePersonalizedMessage(string originalMessage, Random random)
    {
        // 간단한 메시지 개인화 시뮬레이션
        var variations = new[]
        {
            originalMessage.Replace("안녕하십니까", "안녕하세요"),
            originalMessage.Replace("여러분", "분들"),
            originalMessage.Replace("최선을 다하겠습니다", "열심히 하겠습니다"),
            originalMessage.Replace("지역 발전", "우리 동네 발전"),
            originalMessage + " 감사합니다."
        };

        return variations[random.Next(variations.Length)];
    }
}