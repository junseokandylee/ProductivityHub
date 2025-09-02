// Test data for E2E tests - minimal datasets for campaign wizard testing

export const testContactGroups = [
  {
    id: 'group-001',
    name: '지역구 주요 인사', 
    description: '지역 내 주요 인사 및 단체장',
    count: 1250
  },
  {
    id: 'group-002',
    name: '청년층',
    description: '만 18-35세 유권자', 
    count: 8500
  },
  {
    id: 'group-003', 
    name: '시니어층',
    description: '만 60세 이상 유권자',
    count: 4200
  }
] as const;

export const testContactSegments = [
  {
    id: 'segment-001',
    name: '정책 관심층',
    description: '정책 관련 소식에 높은 관심',
    count: 2800  
  },
  {
    id: 'segment-002',
    name: '캠페인 참여자',
    description: '이전 캠페인 참여 경험자',
    count: 1900
  }
] as const;

export const testCampaignData = {
  name: 'E2E 테스트 캠페인',
  messageBody: '안녕하세요 {name}님, {candidate} 후보입니다. {district}에서 좋은 정책을 만들어나가겠습니다.',
  messageTitle: '{name}님께 전하는 {candidate}의 약속',
  variables: {
    name: '김유권', 
    candidate: '홍길동',
    district: '서울 강남구'
  },
  channels: ['SMS', 'KAKAO'] as const,
  fallbackEnabled: true
} as const;

export const testEstimateResponse = {
  recipientCount: 12000,
  estimatedCost: 264000,
  quotaOk: true
} as const;

export const testQuotaExceededResponse = {
  recipientCount: 50000,
  estimatedCost: 1100000,
  quotaOk: false
} as const;

export const testChannelStatuses = [
  {
    channel: 'SMS',
    isEnabled: true,
    quotaRemaining: 8500,
    dailyLimit: 10000,
    hasWarning: false
  },
  {
    channel: 'KAKAO', 
    isEnabled: true,
    quotaRemaining: 4200,
    dailyLimit: 5000,
    hasWarning: false
  },
  {
    channel: 'EMAIL',
    isEnabled: false,
    quotaRemaining: 0,
    dailyLimit: 15000,
    hasWarning: true,
    warningMessage: '인증 대기 중'
  }
] as const;