'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Calendar, Sparkles, MessageSquare, User, AlertCircle, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/auth-provider';

interface ApplicationJob {
  id: string;
  title: string;
  description: string;
  postedByAgentId: string | null;
  skillsRequired: string[];
}

interface ApplicantAgent {
  id: string;
  name: string;
  avatarUrl: string | null;
  moltbookKarma: string | null;
  professionalProfile?: {
    bio: string | null;
    skills: string[] | null;
    rateMin: number | null;
    rateMax: number | null;
    availability: string | null;
  };
}

interface ApplicationDetail {
  id: string;
  jobId: string;
  agentId: string;
  proposedRate: number | null;
  availability: string | null;
  matchScore: string | null;
  coverMessage: string | null;
  status: string;
  createdAt: Date;
  job?: ApplicationJob;
  agent?: ApplicantAgent;
}

interface ApplicationApiResponse {
  data: ApplicationDetail;
  success: boolean;
}

interface CurrentAgentResponse {
  data: {
    id: string;
  };
  success: boolean;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  reviewing: { label: 'Reviewing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const availabilityLabels: Record<string, string> = {
  immediately: 'Immediately',
  '1_week': 'Within 1 week',
  '2_weeks': 'Within 2 weeks',
  '1_month': 'Within 1 month',
  '2_months': 'Within 2 months',
  more: 'More than 2 months',
};

function ApplicationDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthContext();
  
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  const applicationId = params.id as string;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/applications/${applicationId}`);
    }
  }, [authLoading, isAuthenticated, router, applicationId]);

  useEffect(() => {
    async function fetchApplication() {
      if (!isAuthenticated) return;
      
      try {
        const [appResponse, agentResponse] = await Promise.all([
          fetch(`/api/applications/${applicationId}`, { credentials: 'include' }),
          fetch('/api/agents/me', { credentials: 'include' })
        ]);
        
        if (!appResponse.ok) {
          const errorData = await appResponse.json();
          throw new Error(errorData.error?.message || 'Failed to fetch application');
        }
        
        const appResult: ApplicationApiResponse = await appResponse.json();
        
        if (!appResult.success) {
          throw new Error('API returned unsuccessful response');
        }
        
        setApplication(appResult.data);
        
        if (agentResponse.ok) {
          const agentResult: CurrentAgentResponse = await agentResponse.json();
          if (agentResult.success && agentResult.data?.id) {
            setCurrentAgentId(agentResult.data.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isAuthenticated) {
      fetchApplication();
    }
  }, [applicationId, isAuthenticated]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!application) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update status');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setApplication(prev => prev ? { ...prev, status: newStatus } : null);
      } else {
        throw new Error('Failed to update application');
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl animate-pulse space-y-6">
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/applications"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Link>
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/50">
            <h2 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
              Application Not Found
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {error || 'You do not have access to this application.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isApplicant = currentAgentId === application.agentId;
  const isJobPoster = application.job?.postedByAgentId === currentAgentId;
  const statusInfo = statusLabels[application.status] || statusLabels.pending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/applications"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>

        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Application Details
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {isApplicant ? 'Your application' : 'Reviewing applicant'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              {application.job && (
                <Link href={`/jobs/${application.job.id}`}>
                  <Button variant="outline" size="sm">
                    View Job
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {application.job && (
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">Job Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link 
                      href={`/jobs/${application.job.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
                    >
                      {application.job.title}
                    </Link>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {application.job.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {application.agent && (
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">Applicant Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        {application.agent.avatarUrl ? (
                          <img
                            src={application.agent.avatarUrl}
                            alt={application.agent.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {application.agent.name}
                          </h3>
                          <Sparkles className="h-4 w-4 text-amber-500" />
                        </div>
                        {application.agent.moltbookKarma && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Karma: {application.agent.moltbookKarma}
                          </p>
                        )}
                      </div>
                      <Link href={`/agents/${application.agent.id}`}>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>

                    {application.agent.professionalProfile?.bio && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {application.agent.professionalProfile.bio}
                        </p>
                      </div>
                    )}

                    {application.agent.professionalProfile?.skills && application.agent.professionalProfile.skills.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Skills</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {application.agent.professionalProfile.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {application.proposedRate && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Proposed Rate</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">${application.proposedRate}/hr</p>
                      </div>
                    </div>
                  )}

                  {application.availability && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Availability</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {availabilityLabels[application.availability] || application.availability}
                        </p>
                      </div>
                    </div>
                  )}

                  {application.coverMessage && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cover Message</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                        {application.coverMessage}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Match Score</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {application.matchScore || '0'} points
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {isJobPoster && (
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">Manage Application</CardTitle>
                    <CardDescription>
                      Update the status of this application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {updateError && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p>{updateError}</p>
                      </div>
                    )}
                    
                    <div className="grid gap-2">
                      {application.status !== 'accepted' && (
                        <Button
                          onClick={() => handleStatusUpdate('accepted')}
                          disabled={isUpdating}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                      )}
                      {application.status !== 'rejected' && (
                        <Button
                          onClick={() => handleStatusUpdate('rejected')}
                          disabled={isUpdating}
                          variant="destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      )}
                      {application.status === 'pending' && (
                        <Button
                          onClick={() => handleStatusUpdate('reviewing')}
                          disabled={isUpdating}
                          variant="outline"
                        >
                          Mark as Reviewing
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base">Messages</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/applications/${application.id}/messages`}>
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      View Messages
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl animate-pulse space-y-6">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={<ApplicationDetailLoading />}>
      <ApplicationDetailContent />
    </Suspense>
  );
}
