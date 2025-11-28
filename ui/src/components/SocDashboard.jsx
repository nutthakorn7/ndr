import React from 'react';
import { 
  Activity, Clock, Users, AlertCircle, CheckCircle, 
  TrendingUp, TrendingDown, Globe, Shield, Target 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import './SocDashboard.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function SocDashboard() {
  // Mock Data for Charts
  const alertTrendData = [
    { time: '00:00', critical: 2, high: 5, medium: 12 },
    { time: '04:00', critical: 1, high: 3, medium: 8 },
    { time: '08:00', critical: 5, high: 12, medium: 25 },
    { time: '12:00', critical: 8, high: 15, medium: 35 },
    { time: '16:00', critical: 6, high: 10, medium: 28 },
    { time: '20:00', critical: 3, high: 7, medium: 15 },
    { time: '23:59', critical: 4, high: 6, medium: 18 },
  ];

  const workloadData = [
    { name: 'Analyst A', active: 5, resolved: 12 },
    { name: 'Analyst B', active: 8, resolved: 8 },
    { name: 'Analyst C', active: 3, resolved: 15 },
    { name: 'Analyst D', active: 6, resolved: 10 },
  ];

  const sourceData = [
    { name: 'Firewall', value: 45 },
    { name: 'IDS/IPS', value: 25 },
    { name: 'Endpoint', value: 20 },
    { name: 'Email', value: 10 },
  ];

  return (
    <div className="soc-dashboard">
      {/* Header Stats */}
      <div className="soc-header-grid">
        <div className="soc-stat-card critical">
          <div className="stat-icon">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">12</div>
            <div className="stat-label">Open Critical Incidents</div>
            <div className="stat-trend down">↓ 2 from last hour</div>
          </div>
        </div>
        <div className="soc-stat-card warning">
          <div className="stat-icon">
            <Clock className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">18m</div>
            <div className="stat-label">Mean Time to Respond</div>
            <div className="stat-trend up">↑ 2m vs target</div>
          </div>
        </div>
        <div className="soc-stat-card info">
          <div className="stat-icon">
            <Users className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">4/6</div>
            <div className="stat-label">Analysts Online</div>
            <div className="stat-trend neutral">Shift A</div>
          </div>
        </div>
        <div className="soc-stat-card success">
          <div className="stat-icon">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">98.5%</div>
            <div className="stat-label">SLA Compliance</div>
            <div className="stat-trend up">↑ 0.5% this week</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="soc-content-grid">
        {/* Left Column: Charts */}
        <div className="soc-col-main">
          {/* Alert Trend */}
          <div className="soc-panel">
            <div className="panel-header">
              <h3><Activity className="w-5 h-5 text-blue-400" /> 24h Alert Volume</h3>
            </div>
            <div className="chart-container-lg">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertTrendData}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="url(#colorCritical)" />
                  <Area type="monotone" dataKey="high" stackId="1" stroke="#f59e0b" fill="url(#colorHigh)" />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Analyst Workload & Sources */}
          <div className="soc-row-split">
            <div className="soc-panel">
              <div className="panel-header">
                <h3><Users className="w-5 h-5 text-purple-400" /> Analyst Workload</h3>
              </div>
              <div className="chart-container-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    />
                    <Legend />
                    <Bar dataKey="active" name="Active Cases" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="resolved" name="Resolved (Today)" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="soc-panel">
              <div className="panel-header">
                <h3><Target className="w-5 h-5 text-cyan-400" /> Alerts by Source</h3>
              </div>
              <div className="chart-container-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Feed & Status */}
        <div className="soc-col-side">
          {/* Global Threat Map Placeholder */}
          <div className="soc-panel map-panel">
            <div className="panel-header">
              <h3><Globe className="w-5 h-5 text-green-400" /> Threat Origins</h3>
            </div>
            <div className="map-placeholder">
              <div className="map-dot" style={{top: '30%', left: '20%'}}></div>
              <div className="map-dot" style={{top: '40%', left: '70%'}}></div>
              <div className="map-dot pulse" style={{top: '25%', left: '60%'}}></div>
              <div className="map-grid"></div>
              <span>Live Threat Map Visualization</span>
            </div>
          </div>

          {/* Active Incidents List */}
          <div className="soc-panel flex-1">
            <div className="panel-header">
              <h3><Shield className="w-5 h-5 text-red-400" /> Priority Incidents</h3>
            </div>
            <div className="incident-list">
              {[
                { id: 'INC-2024-001', title: 'Ransomware Activity', severity: 'critical', assignee: 'Analyst A', time: '10m' },
                { id: 'INC-2024-002', title: 'Data Exfiltration', severity: 'high', assignee: 'Analyst B', time: '45m' },
                { id: 'INC-2024-003', title: 'Brute Force Attack', severity: 'high', assignee: 'Unassigned', time: '1h' },
                { id: 'INC-2024-004', title: 'Malware Download', severity: 'medium', assignee: 'Analyst C', time: '2h' },
              ].map((inc, i) => (
                <div key={i} className="incident-item">
                  <div className={`severity-bar ${inc.severity}`}></div>
                  <div className="incident-content">
                    <div className="incident-top">
                      <span className="incident-id">{inc.id}</span>
                      <span className="incident-time">{inc.time} ago</span>
                    </div>
                    <div className="incident-title">{inc.title}</div>
                    <div className="incident-assignee">
                      <Users className="w-3 h-3" /> {inc.assignee}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
