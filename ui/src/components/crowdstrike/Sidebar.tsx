```typescript
import React from 'react';
import {
  Shield,
  Activity,
  AlertTriangle,
  Network,
  Settings,
  Search,
  Menu,
  ClipboardList,
  Zap,
  Server,
  LayoutDashboard, // Added
  Bell, // Added
  Workflow // Added
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { id: 'investigation', icon: Search, label: 'Investigation', path: '/investigation' },
    { id: 'alerts', icon: Bell, label: 'Alerts', path: '/alerts' },
    { id: 'playbooks', icon: Workflow, label: 'Playbooks', path: '/playbooks' },
    { id: 'incidents', icon: ClipboardList, label: 'Incidents' },
    { id: 'automation', icon: Zap, label: 'Automation (SOAR)' },
    { id: 'edge', icon: Server, label: 'Edge Management' },
    { id: 'hosts', icon: Shield, label: 'Host Management' },
    { id: 'network', icon: Network, label: 'Network' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="falcon-sidebar">
      <div className="sidebar-logo">
        <Shield className="logo-icon" />
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={item.label}
          >
            <item.icon className="nav-icon" />
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item">
          <Search className="nav-icon" />
        </button>
      </div>
    </div>
  );
};
