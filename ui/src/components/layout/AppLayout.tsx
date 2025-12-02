import React, { useState } from 'react';
import { 
  Menu, Search, Bell, Settings, User, 
  Shield, Activity, Network, Target, ChevronLeft, ChevronRight
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'threats', label: 'Threats', icon: Target },
    { id: 'system', label: 'System', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-surface-base text-gray-300 font-sans overflow-hidden">
      {/* Nav Rail */}
      <aside 
        className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-surface-1 border-r border-border-subtle transition-all duration-300 flex flex-col z-20`}
      >
        <div className="h-16 flex items-center px-4 border-b border-border-subtle">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary font-bold shrink-0">
              G
            </div>
            <span className={`font-medium text-gray-100 whitespace-nowrap transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Antigravity NDR
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                activeTab === item.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'hover:bg-surface-3 text-gray-400 hover:text-gray-200'
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className={`whitespace-nowrap transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-border-subtle">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-surface-3 rounded text-gray-500"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* App Bar */}
        <header className="h-16 bg-surface-1 border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
          {/* Search */}
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search resources, IPs, alerts..." 
                className="w-full h-9 pl-10 pr-4 bg-surface-base border border-border-subtle rounded-md text-sm text-gray-200 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-surface-3 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface-1"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-surface-3 rounded-full">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
              JD
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
