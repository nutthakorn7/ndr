import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { logsAPI } from '../services/api';

const Logs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Query สำหรับดึงข้อมูล logs พร้อม parameters
  const { data: logsData, isLoading, refetch } = useQuery(
    ['logs', currentPage, pageSize, searchTerm, selectedStatus],
    () => logsAPI.getLogs({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined
    }),
    {
      keepPreviousData: true,
      staleTime: 30000 // Cache for 30 seconds
    }
  );

  // Query สำหรับ stats
  const { data: statsData } = useQuery('logStats', logsAPI.getLogStats, {
    refetchInterval: 60000 // Refresh every minute
  });

  const logs = logsData?.logs || [];
  const totalLogs = logsData?.total || 0;
  const totalPages = Math.ceil(totalLogs / pageSize);

  // Export CSV functionality
  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/logs/export?format=csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const getSeverityIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'FAILED':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      case 'SUCCESS':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  const getSeverityBadge = (status) => {
    const classes = {
      'FAILED': 'bg-error-100 text-error-700 border-error-200',
      'SUCCESS': 'bg-success-100 text-success-700 border-success-200',
    };
    return classes[status?.toUpperCase()] || 'bg-secondary-100 text-secondary-700 border-secondary-200';
  };

  const getActionIcon = (action) => {
    if (action?.includes('LOGIN')) {
      return action.includes('SUCCESS') || action === 'LOGIN' ? 
        <CheckCircleIcon className="h-4 w-4 text-success-500" /> :
        <XCircleIcon className="h-4 w-4 text-error-500" />;
    }
    if (action?.includes('LOGOUT')) {
      return <ShieldCheckIcon className="h-4 w-4 text-warning-500" />;
    }
    return <ClockIcon className="h-4 w-4 text-secondary-400" />;
  };

  const LogRow = ({ log }) => (
    <tr className="hover:bg-secondary-50 transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          {getSeverityIcon(log.status)}
          <div>
            <div className="text-sm font-medium text-secondary-900">
              {new Date(log.timestamp).toLocaleTimeString()}
            </div>
            <div className="text-xs text-secondary-500">
              {new Date(log.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-secondary-900">{log.source_name || log.source_type}</div>
          <div className="text-xs text-secondary-500">{log.source_ip}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          {getActionIcon(log.action)}
          <span className="text-sm font-medium text-secondary-900">{log.username || log.user_id}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          {getActionIcon(log.action)}
          <span className="text-sm text-secondary-900">{log.action}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getSeverityBadge(log.status)}`}>
          {log.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-secondary-900 max-w-xs truncate" title={log.details ? JSON.stringify(log.details) : `${log.action} from ${log.client_ip}`}>
          {log.details ? JSON.stringify(log.details) : `${log.action} from ${log.client_ip}`}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button className="text-primary-600 hover:text-primary-900 mr-3">
          <EyeIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            Security <span className="gradient-text">Logs</span>
          </h1>
          <p className="text-secondary-600 mt-2">
            Monitor and analyze security events across your infrastructure
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success-100 text-success-700 rounded-xl">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Feed</span>
          </div>
          <button className="btn-secondary">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">2,847</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Today's Events</h3>
            <p className="text-xs text-secondary-500 mt-1">+12% from yesterday</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-error-500 to-error-600 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">47</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Critical Events</h3>
            <p className="text-xs text-secondary-500 mt-1">Require attention</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">156</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Security Alerts</h3>
            <p className="text-xs text-secondary-500 mt-1">Last 24 hours</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">98.7%</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Sources Online</h3>
            <p className="text-xs text-secondary-500 mt-1">124 of 126 active</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card-scale">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search logs, users, or events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-scale pl-10 pr-4 w-full"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input-scale pr-8"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-scale pr-8"
              >
                <option value="all">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                Filters
                <ChevronDownIcon className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-secondary-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Source</label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="input-scale w-full"
                  >
                    <option value="all">All Sources</option>
                    <option value="firewall">Firewalls</option>
                    <option value="server">Servers</option>
                    <option value="application">Applications</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Action Type</label>
                  <select className="input-scale w-full">
                    <option value="all">All Actions</option>
                    <option value="login">Login Events</option>
                    <option value="policy">Policy Violations</option>
                    <option value="intrusion">Intrusion Attempts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">User</label>
                  <input
                    type="text"
                    placeholder="Filter by username..."
                    className="input-scale w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-scale overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-secondary-200 rounded shimmer"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                logs.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-6 py-3 border-t border-secondary-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary-700">
              Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pageSize, totalLogs)}</span> of{' '}
              <span className="font-medium">{totalLogs}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm text-secondary-600 hover:text-secondary-900 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                const pageNum = startPage + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'text-white bg-primary-600 border-primary-600'
                        : 'text-secondary-600 hover:text-secondary-900 border-secondary-300 hover:bg-secondary-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm text-secondary-600 hover:text-secondary-900 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
