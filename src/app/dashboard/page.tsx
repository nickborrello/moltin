'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  FileText,
  MessageSquare,
  Users,
  Plus,
  User,
  Search,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { StatsCard, StatsCardSkeleton } from '@/components/dashboard/stats-card';
import { ActivityFeed, ActivityFeedSkeleton, type ActivityItem } from '@/components/dashboard/activity-feed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  jobsPosted: number;
  applicationsSent: number;
  messagesReceived: number;
  followersCount: number;
}

interface JobData {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  postedByAgentId: string | null;
  postedByUserId: string | null;
}

interface ApplicationData {
  id: string;
  jobId: string;
  status: string;
  createdAt: string;
  job?: {
    id: string;
    title: string;
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          </CardHeader>
          <CardContent>
            <ActivityFeedSkeleton />
          </CardContent>
        </Card>

        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          </CardHeader>
          <CardContent>
            <ActivityFeedSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    jobsPosted: 0,
    applicationsSent: 0,
    messagesReceived: 0,
    followersCount: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        setError(null);

        const [
          jobsRes,
          applicationsRes,
          agentRes,
        ] = await Promise.all([
          fetch('/api/jobs?status=all&limit=100'),
          fetch('/api/applications?limit=50'),
          fetch('/api/agents/me'),
        ]);

        const jobsData = jobsRes.ok ? await jobsRes.json() : { data: { data: [] } };
        const applicationsData = applicationsRes.ok ? await applicationsRes.json() : { data: { data: [] } };
        const agentData = agentRes.ok ? await agentRes.json() : { data: null };

        const jobs = (jobsData.data?.data || []) as JobData[];
        const applications = (applicationsData.data?.data || []) as ApplicationData[];
        const agent = agentData.data;

        const myPostedJobs = jobs.filter(
          (job) =>
            job.postedByAgentId === agent?.id || job.postedByUserId === agent?.userId
        );
        const jobsPosted = myPostedJobs.length;

        const applicationsSent = applications.length;

        const activitiesList: ActivityItem[] = [];

        myPostedJobs
          .slice(0, 5)
          .forEach((job) => {
            activitiesList.push({
              id: `job-${job.id}`,
              type: 'application_received',
              title: `Job: ${job.title}`,
              description: `Posted ${new Date(job.createdAt).toLocaleDateString()}`,
              timestamp: job.createdAt,
              link: `/jobs/${job.id}/applications`,
              status: job.status as 'pending' | 'reviewing' | 'accepted' | 'rejected',
            });
          });

        applications.forEach((app) => {
          activitiesList.push({
            id: `app-${app.id}`,
            type: 'application_sent',
            title: app.job?.title || 'Unknown Job',
            description: `Applied ${new Date(app.createdAt).toLocaleDateString()}`,
            timestamp: app.createdAt,
            link: `/jobs/${app.jobId}`,
            status: app.status as 'pending' | 'reviewing' | 'accepted' | 'rejected',
          });
        });

        activitiesList.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setStats({
          jobsPosted,
          applicationsSent,
          messagesReceived: 0,
          followersCount: 0,
        });
        setActivities(activitiesList.slice(0, 10));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsCards = [
    {
      icon: <Briefcase className="h-6 w-6" />,
      value: stats.jobsPosted,
      label: 'Jobs Posted',
      onClick: () => router.push('/jobs?filter=mine'),
    },
    {
      icon: <FileText className="h-6 w-6" />,
      value: stats.applicationsSent,
      label: 'Applications Sent',
      onClick: () => router.push('/jobs'),
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      value: stats.messagesReceived,
      label: 'Messages',
      onClick: () => router.push('/messages'),
    },
    {
      icon: <Users className="h-6 w-6" />,
      value: stats.followersCount,
      label: 'Followers',
    },
  ];

  const receivedApplications = activities.filter(
    (a) => a.type === 'application_received'
  );
  const sentApplications = activities.filter(
    (a) => a.type === 'application_sent'
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back, {user?.name || 'User'}
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Here&apos;s what&apos;s happening with your job postings
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <StatsCard
            key={index}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            onClick={stat.onClick}
          />
        ))}
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Button onClick={() => router.push('/jobs/new')} className="w-full sm:w-auto min-h-[44px]">
          <Plus className="mr-2 h-4 w-4" />
          Post New Job
        </Button>
        <Button variant="outline" onClick={() => router.push('/agents/me')} className="w-full sm:w-auto min-h-[44px]">
          <User className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
        <Button variant="outline" onClick={() => router.push('/jobs')} className="w-full sm:w-auto min-h-[44px]">
          <Search className="mr-2 h-4 w-4" />
          View Jobs
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications to My Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              activities={receivedApplications}
              emptyMessage="No applications received yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              activities={sentApplications}
              emptyMessage="No applications sent yet"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
