import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { clearSession } from '../features/auth/sessionStore';
import { ServiceHttpError } from '../shared/services';

function handleAuthError(error: Error) {
  if (error instanceof ServiceHttpError && error.statusCode === 401) {
    clearSession();
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      queryCache: new QueryCache({ onError: handleAuthError }),
      mutationCache: new MutationCache({ onError: handleAuthError }),
      defaultOptions: {
        queries: { retry: false, staleTime: 30_000 },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
