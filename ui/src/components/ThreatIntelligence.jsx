/**
 * Threat Intelligence Component
 * Visualizes IOCs, Threat Feeds, and Threat Matches
 */
import { useState, useEffect } from 'react';
import { 
  Shield, Globe, Database, AlertTriangle, ExternalLink, 
  RefreshCw, CheckCircle, XCircle, Target, Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockThreatFeeds, mockThreatMatches, mockThreatStats } from '../utils/mockData';
import './ThreatIntelligence.css';

export default function ThreatIntelligence() {
  const [feeds, setFeeds] = useState([]);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch threat intel data from API
    const loadThreatData = async () => {
      setLoading(true);
      try {
        // Try to fetch threat statistics from API
        const threatStats = await api.getThreatStats();
        
        if (threatStats && threatStats.total_iocs) {
          // Use real data from API
          setStats({
            totalIocs: threatStats.total_iocs || 0,
            activeThreats: threatStats.active_campaigns || 0,
            blockedConnections: threatStats.blocked_24h || 0,
            feedHealth: threatStats.feed_health || 0
          });
          
          // For now, feeds and matches still use mock data
          throw new Error('Using mock data for feeds and matches');
        } else {
          throw new Error('Invalid threat stats response');
        }
      } catch (error) {
        console.warn('Threat intel API not available, using mock data:', error);
        
        // Simulate a small delay for mock data loading
        await new Promise(r => setTimeout(r, 800));

        // Mock Data Fallback
        setFeeds(mockThreatFeeds);
        setMatches(mockThreatMatches);
        setStats(mockThreatStats);
      } finally {
        setLoading(false);
      }
    };

    loadThreatData();
  }, []);

  // Mock Chart Data
  const chartData = [
    { name: '00:00', matches: 2 }, { name: '04:00', matches: 5 },
    { name: '08:00', matches: 12 }, { name: '12:00', matches: 8 },
    { name: '16:00', matches: 15 }, { name: '20:00', matches: 6 },
    { name: '24:00', matches: 4 },
  ];

  if (loading) return <div className="loading-state">Loading threat intelligence...</div>;

  return (
    <div className="threat-intel">
      {/* Header Stats */}
      <div className="intel-stats-row">
        <div className="intel-stat-card">
          <div className="stat-icon bg-purple-500/10 text-purple-400">
            <Database className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{(stats.totalIocs / 1000000).toFixed(1)}M</div>
            <div className="stat-label">Total IOCs</div>
          </div>
        </div>
        <div className="intel-stat-card">
          <div className="stat-icon bg-red-500/10 text-red-400">
            <Target className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeThreats}</div>
            <div className="stat-label">Active Matches</div>
          </div>
        </div>
        <div className="intel-stat-card">
          <div className="stat-icon bg-blue-500/10 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.blockedConnections}</div>
            <div className="stat-label">Blocked (24h)</div>
          </div>
        </div>
        <div className="intel-stat-card">
          <div className="stat-icon bg-green-500/10 text-green-400">
            <Zap className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.feedHealth}%</div>
            <div className="stat-label">Feed Health</div>
          </div>
        </div>
      </div>

      <div className="intel-content-grid">
        {/* Left Column: Feeds & Chart */}
        <div className="intel-left-col">
          {/* Threat Feeds */}
          <div className="intel-panel">
            <div className="panel-header">
              <h3><Globe className="w-4 h-4 text-blue-400" /> Intelligence Feeds</h3>
              <button className="btn-icon"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="feeds-list">
              {feeds.map(feed => (
                <div key={feed.id} className="feed-item">
                  <div className="feed-status">
                    {feed.status === 'active' ? 
                      <CheckCircle className="w-4 h-4 text-green-400" /> : 
                      <XCircle className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="feed-info">
                    <div className="feed-name">{feed.name}</div>
                    <div className="feed-meta">
                      <span>{feed.type}</span>
                      <span>•</span>
                      <span>{feed.iocs.toLocaleString()} IOCs</span>
                    </div>
                  </div>
                  <div className="feed-update">{feed.lastUpdate}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Matches Chart */}
          <div className="intel-panel">
            <div className="panel-header">
              <h3><Activity className="w-4 h-4 text-orange-400" /> Threat Matches (24h)</h3>
            </div>
            <div className="chart-container-sm">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="matches" stroke="#f97316" fillOpacity={1} fill="url(#colorMatches)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Matches */}
        <div className="intel-right-col">
          <div className="intel-panel full-height">
            <div className="panel-header">
              <h3><AlertTriangle className="w-4 h-4 text-red-400" /> Recent IOC Matches</h3>
              <button className="btn-text">View All</button>
            </div>
            <table className="intel-table">
              <thead>
                <tr>
                  <th>IOC</th>
                  <th>Type</th>
                  <th>Threat / Source</th>
                  <th>Confidence</th>
                  <th>Affected Asset</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matches.map(match => (
                  <tr key={match.id}>
                    <td className="mono text-red-300">{match.ioc}</td>
                    <td><span className="type-badge">{match.type}</span></td>
                    <td>
                      <div className="threat-name">{match.threat}</div>
                      <div className="threat-source">{match.source}</div>
                    </td>
                    <td>
                      <div className="confidence-bar">
                        <div 
                          className={`confidence-fill ${match.confidence > 80 ? 'high' : 'med'}`}
                          style={{width: `${match.confidence}%`}}
                        ></div>
                      </div>
                      <span className="confidence-text">{match.confidence}%</span>
                    </td>
                    <td className="mono text-blue-300">{match.asset}</td>
                    <td className="text-gray-400">{match.time}</td>
                    <td><ExternalLink className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white" /></td>
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

function Activity(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
