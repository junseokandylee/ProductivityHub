using System.Diagnostics;
using System.Net.Http.Headers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.DTOs;
using ProductivityHub.IntegrationTests.Infrastructure;

namespace ProductivityHub.IntegrationTests;

public class ContactManagementIntegrationTests : IntegrationTestBase
{
    public ContactManagementIntegrationTests(IntegrationTestWebApplicationFactory factory) 
        : base(factory)
    {
    }

    [Fact]
    public async Task CompleteContactWorkflow_ShouldProcessSuccessfully()
    {
        // Cleanup any existing data
        await CleanupDbAsync();

        // Step 1: Create tags for testing
        var tagRequest = new CreateTagRequest
        {
            Name = "Test Tag",
            Color = "#FF0000",
            Description = "Test tag for integration testing"
        };

        var createdTag = await PostAsync<TagDto>("/api/tags", tagRequest);
        createdTag.Should().NotBeNull();
        createdTag.Name.Should().Be("Test Tag");

        // Step 2: Generate test data (smaller dataset for faster testing)
        var testContacts = TestDataFactory.GenerateContacts(TestTenantId, 1000, 15); // 1K contacts with 15% duplicates
        var testTags = TestDataFactory.GenerateTagsForTenant(TestTenantId, 5);
        
        // Add to database directly for testing
        await DbContext.Contacts.AddRangeAsync(testContacts);
        await DbContext.Tags.AddRangeAsync(testTags);
        await DbContext.SaveChangesAsync();

        // Step 3: Test search functionality with performance measurement
        var searchRequest = new ContactSearchRequest
        {
            Search = "김",
            Page = 1,
            Limit = 20,
            SortBy = "FullName",
            SortOrder = "asc"
        };

        var stopwatch = Stopwatch.StartNew();
        var searchResponse = await PostAsync<ContactSearchResponse>("/api/contacts/search", searchRequest);
        stopwatch.Stop();

        // Verify search results
        searchResponse.Should().NotBeNull();
        searchResponse.Contacts.Should().NotBeEmpty();
        searchResponse.Contacts.Should().HaveCountLessThanOrEqualTo(20);
        searchResponse.TotalCount.Should().BeGreaterThan(0);

        // Performance assertion - search should be under 150ms
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(150, 
            $"Search took {stopwatch.ElapsedMilliseconds}ms, expected < 150ms");

        // Step 4: Test contact detail retrieval
        var firstContact = searchResponse.Contacts.First();
        var contactDetail = await GetAsync<ContactDto>($"/api/contacts/{firstContact.Id}");
        
        contactDetail.Should().NotBeNull();
        contactDetail.Id.Should().Be(firstContact.Id);
        contactDetail.Name.Should().Be(firstContact.Name);

        // Step 5: Test contact editing
        var updateRequest = new UpdateContactRequest
        {
            FullName = contactDetail.Name + " Updated",
            Phone = contactDetail.Phone,
            Email = contactDetail.Email,
            KakaoId = contactDetail.KakaoId,
            Notes = "Updated via integration test",
            IsActive = true,
            TagIds = new List<Guid> { createdTag.Id }
        };

        var updatedContact = await PostAsync<ContactDto>($"/api/contacts/{contactDetail.Id}", updateRequest);
        updatedContact.Name.Should().EndWith(" Updated");
        updatedContact.Notes.Should().Be("Updated via integration test");
        updatedContact.Tags.Should().HaveCount(1);
        updatedContact.Tags.First().Id.Should().Be(createdTag.Id);

        // Step 6: Test bulk operations - create selection token
        var selectionTokenRequest = new CreateSelectionTokenRequest
        {
            SearchCriteria = new ContactSearchRequest
            {
                Search = "김",
                IsActive = true
            }
        };

        var selectionToken = await PostAsync<SelectionTokenDto>("/api/contacts/bulk/selection-token", selectionTokenRequest);
        selectionToken.Should().NotBeNull();
        selectionToken.Token.Should().NotBeEmpty();
        selectionToken.EstimatedCount.Should().BeGreaterThan(0);

        // Step 7: Test bulk tag operation
        var bulkTagRequest = new BulkTagActionRequest
        {
            SelectionToken = selectionToken.Token,
            TagId = createdTag.Id,
            Action = "add"
        };

        var bulkTagResponse = await PostAsync<BulkActionResponse>("/api/contacts/bulk/tag", bulkTagRequest);
        bulkTagResponse.Should().NotBeNull();
        bulkTagResponse.SuccessCount.Should().BeGreaterThan(0);
        bulkTagResponse.IsAsync.Should().BeFalse(); // Should be sync for small dataset

        // Step 8: Test deduplication detection
        var deduplicationResponse = await GetAsync<DeduplicationAnalysisResponse>("/api/contacts/deduplication/analysis");
        deduplicationResponse.Should().NotBeNull();
        deduplicationResponse.TotalDuplicates.Should().BeGreaterThan(0);
        deduplicationResponse.DuplicateGroups.Should().NotBeEmpty();

        // Step 9: Test export functionality
        var exportRequest = new ContactExportRequest
        {
            Format = "csv",
            SearchCriteria = new ContactSearchRequest { IsActive = true },
            IncludeColumns = new List<string> { "fullname", "phone", "email", "tags" }
        };

        var exportResponse = await PostAsync<ContactExportResponse>("/api/contacts/export", exportRequest);
        exportResponse.Should().NotBeNull();
        exportResponse.IsAsync.Should().BeFalse(); // Should be sync for small dataset
        exportResponse.DownloadUrl.Should().NotBeEmpty();

        // Verify we can download the export
        var downloadResponse = await Client.GetAsync(exportResponse.DownloadUrl);
        downloadResponse.IsSuccessStatusCode.Should().BeTrue();
        downloadResponse.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");

        // Step 10: Test contact history
        var historyRequest = new ContactHistorySearchRequest
        {
            ContactId = updatedContact.Id,
            Page = 1,
            Limit = 10
        };

        var historyResponse = await PostAsync<List<ContactHistoryDto>>("/api/contacts/history/search", historyRequest);
        historyResponse.Should().NotBeNull();
        historyResponse.Should().NotBeEmpty();
        
        // Should have history entries for the update and tag assignment
        historyResponse.Should().Contain(h => h.Type == "contact_updated");
    }

    [Fact]
    public async Task SearchPerformance_WithLargeDataset_ShouldMeetRequirements()
    {
        await CleanupDbAsync();

        // Generate larger dataset for performance testing
        var testContacts = TestDataFactory.GenerateContacts(TestTenantId, 5000, 20);
        
        // Batch insert for better performance
        const int batchSize = 1000;
        for (int i = 0; i < testContacts.Count; i += batchSize)
        {
            var batch = testContacts.Skip(i).Take(batchSize).ToList();
            await DbContext.Contacts.AddRangeAsync(batch);
            await DbContext.SaveChangesAsync();
        }

        // Test multiple search scenarios
        var searchScenarios = new[]
        {
            new ContactSearchRequest { Search = "김", Page = 1, Limit = 20 },
            new ContactSearchRequest { Search = "010", Page = 1, Limit = 20 },
            new ContactSearchRequest { IsActive = true, Page = 1, Limit = 50 },
            new ContactSearchRequest { SortBy = "FullName", SortOrder = "desc", Page = 2, Limit = 30 }
        };

        var measurements = new List<long>();

        foreach (var scenario in searchScenarios)
        {
            var stopwatch = Stopwatch.StartNew();
            var response = await PostAsync<ContactSearchResponse>("/api/contacts/search", scenario);
            stopwatch.Stop();

            measurements.Add(stopwatch.ElapsedMilliseconds);

            // Basic validation
            response.Should().NotBeNull();
            response.Contacts.Should().HaveCountLessThanOrEqualTo(scenario.Limit);
        }

        // Calculate percentiles
        var sortedMeasurements = measurements.OrderBy(x => x).ToList();
        var p95Index = (int)Math.Ceiling(0.95 * sortedMeasurements.Count) - 1;
        var p95Time = sortedMeasurements[p95Index];

        // Performance assertion - 95th percentile should be under 150ms
        p95Time.Should().BeLessThan(150, 
            $"95th percentile search time was {p95Time}ms, expected < 150ms. All measurements: [{string.Join(", ", measurements)}]");

        var averageTime = measurements.Average();
        averageTime.Should().BeLessThan(100, 
            $"Average search time was {averageTime:F1}ms, expected < 100ms");
    }

    [Fact]
    public async Task RLSTenantIsolation_ShouldPreventCrossTenanAccess()
    {
        await CleanupDbAsync();

        // Create contacts for test tenant
        var testContacts = TestDataFactory.GenerateContacts(TestTenantId, 10, 0);
        await DbContext.Contacts.AddRangeAsync(testContacts);

        // Create contacts for other tenant
        var otherContacts = TestDataFactory.GenerateContacts(OtherTenantId, 10, 0);
        await DbContext.Contacts.AddRangeAsync(otherContacts);

        await DbContext.SaveChangesAsync();

        // Test 1: Search as test tenant should only return test tenant contacts
        var searchRequest = new ContactSearchRequest { Page = 1, Limit = 50 };
        var testTenantResults = await PostAsync<ContactSearchResponse>("/api/contacts/search", searchRequest);
        
        testTenantResults.Contacts.Should().HaveCount(10);
        testTenantResults.Contacts.Should().OnlyContain(c => 
            testContacts.Any(tc => tc.Id == c.Id), "Should only return contacts from test tenant");

        // Test 2: Switch to other tenant authentication
        AuthenticateAsOtherTenant();
        
        var otherTenantResults = await PostAsync<ContactSearchResponse>("/api/contacts/search", searchRequest);
        otherTenantResults.Contacts.Should().HaveCount(10);
        otherTenantResults.Contacts.Should().OnlyContain(c => 
            otherContacts.Any(oc => oc.Id == c.Id), "Should only return contacts from other tenant");

        // Test 3: Try to access specific contact from different tenant (should fail)
        var testTenantContactId = testContacts.First().Id;
        
        var response = await Client.GetAsync($"/api/contacts/{testTenantContactId}");
        response.IsSuccessStatusCode.Should().BeFalse("Should not allow access to other tenant's contact");
    }

    [Fact]
    public async Task ContactImportFlow_ShouldHandleDuplicatesCorrectly()
    {
        await CleanupDbAsync();

        // Generate initial contacts
        var initialContacts = TestDataFactory.GenerateContacts(TestTenantId, 100, 0);
        await DbContext.Contacts.AddRangeAsync(initialContacts);
        await DbContext.SaveChangesAsync();

        // Generate new contacts with some duplicates
        var importContacts = TestDataFactory.GenerateContacts(TestTenantId, 50, 30);
        
        // Manually create some exact duplicates from existing contacts
        var existingContact = initialContacts.First();
        importContacts.Add(new Api.Data.Contact
        {
            Id = Guid.NewGuid(),
            TenantId = TestTenantId,
            FullName = existingContact.FullName,
            Phone = existingContact.Phone,
            Email = existingContact.Email,
            KakaoId = existingContact.KakaoId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ContactTags = new List<Api.Data.ContactTag>()
        });

        // Simulate import by adding to database
        await DbContext.Contacts.AddRangeAsync(importContacts);
        await DbContext.SaveChangesAsync();

        // Test deduplication analysis
        var analysisResponse = await GetAsync<DeduplicationAnalysisResponse>("/api/contacts/deduplication/analysis");
        analysisResponse.Should().NotBeNull();
        analysisResponse.TotalContacts.Should().Be(151); // 100 + 50 + 1 duplicate
        analysisResponse.TotalDuplicates.Should().BeGreaterThan(0);
        analysisResponse.DuplicateGroups.Should().NotBeEmpty();

        // Test merging duplicates
        var firstDuplicateGroup = analysisResponse.DuplicateGroups.First();
        if (firstDuplicateGroup.Contacts.Count >= 2)
        {
            var mergeRequest = new MergeContactsRequest
            {
                PrimaryContactId = firstDuplicateGroup.Contacts.First().Id,
                ContactIdsToMerge = firstDuplicateGroup.Contacts.Skip(1).Select(c => c.Id).ToList(),
                PreserveTags = true,
                PreserveHistory = true
            };

            var mergeResponse = await PostAsync<MergeContactsResponse>("/api/contacts/deduplication/merge", mergeRequest);
            mergeResponse.Should().NotBeNull();
            mergeResponse.Success.Should().BeTrue();

            // Verify merged contact still exists and others are soft-deleted
            var primaryContact = await DbContext.Contacts.FirstAsync(c => c.Id == mergeRequest.PrimaryContactId);
            primaryContact.Should().NotBeNull();
            primaryContact.DeletedAt.Should().BeNull();

            var mergedContacts = await DbContext.Contacts
                .Where(c => mergeRequest.ContactIdsToMerge.Contains(c.Id))
                .ToListAsync();
            mergedContacts.Should().OnlyContain(c => c.DeletedAt != null, "Merged contacts should be soft-deleted");
        }
    }

    public override async Task DisposeAsync()
    {
        await CleanupDbAsync();
        await base.DisposeAsync();
    }
}