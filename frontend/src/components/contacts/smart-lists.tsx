'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Users, Activity, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { activityScoreAPI, ActivityScoreDistribution, ContactWithScore } from '@/lib/api/activity-score';

interface SmartListsProps {
  onContactsChange: (contacts: ContactWithScore[]) => void;
  selectedList: string | null;
  onListSelect: (listId: string | null) => void;
}

export default function SmartLists({ onContactsChange, selectedList, onListSelect }: SmartListsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Fetch distribution data
  const { data: distribution, isLoading: isDistributionLoading } = useQuery({
    queryKey: ['activity-score-distribution'],
    queryFn: async () => {
      const response = await activityScoreAPI.getScoreDistribution();
      return response.success ? response.data : null;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Smart list definitions
  const smartLists = [
    {
      id: 'high-activity',
      name: '높은 활동성',
      description: '활동 점수 70점 이상',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      count: distribution?.highActivity || 0,
      score: '70-100',
      fetchContacts: () => activityScoreAPI.getContactsByActivityLevel('high'),
    },
    {
      id: 'medium-activity',
      name: '중간 활동성',
      description: '활동 점수 30-69점',
      icon: Minus,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      count: distribution?.mediumActivity || 0,
      score: '30-69',
      fetchContacts: () => activityScoreAPI.getContactsByActivityLevel('medium'),
    },
    {
      id: 'low-activity',
      name: '낮은 활동성',
      description: '활동 점수 30점 미만',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      count: distribution?.lowActivity || 0,
      score: '0-29',
      fetchContacts: () => activityScoreAPI.getContactsByActivityLevel('low'),
    },
    {
      id: 'top-performers',
      name: '최상위 고객',
      description: '활동 점수 90점 이상',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      count: distribution ? Object.entries(distribution.scoreHistogram)
        .filter(([score]) => parseInt(score) >= 90)
        .reduce((sum, [, count]) => sum + count, 0) : 0,
      score: '90-100',
      fetchContacts: () => activityScoreAPI.getContactsByScoreRange(90, 100),
    },
  ];

  const handleListSelect = async (listId: string) => {
    if (selectedList === listId) {
      onListSelect(null);
      onContactsChange([]);
      return;
    }

    const smartList = smartLists.find(list => list.id === listId);
    if (!smartList) return;

    setIsLoading(listId);
    try {
      const response = await smartList.fetchContacts();
      if (response.success) {
        onContactsChange(response.data);
        onListSelect(listId);
      } else {
        console.error('Failed to fetch contacts:', response.message);
      }
    } catch (error) {
      console.error('Error fetching smart list contacts:', error);
    } finally {
      setIsLoading(null);
    }
  };

  if (isDistributionLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5" />
          <h3 className="font-medium">Smart List</h3>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" />
        <h3 className="font-medium">Smart List</h3>
      </div>

      {/* Summary Stats */}
      {distribution && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">평균 점수:</span>
              <span className="ml-1 font-medium">{distribution.averageScore.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-gray-600">중앙값:</span>
              <span className="ml-1 font-medium">{distribution.medianScore.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {smartLists.map((list) => {
          const IconComponent = list.icon;
          const isSelected = selectedList === list.id;
          const isCurrentlyLoading = isLoading === list.id;

          return (
            <Button
              key={list.id}
              variant={isSelected ? 'default' : 'ghost'}
              className={`w-full justify-start h-auto p-3 ${
                !isSelected ? `hover:${list.bgColor} hover:${list.borderColor}` : ''
              }`}
              onClick={() => handleListSelect(list.id)}
              disabled={isCurrentlyLoading}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${list.bgColor} ${list.borderColor} border`}>
                    <IconComponent className={`h-4 w-4 ${list.color}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{list.name}</div>
                    <div className="text-xs text-gray-500">{list.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {isCurrentlyLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-transparent" />
                    ) : (
                      list.count.toLocaleString()
                    )}
                  </Badge>
                  <div className="text-xs text-gray-400 mt-1">{list.score}점</div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Additional Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => handleListSelect('all-contacts')}
        >
          <Users className="h-4 w-4 mr-2" />
          전체 연락처 보기
        </Button>
      </div>
    </Card>
  );
}