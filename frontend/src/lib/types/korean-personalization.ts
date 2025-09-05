// 한국어 메시지 개인화 시스템 타입 정의

// 기본 개인화 요청/응답 타입
export interface MessagePersonalizationRequest {
  campaignId: string;
  originalMessage: string;
  targetDemographics: VoterDemographics[];
  personalizationGoals: PersonalizationGoal[];
  abTestingEnabled?: boolean;
  culturalSensitivityLevel?: CulturalSensitivityLevel;
}

export interface MessagePersonalizationResponse {
  id: string;
  campaignId: string;
  originalMessage: string;
  personalizedVariants: PersonalizedMessageVariant[];
  recommendedVariant?: PersonalizedMessageVariant;
  culturalAnalysis: KoreanCulturalAnalysis;
  generatedAt: Date;
}

// 개인화된 메시지 변형
export interface PersonalizedMessageVariant {
  id: string;
  personalizedMessage: string;
  dialect: KoreanDialect;
  formalityLevel: KoreanFormalityLevel;
  targetDemographics: VoterDemographics;
  effectivenessScore: number; // 0.0 - 1.0
  abTestGroup?: string;
  culturalMarkers: string[];
  politicalTermsUsed: boolean;
  confidence: number; // AI 신뢰도 점수 0.0 - 1.0
}

// 유권자 인구통계 정보
export interface VoterDemographics {
  ageGroup?: KoreanAgeGroup;
  gender?: Gender;
  regionCode?: string;
  regionName?: string;
  preferredDialect: KoreanDialect;
  educationLevel?: KoreanEducationLevel;
  occupation?: KoreanOccupation;
  incomeLevel?: IncomeLevel;
  politicalLeaning?: PoliticalLeaning;
  interestIssues?: string[];
  communicationStyle: KoreanCommunicationStyle;
}

// 한국어 언어 맥락
export interface KoreanLanguageContext {
  id: string;
  contextName: string;
  dialect: KoreanDialect;
  formality: KoreanFormalityLevel;
  culturalMarkers?: CulturalMarker[];
  tabooExpressions?: string[];
  recommendedExpressions?: string[];
  isActive: boolean;
}

// 문화적 마커
export interface CulturalMarker {
  expression: string;
  meaning: string;
  usage: string;
  appropriateFor: VoterDemographics[];
}

// 한국 문화적 분석
export interface KoreanCulturalAnalysis {
  dialectConsistency: number; // 방언 일관성 0.0 - 1.0
  formalityAppropriate: boolean; // 격식 적절성
  politicalTermAccuracy: number; // 정치 용어 정확성 0.0 - 1.0
  culturalSensitivityScore: number; // 문화적 민감성 점수 0.0 - 1.0
  regionalRelevance: number; // 지역 관련성 0.0 - 1.0
  ageAppropriate: boolean; // 연령 적절성
  warnings: string[]; // 주의사항
  suggestions: string[]; // 개선 제안
}

// 개인화 목표
export interface PersonalizationGoal {
  type: PersonalizationGoalType;
  weight: number; // 0.0 - 1.0
  description?: string;
}

// 효과성 메트릭
export interface PersonalizationEffectiveness {
  id: string;
  personalizationId: string;
  metricType: EffectivenessMetricType;
  metricValue: number; // 0.0 - 1.0
  measuredAt: Date;
  metadata?: Record<string, any>;
}

// A/B 테스트 결과
export interface ABTestResult {
  campaignId: string;
  variantA: PersonalizedMessageVariant;
  variantB: PersonalizedMessageVariant;
  sampleSize: number;
  confidenceLevel: number;
  statisticalSignificance: boolean;
  winningVariant?: 'A' | 'B';
  metrics: {
    openRate: { variantA: number; variantB: number };
    clickRate: { variantA: number; variantB: number };
    responseRate: { variantA: number; variantB: number };
    conversionRate: { variantA: number; variantB: number };
  };
}

// 인구통계 세분화 인사이트
export interface DemographicInsights {
  regionDistribution: RegionDistribution[];
  ageGroupDistribution: AgeGroupDistribution[];
  dialectPreferences: DialectPreferences[];
  occupationDistribution: OccupationDistribution[];
  effectivenessByDemographic: EffectivenessByDemographic[];
  trendAnalysis: TrendAnalysis;
}

export interface RegionDistribution {
  regionCode: string;
  regionName: string;
  count: number;
  percentage: number;
  averageEffectiveness: number;
  preferredDialect: KoreanDialect;
}

export interface AgeGroupDistribution {
  ageGroup: KoreanAgeGroup;
  count: number;
  percentage: number;
  averageEffectiveness: number;
  preferredFormalityLevel: KoreanFormalityLevel;
}

export interface DialectPreferences {
  dialect: KoreanDialect;
  regionCodes: string[];
  effectiveness: number;
  sampleSize: number;
}

export interface OccupationDistribution {
  occupation: KoreanOccupation;
  count: number;
  percentage: number;
  averageEffectiveness: number;
  preferredCommunicationStyle: KoreanCommunicationStyle;
}

export interface EffectivenessByDemographic {
  demographic: string;
  value: string;
  averageEffectiveness: number;
  sampleSize: number;
  bestPerformingVariant: PersonalizedMessageVariant;
}

export interface TrendAnalysis {
  period: string;
  overallEffectivenessChange: number; // 전체 효과성 변화율
  topPerformingDialects: KoreanDialect[];
  emergingTrends: string[];
  recommendations: string[];
}

// 한국어 특화 열거형들
export type KoreanDialect = 
  | '서울말' | '표준어'
  | '부산말' | '경상도'
  | '대구말' | '경북방언'
  | '광주말' | '전라도'
  | '대전말' | '충청도'
  | '강원도' | '제주도';

export type KoreanFormalityLevel = 
  | 'formal'      // 격식체 (습니다/ㅂ니다)
  | 'informal'    // 비격식체 (해요)
  | 'respectful'  // 존댓말 (높임말)
  | 'casual'      // 반말 (해)
  | 'honorific';  // 극존칭 (특별한 경우)

export type KoreanAgeGroup = 
  | '20s' | '30s' | '40s' | '50s' | '60plus';

export type Gender = 'M' | 'F' | 'O';

export type KoreanEducationLevel = 
  | '초졸' | '중졸' | '고졸' | '대졸' | '대학원졸';

export type KoreanOccupation = 
  | '공무원' | '자영업자' | '회사원' | '농업' | '학생' 
  | '주부' | '무직' | '전문직' | '기술직' | '서비스업' | '기타';

export type IncomeLevel = 'low' | 'middle' | 'high';

export type PoliticalLeaning = '진보' | '보수' | '중도';

export type KoreanCommunicationStyle = 
  | 'formal'    // 격식있는
  | 'casual'    // 편안한
  | 'respectful' // 공손한
  | 'friendly'  // 친근한
  | 'authoritative'; // 권위있는

export type PersonalizationGoalType = 
  | 'increase_engagement'   // 참여도 향상
  | 'cultural_relevance'    // 문화적 관련성
  | 'regional_connection'   // 지역적 연결성
  | 'age_appropriate'       // 연령 적절성
  | 'political_resonance'   // 정치적 공감
  | 'trust_building';       // 신뢰 구축

export type EffectivenessMetricType = 
  | 'open_rate'       // 열람률
  | 'click_rate'      // 클릭률
  | 'response_rate'   // 응답률
  | 'conversion_rate' // 전환율
  | 'engagement_rate' // 참여율
  | 'trust_score';    // 신뢰도 점수

export type CulturalSensitivityLevel = 
  | 'low'    // 기본적 문화 고려
  | 'medium' // 보통 수준 문화 고려
  | 'high'   // 높은 수준 문화 고려
  | 'ultra'; // 초고도 문화 고려 (선거 시즌 등)

// 한국 행정구역 관련
export interface KoreanRegion {
  code: string;
  name: string;
  level: 'sido' | 'sigungu' | 'dong';
  parentCode?: string;
  dialectCode: KoreanDialect;
  isMetropolitan: boolean;
}

// API 응답 래퍼
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// 실시간 개인화 상태
export interface PersonalizationStatus {
  campaignId: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number; // 초 단위
  processedMessages: number;
  totalMessages: number;
  errors?: string[];
}

// 개인화 설정
export interface PersonalizationSettings {
  tenantId: string;
  defaultDialect: KoreanDialect;
  defaultFormalityLevel: KoreanFormalityLevel;
  enabledGoals: PersonalizationGoalType[];
  culturalSensitivityLevel: CulturalSensitivityLevel;
  abTestingEnabled: boolean;
  maxVariantsPerMessage: number;
  confidenceThreshold: number; // 0.0 - 1.0
  autoApprovalThreshold: number; // 0.0 - 1.0
}