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
        
        // Ignore analytics models for in-memory database due to JsonDocument limitations
        if (Database.IsInMemory())
        {
            modelBuilder.Ignore<CampaignEvent>();
            modelBuilder.Ignore<CampaignVariant>();
            modelBuilder.Ignore<LinkClick>();
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
}