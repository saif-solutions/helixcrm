// apps/web/src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Contact, BarChart3, Settings, LogOut, Briefcase } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/contacts', label: 'Contacts', icon: Contact },
    { path: '/deals', label: 'Deals', icon: Briefcase },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
      <div className="p-4">
        <div className="mb-8">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-600'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-primary-50'
                    }`
                  }
                  end
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="px-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Organization
            </div>
            <div className="text-sm text-gray-700">
              {user?.organizationId ? `${user.organizationId.substring(0, 8)}...` : 'No Org'}
            </div>
            <div className="text-xs text-gray-500 mt-1">{user?.email || 'No user'}</div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center space-x-3 px-3 py-2 mt-4 w-full text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
