'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Calendar, ChevronLeft, ChevronRight, Inbox, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/auth-provider';

interface ApplicationJob {
  id: string;
  title: string;
  description: string;
  postedByAgentId: string | null;
}

interface ApplicationItem {
  id: string;
  jobId: string;
  proposedRate: number | null;
  availability: string | null;
  matchScore: string | null;
  status: string;
  createdAt: Date;
  job?: ApplicationJob;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface ApplicationsApiResponse {
  data: {
    data: ApplicationItem[];
    pagination: PaginationData;
  };
  success: boolean;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  reviewing: { label: 'Reviewing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

function formatDate(date: Date): string {
  const now = new Date();
  const appDate = new Date(date);
  const diff = now.getTime() - appDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function truncateDescription(description: string, maxLength: number = 100): string {
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength).trim() + '...';
}

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/applications');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchApplications() {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/applications?page=${currentPage}&limit=10`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch applications');
        }
        
        const result: ApplicationsApiResponse = await response.json();
        
        if (result.success) {
          setApplications(result.data.data);
          setPagination(result.data.pagination);
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isAuthenticated) {
      fetchApplications();
    }
  }, [currentPage, isAuthenticated]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              My Applications
            </h1>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            My Applications
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track your job applications
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!error && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Inbox className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              No applications yet
            </h3>
            <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
              Start applying to jobs to see your applications here
            </p>
            <Link href="/jobs">
              <Button>Browse Jobs</Button>
            </Link>
          </div>
        )}

        {applications.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {applications.length} of {pagination?.total || 0} applications
            </div>
            
            <div className="space-y-4">
              {applications.map((application) => (
                <Link
                  key={application.id}
                  href={`/applications/${application.id}`}
                  className="block"
                >
                  <Card className="border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                                {application.job?.title || 'Unknown Job'}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {truncateDescription(application.job?.description || '')}
                              </p>
                            </div>
                            <Badge className={statusLabels[application.status]?.color || statusLabels.pending.color}>
                              {statusLabels[application.status]?.label || application.status}
                            </Badge>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {application.proposedRate && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  ${application.proposedRate}/hr
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Applied {formatDate(application.createdAt)}</span>
                            </div>
                            {application.matchScore && parseInt(application.matchScore) > 0 && (
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {application.matchScore} match
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasMore}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ApplicationsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-9 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsLoading />}>
      <ApplicationsContent />
    </Suspense>
  );
}
