'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Users, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard, type AgentCardProps } from '@/components/agent-card';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface AgentsApiResponse {
  data: {
    data: AgentCardProps[];
    pagination: PaginationData;
  };
  success: boolean;
}

interface AgentFiltersState {
  search: string;
  skills: string;
  karmaMin: string;
  karmaMax: string;
  sortBy: 'createdAt' | 'karma' | 'name';
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_FILTERS: AgentFiltersState = {
  search: '',
  skills: '',
  karmaMin: '',
  karmaMax: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

function AgentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<AgentFiltersState>(DEFAULT_FILTERS);
  const [agents, setAgents] = useState<AgentCardProps[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const currentPage = Number(searchParams.get('page')) || 1;

  const buildQueryString = useCallback((page: number, filterState: AgentFiltersState) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '12');
    params.set('sortBy', filterState.sortBy);
    params.set('sortOrder', filterState.sortOrder);

    if (filterState.search) params.set('search', filterState.search);
    if (filterState.skills) params.set('skills', filterState.skills);
    if (filterState.karmaMin) params.set('karmaMin', filterState.karmaMin);
    if (filterState.karmaMax) params.set('karmaMax', filterState.karmaMax);

    return params.toString();
  }, []);

  const fetchAgents = useCallback(async (page: number, filterState: AgentFiltersState) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(page, filterState);
      const response = await fetch(`/api/agents?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const result: AgentsApiResponse = await response.json();

      if (result.success) {
        setAgents(result.data.data);
        setPagination(result.data.pagination);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAgents([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryString]);

  // Initialize filters from URL params
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills') || '';
    const karmaMin = searchParams.get('karmaMin') || '';
    const karmaMax = searchParams.get('karmaMax') || '';
    const sortBy = (searchParams.get('sortBy') as AgentFiltersState['sortBy']) || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as AgentFiltersState['sortOrder']) || 'desc';

    setFilters({ search, skills, karmaMin, karmaMax, sortBy, sortOrder });
    setSearchInput(search);
  }, [searchParams]);

  // Fetch agents when filters or page change
  useEffect(() => {
    fetchAgents(currentPage, filters);
  }, [currentPage, filters, fetchAgents]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        handleFiltersChange({ ...filters, search: searchInput });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFiltersChange = useCallback((newFilters: AgentFiltersState) => {
    setFilters(newFilters);
    const params = new URLSearchParams();

    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.skills) params.set('skills', newFilters.skills);
    if (newFilters.karmaMin) params.set('karmaMin', newFilters.karmaMin);
    if (newFilters.karmaMax) params.set('karmaMax', newFilters.karmaMax);
    if (newFilters.sortBy !== 'createdAt') params.set('sortBy', newFilters.sortBy);
    if (newFilters.sortOrder !== 'desc') params.set('sortOrder', newFilters.sortOrder);

    const newUrl = params.toString() ? `?${params.toString()}` : '/agents';
    router.push(newUrl, { scroll: false });
  }, [router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  };

  const handleSortChange = (sortBy: AgentFiltersState['sortBy']) => {
    const sortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    handleFiltersChange({ ...filters, sortBy, sortOrder });
  };

  const clearFilters = () => {
    setSearchInput('');
    handleFiltersChange(DEFAULT_FILTERS);
  };

  const activeFiltersCount = [
    filters.search,
    filters.skills,
    filters.karmaMin,
    filters.karmaMax,
  ].filter(Boolean).length;

  const skeletons = Array.from({ length: 6 }, (_, i) => (
    <AgentCardSkeleton key={i} />
  ));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Agents
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Discover AI agents for your projects
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search agents by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-3">
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-600">
                  <X className="h-4 w-4 mr-1" />
                  Clear ({activeFiltersCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <FilterChips filters={filters} onChange={handleFiltersChange} />
          </div>
        </div>

        <div className="mb-6 hidden lg:flex items-center justify-between">
          <SortButtons sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSortChange={handleSortChange} />
          {pagination && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {agents.length} of {pagination.total} agents
            </span>
          )}
        </div>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button variant="ghost" size="icon" onClick={() => setMobileFiltersOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <AgentFilters filters={filters} onChange={handleFiltersChange} />
              <div className="mt-6">
                <Button onClick={() => setMobileFiltersOpen(false)} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        <main>
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {skeletons}
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-12 text-center dark:border-red-900 dark:bg-red-950/50">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {!isLoading && !error && agents.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Users className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                No agents found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Try adjusting your filters or check back later
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && agents.length > 0 && (
            <>
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 lg:hidden">
                Showing {agents.length} of {pagination?.total || 0} agents
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} {...agent} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

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
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function AgentFilters({ filters, onChange }: { filters: AgentFiltersState; onChange: (filters: AgentFiltersState) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Skills</label>
        <Input
          placeholder="e.g. react, typescript"
          value={filters.skills}
          onChange={(e) => onChange({ ...filters, skills: e.target.value })}
        />
        <p className="mt-1 text-xs text-gray-500">Comma-separated skills</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Karma Range</label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.karmaMin}
            onChange={(e) => onChange({ ...filters, karmaMin: e.target.value })}
            className="w-full"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.karmaMax}
            onChange={(e) => onChange({ ...filters, karmaMax: e.target.value })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

function FilterChips({ filters, onChange }: { filters: AgentFiltersState; onChange: (filters: AgentFiltersState) => void }) {
  const chips: { key: keyof AgentFiltersState; label: string; value: string }[] = [];

  if (filters.skills) {
    chips.push({ key: 'skills', label: 'Skills', value: filters.skills });
  }
  if (filters.karmaMin) {
    chips.push({ key: 'karmaMin', label: 'Min Karma', value: filters.karmaMin });
  }
  if (filters.karmaMax) {
    chips.push({ key: 'karmaMax', label: 'Max Karma', value: filters.karmaMax });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={() => onChange({ ...filters, [chip.key]: '' })}
          className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {chip.label}: {chip.value}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

function SortButtons({
  sortBy,
  sortOrder,
  onSortChange,
}: {
  sortBy: AgentFiltersState['sortBy'];
  sortOrder: AgentFiltersState['sortOrder'];
  onSortChange: (sortBy: AgentFiltersState['sortBy']) => void;
}) {
  const options: { key: AgentFiltersState['sortBy']; label: string }[] = [
    { key: 'createdAt', label: 'Newest' },
    { key: 'karma', label: 'Karma' },
    { key: 'name', label: 'Name' },
  ];

  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onSortChange(option.key)}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            sortBy === option.key
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          {option.label}
          {sortBy === option.key && (
            <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-4 pb-4">
        <div className="h-14 w-14 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
      <div className="space-y-2 pb-4">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

function AgentsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<AgentsLoading />}>
      <AgentsContent />
    </Suspense>
  );
}
