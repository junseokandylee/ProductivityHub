-- AnalyticsDataModelExtension Migration
-- Granular campaign event tracking with PostgreSQL partitioning, A/B testing, and cost tracking
-- Created: 2025-09-01

-- ==================================================
-- 1. CREATE EVENT TYPE ENUM
-- ==================================================
DO $$ BEGIN
    CREATE TYPE event_type AS ENUM (
        'Sent',
        'Delivered', 
        'Opened',
        'Clicked',
        'Failed',
        'Unsubscribed',
        'Bounced',
        'SpamReport'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==================================================
-- 2. CAMPAIGN VARIANTS TABLE (A/B Testing)
-- ==================================================
CREATE TABLE IF NOT EXISTS campaign_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    label varchar(10) NOT NULL,
    description varchar(200),
    allocation_percentage numeric(5,2) NOT NULL DEFAULT 50.0,
    message_content varchar(500),
    subject_line varchar(200),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT ck_campaign_variants_allocation CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
);

-- Campaign variants indexes
CREATE INDEX IF NOT EXISTS ix_campaign_variants_tenant_campaign 
    ON campaign_variants (tenant_id, campaign_id);

CREATE UNIQUE INDEX IF NOT EXISTS ix_campaign_variants_campaign_label 
    ON campaign_variants (campaign_id, label);

-- ==================================================
-- 3. CAMPAIGN EVENTS PARTITIONED TABLE
-- ==================================================

-- Create the parent table (partitioned by occurred_at)
CREATE TABLE IF NOT EXISTS campaign_events (
    id bigserial,
    tenant_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    channel text NOT NULL CHECK (channel IN ('sms', 'kakao')),
    event_type event_type NOT NULL,
    occurred_at timestamptz NOT NULL,
    provider_message_id text,
    failure_reason text,
    failure_code text,
    ab_group text,
    cost_amount numeric(12,4) DEFAULT 0,
    currency text DEFAULT 'KRW',
    meta jsonb DEFAULT '{}',
    ip inet,
    user_agent_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    PRIMARY KEY (id, occurred_at),
    
    -- Foreign key constraints
    CONSTRAINT fk_campaign_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_campaign_events_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_campaign_events_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT ck_campaign_events_channel CHECK (channel IN ('sms', 'kakao')),
    CONSTRAINT ck_campaign_events_cost CHECK (cost_amount >= 0),
    CONSTRAINT ck_campaign_events_currency CHECK (currency IN ('KRW', 'USD', 'EUR'))
) PARTITION BY RANGE (occurred_at);

-- ==================================================
-- 4. CREATE MONTHLY PARTITIONS (for the next 2 years)
-- ==================================================

-- Create partitions for 2025
CREATE TABLE IF NOT EXISTS campaign_events_2025_01 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_02 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_03 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_04 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_05 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_06 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_07 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_08 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_09 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_10 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_11 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS campaign_events_2025_12 PARTITION OF campaign_events
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Create partitions for 2026 
CREATE TABLE IF NOT EXISTS campaign_events_2026_01 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_02 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_03 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_04 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_05 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_06 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_07 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_08 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_09 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_10 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_11 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS campaign_events_2026_12 PARTITION OF campaign_events
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Default partition for safety (future dates)
CREATE TABLE IF NOT EXISTS campaign_events_default PARTITION OF campaign_events DEFAULT;

-- ==================================================
-- 5. CAMPAIGN EVENTS INDEXES 
-- ==================================================

-- Primary composite index for tenant/campaign/type/time queries
CREATE INDEX IF NOT EXISTS ix_campaign_events_tenant_campaign_type_time 
    ON campaign_events (tenant_id, campaign_id, event_type, occurred_at DESC);

-- Time-based queries by tenant
CREATE INDEX IF NOT EXISTS ix_campaign_events_tenant_time 
    ON campaign_events (tenant_id, occurred_at DESC);

-- Contact-specific event tracking
CREATE INDEX IF NOT EXISTS ix_campaign_events_contact_time 
    ON campaign_events (contact_id, occurred_at DESC);

-- A/B group analysis
CREATE INDEX IF NOT EXISTS ix_campaign_events_ab_group 
    ON campaign_events (tenant_id, campaign_id, ab_group, event_type) 
    WHERE ab_group IS NOT NULL;

-- Cost tracking queries
CREATE INDEX IF NOT EXISTS ix_campaign_events_cost 
    ON campaign_events (tenant_id, campaign_id, occurred_at DESC) 
    WHERE cost_amount > 0;

-- Partial indexes for common event types (performance optimization)
CREATE INDEX IF NOT EXISTS ix_campaign_events_delivered 
    ON campaign_events (tenant_id, campaign_id, occurred_at DESC) 
    WHERE event_type = 'Delivered';

CREATE INDEX IF NOT EXISTS ix_campaign_events_opened 
    ON campaign_events (tenant_id, campaign_id, occurred_at DESC) 
    WHERE event_type = 'Opened';

CREATE INDEX IF NOT EXISTS ix_campaign_events_clicked 
    ON campaign_events (tenant_id, campaign_id, occurred_at DESC) 
    WHERE event_type = 'Clicked';

CREATE INDEX IF NOT EXISTS ix_campaign_events_failed 
    ON campaign_events (tenant_id, campaign_id, occurred_at DESC) 
    WHERE event_type = 'Failed';

-- GIN index for metadata searches (provider-specific data)
CREATE INDEX IF NOT EXISTS ix_campaign_events_meta_gin 
    ON campaign_events USING gin (meta);

-- Provider message ID lookup
CREATE INDEX IF NOT EXISTS ix_campaign_events_provider_msg_id 
    ON campaign_events (provider_message_id) 
    WHERE provider_message_id IS NOT NULL;

-- ==================================================
-- 6. LINK CLICKS TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS link_clicks (
    id bigserial PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    event_id bigint NOT NULL, -- References campaign_events(id) but cannot use FK due to partitioning
    url text NOT NULL,
    link_label text,
    ip inet,
    user_agent_hash text,
    referrer text,
    clicked_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT ck_link_clicks_url_length CHECK (char_length(url) <= 2048)
);

-- Link clicks indexes
CREATE INDEX IF NOT EXISTS ix_link_clicks_tenant_campaign_time 
    ON link_clicks (tenant_id, campaign_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS ix_link_clicks_event_id 
    ON link_clicks (event_id);

CREATE INDEX IF NOT EXISTS ix_link_clicks_contact_time 
    ON link_clicks (contact_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS ix_link_clicks_url 
    ON link_clicks (tenant_id, campaign_id, url);

-- ==================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on campaign_variants
ALTER TABLE campaign_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tenant_isolation_campaign_variants 
    ON campaign_variants 
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Enable RLS on campaign_events
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tenant_isolation_campaign_events 
    ON campaign_events 
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Enable RLS on link_clicks
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tenant_isolation_link_clicks 
    ON link_clicks 
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ==================================================
-- 8. CREATE FUNCTIONS FOR AUTOMATED PARTITION MANAGEMENT
-- ==================================================

-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_campaign_events_partition(start_date date)
RETURNS void AS $$
DECLARE
    table_name text;
    end_date date;
BEGIN
    table_name := 'campaign_events_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF campaign_events
         FOR VALUES FROM (%L) TO (%L)',
        table_name, start_date, end_date
    );
    
    -- Create BRIN index for time-based queries on the partition
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON %I USING brin (occurred_at)',
        table_name || '_occurred_at_brin', table_name
    );
    
    RAISE NOTICE 'Created partition % for date range % to %', table_name, start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION ensure_campaign_events_partitions()
RETURNS void AS $$
DECLARE
    next_month date;
BEGIN
    -- Create partition for next month
    next_month := date_trunc('month', CURRENT_DATE + interval '1 month');
    PERFORM create_campaign_events_partition(next_month);
    
    -- Create partition for month after that (buffer)
    next_month := date_trunc('month', CURRENT_DATE + interval '2 months');
    PERFORM create_campaign_events_partition(next_month);
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 9. CREATE AGGREGATION VIEWS FOR PERFORMANCE
-- ==================================================

-- Campaign funnel metrics view
CREATE OR REPLACE VIEW campaign_funnel_metrics AS
SELECT 
    ce.tenant_id,
    ce.campaign_id,
    ce.channel,
    ce.ab_group,
    COUNT(*) FILTER (WHERE ce.event_type = 'Sent') as sent_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Delivered') as delivered_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Opened') as opened_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Clicked') as clicked_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Failed') as failed_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Unsubscribed') as unsubscribed_count,
    SUM(ce.cost_amount) as total_cost,
    MIN(ce.occurred_at) as campaign_start,
    MAX(ce.occurred_at) as campaign_end,
    COUNT(DISTINCT ce.contact_id) as unique_recipients
FROM campaign_events ce
GROUP BY ce.tenant_id, ce.campaign_id, ce.channel, ce.ab_group;

-- Hourly campaign metrics view
CREATE OR REPLACE VIEW campaign_hourly_metrics AS
SELECT 
    ce.tenant_id,
    ce.campaign_id,
    ce.channel,
    date_trunc('hour', ce.occurred_at) as hour_bucket,
    COUNT(*) FILTER (WHERE ce.event_type = 'Sent') as sent_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Delivered') as delivered_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Opened') as opened_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Clicked') as clicked_count,
    COUNT(*) FILTER (WHERE ce.event_type = 'Failed') as failed_count,
    SUM(ce.cost_amount) as hourly_cost
FROM campaign_events ce
WHERE ce.occurred_at >= CURRENT_DATE - interval '30 days'
GROUP BY ce.tenant_id, ce.campaign_id, ce.channel, date_trunc('hour', ce.occurred_at);

-- ==================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ==================================================

COMMENT ON TABLE campaign_variants IS 'A/B testing variants for campaigns with allocation percentages';
COMMENT ON TABLE campaign_events IS 'Granular campaign event tracking partitioned by occurred_at for performance';
COMMENT ON TABLE link_clicks IS 'Detailed link click tracking for campaign analytics';

COMMENT ON COLUMN campaign_events.occurred_at IS 'Partition key - monthly partitions for performance';
COMMENT ON COLUMN campaign_events.ab_group IS 'A/B test group identifier (A, B, Control, etc.)';
COMMENT ON COLUMN campaign_events.cost_amount IS 'Per-event cost in specified currency';
COMMENT ON COLUMN campaign_events.meta IS 'JSONB metadata from provider (encrypted sensitive data)';
COMMENT ON COLUMN campaign_events.user_agent_hash IS 'Hashed user agent for privacy';

-- ==================================================
-- 11. GRANT PERMISSIONS
-- ==================================================

-- Grant permissions to application role (assuming it exists)
-- These would be customized based on your specific role setup
-- GRANT SELECT, INSERT, UPDATE ON campaign_variants TO app_role;
-- GRANT SELECT, INSERT, UPDATE ON campaign_events TO app_role;  
-- GRANT SELECT, INSERT, UPDATE ON link_clicks TO app_role;

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Analytics Data Model Extension migration completed successfully';
    RAISE NOTICE 'Created tables: campaign_variants, campaign_events (partitioned), link_clicks';  
    RAISE NOTICE 'Created % monthly partitions for campaign_events', 24;
    RAISE NOTICE 'Enabled RLS policies for tenant isolation';
    RAISE NOTICE 'Created performance indexes and aggregation views';
END $$;