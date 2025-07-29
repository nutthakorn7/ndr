import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  UserGroupIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import { analyticsAPI } from '../services/api';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('threats');

  const { data: analyticsData, isLoading } = useQuery(
    ['analytics', timeRange],
    () => analyticsAPI.getDashboard()
  );

  // Mock data for charts
  const threatTrends = [
    { date: '2024-01-01', threats: 45, blocked: 42, allowed: 3 },
    { date: '2024-01-02', threats: 52, blocked: 48, allowed: 4 },
    { date: '2024-01-03', threats: 38, blocked: 35, allowed: 3 },
    { date: '2024-01-04', threats: 61, blocked: 58, allowed: 3 },
    { date: '2024-01-05', threats: 43, blocked: 40, allowed: 3 },
    { date: '2024-01-06', threats: 55, blocked: 52, allowed: 3 },
    { date: '2024-01-07', threats: 49, blocked: 46, allowed: 3 },
  ];

  const topThreats = [
    { name: 'SQL Injection', value: 145, color: '#ef4444' },
    { name: 'XSS Attacks', value: 98, color: '#f97316' },
    { name: 'Brute Force', value: 76, color: '#eab308' },
    { name: 'DDoS Attempts', value: 54, color: '#22c55e' },
    { name: 'Malware', value: 32, color: '#3b82f6' },
  ];

  const trafficSources = [
    { country: 'United States', requests: 2340, blocked: 45, color: '#3b82f6' },
    { country: 'China', requests: 1890, blocked: 234, color: '#ef4444' },
    { country: 'Russia', requests: 567, blocked: 123, color: '#f97316' },
    { country: 'Germany', requests: 445, blocked: 12, color: '#22c55e' },
    { country: 'United Kingdom', requests: 334, blocked: 8, color: '#8b5cf6' },
    { country: 'France', requests: 298, blocked: 15, color: '#06b6d4' },
  ];

  const timeAnalysis = [
    { hour: '00:00', events: 12 },
    { hour: '03:00', events: 8 },
    { hour: '06:00', events: 15 },
    { hour: '09:00', events: 45 },
    { hour: '12:00', events: 67 },
    { hour: '15:00', events: 52 },
    { hour: '18:00', events: 38 },
    { hour: '21:00', events: 28 },
  ];

  const getMetricColor = (value, threshold = 50) => {
    if (value >= threshold * 1.5) return 'text-error-600';
    if (value >= threshold) return 'text-warning-600';
    return 'text-success-600';
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            Security <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-secondary-600 mt-2">
            Advanced threat intelligence and behavioral analysis
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-scale"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="btn-secondary">
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Configure
          </button>
          <button className="btn-primary">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-secondary-900">426</span>
                <div className="flex items-center text-success-600 text-sm">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  <span>-12%</span>
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Threats Detected</h3>
            <p className="text-xs text-secondary-500 mt-1">Last 24 hours</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-secondary-900">98.7%</span>
                <div className="flex items-center text-success-600 text-sm">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  <span>+0.3%</span>
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Block Rate</h3>
            <p className="text-xs text-secondary-500 mt-1">Threat prevention</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <GlobeAltIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-secondary-900">15.2K</span>
                <div className="flex items-center text-success-600 text-sm">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  <span>+8%</span>
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Total Requests</h3>
            <p className="text-xs text-secondary-500 mt-1">Network traffic</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-secondary-900">2.3s</span>
                <div className="flex items-center text-success-600 text-sm">
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  <span>-0.2s</span>
                </div>
              </div>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Response Time</h3>
            <p className="text-xs text-secondary-500 mt-1">Average latency</p>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Threat Trends */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Threat Trends</h3>
              <div className="flex items-center space-x-2">
                <button className="btn-ghost text-sm">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View Details
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={threatTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Area type="monotone" dataKey="threats" stackId="1" stroke="#ef4444" fill="#ef444450" name="Total Threats" />
                <Area type="monotone" dataKey="blocked" stackId="2" stroke="#22c55e" fill="#22c55e50" name="Blocked" />
                <Area type="monotone" dataKey="allowed" stackId="3" stroke="#f59e0b" fill="#f59e0b50" name="Allowed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Threats */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Top Threats</h3>
              <span className="text-sm text-secondary-600">Last 7 days</span>
            </div>
            <div className="space-y-4">
              {topThreats.map((threat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: threat.color }}></div>
                    <span className="font-medium text-secondary-900">{threat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-secondary-900">{threat.value}</span>
                    <span className="text-sm text-secondary-600 ml-1">attempts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Geographic Analysis */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Geographic Analysis</h3>
              <button className="btn-ghost text-sm">
                <GlobeAltIcon className="h-4 w-4 mr-1" />
                View Map
              </button>
            </div>
            <div className="space-y-3">
              {trafficSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-secondary-50 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: source.color }}></div>
                    <span className="font-medium text-secondary-900">{source.country}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-right">
                      <div className="text-secondary-900 font-medium">{source.requests.toLocaleString()}</div>
                      <div className="text-secondary-500">requests</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${getMetricColor(source.blocked, 20)}`}>{source.blocked}</div>
                      <div className="text-secondary-500">blocked</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time-based Analysis */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Hourly Activity</h3>
              <button className="btn-ghost text-sm">
                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                Custom Range
              </button>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar dataKey="events" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center">
                <CpuChipIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-success-600 font-medium">Normal</span>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-1">System Load</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-secondary-900">23%</span>
              <span className="text-sm text-secondary-600">CPU Usage</span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2 mt-3">
              <div className="bg-accent-500 h-2 rounded-full" style={{ width: '23%' }}></div>
            </div>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-primary-600 font-medium">Active</span>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-1">Active Sessions</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-secondary-900">1,247</span>
              <span className="text-sm text-secondary-600">concurrent</span>
            </div>
            <p className="text-xs text-secondary-500 mt-2">+5% from last hour</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-success-500 to-success-600 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-success-600 font-medium">Excellent</span>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-1">Detection Rate</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-secondary-900">99.2%</span>
              <span className="text-sm text-secondary-600">accuracy</span>
            </div>
            <p className="text-xs text-secondary-500 mt-2">Updated 2 min ago</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
