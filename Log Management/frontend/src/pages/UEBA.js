import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  UserIcon,
  ClockIcon,
  GlobeAltIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  EyeIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, 
  ScatterChart, Scatter, TreeMap, RadialBarChart, RadialBar
} from 'recharts';

const UEBA = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [filterCategory, setFilterCategory] = useState('all');

  // Mock data for UEBA analysis
  const topUsersByBandwidth = [
    { username: 'john.doe', bandwidth: '2.8 GB', requests: 15420, risk_score: 85, department: 'IT' },
    { username: 'alice.wong', bandwidth: '2.1 GB', requests: 12340, risk_score: 45, department: 'Marketing' },
    { username: 'bob.smith', bandwidth: '1.9 GB', requests: 11280, risk_score: 92, department: 'Finance' },
    { username: 'carol.lee', bandwidth: '1.7 GB', requests: 9870, risk_score: 38, department: 'HR' },
    { username: 'david.kim', bandwidth: '1.5 GB', requests: 8950, risk_score: 67, department: 'Engineering' },
    { username: 'emma.davis', bandwidth: '1.3 GB', requests: 7820, risk_score: 23, department: 'Sales' },
    { username: 'frank.wilson', bandwidth: '1.1 GB', requests: 6543, risk_score: 78, department: 'Operations' },
    { username: 'grace.taylor', bandwidth: '0.9 GB', requests: 5432, risk_score: 31, department: 'Legal' },
  ];

  const userActivityTimeline = [
    { time: '00:00', logins: 2, web_requests: 45, anomalous: 1 },
    { time: '02:00', logins: 1, web_requests: 23, anomalous: 0 },
    { time: '04:00', logins: 0, web_requests: 12, anomalous: 0 },
    { time: '06:00', logins: 8, web_requests: 234, anomalous: 0 },
    { time: '08:00', logins: 45, web_requests: 1250, anomalous: 2 },
    { time: '10:00', logins: 32, web_requests: 1890, anomalous: 1 },
    { time: '12:00', logins: 28, web_requests: 1650, anomalous: 0 },
    { time: '14:00', logins: 35, web_requests: 1980, anomalous: 3 },
    { time: '16:00', logins: 29, web_requests: 1720, anomalous: 1 },
    { time: '18:00', logins: 15, web_requests: 890, anomalous: 0 },
    { time: '20:00', logins: 8, web_requests: 340, anomalous: 2 },
    { time: '22:00', logins: 4, web_requests: 156, anomalous: 1 },
  ];

  const accessedDomains = [
    { domain: 'google.com', category: 'Search Engines', requests: 4521, unique_users: 156, risk: 'Low' },
    { domain: 'facebook.com', category: 'Social Media', requests: 3892, unique_users: 134, risk: 'Medium' },
    { domain: 'dropbox.com', category: 'Cloud Storage', requests: 2145, unique_users: 89, risk: 'Medium' },
    { domain: 'github.com', category: 'Software Development', requests: 1876, unique_users: 67, risk: 'Low' },
    { domain: 'youtube.com', category: 'Video Streaming', requests: 1654, unique_users: 123, risk: 'Medium' },
    { domain: 'linkedin.com', category: 'Professional Network', requests: 1432, unique_users: 98, risk: 'Low' },
    { domain: 'instagram.com', category: 'Social Media', requests: 1234, unique_users: 87, risk: 'Medium' },
    { domain: 'twitter.com', category: 'Social Media', requests: 1098, unique_users: 76, risk: 'Medium' },
    { domain: 'pornhub.com', category: 'Adult Content', requests: 892, unique_users: 23, risk: 'High' },
    { domain: 'bet365.com', category: 'Gambling', requests: 567, unique_users: 12, risk: 'High' },
  ];

  const blockedRequests = [
    { username: 'john.doe', blocked_count: 145, top_reason: 'Adult Content', last_blocked: '2024-01-15 14:30' },
    { username: 'bob.smith', blocked_count: 89, top_reason: 'Gambling', last_blocked: '2024-01-15 13:45' },
    { username: 'frank.wilson', blocked_count: 67, top_reason: 'Malware Category', last_blocked: '2024-01-15 12:20' },
    { username: 'david.kim', blocked_count: 45, top_reason: 'Social Media Policy', last_blocked: '2024-01-15 11:15' },
    { username: 'alice.wong', blocked_count: 34, top_reason: 'File Sharing', last_blocked: '2024-01-15 10:30' },
    { username: 'carol.lee', blocked_count: 23, top_reason: 'Productivity Tools', last_blocked: '2024-01-15 09:45' },
  ];

  const anomalousUsers = [
    { 
      username: 'john.doe', 
      anomaly_type: 'High Bandwidth Usage', 
      severity: 'High',
      description: 'Bandwidth usage 400% above normal',
      first_detected: '2024-01-15 08:30',
      confidence: 95
    },
    { 
      username: 'bob.smith', 
      anomaly_type: 'Off-hours Activity', 
      severity: 'Medium',
      description: 'Active during 2-4 AM consistently',
      first_detected: '2024-01-14 22:15',
      confidence: 87
    },
    { 
      username: 'frank.wilson', 
      anomaly_type: 'Unusual Domain Access', 
      severity: 'High',
      description: 'Accessing suspicious domains repeatedly',
      first_detected: '2024-01-15 13:20',
      confidence: 92
    },
    { 
      username: 'sarah.jones', 
      anomaly_type: 'Device Anomaly', 
      severity: 'Medium',
      description: 'New device not in corporate inventory',
      first_detected: '2024-01-15 09:45',
      confidence: 78
    },
  ];

  const searchTerms = [
    { username: 'john.doe', search_term: 'company confidential data download', frequency: 23, risk_score: 95 },
    { username: 'bob.smith', search_term: 'how to bypass firewall', frequency: 18, risk_score: 88 },
    { username: 'alice.wong', search_term: 'competitor pricing information', frequency: 15, risk_score: 72 },
    { username: 'frank.wilson', search_term: 'bitcoin wallet anonymous', frequency: 12, risk_score: 85 },
    { username: 'david.kim', search_term: 'vpn free download', frequency: 9, risk_score: 65 },
  ];

  const userLocations = [
    { username: 'john.doe', internal_ip: '192.168.1.45', external_ip: '203.144.12.99', location: 'Bangkok, Thailand', vpn_usage: true },
    { username: 'alice.wong', internal_ip: '192.168.1.67', external_ip: '203.144.12.99', location: 'Bangkok, Thailand', vpn_usage: false },
    { username: 'bob.smith', internal_ip: '192.168.1.89', external_ip: '185.220.101.42', location: 'Frankfurt, Germany', vpn_usage: true },
    { username: 'carol.lee', internal_ip: '192.168.1.23', external_ip: '203.144.12.99', location: 'Bangkok, Thailand', vpn_usage: false },
    { username: 'david.kim', internal_ip: '192.168.1.156', external_ip: '104.248.144.20', location: 'Singapore', vpn_usage: true },
  ];

  const deviceSummary = [
    { device_type: 'Windows 10', count: 245, percentage: 68.5, browsers: ['Chrome', 'Edge', 'Firefox'] },
    { device_type: 'macOS', count: 67, percentage: 18.7, browsers: ['Safari', 'Chrome'] },
    { device_type: 'Android', count: 28, percentage: 7.8, browsers: ['Chrome Mobile'] },
    { device_type: 'iOS', count: 12, percentage: 3.4, browsers: ['Safari Mobile'] },
    { device_type: 'Linux', count: 6, percentage: 1.6, browsers: ['Firefox', 'Chrome'] },
  ];

  const categoryData = [
    { name: 'Social Media', value: 35, color: '#fd7e14' },
    { name: 'Cloud Storage', value: 22, color: '#198754' },
    { name: 'Video Streaming', value: 18, color: '#dc3545' },
    { name: 'Search Engines', value: 15, color: '#0dcaf0' },
    { name: 'Adult Content', value: 6, color: '#6f42c1' },
    { name: 'Gambling', value: 4, color: '#e83e8c' },
  ];

  const getRiskColor = (riskScore) => {
    if (riskScore >= 80) return 'text-red-600 bg-red-100';
    if (riskScore >= 60) return 'text-orange-600 bg-orange-100';
    if (riskScore >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            User <span className="gradient-text">Behavior Analytics</span>
          </h1>
          <p className="text-secondary-600 mt-2">Advanced UEBA insights and anomaly detection</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success-100 text-success-700 rounded-xl">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Analytics</span>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-scale"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="input-scale"
          >
            <option value="">All Users</option>
            {topUsersByBandwidth.map(user => (
              <option key={user.username} value={user.username}>
                {user.username}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="border-b border-secondary-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: ChartBarIcon },
                { id: 'bandwidth', name: 'Top Users', icon: ArrowTrendingUpIcon },
                { id: 'timeline', name: 'Activity Timeline', icon: CalendarDaysIcon },
                { id: 'domains', name: 'Accessed Domains', icon: GlobeAltIcon },
                { id: 'blocked', name: 'Blocked Requests', icon: ShieldExclamationIcon },
                { id: 'anomalies', name: 'Anomalies', icon: ExclamationTriangleIcon },
                { id: 'searches', name: 'Search Terms', icon: MagnifyingGlassIcon },
                { id: 'locations', name: 'User Locations', icon: MapPinIcon },
                { id: 'devices', name: 'Devices', icon: DevicePhoneMobileIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Timeline */}
                        <div className="card-scale">
              <div className="p-6">
                <h3 className="text-xl font-bold text-secondary-900 mb-6">24-Hour User Activity Pattern</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userActivityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="logins" 
                    stackId="1"
                    stroke="#198754" 
                    fill="#198754"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="web_requests" 
                    stackId="2"
                    stroke="#0dcaf0" 
                    fill="#0dcaf0"
                    fillOpacity={0.4}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="anomalous" 
                    stackId="3"
                    stroke="#dc3545" 
                    fill="#dc3545"
                    fillOpacity={0.8}
                  />
                                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Website Categories Access</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {categoryData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Users by Bandwidth Tab */}
        {activeTab === 'bandwidth' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Top Users by Bandwidth & Request Count</h3>
              <p className="text-sm text-gray-600 mt-1">Users with highest network usage and potential risk indicators</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bandwidth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topUsersByBandwidth.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {user.bandwidth}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.requests.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(user.risk_score)}`}>
                          {user.risk_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-green-600 hover:text-green-900 font-medium">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">User Activity Timeline</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Hourly breakdown of user activities</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={userActivityTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  stroke="#198754" 
                  strokeWidth={3}
                  dot={{ fill: '#198754', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="web_requests" 
                  stroke="#0dcaf0" 
                  strokeWidth={3}
                  dot={{ fill: '#0dcaf0', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="anomalous" 
                  stroke="#dc3545" 
                  strokeWidth={3}
                  dot={{ fill: '#dc3545', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center space-x-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Logins</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Web Requests</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Anomalous Activity</span>
              </div>
            </div>
          </div>
        )}

        {/* Accessed Domains Tab */}
        {activeTab === 'domains' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">User Accessed Domains & Categories</h3>
              <p className="text-sm text-gray-600 mt-1">Top domains and categories accessed by users</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Users</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accessedDomains.map((domain, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {domain.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {domain.requests.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {domain.unique_users}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          domain.risk === 'High' ? 'bg-red-100 text-red-800' :
                          domain.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {domain.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Blocked Requests Tab */}
        {activeTab === 'blocked' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Blocked Requests by User</h3>
              <p className="text-sm text-gray-600 mt-1">Users with highest number of blocked requests</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blocked Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Top Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Blocked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blockedRequests.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-red-600">{user.blocked_count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.top_reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.last_blocked}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-green-600 hover:text-green-900 font-medium">
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Anomalies Tab */}
        {activeTab === 'anomalies' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Anomalous & Suspicious User Behavior</h3>
              <p className="text-sm text-gray-600 mt-1">Machine learning detected anomalies and suspicious activities</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {anomalousUsers.map((anomaly, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className={`h-6 w-6 ${
                            anomaly.severity === 'High' ? 'text-red-500' : 
                            anomaly.severity === 'Medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{anomaly.username}</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(anomaly.severity)}`}>
                              {anomaly.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{anomaly.anomaly_type}</p>
                          <p className="text-sm text-gray-700 mt-2">{anomaly.description}</p>
                          <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                            <span>First detected: {anomaly.first_detected}</span>
                            <span>Confidence: {anomaly.confidence}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                          Investigate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Terms Tab */}
        {activeTab === 'searches' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">User Search Terms & Queries</h3>
              <p className="text-sm text-gray-600 mt-1">High-risk search terms and suspicious queries</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search Term</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchTerms.map((search, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{search.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <span className="truncate block">{search.search_term}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {search.frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(search.risk_score)}`}>
                          {search.risk_score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-red-600 hover:text-red-900 font-medium">
                          Flag User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Locations Tab */}
        {activeTab === 'locations' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">User Location & IP Mapping</h3>
              <p className="text-sm text-gray-600 mt-1">User locations and VPN usage tracking</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internal IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">External IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VPN Usage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userLocations.map((location, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-sm font-medium text-gray-900">{location.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {location.internal_ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {location.external_ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {location.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          location.vpn_usage ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {location.vpn_usage ? 'VPN' : 'Direct'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Device Types Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Device Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deviceSummary} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="device_type" type="category" stroke="#6b7280" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                  />
                  <Bar dataKey="count" fill="#198754" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Device Summary Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Device & Browser Summary</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {deviceSummary.map((device, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {device.device_type.includes('Windows') || device.device_type.includes('macOS') || device.device_type.includes('Linux') ? 
                            <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-3" /> :
                            <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
                          }
                          <span className="text-sm font-medium text-gray-900">{device.device_type}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{device.count} ({device.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${device.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Browsers: </span>
                        {device.browsers.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default UEBA;
