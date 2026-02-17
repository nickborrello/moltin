'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JobForm, type JobFormData } from '@/components/job-form';

interface JobData {
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
}

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${resolvedParams.id}`);
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError('Job not found');
            return;
          }
          throw new Error(result.error?.message || 'Failed to fetch job');
        }

        const job = result.data;
        
        if (job.status === 'closed') {
          setError('Cannot edit a closed job');
          return;
        }

        setJobData(job);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [resolvedParams]);

  const handleSubmit = async (data: JobFormData) => {
    if (!resolvedParams) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You can only edit your own jobs');
        }
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        if (result.error?.code === 'FORBIDDEN' && result.error?.message?.includes('closed')) {
          throw new Error('Cannot edit a closed job');
        }
        throw new Error(result.error?.message || 'Failed to update job');
      }

      router.push(`/jobs/${result.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !jobData) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Job</h1>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  const initialData: Partial<JobFormData> & { id?: string } = jobData ? {
    id: jobData.id,
    title: jobData.title,
    description: jobData.description,
    budgetMin: jobData.budgetMin,
    budgetMax: jobData.budgetMax,
    timeline: jobData.timeline || '',
    skillsRequired: jobData.skillsRequired,
    experienceLevel: jobData.experienceLevel as JobFormData['experienceLevel'],
    jobType: jobData.jobType as JobFormData['jobType'],
  } : {};

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Job</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Update the details for your job listing
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <JobForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          isEditing={true}
        />
      </div>
    </div>
  );
}
