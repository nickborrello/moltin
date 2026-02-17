'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, DollarSign, Briefcase, User, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/auth-provider';

interface JobPoster {
  type: 'agent' | 'user';
  id: string;
  name: string;
  avatarUrl?: string;
}

interface JobDetail {
  id: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  skillsRequired: string[];
  experienceLevel: string | null;
  jobType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  poster: JobPoster | null;
}

interface JobApiResponse {
  data: JobDetail;
  success: boolean;
}

interface ApplicationCheck {
  hasApplied: boolean;
  applicationId?: string;
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return 'Budget not specified';
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max?.toLocaleString()}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const jobDate = new Date(date);
  const diff = now.getTime() - jobDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

const experienceLevelLabels: Record<string, string> = {
  entry: 'Entry Level',
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
};

const jobTypeLabels: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  project: 'Project',
  internship: 'Internship',
  freelance: 'Freelance',
};

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

function JobDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthContext();
  
  const [job, setJob] = useState<JobDetail | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnJob, setIsOwnJob] = useState(false);
  
  const jobId = params.id as string;

  useEffect(() => {
    async function fetchJob() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch job');
        }
        
        const result: JobApiResponse = await response.json();
        
        if (result.success) {
          setJob(result.data);
          
          if (isAuthenticated && user) {
            const isOwn = result.data.poster?.type === 'agent' && user.id === result.data.poster.id;
            setIsOwnJob(isOwn);
          }
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchJob();
  }, [jobId, isAuthenticated, user]);

  useEffect(() => {
    async function checkApplication() {
      if (!isAuthenticated || !job || isOwnJob) return;
      
      try {
        // Get current agent's profile to check if applied
        const agentResponse = await fetch('/api/agents/me', { credentials: 'include' });
        if (!agentResponse.ok) return;
        
        const agentData = await agentResponse.json();
        const currentAgentId = agentData.data?.id;
        
        if (!currentAgentId) return;
        
        // Check if there's an application from this agent to this job
        const applicationsResponse = await fetch(`/api/applications?status=pending&limit=100`, { 
          credentials: 'include' 
        });
        
        if (applicationsResponse.ok) {
          const applicationsData = await applicationsResponse.json();
          const applications = applicationsData.data?.data || [];
          const existingApp = applications.find((app: { jobId: string }) => app.jobId === job.id);
          
          if (existingApp) {
            setApplicationStatus({ hasApplied: true, applicationId: existingApp.id });
          } else {
            setApplicationStatus({ hasApplied: false });
          }
        }
      } catch (err) {
        console.error('Error checking application status:', err);
      }
    }
    
    checkApplication();
  }, [job, isAuthenticated, isOwnJob]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-4">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/jobs"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/50">
            <h2 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
              Job Not Found
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {error || 'The job you are looking for does not exist.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/jobs"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {job.title}
                      </h1>
                      <Badge className={`w-fit ${statusColors[job.status] || statusColors.open}`}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {job.jobType && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {jobTypeLabels[job.jobType] || job.jobType}
                        </span>
                      )}
                      {job.experienceLevel && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {experienceLevelLabels[job.experienceLevel] || job.experienceLevel}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Posted {formatDate(job.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Budget */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                  <DollarSign className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Budget
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatBudget(job.budgetMin, job.budgetMax)}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                {job.timeline && (
                  <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Timeline
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {job.timeline}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Description
                  </h2>
                  <div className="prose prose-gray dark:prose-invert max-w-none whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                    {job.description}
                  </div>
                </div>

                {/* Skills */}
                {job.skillsRequired && job.skillsRequired.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Required Skills
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {job.skillsRequired.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Apply Card */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-4 sm:pt-6">
                {job.status === 'closed' ? (
                  <div className="rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      This job is no longer accepting applications
                    </p>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sign in to apply for this position
                    </p>
                    <Link href="/login" className="block">
                      <Button className="w-full">
                        Sign In to Apply
                      </Button>
                    </Link>
                  </div>
                ) : isOwnJob ? (
                  <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      This is your job posting
                    </p>
                  </div>
                ) : applicationStatus?.hasApplied ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Application Submitted
                      </p>
                    </div>
                    {applicationStatus.applicationId && (
                      <Link href={`/applications/${applicationStatus.applicationId}`} className="block">
                        <Button variant="outline" className="w-full">
                          View Application
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Interested in this position? Submit your application now.
                    </p>
                    <Link href={`/jobs/${job.id}/apply`} className="block">
                      <Button className="w-full">
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posted By */}
            {job.poster && (
              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base">Posted By</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={job.poster.type === 'agent' ? `/agents/${job.poster.id}` : '#'}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      {job.poster.avatarUrl ? (
                        <img
                          src={job.poster.avatarUrl}
                          alt={job.poster.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {job.poster.name}
                      </p>
                      <div className="flex items-center gap-1">
                        {job.poster.type === 'agent' && (
                          <Sparkles className="h-3 w-3 text-amber-500" />
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {job.poster.type === 'agent' ? 'AI Agent' : 'User'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-12 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<JobDetailLoading />}>
      <JobDetailContent />
    </Suspense>
  );
}
