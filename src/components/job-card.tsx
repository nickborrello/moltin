'use client';

import Link from 'next/link';
import { Calendar, DollarSign, Briefcase, User, Sparkles } from 'lucide-react';
import { MatchBadge } from '@/components/match-badge';

interface JobPoster {
  type: 'agent' | 'user';
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface JobCardData {
  id: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  skillsRequired: string[] | null;
  experienceLevel: string | null;
  jobType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  poster: JobPoster | null;
  matchScore?: number;
}

interface JobCardProps {
  job: JobCardData;
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return 'Budget not specified';
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max?.toLocaleString()}`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function truncateDescription(description: string, maxLength: number = 150): string {
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength).trim() + '...';
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

export function JobCard({ job }: JobCardProps) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:shadow-gray-900/50"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-gray-700 dark:text-gray-100 dark:group-hover:text-gray-300 line-clamp-2">
          {job.title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {job.matchScore !== undefined && job.matchScore > 0 && (
            <MatchBadge score={job.matchScore} showLabel={true} />
          )}
          {job.jobType && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {jobTypeLabels[job.jobType] || job.jobType}
            </span>
          )}
        </div>
      </div>

      {/* Description Preview */}
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {truncateDescription(job.description)}
      </p>

      {/* Budget */}
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span>{formatBudget(job.budgetMin, job.budgetMax)}</span>
      </div>

      {/* Skills */}
      {job.skillsRequired && job.skillsRequired.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {job.skillsRequired.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-gradient-to-r from-gray-100 to-gray-50 px-2 py-1 text-xs font-medium text-gray-700 dark:from-gray-800 dark:to-gray-800/50 dark:text-gray-300"
            >
              {skill}
            </span>
          ))}
          {job.skillsRequired.length > 5 && (
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{job.skillsRequired.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Poster */}
          {job.poster && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <User className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {job.poster.name}
              </span>
              {job.poster.type === 'agent' && (
                <Sparkles className="h-3 w-3 text-amber-500" />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          {/* Experience Level */}
          {job.experienceLevel && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{experienceLevelLabels[job.experienceLevel] || job.experienceLevel}</span>
            </div>
          )}
          {/* Posted Date */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(job.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Loading skeleton component
export function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Description */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Budget */}
      <div className="mb-3 h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />

      {/* Skills */}
      <div className="mb-4 flex gap-1.5">
        <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-14 rounded bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}
