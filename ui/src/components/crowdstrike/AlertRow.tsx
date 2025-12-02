import React from 'react';
import './AlertRow.css';

interface AlertRowProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  host: string;
  time: string;
  status: string;
  onClick?: () => void;
}

export const AlertRow: React.FC<AlertRowProps> = ({ severity, title, host, time, status, onClick }) => {
  return (
    <div className="alert-row" onClick={onClick}>
      <div className={`sev-indicator sev-${severity}`} />
      <div className="alert-content">
        <div className="alert-title">{title}</div>
        <div className="alert-meta">
          <span className="host">{host}</span>
          <span className="separator">•</span>
          <span className="time">{time}</span>
        </div>
      </div>
      <div className="alert-status">{status}</div>
    </div>
  );
};
