import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  FolderTree,
  AlertTriangle,
  Navigation,
  MapPin,
  BarChart3,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/store/auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assets', icon: FolderTree, label: 'Assets' },
  { to: '/anomalies', icon: AlertTriangle, label: 'Anomalies' },
  { to: '/missions', icon: Navigation, label: 'Missions' },
  { to: '/live-map', icon: MapPin, label: 'Live Map' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
] as const;

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-800 bg-gray-900">
      <div className="flex h-full flex-col">
        {/* Logo / Title */}
        <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
          <Bot className="h-8 w-8 text-emerald-500" />
          <span className="text-lg font-semibold text-white">ANYbotics</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
