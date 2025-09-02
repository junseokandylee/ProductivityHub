'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Breadcrumb } from './breadcrumb';
import { cn } from '@/lib/utils';

interface User {
  name: string;
  email: string;
  avatar?: string;
  role: string;
  roles: string[];
  tenantId: string;
  userId: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  // Get user info from headers (set by middleware)
  useEffect(() => {
    // In a real app, this would come from auth context or API call
    // For now, we'll simulate getting user data from headers or localStorage
    const getUserFromToken = () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('access_token='))
          ?.split('=')[1];

        if (token) {
          // Simple JWT payload extraction (same as middleware)
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            name: payload.name || payload.username || '사용자',
            email: payload.email || payload.sub || '',
            avatar: payload.avatar,
            role: payload.role || 'staff',
            roles: payload.role ? [payload.role] : ['staff'],
            tenantId: payload.tenant_id || '',
            userId: payload.nameid || payload.sub || '',
          };
        }
      } catch (error) {
        console.warn('Failed to parse user token:', error);
      }
      return null;
    };

    setUser(getUserFromToken());
  }, []);

  // Check if current path is public (no layout needed)
  const isPublicPath = pathname.startsWith('/auth') || 
                      pathname.startsWith('/help') ||
                      pathname === '/unauthorized';

  if (isPublicPath) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 transition-all duration-300',
          isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        <Sidebar
          userRoles={user?.roles || []}
          isCollapsed={isSidebarCollapsed}
          onCollapse={setIsSidebarCollapsed}
        />
      </aside>

      {/* Mobile sidebar backdrop */}
      <div 
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          isSidebarCollapsed ? 'hidden' : 'block'
        )}
        onClick={() => setIsSidebarCollapsed(true)}
      >
        <div className="absolute inset-0 bg-gray-600 opacity-75" />
      </div>

      {/* Mobile sidebar */}
      <aside 
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden',
          isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        <Sidebar
          userRoles={user?.roles || []}
          isCollapsed={false}
        />
      </aside>

      {/* Main content */}
      <main 
        className={cn(
          'flex-1 flex flex-col min-h-0 transition-all duration-300',
          'lg:pl-64',
          isSidebarCollapsed && 'lg:pl-16'
        )}
      >
        {/* Header */}
        <Header
          user={user ? {
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
          } : undefined}
          onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
          unreadNotifications={3} // This would come from a notifications API
        />

        {/* Breadcrumb */}
        <div className="border-b border-gray-200 bg-white px-4 lg:px-6 py-3">
          <Breadcrumb />
        </div>

        {/* Page content */}
        <div className={cn('flex-1 overflow-auto p-4 lg:p-6', className)}>
          {children}
        </div>
      </main>
    </div>
  );
}