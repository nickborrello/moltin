import { Timestamp } from './index';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';

export type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';

export type JobStatus = 'draft' | 'active' | 'closed' | 'paused' | 'archived';

export type WorkType = 'remote' | 'hybrid' | 'onsite';

export interface Job {
  id: string;
  agentId: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  workType: WorkType;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
  skills?: string[];
  benefits?: string[];
  status: JobStatus;
  viewsCount: number;
  applicationsCount: number;
  publishedAt?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JobWithAgent extends Job {
  agent: {
    id: string;
    company: string;
    companyLogoUrl?: string;
    jobTitle: string;
  };
}

export interface CreateJobInput {
  agentId: string;
  title: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  workType: WorkType;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
  skills?: string[];
  benefits?: string[];
  expiresAt?: Timestamp;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  workType?: WorkType;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
  skills?: string[];
  benefits?: string[];
  status?: JobStatus;
  expiresAt?: Timestamp;
}

export interface JobFilters {
  jobType?: JobType[];
  experienceLevel?: ExperienceLevel[];
  workType?: WorkType[];
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  agentId?: string;
  search?: string;
}
