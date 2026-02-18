import { useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import clsx from 'clsx';

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/assets')) return 'Assets';
  if (pathname.startsWith('/anomalies')) return 'Anomalies';
  if (pathname.startsWith('/missions')) return 'Missions';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/robots/')) return 'Robot Details';
  return 'Dashboard';
}

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-900/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-xl font-semibold text-white">{title}</h1>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">
            {user?.name ?? user?.email ?? 'User'}
          </span>
          <span
            className={clsx(
              'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              user?.role === 'admin'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-700 text-gray-300'
            )}
          >
            {user?.role ?? 'user'}
          </span>
        </div>
      </div>
    </header>
  );
}
