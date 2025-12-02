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
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20 border-blue-500/50',
    red: 'text-red-400 bg-red-500/20 border-red-500/50',
    amber: 'text-amber-400 bg-amber-500/20 border-amber-500/50',
    emerald: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50'
  };

  return (
    <div className={`stat-card ${colorClasses[color]} border rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-lg bg-slate-900/50">
          <Icon className="w-6 h-6" />
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {trend}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-white mt-2">{value}</div>
        <div className="text-sm text-slate-400">{title}</div>
      </div>
    </div>
  );
}
