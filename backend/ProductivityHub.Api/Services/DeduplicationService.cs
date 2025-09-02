using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Data;
using ProductivityHub.Api.DTOs;
using ProductivityHub.Api.Models;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ProductivityHub.Api.Services;

public interface IDeduplicationService
{
    /// <summary>
    /// Find duplicate contact clusters within a tenant
    /// </summary>
    Task<DeduplicationPreviewResponse> FindDuplicateClustersAsync(Guid tenantId, DeduplicationPreviewRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute merge operations for specified clusters
    /// </summary>
    Task<MergeContactsResponse> MergeContactsAsync(Guid tenantId, MergeContactsRequest request, Guid userId, string userName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get deduplication statistics for a tenant
    /// </summary>
    Task<DeduplicationStatsDto> GetDeduplicationStatsAsync(Guid tenantId, CancellationToken cancellationToken = default);
}

public class DeduplicationService : IDeduplicationService
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<DeduplicationService> _logger;

    public DeduplicationService(
        ApplicationDbContext context,
        IEncryptionService encryptionService,
        ILogger<DeduplicationService> logger)
    {
        _context = context;
        _encryptionService = encryptionService;
        _logger = logger;
    }

    public async Task<DeduplicationPreviewResponse> FindDuplicateClustersAsync(Guid tenantId, DeduplicationPreviewRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Finding duplicate clusters for tenant {TenantId} with min confidence {MinConfidence}", 
            tenantId, request.MinConfidenceScore);

        // Get contacts to analyze
        var contactsQuery = _context.Contacts
            .Where(c => c.TenantId == tenantId && c.IsActive);

        if (request.ContactIds.Count > 0)
        {
            contactsQuery = contactsQuery.Where(c => request.ContactIds.Contains(c.Id));
        }

        var contacts = await contactsQuery
            .Include(c => c.ContactTags)
            .ThenInclude(ct => ct.Tag)
            .ToListAsync(cancellationToken);

        if (contacts.Count == 0)
        {
            return new DeduplicationPreviewResponse
            {
                Clusters = new List<DuplicateClusterDto>(),
                TotalContacts = 0,
                TotalClusters = 0,
                ClustersWithConflicts = 0,
                EstimatedSpaceSavings = 0
            };
        }

        // Build duplicate clusters
        var clusters = await BuildDuplicateClustersAsync(contacts, request.MinConfidenceScore);

        // Apply filters and limits
        if (request.OnlyWithConflicts)
        {
            clusters = clusters.Where(c => c.ConflictCount > 0).ToList();
        }

        if (clusters.Count > request.MaxClusters)
        {
            clusters = clusters.Take(request.MaxClusters).ToList();
        }

        var totalContactsInClusters = clusters.Sum(c => c.Contacts.Count);
        var clustersWithConflicts = clusters.Count(c => c.ConflictCount > 0);
        var estimatedSpaceSavings = clusters.Sum(c => c.Contacts.Count - 1);

        return new DeduplicationPreviewResponse
        {
            Clusters = clusters,
            TotalContacts = totalContactsInClusters,
            TotalClusters = clusters.Count,
            ClustersWithConflicts = clustersWithConflicts,
            EstimatedSpaceSavings = estimatedSpaceSavings
        };
    }

    public async Task<MergeContactsResponse> MergeContactsAsync(Guid tenantId, MergeContactsRequest request, Guid userId, string userName, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Merging contacts for tenant {TenantId}: {ClusterCount} clusters, DryRun: {DryRun}", 
            tenantId, request.ClusterIds.Count, request.DryRun);

        var response = new MergeContactsResponse();

        try
        {
            // Find clusters to merge
            var previewRequest = new DeduplicationPreviewRequest
            {
                MinConfidenceScore = 0.0m, // Include all clusters
                MaxClusters = 1000
            };

            var preview = await FindDuplicateClustersAsync(tenantId, previewRequest, cancellationToken);
            var clustersToMerge = preview.Clusters.Where(c => request.ClusterIds.Contains(c.ClusterId)).ToList();

            if (clustersToMerge.Count == 0)
            {
                response.Errors.Add("No valid clusters found for the specified IDs");
                return response;
            }

            if (request.DryRun)
            {
                // Dry run - just simulate the merge
                response.Success = true;
                response.ClustersProcessed = clustersToMerge.Count;
                response.ContactsMerged = clustersToMerge.Sum(c => c.Contacts.Count - 1);
                response.SurvivorContacts = clustersToMerge.Count;
                
                foreach (var cluster in clustersToMerge)
                {
                    var survivor = DetermineSurvivor(cluster, request.MergeRules, request.ManualSurvivors);
                    response.MergeResults.Add(new MergeOperationResult
                    {
                        ClusterId = cluster.ClusterId,
                        SurvivorContactId = survivor.ContactId,
                        MergedContactIds = cluster.Contacts.Where(c => c.ContactId != survivor.ContactId).Select(c => c.ContactId).ToList(),
                        Success = true
                    });
                }

                return response;
            }

            // Execute actual merge operations
            using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                foreach (var cluster in clustersToMerge)
                {
                    var mergeResult = await ExecuteMergeOperationAsync(cluster, request.MergeRules, request.ManualSurvivors, userId, userName, cancellationToken);
                    response.MergeResults.Add(mergeResult);

                    if (mergeResult.Success)
                    {
                        response.ContactsMerged += mergeResult.MergedContactIds.Count;
                        response.SurvivorContacts++;
                    }
                }

                await transaction.CommitAsync(cancellationToken);
                response.Success = true;
                response.ClustersProcessed = clustersToMerge.Count;

                _logger.LogInformation("Successfully merged {ContactCount} contacts in {ClusterCount} clusters for tenant {TenantId}", 
                    response.ContactsMerged, response.ClustersProcessed, tenantId);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to merge contacts for tenant {TenantId}", tenantId);
            response.Success = false;
            response.Errors.Add($"Merge operation failed: {ex.Message}");
        }

        return response;
    }

    public async Task<DeduplicationStatsDto> GetDeduplicationStatsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var totalContacts = await _context.Contacts
            .CountAsync(c => c.TenantId == tenantId && c.IsActive, cancellationToken);

        if (totalContacts == 0)
        {
            return new DeduplicationStatsDto
            {
                TotalContacts = 0,
                DuplicateClusters = 0,
                ContactsInClusters = 0,
                PotentialSpaceSavings = 0,
                AverageConfidenceScore = 0
            };
        }

        var preview = await FindDuplicateClustersAsync(tenantId, new DeduplicationPreviewRequest
        {
            MinConfidenceScore = 0.1m,
            MaxClusters = 1000
        }, cancellationToken);

        var matchingBreakdown = new Dictionary<string, int>();
        foreach (var cluster in preview.Clusters)
        {
            foreach (var criteria in cluster.MatchingCriteria)
            {
                matchingBreakdown[criteria] = matchingBreakdown.GetValueOrDefault(criteria, 0) + 1;
            }
        }

        return new DeduplicationStatsDto
        {
            TotalContacts = totalContacts,
            DuplicateClusters = preview.TotalClusters,
            ContactsInClusters = preview.TotalContacts,
            PotentialSpaceSavings = preview.EstimatedSpaceSavings,
            AverageConfidenceScore = preview.Clusters.Count > 0 ? preview.Clusters.Average(c => c.ConfidenceScore) : 0,
            MatchingCriteriaBreakdown = matchingBreakdown
        };
    }

    private async Task<List<DuplicateClusterDto>> BuildDuplicateClustersAsync(List<Contact> contacts, decimal minConfidenceScore)
    {
        var clusters = new List<DuplicateClusterDto>();
        var processedContacts = new HashSet<Guid>();

        // Build hash lookup tables
        var phoneGroups = contacts
            .Where(c => c.PhoneHash != null && c.PhoneHash.Length > 0)
            .GroupBy(c => Convert.ToHexString(c.PhoneHash))
            .Where(g => g.Count() > 1)
            .ToDictionary(g => g.Key, g => g.ToList());

        var emailGroups = contacts
            .Where(c => c.EmailHash != null && c.EmailHash.Length > 0)
            .GroupBy(c => Convert.ToHexString(c.EmailHash))
            .Where(g => g.Count() > 1)
            .ToDictionary(g => g.Key, g => g.ToList());

        var kakaoGroups = contacts
            .Where(c => c.KakaoIdHash != null && c.KakaoIdHash.Length > 0)
            .GroupBy(c => Convert.ToHexString(c.KakaoIdHash))
            .Where(g => g.Count() > 1)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var contact in contacts)
        {
            if (processedContacts.Contains(contact.Id))
                continue;

            var clusterContacts = new List<Contact> { contact };
            var matchingCriteria = new List<string>();

            // Find matches by phone
            if (contact.PhoneHash != null && contact.PhoneHash.Length > 0)
            {
                var phoneKey = Convert.ToHexString(contact.PhoneHash);
                if (phoneGroups.ContainsKey(phoneKey))
                {
                    var phoneMatches = phoneGroups[phoneKey].Where(c => c.Id != contact.Id && !processedContacts.Contains(c.Id)).ToList();
                    clusterContacts.AddRange(phoneMatches);
                    if (phoneMatches.Count > 0) matchingCriteria.Add("Phone");
                }
            }

            // Find matches by email
            if (contact.EmailHash != null && contact.EmailHash.Length > 0)
            {
                var emailKey = Convert.ToHexString(contact.EmailHash);
                if (emailGroups.ContainsKey(emailKey))
                {
                    var emailMatches = emailGroups[emailKey].Where(c => !clusterContacts.Any(cc => cc.Id == c.Id) && !processedContacts.Contains(c.Id)).ToList();
                    clusterContacts.AddRange(emailMatches);
                    if (emailMatches.Count > 0) matchingCriteria.Add("Email");
                }
            }

            // Find matches by Kakao ID
            if (contact.KakaoIdHash != null && contact.KakaoIdHash.Length > 0)
            {
                var kakaoKey = Convert.ToHexString(contact.KakaoIdHash);
                if (kakaoGroups.ContainsKey(kakaoKey))
                {
                    var kakaoMatches = kakaoGroups[kakaoKey].Where(c => !clusterContacts.Any(cc => cc.Id == c.Id) && !processedContacts.Contains(c.Id)).ToList();
                    clusterContacts.AddRange(kakaoMatches);
                    if (kakaoMatches.Count > 0) matchingCriteria.Add("KakaoId");
                }
            }

            // Only create cluster if we have duplicates
            if (clusterContacts.Count > 1)
            {
                var confidenceScore = CalculateConfidenceScore(clusterContacts, matchingCriteria);
                
                if (confidenceScore >= minConfidenceScore)
                {
                    var duplicateContacts = await ConvertToDuplicateContactDtosAsync(clusterContacts);
                    var suggestedSurvivor = DetermineSurvivor(duplicateContacts);
                    var conflictCount = CountConflicts(duplicateContacts);

                    var cluster = new DuplicateClusterDto
                    {
                        ClusterId = GenerateClusterId(clusterContacts),
                        ConfidenceScore = confidenceScore,
                        Contacts = duplicateContacts,
                        SuggestedSurvivor = suggestedSurvivor,
                        MatchingCriteria = matchingCriteria,
                        ConflictCount = conflictCount
                    };

                    clusters.Add(cluster);
                }

                // Mark all contacts in this cluster as processed
                foreach (var c in clusterContacts)
                {
                    processedContacts.Add(c.Id);
                }
            }
        }

        // Sort clusters by confidence score (highest first)
        return clusters.OrderByDescending(c => c.ConfidenceScore).ToList();
    }

    private decimal CalculateConfidenceScore(List<Contact> contacts, List<string> matchingCriteria)
    {
        decimal score = 0;

        // Base score for multiple matches
        score += matchingCriteria.Count * 0.3m;

        // Bonus for exact matches
        if (matchingCriteria.Contains("Phone")) score += 0.4m;
        if (matchingCriteria.Contains("Email")) score += 0.3m;
        if (matchingCriteria.Contains("KakaoId")) score += 0.2m;

        // Penalty for large time gaps (reduces confidence)
        var dateRange = contacts.Max(c => c.UpdatedAt) - contacts.Min(c => c.UpdatedAt);
        if (dateRange.TotalDays > 365)
        {
            score *= 0.8m; // 20% penalty for old contacts
        }
        else if (dateRange.TotalDays > 30)
        {
            score *= 0.9m; // 10% penalty for month-old contacts
        }

        return Math.Min(1.0m, Math.Max(0.0m, score));
    }

    private async Task<List<DuplicateContactDto>> ConvertToDuplicateContactDtosAsync(List<Contact> contacts)
    {
        var result = new List<DuplicateContactDto>();

        foreach (var contact in contacts)
        {
            var tags = contact.ContactTags?.Select(ct => ct.Tag.Name).ToList() ?? new List<string>();
            
            // Decrypt PII fields
            var phone = contact.PhoneEncrypted != null ? await _encryptionService.DecryptAsync(contact.PhoneEncrypted) : null;
            var email = contact.EmailEncrypted != null ? await _encryptionService.DecryptAsync(contact.EmailEncrypted) : null;
            var kakaoId = contact.KakaoIdEncrypted != null ? await _encryptionService.DecryptAsync(contact.KakaoIdEncrypted) : null;

            var fieldCount = new[] { contact.FullName, phone, email, kakaoId, contact.Notes }.Count(f => !string.IsNullOrWhiteSpace(f));
            var completenessScore = Math.Min(1.0m, fieldCount / 5.0m);
            var recencyScore = CalculateRecencyScore(contact.UpdatedAt);

            result.Add(new DuplicateContactDto
            {
                ContactId = contact.Id,
                FullName = contact.FullName,
                Phone = phone,
                Email = email,
                KakaoId = kakaoId,
                Notes = contact.Notes,
                Tags = tags,
                CreatedAt = contact.CreatedAt,
                UpdatedAt = contact.UpdatedAt,
                IsActive = contact.IsActive,
                CompletenessScore = completenessScore,
                RecencyScore = recencyScore,
                FieldCount = fieldCount
            });
        }

        return result;
    }

    private decimal CalculateRecencyScore(DateTime updatedAt)
    {
        var daysSinceUpdate = (DateTime.UtcNow - updatedAt).TotalDays;
        
        if (daysSinceUpdate <= 7) return 1.0m;
        if (daysSinceUpdate <= 30) return 0.8m;
        if (daysSinceUpdate <= 90) return 0.6m;
        if (daysSinceUpdate <= 365) return 0.4m;
        
        return 0.2m;
    }

    private DuplicateContactDto DetermineSurvivor(List<DuplicateContactDto> contacts)
    {
        // Default logic: prefer most complete, then most recent
        return contacts
            .OrderByDescending(c => c.CompletenessScore)
            .ThenByDescending(c => c.RecencyScore)
            .ThenByDescending(c => c.UpdatedAt)
            .First();
    }

    private DuplicateContactDto DetermineSurvivor(DuplicateClusterDto cluster, MergeRulesDto mergeRules, Dictionary<string, Guid> manualSurvivors)
    {
        // Check for manual survivor selection
        if (manualSurvivors.TryGetValue(cluster.ClusterId, out var manualSurvivorId))
        {
            var manualSurvivor = cluster.Contacts.FirstOrDefault(c => c.ContactId == manualSurvivorId);
            if (manualSurvivor != null)
                return manualSurvivor;
        }

        // Apply merge strategy
        return mergeRules.Strategy switch
        {
            MergeStrategy.MostComplete => cluster.Contacts.OrderByDescending(c => c.CompletenessScore).ThenByDescending(c => c.RecencyScore).First(),
            MergeStrategy.MostRecent => cluster.Contacts.OrderByDescending(c => c.UpdatedAt).First(),
            MergeStrategy.Oldest => cluster.Contacts.OrderBy(c => c.CreatedAt).First(),
            _ => cluster.SuggestedSurvivor
        };
    }

    private int CountConflicts(List<DuplicateContactDto> contacts)
    {
        int conflicts = 0;

        // Count field conflicts (different non-null values)
        var names = contacts.Select(c => c.FullName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        if (names.Count > 1) conflicts++;

        var phones = contacts.Select(c => c.Phone).Where(p => !string.IsNullOrWhiteSpace(p)).Distinct().ToList();
        if (phones.Count > 1) conflicts++;

        var emails = contacts.Select(c => c.Email).Where(e => !string.IsNullOrWhiteSpace(e)).Distinct().ToList();
        if (emails.Count > 1) conflicts++;

        var kakaoIds = contacts.Select(c => c.KakaoId).Where(k => !string.IsNullOrWhiteSpace(k)).Distinct().ToList();
        if (kakaoIds.Count > 1) conflicts++;

        var notes = contacts.Select(c => c.Notes).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList();
        if (notes.Count > 1) conflicts++;

        return conflicts;
    }

    private string GenerateClusterId(List<Contact> contacts)
    {
        var contactIds = contacts.Select(c => c.Id.ToString()).OrderBy(id => id);
        var combined = string.Join("-", contactIds);
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));
        return Convert.ToHexString(hash)[..16].ToLowerInvariant();
    }

    private async Task<MergeOperationResult> ExecuteMergeOperationAsync(DuplicateClusterDto cluster, MergeRulesDto mergeRules, Dictionary<string, Guid> manualSurvivors, Guid userId, string userName, CancellationToken cancellationToken)
    {
        var result = new MergeOperationResult
        {
            ClusterId = cluster.ClusterId,
            SurvivorContactId = Guid.Empty,
            MergedContactIds = new List<Guid>()
        };

        try
        {
            var survivor = DetermineSurvivor(cluster, mergeRules, manualSurvivors);
            var duplicates = cluster.Contacts.Where(c => c.ContactId != survivor.ContactId).ToList();

            result.SurvivorContactId = survivor.ContactId;
            result.MergedContactIds = duplicates.Select(d => d.ContactId).ToList();

            // Load survivor contact from database
            var survivorContact = await _context.Contacts
                .Include(c => c.ContactTags)
                .FirstAsync(c => c.Id == survivor.ContactId, cancellationToken);

            // Merge data from duplicates
            foreach (var duplicate in duplicates)
            {
                var duplicateContact = await _context.Contacts
                    .Include(c => c.ContactTags)
                    .FirstAsync(c => c.Id == duplicate.ContactId, cancellationToken);

                // Merge fields based on rules
                await MergeContactFields(survivorContact, duplicateContact, mergeRules);

                // Update foreign key references
                await UpdateForeignKeyReferences(duplicate.ContactId, survivor.ContactId, cancellationToken);

                // Soft delete the duplicate
                duplicateContact.IsActive = false;
                duplicateContact.UpdatedAt = DateTime.UtcNow;

                // Log the merge operation
                var historyEntry = new ContactHistory
                {
                    ContactId = survivor.ContactId,
                    TenantId = survivorContact.TenantId,
                    Type = "contact_merge",
                    Payload = JsonSerializer.Serialize(new { 
                        Description = $"Contact merged from duplicate {duplicate.ContactId}",
                        DuplicateId = duplicate.ContactId,
                        SurvivorId = survivor.ContactId 
                    }),
                    UserId = userId,
                    UserName = userName,
                    OccurredAt = DateTime.UtcNow
                };

                _context.ContactHistory.Add(historyEntry);
                result.HistoryRecordsUpdated++;
            }

            // Update survivor contact
            survivorContact.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            result.Success = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to merge cluster {ClusterId}", cluster.ClusterId);
            result.Success = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private async Task MergeContactFields(Contact survivor, Contact duplicate, MergeRulesDto mergeRules)
    {
        // Merge notes if requested
        if (mergeRules.CombineNotes && !string.IsNullOrEmpty(duplicate.Notes))
        {
            if (string.IsNullOrEmpty(survivor.Notes))
            {
                survivor.Notes = duplicate.Notes;
            }
            else if (!survivor.Notes.Contains(duplicate.Notes))
            {
                survivor.Notes = $"{survivor.Notes}\n\n--- Merged from duplicate contact ---\n{duplicate.Notes}";
            }
        }

        // Merge tags if requested
        if (mergeRules.PreserveAllTags && duplicate.ContactTags?.Count > 0)
        {
            var survivorTagIds = survivor.ContactTags?.Select(ct => ct.TagId).ToHashSet() ?? new HashSet<Guid>();
            
            foreach (var duplicateTag in duplicate.ContactTags)
            {
                if (!survivorTagIds.Contains(duplicateTag.TagId))
                {
                    survivor.ContactTags.Add(new ContactTag
                    {
                        ContactId = survivor.Id,
                        TagId = duplicateTag.TagId,
                        TenantId = survivor.TenantId,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }
    }

    private async Task UpdateForeignKeyReferences(Guid duplicateContactId, Guid survivorContactId, CancellationToken cancellationToken)
    {
        // Update contact tags
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE contact_tags SET contact_id = {survivorContactId} WHERE contact_id = {duplicateContactId}",
            cancellationToken);

        // Update contact history
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE contact_history SET contact_id = {survivorContactId} WHERE contact_id = {duplicateContactId}",
            cancellationToken);

        // Update campaign contacts
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE campaign_contacts SET contact_id = {survivorContactId} WHERE contact_id = {duplicateContactId}",
            cancellationToken);
    }
}