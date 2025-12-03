import React from 'react';
import { BaseTable, Column } from '../base';
import './AlertTable.css';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Alert {
  id: string | number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  host: string;
  time: string;
  status: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  assignee?: string;
  comments: Comment[];
  mitre?: {
    id: string;
    name: string;
    url: string;
  }[];
}

interface AlertTableProps {
  alerts: Alert[];
  columns?: Column<Alert>[]; // Make optional to support legacy usage if any
  selectedRowId?: string | number | null;
  onSelect: (id: string | number) => void;
  // Legacy props mapping
  onSelectAlert?: (id: string | number | null) => void;
  selectedAlertId?: string | number | null;
  selectedAlerts?: Set<string | number>;
  onToggleSelectAll?: () => void;
}

export const AlertTable: React.FC<AlertTableProps> = ({ 
  alerts, 
  columns,
  selectedRowId, 
  onSelect,
  // Legacy props
  onSelectAlert,
  selectedAlertId,
  selectedAlerts,
  onToggleSelectAll
}) => {
  // Default columns if not provided
  const defaultColumns: Column<Alert>[] = [
    { 
      key: 'severity', 
      header: 'Sev', 
      width: '60px',
      align: 'center',
      render: (row) => {
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
              backgroundColor: colors[row.severity] || colors.low,
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              color: 'white',
              textTransform: 'uppercase'
            }}
          >
            {row.severity.charAt(0)}
          </span>
        );
      }
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

  const activeColumns = columns || defaultColumns;

  // Handle legacy prop mapping
  const handleRowClick = (row: Alert) => {
    if (onSelect) onSelect(row.id);
    if (onSelectAlert) onSelectAlert(row.id);
  };

  const activeSelectedId = selectedRowId ?? selectedAlertId;

  return (
    <BaseTable
      data={alerts}
      columns={activeColumns}
      selectedRowId={activeSelectedId ?? undefined}
      onRowClick={handleRowClick}
      emptyMessage="No alerts to display"
      className="alert-table"
    />
  );
};
