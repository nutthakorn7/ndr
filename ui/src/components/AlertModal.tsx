/**
 * Alert Investigation Modal
 * Shows detailed alert information with correlated events
 */
import { useState, useEffect } from 'react';
import { X, Shield, Clock, Link, FileText, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import DOMPurify from 'dompurify';
import api from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import AttackChainGraph from './AttackChainGraph';
import FileAnalysis from './FileAnalysis';
import SSLAnalysis from './SSLAnalysis';
import DNSIntelligence from './DNSIntelligence';
import './AlertModal.css';

interface AlertModalProps {
  alertId: string;
  onClose: () => void;
}

interface Alert {
  id: string;
  title: string;
  rule_name?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  timestamp: string;
  src_ip?: string;
  dst_ip?: string;
  dst_port?: number;
  protocol?: string;
  description?: string;
  mitre_tactic?: string;
  mitre_technique?: string;
  risk_score?: number;
  status: string;
  notes?: Note[];
  raw_event?: Record<string, unknown>;
}

interface Note {
  author: string;
  content: string;
  timestamp: string;
}

interface AttackChainEvent {
  title: string;
  rule_name?: string;
  severity: string;
  timestamp: string;
  src_ip?: string;
  dst_ip?: string;
  protocol?: string;
}

interface AiAnalysis {
  severity_assessment: string;
  confidence: number;
  analysis: string;
  recommended_actions: string[];
}

export default function AlertModal({ alertId, onClose }: AlertModalProps) {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [chain, setChain] = useState<AttackChainEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [newNote, setNewNote] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [activeAnalysis, setActiveAnalysis] = useState<'file' | 'ssl' | 'dns' | null>(null);

  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        setLoading(true);
        // Try to fetch from API first
        const [alertData, chainData] = await Promise.all([
          api.getAlertById(alertId),
          api.getCorrelatedAlerts(alertId).catch(() => ({ alerts: [] }))
        ]);
        
        setAlert(alertData);
        setChain(chainData?.alerts || []);
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateAlertStatus(alertId, newStatus);
      if (alert) {
        setAlert({ ...alert, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      await api.addAlertNote(alertId, newNote);
      setNewNote('');
      // Refresh alert data
      const updated = await api.getAlertById(alertId);
      setAlert(updated);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleAiTriage = async () => {
    if (!alert) return;
    setAiLoading(true);
    try {
      // Cast the result to unknown first then to AiAnalysis to handle potential mismatch
      const result = await api.triageAlert(alertId, alert as unknown as Record<string, unknown>);
      setAiAnalysis(result as unknown as AiAnalysis);
    } catch (error) {
      console.error('AI Triage failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!alert) return;
    setReportLoading(true);
    try {
      const report = await api.generateReport(alertId, alert as unknown as Record<string, unknown>);
      // Create a blob and download it
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-report-${alertId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadPcap = async () => {
    try {
      // In a real implementation, we would request a PCAP extract for the alert timeframe
      // For now, we attempt to download a file associated with this alert
      const filename = `alert-${alertId}.pcap`;
      const url = await api.downloadPcap(filename);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to download PCAP:', error);
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

  const severityColor: Record<string, string> = {
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
            className={`tab-btn ${activeTab === 'chain' ? 'active' : ''}`}
            onClick={() => setActiveTab('chain')}
          >
            <Link className="w-4 h-4" /> Attack Chain
          </button>
          <button 
            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <div className="flex items-center gap-2">
              <span>🤖</span> AI Analysis
            </div>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <FileText className="w-4 h-4" /> Notes ({alert.notes?.length || 0})
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

          {activeTab === 'details' && (
            <div className="deep-analysis-section mt-6 pt-6 border-t border-[var(--border-subtle)]">
              <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Deep Analysis</h4>
              <div className="flex gap-3">
                <button 
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => setActiveAnalysis('file')}
                >
                  <FileText className="w-4 h-4" /> File Analysis
                </button>
                <button 
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => setActiveAnalysis('dns')}
                >
                  <Globe className="w-4 h-4" /> DNS Intelligence
                </button>
                <button 
                  className="btn-secondary flex items-center gap-2"
                  onClick={() => setActiveAnalysis('ssl')}
                >
                  <Shield className="w-4 h-4" /> SSL/TLS Inspection
                </button>
              </div>
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
                <div className="chain-graph-container">
                  <AttackChainGraph chain={chain} />
                  
                  <div className="timeline mt-6">
                    <h3>Event Timeline</h3>
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
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="notes-view">
              <div className="add-note">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add investigation notes..."
                  rows={4}
                />
                <button onClick={handleAddNote} className="btn-primary">
                  Add Note
                </button>
              </div>

              <div className="notes-list">
                {alert.notes && alert.notes.length > 0 ? (
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

          {activeTab === 'ai' && (
            <div className="ai-analysis-view">
              <div className="ai-header">
                <div className="ai-avatar">
                  <div className="avatar-circle">AI</div>
                </div>
                <div className="ai-intro">
                  <h4>AI Security Analyst</h4>
                  <p>Automated triage and threat assessment</p>
                </div>
                <button 
                  className="btn-primary btn-sm ml-auto"
                  onClick={() => handleAiTriage()}
                  disabled={aiLoading}
                >
                  {aiLoading ? <LoadingSpinner size="small" /> : 'Run Analysis'}
                </button>
              </div>

              {aiAnalysis ? (
                <div className="ai-result fade-in">
                  <div className={`ai-verdict ${aiAnalysis.severity_assessment?.toLowerCase()}`}>
                    <span className="verdict-label">Assessment:</span>
                    <span className="verdict-value">{aiAnalysis.severity_assessment}</span>
                    <span className="confidence-score">
                      Confidence: {(aiAnalysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="ai-content">
                    <h5>Analysis</h5>
                    <p dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(
                        aiAnalysis.analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      ) 
                    }} />
                    
                    {aiAnalysis.recommended_actions && (
                      <div className="ai-actions">
                        <h5>Recommended Actions</h5>
                        <ul>
                          {aiAnalysis.recommended_actions.map((action: string, i: number) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ai-placeholder">
                  <div className="placeholder-icon">🤖</div>
                  <p>Click "Run Analysis" to have the AI agent triage this alert.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-secondary" onClick={handleDownloadPcap}>
            <Download className="w-4 h-4" />
            Download PCAP
          </button>
          <button className="btn-secondary" onClick={handleGenerateReport} disabled={reportLoading}>
            {reportLoading ? <LoadingSpinner size="small" /> : <FileText className="w-4 h-4" />}
            Generate Report
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


      {/* Stacked Modals for Deep Analysis */}
      {activeAnalysis && (
        <div className="modal-overlay stacked" style={{ zIndex: 1100 }}>
          <div className="alert-modal wide" style={{ width: '90%', height: '90%', maxWidth: '1200px' }}>
            <div className="modal-header">
              <div className="modal-title-section">
                {activeAnalysis === 'file' && <h2>File Analysis</h2>}
                {activeAnalysis === 'dns' && <h2>DNS Intelligence</h2>}
                {activeAnalysis === 'ssl' && <h2>SSL/TLS Inspection</h2>}
              </div>
              <button className="close-btn" onClick={() => setActiveAnalysis(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-content no-padding" style={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
              {activeAnalysis === 'file' && <FileAnalysis onClose={() => setActiveAnalysis(null)} />}
              {activeAnalysis === 'dns' && <DNSIntelligence />}
              {activeAnalysis === 'ssl' && <SSLAnalysis />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
