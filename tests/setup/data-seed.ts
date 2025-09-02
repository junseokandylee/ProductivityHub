import { faker } from '@faker-js/faker'

/**
 * Test data seeding utilities for analytics testing
 * Generates realistic datasets with 100K+ contacts, millions of events across 2+ tenants
 */

// Event types based on backend enum
export enum EventType {
  Sent = 0,
  Delivered = 1,
  Opened = 2,
  Clicked = 3,
  Failed = 4,
  Unsubscribed = 5,
  Bounced = 6,
  SpamReport = 7
}

// Campaign status based on backend enum
export enum CampaignStatus {
  Draft = 0,
  Queued = 1,
  Processing = 2,
  Sending = 3,
  Completed = 4,
  Failed = 5,
  Cancelled = 6,
  Paused = 7
}

export interface TestTenant {
  id: string
  name: string
  slug: string
  createdAt: Date
}

export interface TestUser {
  id: string
  tenantId: string
  email: string
  fullName: string
  role: 'Owner' | 'Admin' | 'Staff'
  createdAt: Date
}

export interface TestContact {
  id: string
  tenantId: string
  fullName: string
  phone: string
  email: string
  kakaoId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TestCampaign {
  id: string
  tenantId: string
  name: string
  messageTitle: string
  messageBody: string
  status: CampaignStatus
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  estimatedRecipients: number
  estimatedCost: number
  sentCount: number
  successCount: number
  failedCount: number
  createdAt: Date
  createdBy: string
  // A/B testing config
  abTestConfig?: {
    variants: Array<{
      name: string
      allocation: number
      messageBody: string
    }>
  }
}

export interface TestCampaignEvent {
  id: number
  tenantId: string
  campaignId: string
  contactId: string
  channel: 'sms' | 'kakao' | 'email' | 'push' | 'web' | 'social'
  eventType: EventType
  occurredAt: Date
  providerMessageId?: string
  failureReason?: string
  failureCode?: string
  abGroup?: 'A' | 'B' | 'C'
  costAmount: number
  currency: string
  userAgentHash?: string
  createdAt: Date
}

// Realistic data generation settings
const CHANNELS: Array<'sms' | 'kakao' | 'email' | 'push' | 'web' | 'social'> = ['sms', 'kakao', 'email', 'push', 'web', 'social']
const AB_GROUPS: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']
const FAILURE_CODES = ['INVALID_NUMBER', 'RATE_LIMIT', 'BLOCKED', 'NETWORK_ERROR', 'SPAM_FILTER']
const FAILURE_REASONS = [
  'Invalid phone number format',
  'Rate limit exceeded',
  'Number blocked by carrier',
  'Network timeout',
  'Content flagged as spam'
]

/**
 * Generate realistic test tenants for multi-tenant testing
 */
export function generateTestTenants(count: number = 3): TestTenant[] {
  faker.seed(12345) // Consistent data across runs
  
  const tenants: TestTenant[] = []
  
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

/**
 * Generate test users for each tenant
 */
export function generateTestUsers(tenants: TestTenant[]): TestUser[] {
  const users: TestUser[] = []
  
  tenants.forEach(tenant => {
    // Create owner, admin, and staff for each tenant
    const roles: Array<'Owner' | 'Admin' | 'Staff'> = ['Owner', 'Admin', 'Staff']
    
    roles.forEach((role, index) => {
      users.push({
        id: faker.string.uuid(),
        tenantId: tenant.id,
        email: faker.internet.email(),
        fullName: faker.person.fullName(),
        role,
        createdAt: faker.date.between({ from: tenant.createdAt, to: new Date() })
      })
    })
    
    // Add additional staff members
    for (let i = 0; i < faker.number.int({ min: 2, max: 8 }); i++) {
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

/**
 * Generate large contact datasets for performance testing
 */
export function generateTestContacts(tenants: TestTenant[], contactsPerTenant: number = 50000): TestContact[] {
  const contacts: TestContact[] = []
  
  tenants.forEach(tenant => {
    for (let i = 0; i < contactsPerTenant; i++) {
      const createdAt = faker.date.between({ from: tenant.createdAt, to: new Date() })
      contacts.push({
        id: faker.string.uuid(),
        tenantId: tenant.id,
        fullName: faker.person.fullName(),
        phone: faker.phone.number('+82-10-####-####'),
        email: faker.internet.email(),
        kakaoId: `kakao_${faker.string.alphanumeric(8)}`,
        isActive: faker.datatype.boolean(0.95), // 95% active
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() })
      })
    }
  })
  
  return contacts
}

/**
 * Generate test campaigns with varied configurations
 */
export function generateTestCampaigns(tenants: TestTenant[], users: TestUser[]): TestCampaign[] {
  const campaigns: TestCampaign[] = []
  
  tenants.forEach(tenant => {
    const tenantUsers = users.filter(u => u.tenantId === tenant.id)
    const campaignCount = faker.number.int({ min: 10, max: 50 })
    
    for (let i = 0; i < campaignCount; i++) {
      const createdAt = faker.date.between({ from: tenant.createdAt, to: new Date() })
      const status = faker.helpers.arrayElement(Object.values(CampaignStatus).filter(v => typeof v === 'number')) as CampaignStatus
      const estimatedRecipients = faker.number.int({ min: 100, max: 50000 })
      const estimatedCost = estimatedRecipients * faker.number.float({ min: 0.05, max: 0.15 })
      
      const campaign: TestCampaign = {
        id: faker.string.uuid(),
        tenantId: tenant.id,
        name: `Campaign ${faker.company.catchPhrase()}`,
        messageTitle: faker.lorem.sentence(),
        messageBody: faker.lorem.paragraphs(2),
        status,
        estimatedRecipients,
        estimatedCost,
        sentCount: 0,
        successCount: 0,
        failedCount: 0,
        createdAt,
        createdBy: faker.helpers.arrayElement(tenantUsers).id
      }
      
      // Add scheduling and completion dates based on status
      if (status >= CampaignStatus.Queued) {
        campaign.scheduledAt = faker.date.between({ from: createdAt, to: new Date() })
      }
      if (status >= CampaignStatus.Processing) {
        campaign.startedAt = faker.date.between({ from: campaign.scheduledAt || createdAt, to: new Date() })
      }
      if (status === CampaignStatus.Completed) {
        campaign.completedAt = faker.date.between({ from: campaign.startedAt || createdAt, to: new Date() })
      }
      
      // Add A/B test configuration for some campaigns
      if (faker.datatype.boolean(0.3)) { // 30% have A/B tests
        campaign.abTestConfig = {
          variants: [
            {
              name: 'Variant A',
              allocation: 50,
              messageBody: faker.lorem.paragraphs(2)
            },
            {
              name: 'Variant B',
              allocation: 50,
              messageBody: faker.lorem.paragraphs(2)
            }
          ]
        }
        
        // Sometimes add a third variant
        if (faker.datatype.boolean(0.2)) {
          campaign.abTestConfig.variants.push({
            name: 'Variant C',
            allocation: 33,
            messageBody: faker.lorem.paragraphs(2)
          })
          campaign.abTestConfig.variants[0].allocation = 33
          campaign.abTestConfig.variants[1].allocation = 34
        }
      }
      
      campaigns.push(campaign)
    }
  })
  
  return campaigns
}

/**
 * Generate millions of campaign events with realistic patterns
 */
export function generateTestCampaignEvents(
  campaigns: TestCampaign[],
  contacts: TestContact[],
  eventsPerCampaign: number = 20000
): TestCampaignEvent[] {
  const events: TestCampaignEvent[] = []
  let eventId = 1
  
  campaigns.forEach(campaign => {
    const tenantContacts = contacts.filter(c => c.tenantId === campaign.tenantId)
    const selectedContacts = faker.helpers.arrayElements(tenantContacts, Math.min(eventsPerCampaign, tenantContacts.length))
    
    selectedContacts.forEach((contact, index) => {
      const channel = faker.helpers.arrayElement(CHANNELS)
      const baseCost = getChannelBaseCost(channel)
      const occurredAt = campaign.startedAt || campaign.createdAt
      
      // Always create a "Sent" event first
      const sentEvent: TestCampaignEvent = {
        id: eventId++,
        tenantId: campaign.tenantId,
        campaignId: campaign.id,
        contactId: contact.id,
        channel,
        eventType: EventType.Sent,
        occurredAt: faker.date.between({ from: occurredAt, to: new Date(occurredAt.getTime() + 60000) }),
        providerMessageId: `msg_${faker.string.alphanumeric(12)}`,
        abGroup: campaign.abTestConfig ? faker.helpers.arrayElement(AB_GROUPS) : undefined,
        costAmount: baseCost,
        currency: 'KRW',
        userAgentHash: faker.string.hexadecimal({ length: 64, casing: 'lower' }),
        createdAt: new Date()
      }
      events.push(sentEvent)
      
      // Create follow-up events based on realistic conversion funnel
      const deliveryRate = getChannelDeliveryRate(channel)
      if (faker.datatype.boolean(deliveryRate)) {
        // Delivered event
        events.push({
          ...sentEvent,
          id: eventId++,
          eventType: EventType.Delivered,
          occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 1000, max: 10000 })),
          costAmount: 0 // Only charge for sent, not delivery confirmation
        })
        
        // Open event (only for some channels)
        const openRate = getChannelOpenRate(channel)
        if (openRate > 0 && faker.datatype.boolean(openRate)) {
          events.push({
            ...sentEvent,
            id: eventId++,
            eventType: EventType.Opened,
            occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 30000, max: 3600000 })),
            costAmount: 0
          })
          
          // Click event (only after open)
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
          failureCode: faker.helpers.arrayElement(FAILURE_CODES),
          failureReason: faker.helpers.arrayElement(FAILURE_REASONS),
          costAmount: baseCost * 0.5 // Partial charge for failed messages
        })
      }
      
      // Occasional unsubscribe events
      if (faker.datatype.boolean(0.02)) { // 2% unsubscribe rate
        events.push({
          ...sentEvent,
          id: eventId++,
          eventType: EventType.Unsubscribed,
          occurredAt: new Date(sentEvent.occurredAt.getTime() + faker.number.int({ min: 3600000, max: 86400000 })),
          costAmount: 0
        })
      }
    })
  })
  
  return events
}

/**
 * Channel-specific configuration for realistic event patterns
 */
function getChannelBaseCost(channel: string): number {
  const costs = {
    sms: 0.08,
    kakao: 0.12,
    email: 0.02,
    push: 0.01,
    web: 0.005,
    social: 0.03
  }
  return costs[channel as keyof typeof costs] || 0.05
}

function getChannelDeliveryRate(channel: string): number {
  const rates = {
    sms: 0.98,
    kakao: 0.96,
    email: 0.94,
    push: 0.92,
    web: 0.99,
    social: 0.89
  }
  return rates[channel as keyof typeof rates] || 0.95
}

function getChannelOpenRate(channel: string): number {
  const rates = {
    sms: 0.98, // SMS is almost always "read"
    kakao: 0.85,
    email: 0.22,
    push: 0.45,
    web: 0, // No open tracking
    social: 0.15
  }
  return rates[channel as keyof typeof rates] || 0.5
}

function getChannelClickRate(channel: string): number {
  const rates = {
    sms: 0.08,
    kakao: 0.12,
    email: 0.03,
    push: 0.06,
    web: 0,
    social: 0.02
  }
  return rates[channel as keyof typeof rates] || 0.05
}

/**
 * Export comprehensive test dataset
 */
export function generateFullTestDataset(): {
  tenants: TestTenant[]
  users: TestUser[]
  contacts: TestContact[]
  campaigns: TestCampaign[]
  events: TestCampaignEvent[]
  stats: {
    totalEvents: number
    totalContacts: number
    totalCampaigns: number
    eventsPerTenant: Record<string, number>
  }
} {
  console.log('🌱 Generating comprehensive test dataset for analytics testing...')
  
  const tenants = generateTestTenants(3) // 3 tenants for isolation testing
  const users = generateTestUsers(tenants)
  const contacts = generateTestContacts(tenants, 100000) // 300K total contacts
  const campaigns = generateTestCampaigns(tenants, users)
  const events = generateTestCampaignEvents(campaigns, contacts, 5000) // ~5M total events
  
  // Calculate statistics
  const eventsPerTenant = tenants.reduce((acc, tenant) => {
    acc[tenant.id] = events.filter(e => e.tenantId === tenant.id).length
    return acc
  }, {} as Record<string, number>)
  
  const stats = {
    totalEvents: events.length,
    totalContacts: contacts.length,
    totalCampaigns: campaigns.length,
    eventsPerTenant
  }
  
  console.log('📊 Test dataset generated:', stats)
  
  return {
    tenants,
    users,
    contacts,
    campaigns,
    events,
    stats
  }
}