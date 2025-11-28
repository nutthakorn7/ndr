/**
 * SOAR & SIEM Integration Component
 * Manages automation playbooks and external SIEM connections
 */
import { useState, useEffect } from 'react';
import { 
  Zap, Database, Play, Pause, Settings, Activity, 
  CheckCircle, XCircle, Clock, ArrowRight, Shield,
  RefreshCw, Link, Terminal
} from 'lucide-react';
import './SoarIntegration.css';

export default function SoarIntegration({ view = 'playbooks' }) {
  const [activeView, setActiveView] = useState(view);
  const [playbooks, setPlaybooks] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveView(view);
  }, [view]);

  useEffect(() => {
    // Simulate fetching SOAR/SIEM data
    const loadData = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 800));
        
        // Mock Playbooks
        setPlaybooks([
          { id: 1, name: 'Block Malicious IP (Firewall)', trigger: 'Critical Alert', status: 'active', runs: 145, successRate: 98, lastRun: '10m ago' },
          { id: 2, name: 'Isolate Host (EDR)', trigger: 'Ransomware Detection', status: 'active', runs: 12, successRate: 100, lastRun: '2h ago' },
          { id: 3, name: 'Enrich IOCs (VirusTotal)', trigger: 'New Artifact', status: 'active', runs: 1250, successRate: 99, lastRun: '1m ago' },
          { id: 4, name: 'Reset User Password (AD)', trigger: 'Brute Force Success', status: 'manual', runs: 5, successRate: 100, lastRun: '1d ago' },
          { id: 5, name: 'Send Slack Notification', trigger: 'High Severity', status: 'active', runs: 450, successRate: 100, lastRun: '5m ago' },
        ]);

        // Mock Connectors (SIEM)
        setConnectors([
          { id: 1, name: 'Splunk Enterprise', type: 'SIEM', status: 'connected', latency: '45ms', events: '1.2M/hr' },
          { id: 2, name: 'Elasticsearch (ELK)', type: 'SIEM', status: 'connected', latency: '12ms', events: '850k/hr' },
          { id: 3, name: 'ServiceNow', type: 'ITSM', status: 'error', latency: '-', events: '0/hr' },
          { id: 4, name: 'Palo Alto Firewall', type: 'Firewall', status: 'connected', latency: '22ms', events: 'Action Only' },
          { id: 5, name: 'Slack Webhook', type: 'Notification', status: 'connected', latency: '150ms', events: 'Alerts Only' },
        ]);

        // Mock Execution History
        setHistory([
          { id: 101, playbook: 'Block Malicious IP', target: '185.22.1.4', status: 'success', time: '10m ago', duration: '2s' },
          { id: 102, playbook: 'Enrich IOCs', target: 'hash: 44d8...2f', status: 'success', time: '12m ago', duration: '1.5s' },
          { id: 103, playbook: 'Send Slack Notification', target: '#security-ops', status: 'success', time: '15m ago', duration: '0.5s' },
          { id: 104, playbook: 'Isolate Host', target: 'WORKSTATION-04', status: 'failed', time: '2h ago', duration: '5s' },
        ]);

      } catch (error) {
        console.error('Failed to load SOAR data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="loading-state">Loading automation modules...</div>;

  return (
    <div className="soar-integration">
      {/* Header Tabs */}
      <div className="soar-header">
        <div className="view-selector">
          <button 
            className={`view-btn ${activeView === 'playbooks' ? 'active' : ''}`}
            onClick={() => setActiveView('playbooks')}
          >
            <Zap className="w-4 h-4" />
            <span>Playbooks & Automation</span>
          </button>
          <button 
            className={`view-btn ${activeView === 'connectors' ? 'active' : ''}`}
            onClick={() => setActiveView('connectors')}
          >
            <Database className="w-4 h-4" />
            <span>SIEM & Connectors</span>
          </button>
        </div>
        <div className="soar-actions">
          <button className="btn-primary">
            {activeView === 'playbooks' ? <><Play className="w-4 h-4" /> New Playbook</> : <><Link className="w-4 h-4" /> New Connector</>}
          </button>
        </div>
      </div>

      <div className="soar-content">
        {activeView === 'playbooks' ? (
          <div className="playbooks-view">
            <div className="soar-grid">
              {/* Playbooks List */}
              <div className="soar-panel flex-2">
                <div className="panel-header">
                  <h3><Zap className="w-4 h-4 text-yellow-400" /> Active Playbooks</h3>
                </div>
                <table className="soar-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Playbook Name</th>
                      <th>Trigger</th>
                      <th>Success Rate</th>
                      <th>Last Run</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playbooks.map(pb => (
                      <tr key={pb.id}>
                        <td>
                          <div className={`status-pill ${pb.status}`}>
                            {pb.status}
                          </div>
                        </td>
                        <td className="font-medium text-white">{pb.name}</td>
                        <td className="text-gray-400">{pb.trigger}</td>
                        <td>
                          <div className="progress-bar-sm">
                            <div className="progress-fill" style={{width: `${pb.successRate}%`, background: pb.successRate > 90 ? '#10b981' : '#f59e0b'}}></div>
                          </div>
                          <span className="text-xs text-gray-400">{pb.successRate}%</span>
                        </td>
                        <td className="text-gray-500">{pb.lastRun}</td>
                        <td>
                          <button className="btn-icon"><Settings className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Execution History */}
              <div className="soar-panel flex-1">
                <div className="panel-header">
                  <h3><Activity className="w-4 h-4 text-blue-400" /> Recent Executions</h3>
                </div>
                <div className="history-list">
                  {history.map(item => (
                    <div key={item.id} className="history-item">
                      <div className="history-status">
                        {item.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="history-info">
                        <div className="history-name">{item.playbook}</div>
                        <div className="history-target">{item.target}</div>
                      </div>
                      <div className="history-meta">
                        <div>{item.time}</div>
                        <div className="history-dur">{item.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="connectors-view">
            <div className="connectors-grid">
              {connectors.map(conn => (
                <div key={conn.id} className="connector-card">
                  <div className="connector-header">
                    <div className="connector-icon">
                      {conn.type === 'SIEM' ? <Database className="w-6 h-6" /> : 
                       conn.type === 'Firewall' ? <Shield className="w-6 h-6" /> : 
                       <Terminal className="w-6 h-6" />}
                    </div>
                    <div className={`connector-status ${conn.status}`}></div>
                  </div>
                  <div className="connector-body">
                    <h4>{conn.name}</h4>
                    <div className="connector-type">{conn.type}</div>
                    <div className="connector-stats">
                      <div className="stat-row">
                        <span>Latency</span>
                        <span className="mono">{conn.latency}</span>
                      </div>
                      <div className="stat-row">
                        <span>Throughput</span>
                        <span className="mono">{conn.events}</span>
                      </div>
                    </div>
                  </div>
                  <div className="connector-footer">
                    <button className="btn-secondary full-width">Configure</button>
                  </div>
                </div>
              ))}
              
              {/* Add New Card */}
              <div className="connector-card add-new">
                <div className="add-content">
                  <div className="add-icon"><Link className="w-8 h-8" /></div>
                  <span>Add Integration</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
