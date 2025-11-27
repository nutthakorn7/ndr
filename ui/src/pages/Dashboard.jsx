import { useState, useEffect } from 'react';
import { 
  Search, Bell, Shield, Network, Database, Lock, 
  Globe, Activity, FileText, Zap, Users, Settings,
  AlertTriangle, TrendingUp, Server, Eye, Target
} from 'lucide-react';
import './Dashboard.css';
import AlertModal from '../components/AlertModal';
import EventSearch from '../components/EventSearch';
import RealTimeFeed from '../components/RealTimeFeed';
import api from '../utils/api';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalAlerts: 581,
    criticalAlerts: 12,
    totalEvents: 2347289,
    activeAssets: 342,
    sensors: 12,
    mitigatedThreats: 67
  });
  
  // Alert Modal State
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  // Tab configuration with all features
  const tabs = [
    { id: 'overview', name: 'Security Posture', icon: Shield },
    { id: 'network', name: 'Network Analytics', icon: Network },
    { id: 'threats', name: 'Threat Intelligence', icon: Target },
    { id: 'detection', name: 'Advanced Detection', icon: Eye },
    { id: 'ssl', name: 'SSL/TLS Analysis', icon: Lock },
    { id: 'files', name: 'File Analysis (YARA)', icon: FileText },
    { id: 'dns', name: 'DNS Intelligence', icon: Globe },
    { id: 'assets', name: 'Asset Discovery', icon: Server },
    { id: 'soar', name: 'SOAR Automation', icon: Zap },
    { id: 'siem', name: 'SIEM Integration', icon: Database }
  ];

  return (
    <div className="ndr-dashboard">
      {/* Top Navigation */}
      <div className="ndr-nav">
        <div className="nav-left">
          <div className="logo">
            <Shield className="w-6 h-6" style={{color: '#4bc0c0'}} />
            <span className="logo-text">Open NDR</span>
            <span className="logo-subtitle">Network Detection & Response</span>
          </div>
        </div>
        <div className="nav-center">
          <div className="search-bar">
            <Search className="w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search events, alerts, IOCs..." 
              onClick={() => setShowSearch(true)}
            />
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-stat critical">
            <AlertTriangle className="w-4 h-4" />
            <span>{stats.criticalAlerts} Critical</span>
          </div>
          <div className="nav-stat">
            <Activity className="w-4 h-4" />
            <span>2.4k EPS</span>
          </div>
          <div className="nav-icon">
            <Bell className="w-5 h-5" />
          </div>
          <div className="nav-icon">
            <Settings className="w-5 h-5" />
          </div>
          <div className="user-avatar">AD</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="ndr-tabs">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setShowSearch(false);
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="ndr-content">
        {showSearch ? (
          <div className="view-container">
            <div className="flex justify-between items-center mb-6">
              <h2>Event Search & Hunting</h2>
              <button className="btn-secondary" onClick={() => setShowSearch(false)}>
                Close Search
              </button>
            </div>
            <EventSearch />
          </div>
        ) : (
          <div className="view-container">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="info-banner success">
                  <Shield className="w-4 h-4" />
                  System Status: All sensors online. Detection engine active. Last update: Just now
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid">
                  <div className="kpi-card danger">
                    <div className="kpi-icon">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-value">{stats.totalAlerts}</div>
                      <div className="kpi-label">Total Alerts (24h)</div>
                      <div className="kpi-trend up">↑ 12% vs yesterday</div>
                    </div>
                  </div>
                  <div className="kpi-card primary">
                    <div className="kpi-icon">
                      <Activity className="w-8 h-8" />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-value">2.3M</div>
                      <div className="kpi-label">Total Events</div>
                      <div className="kpi-trend neutral">~ Stable</div>
                    </div>
                  </div>
                  <div className="kpi-card info">
                    <div className="kpi-icon">
                      <Server className="w-8 h-8" />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-value">{stats.activeAssets}</div>
                      <div className="kpi-label">Active Assets</div>
                      <div className="kpi-trend up">↑ 4 new devices</div>
                    </div>
                  </div>
                  <div className="kpi-card success">
                    <div className="kpi-icon">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div className="kpi-content">
                      <div className="kpi-value">100%</div>
                      <div className="kpi-label">MITRE Coverage</div>
                      <div className="kpi-trend neutral">All techniques active</div>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Grid */}
                <div className="panel-grid">
                  {/* Recent Alerts */}
                  <div className="panel">
                    <h3><AlertTriangle className="w-5 h-5 text-red-400" /> Recent Critical Alerts</h3>
                    <div className="alert-list">
                      {[
                        { id: 'alert-1', title: 'Suspicious PowerShell Activity', severity: 'critical', ip: '192.168.1.105', time: '2m ago' },
                        { id: 'alert-2', title: 'Potential C2 Communication', severity: 'high', ip: '192.168.1.112', time: '15m ago' },
                        { id: 'alert-3', title: 'SMB Brute Force Attempt', severity: 'high', ip: '192.168.1.200', time: '45m ago' },
                        { id: 'alert-4', title: 'DNS Tunneling Detected', severity: 'medium', ip: '192.168.1.15', time: '1h ago' },
                      ].map((alert, idx) => (
                        <div key={idx} className="alert-item">
                          <div className={`alert-indicator ${alert.severity}`}></div>
                          <div className="alert-content">
                            <div className="alert-title">{alert.title}</div>
                            <div className="alert-meta">
                              <span className="alert-ip">{alert.ip}</span>
                              <span>•</span>
                              <span>{alert.time}</span>
                            </div>
                          </div>
                          <button 
                            className="btn-investigate"
                            onClick={() => setSelectedAlertId(alert.id)}
                          >
                            Investigate
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Real-Time Feed & MITRE */}
                  <div className="flex flex-col gap-6">
                    <RealTimeFeed />
                    
                    <div className="panel">
                      <h3><Target className="w-5 h-5 text-purple-400" /> MITRE ATT&CK Coverage</h3>
                      <div className="mitre-mini">
                        {[
                          { name: 'Initial Access', count: 12, color: '#ef4444' },
                          { name: 'Execution', count: 45, color: '#f59e0b' },
                          { name: 'Persistence', count: 8, color: '#3b82f6' },
                          { name: 'Privilege Escalation', count: 5, color: '#10b981' },
                          { name: 'Command and Control', count: 23, color: '#8b5cf6' },
                        ].map((tactic, idx) => (
                          <div key={idx} className="mitre-item">
                            <div className="mitre-label">{tactic.name}</div>
                            <div className="mitre-bar" style={{width: `${tactic.count * 2}px`, background: tactic.color}}></div>
                            <div className="mitre-count">{tactic.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Other Tabs (Placeholders for now) */}
            {activeTab !== 'overview' && (
              <div className="panel">
                <h3>{tabs.find(t => t.id === activeTab)?.name}</h3>
                <p className="text-gray-400 mt-4">
                  This module is connected to the backend services. 
                  Data visualization for {activeTab} will be rendered here.
                </p>
                <div className="mt-8 p-8 border border-dashed border-gray-700 rounded-lg text-center">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p>Waiting for live data stream...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="ndr-statusbar">
        <div className="status-left">
          <div className="status-item">
            <div className="status-dot online"></div>
            <span>System Online</span>
          </div>
          <div className="status-item">
            <Database className="w-3 h-3" />
            <span>OpenSearch: Connected</span>
          </div>
          <div className="status-item">
            <Activity className="w-3 h-3" />
            <span>Zeek: Active</span>
          </div>
        </div>
        <div className="status-right">
            ].map((proto, i) => (
              <div key={i} className="protocol-card">
                <div className="protocol-header">
                  <span className="protocol-name">{proto.name}</span>
                  <span className="protocol-badge">{proto.ja3}</span>
                </div>
                <div className="protocol-stats">
                  <div>{proto.count.toLocaleString()} connections</div>
                  <div>{proto.bytes} transferred</div>
                </div>
                <div className="protocol-bar" style={{backgroundColor: proto.color}}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Threat Intelligence View
function ThreatIntelligenceView() {
  return (
    <div className="view-container">
      <h2>Threat Intelligence - AlienVault OTX Integration</h2>
      <div className="info-banner success">
        <Target className="w-5 h-5" />
        <span>Connected to AlienVault OTX - 15M+ IOCs, 9K+ pulse subscriptions</span>
      </div>
      
      <div className="panel-grid">
        <div className="panel">
          <h3>Recent IOC Matches</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>IOC</th>
                <th>Type</th>
                <th>Threat</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ioc: '203.0.113.50', type: 'IPv4', threat: 'C2 Server', confidence: '95%' },
                { ioc: 'malicious.example.com', type: 'Domain', threat: 'Phishing', confidence: '88%' },
                { ioc: 'a3f4b2c1d5e6...', type: 'File Hash', threat: 'Malware', confidence: '97%' }
              ].map((item, i) => (
                <tr key={i}>
                  <td className="mono">{item.ioc}</td>
                  <td>{item.type}</td>
                  <td><span className="threat-tag">{item.threat}</span></td>
                  <td><span className="confidence-tag">{item.confidence}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Advanced Detection View
function AdvancedDetectionView() {
  return (
    <div className="view-container">
      <h2>Advanced Detection Capabilities</h2>
      <div className="detection-grid">
        {[
          { name: 'DNS-over-HTTPS', status: 'Active', detections: 45, icon: Globe },
          { name: 'Tor/VPN Detection', status: 'Active', detections: 23, icon: Shield },
          { name: 'SSL Cert Validation', status: 'Active', detections: 12, icon: Lock },
          { name: 'SSH Forwarding', status: 'Active', detections: 8, icon: Network },
          { name: 'OT/ICS Monitoring', status: 'Active', detections: 156, icon: Server },
          { name: 'YARA File Scan', status: 'Active', detections: 34, icon: FileText }
        ].map((det, i) => (
          <div key={i} className="detection-card">
            <det.icon className="detection-icon" />
            <div className="detection-name">{det.name}</div>
            <div className="detection-status">{det.status}</div>
            <div className="detection-count">{det.detections} detections today</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Other view components (simplified for brevity)
function SSLAnalysisView() {
  return <div className="view-container"><h2>SSL/TLS Certificate Analysis</h2><p>Certificate validation, expiration monitoring, weak crypto detection</p></div>;
}

function FileAnalysisView() {
  return <div className="view-container"><h2>YARA File Analysis</h2><p>Malware detection with 6 YARA rule categories</p></div>;
}

function DNSIntelligenceView() {
  return <div className="view-container"><h2>DNS Intelligence</h2><p>Domain analysis, DGA detection, tunneling identification</p></div>;
}

function AssetDiscoveryView() {
  return <div className="view-container"><h2>Asset Discovery & Inventory</h2><p>342 active assets discovered via passive network monitoring</p></div>;
}

function SOARAutomationView() {
  return <div className="view-container"><h2>SOAR Automation</h2><p>Automated playbooks for incident response, 67 threats mitigated automatically</p></div>;
}

function SIEMIntegrationView() {
  return <div className="view-container"><h2>SIEM Integration</h2><p>Splunk HEC, Elastic ECS, Syslog, Webhooks - 187.3GB exported today</p></div>;
}

export default Dashboard;
