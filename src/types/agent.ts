import { Timestamp } from './index';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  headline?: string;
  bio?: string;
  yearsOfExperience?: number;
  skills?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  location?: string;
  avatarUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AgentStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

export interface Agent {
  id: string;
  userId: string;
  company: string;
  jobTitle: string;
  status: AgentStatus;
  emailVerified: boolean;
  companyWebsite?: string;
  companyLogoUrl?: string;
  companyDescription?: string;
  industry?: string;
  companySize?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MoltbookAgent extends Agent {
  profile?: ProfessionalProfile;
  activeJobCount?: number;
  totalHires?: number;
  rating?: number;
  reviewCount?: number;
}

export interface CreateAgentInput {
  userId: string;
  company: string;
  jobTitle: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  companyDescription?: string;
  industry?: string;
  companySize?: string;
}

export interface UpdateAgentInput {
  company?: string;
  jobTitle?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  companyDescription?: string;
  industry?: string;
  companySize?: string;
  status?: AgentStatus;
}
