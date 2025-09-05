import { rest } from 'msw';

// Mock data for Korean regions and demographics
export const mockKoreanRegions = [
  { code: '11', name: '서울특별시', dialectCode: '서울말' },
  { code: '26', name: '부산광역시', dialectCode: '부산말' },
  { code: '27', name: '대구광역시', dialectCode: '대구말' },
  { code: '29', name: '광주광역시', dialectCode: '전라도' },
  { code: '30', name: '대전광역시', dialectCode: '충청도' },
  { code: '49', name: '제주특별자치도', dialectCode: '제주도' },
];

// Mock personalization data
export const mockPersonalizationResponse = {
  personalizationId: 'p001',
  originalMessage: '안녕하십니까? 여러분과 함께 하겠습니다.',
  personalizedVariants: [
    {
      id: 'v001',
      personalizedMessage: '안녕하시요? 부산 시민 여러분과 함께하겠습니다.',
      targetDemographics: {
        ageGroup: '40s',
        regionName: '부산광역시',
        regionCode: '26',
        occupation: '자영업자'
      },
      dialect: '부산말',
      formalityLevel: '존댓말',
      effectivenessScore: 0.85,
      confidence: 0.92,
      culturalMarkers: ['지역 정체성', '친근한 접근', '경상도 억양'],
      abTestGroup: 'A',
      usesPoliticalTerms: true
    },
    {
      id: 'v002',
      personalizedMessage: '안녕하십니까? 서울 시민 여러분을 위해 최선을 다하겠습니다.',
      targetDemographics: {
        ageGroup: '30s',
        regionName: '서울특별시',
        regionCode: '11',
        occupation: '회사원'
      },
      dialect: '서울말',
      formalityLevel: '높은 존댓말',
      effectivenessScore: 0.78,
      confidence: 0.89,
      culturalMarkers: ['표준어', '격식있는 표현', '도시적 감각'],
      abTestGroup: 'B',
      usesPoliticalTerms: true
    }
  ],
  generatedAt: new Date().toISOString(),
  processingTimeMs: 2340
};

// Mock compliance data
export const mockComplianceData = {
  overallScore: 0.885,
  totalViolations: 3,
  activeViolations: 2,
  resolvedViolations: 1,
  spendingUtilization: 0.75,
  totalSpent: 187500000,
  totalLimit: 250000000,
  lastUpdated: new Date().toISOString()
};

export const mockViolations = [
  {
    id: 'v001',
    type: '공직선거법 위반',
    severity: 'high',
    description: '인터넷 광고 게시 기간 위반',
    article: '공직선거법 제82조의5',
    detectedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'active',
    recommendedAction: '해당 광고 즉시 삭제 필요'
  },
  {
    id: 'v002',
    type: '정치자금법 위반',
    severity: 'medium',
    description: '지출 한도 90% 초과 경고',
    article: '정치자금법 제45조',
    detectedAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'monitoring',
    recommendedAction: '추가 지출 제한 검토'
  },
  {
    id: 'v003',
    type: '개인정보보호법 위반',
    severity: 'low',
    description: '동의서 양식 업데이트 필요',
    article: '개인정보보호법 제22조',
    detectedAt: new Date(Date.now() - 259200000).toISOString(),
    status: 'resolved',
    recommendedAction: '완료됨'
  }
];

export const mockSpendingCategories = [
  {
    id: 'cat001',
    name: '선전비용',
    spent: 75000000,
    limit: 100000000,
    utilization: 0.75,
    subcategories: [
      { name: 'AI 메시지 개인화', spent: 12500000, limit: 25000000 },
      { name: '온라인 광고', spent: 35000000, limit: 50000000 },
      { name: '인쇄물 제작', spent: 27500000, limit: 25000000 }
    ]
  },
  {
    id: 'cat002',
    name: '행사비용',
    spent: 62500000,
    limit: 75000000,
    utilization: 0.83,
    subcategories: [
      { name: '집회 운영비', spent: 40000000, limit: 50000000 },
      { name: '장비 대여비', spent: 22500000, limit: 25000000 }
    ]
  },
  {
    id: 'cat003',
    name: '통신비',
    spent: 25000000,
    limit: 30000000,
    utilization: 0.83,
    subcategories: [
      { name: '문자 발송비', spent: 15000000, limit: 20000000 },
      { name: '전화 통신비', spent: 10000000, limit: 10000000 }
    ]
  }
];

// Korean Language Processing API handlers
export const koreanLanguageHandlers = [
  rest.post('/api/korean-language/dialect-convert', (req, res, ctx) => {
    return res(
      ctx.json({
        originalText: '안녕하십니까? 좋은 하루 되세요.',
        convertedText: '안녕하시요? 좋은 하루 되이소.',
        sourceDialect: '서울말',
        targetDialect: '부산말',
        confidence: 0.94,
        culturalMarkers: ['경상도 억양', '친근한 어조', '지역 정체성'],
        processingTimeMs: 245
      })
    );
  }),

  rest.post('/api/korean-language/analyze-honorifics', (req, res, ctx) => {
    return res(
      ctx.json({
        text: '안녕하십니까? 도움이 필요하시면 언제든지 말씀해 주세요.',
        honorificLevel: 'high',
        appropriateContext: ['공식 회의', '선거 연설', '어르신 대상'],
        suggestions: ['적절한 높임말 사용', '상황에 맞는 격식'],
        confidence: 0.92,
        culturalSensitivityScore: 0.88
      })
    );
  }),

  rest.post('/api/korean-language/validate-political-terms', (req, res, ctx) => {
    return res(
      ctx.json({
        text: '공약을 성실히 이행하겠습니다. 민생을 위해 노력하겠습니다.',
        complianceScore: 0.91,
        validTerms: ['공약', '이행', '민생', '노력'],
        invalidTerms: [],
        risks: [],
        warnings: [],
        koreanElectionLawCompliant: true,
        suggestions: ['구체적인 공약 내용 추가 권장']
      })
    );
  }),

  rest.post('/api/korean-language/analyze-cultural-sensitivity', (req, res, ctx) => {
    return res(
      ctx.json({
        sensitivityLevel: 'high',
        confidence: 0.89,
        culturalMarkers: ['존댓말 적절 사용', '전통적 가치 존중'],
        recommendations: ['지역별 문화 차이 고려', '세대간 소통 방식 조정'],
        riskAreas: []
      })
    );
  }),

  rest.post('/api/korean-language/batch-process', (req, res, ctx) => {
    const { texts } = req.body as any;
    
    return res(
      ctx.json({
        results: texts.map((text: string, index: number) => ({
          originalText: text,
          dialectConversion: {
            convertedText: text.replace(/습니다/g, '십니다'),
            targetDialect: '부산말',
            confidence: 0.85 + (index * 0.02)
          },
          honorificAnalysis: {
            level: 'medium',
            score: 0.80 + (index * 0.03)
          },
          politicalTermValidation: {
            compliant: true,
            score: 0.88 + (index * 0.01)
          },
          confidence: 0.87 + (index * 0.015)
        })),
        processingTimeMs: 1250,
        batchSize: texts.length
      })
    );
  })
];

// Personalization API handlers
export const personalizationHandlers = [
  rest.post('/api/personalization/generate', (req, res, ctx) => {
    return res(
      ctx.delay(2000), // Simulate processing time
      ctx.json(mockPersonalizationResponse)
    );
  }),

  rest.post('/api/personalization/preview', (req, res, ctx) => {
    return res(
      ctx.json({
        personalizedMessage: '안녕하시요? 부산 시민분들과 함께하겠습니다.',
        dialect: '부산말',
        formalityLevel: '존댓말',
        effectivenessScore: 0.82,
        confidence: 0.89,
        culturalMarkers: ['지역 정체성', '친근함'],
        estimatedReachIncrease: 0.15
      })
    );
  }),

  rest.post('/api/personalization/analyze', (req, res, ctx) => {
    return res(
      ctx.json({
        campaignId: 'camp001',
        effectivenessMetrics: {
          overallImprovement: 0.23,
          openRateIncrease: 0.18,
          clickRateIncrease: 0.21,
          responseRateIncrease: 0.15
        },
        dialectPerformance: {
          '서울말': { effectiveness: 0.78, sampleSize: 1245 },
          '부산말': { effectiveness: 0.85, sampleSize: 892 },
          '전라도': { effectiveness: 0.82, sampleSize: 743 }
        },
        demographicBreakdown: [
          { ageGroup: '20s', effectiveness: 0.79, sampleSize: 567 },
          { ageGroup: '30s', effectiveness: 0.83, sampleSize: 1023 },
          { ageGroup: '40s', effectiveness: 0.87, sampleSize: 1156 },
          { ageGroup: '50s', effectiveness: 0.85, sampleSize: 934 }
        ]
      })
    );
  }),

  rest.get('/api/personalization/demographics', (req, res, ctx) => {
    return res(
      ctx.json({
        regions: mockKoreanRegions,
        demographics: {
          ageDistribution: {
            '20s': 0.18,
            '30s': 0.25,
            '40s': 0.22,
            '50s': 0.20,
            '60plus': 0.15
          },
          occupationDistribution: {
            '회사원': 0.35,
            '자영업자': 0.22,
            '공무원': 0.12,
            '전문직': 0.18,
            '기타': 0.13
          },
          dialectPreferences: {
            '서울말': 0.45,
            '부산말': 0.15,
            '경상도': 0.18,
            '전라도': 0.12,
            '충청도': 0.10
          }
        }
      })
    );
  }),

  rest.get('/api/personalization/abtest/:campaignId', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          testId: 'ab001',
          name: '서울말 vs 친근한 서울말',
          status: 'running',
          variantA: { name: '표준 서울말', performance: 0.78, sampleSize: 1247 },
          variantB: { name: '친근한 서울말', performance: 0.83, sampleSize: 1189 },
          confidence: 0.92,
          winner: 'B',
          startDate: new Date(Date.now() - 604800000).toISOString()
        },
        {
          testId: 'ab002',
          name: '부산 방언 강도 테스트',
          status: 'completed',
          variantA: { name: '약한 부산말', performance: 0.81, sampleSize: 856 },
          variantB: { name: '강한 부산말', performance: 0.87, sampleSize: 834 },
          confidence: 0.89,
          winner: 'B',
          startDate: new Date(Date.now() - 1209600000).toISOString()
        }
      ])
    );
  })
];

// Compliance API handlers
export const complianceHandlers = [
  rest.get('/api/compliance/dashboard', (req, res, ctx) => {
    return res(ctx.json(mockComplianceData));
  }),

  rest.get('/api/compliance/violations', (req, res, ctx) => {
    return res(ctx.json(mockViolations));
  }),

  rest.get('/api/compliance/spending', (req, res, ctx) => {
    return res(
      ctx.json({
        totalSpent: mockComplianceData.totalSpent,
        totalLimit: mockComplianceData.totalLimit,
        utilization: mockComplianceData.spendingUtilization,
        categories: mockSpendingCategories,
        recentTransactions: [
          {
            id: 't001',
            description: 'AI 메시지 개인화 처리',
            amount: 125000,
            category: '선전비용',
            date: new Date(Date.now() - 3600000).toISOString(),
            complianceStatus: 'approved'
          },
          {
            id: 't002',
            description: '온라인 광고 게재',
            amount: 500000,
            category: '선전비용',
            date: new Date(Date.now() - 7200000).toISOString(),
            complianceStatus: 'approved'
          }
        ],
        projectedSpending: {
          nextWeek: 15000000,
          nextMonth: 45000000,
          untilElection: 62500000
        }
      })
    );
  }),

  rest.get('/api/compliance/rules', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 'rule001',
          name: '공직선거법 제82조의5 - 인터넷 광고 제한',
          description: '선거일 전 14일부터 선거일까지 인터넷 광고 제한',
          lawReference: '공직선거법 제82조의5',
          status: 'active',
          severity: 'high',
          autoEnforcement: true,
          affectedFeatures: ['personalization', 'campaigns']
        },
        {
          id: 'rule002',
          name: '정치자금법 제45조 - 지출한도',
          description: '선거비용 지출한도 준수',
          lawReference: '정치자금법 제45조',
          status: 'active',
          severity: 'high',
          autoEnforcement: true,
          affectedFeatures: ['spending', 'campaigns']
        },
        {
          id: 'rule003',
          name: '방언 사용 가이드라인',
          description: '지역 방언 사용 시 이해도 확보 필요',
          lawReference: '내부 가이드라인',
          status: 'active',
          severity: 'medium',
          autoEnforcement: false,
          affectedFeatures: ['personalization', 'korean-language']
        }
      ])
    );
  }),

  rest.post('/api/compliance/validate-message', (req, res, ctx) => {
    return res(
      ctx.json({
        messageId: 'm001',
        complianceStatus: 'approved',
        overallScore: 0.89,
        lawValidation: {
          '공직선거법': { compliant: true, score: 0.92, issues: [] },
          '정치자금법': { compliant: true, score: 0.88, issues: [] },
          '개인정보보호법': { compliant: true, score: 0.87, issues: [] }
        },
        violations: [],
        warnings: ['방언 사용으로 인한 이해도 검토 권장'],
        recommendations: ['표준어 병기 고려', '지역별 테스트 실시']
      })
    );
  }),

  rest.post('/api/compliance/reports/generate', (req, res, ctx) => {
    return res(
      ctx.delay(1500), // Simulate report generation time
      ctx.json({
        reportId: 'rep001',
        status: 'completed',
        downloadUrl: '/api/compliance/reports/download/rep001',
        generatedAt: new Date().toISOString(),
        includedPeriod: {
          start: new Date(Date.now() - 2592000000).toISOString(),
          end: new Date().toISOString()
        },
        sections: [
          'compliance_overview',
          'violation_summary',
          'spending_analysis',
          'personalization_activities',
          'korean_language_usage'
        ]
      })
    );
  })
];

// Combined handlers for MSW setup
export const handlers = [
  ...koreanLanguageHandlers,
  ...personalizationHandlers,
  ...complianceHandlers
];