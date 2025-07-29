import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  ServerIcon,
  ComputerDesktopIcon,
  CloudIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AddServer = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedServerType, setSelectedServerType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: '',
    server_type: '',
    protocol: 'ssh',
    credentials: {
      username: '',
      password: '',
      api_key: '',
      server_type: 'linux'
    },
    log_types: []
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Get server types
  const { data: serverTypes = [], isLoading: typesLoading } = useQuery(
    'server-types',
    () => fetch('/api/servers/types').then(res => res.json()),
    {
      onError: (error) => {
        console.error('Failed to load server types:', error);
        toast.error('Failed to load server types');
      }
    }
  );

  // Add server mutation
  const addServerMutation = useMutation(
    (serverData) => 
      fetch('/api/servers/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(serverData)
      }).then(res => res.json()),
    {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Server added successfully');
          queryClient.invalidateQueries('sources');
          navigate('/sources');
        } else {
          toast.error(data.message || 'Failed to add server');
        }
      },
      onError: (error) => {
        console.error('Failed to add server:', error);
        toast.error('Failed to add server');
      }
    }
  );

  // Test connection mutation
  const testConnectionMutation = useMutation(
    (sourceId) =>
      fetch(`/api/servers/${sourceId}/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => res.json()),
    {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Connection test successful!');
        } else {
          toast.error('Connection test failed');
        }
      },
      onError: (error) => {
        console.error('Connection test failed:', error);
        toast.error('Connection test failed');
      }
    }
  );

  // Update form when server type changes
  useEffect(() => {
    const serverType = serverTypes.find(type => type.type === selectedServerType);
    if (serverType) {
      setFormData(prev => ({
        ...prev,
        server_type: selectedServerType,
        port: serverType.default_port,
        protocol: serverType.protocols[0],
        credentials: {
          ...prev.credentials,
          server_type: selectedServerType
        },
        log_types: serverType.log_types
      }));
    }
  }, [selectedServerType, serverTypes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    addServerMutation.mutate(formData);
  };

  const testConnection = async () => {
    if (!formData.name || !formData.ip_address) {
      toast.error('Please fill in required fields first');
      return;
    }

    setTestingConnection(true);
    try {
      // First add the server temporarily to test
      const response = await addServerMutation.mutateAsync(formData);
      if (response.success) {
        // Test the connection
        await testConnectionMutation.mutateAsync(response.source_id);
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTestingConnection(false);
    }
  };

  const getServerIcon = (type) => {
    switch (type) {
      case 'linux':
        return <ServerIcon className="h-8 w-8" />;
      case 'windows':
        return <ComputerDesktopIcon className="h-8 w-8" />;
      case 'web_server':
        return <GlobeAltIcon className="h-8 w-8" />;
      case 'database':
        return <CircleStackIcon className="h-8 w-8" />;
      case 'application':
        return <CpuChipIcon className="h-8 w-8" />;
      default:
        return <CloudIcon className="h-8 w-8" />;
    }
  };

  if (typesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading server types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/sources')}
                className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="text-green-400">zcr</span>
                  <span className="text-orange-400">Log</span>
                  <span className="text-white ml-2">Add Server</span>
                </h1>
                <p className="mt-2 text-slate-300">Configure server log collection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Server Type Selection */}
        {!selectedServerType && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Server Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serverTypes.map((serverType) => (
                <div
                  key={serverType.type}
                  onClick={() => setSelectedServerType(serverType.type)}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-green-300"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-green-100 rounded-lg text-green-600">
                      {getServerIcon(serverType.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{serverType.name}</h3>
                      <p className="text-sm text-gray-600">{serverType.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Default Port:</span>
                      <span className="font-medium text-gray-900">{serverType.default_port}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Protocols:</span>
                      <span className="font-medium text-gray-900">{serverType.protocols.join(', ')}</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-gray-600">Log Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {serverType.log_types.map((logType) => (
                          <span
                            key={logType}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {logType}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Server Configuration Form */}
        {selectedServerType && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  {getServerIcon(selectedServerType)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Configure {serverTypes.find(t => t.type === selectedServerType)?.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {serverTypes.find(t => t.type === selectedServerType)?.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedServerType('')}
                className="text-gray-400 hover:text-gray-600"
              >
                Change Type
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Web-Server-01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 192.168.1.100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="22"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocol
                  </label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {serverTypes.find(t => t.type === selectedServerType)?.protocols.map((protocol) => (
                      <option key={protocol} value={protocol}>
                        {protocol.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Credentials */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.credentials.username}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, username: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="admin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.credentials.password}
                      onChange={(e) => setFormData({
                        ...formData,
                        credentials: { ...formData.credentials, password: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>

                  {formData.protocol === 'api' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="text"
                        value={formData.credentials.api_key}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, api_key: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="API Key or Token"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm font-medium text-green-600 hover:text-green-800 mb-4"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </button>

                {showAdvanced && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Log Types to Collect
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {serverTypes.find(t => t.type === selectedServerType)?.log_types.map((logType) => (
                          <label key={logType} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.log_types.includes(logType)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    log_types: [...formData.log_types, logType]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    log_types: formData.log_types.filter(t => t !== logType)
                                  });
                                }
                              }}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{logType}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-6 border-t">
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate('/sources')}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addServerMutation.isLoading}
                    className="flex items-center px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {addServerMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <ServerIcon className="h-4 w-4 mr-2" />
                        Add Server
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddServer;
