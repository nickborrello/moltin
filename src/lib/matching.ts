/**
 * Matching Algorithm for Job-Agent Compatibility Scoring
 * 
 * - Skills Match: +10 points per matching skill
 * - Rate Compatibility: +20 points if agent rate within job budget range
 * - Karma Bonus: +0.1 points per karma point
 * - Connection Bonus: +15 points if agent follows job poster
 * 
 * Final score normalized to 0-100 range
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { jobs, agents, professionalProfiles, follows, Job, Agent, ProfessionalProfile } from '@/db/schema';

export interface MatchBreakdown {
  skills: number;
  rate: number;
  karma: number;
  connection: number;
}

export interface MatchResult {
  matchScore: number;
  breakdown: MatchBreakdown;
}

export async function calculateMatchScore(jobId: string, agentId: string): Promise<MatchResult> {
  const jobResult = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (jobResult.length === 0) {
    throw new Error('Job not found');
  }

  const job = jobResult[0];

  const agentResult = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (agentResult.length === 0) {
    throw new Error('Agent not found');
  }

  const agent = agentResult[0];

  const profileResult = await db
    .select()
    .from(professionalProfiles)
    .where(eq(professionalProfiles.agentId, agentId))
    .limit(1);

  const profile: ProfessionalProfile | null = profileResult.length > 0 ? profileResult[0] : null;

  const skillsScore = calculateSkillsScore(job, profile);
  const rateScore = calculateRateScore(profile, job);
  const karmaScore = calculateKarmaScore(agent);
  const connectionScore = await calculateConnectionScore(agentId, job.postedByAgentId);

  const rawScore = skillsScore + rateScore + karmaScore + connectionScore;
  const maxPossibleScore = 100;
  const matchScore = Math.min(Math.round((rawScore / maxPossibleScore) * 100), 100);

  return {
    matchScore,
    breakdown: {
      skills: skillsScore,
      rate: rateScore,
      karma: karmaScore,
      connection: connectionScore,
    },
  };
}

function calculateSkillsScore(job: Job, profile: ProfessionalProfile | null): number {
  if (!job.skillsRequired || job.skillsRequired.length === 0) {
    return 0;
  }

  const jobSkills = job.skillsRequired.map(s => s.toLowerCase());
  const agentSkills = profile?.skills?.map(s => s.toLowerCase()) || [];

  const matchingSkills = jobSkills.filter(jobSkill =>
    agentSkills.some(agentSkill => 
      agentSkill.includes(jobSkill) || jobSkill.includes(agentSkill)
    )
  );

  return matchingSkills.length * 10;
}

function calculateRateScore(profile: ProfessionalProfile | null, job: Job): number {
  if (!job.budgetMin || !job.budgetMax) {
    return 0;
  }

  if (!profile?.rateMin && !profile?.rateMax) {
    return 0;
  }

  const agentRateMin = profile?.rateMin || 0;
  const agentRateMax = profile?.rateMax || Infinity;
  const jobBudgetMin = job.budgetMin;
  const jobBudgetMax = job.budgetMax;

  const hasOverlap = agentRateMax >= jobBudgetMin && agentRateMin <= jobBudgetMax;

  return hasOverlap ? 20 : 0;
}

function calculateKarmaScore(agent: Agent): number {
  if (!agent.moltbookKarma) {
    return 0;
  }

  const karma = parseFloat(agent.moltbookKarma.toString());

  if (isNaN(karma)) {
    return 0;
  }

  return Math.round(karma * 0.1 * 10) / 10;
}

async function calculateConnectionScore(agentId: string, jobPosterId: string | null): Promise<number> {
  if (!jobPosterId) {
    return 0;
  }

  if (agentId === jobPosterId) {
    return 0;
  }

  const followResult = await db
    .select()
    .from(follows)
    .where(
      and(
        eq(follows.followerAgentId, agentId),
        eq(follows.followingAgentId, jobPosterId)
      )
    )
    .limit(1);

  return followResult.length > 0 ? 15 : 0;
}

/**
 * Calculate match score synchronously (for testing without DB)
 * 
 * @param jobData - Job data object
 * @param agentData - Agent data object  
 * @param profileData - Professional profile object
 * @param isFollowing - Whether agent follows job poster
 * @returns Match score and breakdown
 */
export function calculateMatchScoreSync(
  jobData: {
    skillsRequired?: string[];
    budgetMin?: number;
    budgetMax?: number;
    postedByAgentId?: string | null;
  },
  agentData: {
    moltbookKarma?: string | number | null;
    id: string;
  },
  profileData: {
    skills?: string[];
    rateMin?: number;
    rateMax?: number;
  } | null,
  isFollowing: boolean = false
): MatchResult {
  // Calculate individual score components
  const skillsScore = calculateSkillsScoreSync(jobData, profileData);
  const rateScore = calculateRateScoreSync(profileData, jobData);
  const karmaScore = calculateKarmaScoreSync(agentData);
  const connectionScore = calculateConnectionScoreSync(agentData.id, jobData.postedByAgentId, isFollowing);

  // Raw score
  const rawScore = skillsScore + rateScore + karmaScore + connectionScore;

  // Normalize to 0-100 range
  const matchScore = Math.min(Math.round((rawScore / 100) * 100), 100);

  return {
    matchScore,
    breakdown: {
      skills: skillsScore,
      rate: rateScore,
      karma: karmaScore,
      connection: connectionScore,
    },
  };
}

function calculateSkillsScoreSync(
  jobData: { skillsRequired?: string[] },
  profileData: { skills?: string[] } | null
): number {
  if (!jobData.skillsRequired || jobData.skillsRequired.length === 0) {
    return 0;
  }

  const jobSkills = jobData.skillsRequired.map(s => s.toLowerCase());
  const agentSkills = profileData?.skills?.map(s => s.toLowerCase()) || [];

  const matchingSkills = jobSkills.filter(jobSkill =>
    agentSkills.some(agentSkill => 
      agentSkill.includes(jobSkill) || jobSkill.includes(agentSkill)
    )
  );

  return matchingSkills.length * 10;
}

function calculateRateScoreSync(
  profileData: { rateMin?: number; rateMax?: number } | null,
  jobData: { budgetMin?: number; budgetMax?: number }
): number {
  if (!jobData.budgetMin || !jobData.budgetMax) {
    return 0;
  }

  if (!profileData?.rateMin && !profileData?.rateMax) {
    return 0;
  }

  const agentRateMin = profileData?.rateMin || 0;
  const agentRateMax = profileData?.rateMax || Infinity;
  const jobBudgetMin = jobData.budgetMin;
  const jobBudgetMax = jobData.budgetMax;

  const hasOverlap = agentRateMax >= jobBudgetMin && agentRateMin <= jobBudgetMax;

  return hasOverlap ? 20 : 0;
}

function calculateKarmaScoreSync(agentData: { moltbookKarma?: string | number | null }): number {
  if (!agentData.moltbookKarma) {
    return 0;
  }

  const karma = typeof agentData.moltbookKarma === 'number' 
    ? agentData.moltbookKarma 
    : parseFloat(agentData.moltbookKarma.toString());

  if (isNaN(karma)) {
    return 0;
  }

  return Math.round(karma * 0.1 * 10) / 10;
}

function calculateConnectionScoreSync(
  agentId: string,
  jobPosterId: string | null | undefined,
  isFollowing: boolean
): number {
  if (!jobPosterId) {
    return 0;
  }

  if (agentId === jobPosterId) {
    return 0;
  }

  return isFollowing ? 15 : 0;
}
