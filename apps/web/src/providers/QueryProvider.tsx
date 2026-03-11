// apps/web/src/providers/QueryProvider.tsx

import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { queryClient } from '../lib/constants/query';

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools can be added later if needed */}
    </QueryClientProvider>
  );
};
