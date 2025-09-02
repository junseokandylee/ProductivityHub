'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Download,
  Search,
  Filter,
  PieChart,
  LineChart,
  UserPlus,
  Zap
} from 'lucide-react'

interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  category: 'analytics' | 'performance' | 'growth' | 'finance'
  tags: string[]
  lastUpdated: string
  isPremium?: boolean
}

const reports: ReportCard[] = [
  {
    id: 'monthly',
    title: '월별 트렌드 분석',
    description: '월별 캠페인 성과 및 트렌드를 시각화하여 분석합니다',
    icon: <TrendingUp className="h-5 w-5" />,
    href: '/reports/monthly',
    category: 'analytics',
    tags: ['트렌드', '월별', '성과'],
    lastUpdated: '2024-01-15'
  },
  {
    id: 'campaigns',
    title: '캠페인 비교 분석',
    description: '여러 캠페인의 성과를 비교하고 최적의 전략을 찾습니다',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/reports/campaigns',
    category: 'performance',
    tags: ['캠페인', '비교', 'ROI'],
    lastUpdated: '2024-01-14'
  },
  {
    id: 'contacts',
    title: '연락처 성장 분석',
    description: '연락처 증가 추이와 세그먼트별 성장률을 분석합니다',
    icon: <UserPlus className="h-5 w-5" />,
    href: '/reports/contacts',
    category: 'growth',
    tags: ['연락처', '성장', '세그먼트'],
    lastUpdated: '2024-01-13'
  },
  {
    id: 'quota',
    title: '할당량 소비 분석',
    description: '월별 메시지 할당량 사용량과 비용을 추적합니다',
    icon: <DollarSign className="h-5 w-5" />,
    href: '/reports/quota',
    category: 'finance',
    tags: ['할당량', '비용', '예산'],
    lastUpdated: '2024-01-12'
  }
]

const categories = [
  { value: 'all', label: '전체', count: reports.length },
  { value: 'analytics', label: '분석', count: reports.filter(r => r.category === 'analytics').length },
  { value: 'performance', label: '성과', count: reports.filter(r => r.category === 'performance').length },
  { value: 'growth', label: '성장', count: reports.filter(r => r.category === 'growth').length },
  { value: 'finance', label: '재정', count: reports.filter(r => r.category === 'finance').length }
]

const categoryColors = {
  analytics: 'bg-blue-100 text-blue-700 border-blue-300',
  performance: 'bg-green-100 text-green-700 border-green-300',
  growth: 'bg-purple-100 text-purple-700 border-purple-300',
  finance: 'bg-orange-100 text-orange-700 border-orange-300'
}

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const router = useRouter()

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'monthly':
        router.push('/reports/monthly')
        break
      case 'export-all':
        // TODO: Implement bulk export functionality
        break
      case 'schedule':
        // TODO: Implement report scheduling
        break
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">보고서 및 분석</h1>
          <p className="text-lg text-gray-600">
            캠페인 성과와 데이터를 깊이 있게 분석하세요
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleQuickAction('export-all')}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            전체 내보내기
          </Button>
          <Button
            onClick={() => handleQuickAction('monthly')}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            월별 분석 보기
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 보고서</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <PieChart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">분석 도구</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <LineChart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">데이터 소스</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">자동화된 보고서</p>
                <p className="text-2xl font-bold">6</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="보고서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => (
          <Link key={report.id} href={report.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      {report.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      {report.isPremium && (
                        <Badge variant="secondary" className="mt-1">
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {report.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {report.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Category and Last Updated */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <Badge 
                      variant="outline"
                      className={categoryColors[report.category]}
                    >
                      {categories.find(c => c.value === report.category)?.label}
                    </Badge>
                    <span>업데이트: {report.lastUpdated}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <BarChart3 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            검색 결과가 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            다른 검색어를 시도하거나 필터를 조정해보세요
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
          >
            필터 초기화
          </Button>
        </div>
      )}

      {/* Footer Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">
              <p>보고서는 실시간으로 업데이트됩니다. 마지막 업데이트: 방금 전</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-3 w-3" />
                사용자 가이드 다운로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}