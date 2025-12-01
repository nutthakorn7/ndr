/**
 * DNS Intelligence Component
 * Visualizes DNS tunneling, DGA detection, and query statistics
 */
import { useState, useEffect } from 'react';
import { 
  Globe, AlertTriangle, Activity, Search, 
  Filter, Zap, AlertOctagon, Server
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { 
  mockDNSQueries, mockDNSTunneling, mockDNSQueryTypes, mockDNSVolume, mockDNSStats 
} from '../utils/mockData';
import api from '../utils/api';
import './DNSIntelligence.css';

interface DNSStats {
  totalQueries: number;
  blockedQueries: number;
  dgaDomains: number;
  tunnelingAlerts: number;
  total_queries?: number;
  blocked_queries?: number;
  dga_domains?: number;
  tunneling_alerts?: number;
}

interface DNSQuery {
  id: string | number;
  status: 'blocked' | 'allowed' | 'flagged';
  domain: string;
  type: string;
  client: string;
  category: string;
  time: string;
}

interface TunnelingEvent {
  id: string | number;
  domain: string;
  method: string;
  volume: string;
  client: string;
  confidence: number;
}

export default function DNSIntelligence() {
  const [stats, setStats] = useState<DNSStats | null>(null);
  const [queries, setQueries] = useState<DNSQuery[]>([]);
  const [tunnelingEvents, setTunnelingEvents] = useState<TunnelingEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch DNS intelligence data from API
    const loadData = async () => {
      setLoading(true);
      try {
        // Try to fetch DNS statistics from API
        const dnsStats = await api.getDNSStats();
        
        if (dnsStats) {
          // Update stats from API
          setStats({
            totalQueries: dnsStats.total_queries || 0,
            blockedQueries: dnsStats.blocked_queries || 0,
            dgaDomains: dnsStats.dga_domains || 0,
            tunnelingAlerts: dnsStats.tunneling_alerts || 0
          });
          
          // For query list and tunneling events, use mock data for now
          throw new Error('Using mock data for queries and tunneling events');
        } else {
          throw new Error('No DNS stats available');
        }
      } catch (error) {
        console.warn('Failed to load DNS intelligence from API, using mock data:', error);
        
        // Mock Stats
        setStats(mockDNSStats as DNSStats);

        // Mock Recent Queries (Suspicious/Interesting)
        setQueries(mockDNSQueries as DNSQuery[]);

        // Mock Tunneling Events
        setTunnelingEvents(mockDNSTunneling as TunnelingEvent[]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Chart Data: Query Types
  const queryTypes = mockDNSQueryTypes;

  // Chart Data: Volume over time
  const volumeData = mockDNSVolume;

  if (loading) return <div className="loading-state">Analyzing DNS traffic...</div>;

  return (
    <div className="dns-intelligence">
      {/* Header Stats */}
      <div className="dns-stats-row">
        <div className="dns-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <Globe className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalQueries ? (stats.totalQueries / 1000).toFixed(1) : 0}k</div>
            <div className="stat-label">Total Queries (24h)</div>
          </div>
        </div>
        <div className="dns-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.blockedQueries}</div>
            <div className="stat-label">Blocked Domains</div>
          </div>
        </div>
        <div className="dns-stat-card">
          <div className="stat-icon bg-purple-500/10 text-purple-400">
            <Zap className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.dgaDomains}</div>
            <div className="stat-label">DGA Detected</div>
          </div>
        </div>
        <div className="dns-stat-card">
          <div className="stat-icon bg-orange-500/10 text-orange-400">
            <Activity className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.tunnelingAlerts}</div>
            <div className="stat-label">Tunneling Events</div>
          </div>
        </div>
      </div>

      <div className="dns-content-grid">
        {/* Left Column: Charts */}
        <div className="dns-left-col">
          {/* Query Volume */}
          <div className="dns-panel">
            <div className="panel-header">
              <h3><Activity className="w-4 h-4 text-blue-400" /> DNS Query Volume (QPS)</h3>
            </div>
            <div className="chart-container-sm">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="qps" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Query Types */}
          <div className="dns-panel">
            <div className="panel-header">
              <h3><Server className="w-4 h-4 text-purple-400" /> Query Types</h3>
            </div>
            <div className="chart-container-sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queryTypes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Tunneling & Recent Queries */}
        <div className="dns-right-col">
          {/* Tunneling Alerts */}
          <div className="dns-panel">
            <div className="panel-header">
              <h3><AlertTriangle className="w-4 h-4 text-red-400" /> DNS Tunneling Detection</h3>
            </div>
            <div className="tunnel-list">
              {tunnelingEvents.map(event => (
                <div key={event.id} className="tunnel-item">
                  <div className="tunnel-icon">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="tunnel-info">
                    <div className="tunnel-domain">{event.domain}</div>
                    <div className="tunnel-meta">
                      <span>{event.method}</span>
                      <span>•</span>
                      <span>{event.volume}</span>
                      <span>•</span>
                      <span>{event.client}</span>
                    </div>
                  </div>
                  <div className="tunnel-confidence">
                    <div className="confidence-val">{event.confidence}%</div>
                    <div className="confidence-lbl">Confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Queries */}
          <div className="dns-panel flex-1">
            <div className="panel-header">
              <h3><Search className="w-4 h-4 text-green-400" /> Recent Queries</h3>
              <button className="btn-icon"><Filter className="w-4 h-4" /></button>
            </div>
            <table className="dns-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Domain</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Category</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {queries.map(query => (
                  <tr key={query.id}>
                    <td>
                      {query.status === 'blocked' && <span className="status-dot blocked" title="Blocked"></span>}
                      {query.status === 'allowed' && <span className="status-dot allowed" title="Allowed"></span>}
                      {query.status === 'flagged' && <span className="status-dot flagged" title="Flagged"></span>}
                    </td>
                    <td className="mono text-white">{query.domain}</td>
                    <td className="text-gray-400">{query.type}</td>
                    <td className="mono text-blue-300">{query.client}</td>
                    <td><span className="category-tag">{query.category}</span></td>
                    <td className="text-gray-500">{query.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
