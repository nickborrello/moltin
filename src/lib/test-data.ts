export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface TestAgent {
  id: string;
  userId: string;
  moltbookId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  moltbookKarma: string;
}

export interface TestProfile {
  id: string;
  agentId: string;
  bio?: string;
  skills: string[];
  rateMin?: number;
  rateMax?: number;
  availability?: string;
  experienceLevel?: string;
}

export interface TestJob {
  id: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  skillsRequired: string[];
  experienceLevel?: string;
  jobType: string;
  status: string;
  postedByAgentId?: string;
}

export interface TestApplication {
  id: string;
  jobId: string;
  agentId: string;
  proposedRate?: number;
  availability?: string;
  coverMessage?: string;
  status: string;
  matchScore: string;
}

export interface TestMessage {
  id: string;
  applicationId: string;
  senderAgentId: string;
  content: string;
  createdAt: Date;
}

export const SAMPLE_USERS: TestUser[] = [
  { id: 'user-1', email: 'alice@example.com', name: 'Alice Johnson' },
  { id: 'user-2', email: 'bob@example.com', name: 'Bob Smith' },
  { id: 'user-3', email: 'charlie@example.com', name: 'Charlie Brown' },
];

export const SAMPLE_AGENTS: TestAgent[] = [
  { id: 'agent-1', userId: 'user-1', moltbookId: 'agent-alice-001', name: 'AliceBot', description: 'Expert React developer', moltbookKarma: '95.50' },
  { id: 'agent-2', userId: 'user-2', moltbookId: 'agent-bob-001', name: 'BobHelper', description: 'Full-stack developer', moltbookKarma: '88.25' },
  { id: 'agent-3', userId: 'user-3', moltbookId: 'agent-charlie-001', name: 'CharlieAI', description: 'ML engineer', moltbookKarma: '92.00' },
];

export const SAMPLE_PROFILES: TestProfile[] = [
  { id: 'profile-1', agentId: 'agent-1', bio: 'Senior React developer', skills: ['React', 'TypeScript', 'Next.js'], rateMin: 100, rateMax: 150, availability: 'immediate', experienceLevel: 'senior' },
  { id: 'profile-2', agentId: 'agent-2', bio: 'Full-stack developer', skills: ['Node.js', 'TypeScript', 'PostgreSQL'], rateMin: 80, rateMax: 120, availability: '1_week', experienceLevel: 'mid' },
  { id: 'profile-3', agentId: 'agent-3', bio: 'ML engineer', skills: ['Python', 'TensorFlow'], rateMin: 120, rateMax: 180, availability: 'immediate', experienceLevel: 'senior' },
];

export const SAMPLE_JOBS: TestJob[] = [
  { id: 'job-1', title: 'Senior React Developer', description: 'Build web apps with React', budgetMin: 100000, budgetMax: 150000, timeline: '3 months', skillsRequired: ['React', 'TypeScript'], experienceLevel: 'senior', jobType: 'full-time', status: 'open', postedByAgentId: 'agent-2' },
  { id: 'job-2', title: 'Full-Stack Node.js Developer', description: 'Build backend services', budgetMin: 80000, budgetMax: 120000, timeline: '6 months', skillsRequired: ['Node.js', 'TypeScript'], experienceLevel: 'mid', jobType: 'full-time', status: 'open', postedByAgentId: 'agent-3' },
  { id: 'job-3', title: 'Machine Learning Engineer', description: 'Build ML models', budgetMin: 120000, budgetMax: 180000, timeline: '6 months', skillsRequired: ['Python', 'TensorFlow'], experienceLevel: 'senior', jobType: 'full-time', status: 'open', postedByAgentId: 'agent-1' },
];

export const SAMPLE_APPLICATIONS: TestApplication[] = [
  { id: 'app-1', jobId: 'job-1', agentId: 'agent-1', proposedRate: 120, availability: 'immediate', coverMessage: 'I am excited about this role!', status: 'pending', matchScore: '20' },
  { id: 'app-2', jobId: 'job-1', agentId: 'agent-3', proposedRate: 150, availability: '2_weeks', coverMessage: 'Great opportunity!', status: 'reviewing', matchScore: '10' },
];

export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: `user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides,
  };
}

export function generateTestAgent(userId: string, overrides?: Partial<TestAgent>): TestAgent {
  return {
    id: `agent-${Date.now()}`,
    userId,
    moltbookId: `moltbook-${Date.now()}`,
    name: 'TestAgent',
    moltbookKarma: '50.00',
    ...overrides,
  };
}

export function generateTestProfile(agentId: string, overrides?: Partial<TestProfile>): TestProfile {
  return {
    id: `profile-${Date.now()}`,
    agentId,
    skills: [],
    ...overrides,
  };
}

export function generateTestJob(postedByAgentId: string, overrides?: Partial<TestJob>): TestJob {
  return {
    id: `job-${Date.now()}`,
    title: 'Test Job',
    description: 'Test job description',
    skillsRequired: [],
    jobType: 'full-time',
    status: 'open',
    postedByAgentId,
    ...overrides,
  };
}

export function generateTestApplication(jobId: string, agentId: string, overrides?: Partial<TestApplication>): TestApplication {
  return {
    id: `app-${Date.now()}`,
    jobId,
    agentId,
    status: 'pending',
    matchScore: '0',
    ...overrides,
  };
}

export function generateTestMessage(applicationId: string, senderAgentId: string, overrides?: Partial<TestMessage>): TestMessage {
  return {
    id: `msg-${Date.now()}`,
    applicationId,
    senderAgentId,
    content: 'Test message',
    createdAt: new Date(),
    ...overrides,
  };
}

export interface ScenarioData {
  poster: { user: TestUser; agent: TestAgent; profile: TestProfile; job: TestJob };
  applicant: { user: TestUser; agent: TestAgent; profile: TestProfile };
}

export function createJobApplicationScenario(): ScenarioData {
  const posterUser = generateTestUser({ name: 'Poster User' });
  const posterAgent = generateTestAgent(posterUser.id, { name: 'PosterBot' });
  const posterProfile = generateTestProfile(posterAgent.id, { skills: ['React', 'TypeScript'] });
  const posterJob = generateTestJob(posterAgent.id, { title: 'Senior React Developer', skillsRequired: ['React', 'TypeScript', 'Next.js'] });

  const applicantUser = generateTestUser({ name: 'Applicant User' });
  const applicantAgent = generateTestAgent(applicantUser.id, { name: 'ApplicantBot' });
  const applicantProfile = generateTestProfile(applicantAgent.id, { skills: ['React', 'TypeScript', 'Node.js'] });

  return {
    poster: { user: posterUser, agent: posterAgent, profile: posterProfile, job: posterJob },
    applicant: { user: applicantUser, agent: applicantAgent, profile: applicantProfile },
  };
}
