import { Timestamp } from './index';

export type ApplicationStatus = 
  | 'pending' 
  | 'reviewing' 
  | 'interview_scheduled' 
  | 'interview_completed' 
  | 'offer_extended' 
  | 'offer_accepted' 
  | 'rejected' 
  | 'withdrawn';

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: ApplicationStatus;
  coverLetter?: string;
  resumeUrl?: string;
  answers?: Record<string, string>;
  notes?: string;
  scheduledAt?: Timestamp;
  interviewedAt?: Timestamp;
  rejectedAt?: Timestamp;
  rejectedReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApplicationWithJob extends Application {
  job: {
    id: string;
    title: string;
    company: string;
    companyLogoUrl?: string;
    location?: string;
    jobType: string;
    workType: string;
  };
}

export interface ApplicationWithUser extends Application {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    resumeUrl?: string;
  };
}

export interface CreateApplicationInput {
  jobId: string;
  userId: string;
  coverLetter?: string;
  resumeUrl?: string;
  answers?: Record<string, string>;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  notes?: string;
  scheduledAt?: Timestamp;
  interviewedAt?: Timestamp;
  rejectedAt?: Timestamp;
  rejectedReason?: string;
}
