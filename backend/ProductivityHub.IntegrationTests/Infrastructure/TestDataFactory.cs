using Bogus;
using ProductivityHub.Api.Data;

namespace ProductivityHub.IntegrationTests.Infrastructure;

public static class TestDataFactory
{
    private static readonly string[] KoreanFirstNames = 
    {
        "김민수", "이영희", "박철수", "최지영", "정민호", "한수진", "강동현", "조미영",
        "윤서준", "임지우", "신예은", "오준호", "장서연", "권민준", "황지민", "송다현"
    };

    private static readonly string[] KoreanLastNames = 
    {
        "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "신", "오", "권", "황", "송"
    };

    public static List<Contact> GenerateContacts(Guid tenantId, int count, int duplicatePercentage = 15)
    {
        var contacts = new List<Contact>();
        var faker = new Faker<Contact>()
            .RuleFor(c => c.Id, f => Guid.NewGuid())
            .RuleFor(c => c.TenantId, _ => tenantId)
            .RuleFor(c => c.FullName, f => GenerateKoreanName(f))
            .RuleFor(c => c.Phone, f => GenerateKoreanPhoneNumber(f))
            .RuleFor(c => c.Email, (f, c) => GenerateEmailFromName(f, c.FullName))
            .RuleFor(c => c.KakaoId, f => f.Random.Bool(0.7f) ? f.Internet.UserName() : null)
            .RuleFor(c => c.Notes, f => f.Random.Bool(0.3f) ? f.Lorem.Sentence() : null)
            .RuleFor(c => c.IsActive, f => f.Random.Bool(0.95f))
            .RuleFor(c => c.CreatedAt, f => f.Date.Between(DateTime.UtcNow.AddMonths(-12), DateTime.UtcNow))
            .RuleFor(c => c.UpdatedAt, (f, c) => c.CreatedAt.AddDays(f.Random.Int(0, 30)))
            .RuleFor(c => c.ContactTags, _ => new List<ContactTag>());

        // Generate base contacts
        var baseContacts = faker.Generate(count - (count * duplicatePercentage / 100));
        contacts.AddRange(baseContacts);

        // Generate duplicates based on existing contacts
        var duplicateCount = count * duplicatePercentage / 100;
        var duplicateFaker = new Faker();
        
        for (int i = 0; i < duplicateCount; i++)
        {
            var originalContact = duplicateFaker.PickRandom(baseContacts);
            var duplicate = new Contact
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                FullName = originalContact.FullName,
                IsActive = duplicateFaker.Random.Bool(0.9f),
                CreatedAt = duplicateFaker.Date.Between(originalContact.CreatedAt, DateTime.UtcNow),
                ContactTags = new List<ContactTag>()
            };

            // Create variations for duplicates
            var variation = duplicateFaker.Random.Int(1, 4);
            switch (variation)
            {
                case 1: // Same phone, different email
                    duplicate.Phone = originalContact.Phone;
                    duplicate.Email = GenerateEmailFromName(duplicateFaker, duplicate.Name + "2");
                    duplicate.KakaoId = duplicateFaker.Random.Bool(0.5f) ? duplicateFaker.Internet.UserName() : null;
                    break;
                case 2: // Same email, different phone
                    duplicate.Phone = GenerateKoreanPhoneNumber(duplicateFaker);
                    duplicate.Email = originalContact.Email;
                    duplicate.KakaoId = duplicateFaker.Random.Bool(0.5f) ? duplicateFaker.Internet.UserName() : null;
                    break;
                case 3: // Same KakaoId, different phone/email
                    duplicate.Phone = GenerateKoreanPhoneNumber(duplicateFaker);
                    duplicate.Email = GenerateEmailFromName(duplicateFaker, duplicate.Name + "3");
                    duplicate.KakaoId = originalContact.KakaoId;
                    break;
                case 4: // Exact duplicate with minor name variation
                    duplicate.Phone = originalContact.Phone;
                    duplicate.Email = originalContact.Email;
                    duplicate.KakaoId = originalContact.KakaoId;
                    duplicate.Name = originalContact.Name.Replace(" ", ""); // Remove space
                    break;
            }

            duplicate.UpdatedAt = duplicate.CreatedAt;
            contacts.Add(duplicate);
        }

        return contacts.OrderBy(c => Guid.NewGuid()).ToList(); // Randomize order
    }

    public static List<Tag> GenerateTagsForTenant(Guid tenantId, int count = 20)
    {
        var tagNames = new[]
        {
            "D-30", "D-7", "긴급", "VIP", "지지자", "반대", "중도", "유권자", "선거구민", "봉사자",
            "후원자", "언론인", "공무원", "교육자", "의료진", "자영업", "농업인", "청년", "노인", "여성"
        };

        var colorPalette = new[]
        {
            "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", 
            "#8B5CF6", "#EC4899", "#64748B", "#DC2626", "#059669", "#7C3AED"
        };

        var faker = new Faker<Tag>()
            .RuleFor(t => t.Id, f => Guid.NewGuid())
            .RuleFor(t => t.TenantId, _ => tenantId)
            .RuleFor(t => t.FullName, f => f.PickRandom(tagNames))
            .RuleFor(t => t.Color, f => f.PickRandom(colorPalette))
            .RuleFor(t => t.Description, f => f.Random.Bool(0.6f) ? f.Lorem.Sentence() : null)
            .RuleFor(t => t.CreatedAt, f => f.Date.Between(DateTime.UtcNow.AddMonths(-6), DateTime.UtcNow))
            .RuleFor(t => t.UpdatedAt, (f, t) => t.CreatedAt)
            .RuleFor(t => t.ContactTags, _ => new List<ContactTag>());

        return faker.Generate(Math.Min(count, tagNames.Length))
            .GroupBy(t => t.Name)
            .Select(g => g.First())
            .ToList();
    }

    public static List<ContactTag> AssignRandomTags(List<Contact> contacts, List<Tag> tags, double assignmentRate = 0.4)
    {
        var contactTags = new List<ContactTag>();
        var faker = new Faker();

        foreach (var contact in contacts)
        {
            if (faker.Random.Bool((float)assignmentRate))
            {
                var tagCount = faker.Random.Int(1, Math.Min(4, tags.Count));
                var selectedTags = faker.PickRandom(tags, tagCount).ToList();

                foreach (var tag in selectedTags)
                {
                    contactTags.Add(new ContactTag
                    {
                        ContactId = contact.Id,
                        TagId = tag.Id,
                        AssignedAt = faker.Date.Between(contact.CreatedAt, DateTime.UtcNow),
                        AssignedByUserId = Guid.NewGuid() // Placeholder user ID
                    });
                }
            }
        }

        return contactTags;
    }

    private static string GenerateKoreanName(Faker faker)
    {
        var lastName = faker.PickRandom(KoreanLastNames);
        var firstName = faker.PickRandom(KoreanFirstNames);
        return lastName + firstName.Substring(1); // Remove first character from first name to avoid repetition
    }

    private static string GenerateKoreanPhoneNumber(Faker faker)
    {
        var prefixes = new[] { "010", "011", "016", "017", "018", "019" };
        var prefix = faker.PickRandom(prefixes);
        var middle = faker.Random.Int(1000, 9999);
        var last = faker.Random.Int(1000, 9999);
        return $"{prefix}-{middle}-{last}";
    }

    private static string GenerateEmailFromName(Faker faker, string fullName)
    {
        // Romanize Korean name (simplified approach)
        var romanized = RomanizeKoreanName(fullName);
        var domains = new[] { "gmail.com", "naver.com", "kakao.com", "hanmail.net", "nate.com" };
        var domain = faker.PickRandom(domains);
        var suffix = faker.Random.Int(1, 999);
        
        return $"{romanized.ToLower()}{suffix}@{domain}";
    }

    private static string RomanizeKoreanName(string koreanName)
    {
        // Simplified romanization - in real implementation would use proper Korean romanization
        var romanizationMap = new Dictionary<string, string>
        {
            {"김", "kim"}, {"이", "lee"}, {"박", "park"}, {"최", "choi"}, {"정", "jung"},
            {"강", "kang"}, {"조", "cho"}, {"윤", "yoon"}, {"장", "jang"}, {"임", "im"},
            {"한", "han"}, {"신", "shin"}, {"오", "oh"}, {"권", "kwon"}, {"황", "hwang"},
            {"송", "song"}, {"민수", "minsu"}, {"영희", "younghee"}, {"철수", "cheolsu"},
            {"지영", "jiyoung"}, {"민호", "minho"}, {"수진", "sujin"}, {"동현", "donghyun"},
            {"미영", "miyoung"}, {"서준", "seojun"}, {"지우", "jiwoo"}, {"예은", "yeeun"},
            {"준호", "junho"}, {"서연", "seoyeon"}, {"민준", "minjun"}, {"지민", "jimin"},
            {"다현", "dahyun"}
        };

        var result = koreanName;
        foreach (var kvp in romanizationMap)
        {
            result = result.Replace(kvp.Key, kvp.Value);
        }

        return result;
    }
}