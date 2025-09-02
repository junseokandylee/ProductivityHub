import { http, HttpResponse } from 'msw';
import type { 
  ContactGroup, 
  ContactSegment, 
  SampleContactResponse, 
  PreviewTemplateResponse,
  ChannelStatusResponse,
  QuotaCurrentResponse,
  EstimateCampaignResponse,
  CreateCampaignResponse
} from '@/lib/api/campaigns';

// Mock data for testing
const mockContactGroups: ContactGroup[] = [
  {
    id: 'group-001',
    name: '지역구 주요 인사',
    description: '지역 내 주요 인사 및 단체장',
    count: 1250,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-08-15T14:30:00Z'
  },
  {
    id: 'group-002', 
    name: '청년층',
    description: '만 18-35세 유권자',
    count: 8500,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-08-20T16:45:00Z'
  },
  {
    id: 'group-003',
    name: '시니어층',
    description: '만 60세 이상 유권자',
    count: 4200,
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-08-25T11:20:00Z'
  }
];

const mockContactSegments: ContactSegment[] = [
  {
    id: 'segment-001',
    name: '정책 관심층',
    description: '정책 관련 소식에 높은 관심',
    count: 2800,
    createdAt: '2024-01-20T08:30:00Z',
    updatedAt: '2024-08-18T13:15:00Z'
  },
  {
    id: 'segment-002',
    name: '캠페인 참여자',
    description: '이전 캠페인 참여 경험자',
    count: 1900,
    createdAt: '2024-02-10T11:45:00Z',
    updatedAt: '2024-08-22T09:30:00Z'
  }
];

const mockChannelStatuses: ChannelStatusResponse[] = [
  {
    channel: 'SMS',
    isEnabled: true,
    quotaRemaining: 8500,
    dailyLimit: 10000,
    hasWarning: false,
    warningMessage: null
  },
  {
    channel: 'KAKAO',
    isEnabled: true,
    quotaRemaining: 4200,
    dailyLimit: 5000,
    hasWarning: false,
    warningMessage: null
  },
  {
    channel: 'EMAIL',
    isEnabled: false,
    quotaRemaining: 0,
    dailyLimit: 15000,
    hasWarning: true,
    warningMessage: '인증 대기 중'
  }
];

const mockQuotaData: QuotaCurrentResponse = {
  channelQuotas: {
    SMS: {
      used: 1500,
      limit: 10000,
      usagePercentage: 15,
      isNearLimit: false
    },
    KAKAO: {
      used: 800,
      limit: 5000,
      usagePercentage: 16,
      isNearLimit: false
    },
    EMAIL: {
      used: 0,
      limit: 15000,
      usagePercentage: 0,
      isNearLimit: false
    }
  },
  totalUsedToday: 2300,
  totalDailyLimit: 30000
};

// API handlers
export const handlers = [
  // Contact Groups
  http.get('/api/contacts/groups', () => {
    return HttpResponse.json(mockContactGroups);
  }),
  
  // Contact Segments  
  http.get('/api/contacts/segments', () => {
    return HttpResponse.json(mockContactSegments);
  }),
  
  // Sample Contact
  http.post('/api/contacts/sample', async ({ request }) => {
    const body = await request.json();
    const sampleContact: SampleContactResponse = {
      name: '김유권',
      phone: '010-1234-5678',
      email: 'kim.voter@example.com',
      personalizationData: {
        name: '김유권',
        district: '서울 강남구',
        age: '35',
        occupation: '회사원'
      }
    };
    return HttpResponse.json(sampleContact);
  }),
  
  // Template Preview
  http.post('/api/messages/preview', async ({ request }) => {
    const body = await request.json() as any;
    const previewResponse: PreviewTemplateResponse = {
      renderedBody: body.messageBody.replace(/\{(\w+)\}/g, (match: string, key: string) => {
        const sampleData: Record<string, string> = {
          name: '김유권',
          district: '서울 강남구',  
          candidate: '홍길동'
        };
        return sampleData[key] || match;
      }),
      renderedTitle: body.title?.replace(/\{(\w+)\}/g, (match: string, key: string) => {
        const sampleData: Record<string, string> = {
          name: '김유권',
          district: '서울 강남구',
          candidate: '홍길동'  
        };
        return sampleData[key] || match;
      }) || null,
      characterCount: body.messageBody.length,
      missingVariables: []
    };
    return HttpResponse.json(previewResponse);
  }),
  
  // Channel Status
  http.get('/api/channels/status', () => {
    return HttpResponse.json(mockChannelStatuses);
  }),
  
  // Current Quota
  http.get('/api/quotas/current', () => {
    return HttpResponse.json(mockQuotaData);
  }),
  
  // Campaign Estimation
  http.post('/api/campaigns/estimate', async ({ request }) => {
    const body = await request.json();
    
    // Simulate quota exceeded scenario if requested
    if (process.env.PLAYWRIGHT_QUOTA_EXCEEDED === 'true') {
      const estimateResponse: EstimateCampaignResponse = {
        recipientCount: 50000,
        estimatedCost: 1100000,
        quotaOk: false
      };
      return HttpResponse.json(estimateResponse);
    }
    
    const estimateResponse: EstimateCampaignResponse = {
      recipientCount: 12000,
      estimatedCost: 264000,
      quotaOk: true
    };
    return HttpResponse.json(estimateResponse);
  }),
  
  // Campaign Creation - Happy Path
  http.post('/api/campaigns', async ({ request }) => {
    const body = await request.json();
    
    // Simulate server error if requested
    if (process.env.PLAYWRIGHT_SERVER_ERROR === 'true') {
      return HttpResponse.json(
        { 
          type: 'SERVER_ERROR',
          title: '서버 오류', 
          detail: '일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          status: 500
        }, 
        { status: 500 }
      );
    }
    
    const createResponse: CreateCampaignResponse = {
      campaignId: `camp-${Date.now()}`,
      status: 'created',
      message: '캠페인이 성공적으로 생성되었습니다.'
    };
    
    return HttpResponse.json(createResponse);
  })
];

// Error scenario handlers
export const errorHandlers = {
  quotaExceeded: http.post('/api/campaigns/estimate', () => {
    const estimateResponse: EstimateCampaignResponse = {
      recipientCount: 50000,
      estimatedCost: 1100000, 
      quotaOk: false
    };
    return HttpResponse.json(estimateResponse);
  }),
  
  serverError: http.post('/api/campaigns', () => {
    return HttpResponse.json(
      {
        type: 'SERVER_ERROR',
        title: '서버 오류',
        detail: '일시적인 서버 오류가 발생했습니다.',
        status: 500
      },
      { status: 500 }
    );
  }),
  
  validationError: http.post('/api/campaigns', async ({ request }) => {
    const body = await request.json() as any;
    if (!body.messageBody || body.messageBody.trim() === '') {
      return HttpResponse.json(
        {
          type: 'VALIDATION_ERROR',
          title: '검증 오류',
          detail: '메시지 내용은 필수입니다.',
          status: 400,
          extensions: {
            errors: {
              messageBody: ['메시지 내용은 필수입니다.']
            }
          }
        },
        { status: 400 }
      );
    }
    
    // Normal success response if validation passes
    const createResponse: CreateCampaignResponse = {
      campaignId: `camp-${Date.now()}`,
      status: 'created',
      message: '캠페인이 성공적으로 생성되었습니다.'
    };
    
    return HttpResponse.json(createResponse);
  })
};