import React, { useState } from 'react';
import { 
  DocumentCheckIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area 
} from 'recharts';

const Compliance = () => {
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');

  // Mock compliance data
  const complianceScores = [
    { framework: 'ISO 27001', score: 92, trend: '+5%', status: 'compliant', color: '#22c55e' },
    { framework: 'SOC 2', score: 88, trend: '+3%', status: 'compliant', color: '#3b82f6' },
    { framework: 'GDPR', score: 85, trend: '-2%', status: 'warning', color: '#f59e0b' },
    { framework: 'HIPAA', score: 78, trend: '+8%', status: 'warning', color: '#f59e0b' },
    { framework: 'PCI DSS', score: 95, trend: '+2%', status: 'compliant', color: '#22c55e' },
    { framework: 'NIST', score: 82, trend: '+4%', status: 'warning', color: '#f59e0b' },
  ];

  const complianceHistory = [
    { month: 'Jan', iso27001: 88, soc2: 85, gdpr: 90, pci: 92 },
    { month: 'Feb', iso27001: 89, soc2: 86, gdpr: 89, pci: 93 },
    { month: 'Mar', iso27001: 91, soc2: 87, gdpr: 87, pci: 94 },
    { month: 'Apr', iso27001: 92, soc2: 88, gdpr: 85, pci: 95 },
  ];

  const recentAudits = [
    {
      id: 1,
      name: 'ISO 27001 Annual Review',
      framework: 'ISO 27001',
      date: '2024-01-15',
      status: 'completed',
      score: 92,
      auditor: 'PwC',
      findings: 3
    },
    {
      id: 2,
      name: 'SOC 2 Type II',
      framework: 'SOC 2',
      date: '2024-01-10',
      status: 'in_progress',
      score: 88,
      auditor: 'Deloitte',
      findings: 5
    },
    {
      id: 3,
      name: 'GDPR Assessment',
      framework: 'GDPR',
      date: '2024-01-08',
      status: 'completed',
      score: 85,
      auditor: 'EY',
      findings: 8
    },
  ];

  const nonComplianceItems = [
    {
      id: 1,
      rule: 'Data Retention Policy',
      framework: 'GDPR',
      severity: 'high',
      description: 'Log retention period exceeds 90 days for personal data',
      dueDate: '2024-02-15',
      assignee: 'Data Protection Officer'
    },
    {
      id: 2,
      rule: 'Access Control Review',
      framework: 'ISO 27001',
      severity: 'medium',
      description: 'Quarterly access review overdue by 5 days',
      dueDate: '2024-01-20',
      assignee: 'Security Team'
    },
    {
      id: 3,
      rule: 'Encryption Standards',
      framework: 'PCI DSS',
      severity: 'low',
      description: 'Update encryption documentation',
      dueDate: '2024-01-25',
      assignee: 'IT Operations'
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'compliant':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />;
      case 'non_compliant':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'compliant':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'warning':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'non_compliant':
        return 'bg-error-100 text-error-700 border-error-200';
      case 'in_progress':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'completed':
        return 'bg-success-100 text-success-700 border-success-200';
      default:
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-error-100 text-error-700';
      case 'medium':
        return 'bg-warning-100 text-warning-700';
      case 'low':
        return 'bg-primary-100 text-primary-700';
      default:
        return 'bg-secondary-100 text-secondary-700';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            Compliance <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-secondary-600 mt-2">
            Monitor and manage regulatory compliance across frameworks
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-scale"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button className="btn-secondary">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">87%</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Overall Compliance</h3>
            <p className="text-xs text-secondary-500 mt-1">+3% from last month</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <DocumentCheckIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">6</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Active Frameworks</h3>
            <p className="text-xs text-secondary-500 mt-1">Monitoring compliance</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">3</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Open Issues</h3>
            <p className="text-xs text-secondary-500 mt-1">Require attention</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">2</span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Upcoming Audits</h3>
            <p className="text-xs text-secondary-500 mt-1">Next 30 days</p>
          </div>
        </div>
      </div>

      {/* Compliance Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {complianceScores.map((framework, index) => (
          <div key={index} className="card-scale group">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(framework.status)}
                  <h3 className="text-lg font-semibold text-secondary-900">{framework.framework}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(framework.status)}`}>
                  {framework.status}
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-secondary-900">{framework.score}%</span>
                  <span className={`text-sm font-medium ${
                    framework.trend.startsWith('+') ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {framework.trend}
                  </span>
                </div>
                <div className="w-full bg-secondary-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${framework.score}%`,
                      backgroundColor: framework.color 
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Compliance Score</span>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Compliance Trends */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Compliance Trends</h3>
              <button className="btn-ghost text-sm">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                Configure
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={complianceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[70, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Line type="monotone" dataKey="iso27001" stroke="#22c55e" strokeWidth={3} name="ISO 27001" />
                <Line type="monotone" dataKey="soc2" stroke="#3b82f6" strokeWidth={3} name="SOC 2" />
                <Line type="monotone" dataKey="gdpr" stroke="#f59e0b" strokeWidth={3} name="GDPR" />
                <Line type="monotone" dataKey="pci" stroke="#d946ef" strokeWidth={3} name="PCI DSS" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Audits */}
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900">Recent Audits</h3>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentAudits.map((audit) => (
                <div key={audit.id} className="p-4 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-secondary-900">{audit.name}</h4>
                      <p className="text-sm text-secondary-600">{audit.framework}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(audit.status)}`}>
                      {audit.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-secondary-600">Score:</span>
                      <span className="font-medium text-secondary-900 ml-1">{audit.score}%</span>
                    </div>
                    <div>
                      <span className="text-secondary-600">Findings:</span>
                      <span className="font-medium text-secondary-900 ml-1">{audit.findings}</span>
                    </div>
                    <div>
                      <span className="text-secondary-600">Date:</span>
                      <span className="font-medium text-secondary-900 ml-1">{new Date(audit.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-secondary-600">Auditor:</span>
                      <span className="font-medium text-secondary-900 ml-1">{audit.auditor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Non-Compliance Issues */}
      <div className="card-scale">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-secondary-900">Non-Compliance Issues</h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="input-scale text-sm"
              >
                <option value="all">All Frameworks</option>
                <option value="iso27001">ISO 27001</option>
                <option value="soc2">SOC 2</option>
                <option value="gdpr">GDPR</option>
                <option value="pci">PCI DSS</option>
              </select>
              <button className="btn-secondary text-sm">
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Framework
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {nonComplianceItems.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-secondary-900">{item.rule}</div>
                        <div className="text-sm text-secondary-600">{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-secondary-900">{item.framework}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {item.assignee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compliance; 