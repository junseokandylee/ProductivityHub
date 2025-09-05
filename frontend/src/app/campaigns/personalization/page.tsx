"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  Globe, 
  Zap,
  BarChart3,
  Settings,
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { 
  generatePersonalizedMessages,
  previewPersonalization,
  analyzePersonalizationEffectiveness,
  getDemographicsData,
  getABTestResults,
  KOREAN_REGIONS,
  DIALECT_CHARACTERISTICS,
  validateKoreanMessage
} from '@/lib/api/personalization';
import { 
  MessagePersonalizationRequest,
  MessagePersonalizationResponse,
  VoterDemographics,
  PersonalizationGoal,
  KoreanDialect,
  KoreanAgeGroup,
  KoreanOccupation,
  KoreanFormalityLevel
} from '@/lib/types/korean-personalization';

interface PersonalizationState {
  originalMessage: string;
  selectedCampaignId: string;
  targetDemographics: VoterDemographics[];
  personalizationGoals: PersonalizationGoal[];
  culturalSensitivityLevel: 'low' | 'medium' | 'high' | 'ultra';
  abTestingEnabled: boolean;
  isGenerating: boolean;
  generationProgress: number;
  results: MessagePersonalizationResponse | null;
  previewVariant: any | null;
  errors: string[];
  validationIssues: string[];
}

export default function PersonalizationPage() {
  const [state, setState] = useState<PersonalizationState>({
    originalMessage: '',
    selectedCampaignId: '',
    targetDemographics: [],
    personalizationGoals: [
      { type: 'increase_engagement', weight: 0.8, description: '참여도 향상' },
      { type: 'cultural_relevance', weight: 0.9, description: '문화적 관련성' },
      { type: 'regional_connection', weight: 0.7, description: '지역적 연결성' }
    ],
    culturalSensitivityLevel: 'medium',
    abTestingEnabled: true,
    isGenerating: false,
    generationProgress: 0,
    results: null,
    previewVariant: null,
    errors: [],
    validationIssues: []
  });

  const [activeTab, setActiveTab] = useState('create');
  const [demographicsData, setDemographicsData] = useState<any>(null);

  // 메시지 검증
  useEffect(() => {
    if (state.originalMessage) {
      const issues = validateKoreanMessage(state.originalMessage);
      setState(prev => ({ ...prev, validationIssues: issues }));
    } else {
      setState(prev => ({ ...prev, validationIssues: [] }));
    }
  }, [state.originalMessage]);

  // 인구통계 데이터 로드
  useEffect(() => {
    const loadDemographics = async () => {
      try {
        const response = await getDemographicsData();
        if (response.success) {
          setDemographicsData(response.data);
        }
      } catch (error) {
        console.error('인구통계 데이터 로드 실패:', error);
      }
    };

    loadDemographics();
  }, []);

  // 개인화 메시지 생성
  const handleGeneratePersonalization = async () => {
    if (!state.originalMessage.trim()) {
      setState(prev => ({ 
        ...prev, 
        errors: ['원본 메시지를 입력해주세요.'] 
      }));
      return;
    }

    if (state.targetDemographics.length === 0) {
      setState(prev => ({ 
        ...prev, 
        errors: ['최소 하나의 타겟 인구통계를 설정해주세요.'] 
      }));
      return;
    }

    if (state.validationIssues.length > 0) {
      setState(prev => ({ 
        ...prev, 
        errors: ['메시지 검증 문제를 해결해주세요.'] 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      generationProgress: 0,
      errors: [],
      results: null 
    }));

    try {
      const request: MessagePersonalizationRequest = {
        campaignId: state.selectedCampaignId || 'demo-campaign',
        originalMessage: state.originalMessage,
        targetDemographics: state.targetDemographics,
        personalizationGoals: state.personalizationGoals,
        abTestingEnabled: state.abTestingEnabled,
        culturalSensitivityLevel: state.culturalSensitivityLevel
      };

      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setState(prev => {
          const newProgress = Math.min(prev.generationProgress + 10, 90);
          return { ...prev, generationProgress: newProgress };
        });
      }, 500);

      const response = await generatePersonalizedMessages(request);

      clearInterval(progressInterval);

      if (response.success && response.data) {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          generationProgress: 100,
          results: response.data,
          errors: []
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false,
          generationProgress: 0,
          errors: [response.error || '개인화 생성에 실패했습니다.']
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generationProgress: 0,
        errors: ['개인화 생성 중 오류가 발생했습니다.']
      }));
    }
  };

  // 미리보기 생성
  const handlePreview = async () => {
    if (!state.originalMessage.trim() || state.targetDemographics.length === 0) {
      return;
    }

    try {
      const response = await previewPersonalization(
        state.originalMessage,
        state.targetDemographics[0],
        state.personalizationGoals,
        state.culturalSensitivityLevel
      );

      if (response.success) {
        setState(prev => ({ ...prev, previewVariant: response.data }));
      }
    } catch (error) {
      console.error('미리보기 생성 실패:', error);
    }
  };

  // 타겟 인구통계 추가
  const addTargetDemographic = () => {
    const newDemographic: VoterDemographics = {
      ageGroup: '30s',
      gender: 'M',
      regionCode: '11',
      regionName: '서울특별시',
      preferredDialect: '서울말',
      educationLevel: '대졸',
      occupation: '회사원',
      incomeLevel: 'middle',
      politicalLeaning: '중도',
      interestIssues: [],
      communicationStyle: 'formal'
    };

    setState(prev => ({
      ...prev,
      targetDemographics: [...prev.targetDemographics, newDemographic]
    }));
  };

  // 타겟 인구통계 업데이트
  const updateTargetDemographic = (index: number, updates: Partial<VoterDemographics>) => {
    setState(prev => ({
      ...prev,
      targetDemographics: prev.targetDemographics.map((demo, i) => 
        i === index ? { ...demo, ...updates } : demo
      )
    }));
  };

  // 타겟 인구통계 제거
  const removeTargetDemographic = (index: number) => {
    setState(prev => ({
      ...prev,
      targetDemographics: prev.targetDemographics.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI 메시지 개인화 엔진
        </h1>
        <p className="text-gray-600">
          유권자 인구통계와 한국 문화적 맥락을 바탕으로 정치 캠페인 메시지를 개인화합니다
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <MessageSquare size={16} />
            메시지 생성
          </TabsTrigger>
          <TabsTrigger value="demographics" className="flex items-center gap-2">
            <Users size={16} />
            인구통계 분석
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 size={16} />
            결과 분석
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            설정
          </TabsTrigger>
        </TabsList>

        {/* 메시지 생성 탭 */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 메시지 입력 및 설정 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    원본 메시지
                  </CardTitle>
                  <CardDescription>
                    개인화할 원본 정치 캠페인 메시지를 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="예: 안녕하십니까? 저는 여러분의 더 나은 삶을 위해 최선을 다하겠습니다..."
                    value={state.originalMessage}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      originalMessage: e.target.value 
                    }))}
                    className="min-h-32"
                    maxLength={2000}
                  />
                  
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{state.originalMessage.length}/2000자</span>
                    {state.originalMessage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreview}
                        className="flex items-center gap-1"
                      >
                        <Play size={12} />
                        미리보기
                      </Button>
                    )}
                  </div>

                  {/* 검증 결과 */}
                  {state.validationIssues.length > 0 && (
                    <Alert>
                      <AlertTriangle size={16} />
                      <AlertDescription>
                        <div className="space-y-1">
                          {state.validationIssues.map((issue, index) => (
                            <div key={index} className="text-sm">{issue}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* 개인화 설정 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain size={20} />
                    개인화 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>문화적 민감성 수준</Label>
                    <Select 
                      value={state.culturalSensitivityLevel}
                      onValueChange={(value: any) => setState(prev => ({ 
                        ...prev, 
                        culturalSensitivityLevel: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">낮음 - 기본적 문화 고려</SelectItem>
                        <SelectItem value="medium">보통 - 표준 문화적 적응</SelectItem>
                        <SelectItem value="high">높음 - 세밀한 문화 고려</SelectItem>
                        <SelectItem value="ultra">최고 - 선거 수준 민감성</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>A/B 테스트 활성화</Label>
                      <p className="text-sm text-gray-500">
                        효과성 비교를 위한 변형 생성
                      </p>
                    </div>
                    <Switch
                      checked={state.abTestingEnabled}
                      onCheckedChange={(checked) => setState(prev => ({ 
                        ...prev, 
                        abTestingEnabled: checked 
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 개인화 목표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} />
                    개인화 목표
                  </CardTitle>
                  <CardDescription>
                    개인화 우선순위를 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {state.personalizationGoals.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{goal.description}</Label>
                        <span className="text-sm text-gray-500">
                          {Math.round(goal.weight * 100)}%
                        </span>
                      </div>
                      <Slider
                        value={[goal.weight * 100]}
                        onValueChange={([value]) => {
                          const newGoals = [...state.personalizationGoals];
                          newGoals[index].weight = value / 100;
                          setState(prev => ({ 
                            ...prev, 
                            personalizationGoals: newGoals 
                          }));
                        }}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* 타겟 인구통계 설정 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={20} />
                      타겟 인구통계
                    </div>
                    <Button
                      onClick={addTargetDemographic}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Users size={12} />
                      타겟 추가
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    개인화할 타겟 유권자 그룹을 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {state.targetDemographics.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>타겟 인구통계를 추가해주세요</p>
                      <Button
                        onClick={addTargetDemographic}
                        variant="outline"
                        className="mt-2"
                      >
                        첫 타겟 추가
                      </Button>
                    </div>
                  ) : (
                    state.targetDemographics.map((demo, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium">타겟 그룹 {index + 1}</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTargetDemographic(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            제거
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>연령대</Label>
                            <Select
                              value={demo.ageGroup || ''}
                              onValueChange={(value: KoreanAgeGroup) => 
                                updateTargetDemographic(index, { ageGroup: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="20s">20대</SelectItem>
                                <SelectItem value="30s">30대</SelectItem>
                                <SelectItem value="40s">40대</SelectItem>
                                <SelectItem value="50s">50대</SelectItem>
                                <SelectItem value="60plus">60세 이상</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>지역</Label>
                            <Select
                              value={demo.regionCode || ''}
                              onValueChange={(value) => {
                                const region = KOREAN_REGIONS.find(r => r.code === value);
                                updateTargetDemographic(index, { 
                                  regionCode: value,
                                  regionName: region?.name,
                                  preferredDialect: region?.dialectCode as KoreanDialect
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {KOREAN_REGIONS.map(region => (
                                  <SelectItem key={region.code} value={region.code}>
                                    {region.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>직업</Label>
                            <Select
                              value={demo.occupation || ''}
                              onValueChange={(value: KoreanOccupation) => 
                                updateTargetDemographic(index, { occupation: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="공무원">공무원</SelectItem>
                                <SelectItem value="자영업자">자영업자</SelectItem>
                                <SelectItem value="회사원">회사원</SelectItem>
                                <SelectItem value="농업">농업</SelectItem>
                                <SelectItem value="학생">학생</SelectItem>
                                <SelectItem value="주부">주부</SelectItem>
                                <SelectItem value="전문직">전문직</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>소통 스타일</Label>
                            <Select
                              value={demo.communicationStyle}
                              onValueChange={(value) => 
                                updateTargetDemographic(index, { communicationStyle: value as any })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="formal">격식있는</SelectItem>
                                <SelectItem value="casual">편안한</SelectItem>
                                <SelectItem value="respectful">공손한</SelectItem>
                                <SelectItem value="friendly">친근한</SelectItem>
                                <SelectItem value="authoritative">권위있는</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 flex-wrap">
                          <Badge variant="outline">
                            {demo.ageGroup} {demo.regionName}
                          </Badge>
                          <Badge variant="secondary">
                            {demo.preferredDialect}
                          </Badge>
                          <Badge variant="outline">
                            {demo.occupation}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* 미리보기 */}
              {state.previewVariant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play size={20} />
                      개인화 미리보기
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>원본 메시지</Label>
                        <div className="p-3 bg-gray-50 rounded border text-sm">
                          {state.originalMessage}
                        </div>
                      </div>
                      
                      <div>
                        <Label>개인화된 메시지</Label>
                        <div className="p-3 bg-blue-50 rounded border text-sm">
                          {state.previewVariant.personalizedMessage}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge>
                          방언: {state.previewVariant.dialect}
                        </Badge>
                        <Badge>
                          격식: {state.previewVariant.formalityLevel}
                        </Badge>
                        <Badge>
                          효과성: {Math.round(state.previewVariant.effectivenessScore * 100)}%
                        </Badge>
                        <Badge>
                          신뢰도: {Math.round(state.previewVariant.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 생성 버튼 및 진행률 */}
          <Card>
            <CardContent className="pt-6">
              {state.errors.length > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle size={16} />
                  <AlertDescription>
                    <div className="space-y-1">
                      {state.errors.map((error, index) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {state.isGenerating && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>개인화 메시지 생성 중...</span>
                    <span>{state.generationProgress}%</span>
                  </div>
                  <Progress value={state.generationProgress} className="w-full" />
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleGeneratePersonalization}
                  disabled={state.isGenerating || !state.originalMessage.trim() || state.targetDemographics.length === 0}
                  size="lg"
                  className="flex items-center gap-2 min-w-48"
                >
                  {state.isGenerating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      개인화 메시지 생성
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 생성 결과 */}
          {state.results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  개인화 결과
                </CardTitle>
                <CardDescription>
                  {state.results.personalizedVariants.length}개의 개인화된 변형이 생성되었습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {state.results.personalizedVariants.map((variant, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">변형 {index + 1}</h4>
                          <div className="flex gap-2">
                            <Badge variant={variant.abTestGroup ? "default" : "secondary"}>
                              {variant.abTestGroup ? `A/B 그룹 ${variant.abTestGroup}` : '기본'}
                            </Badge>
                            <Badge variant="outline">
                              효과성 {Math.round(variant.effectivenessScore * 100)}%
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <Label>개인화된 메시지</Label>
                          <div className="p-3 bg-green-50 rounded border text-sm mt-1">
                            {variant.personalizedMessage}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label>타겟 연령</Label>
                            <p>{variant.targetDemographics.ageGroup}</p>
                          </div>
                          <div>
                            <Label>지역</Label>
                            <p>{variant.targetDemographics.regionName}</p>
                          </div>
                          <div>
                            <Label>방언</Label>
                            <p>{variant.dialect}</p>
                          </div>
                          <div>
                            <Label>격식 수준</Label>
                            <p>{variant.formalityLevel}</p>
                          </div>
                        </div>

                        {variant.culturalMarkers.length > 0 && (
                          <div>
                            <Label>문화적 마커</Label>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {variant.culturalMarkers.map((marker, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {marker}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>신뢰도: {Math.round(variant.confidence * 100)}%</span>
                            {variant.usesPoliticalTerms && (
                              <span className="text-blue-600">정치 용어 포함</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              수정
                            </Button>
                            <Button size="sm">
                              사용
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 다른 탭들은 기본 구조만 제공 */}
        <TabsContent value="demographics">
          <Card>
            <CardHeader>
              <CardTitle>인구통계 분석</CardTitle>
              <CardDescription>유권자 인구통계 데이터와 트렌드 분석</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">인구통계 분석</h3>
                <p>유권자 데이터 분석 기능이 준비되었습니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>결과 분석</CardTitle>
              <CardDescription>개인화 효과성 및 A/B 테스트 결과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">결과 분석</h3>
                <p>개인화 효과성 분석 기능이 준비되었습니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>개인화 설정</CardTitle>
              <CardDescription>시스템 설정 및 기본값 구성</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">시스템 설정</h3>
                <p>개인화 시스템 설정 기능이 준비되었습니다.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}