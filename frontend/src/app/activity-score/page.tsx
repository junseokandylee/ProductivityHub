'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Target, 
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Calendar,
  Award,
  BarChart3,
  Activity,
  Clock,
  Filter,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface ActivityScore {
  id: string;
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  description: string;
  lastUpdated: string;
}

interface ScoreMetrics {
  totalScore: number;
  maxTotalScore: number;
  overallPercentage: number;
  rank: number;
  totalUsers: number;
  weeklyChange: number;
}

// Mock data for activity scores
const mockScores: ActivityScore[] = [
  {
    id: '1',
    category: '캠페인 참여도',
    score: 850,
    maxScore: 1000,
    percentage: 85,
    trend: 'up',
    trendValue: 12,
    description: '캠페인 생성 및 실행 활동',
    lastUpdated: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    category: '연락처 관리',
    score: 720,
    maxScore: 1000,
    percentage: 72,
    trend: 'up',
    trendValue: 8,
    description: '연락처 추가, 분류, 업데이트 활동',
    lastUpdated: '2024-01-15T09:30:00Z'
  },
  {
    id: '3',
    category: '응답률 최적화',
    score: 630,
    maxScore: 1000,
    percentage: 63,
    trend: 'down',
    trendValue: -5,
    description: '메시지 응답률 향상 노력',
    lastUpdated: '2024-01-15T09:00:00Z'
  },
  {
    id: '4',
    category: '일정 관리',
    score: 780,
    maxScore: 1000,
    percentage: 78,
    trend: 'stable',
    trendValue: 0,
    description: '일정 계획 및 실행 정확도',
    lastUpdated: '2024-01-15T08:45:00Z'
  },
  {
    id: '5',
    category: '분석 활용도',
    score: 540,
    maxScore: 1000,
    percentage: 54,
    trend: 'up',
    trendValue: 15,
    description: '데이터 분석 및 인사이트 활용',
    lastUpdated: '2024-01-15T08:30:00Z'
  }
];

const mockMetrics: ScoreMetrics = {
  totalScore: 3520,
  maxTotalScore: 5000,
  overallPercentage: 70.4,
  rank: 12,
  totalUsers: 150,
  weeklyChange: 6.2
};

const getScoreColor = (percentage: number) => {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getTrendIcon = (trend: string, value: number) => {
  switch (trend) {
    case 'up':
      return <ArrowUp className="h-4 w-4 text-green-600" />;
    case 'down':
      return <ArrowDown className="h-4 w-4 text-red-600" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
};

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-500';
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export default function ActivityScorePage() {
  const [scores, setScores] = useState<ActivityScore[]>(mockScores);
  const [metrics, setMetrics] = useState<ScoreMetrics>(mockMetrics);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
      // Add small random variations to simulate real data changes
      const updatedScores = scores.map(score => ({
        ...score,
        score: Math.max(0, score.score + Math.floor(Math.random() * 20) - 10),
        percentage: Math.max(0, Math.min(100, score.percentage + Math.floor(Math.random() * 4) - 2))
      }));
      setScores(updatedScores);
    }, 1500);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              활동 점수를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">활동 점수</h1>
            <p className="text-gray-600 mt-1">
              정치 활동의 효율성과 성과를 측정하고 개선하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">활동 점수를 불러오는 중...</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && (
          <>
            {/* Overall Score Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">총 활동 점수</p>
                      <p className="text-3xl font-bold">{metrics.totalScore.toLocaleString()}</p>
                      <p className="text-blue-100 text-sm">
                        {metrics.maxTotalScore.toLocaleString()}점 만점
                      </p>
                    </div>
                    <Target className="h-12 w-12 text-blue-200" />
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center text-sm">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      전주 대비 {metrics.weeklyChange}% 증가
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">전체 평균</p>
                      <p className="text-3xl font-bold">{metrics.overallPercentage}%</p>
                      <p className="text-gray-600 text-sm">활동 효율성</p>
                    </div>
                    <Activity className="h-12 w-12 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">현재 순위</p>
                      <p className="text-3xl font-bold">#{metrics.rank}</p>
                      <p className="text-gray-600 text-sm">{metrics.totalUsers}명 중</p>
                    </div>
                    <Award className="h-12 w-12 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">이번 주 개선</p>
                      <p className="text-3xl font-bold text-green-600">+{metrics.weeklyChange}%</p>
                      <p className="text-gray-600 text-sm">지난주 대비</p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Score Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {scores.map((score) => (
                <Card key={score.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{score.category}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(score.trend, score.trendValue)}
                        <span className={`text-sm font-medium ${getTrendColor(score.trend)}`}>
                          {score.trend === 'stable' ? '변화없음' : 
                           `${score.trend === 'up' ? '+' : ''}${score.trendValue}%`}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-bold ${getScoreColor(score.percentage)}`}>
                          {score.score.toLocaleString()}점
                        </span>
                        <Badge variant="outline" className={getScoreColor(score.percentage)}>
                          {score.percentage}%
                        </Badge>
                      </div>
                      
                      <Progress 
                        value={score.percentage} 
                        className="h-2"
                        // Note: You might need to add custom styling for colored progress bars
                      />
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{score.description}</span>
                        <span>{score.maxScore.toLocaleString()}점 만점</span>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        마지막 업데이트: {formatDate(score.lastUpdated)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Improvement Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  개선 추천사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scores
                    .filter(score => score.percentage < 70)
                    .sort((a, b) => a.percentage - b.percentage)
                    .map((score, index) => (
                      <div key={score.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{score.category} 개선</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            현재 {score.percentage}%로 개선이 필요한 영역입니다.
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" size="sm">
                              우선순위 {index === 0 ? '높음' : index === 1 ? '중간' : '낮음'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {score.trend === 'down' ? '하락 추세 주의' : '개선 가능'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {scores.filter(score => score.percentage < 70).length === 0 && (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-2">훌륭한 성과입니다!</h3>
                      <p className="text-gray-600">
                        모든 영역에서 우수한 점수를 기록하고 있습니다. 현재 수준을 유지하세요.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Stats Footer */}
        {!isLoading && (
          <div className="mt-8 text-sm text-gray-500 text-center">
            마지막 업데이트: {formatDate(new Date().toISOString())} | 
            전체 {scores.length}개 활동 영역 평가
          </div>
        )}
      </div>
    </div>
  );
}