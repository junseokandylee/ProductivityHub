using ProductivityHub.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace ProductivityHub.Api.DTOs;

// Request DTOs
public record CreateCampaignScheduleRequest
{
    [Required]
    public Guid CampaignId { get; init; }

    [Required]
    public ScheduleType ScheduleType { get; init; }

    public DateTime? ScheduledAt { get; init; }

    [MaxLength(50)]
    public string Timezone { get; init; } = "UTC";

    // Recurring schedule properties
    public bool IsRecurring { get; init; } = false;
    public RecurrencePattern? RecurrencePattern { get; init; }
    public int RecurrenceInterval { get; init; } = 1;
    public int[]? RecurrenceDaysOfWeek { get; init; } // [0-6] for Sun-Sat
    public int? RecurrenceDayOfMonth { get; init; }
    public DateTime? RecurrenceEndDate { get; init; }
    public int? MaxOccurrences { get; init; }

    // Automation properties
    public AutomationTrigger? AutomationTrigger { get; init; }
    public Dictionary<string, object>? TriggerConditions { get; init; }
    public int TriggerDelayMinutes { get; init; } = 0;

    public int Priority { get; init; } = 5;
    public string? Notes { get; init; }
}

public record UpdateCampaignScheduleRequest
{
    public ScheduleType? ScheduleType { get; init; }
    public DateTime? ScheduledAt { get; init; }
    public string? Timezone { get; init; }

    // Recurring schedule properties
    public bool? IsRecurring { get; init; }
    public RecurrencePattern? RecurrencePattern { get; init; }
    public int? RecurrenceInterval { get; init; }
    public int[]? RecurrenceDaysOfWeek { get; init; }
    public int? RecurrenceDayOfMonth { get; init; }
    public DateTime? RecurrenceEndDate { get; init; }
    public int? MaxOccurrences { get; init; }

    // Automation properties
    public AutomationTrigger? AutomationTrigger { get; init; }
    public Dictionary<string, object>? TriggerConditions { get; init; }
    public int? TriggerDelayMinutes { get; init; }

    public bool? IsActive { get; init; }
    public int? Priority { get; init; }
    public string? Notes { get; init; }
}

// Response DTOs
public record CampaignScheduleResponse
{
    public Guid Id { get; init; }
    public Guid CampaignId { get; init; }
    public string CampaignName { get; init; } = string.Empty;
    public ScheduleType ScheduleType { get; init; }
    public DateTime? ScheduledAt { get; init; }
    public string Timezone { get; init; } = string.Empty;

    // Recurring schedule properties
    public bool IsRecurring { get; init; }
    public RecurrencePattern? RecurrencePattern { get; init; }
    public int RecurrenceInterval { get; init; }
    public int[]? RecurrenceDaysOfWeek { get; init; }
    public int? RecurrenceDayOfMonth { get; init; }
    public DateTime? RecurrenceEndDate { get; init; }
    public int? MaxOccurrences { get; init; }
    public int OccurrenceCount { get; init; }

    // Automation properties
    public AutomationTrigger? AutomationTrigger { get; init; }
    public Dictionary<string, object>? TriggerConditions { get; init; }
    public int TriggerDelayMinutes { get; init; }

    // Status properties
    public bool IsActive { get; init; }
    public DateTime? NextExecution { get; init; }
    public DateTime? LastExecution { get; init; }
    public int ExecutionCount { get; init; }
    public int Priority { get; init; }
    public string? Notes { get; init; }

    // Audit properties
    public DateTime CreatedAt { get; init; }
    public Guid CreatedBy { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public DateTime UpdatedAt { get; init; }
    public Guid? UpdatedBy { get; init; }
    public string? UpdatedByName { get; init; }

    // Related executions summary
    public int TotalExecutions { get; init; }
    public int CompletedExecutions { get; init; }
    public int FailedExecutions { get; init; }
    public DateTime? LastExecutionDate { get; init; }
    public ExecutionStatus? LastExecutionStatus { get; init; }
}

public record CampaignScheduleListResponse
{
    public List<CampaignScheduleResponse> Schedules { get; init; } = new();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public bool HasNextPage { get; init; }
}

public record CampaignScheduleExecutionResponse
{
    public Guid Id { get; init; }
    public Guid ScheduleId { get; init; }
    public Guid CampaignId { get; init; }
    public string CampaignName { get; init; } = string.Empty;
    public DateTime PlannedExecution { get; init; }
    public DateTime? ActualExecution { get; init; }
    public ExecutionStatus ExecutionStatus { get; init; }
    public string? ErrorMessage { get; init; }
    public int? ExecutionDurationMs { get; init; }
    public int RecipientsProcessed { get; init; }
    public int MessagesSent { get; init; }
    public int MessagesFailed { get; init; }
    public int RetryCount { get; init; }
    public int MaxRetries { get; init; }
    public DateTime? NextRetry { get; init; }
    public string? ExecutionNotes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

// Query DTOs
public record CampaignScheduleSearchRequest
{
    public string? Search { get; init; }
    public ScheduleType? ScheduleType { get; init; }
    public bool? IsActive { get; init; }
    public bool? IsRecurring { get; init; }
    public AutomationTrigger? AutomationTrigger { get; init; }
    public DateTime? NextExecutionFrom { get; init; }
    public DateTime? NextExecutionTo { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string SortBy { get; init; } = "NextExecution";
    public string SortOrder { get; init; } = "asc";
}

public record ScheduleUpcomingExecutionsRequest
{
    public DateTime FromDate { get; init; } = DateTime.UtcNow;
    public DateTime ToDate { get; init; } = DateTime.UtcNow.AddDays(7);
    public int? Limit { get; init; } = 50;
}

public record ScheduleUpcomingExecutionsResponse
{
    public List<UpcomingExecutionItem> Executions { get; init; } = new();
    public int TotalCount { get; init; }
}

public record UpcomingExecutionItem
{
    public Guid ScheduleId { get; init; }
    public Guid CampaignId { get; init; }
    public string CampaignName { get; init; } = string.Empty;
    public DateTime ScheduledExecution { get; init; }
    public ScheduleType ScheduleType { get; init; }
    public bool IsRecurring { get; init; }
    public string Timezone { get; init; } = string.Empty;
    public int Priority { get; init; }
}

// Campaign Template DTOs
public record CreateCampaignTemplateRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; init; }

    [MaxLength(100)]
    public string? MessageTitleTemplate { get; init; }

    [Required]
    [MaxLength(2000)]
    public string MessageBodyTemplate { get; init; } = string.Empty;

    public Dictionary<string, string>? TemplateVariables { get; init; }
    public string[]? DefaultChannels { get; init; }
    public int DefaultPriority { get; init; } = 5;
    public string? Category { get; init; }
    public string[]? Tags { get; init; }
    public bool IsPublic { get; init; } = false;
}

public record UpdateCampaignTemplateRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? MessageTitleTemplate { get; init; }
    public string? MessageBodyTemplate { get; init; }
    public Dictionary<string, string>? TemplateVariables { get; init; }
    public string[]? DefaultChannels { get; init; }
    public int? DefaultPriority { get; init; }
    public string? Category { get; init; }
    public string[]? Tags { get; init; }
    public bool? IsPublic { get; init; }
    public bool? IsActive { get; init; }
}

public record CampaignTemplateResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? MessageTitleTemplate { get; init; }
    public string MessageBodyTemplate { get; init; } = string.Empty;
    public Dictionary<string, string>? TemplateVariables { get; init; }
    public string[]? DefaultChannels { get; init; }
    public int DefaultPriority { get; init; }
    public string? Category { get; init; }
    public string[]? Tags { get; init; }
    public bool IsPublic { get; init; }
    public int UsageCount { get; init; }
    public DateTime? LastUsed { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public Guid CreatedBy { get; init; }
    public string CreatedByName { get; init; } = string.Empty;
    public DateTime UpdatedAt { get; init; }
    public Guid? UpdatedBy { get; init; }
    public string? UpdatedByName { get; init; }
}