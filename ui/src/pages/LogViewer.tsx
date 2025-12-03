import { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, Calendar, AlertTriangle, 
  ChevronDown, ChevronRight, X, RefreshCw 
} from 'lucide-react';
import './LogViewer.css';

import { api } from '../utils/api';
import { ThreatEvent } from '../schemas';

export default function LogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    timeRange: '24h',
    severity: 'all',
    eventType: 'all',
    protocol: 'all',
    srcIp: '',
    dstIp: '',
    port: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Map filters to API query
      const query: Record<string, any> = {
        limit: 100,
        time_range: filters.timeRange
      };

      if (searchQuery) query.q = searchQuery;
      if (filters.severity !== 'all') query.severity = filters.severity;
      if (filters.eventType !== 'all') query.type = filters.eventType;
      if (filters.protocol !== 'all') query.protocol = filters.protocol;
      if (filters.srcIp) query.source = filters.srcIp;
      if (filters.dstIp) query.destination = filters.dstIp;

      const response = await api.searchEvents(query);
      
      // Map API response to LogViewer format
      const mappedLogs = response.events.map((event: ThreatEvent) => ({
        id: event.id.toString(),
        timestamp: event.timestamp,
        event_type: event.type,
        severity: event.severity.toLowerCase(),
        src_ip: event.source,
        dst_ip: event.destination.split(':')[0] || event.destination,
        dst_port: parseInt(event.destination.split(':')[1] || '0'),
        protocol: event.protocol || 'TCP',
        user: 'system', // Default as not in schema
        details: event.description,
        raw: event // Keep raw event for details view
      }));

      setLogs(mappedLogs);
      setFilteredLogs(mappedLogs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      // Fallback to empty or show error toast
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchLogs();
  }, [filters.timeRange]); // Only auto-refresh on time range change, others via search button or debounce? 
  // Actually, let's keep it simple and just fetch on mount for now, and rely on client-side filtering for speed 
  // OR switch to server-side filtering. 
  // The original code did client-side filtering on `logs`. 
  // Let's fetch ALL recent logs (limit 1000) and keep client-side filtering for responsiveness, 
  // but allow "Refresh" to pull new data.


  // Apply filters
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    // Event type filter
    if (filters.eventType !== 'all') {
      filtered = filtered.filter(log => log.event_type === filters.eventType);
    }

    // Protocol filter
    if (filters.protocol !== 'all') {
      filtered = filtered.filter(log => log.protocol === filters.protocol);
    }

    // IP filters
    if (filters.srcIp) {
      filtered = filtered.filter(log => log.src_ip.includes(filters.srcIp));
    }
    if (filters.dstIp) {
      filtered = filtered.filter(log => log.dst_ip.includes(filters.dstIp));
    }

    // Port filter
    if (filters.port) {
      filtered = filtered.filter(log => log.dst_port.toString().includes(filters.port));
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, filters]);

  const handleExport = (format) => {
    const dataStr = format === 'json' 
      ? JSON.stringify(filteredLogs, null, 2)
      : filteredLogs.map(log => Object.values(log).join(',')).join('\n');
    
    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_export_${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      timeRange: '24h',
      severity: 'all',
      eventType: 'all',
      protocol: 'all',
      srcIp: '',
      dstIp: '',
      port: '',
    });
    setSearchQuery('');
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSelectLog = (logId) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#6b7280',
      info: '#94a3b8'
    };
    return colors[severity] || colors.info;
  };

  return (
    <div className="log-viewer">
      {/* Header */}
      <div className="log-viewer-header">
        <h1>Log Viewer</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter Toggle */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="w-5 h-5 search-icon" />
          <input
            type="text"
            placeholder="Search logs... (e.g., 192.168.1.10 or ssh_login)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button 
          className={`btn-filter ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="panel filters-panel">
          <div className="panel-header">
            <h3><Filter className="w-5 h-5" /> Advanced Filters</h3>
          </div>
          <div className="filter-content">
            <div className="filter-row">
              <div className="filter-group">
                <label>Time Range</label>
                <select value={filters.timeRange} onChange={(e) => setFilters({...filters, timeRange: e.target.value})}>
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Severity</label>
                <select value={filters.severity} onChange={(e) => setFilters({...filters, severity: e.target.value})}>
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Event Type</label>
                <select value={filters.eventType} onChange={(e) => setFilters({...filters, eventType: e.target.value})}>
                  <option value="all">All</option>
                  <option value="dns_query">DNS Query</option>
                  <option value="http_request">HTTP Request</option>
                  <option value="ssh_login">SSH Login</option>
                  <option value="smb_access">SMB Access</option>
                  <option value="tls_handshake">TLS Handshake</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Protocol</label>
                <select value={filters.protocol} onChange={(e) => setFilters({...filters, protocol: e.target.value})}>
                  <option value="all">All</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ICMP">ICMP</option>
                </select>
              </div>
            </div>
            <div className="filter-row">
              <div className="filter-group">
                <label>Source IP</label>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.10"
                  value={filters.srcIp}
                  onChange={(e) => setFilters({...filters, srcIp: e.target.value})}
                />
              </div>
              <div className="filter-group">
                <label>Destination IP</label>
                <input
                  type="text"
                  placeholder="e.g., 10.0.0.50"
                  value={filters.dstIp}
                  onChange={(e) => setFilters({...filters, dstIp: e.target.value})}
                />
              </div>
              <div className="filter-group">
                <label>Port</label>
                <input
                  type="text"
                  placeholder="e.g., 443"
                  value={filters.port}
                  onChange={(e) => setFilters({...filters, port: e.target.value})}
                />
              </div>
              <div className="filter-actions">
                <button className="btn-secondary" onClick={clearFilters}>
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="panel results-summary">
        <div className="results-content">
          <div className="results-count">
            <span className="count">{filteredLogs.length.toLocaleString()}</span> 
            <span className="label">events</span>
            {selectedLogs.size > 0 && (
              <span className="selected-count">({selectedLogs.size} selected)</span>
            )}
          </div>
          <div className="export-actions">
            <button className="btn-export" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button className="btn-export" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="panel log-table-wrapper">
        <div className="log-table-container">
          <table className="log-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="col-time">Timestamp</th>
              <th className="col-severity">Severity</th>
              <th className="col-event">Event Type</th>
              <th className="col-src">Source IP</th>
              <th className="col-dst">Destination</th>
              <th className="col-protocol">Protocol</th>
              <th className="col-user">User</th>
              <th className="col-details">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-results">
                  <AlertTriangle className="w-12 h-12" />
                  <p>No logs found matching your filters</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <>
                  <tr 
                    key={log.id}
                    className={`log-row ${expandedLog === log.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLogs.has(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                      />
                    </td>
                    <td className="col-time">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="col-severity">
                      <span 
                        className="severity-badge" 
                        style={{ backgroundColor: getSeverityColor(log.severity) }}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="col-event">{log.event_type.replace('_', ' ')}</td>
                    <td className="col-src mono">{log.src_ip}</td>
                    <td className="col-dst mono">{log.dst_ip}:{log.dst_port}</td>
                    <td className="col-protocol">{log.protocol}</td>
                    <td className="col-user">{log.user}</td>
                    <td className="col-details">{log.details}</td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr className="expanded-row">
                      <td colSpan="9">
                        <div className="expanded-content">
                          <h4>Full Event Data</h4>
                          <pre>{JSON.stringify(log, null, 2)}</pre>
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
    </div>
  );
}
