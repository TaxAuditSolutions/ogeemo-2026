
'use client';

import { createContext, useState, useContext, ReactNode, useCallback, useRef } from 'react';
import LoadingModal from '@/components/ui/loading-modal';

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showLoading = useCallback((msg?: string) => {
    // Only show the spinner if the loading state persists for more than 300ms
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
        setMessage(msg || 'Loading...');
        setIsLoading(true);
    }, 300); // 300ms delay
  }, []);

  const hideLoading = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsLoading(false);
  }, []);

  const value = { showLoading, hideLoading, isLoading };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && <LoadingModal message={message} />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
