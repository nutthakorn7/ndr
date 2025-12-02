import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Search, Bell, Shield, Network, Database, Lock,
  Globe, Activity, FileText, Zap, Settings,
  AlertTriangle, Server, Eye, Target, Cpu, Link, Monitor, Share2
} from 'lucide-react';
import './Dashboard.css';

// Core components (loaded immediately)
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ThemeToggle from '../components/ThemeToggle';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import StatCard from '../components/StatCard';

// Lazy load heavy components
const AlertModal = lazy(() => import('../components/AlertModal'));
const EventSearch = lazy(() => import('../components/EventSearch'));
const NetworkTopology = lazy(() => import('../components/NetworkTopology'));
const IncidentBoard = lazy(() => import('../components/IncidentBoard'));
const RealTimeFeed = lazy(() => import('../components/RealTimeFeed'));
const NetworkAnalytics = lazy(() => import('../components/NetworkAnalytics'));
import { api, DashboardAnalytics } from '../services/api';
const SensorManagement = lazy(() => import('../components/SensorManagement'));
const AssetDiscovery = lazy(() => import('../components/AssetDiscovery'));
const ThreatIntelligence = lazy(() => import('../components/ThreatIntelligence'));
const AdvancedDetection = lazy(() => import('../components/AdvancedDetection'));
const SSLAnalysis = lazy(() => import('../components/SSLAnalysis'));
const SocDashboard = lazy(() => import('../components/SocDashboard'));
const FileAnalysis = lazy(() => import('../components/FileAnalysis'));
const DNSIntelligence = lazy(() => import('../components/DNSIntelligence'));
const SoarIntegration = lazy(() => import('../components/SoarIntegration'));
const SettingsPanel = lazy(() => import('../components/SettingsPanel'));
const UserProfile = lazy(() => import('../components/UserProfile'));

import { useParams, useNavigate } from 'react-router-dom';

interface DashboardProps {
  initialSearch?: boolean;
}

function Dashboard({ initialSearch = false }: DashboardProps) {
  const { addToast } = useToast();
  const { tab } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>(tab || 'overview');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(initialSearch);

  // Sync URL with activeTab
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Update URL when switching tabs
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`?tab=${tabId}`);
  };

  const handleCreateIncident = (event: any) => {
    addToast(`Creating incident from event #${event.id}`, 'info');
    // In a real app, this would pass data to the incident form
    handleTabChange('incidents');
  };

  // Navigation Configurations
  const [stats, setStats] = useState<DashboardAnalytics['summary']>({
    total_events: 0,
    critical_alerts: 0,
    open_alerts: 0,
    assets_count: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardAnalytics();
        setStats(data.summary);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
        // Fallback or keep 0
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  // Real-time Stats Simulation (Removed as per instruction)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setStats(prev => {
  //       const newEps = Math.floor(2200 + Math.random() * 400);
  //       let newCritical = prev.criticalAlerts;
  //       if (Math.random() > 0.9) {
  //         const change = Math.random() > 0.5 ? 1 : -1;
  //         newCritical = Math.max(0, Math.min(20, prev.criticalAlerts + change));
  //       }
  //       return {
  //         ...prev,
  //         eps: newEps,
  //         criticalAlerts: newCritical,
  //         totalEvents: prev.totalEvents + Math.floor(newEps * 2)
  //       };
  //     });
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, []);
  
  const [selectedAlertId, setSelectedAlertId] = useState<string | number | null>(null);

  // Navigation Configuration
  const navigation = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Shield,
      views: [
        { id: 'overview', name: 'Security Posture', icon: Activity },
        { id: 'soc', name: 'SOC Wallboard', icon: Monitor },
        { id: 'incidents', name: 'Incident Response', icon: Shield }
      ]
    },
    {
      id: 'network',
      label: 'Network',
      icon: Network,
      views: [
        { id: 'network', name: 'Traffic Analytics', icon: Activity },
        { id: 'topology', name: 'Network Map', icon: Share2 },
        { id: 'dns', name: 'DNS Intelligence', icon: Globe },
        { id: 'ssl', name: 'SSL/TLS Analysis', icon: Lock }
      ]
    },
    {
      id: 'threats',
      label: 'Threats',
      icon: Target,
      views: [
        { id: 'threats', name: 'Threat Intel', icon: Target },
        { id: 'detection', name: 'Detection Rules', icon: Eye },
        { id: 'files', name: 'File Analysis', icon: FileText }
      ]
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: Server,
      views: [
        { id: 'assets', name: 'Asset Inventory', icon: Database },
        { id: 'sensors', name: 'Sensor Fleet', icon: Cpu }
      ]
    },
    {
      id: 'response',
      label: 'Response',
      icon: Zap,
      views: [
        { id: 'soar', name: 'Automation', icon: Zap },
        { id: 'siem', name: 'SIEM Connectors', icon: Link }
      ]
    }
  ];

  // Find active category based on activeTab
  const activeCategory = navigation.find(cat => cat.views.some(v => v.id === activeTab)) || navigation[0];

  return (
    <div className="ndr-dashboard">
      {/* Top Navigation */}
      <div className="ndr-nav">
        <div className="nav-left">
          <div className="logo">
            <Shield className="w-6 h-6" style={{color: '#4bc0c0'}} />
            <span className="logo-text">Open NDR</span>
            <span className="logo-subtitle">Network Detection & Response</span>
          </div>
        </div>
        <div className="nav-center">
          <div className="search-bar">
            <Search className="w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search events, alerts, IOCs..." 
              onClick={() => setShowSearch(true)}
            />
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-stat critical">
            <AlertTriangle className="w-4 h-4" />
            <span>{stats.critical_alerts} Critical</span>
          </div>
          <div className="nav-stat">
            <Activity className="w-4 h-4" />
            <span>{(stats.total_events / 1000000).toFixed(1)}M Events</span> {/* Adjusted to use total_events */}
          </div>
          <ThemeToggle />
          <KeyboardShortcuts />
          <button 
            className="nav-icon" 
            onClick={() => addToast('No new notifications', 'info')}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button 
            className="nav-icon" 
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            className="user-avatar"
            onClick={() => setShowProfile(!showProfile)}
            title="User Profile"
          >
            AD
          </button>
        </div>
      </div>

      {/* Main Category Navigation */}
      <div className="ndr-tabs">
        {navigation.map(cat => (
          <button 
            key={cat.id}
            className={`tab-btn ${activeCategory.id === cat.id ? 'active' : ''}`}
            onClick={() => {
              // When switching category, default to the first view in that category
              handleTabChange(cat.views[0].id);
              setShowSearch(false);
            }}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sub-Navigation (Only if category has multiple views) */}
      {activeCategory.views.length > 1 && (
        <div className="ndr-sub-tabs">
          {activeCategory.views.map(view => (
            <button
              key={view.id}
              className={`sub-tab-btn ${activeTab === view.id ? 'active' : ''}`}
              onClick={() => handleTabChange(view.id)}
            >
              <view.icon className="w-3 h-3" />
              {view.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="ndr-content">
        {showSearch ? (
          <div className="view-container">
            <div className="flex-between">
              <h2>Event Search & Hunting</h2>
              <button className="btn-secondary" onClick={() => setShowSearch(false)}>
                Close Search
              </button>
            </div>
            <Suspense fallback={<LoadingSpinner size="medium" message="Loading search..." />}>
              <EventSearch />
            </Suspense>
          </div>
        ) : (
          <div className="view-container">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="info-banner success">
                  <Shield className="w-4 h-4" />
                  System Status: All sensors online. Detection engine active. Last update: Just now
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid">
                  <StatCard 
                    title="Total Events" 
                    value={stats.total_events.toLocaleString()} 
                    trend="+12%" 
                    trendUp={true} 
                    icon={Activity} 
                    color="blue" 
                  />
                  <StatCard 
                    title="Critical Alerts" 
                    value={stats.critical_alerts.toString()} 
                    trend="+2" 
                    trendUp={false} 
                    icon={AlertTriangle} 
                    color="red" 
                  />
                  <StatCard 
                    title="Open Alerts" 
                    value={stats.open_alerts.toString()} 
                    trend="-1" 
                    trendUp={true} 
                    icon={Shield} 
                    color="amber" 
                  />
                  <StatCard 
                    title="Active Assets" 
                    value={stats.assets_count.toString()} 
                    trend="+3" 
                    trendUp={true} 
                    icon={Server} 
                    color="emerald" 
                  />
                </div>

                {/* Main Dashboard Grid */}
                <div className="panel-grid">
                  {/* Recent Alerts */}
                  <div className="panel">
                    <h3><AlertTriangle className="w-5 h-5 text-red-400" /> Recent Critical Alerts</h3>
                    <div className="alert-list">
                      {[
                        { id: 'alert-1', title: 'Suspicious PowerShell Activity', severity: 'critical', ip: '192.168.1.105', time: '2m ago' },
                        { id: 'alert-2', title: 'Potential C2 Communication', severity: 'high', ip: '192.168.1.112', time: '15m ago' },
                        { id: 'alert-3', title: 'SMB Brute Force Attempt', severity: 'high', ip: '192.168.1.200', time: '45m ago' },
                        { id: 'alert-4', title: 'DNS Tunneling Detected', severity: 'medium', ip: '192.168.1.15', time: '1h ago' },
                      ].map((alert, idx) => (
                        <div key={idx} className="alert-item">
                          <div className={`alert-indicator ${alert.severity}`}></div>
                          <div className="alert-content">
                            <div className="alert-title">{alert.title}</div>
                            <div className="alert-meta">
                              <span className="alert-ip">{alert.ip}</span>
                              <span>•</span>
                              <span>{alert.time}</span>
                            </div>
                          </div>
                          <button 
                            className="btn-investigate"
                            onClick={() => setSelectedAlertId(alert.id)}
                          >
                            Investigate
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Real-Time Feed & MITRE */}
                  <div className="feed-container">
                    <Suspense fallback={<LoadingSpinner size="small" />}>
                      <RealTimeFeed onCreateIncident={handleCreateIncident} />
                    </Suspense>
                    
                    <div className="panel">
                      <h3><Target className="w-5 h-5 text-purple-400" /> MITRE ATT&CK Coverage</h3>
                      <div className="mitre-mini">
                        {[
                          { name: 'Initial Access', count: 12, color: '#ef4444' },
                          { name: 'Execution', count: 45, color: '#f59e0b' },
                          { name: 'Persistence', count: 8, color: '#3b82f6' },
                          { name: 'Privilege Escalation', count: 5, color: '#10b981' },
                          { name: 'Command and Control', count: 23, color: '#8b5cf6' },
                        ].map((tactic, idx) => (
                          <div key={idx} className="mitre-item">
                            <div className="mitre-label">{tactic.name}</div>
                            <div className="mitre-bar" style={{width: `${tactic.count * 2}px`, background: tactic.color}}></div>
                            <div className="mitre-count">{tactic.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Feature Tabs */}
            {activeTab === 'soc' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading SOC Dashboard..." />}>
                <SocDashboard />
              </Suspense>
            )}

            {/* Incident Response Tab */}
            {activeTab === 'incidents' && (
              <div className="view-container">
                <Suspense fallback={<LoadingSpinner size="medium" message="Loading Incidents..." />}>
                  <IncidentBoard />
                </Suspense>
              </div>
            )}

            {activeTab === 'network' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading Network Analytics..." />}>
                <NetworkAnalytics />
              </Suspense>
            )}

            {activeTab === 'sensors' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading Sensors..." />}>
                <SensorManagement />
              </Suspense>
            )}

            {activeTab === 'assets' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading Assets..." />}>
                <AssetDiscovery />
              </Suspense>
            )}

            {activeTab === 'threats' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading Threat Intel..." />}>
                <ThreatIntelligence />
              </Suspense>
            )}

            {activeTab === 'detection' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading Detection Rules..." />}>
                <AdvancedDetection />
              </Suspense>
            )}

            {activeTab === 'ssl' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading SSL Analysis..." />}>
                <SSLAnalysis />
              </Suspense>
            )}

            {activeTab === 'files' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading File Analysis..." />}>
                <FileAnalysis />
              </Suspense>
            )}

            {activeTab === 'dns' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading DNS Intelligence..." />}>
                <DNSIntelligence />
              </Suspense>
            )}

            {activeTab === 'soar' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading Playbooks..." />}>
                <SoarIntegration view="playbooks" />
              </Suspense>
            )}

            {activeTab === 'siem' && (
              <Suspense fallback={<LoadingSpinner size="medium" message="Loading SIEM Connectors..." />}>
                <SoarIntegration view="connectors" />
              </Suspense>
            )}
            {/* Other Tabs (Placeholders for now) */}
            {!['overview', 'soc', 'network', 'sensors', 'assets', 'threats', 'detection', 'ssl', 'files', 'dns', 'soar', 'siem', 'topology', 'incidents'].includes(activeTab) && (
              <div className="panel">
                <h3>{navigation.flatMap(c => c.views).find(t => t.id === activeTab)?.name}</h3>
                <p className="text-gray-400 mt-4">
                  This module is connected to the backend services.
                  Data visualization for {activeTab} will be rendered here.
                </p>
                <div className="mt-8 p-8 border border-dashed border-gray-700 rounded-lg text-center">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p>Waiting for live data stream...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="ndr-statusbar">
        <div className="status-left">
          <div className="status-item">
            <div className="status-dot online"></div>
            <span>System Online</span>
          </div>
          <div className="status-item">
            <Database className="w-3 h-3" />
            <span>OpenSearch: Connected</span>
          </div>
          <div className="status-item">
            <Activity className="w-3 h-3" />
            <span>Zeek: Active</span>
          </div>
        </div>
        <div className="status-right">
          <span>Version 2.4.0-beta</span>
          <span>Latency: 12ms</span>
        </div>
      </div>

      {/* Modals & Overlays */}
      {selectedAlertId && (
        <Suspense fallback={<div />}>
          <AlertModal alertId={String(selectedAlertId)} onClose={() => setSelectedAlertId(null)} />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={<div />}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
      {showProfile && (
        <Suspense fallback={<div />}>
          <UserProfile onClose={() => setShowProfile(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default Dashboard;
