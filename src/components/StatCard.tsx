import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'primary' | 'accent' | 'warning' | 'danger' | 'success';
  subtitle?: string;
  loading?: boolean;
}

const COLORS = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
  accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/20 dark:text-warning-400',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400',
  success: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
};

export default function StatCard({ title, value, icon, color, subtitle, loading }: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mt-2" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          )}
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${COLORS[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
