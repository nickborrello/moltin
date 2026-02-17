import { z } from 'zod';

export const agentStatusSchema = z.enum(['active', 'inactive', 'suspended', 'pending_verification']);

export const professionalProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  headline: z.string().max(200).optional(),
  bio: z.string().max(5000).optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  skills: z.array(z.string()).max(50).optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  location: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  company: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(100),
  status: agentStatusSchema,
  emailVerified: z.boolean(),
  companyWebsite: z.string().url().optional(),
  companyLogoUrl: z.string().url().optional(),
  companyDescription: z.string().max(2000).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createAgentSchema = z.object({
  userId: z.string().uuid(),
  company: z.string().min(1).max(200),
  jobTitle: z.string().min(1).max(100),
  companyWebsite: z.string().url().optional(),
  companyLogoUrl: z.string().url().optional(),
  companyDescription: z.string().max(2000).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.string().optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export const jobTypeSchema = z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']);

export const experienceLevelSchema = z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']);

export const jobStatusSchema = z.enum(['draft', 'active', 'closed', 'paused', 'archived']);

export const workTypeSchema = z.enum(['remote', 'hybrid', 'onsite']);

export const jobSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  requirements: z.array(z.string()).max(50),
  responsibilities: z.array(z.string()).max(50),
  jobType: jobTypeSchema,
  experienceLevel: experienceLevelSchema,
  workType: workTypeSchema,
  location: z.string().max(100).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurrency: z.string().length(3).optional(),
  salaryPeriod: z.enum(['hourly', 'monthly', 'yearly']).optional(),
  skills: z.array(z.string()).max(50).optional(),
  benefits: z.array(z.string()).max(30).optional(),
  status: jobStatusSchema,
  viewsCount: z.number().int().min(0),
  applicationsCount: z.number().int().min(0),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createJobSchema = z.object({
  agentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  requirements: z.array(z.string()).max(50).optional(),
  responsibilities: z.array(z.string()).max(50).optional(),
  jobType: jobTypeSchema,
  experienceLevel: experienceLevelSchema,
  workType: workTypeSchema,
  location: z.string().max(100).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurrency: z.string().length(3).optional(),
  salaryPeriod: z.enum(['hourly', 'monthly', 'yearly']).optional(),
  skills: z.array(z.string()).max(50).optional(),
  benefits: z.array(z.string()).max(30).optional(),
  expiresAt: z.string().datetime().optional(),
}).refine((data) => {
  if (data.salaryMin && data.salaryMax) {
    return data.salaryMin <= data.salaryMax;
  }
  return true;
}, {
  message: "salaryMin must be less than or equal to salaryMax",
  path: ["salaryMin"],
});

export const updateJobSchema = createJobSchema.partial();

export const applicationStatusSchema = z.enum([
  'pending', 
  'reviewing', 
  'interview_scheduled', 
  'interview_completed', 
  'offer_extended', 
  'offer_accepted', 
  'rejected', 
  'withdrawn'
]);

export const applicationSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  status: applicationStatusSchema,
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  answers: z.record(z.string(), z.string()).optional(),
  notes: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  interviewedAt: z.string().datetime().optional(),
  rejectedAt: z.string().datetime().optional(),
  rejectedReason: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  userId: z.string().uuid(),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

export const updateApplicationSchema = z.object({
  status: applicationStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  interviewedAt: z.string().datetime().optional(),
  rejectedAt: z.string().datetime().optional(),
  rejectedReason: z.string().max(500).optional(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  isRead: z.boolean(),
  readAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export const createMessageSchema = z.object({
  threadId: z.string().uuid(),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export const threadSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()),
  lastMessageAt: z.string().datetime(),
  lastMessagePreview: z.string().max(200).optional(),
  unreadCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createThreadSchema = z.object({
  applicationId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(2),
  initialMessage: z.string().min(1).max(5000).optional(),
});

export const userRoleSchema = z.enum(['candidate', 'agent', 'admin']);

export const userStatusSchema = z.enum(['active', 'inactive', 'suspended']);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  role: userRoleSchema,
  status: userStatusSchema,
  emailVerified: z.boolean(),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});

export const updateUserSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export type AgentStatus = z.infer<typeof agentStatusSchema>;
export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type WorkType = z.infer<typeof workTypeSchema>;
export type Job = z.infer<typeof jobSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
