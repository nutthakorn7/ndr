import { useState } from 'react';
import { 
  X, User, Key, Shield, Bell, Monitor, Save, 
  RefreshCw, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { useToast } from './Toast';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  status: string;
}

interface Config {
  theme: string;
  refreshRate: string;
  retentionDays: string;
  emailNotifications: boolean;
  slackNotifications: boolean;
  autoUpdate: boolean;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  // Mock Data
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'Admin User', email: 'admin@ndr.local', role: 'Administrator', status: 'active', lastLogin: 'Just now' },
    { id: 2, name: 'Security Analyst', email: 'analyst@ndr.local', role: 'Analyst', status: 'active', lastLogin: '2 hours ago' },
    { id: 3, name: 'Viewer', email: 'audit@ndr.local', role: 'Viewer', status: 'inactive', lastLogin: '5 days ago' },
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { id: 1, name: 'Sensor Fleet A', prefix: 'sk_live_...', created: '2024-01-15', lastUsed: '1m ago', status: 'active' },
    { id: 2, name: 'SIEM Exporter', prefix: 'sk_live_...', created: '2024-02-20', lastUsed: '5m ago', status: 'active' },
    { id: 3, name: 'Dev Test', prefix: 'sk_test_...', created: '2024-03-10', lastUsed: 'Never', status: 'revoked' },
  ]);

  const [config, setConfig] = useState<Config>({
    theme: 'dark',
    refreshRate: '30',
    retentionDays: '90',
    emailNotifications: true,
    slackNotifications: false,
    autoUpdate: true
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast('Settings saved successfully', 'success');
    }, 800);
  };

  const handleDeleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
    addToast('User deleted', 'info');
  };

  const handleRevokeKey = (id: number) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
    addToast('API Key revoked', 'info');
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-sidebar">
          <div className="settings-header">
            <h2>Settings</h2>
          </div>
          <nav className="settings-nav">
            <button 
              className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Monitor className="w-4 h-4" /> General
            </button>
            <button 
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <User className="w-4 h-4" /> Users & Roles
            </button>
            <button 
              className={`nav-item ${activeTab === 'apikeys' ? 'active' : ''}`}
              onClick={() => setActiveTab('apikeys')}
            >
              <Key className="w-4 h-4" /> API Keys
            </button>
            <button 
              className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield className="w-4 h-4" /> Security
            </button>
            <button 
              className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="w-4 h-4" /> Notifications
            </button>
            <button 
              className={`nav-item ${activeTab === 'debug' ? 'active' : ''}`}
              onClick={() => setActiveTab('debug')}
            >
              <AlertTriangle className="w-4 h-4" /> Debug
            </button>
          </nav>
          <div className="settings-footer">
            <span className="version">v2.4.0-beta</span>
          </div>
        </div>

        <div className="settings-content">
          <div className="content-header">
            <h3>
              {activeTab === 'general' && 'General Configuration'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'apikeys' && 'API Key Management'}
              {activeTab === 'security' && 'Security Policies'}
              {activeTab === 'notifications' && 'Notification Preferences'}
            </h3>
            <button className="close-btn" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="content-body">
            {activeTab === 'general' && (
              <div className="form-section">
                <div className="form-group">
                  <label>Dashboard Refresh Rate (seconds)</label>
                  <select 
                    value={config.refreshRate}
                    onChange={(e) => setConfig({...config, refreshRate: e.target.value})}
                  >
                    <option value="15">15 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                    <option value="manual">Manual only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Data Retention Period (days)</label>
                  <select 
                    value={config.retentionDays}
                    onChange={(e) => setConfig({...config, retentionDays: e.target.value})}
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                <div className="form-group checkbox">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={config.autoUpdate}
                      onChange={(e) => setConfig({...config, autoUpdate: e.target.checked})}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span>Enable Automatic System Updates</span>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="list-section">
                <div className="list-actions">
                  <button className="btn-primary" onClick={() => addToast('Add User modal would open here', 'info')}>
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">{user.name.charAt(0)}</div>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="role-badge">{user.role}</span></td>
                        <td>
                          <span className={`status-dot ${user.status}`}></span> {user.status}
                        </td>
                        <td className="text-gray-400">{user.lastLogin}</td>
                        <td>
                          <button className="btn-icon-sm text-red-400" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'apikeys' && (
              <div className="list-section">
                <div className="list-actions">
                  <button className="btn-primary" onClick={() => addToast('Generate Key modal would open here', 'info')}>
                    <Plus className="w-4 h-4" /> Generate New Key
                  </button>
                </div>
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Key Prefix</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map(key => (
                      <tr key={key.id}>
                        <td className="font-medium">{key.name}</td>
                        <td className="mono text-xs">{key.prefix}</td>
                        <td className="text-gray-400">{key.created}</td>
                        <td>
                          <span className={`status-badge ${key.status}`}>{key.status}</span>
                        </td>
                        <td>
                          {key.status === 'active' && (
                            <button 
                              className="btn-text-danger"
                              onClick={() => handleRevokeKey(key.id)}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Placeholder for other tabs */}
            {(activeTab === 'security' || activeTab === 'notifications') && (
              <div className="empty-state">
                <Shield className="w-12 h-12 text-gray-700 mb-4" />
                <p>This configuration section is under development.</p>
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="form-section">
                <div className="debug-warning">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <p>These tools are for testing error handling and debugging purposes only.</p>
                </div>
                
                <div className="form-group">
                  <label>Error Boundary Test</label>
                  <p className="text-sm text-gray-400 mb-2">
                    Clicking this button will throw a JavaScript error to test the global Error Boundary.
                  </p>
                  <button 
                    className="btn-danger"
                    onClick={() => {
                      // This will be caught by ErrorBoundary
                      throw new Error('Manual test error triggered from Settings');
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" /> Trigger Crash
                  </button>
                </div>

                <div className="form-group">
                  <label>API Error Simulation</label>
                  <p className="text-sm text-gray-400 mb-2">
                    Force next API request to fail (simulates 500 Server Error).
                  </p>
                  <button 
                    className="btn-secondary"
                    onClick={() => addToast('API Error Simulation enabled for next request', 'info')}
                  >
                    <RefreshCw className="w-4 h-4" /> Simulate API Failure
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="content-footer">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
