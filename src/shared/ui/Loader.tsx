import { useEffect, useState } from 'react';
import { useLoader } from '../services/LoaderContext';

export function Loader() {
  const { isLoading } = useLoader();
  const [displayLoader, setDisplayLoader] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isLoading) {
      // Show loader immediately
      setDisplayLoader(true);
    } else {
      // Keep showing for 500ms to avoid flash
      timeout = setTimeout(() => {
        setDisplayLoader(false);
      }, 500);
    }

    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (!displayLoader) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-brand-500" />
        <p className="text-sm font-medium text-slate-300">Loading...</p>
      </div>
    </div>
  );
}
