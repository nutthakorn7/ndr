/**
 * Advanced Detection Component
 * Manages Suricata IDS Rules, YARA File Signatures, and Sigma Rules
 */
import { useState, useEffect } from 'react';
import { 
  Eye, FileText, Shield, AlertTriangle, Search, 
  ToggleLeft, ToggleRight, RefreshCw, Plus, Filter,
  CheckCircle, XCircle, Activity, Edit, Save
} from 'lucide-react';
import api from '../utils/api';
import './AdvancedDetection.css';

export default function AdvancedDetection() {
  const [activeTab, setActiveTab] = useState('suricata'); // suricata, yara, sigma, editor
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ruleContent, setRuleContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Helper function to map severity levels
  const mapSeverity = (severity) => {
    if (typeof severity === 'number') {
      if (severity >= 1 && severity <= 3) return 'Critical';
      if (severity === 4) return 'High';
      if (severity === 5) return 'Medium';
      return 'Low';
    }
    // Handle string severities or default
    switch (String(severity).toLowerCase()) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Informational';
    }
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString; // Return original if invalid
    }
  };

  useEffect(() => {
    // Fetch detection rules from API
    const loadRules = async () => {
      setLoading(true);
      try {
        if (activeTab === 'editor') {
          const content = await api.getSuricataRules();
          setRuleContent(content.rules || '');
          setLoading(false);
          return;
        }

        // Try to fetch real detection rules and stats
        const [rulesResponse, statsResponse] = await Promise.all([
          api.getDetectionRules(),
          api.getDetectionStats().catch(() => null)
        ]);
        
        if (rulesResponse && Array.isArray(rulesResponse)) {
          // Transform API response to component format
          const transformedRules = rulesResponse
            .filter(rule => {
              // Filter by active tab type
              if (activeTab === 'suricata') return rule.type === 'suricata' || rule.type === 'ids';
              if (activeTab === 'yara') return rule.type === 'yara';
              if (activeTab === 'sigma') return rule.type === 'sigma';
              return true;
            })
            .map(rule => ({
              id: rule.id || rule.sid,
              name: rule.name || rule.msg,
              category: rule.category || 'Unclassified',
              severity: mapSeverity(rule.severity || rule.priority),
              status: rule.enabled ? 'enabled' : 'disabled',
              hits: rule.hit_count || 0,
              updated: formatDate(rule.updated_at || rule.last_modified)
            }));
          
          setRules(transformedRules);
          
          // Set stats from API
          if (statsResponse) {
            setStats({
              totalRules: statsResponse.total_rules || transformedRules.length,
              activeRules: statsResponse.active_rules || transformedRules.filter(r => r.status === 'enabled').length,
              recentHits: statsResponse.recent_hits || 0,
              lastUpdate: statsResponse.last_update || '10m ago'
            });
          } else {
            setStats({
              totalRules: transformedRules.length,
              activeRules: transformedRules.filter(r => r.status === 'enabled').length,
              recentHits: 0,
              lastUpdate: 'Just now'
            });
          }
        } else {
          throw new Error('Invalid rules response');
        }
      } catch (error) {
        console.warn('Failed to load detection rules from API, using mock data:', error);

        // Mock Stats
        setStats({
          totalRules: 15420,
          activeRules: 12850,
          recentHits: 452,
          lastUpdate: '10m ago'
        });

        // Mock Rules Data based on active tab
        if (activeTab === 'suricata') {
          setRules([
            { id: 2010983, name: 'ET MALWARE Cobalt Strike Beacon', category: 'Malware', severity: 'Critical', status: 'enabled', hits: 124, updated: '2023-11-15' },
            { id: 2025641, name: 'ET EXPLOIT Apache Log4j RCE', category: 'Exploit', severity: 'Critical', status: 'enabled', hits: 45, updated: '2023-10-01' },
            { id: 2001219, name: 'ET SCAN Nmap Scripting Engine', category: 'Scan', severity: 'Medium', status: 'enabled', hits: 1250, updated: '2023-09-20' },
            { id: 2014752, name: 'ET POLICY Suspicious Inbound to Oracle SQL', category: 'Policy', severity: 'High', status: 'disabled', hits: 0, updated: '2023-08-15' },
            { id: 2031450, name: 'ET PHISHING Successful Generic Phish', category: 'Phishing', severity: 'High', status: 'enabled', hits: 12, updated: '2023-11-20' },
          ]);
        } else if (activeTab === 'yara') {
          setRules([
            { id: 'yara-001', name: 'SUSP_PowerShell_Obfuscated', category: 'Script', severity: 'High', status: 'enabled', hits: 8, updated: '2023-11-10' },
            { id: 'yara-002', name: 'MALW_Ransomware_WannaCry', category: 'Ransomware', severity: 'Critical', status: 'enabled', hits: 0, updated: '2023-05-12' },
            { id: 'yara-003', name: 'WEBSHELL_PHP_Generic', category: 'Webshell', severity: 'Critical', status: 'enabled', hits: 2, updated: '2023-10-05' },
            { id: 'yara-004', name: 'APT_Tool_Mimikatz_Memory', category: 'Credential Theft', severity: 'High', status: 'disabled', hits: 0, updated: '2023-09-01' },
          ]);
        } else {
          setRules([
            { id: 'sigma-001', name: 'Suspicious Process Creation via WMI', category: 'Execution', severity: 'High', status: 'enabled', hits: 15, updated: '2023-11-18' },
            { id: 'sigma-002', name: 'Clear Windows Event Logs', category: 'Defense Evasion', severity: 'Medium', status: 'enabled', hits: 3, updated: '2023-10-22' },
          ]);
        }

      } finally {
        setLoading(false);
      }
    };

    loadRules();
  }, [activeTab]);

  const saveRules = async () => {
    setSaving(true);
    try {
      await api.updateSuricataRules(ruleContent);
      // Optional: Show success toast
    } catch (error) {
      console.error('Failed to save rules:', error);
      // Optional: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = (id) => {
    setRules(rules.map(rule => 
      rule.id === id 
        ? { ...rule, status: rule.status === 'enabled' ? 'disabled' : 'enabled' } 
        : rule
    ));
  };

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.id.toString().includes(searchTerm)
  );

  return (
    <div className="advanced-detection">
      {/* Header Stats */}
      <div className="detection-stats-row">
        <div className="detection-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalRules.toLocaleString()}</div>
            <div className="stat-label">Total Rules</div>
          </div>
        </div>
        <div className="detection-stat-card">
          <div className="stat-icon bg-green-500/10 text-green-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.activeRules.toLocaleString()}</div>
            <div className="stat-label">Active Rules</div>
          </div>
        </div>
        <div className="detection-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <Activity className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.recentHits}</div>
            <div className="stat-label">Hits (24h)</div>
          </div>
        </div>
        <div className="detection-stat-card">
          <div className="stat-icon bg-purple-500/10 text-purple-400">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.lastUpdate}</div>
            <div className="stat-label">Last Update</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="detection-content">
        {/* Sidebar Navigation */}
        <div className="detection-sidebar">
          <button 
            className={`sidebar-item ${activeTab === 'suricata' ? 'active' : ''}`}
            onClick={() => setActiveTab('suricata')}
          >
            <Eye className="w-4 h-4" />
            <span>Suricata IDS</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'yara' ? 'active' : ''}`}
            onClick={() => setActiveTab('yara')}
          >
            <FileText className="w-4 h-4" />
            <span>YARA Rules</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'sigma' ? 'active' : ''}`}
            onClick={() => setActiveTab('sigma')}
          >
            <Shield className="w-4 h-4" />
            <span>Sigma Rules</span>
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <Edit className="w-4 h-4" />
            <span>Rule Editor</span>
          </button>
        </div>

        {/* Content Panel */}
        <div className="rules-panel">
          {activeTab === 'editor' ? (
            <div className="rule-editor-container">
              <div className="panel-controls">
                <h3>Suricata Rules File (suricata.rules)</h3>
                <div className="control-actions">
                  <button className="btn-primary" onClick={saveRules} disabled={saving}>
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Rules'}
                  </button>
                </div>
              </div>
              <textarea
                className="rule-editor-textarea"
                value={ruleContent}
                onChange={(e) => setRuleContent(e.target.value)}
                spellCheck="false"
              />
            </div>
          ) : (
            <>
              <div className="panel-controls">
                <div className="search-input">
                  <Search className="w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search rules by name, ID, or category..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="control-actions">
                  <button className="btn-secondary">
                    <Filter className="w-4 h-4" /> Filter
                  </button>
                  <button className="btn-primary">
                    <Plus className="w-4 h-4" /> Add Rule
                  </button>
                </div>
              </div>

              <div className="rules-table-container">
                {loading ? (
                  <div className="loading-state">Loading rules...</div>
                ) : (
                  <table className="rules-table">
                    <thead>
                      <tr>
                        <th style={{width: '60px'}}>Status</th>
                        <th>ID</th>
                        <th>Rule Name</th>
                        <th>Category</th>
                        <th>Severity</th>
                        <th>Hits</th>
                        <th>Updated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRules.map(rule => (
                        <tr key={rule.id} className={rule.status === 'disabled' ? 'disabled-row' : ''}>
                          <td>
                            <button 
                              className={`toggle-btn ${rule.status}`}
                              onClick={() => toggleRule(rule.id)}
                            >
                              {rule.status === 'enabled' ? 
                                <ToggleRight className="w-6 h-6 text-green-400" /> : 
                                <ToggleLeft className="w-6 h-6 text-gray-500" />
                              }
                            </button>
                          </td>
                          <td className="mono text-gray-400">{rule.id}</td>
                          <td className="rule-name">{rule.name}</td>
                          <td><span className="category-badge">{rule.category}</span></td>
                          <td>
                            <span className={`severity-badge ${rule.severity.toLowerCase()}`}>
                              {rule.severity}
                            </span>
                          </td>
                          <td className="mono">{rule.hits.toLocaleString()}</td>
                          <td className="text-gray-500">{rule.updated}</td>
                          <td>
                            <button className="btn-xs">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
