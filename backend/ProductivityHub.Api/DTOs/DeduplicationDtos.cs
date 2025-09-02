using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

/// <summary>
/// Represents a duplicate contact cluster with confidence scoring
/// </summary>
public class DuplicateClusterDto
{
    /// <summary>
    /// Unique cluster identifier
    /// </summary>
    public required string ClusterId { get; set; }

    /// <summary>
    /// Confidence score for this cluster (0.0 - 1.0)
    /// </summary>
    public decimal ConfidenceScore { get; set; }

    /// <summary>
    /// Contacts in this duplicate cluster
    /// </summary>
    public required List<DuplicateContactDto> Contacts { get; set; }

    /// <summary>
    /// Suggested survivor contact (highest score)
    /// </summary>
    public required DuplicateContactDto SuggestedSurvivor { get; set; }

    /// <summary>
    /// Matching criteria that created this cluster
    /// </summary>
    public required List<string> MatchingCriteria { get; set; }

    /// <summary>
    /// Total number of conflicts that need resolution
    /// </summary>
    public int ConflictCount { get; set; }
}

/// <summary>
/// Contact information with deduplication metadata
/// </summary>
public class DuplicateContactDto
{
    /// <summary>
    /// Contact identifier
    /// </summary>
    public required Guid ContactId { get; set; }

    /// <summary>
    /// Contact's full name
    /// </summary>
    public required string FullName { get; set; }

    /// <summary>
    /// Phone number (decrypted)
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Email address (decrypted)
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Kakao ID (decrypted)
    /// </summary>
    public string? KakaoId { get; set; }

    /// <summary>
    /// Notes or additional information
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Contact tags
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Contact creation date
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Contact last update date
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Whether this contact is active
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Completeness score (0.0 - 1.0)
    /// </summary>
    public decimal CompletenessScore { get; set; }

    /// <summary>
    /// Recency score (0.0 - 1.0)
    /// </summary>
    public decimal RecencyScore { get; set; }

    /// <summary>
    /// Total number of non-null fields
    /// </summary>
    public int FieldCount { get; set; }
}

/// <summary>
/// Request for previewing duplicate clusters
/// </summary>
public class DeduplicationPreviewRequest
{
    /// <summary>
    /// Minimum confidence score to include clusters (0.0 - 1.0)
    /// </summary>
    [Range(0.0, 1.0)]
    public decimal MinConfidenceScore { get; set; } = 0.5m;

    /// <summary>
    /// Maximum number of clusters to return
    /// </summary>
    [Range(1, 1000)]
    public int MaxClusters { get; set; } = 100;

    /// <summary>
    /// Include only clusters with conflicts
    /// </summary>
    public bool OnlyWithConflicts { get; set; } = false;

    /// <summary>
    /// Specific contact IDs to check for duplicates
    /// </summary>
    public List<Guid> ContactIds { get; set; } = new();
}

/// <summary>
/// Response containing duplicate clusters
/// </summary>
public class DeduplicationPreviewResponse
{
    /// <summary>
    /// Found duplicate clusters
    /// </summary>
    public required List<DuplicateClusterDto> Clusters { get; set; }

    /// <summary>
    /// Total number of contacts affected
    /// </summary>
    public int TotalContacts { get; set; }

    /// <summary>
    /// Total number of clusters found
    /// </summary>
    public int TotalClusters { get; set; }

    /// <summary>
    /// Number of clusters with conflicts
    /// </summary>
    public int ClustersWithConflicts { get; set; }

    /// <summary>
    /// Estimated space savings after merge
    /// </summary>
    public int EstimatedSpaceSavings { get; set; }
}

/// <summary>
/// Configuration for merge rules
/// </summary>
public class MergeRulesDto
{
    /// <summary>
    /// Strategy for handling conflicts
    /// </summary>
    public MergeStrategy Strategy { get; set; } = MergeStrategy.MostComplete;

    /// <summary>
    /// Whether to prefer verified contacts
    /// </summary>
    public bool PreferVerified { get; set; } = true;

    /// <summary>
    /// Whether to prefer more recent contacts
    /// </summary>
    public bool PreferRecent { get; set; } = true;

    /// <summary>
    /// Field-specific merge rules
    /// </summary>
    public Dictionary<string, FieldMergeRule> FieldRules { get; set; } = new();

    /// <summary>
    /// Whether to preserve all tags from duplicates
    /// </summary>
    public bool PreserveAllTags { get; set; } = true;

    /// <summary>
    /// Whether to combine notes from all duplicates
    /// </summary>
    public bool CombineNotes { get; set; } = true;
}

/// <summary>
/// Merge strategies for conflict resolution
/// </summary>
public enum MergeStrategy
{
    /// <summary>
    /// Keep the contact with most non-null fields
    /// </summary>
    MostComplete,

    /// <summary>
    /// Keep the most recently updated contact
    /// </summary>
    MostRecent,

    /// <summary>
    /// Keep the contact created first
    /// </summary>
    Oldest,

    /// <summary>
    /// Manual conflict resolution required
    /// </summary>
    Manual
}

/// <summary>
/// Field-specific merge rules
/// </summary>
public enum FieldMergeRule
{
    /// <summary>
    /// Keep the survivor's value
    /// </summary>
    KeepSurvivor,

    /// <summary>
    /// Keep the most recent value
    /// </summary>
    KeepRecent,

    /// <summary>
    /// Keep the longest value
    /// </summary>
    KeepLongest,

    /// <summary>
    /// Combine all values
    /// </summary>
    Combine,

    /// <summary>
    /// Manual resolution required
    /// </summary>
    Manual
}

/// <summary>
/// Request for executing merges
/// </summary>
public class MergeContactsRequest
{
    /// <summary>
    /// Cluster IDs to merge
    /// </summary>
    public required List<string> ClusterIds { get; set; }

    /// <summary>
    /// Merge rules configuration
    /// </summary>
    public MergeRulesDto MergeRules { get; set; } = new();

    /// <summary>
    /// Whether this is a dry run (preview only)
    /// </summary>
    public bool DryRun { get; set; } = false;

    /// <summary>
    /// Manual survivor selections (ClusterId -> ContactId)
    /// </summary>
    public Dictionary<string, Guid> ManualSurvivors { get; set; } = new();

    /// <summary>
    /// Manual field resolutions (ClusterId.FieldName -> Value)
    /// </summary>
    public Dictionary<string, string> ManualFieldResolutions { get; set; } = new();
}

/// <summary>
/// Result of merge operation
/// </summary>
public class MergeContactsResponse
{
    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Number of clusters processed
    /// </summary>
    public int ClustersProcessed { get; set; }

    /// <summary>
    /// Number of contacts merged (removed)
    /// </summary>
    public int ContactsMerged { get; set; }

    /// <summary>
    /// Number of survivor contacts (kept)
    /// </summary>
    public int SurvivorContacts { get; set; }

    /// <summary>
    /// Details of each merge operation
    /// </summary>
    public List<MergeOperationResult> MergeResults { get; set; } = new();

    /// <summary>
    /// Any errors that occurred during merge
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Validation warnings
    /// </summary>
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// Result of a single merge operation
/// </summary>
public class MergeOperationResult
{
    /// <summary>
    /// Cluster ID that was processed
    /// </summary>
    public required string ClusterId { get; set; }

    /// <summary>
    /// Survivor contact ID
    /// </summary>
    public required Guid SurvivorContactId { get; set; }

    /// <summary>
    /// IDs of merged (removed) contacts
    /// </summary>
    public required List<Guid> MergedContactIds { get; set; }

    /// <summary>
    /// Fields that were merged
    /// </summary>
    public Dictionary<string, string> MergedFields { get; set; } = new();

    /// <summary>
    /// Number of tags merged
    /// </summary>
    public int TagsMerged { get; set; }

    /// <summary>
    /// Number of history records updated
    /// </summary>
    public int HistoryRecordsUpdated { get; set; }

    /// <summary>
    /// Whether the operation was successful
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Any errors specific to this merge
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Statistics about deduplication results
/// </summary>
public class DeduplicationStatsDto
{
    /// <summary>
    /// Total number of contacts analyzed
    /// </summary>
    public int TotalContacts { get; set; }

    /// <summary>
    /// Number of duplicate clusters found
    /// </summary>
    public int DuplicateClusters { get; set; }

    /// <summary>
    /// Total contacts in duplicate clusters
    /// </summary>
    public int ContactsInClusters { get; set; }

    /// <summary>
    /// Potential space savings (contacts that could be removed)
    /// </summary>
    public int PotentialSpaceSavings { get; set; }

    /// <summary>
    /// Average confidence score across all clusters
    /// </summary>
    public decimal AverageConfidenceScore { get; set; }

    /// <summary>
    /// Breakdown by matching criteria
    /// </summary>
    public Dictionary<string, int> MatchingCriteriaBreakdown { get; set; } = new();

    /// <summary>
    /// When the analysis was performed
    /// </summary>
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}