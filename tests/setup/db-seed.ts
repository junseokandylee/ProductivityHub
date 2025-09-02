import { generateFullTestDataset } from './data-seed'

/**
 * Database seeding utility for analytics testing
 * Populates the PostgreSQL database with realistic test data
 */

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || '5432'
const DB_NAME = process.env.DB_NAME || 'productivityhub'
const DB_USER = process.env.DB_USER || 'postgres'
const DB_PASSWORD = process.env.DB_PASSWORD || 'password'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

/**
 * SQL query builders for inserting test data
 */
class DatabaseSeeder {
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  /**
   * Generate SQL INSERT statements for test data
   */
  generateInsertStatements() {
    console.log('🌱 Generating test dataset...')
    const dataset = generateFullTestDataset()
    
    const statements: string[] = []

    // Insert tenants
    console.log('📝 Preparing tenant inserts...')
    const tenantInserts = dataset.tenants.map(tenant => 
      `INSERT INTO tenants (id, name, slug, created_at) VALUES (
        '${tenant.id}',
        '${this.escapeString(tenant.name)}',
        '${tenant.slug}',
        '${tenant.createdAt.toISOString()}'
      );`
    )
    statements.push(...tenantInserts)

    // Insert users
    console.log('📝 Preparing user inserts...')
    const userInserts = dataset.users.map(user => 
      `INSERT INTO users (id, tenant_id, email, full_name, role, created_at) VALUES (
        '${user.id}',
        '${user.tenantId}',
        '${this.escapeString(user.email)}',
        '${this.escapeString(user.fullName)}',
        '${user.role}',
        '${user.createdAt.toISOString()}'
      );`
    )
    statements.push(...userInserts)

    // Insert contacts (batch processing for large datasets)
    console.log('📝 Preparing contact inserts (this may take a while)...')
    const contactBatches = this.chunkArray(dataset.contacts, 1000)
    contactBatches.forEach((batch, batchIndex) => {
      console.log(`  Processing contact batch ${batchIndex + 1}/${contactBatches.length}`)
      const batchInserts = batch.map(contact => 
        `INSERT INTO contacts (id, tenant_id, full_name, phone_enc, phone_hash, email_enc, email_hash, kakao_enc, kakao_hash, is_active, created_at, updated_at) VALUES (
          '${contact.id}',
          '${contact.tenantId}',
          '${this.escapeString(contact.fullName)}',
          encode('${this.escapeString(contact.phone)}', 'base64'),
          decode(md5('${this.escapeString(contact.phone)}'), 'hex'),
          encode('${this.escapeString(contact.email)}', 'base64'),
          decode(md5('${this.escapeString(contact.email)}'), 'hex'),
          encode('${this.escapeString(contact.kakaoId)}', 'base64'),
          decode(md5('${this.escapeString(contact.kakaoId)}'), 'hex'),
          ${contact.isActive},
          '${contact.createdAt.toISOString()}',
          '${contact.updatedAt.toISOString()}'
        );`
      )
      statements.push(...batchInserts)
    })

    // Insert campaigns
    console.log('📝 Preparing campaign inserts...')
    const campaignInserts = dataset.campaigns.map(campaign => 
      `INSERT INTO campaigns (id, tenant_id, name, message_title, message_body, status, scheduled_at, started_at, completed_at, estimated_recipients, estimated_cost, sent_count, success_count, failed_count, created_at, created_by, updated_at) VALUES (
        '${campaign.id}',
        '${campaign.tenantId}',
        '${this.escapeString(campaign.name)}',
        '${this.escapeString(campaign.messageTitle)}',
        '${this.escapeString(campaign.messageBody)}',
        ${campaign.status},
        ${campaign.scheduledAt ? `'${campaign.scheduledAt.toISOString()}'` : 'NULL'},
        ${campaign.startedAt ? `'${campaign.startedAt.toISOString()}'` : 'NULL'},
        ${campaign.completedAt ? `'${campaign.completedAt.toISOString()}'` : 'NULL'},
        ${campaign.estimatedRecipients},
        ${campaign.estimatedCost},
        ${campaign.sentCount},
        ${campaign.successCount},
        ${campaign.failedCount},
        '${campaign.createdAt.toISOString()}',
        '${campaign.createdBy}',
        '${campaign.createdAt.toISOString()}'
      );`
    )
    statements.push(...campaignInserts)

    // Insert campaign events (batch processing for millions of records)
    console.log('📝 Preparing campaign event inserts (large dataset)...')
    const eventBatches = this.chunkArray(dataset.events, 5000)
    eventBatches.forEach((batch, batchIndex) => {
      console.log(`  Processing event batch ${batchIndex + 1}/${eventBatches.length}`)
      const batchInserts = batch.map(event => 
        `INSERT INTO campaign_events (id, tenant_id, campaign_id, contact_id, channel, event_type, occurred_at, provider_message_id, failure_reason, failure_code, ab_group, cost_amount, currency, user_agent_hash, created_at) VALUES (
          ${event.id},
          '${event.tenantId}',
          '${event.campaignId}',
          '${event.contactId}',
          '${event.channel}',
          ${event.eventType},
          '${event.occurredAt.toISOString()}',
          ${event.providerMessageId ? `'${event.providerMessageId}'` : 'NULL'},
          ${event.failureReason ? `'${this.escapeString(event.failureReason)}'` : 'NULL'},
          ${event.failureCode ? `'${event.failureCode}'` : 'NULL'},
          ${event.abGroup ? `'${event.abGroup}'` : 'NULL'},
          ${event.costAmount},
          '${event.currency}',
          ${event.userAgentHash ? `'${event.userAgentHash}'` : 'NULL'},
          '${event.createdAt.toISOString()}'
        );`
      )
      statements.push(...batchInserts)
    })

    console.log(`✅ Generated ${statements.length} SQL statements`)
    console.log('📊 Dataset summary:', dataset.stats)

    return {
      statements,
      dataset,
      stats: dataset.stats
    }
  }

  /**
   * Write SQL statements to file for manual execution
   */
  async writeToSqlFile(filename: string = 'test-data-seed.sql'): Promise<void> {
    const { statements, stats } = this.generateInsertStatements()
    
    const header = `-- Analytics Test Data Seed
-- Generated: ${new Date().toISOString()}
-- Stats: ${JSON.stringify(stats, null, 2)}
--
-- WARNING: This will add large amounts of test data
-- Run this against a test database only!

-- Disable foreign key checks for faster insertion
SET session_replication_role = replica;

BEGIN;

`

    const footer = `
-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

COMMIT;

-- Analyze tables for better query planning after bulk insert
ANALYZE tenants;
ANALYZE users;
ANALYZE contacts; 
ANALYZE campaigns;
ANALYZE campaign_events;

-- Update sequences to prevent conflicts
SELECT setval('campaign_events_id_seq', (SELECT MAX(id) FROM campaign_events));
`

    const fullSql = header + statements.join('\n') + footer

    // Write to file
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const filePath = path.join(process.cwd(), 'tests', 'setup', filename)
    await fs.writeFile(filePath, fullSql, 'utf8')
    
    console.log(`📄 SQL seed file written to: ${filePath}`)
    console.log(`📈 File size: ${(fullSql.length / 1024 / 1024).toFixed(2)} MB`)
    console.log(`🔢 Contains ${statements.length} SQL statements`)
  }

  /**
   * Generate REST API calls for seeding via backend API
   */
  async generateApiCalls(): Promise<Array<{ method: string; url: string; data: any }>> {
    console.log('🌐 Generating API calls for backend seeding...')
    const dataset = generateFullTestDataset()
    
    const calls: Array<{ method: string; url: string; data: any }> = []

    // Note: This would require authentication and proper API endpoints
    // For now, we'll generate the structure
    
    // Tenant creation calls
    dataset.tenants.forEach(tenant => {
      calls.push({
        method: 'POST',
        url: '/api/admin/tenants',
        data: {
          name: tenant.name,
          slug: tenant.slug
        }
      })
    })

    // Contact bulk import calls (in batches)
    dataset.tenants.forEach(tenant => {
      const tenantContacts = dataset.contacts.filter(c => c.tenantId === tenant.id)
      const batches = this.chunkArray(tenantContacts, 10000)
      
      batches.forEach(batch => {
        calls.push({
          method: 'POST',
          url: `/api/contacts/bulk-import`,
          data: {
            contacts: batch.map(c => ({
              fullName: c.fullName,
              phone: c.phone,
              email: c.email,
              kakaoId: c.kakaoId
            }))
          }
        })
      })
    })

    console.log(`🔗 Generated ${calls.length} API calls`)
    return calls
  }

  /**
   * Utility methods
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * CLI interface for database seeding
 */
async function main() {
  const config: DatabaseConfig = {
    host: DB_HOST,
    port: parseInt(DB_PORT),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD
  }

  const seeder = new DatabaseSeeder(config)

  try {
    // Generate SQL file
    await seeder.writeToSqlFile('analytics-test-data.sql')
    
    console.log('\n✅ Test data generation complete!')
    console.log('\n📋 Next steps:')
    console.log('  1. Review the generated SQL file: tests/setup/analytics-test-data.sql')
    console.log('  2. Run against your test database: psql -d productivityhub -f tests/setup/analytics-test-data.sql')
    console.log('  3. Verify data was inserted correctly')
    console.log('\n⚠️  WARNING: This adds large amounts of test data - only run against test databases!')
    
  } catch (error) {
    console.error('❌ Error generating test data:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { DatabaseSeeder }