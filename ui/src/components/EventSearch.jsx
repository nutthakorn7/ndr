/**
 * Event Search Interface
 * Advanced search for security events
 */
import { useState } from 'react';
import { Search, Filter, Calendar, Download, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import './EventSearch.css';

export default function EventSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // In a real app, this would call the search API
      // const data = await api.searchEvents({ query, range: timeRange });
      
      // Mock simulation for UI demonstration
      await new Promise(r => setTimeout(r, 800));
      const mockResults = Array(10).fill(0).map((_, i) => ({
        id: `evt-${Date.now()}-${i}`,
        timestamp: new Date().toISOString(),
        source_ip: `192.168.1.${100 + i}`,
        dest_ip: `10.0.0.${50 + i}`,
        protocol: ['TCP', 'UDP', 'HTTP', 'DNS'][Math.floor(Math.random() * 4)],
        event_type: 'network_connection',
        details: `Connection to external host on port ${80 + i}`
      }));
      setResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-search-container">
      <div className="search-header">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input 
            type="text" 
            placeholder="Search events (e.g. ip=192.168.1.1 OR protocol=HTTP)..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        
        <div className="search-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <button className="btn-icon" title="Filter">
            <Filter className="w-4 h-4" />
          </button>
          
          <button className="btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      <div className="search-results">
        {results.length > 0 ? (
          <div className="results-table-wrapper">
            <div className="results-header">
              <span>Found {results.length} events</span>
              <button className="btn-text">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Protocol</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map(event => (
                  <tr key={event.id}>
                    <td className="mono text-sm">{new Date(event.timestamp).toLocaleTimeString()}</td>
                    <td className="mono text-cyan-400">{event.source_ip}</td>
                    <td className="mono text-cyan-400">{event.dest_ip}</td>
                    <td><span className="protocol-tag">{event.protocol}</span></td>
                    <td>{event.event_type}</td>
                    <td className="text-gray-400">{event.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-search">
            <Search className="w-12 h-12 text-gray-700 mb-4" />
            <p>Enter a query to search security events</p>
            <p className="text-sm text-gray-500 mt-2">Try searching for IPs, protocols, or event types</p>
          </div>
        )}
      </div>
    </div>
  );
}
