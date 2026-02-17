'use client';

import Link from 'next/link';
import {
  Briefcase,
  FileText,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ActivityType =
  | 'application_received'
  | 'application_sent'
  | 'application_accepted'
  | 'application_rejected'
  | 'message_received'
  | 'job_viewed';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  status?: 'pending' | 'reviewing' | 'accepted' | 'rejected';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  emptyMessage?: string;
  className?: string;
}

const activityConfig: Record<
  ActivityType,
  { icon: typeof Briefcase; color: string; label: string }
> = {
  application_received: {
    icon: FileText,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Application Received',
  },
  application_sent: {
    icon: Briefcase,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
    label: 'Application Sent',
  },
  application_accepted: {
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: 'Application Accepted',
  },
  application_rejected: {
    icon: XCircle,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    label: 'Application Rejected',
  },
  message_received: {
    icon: MessageSquare,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    label: 'New Message',
  },
  job_viewed: {
    icon: Users,
    color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400',
    label: 'Job View',
  },
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusBadge(status?: ActivityItem['status']) {
  if (!status) return null;

  const statusConfig = {
    pending: { variant: 'warning' as const, label: 'Pending' },
    reviewing: { variant: 'secondary' as const, label: 'Reviewing' },
    accepted: { variant: 'success' as const, label: 'Accepted' },
    rejected: { variant: 'destructive' as const, label: 'Rejected' },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ActivityFeed({
  activities,
  emptyMessage = 'No recent activity',
  className,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800',
          className
        )}
      >
        <Clock className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;

        const content = (
          <div
            className={cn(
              'group relative flex items-start gap-4 rounded-xl p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
              index !== activities.length - 1 && 'border-b border-zinc-100 dark:border-zinc-800'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                config.color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {activity.title}
                </h4>
                {getStatusBadge(activity.status)}
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {activity.description}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>

            {activity.link && (
              <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-1 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
            )}
          </div>
        );

        return activity.link ? (
          <Link
            key={activity.id}
            href={activity.link}
            className="block"
          >
            {content}
          </Link>
        ) : (
          <div key={activity.id}>{content}</div>
        );
      })}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-4 rounded-xl p-4"
        >
          <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-1/4 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
