import React from 'react';
import { Shield, Activity, AlertTriangle, Network, Settings, Search, Menu, Target, FileText, ClipboardList, Zap, Server } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', icon: Activity, label: 'Dashboard' },
    { id: 'alerts', icon: AlertTriangle, label: 'Detections' },
    { id: 'incidents', icon: ClipboardList, label: 'Incidents' },
    { id: 'hunting', icon: Target, label: 'Threat Hunting' },
    { id: 'logs', icon: FileText, label: 'Log Viewer' },
    { id: 'automation', icon: Zap, label: 'Automation (SOAR)' },
    { id: 'edge', icon: Server, label: 'Edge Management' },
    { id: 'hosts', icon: Shield, label: 'Host Management' },
    { id: 'network', icon: Network, label: 'Network' },
    { id: 'config', icon: Settings, label: 'Configuration' },
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
