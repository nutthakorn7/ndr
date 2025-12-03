/**
 * Event Search Interface - REFACTORED with Design System
 * Advanced search for security events using base components
 */
import { useState, useEffect } from 'react';
import { Search, Download, Save, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BaseCard, BaseButton, BaseInput, BaseTable, Column } from './base';
import LoadingSpinner from './LoadingSpinner';
import api from '../utils/api';
import './EventSearch.css';

interface SavedSearch {
  id: number;
  name: string;
  query: {
    q?: string;
    structuredQuery?: SearchClause[];
  };
  visualization_type: string;
}

interface SearchClause {
  id: number;
  field: string;
  operator: string;
  value: string;
  logic: string;
}

interface EventResult {
  id: string | number;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  protocol: string;
  event_type: string;
  details: string;
  [key: string]: any;
}

interface ChartDataPoint {
  time: string;
  count: number;
}

export default function EventSearch() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [newSearchName, setNewSearchName] = useState<string>('');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [mode, setMode] = useState<'builder' | 'raw'>('builder');
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<EventResult[]>([]);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [clauses, setClauses] = useState<SearchClause[]>([
    { id: 1, field: 'event.severity', operator: 'is', value: 'high', logic: 'AND' }
  ]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchParams = mode === 'raw' 
        ? { q: query, timeRange }
        : { structuredQuery: clauses, timeRange };
      
      const data = await api.searchEvents(searchParams);
      setResults(data.events || []);
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

  const removeClause = (id: number) => {
    if (clauses.length > 1) {
      setClauses(clauses.filter(c => c.id !== id));
    }
  };

  const updateClause = (id: number, field: string, value: string) => {
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

  const loadSearch = (search: SavedSearch) => {
    if (search.query.q) {
      setMode('raw');
      setQuery(search.query.q);
    } else if (search.query.structuredQuery) {
      setMode('builder');
      setClauses(search.query.structuredQuery);
    }
    setTimeout(handleSearch, 100);
  };

  // Prepare chart data from results
  useEffect(() => {
    if (results.length > 0) {
      const buckets: Record<number, number> = {};
      results.forEach(evt => {
        const time = new Date(evt.timestamp);
        const key = time.setMinutes(0, 0, 0);
        buckets[key] = (buckets[key] || 0) + 1;
      });
      
      const data = Object.keys(buckets).map(key => ({
        time: new Date(parseInt(key)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        count: buckets[parseInt(key)]
      })).sort((a, b) => a.time.localeCompare(b.time));
      
      setChartData(data);
    }
  }, [results]);

  // Table columns
  const columns: Column<EventResult>[] = [
    { 
      key: 'timestamp', 
      header: 'Time',
      width: '140px',
      render: (row) => new Date(row.timestamp).toLocaleTimeString()
    },
    { key: 'source_ip', header: 'Source', width: '140px' },
    { key: 'dest_ip', header: 'Destination', width: '140px' },
    { 
      key: 'protocol', 
      header: 'Protocol',
      width: '100px',
      render: (row) => <span className="protocol-tag">{row.protocol}</span>
    },
    { key: 'event_type', header: 'Type', width: '150px' },
    { key: 'details', header: 'Details' }
  ];

  return (
    <div className="event-search">
      {/* Search Header Card */}
      <BaseCard>
        {/* Mode Toggle */}
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

        {/* Saved Searches */}
        <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-4)' }}>
          <div className="flex gap-3 items-center">
            <select 
              className="input"
              style={{ minWidth: '200px' }}
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
            <BaseButton 
              variant="secondary" 
              size="sm"
              icon={<Save size={16} />}
              onClick={() => setShowSaveModal(true)}
            >
              Save
            </BaseButton>
          </div>

          {/* Time Range */}
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="input"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <BaseInput
              placeholder="Search Name..."
              value={newSearchName}
              onChange={(e) => setNewSearchName(e.target.value)}
              style={{ flex: 1 }}
            />
            <BaseButton variant="primary" size="sm" onClick={handleSaveSearch}>Save</BaseButton>
            <BaseButton variant="secondary" size="sm" onClick={() => setShowSaveModal(false)}>Cancel</BaseButton>
          </div>
        )}

        {/* Query Input */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          {mode === 'raw' ? (
            <BaseInput
              icon={<Search size={18} />}
              placeholder="Search events (e.g. ip=192.168.1.1 OR protocol=HTTP)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          ) : (
            <div className="query-builder">
              {clauses.map((clause, index) => (
                <div key={clause.id} className="query-clause">
                  {index > 0 && (
                    <select 
                      value={clause.logic}
                      onChange={(e) => updateClause(clause.id, 'logic', e.target.value)}
                      className="logic-select input"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <select 
                    value={clause.field}
                    onChange={(e) => updateClause(clause.id, 'field', e.target.value)}
                    className="field-select input"
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
                    className="operator-select input"
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
                    className="input"
                    style={{ flex: 1 }}
                  />
                  <button 
                    onClick={() => removeClause(clause.id)}
                    className="remove-clause-btn"
                    disabled={clauses.length === 1}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <BaseButton 
                variant="ghost" 
                size="sm" 
                onClick={addClause}
                style={{ marginTop: 'var(--space-2)' }}
              >
                + Add Condition
              </BaseButton>
            </div>
          )}
        </div>

        {/* Search Button */}
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <BaseButton 
            variant="primary" 
            loading={loading}
            onClick={handleSearch}
          >
            Search
          </BaseButton>
        </div>
      </BaseCard>

      {/* Results  */}
      <BaseCard>
        {loading ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <LoadingSpinner size="medium" message="Searching events..." />
          </div>
        ) : results.length > 0 ? (
          <>
            {/* Chart */}
            {chartData.length > 0 && (
              <div className="results-chart">
                <h3>Event Volume</h3>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="time" stroke="var(--text-tertiary)" />
                      <YAxis stroke="var(--text-tertiary)" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--surface-elevated)', 
                          borderColor: 'var(--border-medium)', 
                          color: 'var(--text-primary)' 
                        }}
                      />
                      <Bar dataKey="count" fill="var(--color-primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Results Header */}
            <div style={{ 
              padding: 'var(--space-4)', 
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Results: {results.length} events
              </span>
              <BaseButton 
                variant="ghost" 
                size="sm"
                icon={<Download size={16} />}
              >
                Export
              </BaseButton>
            </div>

            {/* Results Table */}
            <div style={{ padding: 'var(--space-4)' }}>
              <BaseTable
                data={results}
                columns={columns}
                emptyMessage="No events found"
              />
            </div>
          </>
        ) : (
          <div style={{ 
            padding: 'var(--space-16)', 
            textAlign: 'center',
            color: 'var(--text-tertiary)'
          }}>
            <Search size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
            <p style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              Enter a query to search security events
            </p>
            <p style={{ fontSize: 'var(--text-sm)' }}>
              Try searching for IPs, protocols, or event types
            </p>
          </div>
        )}
      </BaseCard>
    </div>
  );
}
