using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.Models;

namespace ProductivityHub.Api.Services;

/// <summary>
/// Service for seeding the database with test and demo data
/// </summary>
public class DatabaseSeedService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseSeedService> _logger;
    private readonly IEncryptionService _encryptionService;

    public DatabaseSeedService(
        ApplicationDbContext context, 
        ILogger<DatabaseSeedService> logger,
        IEncryptionService encryptionService)
    {
        _context = context;
        _logger = logger;
        _encryptionService = encryptionService;
    }

    /// <summary>
    /// Seeds the database with comprehensive test data for development and testing
    /// </summary>
    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting database seeding...");

            // Force re-seeding for debugging - check if admin@test.com user exists
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "admin@test.com");
            if (adminUser != null)
            {
                _logger.LogInformation($"Test admin user already exists with email: {adminUser.Email}");
                return;
            }

            // Create tenants
            var tenants = await CreateTenantsAsync();
            
            // Create users for each tenant
            var users = await CreateUsersAsync(tenants);
            
            // Save tenants and users first
            await _context.SaveChangesAsync();

            // Create tags for each tenant
            var tags = await CreateTagsAsync(tenants);
            
            // Save tags
            await _context.SaveChangesAsync();

            // Create contacts for each tenant with tags
            var contacts = await CreateContactsAsync(tenants, tags);
            
            // Save contacts
            await _context.SaveChangesAsync();

            // Create campaigns for each tenant
            var campaigns = await CreateCampaignsAsync(tenants, users);
            
            // Final save
            await _context.SaveChangesAsync();

            _logger.LogInformation("Database seeding completed successfully!");
            _logger.LogInformation($"Created {tenants.Count} tenants, {users.Count} users, {tags.Count} tags, {contacts.Count} contacts, and {campaigns.Count} campaigns");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during database seeding");
            throw;
        }
    }

    private async Task<List<Tenant>> CreateTenantsAsync()
    {
        var tenants = new List<Tenant>
        {
            new()
            {
                Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440000"),
                Name = "더불어민주당 서울특별시당",
                Description = "서울 지역 주요 정당 지부",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440001"),
                Name = "국민의힘 부산광역시당",
                Description = "부산 지역 주요 정당 지부",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = Guid.Parse("550e8400-e29b-41d4-a716-446655440002"),
                Name = "정의당 대구광역시당",
                Description = "대구 지역 정당 지부",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            }
        };

        await _context.Tenants.AddRangeAsync(tenants);
        return tenants;
    }

    private async Task<List<User>> CreateUsersAsync(List<Tenant> tenants)
    {
        var users = new List<User>();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!");

        var userTemplates = new[]
        {
            new { Name = "김철수", Email = "admin@test.com", Role = "Owner" },
            new { Name = "이영희", Email = "manager@test.com", Role = "Admin" },
            new { Name = "박민수", Email = "staff1@test.com", Role = "Staff" },
            new { Name = "정수연", Email = "staff2@test.com", Role = "Staff" },
            new { Name = "최현우", Email = "staff3@test.com", Role = "Staff" }
        };

        // Create simple test accounts for the first tenant only
        var firstTenant = tenants[0];
        foreach (var template in userTemplates)
        {
            users.Add(new User
            {
                Id = Guid.NewGuid(),
                TenantId = firstTenant.Id,
                Name = template.Name,
                Email = template.Email,
                PasswordHash = passwordHash,
                Role = template.Role,
                IsActive = true,
                LastLoginAt = DateTime.UtcNow.AddDays(new Random().Next(-7, 0)),
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            });
        }
        
        // Create users for other tenants with numbered emails
        for (int i = 1; i < tenants.Count; i++)
        {
            var tenant = tenants[i];
            foreach (var template in userTemplates)
            {
                users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = template.Name,
                    Email = $"{template.Email.Split('@')[0]}{i + 1}@test.com",
                    PasswordHash = passwordHash,
                    Role = template.Role,
                    IsActive = true,
                    LastLoginAt = DateTime.UtcNow.AddDays(new Random().Next(-7, 0)),
                    CreatedAt = DateTime.UtcNow.AddDays(-15),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                });
            }
        }

        await _context.Users.AddRangeAsync(users);
        return users;
    }

    private async Task<List<Tag>> CreateTagsAsync(List<Tenant> tenants)
    {
        var tags = new List<Tag>();
        var tagNames = new[]
        {
            "VIP", "후원자", "당원", "자원봉사자", "언론인", "공무원", "기업인", "청년",
            "시니어", "여성", "장애인", "농어민", "상인", "교육관계자", "의료진", "IT종사자",
            "문화예술인", "종교인", "노조", "시민단체", "환경단체", "복지시설", "협동조합",
            "소상공인", "1차 접촉", "2차 접촉", "관심 있음", "적극 지지", "중립", "반대"
        };

        foreach (var tenant in tenants)
        {
            foreach (var tagName in tagNames)
            {
                tags.Add(new Tag
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = tagName,
                    Color = GetRandomColor(),
                    CreatedAt = DateTime.UtcNow.AddDays(-10),
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.Tags.AddRangeAsync(tags);
        return tags;
    }

    private async Task<List<Contact>> CreateContactsAsync(List<Tenant> tenants, List<Tag> tags)
    {
        var contacts = new List<Contact>();
        var random = new Random();

        // Korean names for realistic data
        var firstNames = new[] { "민수", "영희", "철수", "수연", "현우", "지은", "준호", "미영", "성호", "은정", 
                                "동현", "소영", "경수", "혜진", "태우", "나영", "상훈", "예지", "우진", "다은" };
        var lastNames = new[] { "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", 
                               "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍" };

        // Sample phone prefixes (Korean mobile)
        var phonePrefix = new[] { "010-1234", "010-2345", "010-3456", "010-4567", "010-5678", "010-6789", "010-7890", "010-8901", "010-9012" };
        var emailDomains = new[] { "@gmail.com", "@naver.com", "@daum.net", "@hanmail.net", "@nate.com" };

        foreach (var tenant in tenants)
        {
            var tenantTags = tags.Where(t => t.TenantId == tenant.Id).ToList();
            var contactsPerTenant = random.Next(800, 1200); // 800-1200 contacts per tenant

            for (int i = 0; i < contactsPerTenant; i++)
            {
                var firstName = firstNames[random.Next(firstNames.Length)];
                var lastName = lastNames[random.Next(lastNames.Length)];
                var fullName = $"{lastName}{firstName}";
                
                var phone = $"{phonePrefix[random.Next(phonePrefix.Length)]}-{random.Next(1000, 9999)}";
                var email = $"{lastName.ToLower()}.{firstName.ToLower()}{random.Next(1, 999)}{emailDomains[random.Next(emailDomains.Length)]}";
                var kakaoId = random.NextDouble() > 0.3 ? $"kakao_{lastName.ToLower()}{firstName.ToLower()}{random.Next(1, 9999)}" : null;

                var contact = new Contact
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    FullName = fullName,
                    PhoneHash = await _encryptionService.HashAsync(phone),
                    PhoneEncrypted = await _encryptionService.EncryptAsync(phone),
                    EmailHash = await _encryptionService.HashAsync(email),
                    EmailEncrypted = await _encryptionService.EncryptAsync(email),
                    Notes = GenerateRandomNotes(random),
                    IsActive = random.NextDouble() > 0.05, // 95% active
                    CreatedAt = DateTime.UtcNow.AddDays(-random.Next(1, 60)),
                    UpdatedAt = DateTime.UtcNow.AddDays(-random.Next(0, 7))
                };

                if (kakaoId != null)
                {
                    contact.KakaoIdHash = await _encryptionService.HashAsync(kakaoId);
                    contact.KakaoIdEncrypted = await _encryptionService.EncryptAsync(kakaoId);
                }

                contacts.Add(contact);

                // Add random tags to some contacts
                if (random.NextDouble() > 0.3 && tenantTags.Any()) // 70% of contacts have tags
                {
                    var numTags = random.Next(1, 5); // 1-4 tags per contact
                    var selectedTags = tenantTags.OrderBy(x => random.Next()).Take(numTags).ToList();
                    
                    foreach (var tag in selectedTags)
                    {
                        await _context.ContactTags.AddAsync(new ContactTag
                        {
                            ContactId = contact.Id,
                            TagId = tag.Id,
                            TenantId = tenant.Id,
                            CreatedAt = DateTime.UtcNow.AddDays(-random.Next(0, 30))
                        });
                    }
                }
            }
        }

        await _context.Contacts.AddRangeAsync(contacts);
        return contacts;
    }

    private async Task<List<Campaign>> CreateCampaignsAsync(List<Tenant> tenants, List<User> users)
    {
        var campaigns = new List<Campaign>();
        var random = new Random();

        var campaignTemplates = new[]
        {
            new { Name = "신년 인사 캠페인", Title = "2025년 새해 인사", Body = "안녕하세요 {{name}}님, 새해 복 많이 받으시고 건강하세요!" },
            new { Name = "정책 설명회 안내", Title = "정책 설명회 참석 안내", Body = "{{name}}님께서 관심있어 하실 정책 설명회가 {{date}}에 개최됩니다." },
            new { Name = "당원 모집 캠페인", Title = "함께 만들어요", Body = "{{name}}님의 소중한 참여로 더 나은 미래를 만들어갑시다." },
            new { Name = "지역 현안 설문", Title = "지역 현안 의견 수렴", Body = "{{name}}님의 의견이 정책에 반영됩니다. 설문에 참여해 주세요." },
            new { Name = "선거 홍보 메시지", Title = "선거 출마 인사", Body = "{{name}}님께 감사 인사를 전하며, 변함없는 지지를 부탁드립니다." }
        };

        foreach (var tenant in tenants)
        {
            var tenantUsers = users.Where(u => u.TenantId == tenant.Id).ToList();
            var owner = tenantUsers.FirstOrDefault(u => u.Role == "Owner");
            
            if (owner == null) continue;

            var campaignsPerTenant = random.Next(5, 12); // 5-11 campaigns per tenant

            for (int i = 0; i < campaignsPerTenant; i++)
            {
                var template = campaignTemplates[random.Next(campaignTemplates.Length)];
                var status = (CampaignStatus)random.Next(0, 8);
                var createdDaysAgo = random.Next(1, 90);
                var createdAt = DateTime.UtcNow.AddDays(-createdDaysAgo);

                var campaign = new Campaign
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Name = $"{template.Name} - {DateTime.UtcNow.AddDays(-createdDaysAgo).ToString("yyyy-MM")}",
                    MessageTitle = template.Title,
                    MessageBody = template.Body,
                    Variables = "{\"name\": \"수신자명\", \"date\": \"일정\"}",
                    Status = status,
                    CreatedBy = owner.Id,
                    CreatedAt = createdAt,
                    UpdatedAt = createdAt.AddDays(random.Next(0, Math.Min(7, createdDaysAgo))),
                    EstimatedRecipients = random.Next(100, 2000),
                    EstimatedCost = (decimal)(random.NextDouble() * 500 + 50),
                    QuotaUsed = status >= CampaignStatus.Sending ? random.Next(50, 1500) : 0,
                    SentCount = status >= CampaignStatus.Sending ? random.Next(50, 1500) : 0,
                    SuccessCount = status == CampaignStatus.Completed ? random.Next(40, 1400) : 0,
                    FailedCount = status >= CampaignStatus.Sending ? random.Next(0, 50) : 0
                };

                if (status >= CampaignStatus.Processing)
                {
                    campaign.StartedAt = createdAt.AddHours(random.Next(1, 48));
                }

                if (status == CampaignStatus.Completed || status == CampaignStatus.Failed)
                {
                    campaign.CompletedAt = campaign.StartedAt?.AddMinutes(random.Next(10, 120));
                }

                if (status == CampaignStatus.Queued && random.NextDouble() > 0.5)
                {
                    campaign.ScheduledAt = DateTime.UtcNow.AddHours(random.Next(1, 168)); // Next week
                }

                campaigns.Add(campaign);
            }
        }

        await _context.Campaigns.AddRangeAsync(campaigns);
        return campaigns;
    }



    private static string GetRandomColor()
    {
        var colors = new[] { "#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33", "#33F5FF", "#FF8C33", "#8C33FF", "#33FF8C", "#8CFF33" };
        var random = new Random();
        return colors[random.Next(colors.Length)];
    }

    private static string? GenerateRandomNotes(Random random)
    {
        if (random.NextDouble() > 0.4) return null; // 60% have no notes

        var notes = new[]
        {
            "지역 상권 회장 역임",
            "의료진 자원봉사 참여",
            "청년 정책에 높은 관심",
            "환경 보호에 적극적",
            "교육 정책 전문가",
            "소상공인 대표",
            "시민단체 활동가",
            "문화예술 후원자",
            "IT 업계 종사자",
            "농업 협동조합 임원"
        };

        return notes[random.Next(notes.Length)];
    }
}