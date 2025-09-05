"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  MapPin, 
  Calendar, 
  Briefcase, 
  GraduationCap,
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  Search,
  RefreshCw,
  Download,
  Globe
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { KOREAN_REGIONS, DIALECT_CHARACTERISTICS, getDemographicsData } from '@/lib/api/personalization';
import { 
  DemographicInsights, 
  RegionDistribution, 
  AgeGroupDistribution,
  DialectPreferences,
  OccupationDistribution 
} from '@/lib/types/korean-personalization';

interface DemographicSegmentationProps {
  className?: string;
}

interface FilterState {
  regionFilter: string;
  ageFilter: string;
  occupationFilter: string;
  searchQuery: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export default function DemographicSegmentation({ className }: DemographicSegmentationProps) {
  const [demographics, setDemographics] = useState<DemographicInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterState>({
    regionFilter: '',
    ageFilter: '',
    occupationFilter: '',
    searchQuery: ''
  });

  // 데이터 로드
  useEffect(() => {
    loadDemographicsData();
  }, [filters.regionFilter]);

  const loadDemographicsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDemographicsData(filters.regionFilter || undefined);
      
      if (response.success && response.data) {
        setDemographics(response.data);
      } else {
        setError(response.error || '데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 지역 분포 차트 데이터
  const regionChartData = demographics?.regionDistribution?.map(region => ({
    name: region.regionName.length > 4 ? region.regionName.substring(0, 4) + '...' : region.regionName,
    fullName: region.regionName,
    count: region.count,
    percentage: region.percentage,
    effectiveness: region.averageEffectiveness * 100
  })) || [];

  // 연령대 분포 차트 데이터
  const ageChartData = demographics?.ageGroupDistribution?.map(age => ({
    name: age.ageGroup,
    count: age.count,
    percentage: age.percentage,
    effectiveness: age.averageEffectiveness * 100
  })) || [];

  // 방언 선호도 차트 데이터
  const dialectChartData = demographics?.dialectPreferences?.map((dialect, index) => ({
    name: dialect.dialect,
    sampleSize: dialect.sampleSize,
    effectiveness: dialect.effectiveness * 100,
    regions: dialect.regionCodes.length,
    color: COLORS[index % COLORS.length]
  })) || [];

  // 직업 분포 차트 데이터
  const occupationChartData = demographics?.occupationDistribution?.map(occupation => ({
    name: occupation.occupation,
    count: occupation.count,
    percentage: occupation.percentage,
    effectiveness: occupation.averageEffectiveness * 100
  })) || [];

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      regionFilter: '',
      ageFilter: '',
      occupationFilter: '',
      searchQuery: ''
    });
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw size={32} className="animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">인구통계 데이터를 로드하는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadDemographicsData} variant="outline">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 및 필터 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users size={24} />
                유권자 인구통계 분석
              </CardTitle>
              <CardDescription>
                한국 지역별 유권자 데이터와 개인화 효과성 분석
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download size={16} className="mr-1" />
                내보내기
              </Button>
              <Button onClick={loadDemographicsData} variant="outline" size="sm">
                <RefreshCw size={16} className="mr-1" />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <Label>지역 필터</Label>
              <Select 
                value={filters.regionFilter} 
                onValueChange={(value) => handleFilterChange('regionFilter', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체 지역" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체 지역</SelectItem>
                  {KOREAN_REGIONS.map(region => (
                    <SelectItem key={region.code} value={region.code}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-48">
              <Label>검색</Label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="지역, 직업 검색..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {(filters.regionFilter || filters.searchQuery) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <Filter size={12} />
                필터 지우기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 유권자</p>
                <p className="text-2xl font-bold">
                  {demographics?.regionDistribution.reduce((sum, region) => sum + region.count, 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">커버 지역</p>
                <p className="text-2xl font-bold">
                  {demographics?.regionDistribution.length || 0}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 효과성</p>
                <p className="text-2xl font-bold">
                  {Math.round((demographics?.regionDistribution.reduce((sum, region) => sum + region.averageEffectiveness, 0) || 0) / (demographics?.regionDistribution.length || 1) * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">방언 유형</p>
                <p className="text-2xl font-bold">
                  {demographics?.dialectPreferences.length || 0}
                </p>
              </div>
              <Globe className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 size={16} />
            개요
          </TabsTrigger>
          <TabsTrigger value="regions" className="flex items-center gap-2">
            <MapPin size={16} />
            지역별
          </TabsTrigger>
          <TabsTrigger value="demographics" className="flex items-center gap-2">
            <Users size={16} />
            인구통계
          </TabsTrigger>
          <TabsTrigger value="dialects" className="flex items-center gap-2">
            <Globe size={16} />
            방언 분석
          </TabsTrigger>
        </TabsList>

        {/* 개요 탭 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 지역 분포 막대 차트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin size={20} />
                  지역별 유권자 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionChartData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'count' ? `${value}명` : `${value}%`,
                        name === 'count' ? '유권자 수' : '효과성'
                      ]}
                      labelFormatter={(label) => {
                        const region = regionChartData.find(r => r.name === label);
                        return region?.fullName || label;
                      }}
                    />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 연령대 분포 파이 차트 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  연령대 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip formatter={(value) => `${value}명`} />
                    <RechartsPieChart
                      data={ageChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                    >
                      {ageChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {ageChartData.map((entry, index) => (
                    <Badge key={entry.name} variant="outline" className="text-xs">
                      <div 
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {entry.name}: {entry.count}명
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 효과성 트렌드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                지역별 개인화 효과성
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={regionChartData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '효과성']}
                    labelFormatter={(label) => {
                      const region = regionChartData.find(r => r.name === label);
                      return region?.fullName || label;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="effectiveness" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 지역별 탭 */}
        <TabsContent value="regions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {regionChartData.slice(0, 9).map((region, index) => (
              <Card key={region.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{region.fullName}</h3>
                    <Badge variant="outline">
                      {region.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>유권자 수</span>
                      <span className="font-medium">{region.count.toLocaleString()}명</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>개인화 효과성</span>
                      <span className="font-medium text-green-600">
                        {region.effectiveness.toFixed(1)}%
                      </span>
                    </div>
                    
                    <Progress value={region.effectiveness} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 인구통계 탭 */}
        <TabsContent value="demographics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 직업 분포 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase size={20} />
                  직업별 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={occupationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}명`} />
                    <Bar dataKey="count" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 교육 수준별 효과성 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap size={20} />
                  직업별 개인화 효과성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {occupationChartData.map((occupation, index) => (
                    <div key={occupation.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{occupation.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {occupation.count}명
                          </span>
                          <Badge variant="outline">
                            {occupation.effectiveness.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={occupation.effectiveness} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 방언 분석 탭 */}
        <TabsContent value="dialects" className="space-y-6">
          {/* 방언 효과성 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe size={20} />
                방언별 개인화 효과성
              </CardTitle>
              <CardDescription>
                지역 방언에 따른 메시지 개인화 효과성 분석
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dialectChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'effectiveness' ? `${value}%` : `${value}명`,
                      name === 'effectiveness' ? '효과성' : '표본 크기'
                    ]}
                  />
                  <Bar dataKey="effectiveness" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 방언별 상세 정보 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dialectChartData.map((dialect) => {
              const characteristics = DIALECT_CHARACTERISTICS[dialect.name as keyof typeof DIALECT_CHARACTERISTICS];
              
              return (
                <Card key={dialect.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{dialect.name}</CardTitle>
                    <CardDescription>
                      {characteristics?.name || '방언 정보'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label>표본 크기</Label>
                        <p className="font-medium">{dialect.sampleSize.toLocaleString()}명</p>
                      </div>
                      <div>
                        <Label>효과성</Label>
                        <p className="font-medium text-green-600">
                          {dialect.effectiveness.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <Label>커버 지역</Label>
                        <p className="font-medium">{dialect.regions}개 지역</p>
                      </div>
                      <div>
                        <Label>격식 수준</Label>
                        <p className="font-medium">
                          {characteristics?.formalityLevels.length || 0}단계
                        </p>
                      </div>
                    </div>

                    {characteristics && (
                      <>
                        <div>
                          <Label>특징</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {characteristics.characteristics.map((char, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {char}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label>예시 표현</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {characteristics.examples.map((example, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {example}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Progress value={dialect.effectiveness} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}