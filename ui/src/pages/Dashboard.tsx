import { useState, useEffect, lazy, Suspense } from 'react';
import { Activity, AlertTriangle, Server, Shield } from 'lucide-react';
import './Dashboard.css';

// Core components
import { useToast } from '../components/Toast';
import { FalconLayout } from '../components/crowdstrike/FalconLayout';
import { KpiTile } from '../components/crowdstrike/KpiTile';
import { AlertRow } from '../components/crowdstrike/AlertRow';
import Alerts from './Alerts';
import Card from '../components/common/Card';

// Lazy load heavy components
const NetworkAnalytics = lazy(() => import('../components/NetworkAnalytics'));
const AiChatWidget = lazy(() => import('../components/AiChatWidget'));
const ThreatIntelligence = lazy(() => import('../components/ThreatIntelligence'));
const AttackChainGraph = lazy(() => import('../components/AttackChainGraph'));
const MitreHeatMap = lazy(() => import('../components/MitreHeatMap'));
const AssetDiscovery = lazy(() => import('../components/AssetDiscovery'));
const NetworkTopology = lazy(() => import('../components/NetworkTopology'));
const IncidentBoard = lazy(() => import('../components/IncidentBoard'));
const RuleAnalytics = lazy(() => import('../components/RuleAnalytics'));
const CommandPalette = lazy(() => import('../components/CommandPalette'));
const ThreatHunting = lazy(() => import('./ThreatHunting'));
const LogViewer = lazy(() => import('./LogViewer'));
const SoarIntegration = lazy(() => import('../components/SoarIntegration'));
const EdgeManagement = lazy(() => import('../components/EdgeManagement'));
const SettingsPanel = lazy(() => import('../components/SettingsPanel'));
const ShortcutsHelp = lazy(() => import('../components/ShortcutsHelp'));
const EventTicker = lazy(() => import('../components/EventTicker'));
const WorldMap = lazy(() => import('../components/WorldMap'));
import { api, DashboardAnalytics } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { generateAllRules } from '../utils/mockRules';

interface DashboardProps {
  initialSearch?: boolean;
}

function Dashboard({ initialSearch = false }: DashboardProps) {
  const { addToast } = useToast();
  const { tab } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>(tab || 'dashboard');
  const [stats, setStats] = useState<DashboardAnalytics['summary']>({
    total_events: 0,
    critical_alerts: 0,
    open_alerts: 0,
    assets_count: 0
  });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [networkView, setNetworkView] = useState<'topology' | 'map'>('topology');

  // Sync URL with activeTab
  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`?tab=${tabId}`);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardAnalytics();
        setStats(data.summary);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      }
    };
    fetchStats();
  }, []);

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <FalconLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {/* KPI Row - Dense 4px gap */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        <KpiTile 
          label="Total Events" 
          value={stats.total_events.toLocaleString()} 
          trend="+12%" 
        />
        <KpiTile 
          label="Critical Alerts" 
          value={stats.critical_alerts.toString()} 
          trend="+2" 
          severity="critical"
        />
        <KpiTile 
          label="High Severity" 
          value={stats.open_alerts.toString()} 
          trend="-1" 
          severity="high"
        />
        <KpiTile 
          label="Active Hosts" 
          value={stats.assets_count.toString()} 
          trend="+3" 
          severity="low"
        />
        <KpiTile 
          label="EPS" 
          value="4.2k" 
          trend="Stable" 
        />
      </div>

      {/* Main Content Area - Split View */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
          {/* Traffic Chart (2/3 width) */}
          <div className="lg:col-span-2 h-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-4">
            <div className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-4 tracking-wider">Threat Activity</div>
            <Suspense fallback={<div className="h-full animate-pulse bg-[var(--bg-hover)] rounded" />}>
              <NetworkAnalytics />
            </Suspense>
          </div>

          {/* Recent Alerts (1/3 width) */}
          <div className="h-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded flex flex-col">
            <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
               <div className="text-xs uppercase text-[var(--text-secondary)] font-semibold tracking-wider">Recent Detections</div>
               <button className="text-xs text-[var(--sev-info)] hover:underline" onClick={() => handleTabChange('alerts')}>View All</button>
            </div>
            <div className="flex-1 overflow-y-auto">
               {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                 <AlertRow
                   key={i}
                   severity={i === 1 ? 'critical' : i === 2 ? 'high' : 'medium'}
                   title={i === 1 ? 'Malware Detected' : 'Suspicious Process'}
                   host={`WIN-SRV-0${i}`}
                   time="10m ago"
                   status="NEW"
                 />
               ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <Alerts />
      )}

      {activeTab === 'incidents' && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <IncidentBoard />
          </Suspense>
        </div>
      )}

      {activeTab === 'automation' && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <SoarIntegration />
          </Suspense>
        </div>
      )}

      {activeTab === 'edge' && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <EdgeManagement />
          </Suspense>
        </div>
      )}

      {activeTab === 'hunting' && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <ThreatHunting />
          </Suspense>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <LogViewer />
          </Suspense>
        </div>
      )}

      {activeTab === 'hosts' && (
        <div className="h-full flex flex-col gap-4">
          <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <AssetDiscovery />
          </Suspense>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="h-full flex flex-col gap-4">
          <div className="flex justify-end">
            <div className="flex bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] p-1">
              <button
                onClick={() => setNetworkView('topology')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  networkView === 'topology' 
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Topology
              </button>
              <button
                onClick={() => setNetworkView('map')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  networkView === 'map' 
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Geo Map
              </button>
            </div>
          </div>

          {networkView === 'topology' ? (
            <>
              <div className="h-1/2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-4">
                <div className="text-xs uppercase text-[var(--text-secondary)] font-semibold mb-4 tracking-wider">Traffic Analysis</div>
                <Suspense fallback={<div className="h-full animate-pulse bg-[var(--bg-hover)] rounded" />}>
                  <NetworkAnalytics />
                </Suspense>
              </div>
              <div className="h-1/2">
                <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
                  <NetworkTopology />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="h-full">
              <Suspense fallback={<div className="h-full bg-[var(--bg-panel)] animate-pulse rounded" />}>
                <WorldMap />
              </Suspense>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="h-full flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<div className="h-[400px] bg-[var(--bg-panel)] animate-pulse rounded" />}>
              <ThreatIntelligence />
            </Suspense>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<div className="h-[400px] bg-[var(--bg-panel)] animate-pulse rounded" />}>
              <AttackChainGraph chain={[
                { title: 'Port Scan Detected', severity: 'medium', timestamp: new Date().toISOString(), src_ip: '192.168.1.100', dst_ip: '10.0.0.5' },
                { title: 'Brute Force Attempt', severity: 'high', timestamp: new Date().toISOString(), src_ip: '192.168.1.100', dst_ip: '10.0.0.5' },
                { title: 'Credential Access', severity: 'critical', timestamp: new Date().toISOString(), src_ip: '192.168.1.100', dst_ip: '10.0.0.5' },
                { title: 'Lateral Movement', severity: 'critical', timestamp: new Date().toISOString(), src_ip: '10.0.0.5', dst_ip: '10.0.0.20' },
                { title: 'Data Exfiltration', severity: 'critical', timestamp: new Date().toISOString(), src_ip: '10.0.0.20', dst_ip: '203.0.113.50' }
              ]} />
            </Suspense>
            <Suspense fallback={<div className="h-[400px] bg-[var(--bg-panel)] animate-pulse rounded" />}>
              <MitreHeatMap rules={generateAllRules().slice(0, 500)} />
            </Suspense>
          </div>
          <Suspense fallback={<div className="h-[300px] bg-[var(--bg-panel)] animate-pulse rounded" />}>
            <RuleAnalytics rules={generateAllRules().slice(0, 500)} />
          </Suspense>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Suspense fallback={<div className="h-[400px] bg-[var(--bg-panel)] animate-pulse rounded" />}>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-6">
                <h3 className="text-lg font-semibold mb-4">System Settings</h3>
                <SettingsPanel onClose={() => {}} />
              </div>
            </Suspense>
            <Suspense fallback={<div className="h-[400px] bg-[var(--bg-panel)] animate-pulse rounded" />}>
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-6">
                <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
                <ShortcutsHelp onClose={() => {}} />
              </div>
            </Suspense>
          </div>
        </div>
      )}
      
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
      
      <Suspense fallback={null}>
        <EventTicker />
      </Suspense>

      <Suspense fallback={null}>
        <CommandPalette 
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onNavigate={(tab: string) => {
            handleTabChange(tab);
            setIsPaletteOpen(false);
          }}
        />
      </Suspense>
    </FalconLayout>
  );
}

export default Dashboard;
