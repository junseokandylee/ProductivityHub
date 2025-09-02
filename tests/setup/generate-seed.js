import { faker } from '@faker-js/faker'
import fs from 'fs/promises'
import path from 'path'

/**
 * Simple test data seeding script for analytics testing
 * Generates realistic datasets with large volumes for performance testing
 */

// Event types matching backend enum
const EventType = {
  Sent: 0,
  Delivered: 1,
  Opened: 2,
  Clicked: 3,
  Failed: 4,
  Unsubscribed: 5,
  Bounced: 6,
  SpamReport: 7
}

const CHANNELS = ['sms', 'kakao', 'email', 'push', 'web', 'social']
const AB_GROUPS = ['A', 'B', 'C']

function generateTestTenants(count = 3) {
  faker.seed(12345) // Consistent data
  const tenants = []
  
  for (let i = 0; i < count; i++) {
    const companyName = faker.company.name()
    tenants.push({
      id: faker.string.uuid(),
      name: companyName,
      slug: faker.helpers.slugify(companyName).toLowerCase(),
      createdAt: faker.date.between({ from: '2024-01-01', to: '2024-12-01' })
    })
  }
  
  return tenants
}

function generateTestUsers(tenants) {
  const users = []
  
  tenants.forEach(tenant => {
    const roles = ['Owner', 'Admin', 'Staff']
    
    roles.forEach(role => {
      users.push({
        id: faker.string.uuid(),
        tenantId: tenant.id,
        email: faker.internet.email(),
        fullName: faker.person.fullName(),
        role,
        createdAt: faker.date.between({ from: tenant.createdAt, to: new Date() })
      })
    })
    
    // Add additional staff
    for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++) {
      users.push({
        id: faker.string.uuid(),
        tenantId: tenant.id,
        email: faker.internet.email(),
        fullName: faker.person.fullName(),
        role: 'Staff',
        createdAt: faker.date.between({ from: tenant.createdAt, to: new Date() })
      })
    }
  })
  
  return users
}

function generateTestContacts(tenants, contactsPerTenant = 10000) {
  const contacts = []
  
  console.log(`Generating ${contactsPerTenant} contacts per tenant...`)
  
  tenants.forEach((tenant, tenantIndex) => {
    console.log(`  Processing tenant ${tenantIndex + 1}/${tenants.length}: ${tenant.name}`)
    
    for (let i = 0; i < contactsPerTenant; i++) {
      const createdAt = faker.date.between({ from: tenant.createdAt, to: new Date() })
      contacts.push({
        id: faker.string.uuid(),
        tenantId: tenant.id,
        fullName: faker.person.fullName(),
        phone: faker.phone.number('+82-10-####-####'),
        email: faker.internet.email(),
        kakaoId: `kakao_${faker.string.alphanumeric(8)}`,
        isActive: faker.datatype.boolean(0.95),
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() })
      })
    }
  })
  
  return contacts
}

function generateTestCampaigns(tenants, users) {
  const campaigns = []
  
  tenants.forEach(tenant => {
    const tenantUsers = users.filter(u => u.tenantId === tenant.id)
    const campaignCount = faker.number.int({ min: 5, max: 20 })
    
    for (let i = 0; i < campaignCount; i++) {
      const createdAt = faker.date.between({ from: tenant.createdAt, to: new Date() })
      const estimatedRecipients = faker.number.int({ min: 100, max: 10000 })
      const estimatedCost = estimatedRecipients * faker.number.float({ min: 0.05, max: 0.15 })
      
      const campaign = {
        id: faker.string.uuid(),
        tenantId: tenant.id,
        name: `Campaign ${faker.company.catchPhrase()}`,
        messageTitle: faker.lorem.sentence(),
        messageBody: faker.lorem.paragraphs(2),
        status: faker.number.int({ min: 0, max: 7 }), // CampaignStatus enum
        estimatedRecipients,
        estimatedCost,
        sentCount: 0,
        successCount: 0,
        failedCount: 0,
        createdAt,
        createdBy: faker.helpers.arrayElement(tenantUsers).id,
        // 30% have A/B tests
        hasAbTest: faker.datatype.boolean(0.3)
      }
      
      campaigns.push(campaign)
    }
  })
  
  return campaigns
}

function generateTestEvents(campaigns, contacts, eventsPerCampaign = 2000) {
  const events = []
  let eventId = 1
  
  console.log(`Generating events for ${campaigns.length} campaigns...`)
  
  campaigns.forEach((campaign, campaignIndex) => {
    if (campaignIndex % 10 === 0) {
      console.log(`  Processing campaign ${campaignIndex + 1}/${campaigns.length}`)
    }
    
    const tenantContacts = contacts.filter(c => c.tenantId === campaign.tenantId)
    const selectedContacts = faker.helpers.arrayElements(
      tenantContacts, 
      Math.min(eventsPerCampaign, tenantContacts.length)
    )
    
    selectedContacts.forEach(contact => {
      const channel = faker.helpers.arrayElement(CHANNELS)
      const baseCost = getChannelBaseCost(channel)
      const occurredAt = campaign.createdAt
      
      // Always create a "Sent" event
      const sentEvent = {
        id: eventId++,
        tenantId: campaign.tenantId,
        campaignId: campaign.id,
        contactId: contact.id,
        channel,
        eventType: EventType.Sent,
        occurredAt: faker.date.between({ from: occurredAt, to: new Date(occurredAt.getTime() + 60000) }),
        providerMessageId: `msg_${faker.string.alphanumeric(12)}`,
        abGroup: campaign.hasAbTest ? faker.helpers.arrayElement(AB_GROUPS) : null,
        costAmount: baseCost,
        currency: 'KRW',
        userAgentHash: faker.string.hexadecimal({ length: 64, casing: 'lower' }),
        createdAt: new Date()
      }
      events.push(sentEvent)
      
      // Create follow-up events based on realistic conversion
      const deliveryRate = getChannelDeliveryRate(channel)
      if (faker.datatype.boolean(deliveryRate)) {
        // Delivered event
        events.push({
          ...sentEvent,
          id: eventId++,
          eventType: EventType.Delivered,
          occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 1000, max: 10000 })),
          costAmount: 0
        })
        
        // Open event
        const openRate = getChannelOpenRate(channel)
        if (openRate > 0 && faker.datatype.boolean(openRate)) {
          events.push({
            ...sentEvent,
            id: eventId++,
            eventType: EventType.Opened,
            occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 30000, max: 3600000 })),
            costAmount: 0
          })
          
          // Click event
          const clickRate = getChannelClickRate(channel)
          if (clickRate > 0 && faker.datatype.boolean(clickRate)) {
            events.push({
              ...sentEvent,
              id: eventId++,
              eventType: EventType.Clicked,
              occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 60000, max: 7200000 })),
              costAmount: 0
            })
          }
        }
      } else {
        // Failed event
        events.push({
          ...sentEvent,
          id: eventId++,
          eventType: EventType.Failed,
          occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 5000, max: 30000 })),
          failureCode: 'NETWORK_ERROR',
          failureReason: 'Network timeout occurred',
          costAmount: baseCost * 0.5
        })
      }
    })
  })
  
  return events
}

function getChannelBaseCost(channel) {
  const costs = {
    sms: 0.08,
    kakao: 0.12,
    email: 0.02,
    push: 0.01,
    web: 0.005,
    social: 0.03
  }
  return costs[channel] || 0.05
}

function getChannelDeliveryRate(channel) {
  const rates = {
    sms: 0.98,
    kakao: 0.96,
    email: 0.94,
    push: 0.92,
    web: 0.99,
    social: 0.89
  }
  return rates[channel] || 0.95
}

function getChannelOpenRate(channel) {
  const rates = {
    sms: 0.98,
    kakao: 0.85,
    email: 0.22,
    push: 0.45,
    web: 0,
    social: 0.15
  }
  return rates[channel] || 0.5
}

function getChannelClickRate(channel) {
  const rates = {
    sms: 0.08,
    kakao: 0.12,
    email: 0.03,
    push: 0.06,
    web: 0,
    social: 0.02
  }
  return rates[channel] || 0.05
}

function escapeString(str) {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
}

async function generateSqlFile() {
  console.log('🌱 Generating comprehensive analytics test dataset...')
  
  const tenants = generateTestTenants(3)
  const users = generateTestUsers(tenants)
  const contacts = generateTestContacts(tenants, 5000) // Reduced for demo
  const campaigns = generateTestCampaigns(tenants, users)
  const events = generateTestEvents(campaigns, contacts, 500) // Reduced for demo
  
  const stats = {
    totalTenants: tenants.length,
    totalUsers: users.length,
    totalContacts: contacts.length,
    totalCampaigns: campaigns.length,
    totalEvents: events.length
  }
  
  console.log('📊 Dataset statistics:', stats)
  
  const statements = []
  
  // Generate tenant inserts
  console.log('📝 Preparing tenant inserts...')
  tenants.forEach(tenant => {
    statements.push(`INSERT INTO tenants (id, name, slug, created_at) VALUES ('${tenant.id}', '${escapeString(tenant.name)}', '${tenant.slug}', '${tenant.createdAt.toISOString()}');`)
  })
  
  // Generate user inserts
  console.log('📝 Preparing user inserts...')
  users.forEach(user => {
    statements.push(`INSERT INTO users (id, tenant_id, email, full_name, role, created_at) VALUES ('${user.id}', '${user.tenantId}', '${escapeString(user.email)}', '${escapeString(user.fullName)}', '${user.role}', '${user.createdAt.toISOString()}');`)
  })
  
  // Generate contact inserts (with encryption simulation)
  console.log('📝 Preparing contact inserts...')
  contacts.forEach(contact => {
    statements.push(`INSERT INTO contacts (id, tenant_id, full_name, phone_enc, phone_hash, email_enc, email_hash, kakao_enc, kakao_hash, is_active, created_at, updated_at) VALUES ('${contact.id}', '${contact.tenantId}', '${escapeString(contact.fullName)}', encode('${escapeString(contact.phone)}', 'base64'), decode(md5('${escapeString(contact.phone)}'), 'hex'), encode('${escapeString(contact.email)}', 'base64'), decode(md5('${escapeString(contact.email)}'), 'hex'), encode('${escapeString(contact.kakaoId)}', 'base64'), decode(md5('${escapeString(contact.kakaoId)}'), 'hex'), ${contact.isActive}, '${contact.createdAt.toISOString()}', '${contact.updatedAt.toISOString()}');`)
  })
  
  // Generate campaign inserts
  console.log('📝 Preparing campaign inserts...')
  campaigns.forEach(campaign => {
    statements.push(`INSERT INTO campaigns (id, tenant_id, name, message_title, message_body, status, estimated_recipients, estimated_cost, sent_count, success_count, failed_count, created_at, created_by, updated_at) VALUES ('${campaign.id}', '${campaign.tenantId}', '${escapeString(campaign.name)}', '${escapeString(campaign.messageTitle)}', '${escapeString(campaign.messageBody)}', ${campaign.status}, ${campaign.estimatedRecipients}, ${campaign.estimatedCost}, ${campaign.sentCount}, ${campaign.successCount}, ${campaign.failedCount}, '${campaign.createdAt.toISOString()}', '${campaign.createdBy}', '${campaign.createdAt.toISOString()}');`)
  })
  
  // Generate event inserts
  console.log('📝 Preparing event inserts...')
  events.forEach(event => {
    statements.push(`INSERT INTO campaign_events (id, tenant_id, campaign_id, contact_id, channel, event_type, occurred_at, provider_message_id, failure_reason, failure_code, ab_group, cost_amount, currency, user_agent_hash, created_at) VALUES (${event.id}, '${event.tenantId}', '${event.campaignId}', '${event.contactId}', '${event.channel}', ${event.eventType}, '${event.occurredAt.toISOString()}', ${event.providerMessageId ? `'${event.providerMessageId}'` : 'NULL'}, ${event.failureReason ? `'${escapeString(event.failureReason)}'` : 'NULL'}, ${event.failureCode ? `'${event.failureCode}'` : 'NULL'}, ${event.abGroup ? `'${event.abGroup}'` : 'NULL'}, ${event.costAmount}, '${event.currency}', ${event.userAgentHash ? `'${event.userAgentHash}'` : 'NULL'}, '${event.createdAt.toISOString()}');`)
  })
  
  const header = `-- Analytics Test Data Seed
-- Generated: ${new Date().toISOString()}
-- Dataset Stats: ${JSON.stringify(stats, null, 2)}
--
-- WARNING: This adds large amounts of test data
-- Run against test database only!

-- Disable constraints for faster insertion
SET session_replication_role = replica;

BEGIN;

`

  const footer = `
-- Re-enable constraints
SET session_replication_role = DEFAULT;

COMMIT;

-- Update sequences
SELECT setval('campaign_events_id_seq', (SELECT MAX(id) FROM campaign_events));

-- Analyze tables for query optimization
ANALYZE tenants;
ANALYZE users;
ANALYZE contacts;
ANALYZE campaigns;
ANALYZE campaign_events;
`

  const fullSql = header + statements.join('\n') + footer
  
  // Write to file
  const filePath = path.join(process.cwd(), 'analytics-test-data.sql')
  await fs.writeFile(filePath, fullSql, 'utf8')
  
  console.log(`\n✅ SQL seed file generated successfully!`)
  console.log(`📄 File: ${filePath}`)
  console.log(`📈 Size: ${(fullSql.length / 1024 / 1024).toFixed(2)} MB`)
  console.log(`🔢 Statements: ${statements.length}`)
  console.log('\n📋 Next steps:')
  console.log('  1. Review the generated SQL file')
  console.log('  2. Run against your test database: psql -d productivityhub -f analytics-test-data.sql')
  console.log('  3. Verify data insertion completed successfully')
  console.log('\n⚠️  WARNING: Only run against test databases!')
  
  return stats
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSqlFile().catch(console.error)
}

export { generateSqlFile }