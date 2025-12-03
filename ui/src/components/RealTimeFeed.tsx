/**
 * Real-Time Event Feed
 * Live streaming of security events with enhanced controls
 */
import { useState, useEffect, useRef } from 'react';
import { Activity, Pause, Play, Zap, Wifi, WifiOff, Filter, X, Download, Trash2 } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import EventDetailModal from './EventDetailModal';
import { ThreatEvent } from '../services/api';
import './RealTimeFeed.css';

const WS_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace('http', 'ws') + '/ws';

interface FeedStats {
  eps: number;
  total: number;
}

const EVENT_TYPES = [
  'Malware Detection',
  'Exploit Attempt',
  'Port Scan',
  'Brute Force',
  'DDoS Attack',
  'Data Exfiltration',
  'Phishing',
  'Unauthorized Access',
  'Policy Violation',
  'Suspicious Traffic'
];

const SEVERITIES: Array<'Critical' | 'High' | 'Medium' | 'Low'> = ['Critical', 'High', 'Medium', 'Low'];

interface RealTimeFeedProps {
  onCreateIncident?: (event: ThreatEvent) => void;
}

export default function RealTimeFeed({ onCreateIncident }: RealTimeFeedProps) {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ThreatEvent[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [stats, setStats] = useState<FeedStats>({ eps: 0, total: 0 });
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    search: ''
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventCounter = useRef<number>(1);

  // WebSocket Connection
  const { messages, isConnected } = useWebSocket(WS_URL);

  // Process WebSocket messages
  useEffect(() => {
    if (messages.length > 0 && !isPaused) {
      const latestMsg = messages[0];
      // Assuming message is already parsed JSON or needs parsing
      // The hook parses JSON, so latestMsg is an object.
      // We need to map it to ThreatEvent if it's not already.
      // For now, let's assume the backend sends something compatible or we map it.
      // If backend sends raw log, we might need to map it.
      
      const newEvent: ThreatEvent = {
        id: eventCounter.current++,
        timestamp: latestMsg.timestamp || new Date().toISOString(),
        type: latestMsg.type || 'Log',
        severity: latestMsg.severity || 'Low',
        source: latestMsg.source_ip || latestMsg.source || 'Unknown',
        destination: latestMsg.dest_ip || latestMsg.destination || 'Unknown',
        protocol: latestMsg.protocol || 'TCP',
        description: latestMsg.message || JSON.stringify(latestMsg),
        details: latestMsg
      };

      setEvents(prev => {
        const combined = [newEvent, ...prev];
        return combined.slice(0, 100);
      });

      setStats(prev => ({
        eps: prev.eps, // We'd need to calculate this
        total: prev.total + 1
      }));
    }
  }, [messages, isPaused]);

  // Generate mock events (fallback if not connected)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (!isConnected && !isPaused) {
      interval = setInterval(() => {
        const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
        const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
        
        const newEvent: ThreatEvent = {
          id: eventCounter.current++,
          timestamp: new Date().toISOString(),
          type,
          severity,
          source: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          destination: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          protocol: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS'][Math.floor(Math.random() * 5)],
          description: `${type} detected from source IP`,
          details: {
            port: Math.floor(Math.random() * 65535),
            bytes: Math.floor(Math.random() * 100000),
            packets: Math.floor(Math.random() * 1000)
          }
        };

        setEvents(prev => {
          const combined = [newEvent, ...prev];
          return combined.slice(0, 100);
        });

        setStats(prev => ({
          eps: Math.floor(Math.random() * 30) + 10,
          total: prev.total + 1
        }));
      }, 1500);
    }

    return () => clearInterval(interval);
  }, [isConnected, isPaused]);

  // Apply filters
  useEffect(() => {
    let filtered = [...events];

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.source.includes(search) ||
        e.destination.includes(search) ||
        e.type.toLowerCase().includes(search) ||
        e.description.toLowerCase().includes(search)
      );
    }

    setFilteredEvents(filtered);
  }, [events, filters]);

  const handleClearFilters = () => {
    setFilters({ severity: 'all', type: 'all', search: '' });
  };

  const handleClearFeed = () => {
    setEvents([]);
    setStats({ eps: 0, total: 0 });
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Timestamp', 'Type', 'Severity', 'Source', 'Destination', 'Protocol', 'Description'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.timestamp,
      e.type,
      e.severity,
      e.source,
      e.destination,
      e.protocol || 'N/A',
      e.description
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat_events_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const json = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat_events_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="feed-container">
      <div className="feed-header">
        <div className="feed-title">
          <Activity className="w-4 h-4 text-green-400" />
          <h3>Live Event Stream</h3>
          <span className={`live-indicator ${isConnected ? '' : 'offline'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'LIVE' : 'MOCK'}
          </span>
        </div>
        <div className="feed-controls">
          <span className="feed-stat">{stats.eps} EPS</span>
          <span className="feed-stat">{filteredEvents.length} shown</span>
          <button 
            className="btn-icon-sm" 
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle Filters"
          >
            <Filter className="w-3 h-3" />
          </button>
          <button 
            className="btn-icon-sm" 
            onClick={handleClearFeed}
            title="Clear Feed"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button 
            className="btn-icon-sm" 
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="feed-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <option value="all">All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="all">All Types</option>
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search IP, type..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="filter-actions">
              <button className="btn-sm btn-secondary" onClick={handleClearFilters}>
                <X className="w-3 h-3" /> Clear
              </button>
              <button className="btn-sm btn-primary" onClick={exportToCSV}>
                <Download className="w-3 h-3" /> CSV
              </button>
              <button className="btn-sm btn-primary" onClick={exportToJSON}>
                <Download className="w-3 h-3" /> JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="paused-banner">
          ⏸️ Feed Paused - Click Resume to continue
        </div>
      )}

      <div className="feed-content" ref={scrollRef}>
        {filteredEvents.map(event => (
          <div
            key={event.id}
            className={`feed-item ${event.severity.toLowerCase()} clickable`}
            onClick={() => setSelectedEvent(event)}
          >
            <div className="feed-time">
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
            <div className="feed-type">{event.type}</div>
            <div className="feed-details">
              <span className="feed-ip">{event.source}</span>
              <span className="feed-arrow">→</span>
              <span className="feed-ip">{event.destination}</span>
            </div>
            <div className="feed-severity-badge">
              {event.severity}
            </div>
            {event.severity === 'Critical' && (
              <Zap className="w-3 h-3 text-red-500" />
            )}
          </div>
        ))}
        {filteredEvents.length === 0 && (
          <div className="feed-empty">
            {events.length === 0 ? 'Waiting for events...' : 'No events match filters'}
          </div>
        )}
      </div>

      <EventDetailModal 
        event={selectedEvent} 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        onCreateIncident={onCreateIncident}
      />
    </div>
  );
}
