'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface JobFiltersState {
  skills: string;
  budgetMin: string;
  budgetMax: string;
  experienceLevel: string[];
  jobType: string[];
}

interface JobFiltersProps {
  filters: JobFiltersState;
  onFiltersChange: (filters: JobFiltersState) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const EXPERIENCE_LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
];

const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'project', label: 'Project' },
];

const DEFAULT_FILTERS: JobFiltersState = {
  skills: '',
  budgetMin: '',
  budgetMax: '',
  experienceLevel: [],
  jobType: [],
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function JobFilters({ filters, onFiltersChange, isMobileOpen, onMobileClose }: JobFiltersProps) {
  const [localFilters, setLocalFilters] = useState<JobFiltersState>(filters);
  const debouncedFilters = useDebounce(localFilters, 300);

  useEffect(() => {
    onFiltersChange(debouncedFilters);
  }, [debouncedFilters, onFiltersChange]);

  const handleReset = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS);
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  const handleSkillsChange = (value: string) => {
    setLocalFilters(prev => ({ ...prev, skills: value }));
  };

  const handleBudgetMinChange = (value: string) => {
    setLocalFilters(prev => ({ ...prev, budgetMin: value }));
  };

  const handleBudgetMaxChange = (value: string) => {
    setLocalFilters(prev => ({ ...prev, budgetMax: value }));
  };

  const toggleExperienceLevel = (level: string) => {
    setLocalFilters(prev => ({
      ...prev,
      experienceLevel: prev.experienceLevel.includes(level)
        ? prev.experienceLevel.filter(l => l !== level)
        : [...prev.experienceLevel, level],
    }));
  };

  const toggleJobType = (type: string) => {
    setLocalFilters(prev => ({
      ...prev,
      jobType: prev.jobType.includes(type)
        ? prev.jobType.filter(t => t !== type)
        : [...prev.jobType, type],
    }));
  };

  const hasActiveFilters = 
    localFilters.skills ||
    localFilters.budgetMin ||
    localFilters.budgetMax ||
    localFilters.experienceLevel.length > 0 ||
    localFilters.jobType.length > 0;

  const filterContent = (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Skills
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="e.g. react, typescript, python"
            value={localFilters.skills}
            onChange={(e) => handleSkillsChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Separate skills with commas
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Budget Range
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input
              type="number"
              placeholder="Min"
              value={localFilters.budgetMin}
              onChange={(e) => handleBudgetMinChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-7 pr-3 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <span className="flex items-center text-gray-400">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input
              type="number"
              placeholder="Max"
              value={localFilters.budgetMax}
              onChange={(e) => handleBudgetMaxChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-7 pr-3 text-sm text-gray-900 transition-colors focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Experience Level
        </label>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <label
              key={level.value}
              className="flex cursor-pointer items-center gap-3 min-h-[44px] px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={localFilters.experienceLevel.includes(level.value)}
                onChange={() => toggleExperienceLevel(level.value)}
                className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {level.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Job Type
        </label>
        <div className="space-y-2">
          {JOB_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex cursor-pointer items-center gap-3 min-h-[44px] px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={localFilters.jobType.includes(type.value)}
                onChange={() => toggleJobType(type.value)}
                className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleReset}
          className="flex-1 min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        {hasActiveFilters && (
          <button
            onClick={onMobileClose}
            className="flex-1 min-h-[44px] rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 md:hidden"
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onMobileClose} />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl transition-transform duration-300 md:hidden dark:bg-gray-900 ${
          isMobileOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filters
          </h2>
          <button
            onClick={onMobileClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {filterContent}
      </div>

      <aside className="hidden w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:block">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear all
            </button>
          )}
        </div>
        {filterContent}
      </aside>
    </>
  );
}

export function MobileFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 min-h-[44px] text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 md:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filters
    </button>
  );
}

export function FilterSummary({ filters }: { filters: JobFiltersState }) {
  const activeCount = 
    (filters.skills ? 1 : 0) +
    (filters.budgetMin || filters.budgetMax ? 1 : 0) +
    filters.experienceLevel.length +
    filters.jobType.length;

  if (activeCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {activeCount} filter{activeCount > 1 ? 's' : ''} active
      </span>
      {filters.skills && (
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Skills: {filters.skills}
        </span>
      )}
      {(filters.budgetMin || filters.budgetMax) && (
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          ${filters.budgetMin || '0'} - ${filters.budgetMax || '∞'}
        </span>
      )}
      {filters.experienceLevel.map(level => (
        <span
          key={level}
          className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {level}
        </span>
      ))}
      {filters.jobType.map(type => (
        <span
          key={type}
          className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {type}
        </span>
      ))}
    </div>
  );
}
