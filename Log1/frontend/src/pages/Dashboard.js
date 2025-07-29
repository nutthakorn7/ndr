import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ServerIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  FireIcon,
  EyeIcon,
  UsersIcon,
  XMarkIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import { analyticsAPI, logsAPI } from '../services/api';

const Dashboard = () => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const navigate = useNavigate();
  
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    'dashboard',
    analyticsAPI.getDashboard,
    { refetchInterval: 30000 }
  );

  const { data: logStats, isLoading: statsLoading } = useQuery(
    'logStats',
    logsAPI.getLogStats,
    { refetchInterval: 30000 }
  );

  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  const handleNavigateToLogs = () => {
    navigate('/logs');
  };

  const handleNavigateToAnalytics = () => {
    navigate('/analytics');
  };

  // Mock real-time data
  const realTimeMetrics = [
    { name: '00:00', events: 245, threats: 12, users: 89 },
    { name: '04:00', events: 189, threats: 8, users: 67 },
    { name: '08:00', events: 892, threats: 34, users: 234 },
    { name: '12:00', events: 1245, threats: 45, users: 345 },
    { name: '16:00', events: 987, threats: 28, users: 289 },
    { name: '20:00', events: 567, threats: 19, users: 156 },
  ];

  const threatDistribution = [
    { name: 'Malware', value: 35, color: '#ef4444' },
    { name: 'Intrusion', value: 28, color: '#f59e0b' },
    { name: 'DDoS', value: 22, color: '#0ea5e9' },
    { name: 'Phishing', value: 15, color: '#d946ef' },
  ];

  const topSources = [
    { name: 'Firewall-01', events: 2456, status: 'healthy' },
    { name: 'Firewall-02', events: 1899, status: 'healthy' },
    { name: 'Server-Web-01', events: 1234, status: 'warning' },
    { name: 'Proxy-DMZ', events: 987, status: 'healthy' },
    { name: 'AD-Controller', events: 654, status: 'error' },
  ];

  const stats = [
    {
      title: 'Total Events',
      value: '2.4M',
      change: '+12.5%',
      changeType: 'increase',
      icon: DocumentTextIcon,
      description: 'Last 24 hours',
      color: 'primary'
    },
    {
      title: 'Active Threats',
      value: '47',
      change: '-8.2%',
      changeType: 'decrease',
      icon: ExclamationTriangleIcon,
      description: 'Currently detected',
      color: 'error'
    },
    {
      title: 'Sources Online',
      value: '98.7%',
      change: '+2.1%',
      changeType: 'increase',
      icon: ServerIcon,
      description: '124 of 126 sources',
      color: 'success'
    },
    {
      title: 'Response Time',
      value: '1.2s',
      change: '-15.3%',
      changeType: 'decrease',
      icon: ClockIcon,
      description: 'Avg processing time',
      color: 'warning'
    },
  ];

  const getStatCardStyle = (color) => {
    const styles = {
      primary: 'bg-gradient-to-br from-secondary-800 to-secondary-900',
      error: 'bg-gradient-to-br from-error-500 to-error-600',
      success: 'bg-gradient-to-br from-success-500 to-success-600',
      warning: 'bg-gradient-to-br from-warning-500 to-warning-600',
    };
    return styles[color] || styles.primary;
  };

  if (dashboardLoading || statsLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary-200 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-secondary-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-secondary-200 rounded-2xl"></div>
            <div className="h-96 bg-secondary-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            Security <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-secondary-600 mt-2">
            Real-time monitoring and threat intelligence overview
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success-100 text-success-700 rounded-xl">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live</span>
          </div>
          <button 
            className="btn-secondary hover:btn-primary transition-all duration-200"
            onClick={handleViewDetails}
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            View Details
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card-scale group overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${getStatCardStyle(stat.color)} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className={`flex items-center space-x-1 text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-success-600' : 'text-error-600'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-secondary-900 mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-secondary-700">{stat.title}</p>
                <p className="text-xs text-secondary-500 mt-1">{stat.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Real-time Activity */}
        <div className="xl:col-span-2 card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Real-time Activity</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-secondary-800 rounded-full"></div>
                <span className="text-sm text-secondary-600">Events</span>
                <div className="w-3 h-3 bg-error-500 rounded-full ml-4"></div>
                <span className="text-sm text-secondary-600">Threats</span>
                <div className="w-3 h-3 bg-success-500 rounded-full ml-4"></div>
                <span className="text-sm text-secondary-600">Users</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={realTimeMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="events" 
                  stackId="1"
                  stroke="#0ea5e9" 
                  fill="#0ea5e9"
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  stackId="2"
                  stroke="#ef4444" 
                  fill="#ef4444"
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stackId="3"
                  stroke="#22c55e" 
                  fill="#22c55e"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Distribution */}
        <div className="card-scale">
          <div className="p-6">
            <h3 className="text-xl font-bold text-secondary-900 mb-6">Threat Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={threatDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {threatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {threatDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-secondary-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-secondary-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sources */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Top Event Sources</h3>
              <button className="text-secondary-700 hover:text-secondary-900 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {topSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      source.status === 'healthy' ? 'bg-success-100 text-success-600' :
                      source.status === 'warning' ? 'bg-warning-100 text-warning-600' :
                      'bg-error-100 text-error-600'
                    }`}>
                      <ServerIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900">{source.name}</p>
                      <p className="text-sm text-secondary-600">{source.events.toLocaleString()} events</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    source.status === 'healthy' ? 'bg-success-100 text-success-700' :
                    source.status === 'warning' ? 'bg-warning-100 text-warning-700' :
                    'bg-error-100 text-error-700'
                  }`}>
                    {source.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Recent Security Alerts</h3>
              <button className="text-secondary-700 hover:text-secondary-900 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {[
                { type: 'Critical', message: 'Suspicious login detected from unknown IP', time: '2 min ago', severity: 'error' },
                { type: 'High', message: 'Multiple failed authentication attempts', time: '5 min ago', severity: 'warning' },
                { type: 'Medium', message: 'Unusual network traffic pattern detected', time: '12 min ago', severity: 'warning' },
                { type: 'Low', message: 'Configuration change in firewall rules', time: '1 hour ago', severity: 'success' },
              ].map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'error' ? 'bg-error-100 text-error-600' :
                    alert.severity === 'warning' ? 'bg-warning-100 text-warning-600' :
                    'bg-success-100 text-success-600'
                  }`}>
                    <ExclamationTriangleIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        alert.severity === 'error' ? 'bg-error-100 text-error-700' :
                        alert.severity === 'warning' ? 'bg-warning-100 text-warning-700' :
                        'bg-success-100 text-success-700'
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-xs text-secondary-500">{alert.time}</span>
                    </div>
                    <p className="text-sm text-secondary-700 mt-1">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">System Overview Details</h2>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* System Statistics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Real-time Statistics</h3>
                  
                  {logStats && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Total Logs</span>
                        <span className="text-lg font-bold text-blue-600">{logStats.total_logs?.toLocaleString()}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Status Distribution</h4>
                        {logStats.status_stats?.map((stat, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">{stat.status}</span>
                            <span className="text-sm font-semibold text-gray-800">{stat.count}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Source Types</h4>
                        {logStats.source_stats?.map((stat, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">{stat.source_type}</span>
                            <span className="text-sm font-semibold text-gray-800">{stat.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                  
                  {logStats?.recent_activity && (
                    <div className="space-y-3">
                      {logStats.recent_activity.slice(0, 8).map((activity, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                activity.status === 'SUCCESS' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {activity.action}
                              </span>
                              <p className="text-sm text-gray-700 mt-1">
                                User: {activity.user_id} from {activity.client_ip}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-3">
                <button 
                  onClick={handleNavigateToLogs}
                  className="btn-primary flex items-center"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  View All Logs
                </button>
                
                <button 
                  onClick={handleNavigateToAnalytics}
                  className="btn-secondary flex items-center"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Advanced Analytics
                </button>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="btn-outline flex items-center"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
