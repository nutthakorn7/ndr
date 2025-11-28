/**
 * Network Analytics Component
 * Visualizes network traffic, protocols, and connections
 */
import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { Network, ArrowUpRight, ArrowDownLeft, Activity, Filter, Download } from 'lucide-react';
import api from '../utils/api';
import { useToast } from './Toast';
import './NetworkAnalytics.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function NetworkAnalytics() {
  const { addToast } = useToast();
  const [timeRange, setTimeRange] = useState('24h');
  const [trafficData, setTrafficData] = useState([]);
  const [protocolData, setProtocolData] = useState([]);
  const [topTalkers, setTopTalkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    const loadData = async () => {
      setLoading(true);
      try {
        // In real app: await api.getTrafficStats(timeRange);
        await new Promise(r => setTimeout(r, 800));
        
        // Mock Traffic Data (24h)
        const traffic = [];
        const now = new Date();
        for (let i = 24; i >= 0; i--) {
          traffic.push({
            time: new Date(now - i * 3600000).getHours() + ':00',
            inbound: Math.floor(Math.random() * 500) + 200,
            outbound: Math.floor(Math.random() * 300) + 100,
          });
        }
        setTrafficData(traffic);

        // Mock Protocol Data
        setProtocolData([
          { name: 'HTTPS', value: 45 },
          { name: 'DNS', value: 15 },
          { name: 'HTTP', value: 12 },
          { name: 'SSH', value: 8 },
          { name: 'SMB', value: 5 },
          { name: 'Other', value: 15 },
        ]);

        // Mock Top Talkers
        setTopTalkers([
          { ip: '192.168.1.105', bytes: '4.2 GB', flows: 12450, risk: 'High' },
          { ip: '192.168.1.200', bytes: '2.1 GB', flows: 8540, risk: 'Medium' },
          { ip: '192.168.1.15', bytes: '1.8 GB', flows: 6200, risk: 'Low' },
          { ip: '10.0.0.5', bytes: '950 MB', flows: 4100, risk: 'Low' },
          { ip: '172.16.0.25', bytes: '500 MB', flows: 1200, risk: 'Critical' },
        ]);

      } catch (error) {
        console.error('Failed to load network analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  if (loading) {
    return <div className="loading-state">Loading network analytics...</div>;
  }

  return (
    <div className="network-analytics">
      {/* Header Controls */}
      <div className="analytics-header">
        <div className="header-title">
          <h2>Network Traffic Analysis</h2>
          <span className="live-badge">
            <span className="pulse-dot"></span> Live
          </span>
        </div>
        <div className="header-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="control-select"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button className="btn-secondary">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Traffic Charts Row */}
      <div className="charts-row">
        {/* Traffic Volume Area Chart */}
        <div className="chart-card wide">
          <div className="card-header">
            <h3><Activity className="w-4 h-4 text-blue-400" /> Traffic Volume (Mbps)</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Area type="monotone" dataKey="inbound" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIn)" name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#10b981" fillOpacity={1} fill="url(#colorOut)" name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol Distribution Pie Chart */}
        <div className="chart-card">
          <div className="card-header">
            <h3><Network className="w-4 h-4 text-purple-400" /> Protocol Distribution</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocolData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {protocolData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Talkers & Stats */}
      <div className="data-row">
        {/* Top Talkers Table */}
        <div className="data-card wide">
          <div className="card-header">
            <h3><ArrowUpRight className="w-4 h-4 text-orange-400" /> Top Talkers</h3>
            <button className="btn-text">View All</button>
          </div>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Total Bytes</th>
                <th>Flows</th>
                <th>Risk Level</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topTalkers.map((host, i) => (
                <tr key={i}>
                  <td className="mono text-cyan-400">{host.ip}</td>
                  <td>{host.bytes}</td>
                  <td>{host.flows.toLocaleString()}</td>
                  <td>
                    <span className={`risk-badge ${host.risk.toLowerCase()}`}>
                      {host.risk}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-xs"
                      onClick={() => addToast(`Analyzing traffic for ${host.ip}...`, 'info')}
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Stats */}
        <div className="stats-column">
          <div className="stat-box">
            <div className="stat-label">Total Bandwidth</div>
            <div className="stat-number">1.2 Gbps</div>
            <div className="stat-trend up">↑ 15% peak</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Active Connections</div>
            <div className="stat-number">24,502</div>
            <div className="stat-trend neutral">~ Stable</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Unique IPs</div>
            <div className="stat-number">1,892</div>
            <div className="stat-trend up">↑ 12 new</div>
          </div>
        </div>
      </div>
    </div>
  );
}
