import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './KpiTile.css';

interface KpiTileProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  sparklineData?: number[];
  onClick?: () => void;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  loading?: boolean;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;

  const width = 60;
  const height = 24;
  const padding = 2;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points}`;
  const areaData = `M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} className="sparkline">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaData} fill={`url(#gradient-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  value,
  trendDirection,
  trendPercentage,
  sparklineData,
  onClick,
  severity,
  loading
}) => {
  const getSeverityColor = () => {
    const colors = {
      critical: 'var(--sev-critical)',
      high: 'var(--sev-high)',
      medium: 'var(--sev-medium)',
      low: 'var(--sev-low)'
    };
    return colors[severity || 'low'];
  };

  const getTrendColor = () => {
    if (!trendDirection) return 'var(--text-secondary)';
    
    // For alerts, down is good
    if (label.toLowerCase().includes('alert')) {
      return trendDirection === 'down' ? '#22c55e' : trendDirection === 'up' ? '#ef4444' : 'var(--text-secondary)';
    }
    
    // For everything else, up is good
    return trendDirection === 'up' ? '#22c55e' : trendDirection === 'down' ? '#ef4444' : 'var(--text-secondary)';
  };

  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

  if (loading) {
    return (
      <div className="kpi-tile kpi-tile--loading">
        <div className="kpi-tile__skeleton" />
      </div>
    );
  }

  return (
    <div
      className={`kpi-tile ${onClick ? 'kpi-tile--clickable' : ''} ${severity ? `kpi-tile--${severity}` : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="kpi-tile__header">
        <div className="kpi-tile__label">{label}</div>
        {trendDirection && trendPercentage !== undefined && (
          <div className="kpi-tile__trend" style={{ color: getTrendColor() }}>
            <TrendIcon className="kpi-tile__trend-icon" size={14} />
            <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="kpi-tile__value">{value}</div>
      
      {sparklineData && sparklineData.length > 0 && (
        <div className="kpi-tile__sparkline">
          <Sparkline data={sparklineData} color={getSeverityColor()} />
        </div>
      )}
    </div>
  );
};
