'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  'aria-label': ariaLabel = '로딩 중'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        sizeClasses[size],
        className
      )}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded',
        animate && 'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
}

interface LoadingRowsProps {
  count?: number;
  className?: string;
}

export function LoadingTableRows({ count = 8, className }: LoadingRowsProps) {
  return (
    <div className={cn('divide-y divide-gray-100', className)} role="status" aria-label="테이블 데이터 로딩 중">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="px-6 py-4">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
      <span className="sr-only">연락처 목록을 불러오고 있습니다...</span>
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingCard({ 
  title = '데이터 로딩 중', 
  description = '잠시만 기다려주세요',
  className 
}: LoadingCardProps) {
  return (
    <div 
      className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" className="text-blue-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

interface ProgressWithLabelsProps {
  value: number;
  total?: number;
  label?: string;
  description?: string;
  className?: string;
}

export function ProgressWithLabels({ 
  value, 
  total,
  label,
  description,
  className 
}: ProgressWithLabelsProps) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  const progressLabel = label || `${percentage}% 완료`;
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{progressLabel}</span>
        {total && (
          <span className="text-gray-500">
            {value.toLocaleString()} / {total.toLocaleString()}
          </span>
        )}
      </div>
      <div 
        className="w-full bg-gray-200 rounded-full h-2"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={total || 100}
        aria-label={progressLabel}
      >
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-600" aria-live="polite">
          {description}
        </p>
      )}
    </div>
  );
}

interface LiveRegionProps {
  children: React.ReactNode;
  level?: 'polite' | 'assertive';
  atomic?: boolean;
}

export function LiveRegion({ 
  children, 
  level = 'polite', 
  atomic = true 
}: LiveRegionProps) {
  return (
    <div 
      aria-live={level}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}