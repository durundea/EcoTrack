import { createContext, useContext, useState, type ReactNode } from 'react';

type LoaderContextType = {
  isLoading: boolean;
  loadingCount: number;
  incrementLoading: () => void;
  decrementLoading: () => void;
};

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0);

  function incrementLoading() {
    setLoadingCount((prev) => {
      const newCount = prev + 1;
      console.log('[Loader] incrementing:', prev, '->', newCount);
      return newCount;
    });
  }

  function decrementLoading() {
    setLoadingCount((prev) => {
      const newCount = Math.max(0, prev - 1);
      console.log('[Loader] decrementing:', prev, '->', newCount);
      return newCount;
    });
  }

  const isLoading = loadingCount > 0;

  return (
    <LoaderContext.Provider value={{ isLoading, loadingCount, incrementLoading, decrementLoading }}>
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within LoaderProvider');
  }
  return context;
}
