import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  CogIcon, 
  ChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, description: 'Overview and real-time monitoring' },
  { name: 'Firewall Logs', href: '/logs', icon: DocumentTextIcon, description: 'Security event analysis' },
  { name: 'Log Sources', href: '/sources', icon: CogIcon, description: 'Manage data sources' },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, description: 'Advanced insights' },
  { name: 'AI Assistant', href: '/ai-assistant', icon: ChatBubbleLeftRightIcon, description: 'AI-powered log analysis' },
  { name: 'UEBA', href: '/ueba', icon: UsersIcon, description: 'User behavior analytics' },
  { name: 'Security Alerts', href: '/alerts', icon: ShieldCheckIcon, description: 'Threat notifications' },
  { name: 'Compliance Reports', href: '/compliance', icon: UserGroupIcon, description: 'Regulatory reporting' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-secondary-900/50 backdrop-blur-sm z-40 transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-72 transform transition-transform duration-300 ease-in-out
        fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full bg-white border-r border-secondary-200 shadow-large">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold gradient-text">zcrLog</span>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  Pro
                </span>
              </div>
            </div>
            <button
              className="lg:hidden p-1.5 rounded-lg text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 transition-colors"
              onClick={onClose}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* User info card */}
          <div className="p-4 border-b border-secondary-200">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200/50">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">
                  {(user?.name || 'Admin').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary-900 truncate">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-xs text-secondary-600 truncate">
                  {user?.email || 'admin@zcrlog.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">
                Main Navigation
              </h3>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/' && location.pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-medium'
                          : 'text-secondary-700 hover:text-secondary-900 hover:bg-secondary-100'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          mr-3 h-5 w-5 transition-colors duration-200
                          ${isActive 
                            ? 'text-white' 
                            : 'text-secondary-500 group-hover:text-secondary-700'
                          }
                        `}
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.name}</span>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <p className={`
                          text-xs mt-0.5 
                          ${isActive ? 'text-primary-100' : 'text-secondary-500 group-hover:text-secondary-600'}
                        `}>
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 pt-6 border-t border-secondary-200">
              <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-success-50 border border-success-200">
                  <div>
                    <p className="text-xs text-success-600 font-medium">Active Sources</p>
                    <p className="text-lg font-bold text-success-700">12</p>
                  </div>
                  <div className="w-8 h-8 bg-success-500 rounded-lg flex items-center justify-center">
                    <CogIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-warning-50 border border-warning-200">
                  <div>
                    <p className="text-xs text-warning-600 font-medium">Alerts Today</p>
                    <p className="text-lg font-bold text-warning-700">3</p>
                  </div>
                  <div className="w-8 h-8 bg-warning-500 rounded-lg flex items-center justify-center">
                    <ShieldCheckIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-secondary-200">
            <div className="text-center">
              <p className="text-xs text-secondary-500">
                © 2024 zcrLog Pro
              </p>
              <p className="text-xs text-secondary-400 mt-1">
                Version 2.1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 