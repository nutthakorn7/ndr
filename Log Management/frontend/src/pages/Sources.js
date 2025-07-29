import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  PlusIcon, 
  ServerIcon, 
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CogIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  SignalIcon,
  CloudIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { sourcesAPI } from '../services/api';

const Sources = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    source_type: 'FIREWALL',
    ip_address: '',
    port: 22,
    protocol: 'ssh',
    credentials: {
      username: '',
      password: ''
    }
  });

  const queryClient = useQueryClient();

  // Query สำหรับดึงข้อมูล sources
  const { data: sourcesData, isLoading, error } = useQuery(
    'sources',
    sourcesAPI.getSources,
    {
      retry: 1,
      onError: (err) => {
        console.error('Sources API Error:', err);
      }
    }
  );

  // Mutation สำหรับเพิ่ม source ใหม่
  const addSourceMutation = useMutation(sourcesAPI.createSource, {
    onSuccess: () => {
      queryClient.invalidateQueries('sources');
      setShowAddModal(false);
      setNewSource({
        name: '',
        source_type: 'FIREWALL',
        ip_address: '',
        port: 22,
        protocol: 'ssh',
        credentials: { username: '', password: '' }
      });
    },
    onError: (error) => {
      console.error('Error adding source:', error);
    }
  });

  // Mock data สำหรับ fallback
  const mockSources = [
    {
      id: 'mock-1',
      name: 'Fortinet FortiGate-100F',
      source_type: 'FIREWALL',
      ip_address: '192.168.1.1',
      port: 22,
      protocol: 'ssh',
      is_active: true,
      status: 'connected',
      logs_collected: 15420,
      last_log: '2 minutes ago',
      health: 98.5,
      location: 'Main Office',
    },
    {
      id: 'mock-2', 
      name: 'Cisco ASA 5525-X',
      source_type: 'FIREWALL',
      ip_address: '192.168.1.2',
      port: 22,
      protocol: 'ssh',
      is_active: true,
      status: 'connected',
      logs_collected: 8932,
      last_log: '5 minutes ago',
      health: 95.2,
      location: 'Data Center',
    },
    {
      id: 'mock-3',
      name: 'Palo Alto PA-220',
      source_type: 'FIREWALL', 
      ip_address: '192.168.1.3',
      port: 443,
      protocol: 'https',
      is_active: false,
      status: 'disconnected',
      logs_collected: 0,
      last_log: 'Never',
      health: 0,
      location: 'Branch Office',
    },
    {
      id: 'mock-4',
      name: 'Squid Proxy Server',
      source_type: 'PROXY',
      ip_address: '192.168.2.10',
      port: 3128,
      protocol: 'http',
      is_active: true,
      status: 'connected',
      logs_collected: 25431,
      last_log: '1 minute ago',
      health: 97.8,
      location: 'Main Office',
    },
    {
      id: 'mock-5',
      name: 'Active Directory DC01',
      source_type: 'AD',
      ip_address: '192.168.3.10',
      port: 389,
      protocol: 'ldap',
      is_active: true,
      status: 'connected',
      logs_collected: 12890,
      last_log: '3 minutes ago',
      health: 99.1,
      location: 'Data Center',
    }
  ];

  // ใช้ mock data หาก API มีปัญหา
  const sources = error || !sourcesData ? mockSources : sourcesData.sources || [];

  const handleAddSource = () => {
    addSourceMutation.mutate(newSource);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-success-600 bg-success-100';
      case 'warning': return 'text-warning-600 bg-warning-100';
      case 'disconnected': return 'text-error-600 bg-error-100';
      default: return 'text-secondary-600 bg-secondary-100';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'FIREWALL': return ShieldCheckIcon;
      case 'PROXY': return CloudIcon;
      case 'AD': return ServerIcon;
      case 'SERVER': return ComputerDesktopIcon;
      default: return ServerIcon;
    }
  };

  const filteredSources = sources.filter(source => {
    if (activeTab === 'all') return true;
    return source.source_type === activeTab.toUpperCase();
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />;
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-secondary-400" />;
    }
  };

  const getHealthColor = (health) => {
    if (health >= 95) return 'text-success-600';
    if (health >= 80) return 'text-warning-600';
    if (health >= 60) return 'text-orange-600';
    return 'text-error-600';
  };

  const SourceCard = ({ source, type }) => (
    <div className="card-scale group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
              type === 'firewall' 
                ? 'from-orange-400 to-red-500' 
                : 'from-blue-400 to-indigo-500'
            } flex items-center justify-center`}>
              {type === 'firewall' ? (
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              ) : (
                <ServerIcon className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-secondary-900">{source.name}</h3>
              <p className="text-sm text-secondary-600">{source.type} • {source.ip}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(source.status)}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(source.status)}`}>
              {source.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-secondary-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Logs Collected</span>
              <SignalIcon className="h-4 w-4 text-secondary-400" />
            </div>
            <p className="text-lg font-bold text-secondary-900 mt-1">
              {source.logs_collected.toLocaleString()}
            </p>
          </div>
          <div className="bg-secondary-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-600">Health</span>
              <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
            </div>
            <p className={`text-lg font-bold mt-1 ${getHealthColor(source.health)}`}>
              {source.health}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-secondary-600 mb-4">
          <span>Last log: {source.last_log}</span>
          <span>{source.location}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="p-2 text-secondary-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <EyeIcon className="h-4 w-4" />
            </button>
            <button className="p-2 text-secondary-600 hover:text-warning-600 hover:bg-warning-50 rounded-lg transition-colors">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button className="p-2 text-secondary-600 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button className="btn-secondary text-sm">
              {source.status === 'connected' ? (
                <>
                  <StopIcon className="h-4 w-4 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Start
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">
            Log <span className="gradient-text">Sources</span>
          </h1>
          <p className="text-secondary-600 mt-2">
            Manage and monitor your security data sources
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success-100 text-success-700 rounded-xl">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live Monitoring</span>
          </div>
          <Link to="/add-server" className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Source
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <ServerIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">
                {sources.length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Total Sources</h3>
            <p className="text-xs text-secondary-500 mt-1">Active data collectors</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">
                {sources.filter(s => s.status === 'connected').length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Connected</h3>
            <p className="text-xs text-secondary-500 mt-1">Sources online</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">
                {sources.filter(s => s.status === 'warning').length}
              </span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Warnings</h3>
            <p className="text-xs text-secondary-500 mt-1">Need attention</p>
          </div>
        </div>

        <div className="card-scale">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
                <SignalIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">
                {sources
                  .reduce((sum, s) => sum + s.logs_collected, 0)
                  .toLocaleString()}
              </span>
            </div>
            <h3 className="text-sm font-medium text-secondary-700">Total Logs</h3>
            <p className="text-xs text-secondary-500 mt-1">Events collected</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'all', name: 'All Sources', icon: CogIcon, count: sources.length },
            { id: 'firewalls', name: 'Firewalls', icon: ShieldCheckIcon, count: sources.filter(s => s.source_type === 'FIREWALL').length },
            { id: 'servers', name: 'Servers', icon: ComputerDesktopIcon, count: sources.filter(s => s.source_type === 'SERVER').length },
            { id: 'cloud', name: 'Cloud Services', icon: CloudIcon, count: sources.filter(s => s.source_type === 'PROXY').length },
            { id: 'ad', name: 'Active Directory', icon: ServerIcon, count: sources.filter(s => s.source_type === 'AD').length },
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
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-secondary-100 text-secondary-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
                 {activeTab === 'all' && (
           <div>
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-semibold text-secondary-900">All Sources</h2>
               <div className="flex space-x-3">
                 <button 
                   onClick={() => setShowAddModal(true)}
                   className="btn-primary"
                 >
                   <PlusIcon className="h-4 w-4 mr-2" />
                   Add Source
                 </button>
                 <button className="btn-secondary">
                   <CogIcon className="h-4 w-4 mr-2" />
                   Configure
                 </button>
               </div>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {filteredSources.map((source) => (
                 <SourceCard key={source.id} source={source} type="source" />
               ))}
             </div>
           </div>
         )}

        {activeTab === 'firewalls' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-secondary-900">Firewall Sources</h2>
              <button className="btn-secondary">
                <CogIcon className="h-4 w-4 mr-2" />
                Configure
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSources.filter(s => s.source_type === 'FIREWALL').map((source) => (
                <SourceCard key={source.id} source={source} type="firewall" />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'servers' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-secondary-900">Server Sources</h2>
              <Link to="/add-server" className="btn-secondary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Server
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSources.filter(s => s.source_type === 'SERVER').map((source) => (
                <SourceCard key={source.id} source={source} type="server" />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cloud' && (
          <div className="text-center py-12">
            <CloudIcon className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No Cloud Services</h3>
            <p className="text-secondary-600 mb-6">Connect your cloud security services to start collecting logs</p>
            <button className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Cloud Service
            </button>
          </div>
        )}

        {activeTab === 'ad' && (
          <div className="text-center py-12">
            <ServerIcon className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No Active Directory</h3>
            <p className="text-secondary-600 mb-6">Connect your Active Directory to start collecting logs</p>
            <button className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Active Directory
            </button>
          </div>
                 )}
       </div>

       {/* Add Source Modal */}
       {showAddModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <h2 className="text-xl font-bold text-gray-900">Add New Source</h2>
               <button 
                 onClick={() => setShowAddModal(false)}
                 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
               >
                 <XCircleIcon className="h-6 w-6 text-gray-500" />
               </button>
             </div>
             
             <div className="p-6">
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
                   <input
                     type="text"
                     value={newSource.name}
                     onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     placeholder="e.g., Main Firewall"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                   <select
                     value={newSource.source_type}
                     onChange={(e) => setNewSource({...newSource, source_type: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   >
                     <option value="FIREWALL">Firewall</option>
                     <option value="PROXY">Proxy</option>
                     <option value="SERVER">Server</option>
                     <option value="AD">Active Directory</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                   <input
                     type="text"
                     value={newSource.ip_address}
                     onChange={(e) => setNewSource({...newSource, ip_address: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     placeholder="e.g., 192.168.1.1"
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                     <input
                       type="number"
                       value={newSource.port}
                       onChange={(e) => setNewSource({...newSource, port: parseInt(e.target.value)})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Protocol</label>
                     <select
                       value={newSource.protocol}
                       onChange={(e) => setNewSource({...newSource, protocol: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     >
                       <option value="ssh">SSH</option>
                       <option value="https">HTTPS</option>
                       <option value="http">HTTP</option>
                       <option value="ldap">LDAP</option>
                     </select>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                     <input
                       type="text"
                       value={newSource.credentials.username}
                       onChange={(e) => setNewSource({
                         ...newSource, 
                         credentials: {...newSource.credentials, username: e.target.value}
                       })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                     <input
                       type="password"
                       value={newSource.credentials.password}
                       onChange={(e) => setNewSource({
                         ...newSource, 
                         credentials: {...newSource.credentials, password: e.target.value}
                       })}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     />
                   </div>
                 </div>
               </div>

               {/* Buttons */}
               <div className="mt-6 flex justify-end space-x-3">
                 <button 
                   onClick={() => setShowAddModal(false)}
                   className="btn-outline"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleAddSource}
                   disabled={addSourceMutation.isLoading}
                   className="btn-primary"
                 >
                   {addSourceMutation.isLoading ? 'Adding...' : 'Add Source'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };
 
 export default Sources;
