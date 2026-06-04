import { useEffect, useState } from 'react';
import { healthService } from '../services';

export function ConnectivityBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  const [backendHealthy, setBackendHealthy] = useState(true);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const interval = window.setInterval(async () => {
      try {
        const response = await healthService.getHealth();
        setBackendHealthy(response.status === 'healthy');
      } catch {
        setBackendHealthy(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
    };
  }, []);

  if (online && backendHealthy) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-red-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-red-300" />
      Backend unavailable — changes may not save
    </div>
  );
}
