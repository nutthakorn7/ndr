import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Activity, AlertTriangle, Server, Shield, Monitor, Network, Target, Eye, FileText, Globe, Lock, Share2
} from 'lucide-react';
import './Dashboard.css';

// Core components
import { useToast } from '../components/Toast';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/StatCard';
import Card from '../components/common/Card';

// Lazy load heavy components
const NetworkAnalytics = lazy(() => import('../components/NetworkAnalytics'));
const AiChatWidget = lazy(() => import('../components/AiChatWidget'));
import { api, DashboardAnalytics } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

interface DashboardProps {
  initialSearch?: boolean;
}

function Dashboard({ initialSearch = false }: DashboardProps) {
  const { addToast } = useToast();
  const { tab } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>(tab || 'overview');
  const [stats, setStats] = useState<DashboardAnalytics['summary']>({
    total_events: 0,
    critical_alerts: 0,
    open_alerts: 0,
    assets_count: 0
  });

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

  return (
    <AppLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Traffic Chart (2/3 width) */}
        <div className="lg:col-span-2 h-full">
          <Suspense fallback={<div className="h-full bg-surface-2 animate-pulse rounded-lg" />}>
            <Card className="h-full" title="Network Traffic Volume">
              <NetworkAnalytics />
            </Card>
          </Suspense>
        </div>

        {/* Recent Alerts (1/3 width) */}
        <div className="h-full">
          <Card className="h-full" title="Critical Incidents">
             <div className="space-y-3">
               {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-start gap-3 p-3 rounded hover:bg-surface-3 cursor-pointer transition-colors border border-transparent hover:border-border-subtle">
                   <div className="w-2 h-2 mt-2 rounded-full bg-error shrink-0" />
                   <div>
                     <div className="text-sm font-medium text-gray-200">Suspicious PowerShell Activity</div>
                     <div className="text-xs text-gray-500 mt-1">Host: WIN-SRV-0{i} • Just now</div>
                   </div>
                 </div>
               ))}
             </div>
          </Card>
        </div>
      </div>
      
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
    </AppLayout>
  );
}

export default Dashboard;
