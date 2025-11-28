/**
 * Alert Investigation Modal
 * Shows detailed alert information with correlated events
 */
import { useState, useEffect } from 'react';
import { X, Shield, Clock, TrendingUp, Link, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import './AlertModal.css';

export default function AlertModal({ alertId, onClose }) {
  const [alert, setAlert] = useState(null);
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        setLoading(true);
        // Try to fetch from API first
        const [alertData, chainData] = await Promise.all([
          api.getAlertById(alertId),
          api.getCorrelatedAlerts(alertId).catch(() => ({ chain: [] }))
        ]);
        
        setAlert(alertData);
        setChain(chainData.chain || []);
      } catch (error) {
        console.warn('Failed to load alert from API, using mock data:', error);
        // Fallback to mock data for demo purposes
        setAlert({
          id: alertId,
          title: 'Suspicious PowerShell Activity',
          rule_name: 'Suspicious PowerShell Activity',
          severity: 'critical',
          timestamp: new Date().toISOString(),
          src_ip: '192.168.1.105',
          dst_ip: '10.0.0.5',
          dst_port: 445,
          protocol: 'TCP',
          description: 'Detected execution of encoded PowerShell command associated with known malware loaders. The command attempts to download a payload from an external IP.',
          mitre_tactic: 'Execution',
          mitre_technique: 'Command and Scripting Interpreter',
          risk_score: 90,
          status: 'open',
          notes: [
            { author: 'System', content: 'Automatically flagged by detection engine', timestamp: new Date().toISOString() }
          ],
          raw_event: {
            event_type: 'process_creation',
            command_line: 'powershell.exe -enc JABzACAAPQAgAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABJAE8ALgBNAGUAbQBvAHIAeQBTAHQAcgBlAGEAbQAoAFsAQwBvAG4AdgBlAHIAdABdADoAOgBGAHIAbwBtAEIAYQBzAGUANgA0AFMAdAByAGkAbgBnACgAIgBIADQAcwBJAEAA',
            user: 'NT AUTHORITY\\SYSTEM',
            parent_process: 'cmd.exe'
          }
        });
        setChain([
          { title: 'Port Scan Detected', severity: 'low', timestamp: new Date(Date.now() - 3600000).toISOString(), src_ip: '192.168.1.105', dst_ip: '10.0.0.5', protocol: 'TCP' },
          { title: 'SMB Brute Force', severity: 'medium', timestamp: new Date(Date.now() - 1800000).toISOString(), src_ip: '192.168.1.105', dst_ip: '10.0.0.5', protocol: 'SMB' },
          { title: 'Suspicious PowerShell Activity', severity: 'critical', timestamp: new Date().toISOString(), src_ip: '192.168.1.105', dst_ip: '10.0.0.5', protocol: 'TCP' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (alertId) {
      fetchAlertData();
    }
  }, [alertId]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateAlertStatus(alertId, newStatus);
      setAlert({ ...alert, status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddNote = async () => {
    if (!notes.trim()) return;
    
    try {
      await api.addAlertNote(alertId, notes);
      setNotes('');
      // Refresh alert data
      const updated = await api.getAlertById(alertId);
      setAlert(updated);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="alert-modal loading">
          <div className="loading-spinner">Loading investigation...</div>
        </div>
      </div>
    );
  }

  if (!alert) {
    return null;
  }

  const severityColor = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#6b7280',
    info: '#94a3b8'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="alert-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <AlertTriangle 
              className="alert-icon" 
              style={{ color: severityColor[alert.severity] }}
            />
            <div>
              <h2>{alert.title || alert.rule_name}</h2>
              <div className="alert-meta">
                <span className={`severity-badge ${alert.severity}`}>
                  {alert.severity?.toUpperCase()}
                </span>
                <span className="alert-id">ID: {alert.id}</span>
                <span className="alert-time">
                  <Clock className="w-4 h-4" />
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <FileText className="w-4 h-4" />
            Details
          </button>
          <button 
            className={`tab ${activeTab === 'chain' ? 'active' : ''}`}
            onClick={() => setActiveTab('chain')}
          >
            <Link className="w-4 h-4" />
            Attack Chain ({chain.length})
          </button>
          <button 
            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <FileText className="w-4 h-4" />
            Notes ({alert.notes?.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {activeTab === 'details' && (
            <div className="details-view">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Source IP</label>
                  <span className="mono">{alert.src_ip || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Destination IP</label>
                  <span className="mono">{alert.dst_ip || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Protocol</label>
                  <span>{alert.protocol || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Port</label>
                  <span>{alert.dst_port || 'N/A'}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Description</label>
                  <p>{alert.description || 'No description available'}</p>
                </div>
                {alert.mitre_tactic && (
                  <div className="detail-item">
                    <label>MITRE Tactic</label>
                    <span className="mitre-badge">{alert.mitre_tactic}</span>
                  </div>
                )}
                {alert.mitre_technique && (
                  <div className="detail-item">
                    <label>MITRE Technique</label>
                    <span className="mitre-badge">{alert.mitre_technique}</span>
                  </div>
                )}
                <div className="detail-item">
                  <label>Risk Score</label>
                  <span className="risk-score">{alert.risk_score || 0}/100</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <select 
                    value={alert.status || 'open'} 
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="status-select"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                  </select>
                </div>
              </div>

              {alert.raw_event && (
                <div className="raw-event">
                  <label>Raw Event Data</label>
                  <pre>{JSON.stringify(alert.raw_event, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chain' && (
            <div className="chain-view">
              {chain.length === 0 ? (
                <div className="empty-state">
                  <Shield className="w-12 h-12" />
                  <p>No correlated alerts found</p>
                </div>
              ) : (
                <div className="timeline">
                  {chain.map((item, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className={`severity-badge ${item.severity}`}>
                            {item.severity}
                          </span>
                          <span className="timeline-time">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <h4>{item.title || item.rule_name}</h4>
                        <p className="timeline-meta">
                          {item.src_ip} → {item.dst_ip} ({item.protocol})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-view">
              <div className="add-note">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add investigation notes..."
                  rows={4}
                />
                <button onClick={handleAddNote} className="btn-primary">
                  Add Note
                </button>
              </div>

              <div className="notes-list">
                {alert.notes?.length > 0 ? (
                  alert.notes.map((note, idx) => (
                    <div key={idx} className="note-item">
                      <div className="note-header">
                        <span className="note-author">{note.author}</span>
                        <span className="note-time">
                          {new Date(note.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="note-content">{note.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <FileText className="w-12 h-12" />
                    <p>No notes yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-danger">
            <AlertTriangle className="w-4 h-4" />
            Escalate
          </button>
          <button className="btn-success">
            <CheckCircle className="w-4 h-4" />
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
