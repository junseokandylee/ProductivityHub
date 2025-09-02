'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  className?: string;
  items?: BreadcrumbItem[];
}

// Path to Korean label mapping
const pathLabels: Record<string, string> = {
  '': '대시보드',
  'contacts': '연락처',
  'campaigns': '캠페인',
  'calendar': '일정',
  'activity-score': '활동 점수',
  'analytics': '분석',
  'settings': '설정',
  'profile': '프로필',
  'users': '사용자 관리',
  'tenant': '테넌트 설정',
  'security': '보안',
  'billing': '결제',
  'api-keys': 'API 키',
  'new': '새로 만들기',
  'edit': '편집',
  'templates': '템플릿',
  'ab-tests': 'A/B 테스트',
  'costs': '비용 분석',
  'help': '도움말',
  'contact': '문의하기',
  'import': '가져오기',
  'export': '내보내기',
  'deduplication': '중복 제거',
  'monitor': '모니터링',
  'print': '인쇄',
  'auto-reply': '자동 응답',
  'monthly': '월간 보고서',
  'quota': '할당량',
  'channels': '채널',
  'organization': '조직',
  'guide': '사용자 가이드',
  'tutorial': '튜토리얼',
  'faq': '자주 묻는 질문',
  'inbox': '인박스',
  'reports': '리포트'
};

export function Breadcrumb({ className, items }: BreadcrumbProps) {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname if not provided
  const breadcrumbItems = items || generateBreadcrumbItems(pathname);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-gray-600', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {/* Home link */}
        <li>
          <Link
            href="/"
            className="flex items-center hover:text-gray-900 transition-colors"
            aria-label="홈으로 가기"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">홈</span>
          </Link>
        </li>

        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={item.href} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              {isLast ? (
                <span className="font-medium text-gray-900" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function generateBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return [];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = getSegmentLabel(segment, segments, index);
    
    items.push({
      label,
      href: currentPath,
    });
  });

  return items;
}

function getSegmentLabel(segment: string, segments: string[], index: number): string {
  // Check if it's a UUID or ID (for dynamic routes)
  if (isUuid(segment) || isNumeric(segment)) {
    // Try to get context from previous segment
    const previousSegment = segments[index - 1];
    if (previousSegment === 'contacts') {
      return '연락처 상세';
    } else if (previousSegment === 'campaigns') {
      return '캠페인 상세';
    } else if (previousSegment === 'users') {
      return '사용자 상세';
    }
    return '상세';
  }

  // Return mapped label or capitalize segment
  return pathLabels[segment] || capitalizeFirst(segment);
}

function isUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}