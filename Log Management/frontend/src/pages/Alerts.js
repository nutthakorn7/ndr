import React, { useState } from 'react';
import { 
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  BellIcon,
  FireIcon,
  EyeSlashIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Alerts = () => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  // Mock alert data
  const alertStats = [
    { name: 'Critical', value: 23, color: '#ef4444' },
    { name: 'High', value: 45, color: '#f97316' },
    { name: 'Medium', value: 89, color: '#eab308' },
    { name: 'Low', value: 156, color: '#22c55e' },
    { name: 'Info', value: 67, color: '#3b82f6' }
  ];

  const trendData = [
    { time: '00:00', critical: 2, high: 5, medium: 8, low: 12 },
    { time: '04:00', critical: 1, high: 3, medium: 6, low: 9 },
    { time: '08:00', critical: 8, high: 12, medium: 15, low: 20 },
    { time: '12:00', critical: 12, high: 18, medium: 22, low: 25 },
    { time: '16:00', critical: 6, high: 10, medium: 14, low: 18 },
    { time: '20:00', critical: 4, high: 7, medium: 11, low: 15 }
  ];

  const topSources = [
    { name: 'Firewall', alerts: 156 },
    { name: 'IDS/IPS', alerts: 89 },
    { name: 'Endpoint', alerts: 67 },
    { name: 'Web Server', alerts: 45 },
    { name: 'Database', alerts: 23 }
  ];

  const alerts = [
    {
      id: 1,
      title: 'Multiple Failed Login Attempts',
      description: 'Suspicious login activity detected from IP 192.168.1.100',
      severity: 'critical',
      status: 'open',
      source: 'Authentication System',
      timestamp: '2024-01-15 14:30:22',
      ip: '192.168.1.100',
      user: 'admin',
      actions: 'Block IP, Reset Password'
    },
    {
      id: 2,
      title: 'Malware Detection',
      description: 'Trojan.Win32.Agent detected on endpoint DESKTOP-ABC123',
      severity: 'high',
      status: 'investigating',
      source: 'Endpoint Protection',
      timestamp: '2024-01-15 14:25:15',
      ip: '10.0.1.50',
      user: 'john.doe',
      actions: 'Quarantine File, Scan System'
    },
    {
      id: 3,
      title: 'Unusual Network Traffic',
      description: 'Abnormal data transfer volume detected',
      severity: 'medium',
      status: 'open',
      source: 'Network Monitor',
      timestamp: '2024-01-15 14:20:08',
      ip: '172.16.0.25',
      user: 'system',
      actions: 'Monitor Traffic, Analyze Patterns'
    },
    {
      id: 4,
      title: 'Certificate Expiration Warning',
      description: 'SSL certificate expires in 7 days',
      severity: 'low',
      status: 'acknowledged',
      source: 'Certificate Manager',
      timestamp: '2024-01-15 14:15:33',
      ip: 'N/A',
      user: 'system',
      actions: 'Renew Certificate'
    },
    {
      id: 5,
      title: 'Privilege Escalation Attempt',
      description: 'User attempted to access admin functions',
      severity: 'high',
      status: 'resolved',
      source: 'Access Control',
      timestamp: '2024-01-15 14:10:45',
      ip: '192.168.1.75',
      user: 'jane.smith',
      actions: 'Account Review, Access Audit'
    }
  ];

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'text-error-600 bg-error-50 border-error-200',
      high: 'text-warning-600 bg-warning-50 border-warning-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      low: 'text-success-600 bg-success-50 border-success-200',
      info: 'text-primary-600 bg-primary-50 border-primary-200'
    };
    return colors[severity] || 'text-secondary-600 bg-secondary-50 border-secondary-200';
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ShieldExclamationIcon className="h-4 w-4" />;
      case 'high': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'medium': return <InformationCircleIcon className="h-4 w-4" />;
      case 'low': return <CheckCircleIcon className="h-4 w-4" />;
      default: return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'text-error-600 bg-error-50',
      investigating: 'text-warning-600 bg-warning-50',
      acknowledged: 'text-primary-600 bg-primary-50',
      resolved: 'text-success-600 bg-success-50'
    };
    return colors[status] || 'text-secondary-600 bg-secondary-50';
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || alert.status === selectedStatus;
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            Security <span className="gradient-text">Alerts</span>
          </h1>
          <p className="text-secondary-600 mt-2">Monitor and manage security threats in real-time</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button className="btn-primary">
            <BellIcon className="h-4 w-4 mr-2" />
            Configure Notifications
          </button>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-scale p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Alerts</p>
              <p className="text-3xl font-bold text-secondary-900 mt-1">380</p>
              <p className="text-sm text-success-600 mt-1">↓ 12% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <ShieldExclamationIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card-scale p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Critical</p>
              <p className="text-3xl font-bold text-error-600 mt-1">23</p>
              <p className="text-sm text-error-600 mt-1">↑ 5% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center">
              <FireIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card-scale p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Open</p>
              <p className="text-3xl font-bold text-warning-600 mt-1">156</p>
              <p className="text-sm text-warning-600 mt-1">↑ 8% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card-scale p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Avg Response Time</p>
              <p className="text-3xl font-bold text-secondary-900 mt-1">8.5m</p>
              <p className="text-sm text-success-600 mt-1">↓ 15% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Distribution */}
        <div className="card-scale p-6">
          <h3 className="text-xl font-bold text-secondary-900 mb-6">Alert Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {alertStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {alertStats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                <span className="text-sm text-secondary-600">{stat.name}: {stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Trends */}
        <div className="card-scale p-6 lg:col-span-2">
          <h3 className="text-xl font-bold text-secondary-900 mb-6">Alert Trends (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.8} />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.8} />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.8} />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Alert Sources */}
      <div className="card-scale p-6">
        <h3 className="text-xl font-bold text-secondary-900 mb-6">Top Alert Sources</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSources} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={80} />
              <Tooltip />
              <Bar dataKey="alerts" fill="currentColor" className="text-primary-500" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card-scale p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
            
            <button className="btn-secondary">
              <FunnelIcon className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card-scale overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-xl font-bold text-secondary-900">Recent Alerts ({filteredAlerts.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Alert</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-secondary-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-secondary-900">{alert.title}</div>
                      <div className="text-sm text-secondary-500 mt-1">{alert.description}</div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-secondary-400">
                        <span className="flex items-center space-x-1">
                          <ComputerDesktopIcon className="h-3 w-3" />
                          <span>{alert.ip}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <UserIcon className="h-3 w-3" />
                          <span>{alert.user}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                      <span className="ml-1 capitalize">{alert.severity}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-900">{alert.source}</td>
                  <td className="px-6 py-4 text-sm text-secondary-500">{alert.timestamp}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        View
                      </button>
                      <button className="text-secondary-600 hover:text-secondary-700 text-sm font-medium">
                        Investigate
                      </button>
                      <button className="text-error-600 hover:text-error-700 text-sm font-medium">
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alerts; 