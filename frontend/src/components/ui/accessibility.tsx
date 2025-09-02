'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
        'bg-blue-600 text-white px-4 py-2 rounded-md z-50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
}

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  finalFocus?: React.RefObject<HTMLElement>;
}

export function FocusTrap({ 
  children, 
  active = true, 
  initialFocus, 
  finalFocus 
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(active);

  useEffect(() => {
    setIsActive(active);
  }, [active]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus initial element
    const elementToFocus = initialFocus?.current || firstFocusable;
    elementToFocus?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Return focus to final element when trap is disabled
      if (!isActive && finalFocus?.current) {
        finalFocus.current.focus();
      }
    };
  }, [isActive, initialFocus, finalFocus]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}

interface AnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}

export function Announcement({ message, priority = 'polite', delay = 0 }: AnnouncementProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnnouncement(message);
    }, delay);

    return () => clearTimeout(timer);
  }, [message, delay]);

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

interface KeyboardShortcutProps {
  shortcuts: Array<{
    key: string | string[];
    description: string;
    action: () => void;
  }>;
  active?: boolean;
}

export function KeyboardShortcuts({ shortcuts, active = true }: KeyboardShortcutProps) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(({ key, action }) => {
        const keys = Array.isArray(key) ? key : [key];
        const match = keys.some(k => {
          if (k.includes('+')) {
            const parts = k.split('+');
            const modifiers = parts.slice(0, -1);
            const mainKey = parts[parts.length - 1].toLowerCase();
            
            const hasAllModifiers = modifiers.every(mod => {
              switch (mod.toLowerCase()) {
                case 'ctrl': return e.ctrlKey || e.metaKey;
                case 'alt': return e.altKey;
                case 'shift': return e.shiftKey;
                default: return false;
              }
            });
            
            return hasAllModifiers && e.key.toLowerCase() === mainKey;
          } else {
            return e.key.toLowerCase() === k.toLowerCase();
          }
        });

        if (match) {
          e.preventDefault();
          action();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, active]);

  return null;
}

interface RovingTabIndexProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
}

export function RovingTabIndex({ 
  children, 
  orientation = 'horizontal', 
  loop = true 
}: RovingTabIndexProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll('[role="option"], [role="menuitem"], [role="tab"]')
    ) as HTMLElement[];

    if (items.length === 0) return;

    // Set initial tabindex
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = items.findIndex(item => item === e.target);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      if (orientation === 'horizontal') {
        if (e.key === 'ArrowRight') {
          nextIndex = currentIndex + 1;
        } else if (e.key === 'ArrowLeft') {
          nextIndex = currentIndex - 1;
        }
      } else {
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex + 1;
        } else if (e.key === 'ArrowUp') {
          nextIndex = currentIndex - 1;
        }
      }

      if (nextIndex !== currentIndex) {
        e.preventDefault();
        
        // Handle wrapping
        if (nextIndex >= items.length) {
          nextIndex = loop ? 0 : items.length - 1;
        } else if (nextIndex < 0) {
          nextIndex = loop ? items.length - 1 : 0;
        }

        // Update tabindex
        items[currentIndex].setAttribute('tabindex', '-1');
        items[nextIndex].setAttribute('tabindex', '0');
        items[nextIndex].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [orientation, loop]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
}

interface VisuallyHiddenProps {
  children: React.ReactNode;
}

export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

// Reduced motion hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}