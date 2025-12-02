import React from 'react';
import { BaseCard } from '../base';
import './KpiTile.css';

interface KpiTileProps {
  label: string;
  value: string | number;
  trend?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * KpiTile - Dashboard KPI display using BaseCard
 * @deprecated - Use BaseCard directly for new components
 */
export const KpiTile: React.FC<KpiTileProps> = ({ label, value, trend, severity }) => {
  return (
    <BaseCard className={`kpi-tile ${severity ? `kpi-tile--${severity}` : ''}`}>
      <div className="kpi-tile__label">{label}</div>
      <div className="kpi-tile__value">{value}</div>
      {trend && <div className="kpi-tile__trend">{trend}</div>}
    </BaseCard>
  );
};
