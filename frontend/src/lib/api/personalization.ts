// 한국어 메시지 개인화 API 클라이언트

import { 
  MessagePersonalizationRequest, 
  MessagePersonalizationResponse,
  PersonalizationEffectiveness,
  ABTestResult,
  DemographicInsights,
  PersonalizationSettings,
  PersonalizationStatus,
  KoreanLanguageContext,
  ApiResponse
} from '@/lib/types/korean-personalization';

const API_BASE = '/api/personalization';

// 개인화된 메시지 생성
export async function generatePersonalizedMessages(
  request: MessagePersonalizationRequest
): Promise<ApiResponse<MessagePersonalizationResponse>> {
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId: request.campaignId,
        originalMessage: request.originalMessage,
        targetDemographics: request.targetDemographics,
        personalizationGoals: request.personalizationGoals,
        abTestingEnabled: request.abTestingEnabled || false,
        culturalSensitivityLevel: request.culturalSensitivityLevel || 'medium'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error generating personalized messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 메시지 개인화 미리보기
export async function previewPersonalization(
  originalMessage: string,
  sampleDemographics: any,
  goals: any[] = [],
  culturalSensitivityLevel: string = 'medium'
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalMessage,
        sampleDemographics,
        goals,
        culturalSensitivityLevel
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error previewing personalization:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 개인화 효과성 분석
export async function analyzePersonalizationEffectiveness(
  campaignId: string,
  startDate?: Date,
  endDate?: Date,
  metricTypes: string[] = ['open_rate', 'click_rate', 'response_rate'],
  groupBy?: string
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        metricTypes,
        groupBy
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error analyzing personalization effectiveness:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 인구통계 정보 조회
export async function getDemographicsData(
  regionFilter?: string
): Promise<ApiResponse<DemographicInsights>> {
  try {
    const url = new URL(`${API_BASE}/demographics`, window.location.origin);
    if (regionFilter) {
      url.searchParams.set('regionFilter', regionFilter);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching demographics data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// A/B 테스트 결과 조회
export async function getABTestResults(
  campaignId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ApiResponse<ABTestResult[]>> {
  try {
    const url = new URL(`${API_BASE}/abtest/${campaignId}`, window.location.origin);
    if (startDate) {
      url.searchParams.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      url.searchParams.set('endDate', endDate.toISOString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching A/B test results:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 개인화 설정 조회
export async function getPersonalizationSettings(): Promise<ApiResponse<PersonalizationSettings>> {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching personalization settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 개인화 진행 상태 조회
export async function getPersonalizationStatus(
  campaignId: string
): Promise<ApiResponse<PersonalizationStatus>> {
  try {
    const response = await fetch(`${API_BASE}/status/${campaignId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching personalization status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 특정 개인화 결과 조회
export async function getPersonalizationResult(
  personalizationId: string
): Promise<ApiResponse<MessagePersonalizationResponse>> {
  try {
    const response = await fetch(`${API_BASE}/${personalizationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error fetching personalization result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date()
    };
  }
}

// 한국 지역 데이터 (정적 데이터)
export const KOREAN_REGIONS = [
  { code: '11', name: '서울특별시', level: 'sido', dialectCode: '서울말', isMetropolitan: true },
  { code: '26', name: '부산광역시', level: 'sido', dialectCode: '부산말', isMetropolitan: true },
  { code: '27', name: '대구광역시', level: 'sido', dialectCode: '대구말', isMetropolitan: true },
  { code: '28', name: '인천광역시', level: 'sido', dialectCode: '서울말', isMetropolitan: true },
  { code: '29', name: '광주광역시', level: 'sido', dialectCode: '전라도', isMetropolitan: true },
  { code: '30', name: '대전광역시', level: 'sido', dialectCode: '충청도', isMetropolitan: true },
  { code: '31', name: '울산광역시', level: 'sido', dialectCode: '경상도', isMetropolitan: true },
  { code: '36', name: '세종특별자치시', level: 'sido', dialectCode: '충청도', isMetropolitan: false },
  { code: '41', name: '경기도', level: 'sido', dialectCode: '서울말', isMetropolitan: false },
  { code: '43', name: '충청북도', level: 'sido', dialectCode: '충청도', isMetropolitan: false },
  { code: '44', name: '충청남도', level: 'sido', dialectCode: '충청도', isMetropolitan: false },
  { code: '45', name: '전라북도', level: 'sido', dialectCode: '전라도', isMetropolitan: false },
  { code: '46', name: '전라남도', level: 'sido', dialectCode: '전라도', isMetropolitan: false },
  { code: '47', name: '경상북도', level: 'sido', dialectCode: '경상도', isMetropolitan: false },
  { code: '48', name: '경상남도', level: 'sido', dialectCode: '경상도', isMetropolitan: false },
  { code: '49', name: '제주특별자치도', level: 'sido', dialectCode: '제주도', isMetropolitan: false },
  { code: '50', name: '강원도', level: 'sido', dialectCode: '강원도', isMetropolitan: false }
] as const;

// 방언별 특성 데이터
export const DIALECT_CHARACTERISTICS = {
  '서울말': {
    name: '서울말/표준어',
    regions: ['11', '28', '41'],
    formalityLevels: ['formal', 'informal', 'respectful'],
    characteristics: ['정중한 표현', '표준 문법', '격식 있는 어투'],
    examples: ['안녕하십니까', '감사합니다', '죄송합니다']
  },
  '부산말': {
    name: '부산 방언',
    regions: ['26'],
    formalityLevels: ['informal', 'casual'],
    characteristics: ['억양이 강함', '~네, ~거든 사용', '친근한 표현'],
    examples: ['뭐하노', '그카네', '좋다 아이가']
  },
  '경상도': {
    name: '경상도 방언',
    regions: ['27', '31', '47', '48'],
    formalityLevels: ['informal', 'casual'],
    characteristics: ['~노, ~카노 사용', '억센 억양', '직설적 표현'],
    examples: ['뭐하노', '그래카노', '좋다예']
  },
  '전라도': {
    name: '전라도 방언',
    regions: ['29', '45', '46'],
    formalityLevels: ['informal', 'casual', 'respectful'],
    characteristics: ['~것이, ~잉 사용', '부드러운 억양', '정감 있는 표현'],
    examples: ['뭐하것이', '그래잉', '좋구만잉']
  },
  '충청도': {
    name: '충청도 방언',
    regions: ['30', '36', '43', '44'],
    formalityLevels: ['informal', 'formal'],
    characteristics: ['~여, ~구만 사용', '느린 말투', '온화한 표현'],
    examples: ['뭐하여', '그래구만', '좋다여']
  },
  '제주도': {
    name: '제주 방언',
    regions: ['49'],
    formalityLevels: ['casual', 'informal'],
    characteristics: ['독특한 어휘', '~수다, ~쿠과 사용', '고유한 문화 표현'],
    examples: ['뭐하쿠과', '그렇수다', '좋다우']
  },
  '강원도': {
    name: '강원도 방언',
    regions: ['50'],
    formalityLevels: ['informal', 'casual'],
    characteristics: ['~가, ~당 사용', '산간 지역 특성', '소박한 표현'],
    examples: ['뭐하가', '그래당', '좋다가']
  }
} as const;

// 유틸리티 함수들
export function getRegionByCode(code: string) {
  return KOREAN_REGIONS.find(region => region.code === code);
}

export function getDialectByRegion(regionCode: string) {
  const region = getRegionByCode(regionCode);
  return region?.dialectCode || '서울말';
}

export function getDialectCharacteristics(dialect: keyof typeof DIALECT_CHARACTERISTICS) {
  return DIALECT_CHARACTERISTICS[dialect];
}

export function validateKoreanMessage(message: string): string[] {
  const issues: string[] = [];
  
  // 기본 검증
  if (!message.trim()) {
    issues.push('메시지가 비어있습니다.');
  }
  
  if (message.length > 2000) {
    issues.push('메시지가 2000자를 초과했습니다.');
  }
  
  // 한글 포함 여부 확인
  const hasKorean = /[가-힣]/.test(message);
  if (!hasKorean) {
    issues.push('한글이 포함되지 않은 메시지입니다.');
  }
  
  // 부적절한 표현 검사
  const inappropriateTerms = ['빨갱이', '종북', '극우', '극좌'];
  for (const term of inappropriateTerms) {
    if (message.includes(term)) {
      issues.push(`부적절한 정치적 표현이 포함되어 있습니다: ${term}`);
    }
  }
  
  return issues;
}