import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useMemo } from 'react';
import { clearSession } from '../features/auth/sessionStore';
import { ConfirmDialogProvider } from '../shared/ui/confirm/ConfirmDialogProvider';
import { ThemeProvider } from '../shared/ui/theme/ThemeProvider';
import { ServiceHttpError } from '../shared/services';
import { LoaderProvider, useLoader } from '../shared/services/LoaderContext';

function handleAuthError(error: Error) {
  if (error instanceof ServiceHttpError && error.statusCode === 401) {
    clearSession();
  }
}

function ProvidersInner({ children }: { children: ReactNode }) {
  const { incrementLoading, decrementLoading } = useLoader();

  const queryClient = useMemo(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleAuthError }),
        mutationCache: new MutationCache({
          onError: handleAuthError,
          onMutate: () => {
            incrementLoading();
          },
          onSettled: () => {
            decrementLoading();
          },
        }),
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000 },
        },
      }),
    [incrementLoading, decrementLoading]
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConfirmDialogProvider>
        <LoaderProvider>
          <ProvidersInner>{children}</ProvidersInner>
        </LoaderProvider>
      </ConfirmDialogProvider>
    </ThemeProvider>
  );
}
