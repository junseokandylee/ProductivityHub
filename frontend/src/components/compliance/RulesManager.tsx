'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Gavel, 
  Plus,
  Settings,
  Shield,
  DollarSign,
  Users
} from 'lucide-react';

export function RulesManager() {
  const ruleCategories = [
    {
      name: '공직선거법',
      icon: Gavel,
      count: 24,
      color: 'bg-blue-100 text-blue-800',
      description: '선거 관련 규정 및 제한 사항'
    },
    {
      name: '정치자금법',
      icon: DollarSign,
      count: 15,
      color: 'bg-green-100 text-green-800',
      description: '정치자금 모금 및 지출 관련 규정'
    },
    {
      name: '개인정보보호법',
      icon: Shield,
      count: 18,
      color: 'bg-purple-100 text-purple-800',
      description: '개인정보 수집, 이용, 제공 관련 규정'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">규칙 관리</h3>
          <p className="text-sm text-muted-foreground">
            한국 선거법 규정 준수를 위한 규칙을 관리합니다
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 규칙 추가
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ruleCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <category.icon className="h-5 w-5" />
                {category.name}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge className={category.color}>
                  {category.count}개 규칙
                </Badge>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>규칙 목록</CardTitle>
          <CardDescription>현재 활성화된 규정 준수 규칙들</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Gavel className="h-12 w-12 mx-auto mb-4" />
            <p>규칙 관리 인터페이스가 여기에 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}