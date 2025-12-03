import React from 'react';
import { BaseTable, Column } from '../base';
import './AlertTable.css';

export interface Alert {
  id: string | number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  host: string;
  time: string;
  status: string;
  mitre?: {
    id: string;
    name: string;
    url: string;
  }[];
}

interface AlertTableProps {
  alerts: Alert[];
  selectedRowId?: string | number | null;
  onSelect: (id: string | number) => void;
}

/**
 * AlertTable - Alert list using BaseTable
 * @deprecated - Use BaseTable directly with custom columns
 */
export const AlertTable: React.FC<AlertTableProps> = ({ alerts, selectedRowId, onSelect }) => {
  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'var(--color-critical)',
      high: 'var(--color-high)',
      medium: 'var(--color-medium)',
      low: 'var(--color-low)'
    };
    return (
      <span 
        className="severity-badge"
        style={{ 
          backgroundColor: colors[severity] || colors.low,
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--font-semibold)',
          color: 'white',
          textTransform: 'uppercase'
        }}
      >
        {severity.charAt(0)}
      </span>
    );
  };

  const columns: Column<Alert>[] = [
    { 
      key: 'severity', 
      header: 'Sev', 
      width: '60px',
      align: 'center',
      render: (row) => getSeverityBadge(row.severity)
    },
    { key: 'title', header: 'Detection' },
    { 
      key: 'status', 
      header: 'Status', 
      width: '100px',
      render: (row) => (
        <span className="status-text">{row.status}</span>
      )
    }
  ];

  return (
    <BaseTable
      data={alerts}
      columns={columns}
      selectedRowId={selectedRowId ?? undefined}
      onRowClick={(row) => onSelect(row.id)}
      emptyMessage="No alerts to display"
      className="alert-table"
    />
  );
};
