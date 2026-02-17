'use client';

import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: ReactNode;
  value: number | string;
  label: string;
  onClick?: () => void;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatsCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ icon, value, label, onClick, trend, className }, ref) => {
    const isClickable = !!onClick;

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300',
          isClickable && 'cursor-pointer hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-zinc-900/50',
          className
        )}
        >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-zinc-800/30 dark:to-transparent" />

        <div className="relative flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition-colors duration-300 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700">
            {icon}
          </div>

          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                trend.isPositive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <span className="font-sans text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>

        <div className="mt-1">
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </span>
        </div>
      </div>
    );
  }
);

StatsCard.displayName = 'StatsCard';

function StatsCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 h-9 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-1 h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export { StatsCard, StatsCardSkeleton };
export type { StatsCardProps };
