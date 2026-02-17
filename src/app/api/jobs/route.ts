import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, agents, users, professionalProfiles } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { normalizePaginationParams } from '@/lib/performance';
import { eq, and, sql, desc, asc, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Job } from '@/db/schema';

// Validation schema for creating a job
const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  budgetMin: z.number().int().positive().optional(),
  budgetMax: z.number().int().positive().optional(),
  timeline: z.string().max(200).optional(),
  skillsRequired: z.array(z.string()).max(50).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'project']),
});

// Validation schema for job list filters
const jobFiltersSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  q: z.coerce.string().optional(), // Search query - searches title and description
  skills: z.coerce.string().optional(),
  status: z.enum(['open', 'closed', 'draft']).optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'project']).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'relevance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

interface JobWithPoster {
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
  poster: {
    type: 'agent' | 'user';
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  matchScore?: number;
}

// GET /api/jobs - List jobs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Build filter params object with only defined values
    const filterParams: Record<string, string | undefined> = {};
    const paramsToCheck = ['q', 'page', 'limit', 'skills', 'status', 'jobType', 'experienceLevel', 'budgetMin', 'budgetMax', 'sortBy', 'sortOrder'] as const;
    
    for (const param of paramsToCheck) {
      const value = searchParams.get(param);
      if (value !== null) {
        filterParams[param] = value;
      }
    }

    const filters = jobFiltersSchema.parse(filterParams);

    const { page, limit, offset } = normalizePaginationParams(filters.page, filters.limit);

    // Check authentication for relevance sorting
    const session = getSessionFromCookie(request.headers.get('cookie'));
    const isRelevanceSort = filters.sortBy === 'relevance';
    
    // Fetch agent profile if relevance sorting is requested
    let agentSkills: string[] = [];
    if (isRelevanceSort && session?.agentId) {
      const profileResult = await db
        .select()
        .from(professionalProfiles)
        .where(eq(professionalProfiles.agentId, session.agentId))
        .limit(1);
      
      if (profileResult.length > 0 && profileResult[0].skills) {
        agentSkills = profileResult[0].skills.map((s: string) => s.toLowerCase());
      }
    }

    // Build where conditions
    const conditions = [];

    // Search query - case-insensitive partial match on title and description
    if (filters.q) {
      const searchTerm = `%${filters.q}%`;
      conditions.push(
        or(
          sql`LOWER(${jobs.title}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${jobs.description}) LIKE LOWER(${searchTerm})`
        )
      );
    }

    // Filter by status - default to 'open' only if not specified
    if (filters.status) {
      conditions.push(eq(jobs.status, filters.status));
    } else {
      conditions.push(eq(jobs.status, 'open'));
    }

    if (filters.jobType) {
      conditions.push(eq(jobs.jobType, filters.jobType));
    }

    if (filters.experienceLevel) {
      conditions.push(eq(jobs.experienceLevel, filters.experienceLevel));
    }

    if (filters.budgetMin) {
      conditions.push(sql`${jobs.budgetMin} >= ${filters.budgetMin}`);
    }

    if (filters.budgetMax) {
      conditions.push(sql`${jobs.budgetMax} <= ${filters.budgetMax}`);
    }

    // Skills filter at database level using JSONB contains
    if (filters.skills) {
      const skillFilters = filters.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (skillFilters.length > 0) {
        // Add OR conditions for each skill (job must have at least one matching skill)
        const skillConditions = skillFilters.map(skill =>
          sql`${jobs.skillsRequired} @> ${JSON.stringify([skill])}`
        );
        if (skillConditions.length > 0) {
          conditions.push(or(...skillConditions));
        }
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by (skip for relevance - we sort in memory)
    let sortColumn;
    let sortOrderFn;
    
    if (isRelevanceSort) {
      sortColumn = jobs.createdAt; // fallback, will sort by match score in memory
      sortOrderFn = desc;
    } else {
      sortColumn = filters.sortBy === 'title' ? jobs.title :
                     filters.sortBy === 'updatedAt' ? jobs.updatedAt :
                     jobs.createdAt;
      sortOrderFn = (filters.sortOrder === 'asc') ? asc : desc;
    }

    // Get jobs - for relevance sort, fetch more to ensure we have enough after filtering by match score
    const fetchLimit = isRelevanceSort ? Math.min(limit * 3, 100) : limit;
    const jobList = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        budgetMin: jobs.budgetMin,
        budgetMax: jobs.budgetMax,
        timeline: jobs.timeline,
        skillsRequired: jobs.skillsRequired,
        experienceLevel: jobs.experienceLevel,
        jobType: jobs.jobType,
        status: jobs.status,
        postedByAgentId: jobs.postedByAgentId,
        postedByUserId: jobs.postedByUserId,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(whereClause)
      .orderBy(sortOrderFn(sortColumn))
      .limit(fetchLimit)
      .offset(0); // Offset 0 for relevance, we paginate after scoring

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);

    // Get poster info for each job
    const agentIds = jobList.filter(j => j.postedByAgentId).map(j => j.postedByAgentId!);
    const userIds = jobList.filter(j => j.postedByUserId).map(j => j.postedByUserId!);

    const [agentMap, userMap] = await Promise.all([
      agentIds.length > 0 ? db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(inArray(agents.id, agentIds))
        .then(agents => new Map(agents.map(a => [a.id, a.name])))
        : Promise.resolve(new Map()),
      userIds.length > 0 ? db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds))
        .then(users => new Map(users.map(u => [u.id, u.name])))
        : Promise.resolve(new Map()),
    ]);

    // Build response with poster info
    let responseData: JobWithPoster[] = jobList.map(job => {
      let poster: JobWithPoster['poster'] = null;
      
      if (job.postedByAgentId) {
        const agentName = agentMap.get(job.postedByAgentId);
        if (agentName) {
          poster = { type: 'agent', id: job.postedByAgentId, name: agentName };
        }
      } else if (job.postedByUserId) {
        const userName = userMap.get(job.postedByUserId);
        if (userName) {
          poster = { type: 'user', id: job.postedByUserId, name: userName };
        }
      }

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        budgetMin: job.budgetMin,
        budgetMax: job.budgetMax,
        timeline: job.timeline,
        skillsRequired: job.skillsRequired || [],
        experienceLevel: job.experienceLevel,
        jobType: job.jobType,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        poster,
      };
    });

    // Handle relevance sorting - calculate match scores and sort
    if (isRelevanceSort && session?.agentId && agentSkills.length > 0) {
      // Calculate match score for each job
      responseData = responseData.map(job => {
        const jobSkills = (job.skillsRequired || []).map((s: string) => s.toLowerCase());
        const matchingSkills = jobSkills.filter((js: string) => 
          agentSkills.some((as: string) => as.includes(js) || js.includes(as))
        );
        const matchScore = matchingSkills.length * 10;
        return { ...job, matchScore };
      });

      // Sort by match score descending
      responseData.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      // Apply pagination after sorting
      const startIndex = (page - 1) * limit;
      responseData = responseData.slice(startIndex, startIndex + limit);
    }

    const response: ApiResponse<PaginatedResponse<JobWithPoster>> = {
      data: {
        data: responseData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total,
        },
      },
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.flatten(),
          },
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch jobs',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to create a job',
          },
          success: false,
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    // Create job - set posted_by_agent_id or posted_by_user_id based on auth
    const [newJob] = await db
      .insert(jobs)
      .values({
        title: validatedData.title,
        description: validatedData.description,
        budgetMin: validatedData.budgetMin,
        budgetMax: validatedData.budgetMax,
        timeline: validatedData.timeline,
        skillsRequired: validatedData.skillsRequired || [],
        experienceLevel: validatedData.experienceLevel,
        jobType: validatedData.jobType,
        status: 'open',
        postedByAgentId: session.agentId,
        postedByUserId: session.userId,
      })
      .returning();

    // Get poster info
    let poster: JobWithPoster['poster'] = null;
    
    if (newJob.postedByAgentId) {
      const [agent] = await db
        .select({ name: agents.name })
        .from(agents)
        .where(eq(agents.id, newJob.postedByAgentId));
      
      if (agent) {
        poster = { type: 'agent', id: newJob.postedByAgentId, name: agent.name };
      }
    } else if (newJob.postedByUserId) {
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, newJob.postedByUserId));
      
      if (user) {
        poster = { type: 'user', id: newJob.postedByUserId, name: user.name };
      }
    }

    const responseJob: JobWithPoster = {
      id: newJob.id,
      title: newJob.title,
      description: newJob.description,
      budgetMin: newJob.budgetMin,
      budgetMax: newJob.budgetMax,
      timeline: newJob.timeline,
      skillsRequired: newJob.skillsRequired || [],
      experienceLevel: newJob.experienceLevel,
      jobType: newJob.jobType,
      status: newJob.status,
      createdAt: newJob.createdAt,
      updatedAt: newJob.updatedAt,
      poster,
    };

    const response: ApiResponse<JobWithPoster> = {
      data: responseJob,
      success: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.flatten(),
          },
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create job',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
