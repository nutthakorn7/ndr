import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'amber' | 'emerald';
}

export default function StatCard({ title, value, trend, trendUp, icon: Icon, color }: StatCardProps) {
  // Using standard CSS classes to avoid Tailwind purging issues
  const colorClasses = {
    blue: 'stat-card-blue',
    red: 'stat-card-red',
    amber: 'stat-card-amber',
    emerald: 'stat-card-emerald'
  };

  return (
    <div className={`stat-card ${colorClasses[color]} border rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-lg h-full`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${trendUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-white tracking-tight mb-1">{value}</div>
        <div className="text-sm font-medium text-slate-400 tracking-wide uppercase text-opacity-80">{title}</div>
      </div>
    </div>
  );
}
