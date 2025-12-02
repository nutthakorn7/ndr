import { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Shield, Activity, CheckCircle } from 'lucide-react';
import type { DetectionRule } from '../utils/mockRules';
import './RuleAnalytics.css';

interface RuleAnalyticsProps {
  rules: DetectionRule[];
  onCategoryClick?: (category: string) => void;
  onSeverityClick?: (severity: string) => void;
}

const COLORS = {
  Malware: '#ef4444',
  Exploit: '#f59e0b',
  Phishing: '#8b5cf6',
  Scan: '#3b82f6',
  Policy: '#10b981',
  Ransomware: '#dc2626',
  APT: '#7c3aed',
  Webshell: '#ea580c',
  Script: '#0891b2',
  'Credential Theft': '#e11d48',
  Execution: '#f97316',
  Persistence: '#84cc16',
  'Defense Evasion': '#06b6d4',
  'Credential Access': '#ec4899',
  Discovery: '#14b8a6',
};

const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#f59e0b',
  Medium: '#3b82f6',
  Low: '#10b981',
};

export default function RuleAnalytics({ rules, onCategoryClick, onSeverityClick }: RuleAnalyticsProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalRules = rules.length;
    const enabledRules = rules.filter(r => r.status === 'enabled').length;
    const criticalRules = rules.filter(r => r.severity === 'Critical').length;
    const totalHits = rules.reduce((sum, r) => sum + r.hits, 0);
    const avgHits = totalRules > 0 ? Math.round(totalHits / totalRules) : 0;
    const enabledPercentage = totalRules > 0 ? Math.round((enabledRules / totalRules) * 100) : 0;

    return {
      totalRules,
      enabledRules,
      enabledPercentage,
      criticalRules,
      avgHits,
    };
  }, [rules]);

  // Category distribution for pie chart
  const categoryData = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    rules.forEach(rule => {
      categoryCount[rule.category] = (categoryCount[rule.category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rules]);

  // Severity distribution for bar chart
  const severityData = useMemo(() => {
    const severityCount: Record<string, { total: number; enabled: number }> = {
      Critical: { total: 0, enabled: 0 },
      High: { total: 0, enabled: 0 },
      Medium: { total: 0, enabled: 0 },
      Low: { total: 0, enabled: 0 },
    };

    rules.forEach(rule => {
      if (severityCount[rule.severity]) {
        severityCount[rule.severity].total++;
        if (rule.status === 'enabled') {
          severityCount[rule.severity].enabled++;
        }
      }
    });

    return Object.entries(severityCount).map(([name, counts]) => ({
      name,
      total: counts.total,
      enabled: counts.enabled,
    }));
  }, [rules]);

  // Top 10 most triggered rules
  const topRules = useMemo(() => {
    return [...rules]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);
  }, [rules]);

  return (
    <div className="rule-analytics">
      {/* Statistics Cards */}
      <div className="analytics-stats-row">
        <div className="analytics-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalRules.toLocaleString()}</div>
            <div className="stat-label">Total Rules</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="stat-icon bg-green-500/10 text-green-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.enabledPercentage}%</div>
            <div className="stat-label">Enabled ({stats.enabledRules.toLocaleString()})</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <Activity className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.criticalRules.toLocaleString()}</div>
            <div className="stat-label">Critical Severity</div>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="stat-icon bg-purple-500/10 text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.avgHits}</div>
            <div className="stat-label">Avg Hits per Rule</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="analytics-charts-row">
        {/* Category Distribution - Pie Chart */}
        <div className="analytics-chart-card">
          <h3>Rules by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent ? `${name} (${(percent * 100).toFixed(0)}%)` : name}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => onCategoryClick?.(data.name)}
                style={{ cursor: 'pointer' }}
              >
                {categoryData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS] || '#64748b'} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution - Bar Chart */}
        <div className="analytics-chart-card">
          <h3>Rules by Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0'
                }}
              />
              <Legend />
              <Bar 
                dataKey="total" 
                fill="#3b82f6" 
                name="Total Rules"
                onClick={(data) => data?.name && onSeverityClick?.(data.name)}
                style={{ cursor: 'pointer' }}
              />
              <Bar 
                dataKey="enabled" 
                fill="#10b981" 
                name="Enabled"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Most Triggered Rules */}
      <div className="analytics-top-rules">
        <h3>Top 10 Most Triggered Rules</h3>
        <div className="top-rules-table-container">
          <table className="top-rules-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Rule Name</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Hits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {topRules.map((rule, index) => (
                <tr key={rule.id}>
                  <td className="rank">{index + 1}</td>
                  <td className="rule-name">{rule.name}</td>
                  <td>
                    <span className="category-badge">{rule.category}</span>
                  </td>
                  <td>
                    <span 
                      className={`severity-badge ${rule.severity.toLowerCase()}`}
                      style={{ 
                        background: `${SEVERITY_COLORS[rule.severity as keyof typeof SEVERITY_COLORS]}20`,
                        color: SEVERITY_COLORS[rule.severity as keyof typeof SEVERITY_COLORS]
                      }}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="hits">{rule.hits.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${rule.status}`}>
                      {rule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
