import { LucideIcon } from 'lucide-react';
import Card from './common/Card';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'amber' | 'emerald';
}

export default function StatCard({ title, value, trend, trendUp, icon: Icon, color }: StatCardProps) {
  // Map legacy colors to new Design System tokens if needed, or use direct mapping
  const colorMap = {
    blue: 'text-primary',
    red: 'text-error',
    amber: 'text-warning',
    emerald: 'text-success'
  };

  const bgMap = {
    blue: 'bg-primary/10',
    red: 'bg-error/10',
    amber: 'bg-warning/10',
    emerald: 'bg-success/10'
  };

  return (
    <Card className="h-full transition-all duration-200 hover:bg-surface-3 hover:shadow-elevation-2 cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-md ${bgMap[color]} ${colorMap[color]} transition-colors group-hover:bg-opacity-20`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trendUp ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-normal text-gray-100 tracking-tight mb-1">{value}</div>
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</div>
      </div>
    </Card>
  );
}
