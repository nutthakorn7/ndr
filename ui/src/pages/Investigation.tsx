import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Download, ChevronDown, ChevronRight, X, RefreshCw, AlertTriangle,
  Save, FolderOpen, Share2, Link
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../utils/api';
import { ThreatEvent } from '../schemas';
import BulkActionBar from '../components/BulkActionBar';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useSavedQueries, SavedQuery } from '../hooks/useSavedQueries';
import { SavedQueriesMenu } from '../components/SavedQueriesMenu';
import { FilterBar, FilterConfig } from '../components/FilterBar';

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
  // URL Params
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState(new Set<string>());
  
  // Saved Queries State
  const { savedQueries, saveQuery, deleteQuery, toggleFavorite } = useSavedQueries();
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newQueryName, setNewQueryName] = useState('');
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    timeRange: searchParams.get('timeRange') || '24h',
    severity: searchParams.get('severity') || 'all',
    eventType: searchParams.get('type') || 'all',
    protocol: searchParams.get('protocol') || 'all',
    srcIp: searchParams.get('src') || '',
    dstIp: searchParams.get('dst') || '',
  });

  // Filter Configuration
  const filterConfig: FilterConfig[] = [
    {
      key: 'timeRange',
      label: 'Time Range',
      type: 'select',
      options: [
        { value: '1h', label: 'Last 1 Hour' },
        { value: '24h', label: 'Last 24 Hours' },
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' }
      ]
    },
    {
      key: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
        { value: 'info', label: 'Info' }
      ]
    },
    {
      key: 'eventType',
      label: 'Event Type',
      type: 'select',
      options: [
        { value: 'dns_query', label: 'DNS Query' },
        { value: 'http_request', label: 'HTTP Request' },
        { value: 'ssh_login', label: 'SSH Login' },
        { value: 'file_access', label: 'File Access' }
      ]
    },
    {
      key: 'protocol',
      label: 'Protocol',
      type: 'select',
      options: [
        { value: 'TCP', label: 'TCP' },
        { value: 'UDP', label: 'UDP' },
        { value: 'ICMP', label: 'ICMP' }
      ]
    },
    { key: 'srcIp', label: 'Source IP', type: 'text', placeholder: 'e.g. 192.168.1.5' },
    { key: 'dstIp', label: 'Dest IP', type: 'text', placeholder: 'e.g. 10.0.0.1' }
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Sync state to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (filters.timeRange !== '24h') params.timeRange = filters.timeRange;
    if (filters.severity !== 'all') params.severity = filters.severity;
    if (filters.eventType !== 'all') params.type = filters.eventType;
    if (filters.protocol !== 'all') params.protocol = filters.protocol;
    if (filters.srcIp) params.src = filters.srcIp;
    if (filters.dstIp) params.dst = filters.dstIp;
    setSearchParams(params, { replace: true });
  }, [query, filters, setSearchParams]);

  // Handle Save Query
  const handleSaveQuery = () => {
    if (!newQueryName.trim()) return;
    saveQuery(newQueryName, query, filters);
    setNewQueryName('');
    setShowSaveDialog(false);
  };

  // Handle Load Query
  const handleLoadQuery = (saved: SavedQuery) => {
    setQuery(saved.query);
    setFilters(saved.filters as any);
    // Trigger fetch automatically via useEffect dependency on filters/query
  };

  // Handle Share
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 2000);
  };

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

  // Load data on mount and when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 500); // Debounce
    return () => clearTimeout(timer);
  }, [query, filters]);

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
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
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

      {/* Search & Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search logs (e.g. source:192.168.1.1 OR type:dns)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded pl-10 pr-4 py-2 text-[var(--text-primary)] focus:border-[var(--sev-info)] outline-none"
            />
          </div>
          
          <div className="flex gap-2">
            {/* Saved Queries & Share buttons ... */}
            <div className="relative">
              <button
                onClick={() => setShowSavedQueries(!showSavedQueries)}
                className="h-full px-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sev-info)] transition-colors"
                title="Saved Queries"
              >
                <FolderOpen className="w-5 h-5" />
              </button>
              <SavedQueriesMenu
                isOpen={showSavedQueries}
                onClose={() => setShowSavedQueries(false)}
                queries={savedQueries}
                onLoad={handleLoadQuery}
                onDelete={deleteQuery}
                onToggleFavorite={toggleFavorite}
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                className="h-full px-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sev-info)] transition-colors"
                title="Save Current Query"
              >
                <Save className="w-5 h-5" />
              </button>
              {/* ... save dialog ... */}
              {showSaveDialog && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSaveDialog(false)} />
                  <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 p-4">
                    <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">Save Query</h3>
                    <input
                      type="text"
                      placeholder="Query Name"
                      value={newQueryName}
                      onChange={(e) => setNewQueryName(e.target.value)}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm mb-3 focus:border-[var(--sev-info)] outline-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveQuery}
                        disabled={!newQueryName.trim()}
                        className="px-3 py-1.5 text-xs bg-[var(--sev-info)] text-white rounded hover:opacity-90 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={handleShare}
                className="h-full px-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sev-info)] transition-colors"
                title="Share Query Link"
              >
                <Share2 className="w-5 h-5" />
              </button>
              {showShareTooltip && (
                <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50 animate-fade-in">
                  Link copied!
                </div>
              )}
            </div>
            
            <button 
              onClick={fetchLogs}
              className="h-full px-4 bg-[var(--sev-info)] text-white rounded hover:opacity-90 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar 
          config={filterConfig}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={clearFilters}
        />
      </div>

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
