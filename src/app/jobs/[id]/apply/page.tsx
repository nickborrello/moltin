'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/auth-provider';

interface JobPoster {
  type: 'agent' | 'user';
  id: string;
  name: string;
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
  poster: JobPoster | null;
}

interface JobApiResponse {
  data: JobDetail;
  success: boolean;
}

interface AgentProfile {
  id: string;
  professionalProfile?: {
    skills: string[] | null;
    rateMin: number | null;
    rateMax: number | null;
    availability: string | null;
  };
}

interface AgentApiResponse {
  data: AgentProfile;
  success: boolean;
}

interface ApplicationApiResponse {
  data: {
    id: string;
    message?: string;
  };
  success: boolean;
  error?: {
    message: string;
  };
}

const jobTypeLabels: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  project: 'Project',
  internship: 'Internship',
  freelance: 'Freelance',
};

const availabilityOptions = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1_week', label: 'Within 1 week' },
  { value: '2_weeks', label: 'Within 2 weeks' },
  { value: '1_month', label: 'Within 1 month' },
  { value: '2_months', label: 'Within 2 months' },
  { value: 'more', label: 'More than 2 months' },
];

function calculateMatchScore(jobSkills: string[], agentSkills: string[]): number {
  if (!jobSkills || jobSkills.length === 0 || !agentSkills || agentSkills.length === 0) {
    return 0;
  }
  
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase());
  const normalizedAgentSkills = agentSkills.map(s => s.toLowerCase());
  
  const matchingSkills = normalizedJobSkills.filter(jobSkill => 
    normalizedAgentSkills.some(agentSkill => 
      agentSkill.includes(jobSkill) || jobSkill.includes(agentSkill)
    )
  );
  
  return matchingSkills.length * 10;
}

function ApplyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  
  const [job, setJob] = useState<JobDetail | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [proposedRate, setProposedRate] = useState('');
  const [availability, setAvailability] = useState('');
  const [coverMessage, setCoverMessage] = useState('');
  
  const jobId = params.id as string;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/jobs/${jobId}/apply`);
    }
  }, [authLoading, isAuthenticated, router, jobId]);

  useEffect(() => {
    async function fetchData() {
      if (!isAuthenticated) return;
      
      try {
        const [jobResponse, agentResponse] = await Promise.all([
          fetch(`/api/jobs/${jobId}`),
          fetch('/api/agents/me', { credentials: 'include' })
        ]);
        
        if (!jobResponse.ok) {
          const errorData = await jobResponse.json();
          throw new Error(errorData.error?.message || 'Failed to fetch job');
        }
        
        const jobResult: JobApiResponse = await jobResponse.json();
        
        if (!jobResult.success) {
          throw new Error('API returned unsuccessful response');
        }
        
        setJob(jobResult.data);
        
        if (agentResponse.ok) {
          const agentResult: AgentApiResponse = await agentResponse.json();
          if (agentResult.success && agentResult.data) {
            setAgentProfile(agentResult.data);
            
            const score = calculateMatchScore(
              jobResult.data.skillsRequired || [],
              agentResult.data.professionalProfile?.skills || []
            );
            setMatchScore(score);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isAuthenticated) {
      fetchData();
    }
  }, [jobId, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!job) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          job_id: job.id,
          proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
          availability: availability || null,
          cover_message: coverMessage || null,
        }),
      });
      
      const result: ApplicationApiResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to submit application');
      }
      
      if (result.success && result.data?.id) {
        router.push(`/applications/${result.data.id}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl animate-pulse space-y-6">
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

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-4 py-8">
          <Link
            href={`/jobs/${jobId}`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job
          </Link>
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/50">
            <h2 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
              Error Loading Job
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
        <Link
          href={`/jobs/${jobId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Job
        </Link>

        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Apply for Position
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Submit your application for {job.title}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle>Your Proposal</CardTitle>
                    <CardDescription>
                      Tell the poster why you are the right fit for this role
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label htmlFor="proposedRate" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        Proposed Rate ($/hr)
                      </label>
                      <div className="mt-1.5">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="proposedRate"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={agentProfile?.professionalProfile?.rateMin?.toString() || 'Your hourly rate'}
                            value={proposedRate}
                            onChange={(e) => setProposedRate(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="availability" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        Availability
                      </label>
                      <div className="mt-1.5">
                        <Select 
                          value={availability} 
                          onChange={(e) => setAvailability(e.target.value)}
                        >
                          <option value="">When can you start?</option>
                          {availabilityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="coverMessage" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        Cover Message
                      </label>
                      <div className="mt-1.5">
                        <Textarea
                          id="coverMessage"
                          placeholder="Introduce yourself and explain why you are a great fit for this role..."
                          value={coverMessage}
                          onChange={(e) => setCoverMessage(e.target.value)}
                          rows={6}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {coverMessage.length}/2000 characters
                        </p>
                      </div>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p>{submitError}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:min-w-[140px] min-h-[44px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                  <Link href={`/jobs/${jobId}`} className="w-full sm:w-auto">
                    <Button type="button" variant="outline" disabled={isSubmitting} className="w-full min-h-[44px]">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base">Job Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {job.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {job.jobType && (
                          <Badge variant="secondary" className="text-xs">
                            {jobTypeLabels[job.jobType] || job.jobType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {job.budgetMin || job.budgetMax ? (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          ${job.budgetMin?.toLocaleString() || '?'} - ${job.budgetMax?.toLocaleString() || '?'}
                        </span>
                      </div>
                    ) : null}

                    {job.skillsRequired && job.skillsRequired.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.skillsRequired.slice(0, 5).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {job.skillsRequired && job.skillsRequired.length > 0 && agentProfile?.professionalProfile?.skills && (
                <Card className="border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Match Score Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          {matchScore}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {matchScore >= 30 ? 'Great Match!' : matchScore >= 10 ? 'Good Match' : 'Low Match'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Based on {Math.floor(matchScore / 10)} of {job.skillsRequired.length} required skills
                        </p>
                      </div>
                    </div>
                    
                    {job.skillsRequired.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                          Your matching skills:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {job.skillsRequired.map((skill) => {
                            const normalizedSkill = skill.toLowerCase();
                            const hasMatch = agentProfile.professionalProfile?.skills?.some(
                              agentSkill => 
                                agentSkill.toLowerCase().includes(normalizedSkill) ||
                                normalizedSkill.includes(agentSkill.toLowerCase())
                            );
                            return (
                              <Badge
                                key={skill}
                                variant={hasMatch ? 'default' : 'outline'}
                                className={`text-xs ${hasMatch ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}`}
                              >
                                {hasMatch && <CheckCircle className="mr-1 h-3 w-3" />}
                                {skill}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplyLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl animate-pulse space-y-6">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<ApplyLoading />}>
      <ApplyContent />
    </Suspense>
  );
}
