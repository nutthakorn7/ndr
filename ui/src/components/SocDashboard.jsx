import React, { useState, useEffect } from 'react';
import { 
  Activity, Clock, Users, AlertCircle, CheckCircle, 
  TrendingUp, TrendingDown, Globe, Shield, Target 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import api from '../utils/api';
import { mockSocAlertTrend, mockSocWorkload, mockSocSources } from '../utils/mockData';
import './SocDashboard.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function SocDashboard() {
  const [stats, setStats] = useState({
    openCritical: 12,
    mttr: '18m',
    analystsOnline: '4/6',
    slaCompliance: 98.5
  });
  const [alertTrendData, setAlertTrendData] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSocData = async () => {
      setLoading(true);
      try {
        // Try to fetch real SOC metrics
        const socMetrics = await api.getSocMetrics();
        const dashboardStats = await api.getDashboardStats();
        
        if (socMetrics || dashboardStats) {
          // Update stats from API
          setStats({
            openCritical: socMetrics?.open_critical || dashboardStats?.summary?.critical_alerts || 12,
            mttr: socMetrics?.mean_time_to_respond || '18m',
            analystsOnline: socMetrics?.analysts_online || '4/6',
            slaCompliance: socMetrics?.sla_compliance || 98.5
          });
          
          // For chart data, use mock for now
          // TODO: Add when backend provides time-series data
          throw new Error('Using mock chart data');
        } else {
          throw new Error('No SOC data available');
        }
      } catch (error) {
        console.warn('Failed to load SOC metrics from API, using mock data:', error);
        
        // Mock Data for Charts
        setAlertTrendData(mockSocAlertTrend);
        setWorkloadData(mockSocWorkload);
        setSourceData(mockSocSources);
      } finally {
        setLoading(false);
      }
    };
    
    loadSocData();
  }, []);

  return (
    <div className="soc-dashboard">
      {/* Header Stats */}
      <div className="soc-header-grid">
        <div className="soc-stat-card critical">
          <div className="stat-icon">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.openCritical}</div>
            <div className="stat-label">Open Critical Incidents</div>
            <div className="stat-trend down">↓ 2 from last hour</div>
          </div>
        </div>
        <div className="soc-stat-card warning">
          <div className="stat-icon">
            <Clock className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.mttr}</div>
            <div className="stat-label">Mean Time to Respond</div>
            <div className="stat-trend up">↑ 2m vs target</div>
          </div>
        </div>
        <div className="soc-stat-card info">
          <div className="stat-icon">
            <Users className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.analystsOnline}</div>
            <div className="stat-label">Analysts Online</div>
            <div className="stat-trend neutral">Shift A</div>
          </div>
        </div>
        <div className="soc-stat-card success">
          <div className="stat-icon">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.slaCompliance}%</div>
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
            <div className="world-map-container">
              <svg viewBox="0 0 900 450" className="world-map-svg" preserveAspectRatio="xMidYMid meet">
                {/* More realistic world map continents */}
                <g className="continents">
                  {/* North America */}
                  <path d="M 120,100 L 140,85 L 155,80 L 165,75 L 180,70 L 195,75 L 210,80 L 220,90 L 225,105 L 230,120 L 228,135 L 220,150 L 210,165 L 200,175 L 185,180 L 170,178 L 155,172 L 145,165 L 135,155 L 128,140 L 125,125 L 122,110 Z
                    M 160,180 L 165,185 L 172,195 L 178,205 L 180,215 L 178,225 L 172,230 L 165,228 L 158,223 L 155,215 L 154,205 L 156,195 L 158,188 Z" 
                    fill="#1e40af" opacity="0.4" stroke="#3b82f6" strokeWidth="1.5"/>
                  
                  {/* South America */}
                  <path d="M 195,230 L 205,235 L 215,245 L 220,260 L 223,280 L 223,300 L 220,320 L 215,335 L 208,345 L 198,350 L 188,348 L 180,340 L 175,328 L 172,315 L 170,300 L 168,285 L 168,270 L 170,255 L 175,243 L 182,235 L 188,232 Z" 
                    fill="#1e40af" opacity="0.4" stroke="#3b82f6" strokeWidth="1.5"/>
                  
                  {/* Europe */}
                  <path d="M 420,100 L 435,95 L 450,93 L 465,95 L 480,100 L 492,108 L 500,118 L 502,130 L 498,142 L 488,150 L 475,155 L 460,157 L 445,155 L 432,148 L 422,138 L 418,125 L 418,112 Z" 
                    fill="#1e40af" opacity="0.4" stroke="#3b82f6" strokeWidth="1.5"/>
                  
                  {/* Africa */}
                  <path d="M 440,165 L 455,162 L 470,163 L 485,168 L 500,178 L 512,195 L 520,215 L 523,235 L 522,255 L 518,275 L 510,295 L 498,310 L 483,320 L 465,323 L 448,320 L 432,310 L 420,295 L 412,278 L 408,260 L 407,242 L 410,225 L 418,208 L 428,190 L 435,178 Z" 
                    fill="#1e40af" opacity="0.4" stroke="#3b82f6" strokeWidth="1.5"/>
                  
                  {/* Asia */}
                  <path d="M 510,95 L 535,90 L 560,88 L 585,90 L 610,95 L 635,102 L 660,110 L 685,120 L 705,133 L 720,148 L 728,165 L 730,182 L 725,200 L 715,215 L 700,228 L 680,238 L 655,243 L 630,243 L 605,238 L 580,230 L 560,220 L 545,208 L 535,195 L 528,180 L 525,165 L 525,150 L 528,135 L 535,120 L 545,108 L 560,100 L 580,95 L 600,93 Z
                    M 735,145 L 745,150 L 755,158 L 760,168 L 758,178 L 750,183 L 740,180 L 735,172 L 733,162 L 735,152 Z" 
                    fill="#1e40af" opacity="0.4" stroke="#3b82f6" strokeWidth="1.5"/>
                  
                  {/* Australia */}
                  <path d="M 680,290 L 700,288 L 720,290 L 740,295 L 755,303 L 765,315 L 768,328 L 765,340 L 755,348 L 740,352 L 720,353 L 700,350 L 685,343 L 673,333 L 668,320 L 668,308 L 672,298 Z" 
                    fill="#1e40af" opacity="0.4" stroke="#3b82f6" strokeWidth="1.5"/>
                  
                  {/* Antarctica (simplified) */}
                  <path d="M 150,390 L 250,385 L 350,387 L 450,390 L 550,388 L 650,390 L 750,392 L 750,410 L 650,415 L 550,413 L 450,415 L 350,413 L 250,415 L 150,413 Z" 
                    fill="#1e40af" opacity="0.2" stroke="#3b82f6" strokeWidth="1"/>
                </g>
                
                {/* Threat indicators with realistic locations */}
                <g className="threat-indicators">
                  {/* USA - Critical */}
                  <circle cx="165" cy="130" r="5" fill="#ef4444" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="165" cy="130" r="10" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6">
                    <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* London/UK - High */}
                  <circle cx="445" cy="120" r="4" fill="#f59e0b" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="445" cy="120" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5">
                    <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* China/Asia - Critical */}
                  <circle cx="650" cy="160" r="5" fill="#ef4444" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx="650" cy="160" r="10" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6">
                    <animate attributeName="r" values="10;20;10" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* Russia */}
                  <circle cx="580" cy="110" r="3.5" fill="#f59e0b" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2.8s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* Nigeria/Africa - Medium */}
                  <circle cx="455" cy="240" r="3" fill="#3b82f6" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* Brazil - Medium */}
                  <circle cx="200" cy="290" r="3" fill="#3b82f6" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="3.2s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* Australia - Low */}
                  <circle cx="720" cy="320" r="3" fill="#10b981" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="3.5s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* India */}
                  <circle cx="600" cy="195" r="3" fill="#3b82f6" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2.7s" repeatCount="indefinite"/>
                  </circle>
                  
                  {/* Japan */}
                  <circle cx="745" cy="155" r="3.5" fill="#f59e0b" className="threat-dot">
                    <animate attributeName="opacity" values="1;0.3;1" dur="2.3s" repeatCount="indefinite"/>
                  </circle>
                </g>
                
                {/* Grid overlay */}
                <defs>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.2"/>
                  </pattern>
                  <linearGradient id="ocean" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity="1" />
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <rect width="900" height="450" fill="url(#ocean)" />
                <rect width="900" height="450" fill="url(#grid)" />
              </svg>
              
              {/* Legend */}
              <div className="map-legend">
                <div className="legend-item">
                  <span className="legend-dot critical"></span>
                  <span>Critical</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot high"></span>
                  <span>High</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot medium"></span>
                  <span>Medium</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot low"></span>
                  <span>Low</span>
                </div>
              </div>
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
