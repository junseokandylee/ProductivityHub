'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  Home, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  Calendar,
  Target,
  Zap,
  Database,
  Shield,
  CreditCard,
  Key,
  Brain,
  Gavel,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/',
    icon: Home,
  },
  {
    title: '연락처',
    href: '/contacts',
    icon: Users,
  },
  {
    title: '캠페인',
    href: '/campaigns',
    icon: MessageSquare,
    children: [
      { title: '캠페인 목록', href: '/campaigns', icon: MessageSquare },
      { title: '새 캠페인', href: '/campaigns/new', icon: MessageSquare },
      { title: '예약된 캠페인', href: '/campaigns/scheduled', icon: Calendar },
      { title: '템플릿', href: '/campaigns/templates', icon: MessageSquare },
      { title: 'AI 메시지 개인화', href: '/campaigns/personalization', icon: Brain },
    ],
  },
  {
    title: '일정',
    href: '/calendar',
    icon: Calendar,
  },
  {
    title: '활동 점수',
    href: '/activity-score',
    icon: Target,
  },
  {
    title: '분석',
    href: '/analytics',
    icon: BarChart3,
    children: [
      { title: '대시보드', href: '/analytics', icon: BarChart3 },
      { title: '캠페인 성과', href: '/analytics/campaigns', icon: BarChart3 },
      { title: 'A/B 테스트', href: '/analytics/ab-tests', icon: Zap },
      { title: '비용 분석', href: '/analytics/costs', icon: CreditCard },
    ],
  },
  {
    title: '규정 준수',
    href: '/compliance',
    icon: Gavel,
    children: [
      { title: '모니터링 대시보드', href: '/compliance', icon: Shield },
      { title: '위반 관리', href: '/compliance?tab=violations', icon: AlertTriangle },
      { title: '지출 모니터링', href: '/compliance?tab=spending', icon: DollarSign },
      { title: '규칙 관리', href: '/compliance?tab=rules', icon: Settings },
      { title: '규정 준수 보고서', href: '/compliance?tab=reports', icon: BarChart3 },
    ],
  },
  {
    title: '설정',
    href: '/settings',
    icon: Settings,
    children: [
      { title: '프로필', href: '/settings/profile', icon: Settings },
      { title: '사용자 관리', href: '/settings/users', icon: Users, roles: ['admin', 'owner'] },
      { title: '테넌트 설정', href: '/settings/tenant', icon: Database, roles: ['owner'] },
      { title: '보안', href: '/settings/security', icon: Shield, roles: ['admin', 'owner'] },
      { title: '결제', href: '/settings/billing', icon: CreditCard, roles: ['admin', 'owner'] },
      { title: 'API 키', href: '/settings/api-keys', icon: Key, roles: ['owner'] },
    ],
  },
];

interface SidebarProps {
  className?: string;
  userRoles?: string[];
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ className, userRoles = [], isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const hasRequiredRole = (requiredRoles?: string[]) => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.some(role => userRoles.includes(role));
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!hasRequiredRole(item.roles)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const active = isActive(item.href);

    return (
      <div key={item.href}>
        <div className="relative">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(item.title)}
              className={cn(
                'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                'hover:bg-gray-100 hover:text-gray-900',
                active && 'bg-gray-100 text-gray-900',
                level > 0 && 'ml-4 pl-8'
              )}
            >
              <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  <ChevronDown
                    className={cn(
                      'ml-2 h-4 w-4 transition-transform',
                      isExpanded && 'transform rotate-180'
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                'hover:bg-gray-100 hover:text-gray-900',
                active && 'bg-gray-100 text-gray-900',
                level > 0 && 'ml-4 pl-8'
              )}
            >
              <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          )}
        </div>

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200', className)}>
      {/* Logo */}
      <div className="flex items-center px-4 py-6">
        {isCollapsed ? (
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded mr-3 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">정치생산성</h1>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map(item => renderNavItem(item))}
      </nav>

      <Separator />

      {/* Footer */}
      <div className="p-4">
        {!isCollapsed && (
          <div className="text-xs text-gray-500 text-center">
            © 2024 Political Productivity Hub
          </div>
        )}
      </div>
    </div>
  );
}