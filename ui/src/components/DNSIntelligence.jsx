/**
 * DNS Intelligence Component
 * Visualizes DNS tunneling, DGA detection, and query statistics
 */
import { useState, useEffect } from 'react';
import { 
  Globe, Shield, AlertTriangle, Activity, Search, 
  Filter, ArrowUpRight, Server, Zap, AlertOctagon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Cell
} from 'recharts';
import './DNSIntelligence.css';

export default function DNSIntelligence() {
  const [stats, setStats] = useState(null);
  const [queries, setQueries] = useState([]);
  const [tunnelingEvents, setTunnelingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching DNS data
    const loadData = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 650));
        
        // Mock Stats
        setStats({
          totalQueries: 845290,
          blockedQueries: 1240,
          dgaDomains: 15,
          tunnelingAlerts: 3
        });

        // Mock Recent Queries (Suspicious/Interesting)
        setQueries([
          { id: 1, domain: 'x8374.bad-site.com', type: 'A', client: '192.168.1.105', status: 'blocked', category: 'Malware', time: '2s ago' },
          { id: 2, domain: 'google.com', type: 'A', client: '192.168.1.112', status: 'allowed', category: 'Search', time: '5s ago' },
          { id: 3, domain: 'a.root-servers.net', type: 'AAAA', client: '192.168.1.200', status: 'allowed', category: 'Infrastructure', time: '8s ago' },
          { id: 4, domain: 'uwq82.dga-gen.org', type: 'TXT', client: '192.168.1.15', status: 'flagged', category: 'DGA', time: '12s ago' },
          { id: 5, domain: 'api.slack.com', type: 'CNAME', client: '192.168.1.50', status: 'allowed', category: 'Business', time: '15s ago' },
        ]);

        // Mock Tunneling Events
        setTunnelingEvents([
          { id: 1, domain: 'tunnel.exfil.io', method: 'TXT Records', volume: '45 MB', client: '192.168.1.105', confidence: 98, time: '10m ago' },
          { id: 2, domain: 'c2.covert.net', method: 'Null/Private', volume: '12 KB', client: '192.168.1.15', confidence: 85, time: '1h ago' },
          { id: 3, domain: 'long-subdomain.bad.com', method: 'Long Labels', volume: '2 MB', client: '192.168.1.200', confidence: 70, time: '3h ago' },
        ]);

      } catch (error) {
        console.error('Failed to load DNS intelligence:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Chart Data: Query Types
  const queryTypes = [
    { name: 'A', count: 45000 },
    { name: 'AAAA', count: 12000 },
    { name: 'CNAME', count: 25000 },
    { name: 'TXT', count: 5000 },
    { name: 'MX', count: 2000 },
    { name: 'PTR', count: 8000 },
    { name: 'SRV', count: 1500 },
  ];

  // Chart Data: Volume over time
  const volumeData = [
    { time: '00:00', qps: 120 }, { time: '04:00', qps: 80 },
    { time: '08:00', qps: 450 }, { time: '12:00', qps: 600 },
    { time: '16:00', qps: 550 }, { time: '20:00', qps: 300 },
    { time: '24:00', qps: 150 },
  ];

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
            <div className="stat-value">{(stats?.totalQueries / 1000).toFixed(1)}k</div>
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
