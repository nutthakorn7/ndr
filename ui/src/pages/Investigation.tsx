import { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, ChevronDown, ChevronRight, X, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../utils/api';
import { ThreatEvent } from '../schemas';
import BulkActionBar from '../components/BulkActionBar';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: string;
  user?: string;
  details: string;
  raw?: any;
}

export default function Investigation() {
  // State
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState(new Set<string>());
  const [showFilters, setShowFilters] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    timeRange: '24h',
    severity: 'all',
    eventType: 'all',
    protocol: 'all',
    srcIp: '',
    dstIp: '',
  });

  // Fetch logs from API
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams: Record<string, any> = {
        limit: 1000,
        time_range: filters.timeRange
      };

      // Add query string if present
      if (query.trim()) queryParams.q = query;

      // Add filters
      if (filters.severity !== 'all') queryParams.severity = filters.severity;
      if (filters.eventType !== 'all') queryParams.type = filters.eventType;
      if (filters.protocol !== 'all') queryParams.protocol = filters.protocol;
      if (filters.srcIp) queryParams.source = filters.srcIp;
      if (filters.dstIp) queryParams.destination = filters.dstIp;

      const response = await api.searchEvents(queryParams);
      
      // Map API response to UI format
      const mappedLogs = response.events.map((event: ThreatEvent) => ({
        id: event.id.toString(),
        timestamp: event.timestamp,
        type: event.type,
        severity: event.severity.toLowerCase(),
        src_ip: event.source,
        dst_ip: event.destination.split(':')[0] || event.destination,
        dst_port: parseInt(event.destination.split(':')[1] || '0'),
        protocol: event.protocol || 'TCP',
        user: 'system',
        details: event.description,
        raw: event
      }));

      setLogs(mappedLogs);
      setFilteredLogs(mappedLogs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // Client-side filtering for quick UX
  useEffect(() => {
    let filtered = [...logs];

    if (filters.severity !== 'all') {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }
    if (filters.eventType !== 'all') {
      filtered = filtered.filter(log => log.type === filters.eventType);
    }
    if (filters.protocol !== 'all') {
      filtered = filtered.filter(log => log.protocol === filters.protocol);
    }
    if (filters.srcIp) {
      filtered = filtered.filter(log => log.src_ip.includes(filters.srcIp));
    }
    if (filters.dstIp) {
      filtered = filtered.filter(log => log.dst_ip.includes(filters.dstIp));
    }

    setFilteredLogs(filtered);
  }, [logs, filters]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      timeRange: '24h',
      severity: 'all',
      eventType: 'all',
      protocol: 'all',
      srcIp: '',
      dstIp: '',
    });
    setQuery('');
  };

  const handleExport = (format: 'json' | 'csv') => {
    const dataToExport = selectedLogs.size > 0 
      ? filteredLogs.filter(log => selectedLogs.has(log.id))
      : filteredLogs;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation-${Date.now()}.json`;
      a.click();
    } else {
      // CSV export
      const headers = ['Timestamp', 'Type', 'Severity', 'Source', 'Destination', 'Protocol'];
      const rows = dataToExport.map(log => [
        log.timestamp,
        log.type,
        log.severity,
        log.src_ip,
        `${log.dst_ip}:${log.dst_port}`,
        log.protocol
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation-${Date.now()}.csv`;
      a.click();
    }
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSelectLog = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'var(--sev-critical)',
      high: 'var(--sev-high)',
      medium: 'var(--sev-medium)',
      low: 'var(--sev-low)',
      info: 'var(--sev-info)'
    };
    return colors[severity] || colors.info;
  };

  return (
    <div className="h-full flex flex-col gap-4 bg-[var(--bg-app)] p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Investigation</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Query-based and filter-based event search
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button 
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Query DSL: event.severity:critical OR source.ip:192.168.1.* OR type:dns_query"
            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--sev-info)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-[var(--sev-info)] text-white font-medium rounded hover:opacity-90 transition-opacity"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 border border-[var(--border-subtle)] rounded text-sm flex items-center gap-2 transition-colors ${
            showFilters 
              ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' 
              : 'bg-[var(--bg-panel)] text-[var(--text-secondary)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </form>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">Quick Filters</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)]"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)]"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)]"
              >
                <option value="all">All</option>
                <option value="dns_query">DNS Query</option>
                <option value="http_request">HTTP Request</option>
                <option value="ssh_login">SSH Login</option>
                <option value="tls_handshake">TLS Handshake</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">Protocol</label>
              <select
                value={filters.protocol}
                onChange={(e) => setFilters({...filters, protocol: e.target.value})}
                className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)]"
              >
                <option value="all">All</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
                <option value="ICMP">ICMP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">Source IP</label>
              <input
                type="text"
                value={filters.srcIp}
                onChange={(e) => setFilters({...filters, srcIp: e.target.value})}
                placeholder="192.168.1.*"
                className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">Dest IP</label>
              <input
                type="text"
                value={filters.dstIp}
                onChange={(e) => setFilters({...filters, dstIp: e.target.value})}
                placeholder="10.0.0.*"
                className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Stats & BulkActionBar */}
      {selectedLogs.size > 0 ? (
        <BulkActionBar
          selectedCount={selectedLogs.size}
          totalCount={filteredLogs.length}
          onExport={() => handleExport('json')}
          onClear={() => setSelectedLogs(new Set())}
          actions={[
            {
              label: 'Export CSV',
              icon: <Download className="w-4 h-4" />,
              onClick: () => handleExport('csv')
            }
          ]}
        />
      ) : (
        <div className="flex justify-between items-center px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">
              Showing <strong className="text-[var(--text-primary)]">{filteredLogs.length}</strong> of <strong className="text-[var(--text-primary)]">{logs.length}</strong> events
            </span>
          </div>
          {filteredLogs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {selectedLogs.size === filteredLogs.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      )}

      {/* Results Table */}
      <div className="flex-1 overflow-auto bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded">
        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--bg-hover)] border-b border-[var(--border-subtle)]">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Destination</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Protocol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <SkeletonLoader variant="table" rows={10} columns={8} />
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState
                    icon={AlertTriangle}
                    title="No events found"
                    description="Try adjusting your search query or filters to find matching events."
                    action={{
                      label: "Clear Filters",
                      onClick: clearFilters
                    }}
                  />
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <>
                  <tr 
                    key={log.id}
                    className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLogs.has(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-app)]"
                      />
                    </td>
                    <td 
                      className="px-4 py-3"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {expandedLog === log.id ? 
                        <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" /> : 
                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                      }
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {format(new Date(log.timestamp), 'MMM dd HH:mm:ss.SSS')}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-[var(--text-primary)]"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {log.type}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {log.src_ip}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-[var(--text-secondary)] font-mono"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {log.dst_ip}:{log.dst_port}
                    </td>
                    <td 
                      className="px-4 py-3 text-sm text-[var(--text-secondary)]"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {log.protocol}
                    </td>
                    <td 
                      className="px-4 py-3"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <span 
                        className="px-2 py-1 text-xs font-semibold rounded uppercase"
                        style={{ 
                          backgroundColor: `${getSeverityColor(log.severity)}20`,
                          color: getSeverityColor(log.severity),
                          border: `1px solid ${getSeverityColor(log.severity)}40`
                        }}
                      >
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className="bg-[var(--bg-app)]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Details</h4>
                            <p className="text-sm text-[var(--text-primary)]">{log.details}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">Raw Event Data</h4>
                            <pre className="text-xs bg-[#0a0a0a] text-[#00ff00] p-3 rounded border border-[var(--border-subtle)] overflow-x-auto font-mono">
                              {JSON.stringify(log.raw || log, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
