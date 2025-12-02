import { useState } from 'react';
import { 
  X, User, Key, Shield, Bell, Monitor, 
  Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { BaseModal, BaseButton, BaseInput, BaseTable, Column } from './base';
import { useToast } from './Toast';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClose: () => void;
}

interface UserData {
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
  const [users, setUsers] = useState<UserData[]>([
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

  // User table columns
  const userColumns: Column<UserData>[] = [
    {
      key: 'name',
      header: 'User',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 'var(--font-medium)' }}>{row.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{row.email}</div>
        </div>
      )
    },
    { key: 'role', header: 'Role', width: '140px' },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className={`status-dot status-dot--${row.status}`}></span>
          {row.status}
        </span>
      )
    },
    { key: 'lastLogin', header: 'Last Login', width: '140px' },
    {
      key: 'id',
      header: 'Actions',
      width: '80px',
      align: 'center',
      render: (row) => (
        <BaseButton
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={() => handleDeleteUser(row.id)}
        />
      )
    }
  ];

  // API Keys table columns
  const keyColumns: Column<ApiKey>[] = [
    { key: 'name', header: 'Name' },
    { key: 'prefix', header: 'Key Prefix', width: '140px' },
    { key: 'created', header: 'Created', width: '120px' },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <span className={`status-badge status-badge--${row.status}`}>{row.status}</span>
      )
    },
    {
      key: 'id',
      header: 'Actions',
      width: '80px',
      align: 'center',
      render: (row) => (
        row.status !== 'revoked' && (
          <BaseButton
            variant="ghost"
            size="sm"
            onClick={() => handleRevokeKey(row.id)}
          >
            Revoke
          </BaseButton>
        )
      )
    }
  ];

  const navItems = [
    { id: 'general', label: 'General', icon: Monitor },
    { id: 'users', label: 'Users & Roles', icon: User },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'debug', label: 'Debug', icon: AlertTriangle },
  ];

  const getTabTitle = () => {
    const titles: Record<string, string> = {
      general: 'General Configuration',
      users: 'User Management',
      apikeys: 'API Key Management',
      security: 'Security Policies',
      notifications: 'Notification Preferences',
      debug: 'Debug Information'
    };
    return titles[activeTab] || 'Settings';
  };

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      size="xl"
      closeOnOverlayClick={false}
    >
      <div className="settings-content-wrapper">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h2>Settings</h2>
          </div>
          <nav className="settings-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`settings-nav-item ${activeTab === item.id ? 'settings-nav-item--active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="settings-sidebar-footer">
            <span className="settings-version">v2.4.0-beta</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="settings-main-content">
          <div className="settings-content-header">
            <h3>{getTabTitle()}</h3>
          </div>

          <div className="settings-content-body">
            {activeTab === 'general' && (
              <div className="form-section">
                <div className="form-row">
                  <label>Refresh Rate</label>
                  <select
                    value={config.refreshRate}
                    onChange={(e) => setConfig({...config, refreshRate: e.target.value})}
                    className="input"
                  >
                    <option value="15">15 seconds</option>
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                    <option value="manual">Manual only</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Data Retention</label>
                  <select
                    value={config.retentionDays}
                    onChange={(e) => setConfig({...config, retentionDays: e.target.value})}
                    className="input"
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Auto Update</label>
                  <input
                    type="checkbox"
                    checked={config.autoUpdate}
                    onChange={(e) => setConfig({...config, autoUpdate: e.target.checked})}
                  />
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <BaseButton
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={() => addToast('Add User modal would open here', 'info')}
                  >
                    Add User
                  </BaseButton>
                </div>
                <BaseTable data={users} columns={userColumns} />
              </div>
            )}

            {activeTab === 'apikeys' && (
              <div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <BaseButton
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={() => addToast('Generate Key modal would open here', 'info')}
                  >
                    Generate New Key
                  </BaseButton>
                </div>
                <BaseTable data={apiKeys} columns={keyColumns} />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="form-section">
                <div className="form-row">
                  <label>Email Notifications</label>
                  <input
                    type="checkbox"
                    checked={config.emailNotifications}
                    onChange={(e) => setConfig({...config, emailNotifications: e.target.checked})}
                  />
                </div>
                <div className="form-row">
                  <label>Slack Notifications</label>
                  <input
                    type="checkbox"
                    checked={config.slackNotifications}
                    onChange={(e) => setConfig({...config, slackNotifications: e.target.checked})}
                  />
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ color: 'var(--text-secondary)' }}>
                Security policies configuration would go here...
              </div>
            )}

            {activeTab === 'debug' && (
              <div style={{ color: 'var(--text-secondary)' }}>
                Debug information and logs would go here...
              </div>
            )}
          </div>

          <div className="settings-content-footer">
            <BaseButton variant="secondary" onClick={onClose}>
              Cancel
            </BaseButton>
            <BaseButton variant="primary" loading={loading} onClick={handleSave}>
              Save Changes
            </BaseButton>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
