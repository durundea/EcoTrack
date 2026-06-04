import { useQuery } from '@tanstack/react-query';
import { authService } from '../../shared/services';
import { getAccessToken, getSession, setSession } from './sessionStore';

export function useAuthBootstrap() {
  const token = getAccessToken();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authService.me();
      setSession({ token: token ?? '', user });
      return user;
    },
    enabled: Boolean(token),
    retry: false,
    initialData: getSession()?.user,
  });
}