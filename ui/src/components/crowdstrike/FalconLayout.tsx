import React from 'react';
import { Sidebar } from './Sidebar';
import './FalconLayout.css';

interface FalconLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const FalconLayout: React.FC<FalconLayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="falcon-layout">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <main className="falcon-main">
        <header className="falcon-header">
          <div className="header-title">FALCON CONSOLE</div>
          <div className="header-actions">
            <span className="user-badge">JD</span>
          </div>
        </header>
        <div className="falcon-content">
          {children}
        </div>
      </main>
    </div>
  );
};
