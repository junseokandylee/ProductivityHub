'use client';

import dynamic from 'next/dynamic';

// Dynamically import the entire QueryProvider to avoid SSR issues
const ClientQueryProvider = dynamic(
  () => import('./client-provider').then(mod => ({
    default: mod.ClientQueryProvider
  })),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return <ClientQueryProvider>{children}</ClientQueryProvider>;
}