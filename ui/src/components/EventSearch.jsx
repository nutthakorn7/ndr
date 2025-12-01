/**
 * Event Search Interface
 * Advanced search for security events
 */
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from './LoadingSpinner';
import api from '../utils/api';
import './EventSearch.css';

export default function EventSearch() {
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [chartData, setChartData] = useState([]);

  // Missing state definitions
  const [mode, setMode] = useState('builder');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [clauses, setClauses] = useState([
    { id: 1, field: 'event.severity', operator: 'is', value: 'high', logic: 'AND' }
  ]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchParams = mode === 'raw' 
        ? { q: query, timeRange }
        : { structuredQuery: clauses, timeRange };
      
      const data = await api.searchEvents(searchParams);
      setResults(data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addClause = () => {
    setClauses([...clauses, { 
      id: Date.now(), 
      field: 'source.ip', 
      operator: 'is', 
      value: '', 
      logic: 'AND' 
    }]);
  };

  const removeClause = (id) => {
    if (clauses.length > 1) {
      setClauses(clauses.filter(c => c.id !== id));
    }
  };

  const updateClause = (id, field, value) => {
    setClauses(clauses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      const searches = await api.getSavedSearches();
      setSavedSearches(searches || []);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const handleSaveSearch = async () => {
    if (!newSearchName.trim()) return;
    try {
      await api.saveSearch({
        name: newSearchName,
        query: mode === 'raw' ? { q: query } : { structuredQuery: clauses },
        visualization_type: 'histogram'
      });
      setNewSearchName('');
      setShowSaveModal(false);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const loadSearch = (search) => {
    if (search.query.q) {
      setMode('raw');
      setQuery(search.query.q);
    } else if (search.query.structuredQuery) {
      setMode('builder');
      setClauses(search.query.structuredQuery);
    }
    // Trigger search automatically
    setTimeout(handleSearch, 100);
  };

  // Prepare chart data from results
  useEffect(() => {
    if (results.length > 0) {
      // Simple client-side aggregation by hour/minute
      const buckets = {};
      results.forEach(evt => {
        const time = new Date(evt.timestamp);
        const key = time.setMinutes(0, 0, 0); // Aggregate by hour
        buckets[key] = (buckets[key] || 0) + 1;
      });
      
      const data = Object.keys(buckets).map(key => ({
        time: new Date(parseInt(key)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        count: buckets[key]
      })).sort((a, b) => a.time.localeCompare(b.time)); // Sort by time string (rough approximation)
      
      setChartData(data);
    }
  }, [results]);

  return (
    <div className="event-search-container">
      <div className="search-header">
        <div className="header-top-row">
          <div className="search-mode-toggle">
            <button 
              className={`mode-btn ${mode === 'builder' ? 'active' : ''}`}
              onClick={() => setMode('builder')}
            >
              Visual Builder
            </button>
            <button 
              className={`mode-btn ${mode === 'raw' ? 'active' : ''}`}
              onClick={() => setMode('raw')}
            >
              Raw Query
            </button>
          </div>
          
          <div className="saved-searches-controls">
            <select 
              className="saved-search-select"
              onChange={(e) => {
                const search = savedSearches.find(s => s.id === parseInt(e.target.value));
                if (search) loadSearch(search);
              }}
              defaultValue=""
            >
              <option value="" disabled>Load Saved Search...</option>
              {savedSearches.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn-secondary" onClick={() => setShowSaveModal(true)}>
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        {showSaveModal && (
          <div className="save-search-modal">
            <input 
              type="text" 
              placeholder="Search Name..." 
              value={newSearchName}
              onChange={(e) => setNewSearchName(e.target.value)}
              className="save-input"
            />
            <button className="btn-primary" onClick={handleSaveSearch}>Save</button>
            <button className="btn-secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
          </div>
        )}

        {mode === 'raw' ? (
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
        ) : (
          <div className="query-builder">
            {clauses.map((clause, index) => (
              <div key={clause.id} className="query-clause">
                {index > 0 && (
                  <select 
                    value={clause.logic}
                    onChange={(e) => updateClause(clause.id, 'logic', e.target.value)}
                    className="logic-select"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                )}
                <select 
                  value={clause.field}
                  onChange={(e) => updateClause(clause.id, 'field', e.target.value)}
                  className="field-select"
                >
                  <option value="source.ip">Source IP</option>
                  <option value="destination.ip">Dest IP</option>
                  <option value="destination.port">Dest Port</option>
                  <option value="network.protocol">Protocol</option>
                  <option value="event.severity">Severity</option>
                  <option value="event.category">Category</option>
                </select>
                <select 
                  value={clause.operator}
                  onChange={(e) => updateClause(clause.id, 'operator', e.target.value)}
                  className="operator-select"
                >
                  <option value="is">is</option>
                  <option value="is_not">is not</option>
                  <option value="contains">contains</option>
                  <option value="exists">exists</option>
                </select>
                <input 
                  type="text"
                  value={clause.value}
                  onChange={(e) => updateClause(clause.id, 'value', e.target.value)}
                  placeholder="Value..."
                  className="value-input"
                />
                <button 
                  onClick={() => removeClause(clause.id)}
                  className="remove-clause-btn"
                  disabled={clauses.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button onClick={addClause} className="add-clause-btn">
              + Add Condition
            </button>
          </div>
        )}
        
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
          
          <button className="btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? <LoadingSpinner size="small" /> : 'Search'}
          </button>
        </div>
      </div>

      <div className="search-results">
        {loading ? (
          <LoadingSpinner size="medium" message="Searching events..." />
        ) : results.length > 0 ? (
          <div className="results-section">
            {/* Visualization */}
            <div className="results-chart">
              <h3>Event Volume</h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="results-header">
              <span>Results: {results.length} events</span>
              <button className="btn-export">
                <Download className="w-4 h-4" />
                Export
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
