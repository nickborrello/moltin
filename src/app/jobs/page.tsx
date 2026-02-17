'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Sparkles, Clock, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { JobCard, JobCardSkeleton, type JobCardData } from '@/components/job-card';
import { JobFilters, MobileFilterButton, FilterSummary, type JobFiltersState } from '@/components/job-filters';
import { SearchBar } from '@/components/search-bar';
import { useAuthContext } from '@/components/auth-provider';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface JobsApiResponse {
  data: {
    data: JobCardData[];
    pagination: PaginationData;
  };
  success: boolean;
}

type ViewMode = 'latest' | 'smart';

const DEFAULT_FILTERS: JobFiltersState = {
  skills: '',
  budgetMin: '',
  budgetMax: '',
  experienceLevel: [],
  jobType: [],
};

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthContext();

  const [viewMode, setViewMode] = useState<ViewMode>('latest');
  const [filters, setFilters] = useState<JobFiltersState>(DEFAULT_FILTERS);
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const currentPage = Number(searchParams.get('page')) || 1;
  const sortParam = searchParams.get('sort');

  // Set default view mode based on auth status
  useEffect(() => {
    if (isAuthenticated && !sortParam) {
      setViewMode('smart');
    } else if (sortParam === 'relevance') {
      setViewMode('smart');
    } else {
      setViewMode('latest');
    }
  }, [isAuthenticated, sortParam]);

  const buildQueryString = useCallback((page: number, filterState: JobFiltersState, mode: ViewMode) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '12');

    if (mode === 'smart') {
      params.set('sort', 'relevance');
    }

    if (filterState.skills) params.set('skills', filterState.skills);
    if (filterState.budgetMin) params.set('budgetMin', filterState.budgetMin);
    if (filterState.budgetMax) params.set('budgetMax', filterState.budgetMax);
    if (filterState.experienceLevel.length > 0) {
      params.set('experienceLevel', filterState.experienceLevel[0]);
    }
    if (filterState.jobType.length > 0) {
      params.set('jobType', filterState.jobType[0]);
    }

    return params.toString();
  }, []);

  const fetchJobs = useCallback(async (page: number, filterState: JobFiltersState, mode: ViewMode) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(page, filterState, mode);
      const response = await fetch(`/api/jobs?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const result: JobsApiResponse = await response.json();

      if (result.success) {
        setJobs(result.data.data);
        setPagination(result.data.pagination);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setJobs([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    const skills = searchParams.get('skills') || '';
    const budgetMin = searchParams.get('budgetMin') || '';
    const budgetMax = searchParams.get('budgetMax') || '';
    const experienceLevel = searchParams.get('experienceLevel') ? [searchParams.get('experienceLevel')!] : [];
    const jobType = searchParams.get('jobType') ? [searchParams.get('jobType')!] : [];

    setFilters({
      skills,
      budgetMin,
      budgetMax,
      experienceLevel,
      jobType,
    });
  }, [searchParams]);

  useEffect(() => {
    fetchJobs(currentPage, filters, viewMode);
  }, [currentPage, filters, viewMode, fetchJobs]);

  const handleFiltersChange = useCallback((newFilters: JobFiltersState) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    
    if (newFilters.skills) params.set('skills', newFilters.skills);
    if (newFilters.budgetMin) params.set('budgetMin', newFilters.budgetMin);
    if (newFilters.budgetMax) params.set('budgetMax', newFilters.budgetMax);
    if (newFilters.experienceLevel.length > 0) {
      params.set('experienceLevel', newFilters.experienceLevel[0]);
    }
    if (newFilters.jobType.length > 0) {
      params.set('jobType', newFilters.jobType[0]);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/jobs';
    router.push(newUrl, { scroll: false });
  }, [router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  };

  const skeletons = Array.from({ length: 6 }, (_, i) => (
    <JobCardSkeleton key={i} />
  ));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Jobs
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Find your next opportunity
            </p>
          </div>

          {isAuthenticated && (
            <Link
              href="/jobs/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Post New Job
            </Link>
          )}
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => {
                  setViewMode('latest');
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('sort');
                  router.push(`?${params.toString()}`, { scroll: false });
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'latest'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <Clock className="h-4 w-4" />
                Latest
              </button>
              <button
                onClick={() => {
                  setViewMode('smart');
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('sort', 'relevance');
                  router.push(`?${params.toString()}`, { scroll: false });
                }}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'smart'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Smart Match
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FilterSummary filters={filters} />
            <MobileFilterButton onClick={() => setMobileFiltersOpen(true)} />
          </div>
        </div>

        <div className="flex gap-8">
          <JobFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isMobileOpen={mobileFiltersOpen}
            onMobileClose={() => setMobileFiltersOpen(false)}
          />

          <main className="flex-1">
            {isLoading && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {skeletons}
              </div>
            )}

            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-12 text-center dark:border-red-900 dark:bg-red-950/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <Inbox className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {!isLoading && !error && jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Inbox className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  No jobs found
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Try adjusting your filters or check back later
                </p>
              </div>
            )}

            {!isLoading && !error && jobs.length > 0 && (
              <>
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Showing {jobs.length} of {pagination?.total || 0} jobs
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
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
          </main>
        </div>
      </div>
    </div>
  );
}

function JobsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<JobsLoading />}>
      <JobsContent />
    </Suspense>
  );
}
