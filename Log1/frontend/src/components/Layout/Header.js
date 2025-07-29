import React from 'react';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <div className="bg-white border-b border-secondary-200 shadow-soft">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Menu button and Logo */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl font-bold gradient-text">
                  zcrLog
                </span>
                <span className="ml-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  Pro
                </span>
              </div>
            </div>
          </div>

          {/* Center - Search bar (hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                className="input-scale pl-10 pr-4 w-full"
                placeholder="Search logs, users, or events..."
              />
            </div>
          </div>

          {/* Right side - Notifications and User menu */}
          <div className="flex items-center space-x-3">
            {/* Search button for mobile */}
            <button className="md:hidden p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200">
              <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button className="p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200">
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-5 w-5" aria-hidden="true" />
                {/* Notification badge */}
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  3
                </span>
              </button>
            </div>

            {/* Settings */}
            <button className="p-2 rounded-xl text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200">
              <span className="sr-only">Settings</span>
              <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* User menu */}
            <div className="relative flex items-center space-x-3">
              {/* User info */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-secondary-900">
                  {user?.name || 'Admin User'}
                </span>
                <span className="text-xs text-secondary-500">
                  {user?.role || 'Administrator'}
                </span>
              </div>

              {/* User avatar */}
              <div className="relative">
                <button className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {(user?.name || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl text-secondary-600 hover:text-error-600 hover:bg-error-50 focus:outline-none focus:ring-2 focus:ring-error-500 transition-all duration-200"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="input-scale pl-10 pr-4 w-full"
            placeholder="Search logs, users, or events..."
          />
        </div>
      </div>
    </div>
  );
};

export default Header; 