using Microsoft.EntityFrameworkCore;
using ProductivityHub.Api.Models;
using System.Text.Json;

namespace ProductivityHub.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Contact> Contacts { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<ContactTag> ContactTags { get; set; }
    public DbSet<ContactHistory> ContactHistory { get; set; }
    public DbSet<ContactGroup> ContactGroups { get; set; }
    public DbSet<ContactGroupMember> ContactGroupMembers { get; set; }
    public DbSet<ContactSegment> ContactSegments { get; set; }
    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<CampaignChannel> CampaignChannels { get; set; }
    public DbSet<CampaignAudience> CampaignAudiences { get; set; }
    public DbSet<CampaignContact> CampaignContacts { get; set; }
    public DbSet<MessageHistory> MessageHistories { get; set; }
    public DbSet<CampaignMetrics> CampaignMetrics { get; set; }
    public DbSet<CampaignMetricsMinute> CampaignMetricsMinutes { get; set; }
    public DbSet<AlertPolicy> AlertPolicies { get; set; }
    public DbSet<AlertState> AlertStates { get; set; }
    public DbSet<ImportJob> ImportJobs { get; set; }
    public DbSet<ImportError> ImportErrors { get; set; }
    public DbSet<StagingContact> StagingContacts { get; set; }
    
    // Segment builder tables
    public DbSet<Segment> Segments { get; set; }
    public DbSet<SegmentUsageAudit> SegmentUsageAudits { get; set; }
    
    // Analytics tables for granular event tracking
    public DbSet<CampaignEvent> CampaignEvents { get; set; }
    public DbSet<CampaignVariant> CampaignVariants { get; set; }
    public DbSet<LinkClick> LinkClicks { get; set; }
    
    // Campaign scheduling and automation tables
    public DbSet<CampaignSchedule> CampaignSchedules { get; set; }
    public DbSet<CampaignScheduleExecution> CampaignScheduleExecutions { get; set; }
    public DbSet<CampaignTemplate> CampaignTemplates { get; set; }
    
    // Settings and configuration tables
    public DbSet<OrganizationSettings> OrganizationSettings { get; set; }
    public DbSet<ChannelConfiguration> ChannelConfigurations { get; set; }
    public DbSet<QuotaConfiguration> QuotaConfigurations { get; set; }
    public DbSet<QuotaUsage> QuotaUsages { get; set; }
    public DbSet<SecuritySettings> SecuritySettings { get; set; }
    public DbSet<ApiToken> ApiTokens { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<UserInvitation> UserInvitations { get; set; }
    
    // Email system tables
    public DbSet<EmailTemplate> EmailTemplates { get; set; }
    public DbSet<EmailSubscription> EmailSubscriptions { get; set; }
    public DbSet<EmailSubscriptionList> EmailSubscriptionLists { get; set; }
    public DbSet<EmailSubscriptionListMember> EmailSubscriptionListMembers { get; set; }
    public DbSet<EmailEvent> EmailEvents { get; set; }

    // Korean personalization system tables
    public DbSet<MessagePersonalization> MessagePersonalizations { get; set; }
    public DbSet<PersonalizationEffectiveness> PersonalizationEffectiveness { get; set; }
    public DbSet<VoterDemographics> VoterDemographics { get; set; }
    public DbSet<KoreanLanguageContext> KoreanLanguageContexts { get; set; }

    // Korean Language Processing System tables
    public DbSet<KoreanDialectProfile> KoreanDialectProfiles { get; set; }
    public DbSet<HonorificContext> HonorificContexts { get; set; }
    public DbSet<PoliticalTerminology> PoliticalTerminologies { get; set; }
    public DbSet<CulturalSensitivityRule> CulturalSensitivityRules { get; set; }
    public DbSet<LanguagePersonalizationResult> LanguagePersonalizationResults { get; set; }
    public DbSet<KoreanMorphologicalAnalysis> KoreanMorphologicalAnalyses { get; set; }
    public DbSet<GenerationalPreferences> GenerationalPreferences { get; set; }

    // Korean Election Law Compliance tables
    public DbSet<ComplianceRule> ComplianceRules { get; set; }
    public DbSet<ComplianceViolation> ComplianceViolations { get; set; }
    public DbSet<ComplianceViolationLog> ComplianceViolationLogs { get; set; }
    public DbSet<SpendingLimit> SpendingLimits { get; set; }
    public DbSet<SpendingTransaction> SpendingTransactions { get; set; }
    public DbSet<SpendingAlert> SpendingAlerts { get; set; }
    public DbSet<DataPrivacyConsent> DataPrivacyConsents { get; set; }
    public DbSet<DataProcessingActivity> DataProcessingActivities { get; set; }
    public DbSet<DataPrivacyRequest> DataPrivacyRequests { get; set; }
    public DbSet<KoreanPoliticalTerm> KoreanPoliticalTerms { get; set; }
    public DbSet<PoliticalTermUsage> PoliticalTermUsages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure indexes for performance
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.TenantId);

        // Contact indexes for the new encrypted structure
        modelBuilder.Entity<Contact>()
            .HasIndex(c => c.TenantId);

        // Optimized covering index for contact list queries with UpdatedAt ordering
        modelBuilder.Entity<Contact>()
            .HasIndex(c => new { c.TenantId, c.UpdatedAt, c.Id })
            .HasDatabaseName("IX_Contacts_List_Cover")
            .IncludeProperties(c => new { c.FullName, c.IsActive });

        // Alternative covering index for CreatedAt ordering
        modelBuilder.Entity<Contact>()
            .HasIndex(c => new { c.TenantId, c.CreatedAt, c.Id })
            .HasDatabaseName("IX_Contacts_TenantId_CreatedAt_Id")
            .IncludeProperties(c => new { c.FullName, c.UpdatedAt });

        // GIN index for full-text search on FullName (created via raw SQL in migration)
        // This will be created in migration: CREATE INDEX IF NOT EXISTS ix_contacts_fullname_gin ON contacts USING gin(to_tsvector('simple', full_name));
        
        // Hash-based lookup indexes for deduplication and search
        modelBuilder.Entity<Contact>()
            .HasIndex(c => new { c.TenantId, c.PhoneHash })
            .HasDatabaseName("IX_Contacts_TenantId_PhoneHash");

        modelBuilder.Entity<Contact>()
            .HasIndex(c => new { c.TenantId, c.EmailHash })
            .HasDatabaseName("IX_Contacts_TenantId_EmailHash");

        modelBuilder.Entity<Contact>()
            .HasIndex(c => new { c.TenantId, c.KakaoIdHash })
            .HasDatabaseName("IX_Contacts_TenantId_KakaoIdHash");

        // Active contacts filtering index
        modelBuilder.Entity<Contact>()
            .HasIndex(c => new { c.TenantId, c.IsActive, c.UpdatedAt })
            .HasDatabaseName("IX_Contacts_TenantId_Active_Updated");

        // Tag indexes
        modelBuilder.Entity<Tag>()
            .HasIndex(t => t.TenantId);

        modelBuilder.Entity<Tag>()
            .HasIndex(t => new { t.TenantId, t.Name })
            .IsUnique()
            .HasDatabaseName("IX_Tags_TenantId_Name");

        // ContactTag indexes
        modelBuilder.Entity<ContactTag>()
            .HasKey(ct => new { ct.ContactId, ct.TagId });

        modelBuilder.Entity<ContactTag>()
            .HasIndex(ct => ct.TenantId);

        modelBuilder.Entity<ContactTag>()
            .HasIndex(ct => ct.ContactId);

        modelBuilder.Entity<ContactTag>()
            .HasIndex(ct => ct.TagId);

        // ContactHistory indexes
        modelBuilder.Entity<ContactHistory>()
            .HasIndex(ch => ch.TenantId);

        modelBuilder.Entity<ContactHistory>()
            .HasIndex(ch => ch.ContactId);

        modelBuilder.Entity<ContactHistory>()
            .HasIndex(ch => new { ch.ContactId, ch.OccurredAt })
            .HasDatabaseName("IX_ContactHistory_ContactId_OccurredAt");

        modelBuilder.Entity<ContactGroup>()
            .HasIndex(cg => cg.TenantId);

        modelBuilder.Entity<ContactGroup>()
            .HasIndex(cg => new { cg.TenantId, cg.Name })
            .IsUnique()
            .HasDatabaseName("IX_ContactGroups_TenantId_Name");

        modelBuilder.Entity<ContactGroupMember>()
            .HasIndex(cgm => cgm.GroupId);

        modelBuilder.Entity<ContactGroupMember>()
            .HasIndex(cgm => cgm.ContactId);

        modelBuilder.Entity<ContactGroupMember>()
            .HasIndex(cgm => new { cgm.GroupId, cgm.ContactId })
            .IsUnique()
            .HasDatabaseName("IX_ContactGroupMembers_GroupId_ContactId");

        modelBuilder.Entity<ContactSegment>()
            .HasIndex(cs => cs.TenantId);

        modelBuilder.Entity<ContactSegment>()
            .HasIndex(cs => new { cs.TenantId, cs.Name })
            .IsUnique()
            .HasDatabaseName("IX_ContactSegments_TenantId_Name");

        modelBuilder.Entity<Campaign>()
            .HasIndex(c => c.TenantId);

        modelBuilder.Entity<Campaign>()
            .HasIndex(c => c.Status);

        modelBuilder.Entity<CampaignChannel>()
            .HasIndex(cc => cc.CampaignId);

        modelBuilder.Entity<CampaignChannel>()
            .HasIndex(cc => new { cc.CampaignId, cc.OrderIndex })
            .IsUnique()
            .HasDatabaseName("IX_CampaignChannels_CampaignId_OrderIndex");

        modelBuilder.Entity<CampaignAudience>()
            .HasIndex(ca => ca.CampaignId)
            .IsUnique();

        modelBuilder.Entity<CampaignContact>()
            .HasIndex(cc => cc.CampaignId);

        modelBuilder.Entity<CampaignContact>()
            .HasIndex(cc => cc.ContactId);

        modelBuilder.Entity<CampaignContact>()
            .HasIndex(cc => new { cc.CampaignId, cc.ContactId })
            .IsUnique()
            .HasDatabaseName("IX_CampaignContacts_CampaignId_ContactId");

        modelBuilder.Entity<MessageHistory>()
            .HasIndex(mh => mh.CampaignId);

        modelBuilder.Entity<MessageHistory>()
            .HasIndex(mh => mh.ContactId);

        modelBuilder.Entity<MessageHistory>()
            .HasIndex(mh => mh.Status);

        modelBuilder.Entity<MessageHistory>()
            .HasIndex(mh => mh.Channel);

        // Campaign metrics indexes
        modelBuilder.Entity<CampaignMetrics>()
            .HasIndex(cm => cm.TenantId);

        modelBuilder.Entity<CampaignMetrics>()
            .HasIndex(cm => cm.UpdatedAt);

        modelBuilder.Entity<CampaignMetricsMinute>()
            .HasIndex(cmm => cmm.TenantId);

        modelBuilder.Entity<CampaignMetricsMinute>()
            .HasIndex(cmm => cmm.BucketMinute);

        modelBuilder.Entity<CampaignMetricsMinute>()
            .HasIndex(cmm => new { cmm.CampaignId, cmm.BucketMinute })
            .HasDatabaseName("IX_CampaignMetricsMinute_CampaignId_BucketMinute");

        // Alert policy indexes
        modelBuilder.Entity<AlertPolicy>()
            .HasIndex(ap => ap.TenantId);

        modelBuilder.Entity<AlertPolicy>()
            .HasIndex(ap => new { ap.TenantId, ap.CampaignId })
            .IsUnique()
            .HasDatabaseName("IX_AlertPolicy_TenantId_CampaignId");

        // Alert state indexes
        modelBuilder.Entity<AlertState>()
            .HasIndex(state => state.TenantId);

        modelBuilder.Entity<AlertState>()
            .HasIndex(state => state.CampaignId);

        modelBuilder.Entity<AlertState>()
            .HasIndex(state => new { state.TenantId, state.CampaignId })
            .IsUnique()
            .HasDatabaseName("IX_AlertState_TenantId_CampaignId");

        modelBuilder.Entity<AlertState>()
            .HasIndex(state => new { state.Triggered, state.LastEvaluatedAt })
            .HasDatabaseName("IX_AlertState_Triggered_LastEvaluated");

        // Import job indexes
        modelBuilder.Entity<ImportJob>()
            .HasIndex(ij => ij.TenantId);

        modelBuilder.Entity<ImportJob>()
            .HasIndex(ij => ij.Status);

        modelBuilder.Entity<ImportJob>()
            .HasIndex(ij => ij.CreatedAt);

        modelBuilder.Entity<ImportJob>()
            .HasIndex(ij => new { ij.TenantId, ij.Status })
            .HasDatabaseName("IX_ImportJobs_TenantId_Status");

        // Import error indexes
        modelBuilder.Entity<ImportError>()
            .HasIndex(ie => ie.ImportJobId);

        modelBuilder.Entity<ImportError>()
            .HasIndex(ie => ie.ErrorType);

        modelBuilder.Entity<ImportError>()
            .HasIndex(ie => new { ie.ImportJobId, ie.RowNumber })
            .HasDatabaseName("IX_ImportErrors_JobId_RowNumber");

        // Staging contact indexes
        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => sc.ImportJobId);

        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => sc.TenantId);

        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => sc.ValidationStatus);

        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => new { sc.TenantId, sc.PhoneHash })
            .HasDatabaseName("IX_StagingContacts_TenantId_PhoneHash");

        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => new { sc.TenantId, sc.EmailHash })
            .HasDatabaseName("IX_StagingContacts_TenantId_EmailHash");

        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => new { sc.TenantId, sc.KakaoIdHash })
            .HasDatabaseName("IX_StagingContacts_TenantId_KakaoIdHash");

        modelBuilder.Entity<StagingContact>()
            .HasIndex(sc => new { sc.ImportJobId, sc.IsProcessed })
            .HasDatabaseName("IX_StagingContacts_JobId_IsProcessed");

        // Segment indexes
        modelBuilder.Entity<Segment>()
            .HasIndex(s => s.TenantId);

        modelBuilder.Entity<Segment>()
            .HasIndex(s => new { s.TenantId, s.Name })
            .IsUnique()
            .HasDatabaseName("IX_Segments_TenantId_Name");

        modelBuilder.Entity<Segment>()
            .HasIndex(s => new { s.TenantId, s.IsActive, s.UpdatedAt })
            .HasDatabaseName("IX_Segments_TenantId_Active_Updated");

        modelBuilder.Entity<Segment>()
            .HasIndex(s => s.CreatedBy)
            .HasDatabaseName("IX_Segments_CreatedBy");

        // Segment usage audit indexes
        modelBuilder.Entity<SegmentUsageAudit>()
            .HasIndex(sua => sua.TenantId);

        modelBuilder.Entity<SegmentUsageAudit>()
            .HasIndex(sua => sua.SegmentId);

        modelBuilder.Entity<SegmentUsageAudit>()
            .HasIndex(sua => sua.UserId);

        modelBuilder.Entity<SegmentUsageAudit>()
            .HasIndex(sua => sua.OccurredAt)
            .HasDatabaseName("IX_SegmentUsageAudit_OccurredAt");

        modelBuilder.Entity<SegmentUsageAudit>()
            .HasIndex(sua => new { sua.TenantId, sua.SegmentId, sua.OccurredAt })
            .HasDatabaseName("IX_SegmentUsageAudit_Tenant_Segment_Time");

        // Configure relationships
        modelBuilder.Entity<User>()
            .HasOne(u => u.Tenant)
            .WithMany(t => t.Users)
            .HasForeignKey(u => u.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Contact>()
            .HasOne(c => c.Tenant)
            .WithMany(t => t.Contacts)
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // Tag relationships
        modelBuilder.Entity<Tag>()
            .HasOne(t => t.Tenant)
            .WithMany()
            .HasForeignKey(t => t.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // ContactTag relationships
        modelBuilder.Entity<ContactTag>()
            .HasOne(ct => ct.Contact)
            .WithMany(c => c.ContactTags)
            .HasForeignKey(ct => ct.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactTag>()
            .HasOne(ct => ct.Tag)
            .WithMany(t => t.ContactTags)
            .HasForeignKey(ct => ct.TagId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactTag>()
            .HasOne(ct => ct.Tenant)
            .WithMany()
            .HasForeignKey(ct => ct.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // ContactHistory relationships
        modelBuilder.Entity<ContactHistory>()
            .HasOne(ch => ch.Contact)
            .WithMany(c => c.ContactHistory)
            .HasForeignKey(ch => ch.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactHistory>()
            .HasOne(ch => ch.Tenant)
            .WithMany()
            .HasForeignKey(ch => ch.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactHistory>()
            .HasOne(ch => ch.User)
            .WithMany()
            .HasForeignKey(ch => ch.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ContactGroup>()
            .HasOne(cg => cg.Tenant)
            .WithMany()
            .HasForeignKey(cg => cg.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactGroupMember>()
            .HasOne(cgm => cgm.Group)
            .WithMany(cg => cg.Members)
            .HasForeignKey(cgm => cgm.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactGroupMember>()
            .HasOne(cgm => cgm.Contact)
            .WithMany()
            .HasForeignKey(cgm => cgm.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactSegment>()
            .HasOne(cs => cs.Tenant)
            .WithMany()
            .HasForeignKey(cs => cs.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Campaign>()
            .HasOne(c => c.Tenant)
            .WithMany(t => t.Campaigns)
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignChannel>()
            .HasOne(cc => cc.Campaign)
            .WithMany(c => c.Channels)
            .HasForeignKey(cc => cc.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignAudience>()
            .HasOne(ca => ca.Campaign)
            .WithOne(c => c.Audience)
            .HasForeignKey<CampaignAudience>(ca => ca.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignContact>()
            .HasOne(cc => cc.Campaign)
            .WithMany(c => c.CampaignContacts)
            .HasForeignKey(cc => cc.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignContact>()
            .HasOne(cc => cc.Contact)
            .WithMany(c => c.CampaignContacts)
            .HasForeignKey(cc => cc.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MessageHistory>()
            .HasOne(mh => mh.Campaign)
            .WithMany(c => c.MessageHistories)
            .HasForeignKey(mh => mh.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MessageHistory>()
            .HasOne(mh => mh.Contact)
            .WithMany(c => c.MessageHistories)
            .HasForeignKey(mh => mh.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        // Campaign metrics relationships
        modelBuilder.Entity<CampaignMetrics>()
            .HasOne(cm => cm.Campaign)
            .WithOne()
            .HasForeignKey<CampaignMetrics>(cm => cm.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignMetrics>()
            .HasOne(cm => cm.Tenant)
            .WithMany()
            .HasForeignKey(cm => cm.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignMetricsMinute>()
            .HasOne(cmm => cmm.Campaign)
            .WithMany()
            .HasForeignKey(cmm => cmm.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignMetricsMinute>()
            .HasOne(cmm => cmm.Tenant)
            .WithMany()
            .HasForeignKey(cmm => cmm.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        // Alert policy relationships
        modelBuilder.Entity<AlertPolicy>()
            .HasOne(ap => ap.Campaign)
            .WithMany()
            .HasForeignKey(ap => ap.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        // Alert state relationships
        modelBuilder.Entity<AlertState>()
            .HasOne(als => als.Campaign)
            .WithMany()
            .HasForeignKey(als => als.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure decimal precision
        modelBuilder.Entity<MessageHistory>()
            .Property(mh => mh.Cost)
            .HasPrecision(10, 4);

        modelBuilder.Entity<AlertPolicy>()
            .Property(ap => ap.FailureRateThreshold)
            .HasPrecision(5, 4);

        modelBuilder.Entity<AlertState>()
            .Property(als => als.LastFailureRate)
            .HasPrecision(5, 4);

        // Import job relationships
        modelBuilder.Entity<ImportJob>()
            .HasOne(ij => ij.Tenant)
            .WithMany()
            .HasForeignKey(ij => ij.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ImportJob>()
            .HasOne(ij => ij.User)
            .WithMany()
            .HasForeignKey(ij => ij.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Import error relationships
        modelBuilder.Entity<ImportError>()
            .HasOne(ie => ie.ImportJob)
            .WithMany()
            .HasForeignKey(ie => ie.ImportJobId)
            .OnDelete(DeleteBehavior.Cascade);

        // Staging contact relationships
        modelBuilder.Entity<StagingContact>()
            .HasOne(sc => sc.ImportJob)
            .WithMany()
            .HasForeignKey(sc => sc.ImportJobId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StagingContact>()
            .HasOne(sc => sc.Tenant)
            .WithMany()
            .HasForeignKey(sc => sc.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StagingContact>()
            .HasOne(sc => sc.Contact)
            .WithMany()
            .HasForeignKey(sc => sc.ContactId)
            .OnDelete(DeleteBehavior.SetNull);

        // Segment relationships
        modelBuilder.Entity<Segment>()
            .HasOne(s => s.Tenant)
            .WithMany()
            .HasForeignKey(s => s.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Segment>()
            .HasOne(s => s.CreatedByUser)
            .WithMany()
            .HasForeignKey(s => s.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        // Segment usage audit relationships
        modelBuilder.Entity<SegmentUsageAudit>()
            .HasOne(sua => sua.Tenant)
            .WithMany()
            .HasForeignKey(sua => sua.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SegmentUsageAudit>()
            .HasOne(sua => sua.Segment)
            .WithMany()
            .HasForeignKey(sua => sua.SegmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SegmentUsageAudit>()
            .HasOne(sua => sua.User)
            .WithMany()
            .HasForeignKey(sua => sua.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure decimal precision for import models
        modelBuilder.Entity<ImportJob>()
            .Property(ij => ij.ProcessingRate)
            .HasPrecision(10, 2);

        // Configure analytics models
        ConfigureAnalyticsModels(modelBuilder);
        
        // Configure scheduling models
        ConfigureSchedulingModels(modelBuilder);
        ConfigureSettingsModels(modelBuilder);
        
        // Ignore analytics and scheduling models for in-memory database due to JsonDocument limitations
        if (Database.IsInMemory())
        {
            modelBuilder.Ignore<CampaignEvent>();
            modelBuilder.Ignore<CampaignVariant>();
            modelBuilder.Ignore<LinkClick>();
            modelBuilder.Ignore<CampaignSchedule>();
            modelBuilder.Ignore<CampaignScheduleExecution>();
        }

        // Enable Row Level Security (RLS) - to be implemented at PostgreSQL level
        // All queries will be filtered by tenant_id
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity.GetType().GetProperty("UpdatedAt") != null)
            {
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
            }

            if (entry.State == EntityState.Added && entry.Entity.GetType().GetProperty("CreatedAt") != null)
            {
                entry.Property("CreatedAt").CurrentValue = DateTime.UtcNow;
            }
        }
    }

    private void ConfigureAnalyticsModels(ModelBuilder modelBuilder)
    {
        // CampaignEvent configuration with partitioning and performance indexes
        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => new { ce.TenantId, ce.CampaignId, ce.EventType, ce.OccurredAt })
            .HasDatabaseName("IX_CampaignEvents_Tenant_Campaign_Type_Time");

        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => new { ce.TenantId, ce.OccurredAt })
            .HasDatabaseName("IX_CampaignEvents_Tenant_Time");

        // Partial indexes for common event types (performance optimization)
        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => new { ce.TenantId, ce.CampaignId, ce.OccurredAt })
            .HasDatabaseName("IX_CampaignEvents_Delivered")
            .HasFilter("event_type = 'Delivered'");

        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => new { ce.TenantId, ce.CampaignId, ce.OccurredAt })
            .HasDatabaseName("IX_CampaignEvents_Opened")
            .HasFilter("event_type = 'Opened'");

        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => new { ce.TenantId, ce.CampaignId, ce.OccurredAt })
            .HasDatabaseName("IX_CampaignEvents_Clicked")
            .HasFilter("event_type = 'Clicked'");

        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => new { ce.TenantId, ce.CampaignId, ce.OccurredAt })
            .HasDatabaseName("IX_CampaignEvents_Failed")
            .HasFilter("event_type = 'Failed'");

        // GIN index for metadata searches
        modelBuilder.Entity<CampaignEvent>()
            .HasIndex(ce => ce.Meta)
            .HasDatabaseName("IX_CampaignEvents_Meta_GIN");

        // Configure decimal precision for cost tracking
        modelBuilder.Entity<CampaignEvent>()
            .Property(ce => ce.CostAmount)
            .HasPrecision(12, 4);

        // CampaignEvent relationships
        modelBuilder.Entity<CampaignEvent>()
            .HasOne(ce => ce.Tenant)
            .WithMany()
            .HasForeignKey(ce => ce.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignEvent>()
            .HasOne(ce => ce.Campaign)
            .WithMany()
            .HasForeignKey(ce => ce.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignEvent>()
            .HasOne(ce => ce.Contact)
            .WithMany()
            .HasForeignKey(ce => ce.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        // CampaignVariant configuration
        modelBuilder.Entity<CampaignVariant>()
            .HasIndex(cv => new { cv.TenantId, cv.CampaignId })
            .HasDatabaseName("IX_CampaignVariants_Tenant_Campaign");

        modelBuilder.Entity<CampaignVariant>()
            .HasIndex(cv => new { cv.CampaignId, cv.Label })
            .IsUnique()
            .HasDatabaseName("IX_CampaignVariants_Campaign_Label");

        // Configure decimal precision for allocation percentage
        modelBuilder.Entity<CampaignVariant>()
            .Property(cv => cv.AllocationPercentage)
            .HasPrecision(5, 2);

        // CampaignVariant relationships
        modelBuilder.Entity<CampaignVariant>()
            .HasOne(cv => cv.Tenant)
            .WithMany()
            .HasForeignKey(cv => cv.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignVariant>()
            .HasOne(cv => cv.Campaign)
            .WithMany()
            .HasForeignKey(cv => cv.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        // LinkClick configuration
        modelBuilder.Entity<LinkClick>()
            .HasIndex(lc => new { lc.TenantId, lc.CampaignId, lc.ClickedAt })
            .HasDatabaseName("IX_LinkClicks_Tenant_Campaign_Time");

        modelBuilder.Entity<LinkClick>()
            .HasIndex(lc => lc.EventId)
            .HasDatabaseName("IX_LinkClicks_EventId");

        modelBuilder.Entity<LinkClick>()
            .HasIndex(lc => new { lc.ContactId, lc.ClickedAt })
            .HasDatabaseName("IX_LinkClicks_Contact_Time");

        // LinkClick relationships
        modelBuilder.Entity<LinkClick>()
            .HasOne(lc => lc.Tenant)
            .WithMany()
            .HasForeignKey(lc => lc.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LinkClick>()
            .HasOne(lc => lc.Campaign)
            .WithMany()
            .HasForeignKey(lc => lc.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LinkClick>()
            .HasOne(lc => lc.Contact)
            .WithMany()
            .HasForeignKey(lc => lc.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LinkClick>()
            .HasOne(lc => lc.Event)
            .WithMany()
            .HasForeignKey(lc => lc.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureSchedulingModels(ModelBuilder modelBuilder)
    {
        // CampaignSchedule indexes for performance
        modelBuilder.Entity<CampaignSchedule>()
            .HasIndex(cs => cs.TenantId)
            .HasDatabaseName("IX_CampaignSchedules_TenantId");

        modelBuilder.Entity<CampaignSchedule>()
            .HasIndex(cs => new { cs.TenantId, cs.CampaignId })
            .HasDatabaseName("IX_CampaignSchedules_Tenant_Campaign");

        modelBuilder.Entity<CampaignSchedule>()
            .HasIndex(cs => new { cs.IsActive, cs.NextExecution })
            .HasDatabaseName("IX_CampaignSchedules_Active_NextExecution");

        modelBuilder.Entity<CampaignSchedule>()
            .HasIndex(cs => new { cs.TenantId, cs.ScheduleType, cs.IsActive })
            .HasDatabaseName("IX_CampaignSchedules_Tenant_Type_Active");

        modelBuilder.Entity<CampaignSchedule>()
            .HasIndex(cs => new { cs.AutomationTrigger, cs.IsActive })
            .HasDatabaseName("IX_CampaignSchedules_Trigger_Active");

        // CampaignScheduleExecution indexes for monitoring and performance
        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasIndex(cse => cse.TenantId)
            .HasDatabaseName("IX_CampaignScheduleExecutions_TenantId");

        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasIndex(cse => new { cse.ScheduleId, cse.PlannedExecution })
            .HasDatabaseName("IX_CampaignScheduleExecutions_Schedule_Planned");

        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasIndex(cse => new { cse.ExecutionStatus, cse.PlannedExecution })
            .HasDatabaseName("IX_CampaignScheduleExecutions_Status_Planned");

        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasIndex(cse => new { cse.TenantId, cse.CampaignId, cse.ActualExecution })
            .HasDatabaseName("IX_CampaignScheduleExecutions_Tenant_Campaign_Executed");

        // CampaignTemplate indexes
        modelBuilder.Entity<CampaignTemplate>()
            .HasIndex(ct => ct.TenantId)
            .HasDatabaseName("IX_CampaignTemplates_TenantId");

        modelBuilder.Entity<CampaignTemplate>()
            .HasIndex(ct => new { ct.TenantId, ct.Name })
            .IsUnique()
            .HasDatabaseName("IX_CampaignTemplates_Tenant_Name");

        modelBuilder.Entity<CampaignTemplate>()
            .HasIndex(ct => new { ct.TenantId, ct.Category, ct.IsActive })
            .HasDatabaseName("IX_CampaignTemplates_Tenant_Category_Active");

        modelBuilder.Entity<CampaignTemplate>()
            .HasIndex(ct => new { ct.IsPublic, ct.IsActive })
            .HasDatabaseName("IX_CampaignTemplates_Public_Active");

        // Configure relationships
        modelBuilder.Entity<CampaignSchedule>()
            .HasOne(cs => cs.Campaign)
            .WithMany()
            .HasForeignKey(cs => cs.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignSchedule>()
            .HasOne(cs => cs.Tenant)
            .WithMany()
            .HasForeignKey(cs => cs.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignSchedule>()
            .HasOne(cs => cs.CreatedByUser)
            .WithMany()
            .HasForeignKey(cs => cs.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignSchedule>()
            .HasOne(cs => cs.UpdatedByUser)
            .WithMany()
            .HasForeignKey(cs => cs.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasOne(cse => cse.Schedule)
            .WithMany(cs => cs.Executions)
            .HasForeignKey(cse => cse.ScheduleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasOne(cse => cse.Campaign)
            .WithMany()
            .HasForeignKey(cse => cse.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignScheduleExecution>()
            .HasOne(cse => cse.Tenant)
            .WithMany()
            .HasForeignKey(cse => cse.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignTemplate>()
            .HasOne(ct => ct.Tenant)
            .WithMany()
            .HasForeignKey(ct => ct.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignTemplate>()
            .HasOne(ct => ct.CreatedByUser)
            .WithMany()
            .HasForeignKey(ct => ct.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CampaignTemplate>()
            .HasOne(ct => ct.UpdatedByUser)
            .WithMany()
            .HasForeignKey(ct => ct.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);
    }
    
    private void ConfigureSettingsModels(ModelBuilder modelBuilder)
    {
        // OrganizationSettings indexes
        modelBuilder.Entity<OrganizationSettings>()
            .HasIndex(os => os.TenantId)
            .IsUnique()
            .HasDatabaseName("IX_OrganizationSettings_TenantId");

        // ChannelConfiguration indexes
        modelBuilder.Entity<ChannelConfiguration>()
            .HasIndex(cc => cc.TenantId)
            .HasDatabaseName("IX_ChannelConfigurations_TenantId");

        modelBuilder.Entity<ChannelConfiguration>()
            .HasIndex(cc => new { cc.TenantId, cc.ChannelType })
            .HasDatabaseName("IX_ChannelConfigurations_Tenant_Type");

        modelBuilder.Entity<ChannelConfiguration>()
            .HasIndex(cc => new { cc.TenantId, cc.IsDefault })
            .HasDatabaseName("IX_ChannelConfigurations_Tenant_Default");

        modelBuilder.Entity<ChannelConfiguration>()
            .HasIndex(cc => new { cc.Status, cc.PriorityOrder })
            .HasDatabaseName("IX_ChannelConfigurations_Status_Priority");

        // QuotaConfiguration indexes
        modelBuilder.Entity<QuotaConfiguration>()
            .HasIndex(qc => qc.TenantId)
            .HasDatabaseName("IX_QuotaConfigurations_TenantId");

        modelBuilder.Entity<QuotaConfiguration>()
            .HasIndex(qc => new { qc.TenantId, qc.ChannelType })
            .IsUnique()
            .HasDatabaseName("IX_QuotaConfigurations_Tenant_Channel");

        // QuotaUsage indexes for analytics and performance
        modelBuilder.Entity<QuotaUsage>()
            .HasIndex(qu => qu.TenantId)
            .HasDatabaseName("IX_QuotaUsages_TenantId");

        modelBuilder.Entity<QuotaUsage>()
            .HasIndex(qu => new { qu.TenantId, qu.UsageDate })
            .HasDatabaseName("IX_QuotaUsages_Tenant_Date");

        modelBuilder.Entity<QuotaUsage>()
            .HasIndex(qu => new { qu.TenantId, qu.ChannelType, qu.UsageDate })
            .HasDatabaseName("IX_QuotaUsages_Tenant_Channel_Date");

        modelBuilder.Entity<QuotaUsage>()
            .HasIndex(qu => new { qu.TenantId, qu.UsageDate, qu.UsageHour })
            .HasDatabaseName("IX_QuotaUsages_Tenant_Date_Hour");

        // SecuritySettings indexes
        modelBuilder.Entity<SecuritySettings>()
            .HasIndex(ss => ss.TenantId)
            .IsUnique()
            .HasDatabaseName("IX_SecuritySettings_TenantId");

        // ApiToken indexes for security and performance
        modelBuilder.Entity<ApiToken>()
            .HasIndex(at => at.TenantId)
            .HasDatabaseName("IX_ApiTokens_TenantId");

        modelBuilder.Entity<ApiToken>()
            .HasIndex(at => at.UserId)
            .HasDatabaseName("IX_ApiTokens_UserId");

        modelBuilder.Entity<ApiToken>()
            .HasIndex(at => at.TokenHash)
            .IsUnique()
            .HasDatabaseName("IX_ApiTokens_TokenHash");

        modelBuilder.Entity<ApiToken>()
            .HasIndex(at => new { at.IsActive, at.ExpiresAt })
            .HasDatabaseName("IX_ApiTokens_Active_Expires");

        // AuditLog indexes for compliance and performance
        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => al.TenantId)
            .HasDatabaseName("IX_AuditLogs_TenantId");

        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => new { al.TenantId, al.CreatedAt })
            .HasDatabaseName("IX_AuditLogs_Tenant_Created");

        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => new { al.TenantId, al.UserId, al.CreatedAt })
            .HasDatabaseName("IX_AuditLogs_Tenant_User_Created");

        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => new { al.TenantId, al.Action, al.CreatedAt })
            .HasDatabaseName("IX_AuditLogs_Tenant_Action_Created");

        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => new { al.TenantId, al.ResourceType, al.ResourceId })
            .HasDatabaseName("IX_AuditLogs_Tenant_Resource");

        // UserInvitation indexes
        modelBuilder.Entity<UserInvitation>()
            .HasIndex(ui => ui.TenantId)
            .HasDatabaseName("IX_UserInvitations_TenantId");

        modelBuilder.Entity<UserInvitation>()
            .HasIndex(ui => ui.Email)
            .HasDatabaseName("IX_UserInvitations_Email");

        modelBuilder.Entity<UserInvitation>()
            .HasIndex(ui => ui.InvitationToken)
            .IsUnique()
            .HasDatabaseName("IX_UserInvitations_Token");

        modelBuilder.Entity<UserInvitation>()
            .HasIndex(ui => new { ui.Status, ui.ExpiresAt })
            .HasDatabaseName("IX_UserInvitations_Status_Expires");

        // Configure decimal precision for cost tracking
        modelBuilder.Entity<QuotaConfiguration>()
            .Property(qc => qc.CostPerMessage)
            .HasPrecision(10, 4);

        modelBuilder.Entity<QuotaUsage>()
            .Property(qu => qu.TotalCost)
            .HasPrecision(12, 4);

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<ChannelConfiguration>()
            .Property(cc => cc.Configuration)
            .HasColumnType("jsonb");

        modelBuilder.Entity<SecuritySettings>()
            .Property(ss => ss.AllowedIPRanges)
            .HasColumnType("jsonb");

        modelBuilder.Entity<ApiToken>()
            .Property(at => at.Permissions)
            .HasColumnType("jsonb");

        modelBuilder.Entity<AuditLog>()
            .Property(al => al.OldValues)
            .HasColumnType("jsonb");

        modelBuilder.Entity<AuditLog>()
            .Property(al => al.NewValues)
            .HasColumnType("jsonb");

        // Email system configuration
        ConfigureEmailModels(modelBuilder);
    }

    private void ConfigureEmailModels(ModelBuilder modelBuilder)
    {
        // EmailTemplate indexes for performance and searching
        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(et => et.TenantId)
            .HasDatabaseName("IX_EmailTemplates_TenantId");

        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(et => new { et.TenantId, et.TemplateType })
            .HasDatabaseName("IX_EmailTemplates_Tenant_Type");

        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(et => new { et.TenantId, et.Status })
            .HasDatabaseName("IX_EmailTemplates_Tenant_Status");

        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(et => new { et.TenantId, et.Name })
            .HasDatabaseName("IX_EmailTemplates_Tenant_Name");

        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(et => new { et.IsSystemTemplate, et.Status })
            .HasDatabaseName("IX_EmailTemplates_System_Status");

        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(et => new { et.TenantId, et.UsageCount, et.LastUsedAt })
            .HasDatabaseName("IX_EmailTemplates_Tenant_Usage");

        // EmailSubscription indexes for performance and compliance
        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => es.TenantId)
            .HasDatabaseName("IX_EmailSubscriptions_TenantId");

        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => new { es.TenantId, es.Email })
            .IsUnique()
            .HasDatabaseName("IX_EmailSubscriptions_Tenant_Email");

        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => new { es.TenantId, es.Status })
            .HasDatabaseName("IX_EmailSubscriptions_Tenant_Status");

        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => es.UnsubscribeToken)
            .IsUnique()
            .HasDatabaseName("IX_EmailSubscriptions_UnsubscribeToken");

        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => new { es.TenantId, es.ContactId })
            .HasDatabaseName("IX_EmailSubscriptions_Tenant_Contact");

        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => new { es.TenantId, es.Source, es.SubscriptionDate })
            .HasDatabaseName("IX_EmailSubscriptions_Tenant_Source_Date");

        modelBuilder.Entity<EmailSubscription>()
            .HasIndex(es => new { es.Status, es.LastEmailSentAt })
            .HasDatabaseName("IX_EmailSubscriptions_Status_LastEmail");

        // EmailSubscriptionList indexes
        modelBuilder.Entity<EmailSubscriptionList>()
            .HasIndex(esl => esl.TenantId)
            .HasDatabaseName("IX_EmailSubscriptionLists_TenantId");

        modelBuilder.Entity<EmailSubscriptionList>()
            .HasIndex(esl => new { esl.TenantId, esl.Name })
            .IsUnique()
            .HasDatabaseName("IX_EmailSubscriptionLists_Tenant_Name");

        modelBuilder.Entity<EmailSubscriptionList>()
            .HasIndex(esl => new { esl.TenantId, esl.IsDefault })
            .HasDatabaseName("IX_EmailSubscriptionLists_Tenant_Default");

        modelBuilder.Entity<EmailSubscriptionList>()
            .HasIndex(esl => new { esl.TenantId, esl.SubscriberCount })
            .HasDatabaseName("IX_EmailSubscriptionLists_Tenant_Count");

        // EmailSubscriptionListMember indexes for membership queries
        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasIndex(eslm => eslm.ListId)
            .HasDatabaseName("IX_EmailSubscriptionListMembers_ListId");

        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasIndex(eslm => eslm.SubscriptionId)
            .HasDatabaseName("IX_EmailSubscriptionListMembers_SubscriptionId");

        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasIndex(eslm => new { eslm.ListId, eslm.SubscriptionId })
            .IsUnique()
            .HasDatabaseName("IX_EmailSubscriptionListMembers_List_Subscription");

        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasIndex(eslm => new { eslm.ListId, eslm.AddedAt })
            .HasDatabaseName("IX_EmailSubscriptionListMembers_List_Added");

        // EmailEvent indexes for analytics and performance
        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => ee.TenantId)
            .HasDatabaseName("IX_EmailEvents_TenantId");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.EventType, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Tenant_Type_Time");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.CampaignId, ee.EventType })
            .HasDatabaseName("IX_EmailEvents_Tenant_Campaign_Type");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.RecipientEmail, ee.EventType, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Recipient_Type_Time");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => ee.SesMessageId)
            .HasDatabaseName("IX_EmailEvents_SesMessageId");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.SubscriptionId, ee.EventType, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Subscription_Type_Time");

        // Partial indexes for common event types
        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.CampaignId, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Sent")
            .HasFilter("event_type = 'SENT'");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.CampaignId, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Delivered")
            .HasFilter("event_type = 'DELIVERED'");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.CampaignId, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Opened")
            .HasFilter("event_type = 'OPENED'");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.CampaignId, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Clicked")
            .HasFilter("event_type = 'CLICKED'");

        modelBuilder.Entity<EmailEvent>()
            .HasIndex(ee => new { ee.TenantId, ee.CampaignId, ee.OccurredAt })
            .HasDatabaseName("IX_EmailEvents_Bounced")
            .HasFilter("event_type = 'BOUNCED'");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<EmailTemplate>()
            .Property(et => et.TemplateVariables)
            .HasColumnType("jsonb");

        modelBuilder.Entity<EmailTemplate>()
            .Property(et => et.DesignJson)
            .HasColumnType("jsonb");

        modelBuilder.Entity<EmailSubscription>()
            .Property(es => es.Preferences)
            .HasColumnType("jsonb");

        modelBuilder.Entity<EmailEvent>()
            .Property(ee => ee.EventData)
            .HasColumnType("jsonb");

        // Configure relationships
        modelBuilder.Entity<EmailTemplate>()
            .HasOne(et => et.Tenant)
            .WithMany()
            .HasForeignKey(et => et.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailTemplate>()
            .HasOne(et => et.CreatedByUser)
            .WithMany()
            .HasForeignKey(et => et.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailTemplate>()
            .HasOne(et => et.UpdatedByUser)
            .WithMany()
            .HasForeignKey(et => et.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailSubscription>()
            .HasOne(es => es.Tenant)
            .WithMany()
            .HasForeignKey(es => es.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailSubscription>()
            .HasOne(es => es.Contact)
            .WithMany()
            .HasForeignKey(es => es.ContactId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailSubscription>()
            .HasOne(es => es.CreatedByUser)
            .WithMany()
            .HasForeignKey(es => es.CreatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailSubscription>()
            .HasOne(es => es.UpdatedByUser)
            .WithMany()
            .HasForeignKey(es => es.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailSubscriptionList>()
            .HasOne(esl => esl.Tenant)
            .WithMany()
            .HasForeignKey(esl => esl.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailSubscriptionList>()
            .HasOne(esl => esl.CreatedByUser)
            .WithMany()
            .HasForeignKey(esl => esl.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailSubscriptionList>()
            .HasOne(esl => esl.UpdatedByUser)
            .WithMany()
            .HasForeignKey(esl => esl.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasOne(eslm => eslm.List)
            .WithMany(esl => esl.Members)
            .HasForeignKey(eslm => eslm.ListId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasOne(eslm => eslm.Subscription)
            .WithMany()
            .HasForeignKey(eslm => eslm.SubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailSubscriptionListMember>()
            .HasOne(eslm => eslm.AddedByUser)
            .WithMany()
            .HasForeignKey(eslm => eslm.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailEvent>()
            .HasOne(ee => ee.Tenant)
            .WithMany()
            .HasForeignKey(ee => ee.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmailEvent>()
            .HasOne(ee => ee.Campaign)
            .WithMany()
            .HasForeignKey(ee => ee.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EmailEvent>()
            .HasOne(ee => ee.Subscription)
            .WithMany()
            .HasForeignKey(ee => ee.SubscriptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure Korean personalization models
        ConfigurePersonalizationModels(modelBuilder);
        
        // Configure Korean Language Processing models
        ConfigureKoreanLanguageModels(modelBuilder);
        
        // Configure Korean Election Law Compliance models
        ConfigureComplianceModels(modelBuilder);
    }

    private void ConfigurePersonalizationModels(ModelBuilder modelBuilder)
    {
        // MessagePersonalization configuration
        modelBuilder.Entity<MessagePersonalization>()
            .HasIndex(mp => mp.TenantId)
            .HasDatabaseName("IX_MessagePersonalizations_TenantId");

        modelBuilder.Entity<MessagePersonalization>()
            .HasIndex(mp => mp.CampaignId)
            .HasDatabaseName("IX_MessagePersonalizations_CampaignId");

        modelBuilder.Entity<MessagePersonalization>()
            .HasIndex(mp => mp.ContactId)
            .HasDatabaseName("IX_MessagePersonalizations_ContactId");

        modelBuilder.Entity<MessagePersonalization>()
            .HasIndex(mp => mp.GeneratedAt)
            .HasDatabaseName("IX_MessagePersonalizations_GeneratedAt");

        modelBuilder.Entity<MessagePersonalization>()
            .HasIndex(mp => new { mp.Dialect, mp.RegionCode })
            .HasDatabaseName("IX_MessagePersonalizations_Dialect_Region");

        modelBuilder.Entity<MessagePersonalization>()
            .HasIndex(mp => mp.AbTestGroup)
            .HasDatabaseName("IX_MessagePersonalizations_AbTestGroup");

        // Configure JSON columns
        modelBuilder.Entity<MessagePersonalization>()
            .Property(mp => mp.CulturalContext)
            .HasColumnType("jsonb");

        // MessagePersonalization relationships
        modelBuilder.Entity<MessagePersonalization>()
            .HasOne(mp => mp.Tenant)
            .WithMany()
            .HasForeignKey(mp => mp.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MessagePersonalization>()
            .HasOne(mp => mp.Campaign)
            .WithMany()
            .HasForeignKey(mp => mp.CampaignId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MessagePersonalization>()
            .HasOne(mp => mp.Contact)
            .WithMany()
            .HasForeignKey(mp => mp.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        // PersonalizationEffectiveness configuration
        modelBuilder.Entity<PersonalizationEffectiveness>()
            .HasIndex(pe => pe.TenantId)
            .HasDatabaseName("IX_PersonalizationEffectiveness_TenantId");

        modelBuilder.Entity<PersonalizationEffectiveness>()
            .HasIndex(pe => pe.PersonalizationId)
            .HasDatabaseName("IX_PersonalizationEffectiveness_PersonalizationId");

        modelBuilder.Entity<PersonalizationEffectiveness>()
            .HasIndex(pe => pe.MetricType)
            .HasDatabaseName("IX_PersonalizationEffectiveness_MetricType");

        modelBuilder.Entity<PersonalizationEffectiveness>()
            .HasIndex(pe => pe.MeasuredAt)
            .HasDatabaseName("IX_PersonalizationEffectiveness_MeasuredAt");

        // Configure JSON columns
        modelBuilder.Entity<PersonalizationEffectiveness>()
            .Property(pe => pe.Metadata)
            .HasColumnType("jsonb");

        // PersonalizationEffectiveness relationships
        modelBuilder.Entity<PersonalizationEffectiveness>()
            .HasOne(pe => pe.Tenant)
            .WithMany()
            .HasForeignKey(pe => pe.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PersonalizationEffectiveness>()
            .HasOne(pe => pe.Personalization)
            .WithMany(mp => mp.EffectivenessHistory)
            .HasForeignKey(pe => pe.PersonalizationId)
            .OnDelete(DeleteBehavior.Cascade);

        // VoterDemographics configuration
        modelBuilder.Entity<VoterDemographics>()
            .HasIndex(vd => vd.TenantId)
            .HasDatabaseName("IX_VoterDemographics_TenantId");

        modelBuilder.Entity<VoterDemographics>()
            .HasIndex(vd => vd.ContactId)
            .IsUnique()
            .HasDatabaseName("IX_VoterDemographics_ContactId");

        modelBuilder.Entity<VoterDemographics>()
            .HasIndex(vd => new { vd.RegionCode, vd.AgeGroup })
            .HasDatabaseName("IX_VoterDemographics_Region_Age");

        modelBuilder.Entity<VoterDemographics>()
            .HasIndex(vd => new { vd.Occupation, vd.EducationLevel })
            .HasDatabaseName("IX_VoterDemographics_Occupation_Education");

        modelBuilder.Entity<VoterDemographics>()
            .HasIndex(vd => vd.PreferredDialect)
            .HasDatabaseName("IX_VoterDemographics_PreferredDialect");

        // Configure JSON columns
        modelBuilder.Entity<VoterDemographics>()
            .Property(vd => vd.InterestIssues)
            .HasColumnType("jsonb");

        // VoterDemographics relationships
        modelBuilder.Entity<VoterDemographics>()
            .HasOne(vd => vd.Tenant)
            .WithMany()
            .HasForeignKey(vd => vd.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<VoterDemographics>()
            .HasOne(vd => vd.Contact)
            .WithMany()
            .HasForeignKey(vd => vd.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        // KoreanLanguageContext configuration
        modelBuilder.Entity<KoreanLanguageContext>()
            .HasIndex(klc => klc.TenantId)
            .HasDatabaseName("IX_KoreanLanguageContexts_TenantId");

        modelBuilder.Entity<KoreanLanguageContext>()
            .HasIndex(klc => new { klc.TenantId, klc.ContextName })
            .IsUnique()
            .HasDatabaseName("IX_KoreanLanguageContexts_Tenant_ContextName");

        modelBuilder.Entity<KoreanLanguageContext>()
            .HasIndex(klc => new { klc.Dialect, klc.Formality, klc.IsActive })
            .HasDatabaseName("IX_KoreanLanguageContexts_Dialect_Formality_Active");

        // Configure JSON columns
        modelBuilder.Entity<KoreanLanguageContext>()
            .Property(klc => klc.CulturalMarkers)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanLanguageContext>()
            .Property(klc => klc.TabooExpressions)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanLanguageContext>()
            .Property(klc => klc.RecommendedExpressions)
            .HasColumnType("jsonb");

        // KoreanLanguageContext relationships
        modelBuilder.Entity<KoreanLanguageContext>()
            .HasOne(klc => klc.Tenant)
            .WithMany()
            .HasForeignKey(klc => klc.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureComplianceModels(ModelBuilder modelBuilder)
    {
        // ComplianceRule configuration
        modelBuilder.Entity<ComplianceRule>()
            .HasIndex(cr => cr.TenantId)
            .HasDatabaseName("IX_ComplianceRules_TenantId");

        modelBuilder.Entity<ComplianceRule>()
            .HasIndex(cr => new { cr.TenantId, cr.RuleCode })
            .IsUnique()
            .HasDatabaseName("IX_ComplianceRules_Tenant_RuleCode");

        modelBuilder.Entity<ComplianceRule>()
            .HasIndex(cr => new { cr.TenantId, cr.LegalCategory, cr.IsActive })
            .HasDatabaseName("IX_ComplianceRules_Tenant_Category_Active");

        modelBuilder.Entity<ComplianceRule>()
            .HasIndex(cr => new { cr.TenantId, cr.RuleType, cr.IsActive })
            .HasDatabaseName("IX_ComplianceRules_Tenant_Type_Active");

        modelBuilder.Entity<ComplianceRule>()
            .HasIndex(cr => new { cr.TenantId, cr.Severity, cr.Priority })
            .HasDatabaseName("IX_ComplianceRules_Tenant_Severity_Priority");

        // Configure JSON columns
        modelBuilder.Entity<ComplianceRule>()
            .Property(cr => cr.ValidationConfig)
            .HasColumnType("jsonb");

        modelBuilder.Entity<ComplianceRule>()
            .Property(cr => cr.TimingRestrictions)
            .HasColumnType("jsonb");

        // ComplianceRule relationships
        modelBuilder.Entity<ComplianceRule>()
            .HasOne(cr => cr.Tenant)
            .WithMany()
            .HasForeignKey(cr => cr.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ComplianceRule>()
            .HasOne(cr => cr.CreatedByUser)
            .WithMany()
            .HasForeignKey(cr => cr.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ComplianceRule>()
            .HasOne(cr => cr.UpdatedByUser)
            .WithMany()
            .HasForeignKey(cr => cr.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // ComplianceViolation configuration
        modelBuilder.Entity<ComplianceViolation>()
            .HasIndex(cv => cv.TenantId)
            .HasDatabaseName("IX_ComplianceViolations_TenantId");

        modelBuilder.Entity<ComplianceViolation>()
            .HasIndex(cv => cv.RuleId)
            .HasDatabaseName("IX_ComplianceViolations_RuleId");

        modelBuilder.Entity<ComplianceViolation>()
            .HasIndex(cv => new { cv.TenantId, cv.Status, cv.OccurredAt })
            .HasDatabaseName("IX_ComplianceViolations_Tenant_Status_Occurred");

        modelBuilder.Entity<ComplianceViolation>()
            .HasIndex(cv => new { cv.TenantId, cv.Severity, cv.Status })
            .HasDatabaseName("IX_ComplianceViolations_Tenant_Severity_Status");

        modelBuilder.Entity<ComplianceViolation>()
            .HasIndex(cv => new { cv.TenantId, cv.ViolationType, cv.OccurredAt })
            .HasDatabaseName("IX_ComplianceViolations_Tenant_Type_Occurred");

        modelBuilder.Entity<ComplianceViolation>()
            .HasIndex(cv => new { cv.ResourceType, cv.ResourceId })
            .HasDatabaseName("IX_ComplianceViolations_Resource_Type_Id");

        // Configure decimal precision
        modelBuilder.Entity<ComplianceViolation>()
            .Property(cv => cv.EstimatedPenalty)
            .HasPrecision(15, 2);

        // Configure JSON columns
        modelBuilder.Entity<ComplianceViolation>()
            .Property(cv => cv.ViolationData)
            .HasColumnType("jsonb");

        // ComplianceViolation relationships
        modelBuilder.Entity<ComplianceViolation>()
            .HasOne(cv => cv.Tenant)
            .WithMany()
            .HasForeignKey(cv => cv.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ComplianceViolation>()
            .HasOne(cv => cv.Rule)
            .WithMany(cr => cr.Violations)
            .HasForeignKey(cv => cv.RuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ComplianceViolation>()
            .HasOne(cv => cv.Campaign)
            .WithMany()
            .HasForeignKey(cv => cv.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ComplianceViolation>()
            .HasOne(cv => cv.User)
            .WithMany()
            .HasForeignKey(cv => cv.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ComplianceViolation>()
            .HasOne(cv => cv.ResolvedByUser)
            .WithMany()
            .HasForeignKey(cv => cv.ResolvedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // ComplianceViolationLog configuration
        modelBuilder.Entity<ComplianceViolationLog>()
            .HasIndex(cvl => cvl.ViolationId)
            .HasDatabaseName("IX_ComplianceViolationLogs_ViolationId");

        modelBuilder.Entity<ComplianceViolationLog>()
            .HasIndex(cvl => cvl.UserId)
            .HasDatabaseName("IX_ComplianceViolationLogs_UserId");

        modelBuilder.Entity<ComplianceViolationLog>()
            .HasIndex(cvl => new { cvl.ViolationId, cvl.CreatedAt })
            .HasDatabaseName("IX_ComplianceViolationLogs_Violation_Created");

        // ComplianceViolationLog relationships
        modelBuilder.Entity<ComplianceViolationLog>()
            .HasOne(cvl => cvl.Violation)
            .WithMany(cv => cv.ViolationLogs)
            .HasForeignKey(cvl => cvl.ViolationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ComplianceViolationLog>()
            .HasOne(cvl => cvl.User)
            .WithMany()
            .HasForeignKey(cvl => cvl.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SpendingLimit configuration
        modelBuilder.Entity<SpendingLimit>()
            .HasIndex(sl => sl.TenantId)
            .HasDatabaseName("IX_SpendingLimits_TenantId");

        modelBuilder.Entity<SpendingLimit>()
            .HasIndex(sl => new { sl.TenantId, sl.ElectionType, sl.Category })
            .HasDatabaseName("IX_SpendingLimits_Tenant_Election_Category");

        modelBuilder.Entity<SpendingLimit>()
            .HasIndex(sl => new { sl.TenantId, sl.IsActive })
            .HasDatabaseName("IX_SpendingLimits_Tenant_Active");

        modelBuilder.Entity<SpendingLimit>()
            .HasIndex(sl => new { sl.TenantId, sl.UtilizationPercentage })
            .HasDatabaseName("IX_SpendingLimits_Tenant_Utilization");

        // Configure decimal precision
        modelBuilder.Entity<SpendingLimit>()
            .Property(sl => sl.MaximumAmount)
            .HasPrecision(15, 2);

        modelBuilder.Entity<SpendingLimit>()
            .Property(sl => sl.CurrentSpending)
            .HasPrecision(15, 2);

        modelBuilder.Entity<SpendingLimit>()
            .Property(sl => sl.UtilizationPercentage)
            .HasPrecision(5, 2);

        modelBuilder.Entity<SpendingLimit>()
            .Property(sl => sl.WarningThreshold)
            .HasPrecision(5, 2);

        modelBuilder.Entity<SpendingLimit>()
            .Property(sl => sl.CriticalThreshold)
            .HasPrecision(5, 2);

        // Configure JSON columns
        modelBuilder.Entity<SpendingLimit>()
            .Property(sl => sl.Configuration)
            .HasColumnType("jsonb");

        // SpendingLimit relationships
        modelBuilder.Entity<SpendingLimit>()
            .HasOne(sl => sl.Tenant)
            .WithMany()
            .HasForeignKey(sl => sl.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingLimit>()
            .HasOne(sl => sl.CreatedByUser)
            .WithMany()
            .HasForeignKey(sl => sl.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingLimit>()
            .HasOne(sl => sl.UpdatedByUser)
            .WithMany()
            .HasForeignKey(sl => sl.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // SpendingTransaction configuration
        modelBuilder.Entity<SpendingTransaction>()
            .HasIndex(st => st.TenantId)
            .HasDatabaseName("IX_SpendingTransactions_TenantId");

        modelBuilder.Entity<SpendingTransaction>()
            .HasIndex(st => st.SpendingLimitId)
            .HasDatabaseName("IX_SpendingTransactions_SpendingLimitId");

        modelBuilder.Entity<SpendingTransaction>()
            .HasIndex(st => new { st.TenantId, st.TransactionDate })
            .HasDatabaseName("IX_SpendingTransactions_Tenant_Date");

        modelBuilder.Entity<SpendingTransaction>()
            .HasIndex(st => new { st.TenantId, st.TransactionType, st.IsApproved })
            .HasDatabaseName("IX_SpendingTransactions_Tenant_Type_Approved");

        modelBuilder.Entity<SpendingTransaction>()
            .HasIndex(st => st.CampaignId)
            .HasDatabaseName("IX_SpendingTransactions_CampaignId");

        // Configure decimal precision
        modelBuilder.Entity<SpendingTransaction>()
            .Property(st => st.Amount)
            .HasPrecision(15, 2);

        // Configure JSON columns
        modelBuilder.Entity<SpendingTransaction>()
            .Property(st => st.Metadata)
            .HasColumnType("jsonb");

        // SpendingTransaction relationships
        modelBuilder.Entity<SpendingTransaction>()
            .HasOne(st => st.Tenant)
            .WithMany()
            .HasForeignKey(st => st.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingTransaction>()
            .HasOne(st => st.SpendingLimit)
            .WithMany(sl => sl.Transactions)
            .HasForeignKey(st => st.SpendingLimitId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingTransaction>()
            .HasOne(st => st.Campaign)
            .WithMany()
            .HasForeignKey(st => st.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SpendingTransaction>()
            .HasOne(st => st.CreatedByUser)
            .WithMany()
            .HasForeignKey(st => st.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingTransaction>()
            .HasOne(st => st.ApprovedByUser)
            .WithMany()
            .HasForeignKey(st => st.ApprovedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // SpendingAlert configuration
        modelBuilder.Entity<SpendingAlert>()
            .HasIndex(sa => sa.TenantId)
            .HasDatabaseName("IX_SpendingAlerts_TenantId");

        modelBuilder.Entity<SpendingAlert>()
            .HasIndex(sa => sa.SpendingLimitId)
            .HasDatabaseName("IX_SpendingAlerts_SpendingLimitId");

        modelBuilder.Entity<SpendingAlert>()
            .HasIndex(sa => new { sa.TenantId, sa.Severity, sa.IsAcknowledged })
            .HasDatabaseName("IX_SpendingAlerts_Tenant_Severity_Acknowledged");

        modelBuilder.Entity<SpendingAlert>()
            .HasIndex(sa => new { sa.TenantId, sa.CreatedAt })
            .HasDatabaseName("IX_SpendingAlerts_Tenant_Created");

        // Configure decimal precision
        modelBuilder.Entity<SpendingAlert>()
            .Property(sa => sa.TriggerPercentage)
            .HasPrecision(5, 2);

        modelBuilder.Entity<SpendingAlert>()
            .Property(sa => sa.TriggerAmount)
            .HasPrecision(15, 2);

        // SpendingAlert relationships
        modelBuilder.Entity<SpendingAlert>()
            .HasOne(sa => sa.Tenant)
            .WithMany()
            .HasForeignKey(sa => sa.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingAlert>()
            .HasOne(sa => sa.SpendingLimit)
            .WithMany(sl => sl.Alerts)
            .HasForeignKey(sa => sa.SpendingLimitId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SpendingAlert>()
            .HasOne(sa => sa.AcknowledgedByUser)
            .WithMany()
            .HasForeignKey(sa => sa.AcknowledgedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // DataPrivacyConsent configuration
        modelBuilder.Entity<DataPrivacyConsent>()
            .HasIndex(dpc => dpc.TenantId)
            .HasDatabaseName("IX_DataPrivacyConsents_TenantId");

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasIndex(dpc => dpc.ContactId)
            .HasDatabaseName("IX_DataPrivacyConsents_ContactId");

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasIndex(dpc => new { dpc.TenantId, dpc.ConsentType, dpc.Status })
            .HasDatabaseName("IX_DataPrivacyConsents_Tenant_Type_Status");

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasIndex(dpc => new { dpc.TenantId, dpc.DataRetentionExpiry })
            .HasDatabaseName("IX_DataPrivacyConsents_Tenant_Expiry");

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasIndex(dpc => new { dpc.TenantId, dpc.LegalBasis })
            .HasDatabaseName("IX_DataPrivacyConsents_Tenant_LegalBasis");

        // Configure JSON columns
        modelBuilder.Entity<DataPrivacyConsent>()
            .Property(dpc => dpc.Metadata)
            .HasColumnType("jsonb");

        // DataPrivacyConsent relationships
        modelBuilder.Entity<DataPrivacyConsent>()
            .HasOne(dpc => dpc.Tenant)
            .WithMany()
            .HasForeignKey(dpc => dpc.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasOne(dpc => dpc.Contact)
            .WithMany()
            .HasForeignKey(dpc => dpc.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasOne(dpc => dpc.CreatedByUser)
            .WithMany()
            .HasForeignKey(dpc => dpc.CreatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DataPrivacyConsent>()
            .HasOne(dpc => dpc.UpdatedByUser)
            .WithMany()
            .HasForeignKey(dpc => dpc.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // DataProcessingActivity configuration
        modelBuilder.Entity<DataProcessingActivity>()
            .HasIndex(dpa => dpa.TenantId)
            .HasDatabaseName("IX_DataProcessingActivities_TenantId");

        modelBuilder.Entity<DataProcessingActivity>()
            .HasIndex(dpa => dpa.ConsentId)
            .HasDatabaseName("IX_DataProcessingActivities_ConsentId");

        modelBuilder.Entity<DataProcessingActivity>()
            .HasIndex(dpa => new { dpa.TenantId, dpa.ActivityType, dpa.ProcessedAt })
            .HasDatabaseName("IX_DataProcessingActivities_Tenant_Type_Processed");

        modelBuilder.Entity<DataProcessingActivity>()
            .HasIndex(dpa => dpa.InitiatedBy)
            .HasDatabaseName("IX_DataProcessingActivities_InitiatedBy");

        // Configure JSON columns
        modelBuilder.Entity<DataProcessingActivity>()
            .Property(dpa => dpa.ActivityData)
            .HasColumnType("jsonb");

        // DataProcessingActivity relationships
        modelBuilder.Entity<DataProcessingActivity>()
            .HasOne(dpa => dpa.Tenant)
            .WithMany()
            .HasForeignKey(dpa => dpa.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DataProcessingActivity>()
            .HasOne(dpa => dpa.Consent)
            .WithMany(dpc => dpc.ProcessingActivities)
            .HasForeignKey(dpa => dpa.ConsentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DataProcessingActivity>()
            .HasOne(dpa => dpa.InitiatedByUser)
            .WithMany()
            .HasForeignKey(dpa => dpa.InitiatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // DataPrivacyRequest configuration
        modelBuilder.Entity<DataPrivacyRequest>()
            .HasIndex(dpr => dpr.TenantId)
            .HasDatabaseName("IX_DataPrivacyRequests_TenantId");

        modelBuilder.Entity<DataPrivacyRequest>()
            .HasIndex(dpr => dpr.ConsentId)
            .HasDatabaseName("IX_DataPrivacyRequests_ConsentId");

        modelBuilder.Entity<DataPrivacyRequest>()
            .HasIndex(dpr => new { dpr.TenantId, dpr.RequestType, dpr.Status })
            .HasDatabaseName("IX_DataPrivacyRequests_Tenant_Type_Status");

        modelBuilder.Entity<DataPrivacyRequest>()
            .HasIndex(dpr => new { dpr.TenantId, dpr.DueDate })
            .HasDatabaseName("IX_DataPrivacyRequests_Tenant_DueDate");

        modelBuilder.Entity<DataPrivacyRequest>()
            .HasIndex(dpr => dpr.ProcessedBy)
            .HasDatabaseName("IX_DataPrivacyRequests_ProcessedBy");

        // Configure JSON columns
        modelBuilder.Entity<DataPrivacyRequest>()
            .Property(dpr => dpr.RequestData)
            .HasColumnType("jsonb");

        // DataPrivacyRequest relationships
        modelBuilder.Entity<DataPrivacyRequest>()
            .HasOne(dpr => dpr.Tenant)
            .WithMany()
            .HasForeignKey(dpr => dpr.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DataPrivacyRequest>()
            .HasOne(dpr => dpr.Consent)
            .WithMany(dpc => dpc.PrivacyRequests)
            .HasForeignKey(dpr => dpr.ConsentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DataPrivacyRequest>()
            .HasOne(dpr => dpr.ProcessedByUser)
            .WithMany()
            .HasForeignKey(dpr => dpr.ProcessedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // KoreanPoliticalTerm configuration
        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasIndex(kpt => kpt.TenantId)
            .HasDatabaseName("IX_KoreanPoliticalTerms_TenantId");

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasIndex(kpt => new { kpt.TenantId, kpt.Term })
            .HasDatabaseName("IX_KoreanPoliticalTerms_Tenant_Term");

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasIndex(kpt => new { kpt.TenantId, kpt.Category, kpt.IsActive })
            .HasDatabaseName("IX_KoreanPoliticalTerms_Tenant_Category_Active");

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasIndex(kpt => new { kpt.TenantId, kpt.LegalClassification, kpt.Severity })
            .HasDatabaseName("IX_KoreanPoliticalTerms_Tenant_Legal_Severity");

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasIndex(kpt => new { kpt.Dialect, kpt.FormalityLevel })
            .HasDatabaseName("IX_KoreanPoliticalTerms_Dialect_Formality");

        // Create GIN index for full-text search on Term
        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasIndex(kpt => kpt.Term)
            .HasDatabaseName("IX_KoreanPoliticalTerms_Term_GIN");

        // Configure JSON columns
        modelBuilder.Entity<KoreanPoliticalTerm>()
            .Property(kpt => kpt.TimingRestrictions)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .Property(kpt => kpt.Metadata)
            .HasColumnType("jsonb");

        // KoreanPoliticalTerm relationships
        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasOne(kpt => kpt.Tenant)
            .WithMany()
            .HasForeignKey(kpt => kpt.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasOne(kpt => kpt.CreatedByUser)
            .WithMany()
            .HasForeignKey(kpt => kpt.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KoreanPoliticalTerm>()
            .HasOne(kpt => kpt.UpdatedByUser)
            .WithMany()
            .HasForeignKey(kpt => kpt.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // PoliticalTermUsage configuration
        modelBuilder.Entity<PoliticalTermUsage>()
            .HasIndex(ptu => ptu.TenantId)
            .HasDatabaseName("IX_PoliticalTermUsages_TenantId");

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasIndex(ptu => ptu.TermId)
            .HasDatabaseName("IX_PoliticalTermUsages_TermId");

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasIndex(ptu => new { ptu.TenantId, ptu.Action, ptu.DetectedAt })
            .HasDatabaseName("IX_PoliticalTermUsages_Tenant_Action_Detected");

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasIndex(ptu => ptu.CampaignId)
            .HasDatabaseName("IX_PoliticalTermUsages_CampaignId");

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasIndex(ptu => ptu.UserId)
            .HasDatabaseName("IX_PoliticalTermUsages_UserId");

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasIndex(ptu => ptu.ViolationId)
            .HasDatabaseName("IX_PoliticalTermUsages_ViolationId");

        // PoliticalTermUsage relationships
        modelBuilder.Entity<PoliticalTermUsage>()
            .HasOne(ptu => ptu.Tenant)
            .WithMany()
            .HasForeignKey(ptu => ptu.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasOne(ptu => ptu.Term)
            .WithMany(kpt => kpt.UsageHistory)
            .HasForeignKey(ptu => ptu.TermId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasOne(ptu => ptu.Campaign)
            .WithMany()
            .HasForeignKey(ptu => ptu.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasOne(ptu => ptu.User)
            .WithMany()
            .HasForeignKey(ptu => ptu.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasOne(ptu => ptu.ApprovedByUser)
            .WithMany()
            .HasForeignKey(ptu => ptu.ApprovedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PoliticalTermUsage>()
            .HasOne(ptu => ptu.Violation)
            .WithMany()
            .HasForeignKey(ptu => ptu.ViolationId)
            .OnDelete(DeleteBehavior.SetNull);
    }

    private void ConfigureKoreanLanguageModels(ModelBuilder modelBuilder)
    {
        // KoreanDialectProfile configuration
        modelBuilder.Entity<KoreanDialectProfile>()
            .HasIndex(kdp => kdp.TenantId)
            .HasDatabaseName("IX_KoreanDialectProfiles_TenantId");

        modelBuilder.Entity<KoreanDialectProfile>()
            .HasIndex(kdp => new { kdp.TenantId, kdp.DialectCode })
            .IsUnique()
            .HasDatabaseName("IX_KoreanDialectProfiles_Tenant_DialectCode");

        modelBuilder.Entity<KoreanDialectProfile>()
            .HasIndex(kdp => new { kdp.TenantId, kdp.IsActive })
            .HasDatabaseName("IX_KoreanDialectProfiles_Tenant_Active");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<KoreanDialectProfile>()
            .Property(kdp => kdp.PhoneticCharacteristics)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanDialectProfile>()
            .Property(kdp => kdp.ConversionRules)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanDialectProfile>()
            .Property(kdp => kdp.CulturalMarkers)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanDialectProfile>()
            .Property(kdp => kdp.RegionalIssues)
            .HasColumnType("jsonb");

        // KoreanDialectProfile relationships
        modelBuilder.Entity<KoreanDialectProfile>()
            .HasOne(kdp => kdp.Tenant)
            .WithMany()
            .HasForeignKey(kdp => kdp.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KoreanDialectProfile>()
            .HasOne(kdp => kdp.CreatedByUser)
            .WithMany()
            .HasForeignKey(kdp => kdp.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KoreanDialectProfile>()
            .HasOne(kdp => kdp.UpdatedByUser)
            .WithMany()
            .HasForeignKey(kdp => kdp.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // HonorificContext configuration
        modelBuilder.Entity<HonorificContext>()
            .HasIndex(hc => hc.TenantId)
            .HasDatabaseName("IX_HonorificContexts_TenantId");

        modelBuilder.Entity<HonorificContext>()
            .HasIndex(hc => new { hc.TenantId, hc.HonorificCode })
            .IsUnique()
            .HasDatabaseName("IX_HonorificContexts_Tenant_HonorificCode");

        modelBuilder.Entity<HonorificContext>()
            .HasIndex(hc => new { hc.TenantId, hc.FormalityLevel })
            .HasDatabaseName("IX_HonorificContexts_Tenant_FormalityLevel");

        modelBuilder.Entity<HonorificContext>()
            .HasIndex(hc => new { hc.TenantId, hc.IsActive })
            .HasDatabaseName("IX_HonorificContexts_Tenant_Active");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<HonorificContext>()
            .Property(hc => hc.UsageRules)
            .HasColumnType("jsonb");

        modelBuilder.Entity<HonorificContext>()
            .Property(hc => hc.ContextRules)
            .HasColumnType("jsonb");

        modelBuilder.Entity<HonorificContext>()
            .Property(hc => hc.ConversionPatterns)
            .HasColumnType("jsonb");

        // HonorificContext relationships
        modelBuilder.Entity<HonorificContext>()
            .HasOne(hc => hc.Tenant)
            .WithMany()
            .HasForeignKey(hc => hc.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HonorificContext>()
            .HasOne(hc => hc.CreatedByUser)
            .WithMany()
            .HasForeignKey(hc => hc.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HonorificContext>()
            .HasOne(hc => hc.UpdatedByUser)
            .WithMany()
            .HasForeignKey(hc => hc.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // PoliticalTerminology configuration
        modelBuilder.Entity<PoliticalTerminology>()
            .HasIndex(pt => pt.TenantId)
            .HasDatabaseName("IX_PoliticalTerminologies_TenantId");

        modelBuilder.Entity<PoliticalTerminology>()
            .HasIndex(pt => new { pt.TenantId, pt.Term })
            .HasDatabaseName("IX_PoliticalTerminologies_Tenant_Term");

        modelBuilder.Entity<PoliticalTerminology>()
            .HasIndex(pt => new { pt.TenantId, pt.Category })
            .HasDatabaseName("IX_PoliticalTerminologies_Tenant_Category");

        modelBuilder.Entity<PoliticalTerminology>()
            .HasIndex(pt => new { pt.TenantId, pt.ComplianceLevel })
            .HasDatabaseName("IX_PoliticalTerminologies_Tenant_ComplianceLevel");

        modelBuilder.Entity<PoliticalTerminology>()
            .HasIndex(pt => new { pt.TenantId, pt.IsActive })
            .HasDatabaseName("IX_PoliticalTerminologies_Tenant_Active");

        // Create GIN index for full-text search on Term
        modelBuilder.Entity<PoliticalTerminology>()
            .HasIndex(pt => pt.Term)
            .HasDatabaseName("IX_PoliticalTerminologies_Term_GIN");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<PoliticalTerminology>()
            .Property(pt => pt.Metadata)
            .HasColumnType("jsonb");

        modelBuilder.Entity<PoliticalTerminology>()
            .Property(pt => pt.AlternativeTerms)
            .HasColumnType("jsonb");

        modelBuilder.Entity<PoliticalTerminology>()
            .Property(pt => pt.ContextRestrictions)
            .HasColumnType("jsonb");

        // PoliticalTerminology relationships
        modelBuilder.Entity<PoliticalTerminology>()
            .HasOne(pt => pt.Tenant)
            .WithMany()
            .HasForeignKey(pt => pt.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PoliticalTerminology>()
            .HasOne(pt => pt.CreatedByUser)
            .WithMany()
            .HasForeignKey(pt => pt.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PoliticalTerminology>()
            .HasOne(pt => pt.UpdatedByUser)
            .WithMany()
            .HasForeignKey(pt => pt.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // CulturalSensitivityRule configuration
        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasIndex(csr => csr.TenantId)
            .HasDatabaseName("IX_CulturalSensitivityRules_TenantId");

        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasIndex(csr => new { csr.TenantId, csr.RuleCode })
            .IsUnique()
            .HasDatabaseName("IX_CulturalSensitivityRules_Tenant_RuleCode");

        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasIndex(csr => new { csr.TenantId, csr.Category })
            .HasDatabaseName("IX_CulturalSensitivityRules_Tenant_Category");

        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasIndex(csr => new { csr.TenantId, csr.Severity })
            .HasDatabaseName("IX_CulturalSensitivityRules_Tenant_Severity");

        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasIndex(csr => new { csr.TenantId, csr.IsActive })
            .HasDatabaseName("IX_CulturalSensitivityRules_Tenant_Active");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<CulturalSensitivityRule>()
            .Property(csr => csr.ValidationPatterns)
            .HasColumnType("jsonb");

        modelBuilder.Entity<CulturalSensitivityRule>()
            .Property(csr => csr.ContextualFactors)
            .HasColumnType("jsonb");

        // CulturalSensitivityRule relationships
        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasOne(csr => csr.Tenant)
            .WithMany()
            .HasForeignKey(csr => csr.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasOne(csr => csr.CreatedByUser)
            .WithMany()
            .HasForeignKey(csr => csr.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CulturalSensitivityRule>()
            .HasOne(csr => csr.UpdatedByUser)
            .WithMany()
            .HasForeignKey(csr => csr.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);

        // LanguagePersonalizationResult configuration
        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasIndex(lpr => lpr.TenantId)
            .HasDatabaseName("IX_LanguagePersonalizationResults_TenantId");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasIndex(lpr => lpr.CampaignId)
            .HasDatabaseName("IX_LanguagePersonalizationResults_CampaignId");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasIndex(lpr => lpr.ContactId)
            .HasDatabaseName("IX_LanguagePersonalizationResults_ContactId");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasIndex(lpr => new { lpr.TenantId, lpr.ProcessedAt })
            .HasDatabaseName("IX_LanguagePersonalizationResults_Tenant_ProcessedAt");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasIndex(lpr => new { lpr.TenantId, lpr.SourceDialect, lpr.TargetDialect })
            .HasDatabaseName("IX_LanguagePersonalizationResults_Tenant_Dialect_Conversion");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasIndex(lpr => new { lpr.TenantId, lpr.QualityScore })
            .HasDatabaseName("IX_LanguagePersonalizationResults_Tenant_QualityScore");

        // Configure decimal precision
        modelBuilder.Entity<LanguagePersonalizationResult>()
            .Property(lpr => lpr.QualityScore)
            .HasPrecision(5, 4);

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .Property(lpr => lpr.ConfidenceScore)
            .HasPrecision(5, 4);

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<LanguagePersonalizationResult>()
            .Property(lpr => lpr.ProcessingMetadata)
            .HasColumnType("jsonb");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .Property(lpr => lpr.ValidationResults)
            .HasColumnType("jsonb");

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .Property(lpr => lpr.CulturalContext)
            .HasColumnType("jsonb");

        // LanguagePersonalizationResult relationships
        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasOne(lpr => lpr.Tenant)
            .WithMany()
            .HasForeignKey(lpr => lpr.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasOne(lpr => lpr.Campaign)
            .WithMany()
            .HasForeignKey(lpr => lpr.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LanguagePersonalizationResult>()
            .HasOne(lpr => lpr.Contact)
            .WithMany()
            .HasForeignKey(lpr => lpr.ContactId)
            .OnDelete(DeleteBehavior.SetNull);

        // KoreanMorphologicalAnalysis configuration
        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .HasIndex(kma => kma.TenantId)
            .HasDatabaseName("IX_KoreanMorphologicalAnalyses_TenantId");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .HasIndex(kma => new { kma.TenantId, kma.AnalyzedAt })
            .HasDatabaseName("IX_KoreanMorphologicalAnalyses_Tenant_AnalyzedAt");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .HasIndex(kma => new { kma.TenantId, kma.TextHash })
            .HasDatabaseName("IX_KoreanMorphologicalAnalyses_Tenant_TextHash");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .HasIndex(kma => kma.LanguagePersonalizationResultId)
            .HasDatabaseName("IX_KoreanMorphologicalAnalyses_PersonalizationResult");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .Property(kma => kma.MorphemeBreakdown)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .Property(kma => kma.PosTagging)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .Property(kma => kma.SemanticRoles)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .Property(kma => kma.SyntacticStructure)
            .HasColumnType("jsonb");

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .Property(kma => kma.LinguisticFeatures)
            .HasColumnType("jsonb");

        // KoreanMorphologicalAnalysis relationships
        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .HasOne(kma => kma.Tenant)
            .WithMany()
            .HasForeignKey(kma => kma.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KoreanMorphologicalAnalysis>()
            .HasOne(kma => kma.LanguagePersonalizationResult)
            .WithMany()
            .HasForeignKey(kma => kma.LanguagePersonalizationResultId)
            .OnDelete(DeleteBehavior.SetNull);

        // GenerationalPreferences configuration
        modelBuilder.Entity<GenerationalPreferences>()
            .HasIndex(gp => gp.TenantId)
            .HasDatabaseName("IX_GenerationalPreferences_TenantId");

        modelBuilder.Entity<GenerationalPreferences>()
            .HasIndex(gp => new { gp.TenantId, gp.GenerationCode })
            .IsUnique()
            .HasDatabaseName("IX_GenerationalPreferences_Tenant_GenerationCode");

        modelBuilder.Entity<GenerationalPreferences>()
            .HasIndex(gp => new { gp.TenantId, gp.AgeRange })
            .HasDatabaseName("IX_GenerationalPreferences_Tenant_AgeRange");

        modelBuilder.Entity<GenerationalPreferences>()
            .HasIndex(gp => new { gp.TenantId, gp.IsActive })
            .HasDatabaseName("IX_GenerationalPreferences_Tenant_Active");

        // Configure JSON columns for PostgreSQL
        modelBuilder.Entity<GenerationalPreferences>()
            .Property(gp => gp.LanguagePatterns)
            .HasColumnType("jsonb");

        modelBuilder.Entity<GenerationalPreferences>()
            .Property(gp => gp.CommunicationStyles)
            .HasColumnType("jsonb");

        modelBuilder.Entity<GenerationalPreferences>()
            .Property(gp => gp.CulturalReferences)
            .HasColumnType("jsonb");

        modelBuilder.Entity<GenerationalPreferences>()
            .Property(gp => gp.PreferredTopics)
            .HasColumnType("jsonb");

        modelBuilder.Entity<GenerationalPreferences>()
            .Property(gp => gp.AvoidedTopics)
            .HasColumnType("jsonb");

        // GenerationalPreferences relationships
        modelBuilder.Entity<GenerationalPreferences>()
            .HasOne(gp => gp.Tenant)
            .WithMany()
            .HasForeignKey(gp => gp.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GenerationalPreferences>()
            .HasOne(gp => gp.CreatedByUser)
            .WithMany()
            .HasForeignKey(gp => gp.CreatedBy)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GenerationalPreferences>()
            .HasOne(gp => gp.UpdatedByUser)
            .WithMany()
            .HasForeignKey(gp => gp.UpdatedBy)
            .OnDelete(DeleteBehavior.SetNull);
    }
}