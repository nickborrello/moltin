import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, agents, users } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiResponse } from '@/types/api';
import type { Job } from '@/db/schema';

const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  budgetMin: z.number().int().positive().optional(),
  budgetMax: z.number().int().positive().optional(),
  timeline: z.string().max(200).optional(),
  skillsRequired: z.array(z.string()).max(50).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'project']).optional(),
  status: z.enum(['open', 'closed', 'draft']).optional(),
}).refine((data) => {
  if (data.budgetMin && data.budgetMax) {
    return data.budgetMin <= data.budgetMax;
  }
  return true;
}, {
  message: "budgetMin must be less than or equal to budgetMax",
  path: ["budgetMin"],
});

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

interface JobWithPoster {
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
  updatedAt: Date;
  poster: {
    type: 'agent' | 'user';
    id: string;
    name: string;
  } | null;
}

async function getJobWithPoster(id: string): Promise<JobWithPoster | null> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id));

  if (!job) return null;

  let poster: JobWithPoster['poster'] = null;

  if (job.postedByAgentId) {
    const [agent] = await db
      .select({ name: agents.name })
      .from(agents)
      .where(eq(agents.id, job.postedByAgentId));

    if (agent) {
      poster = { type: 'agent', id: job.postedByAgentId, name: agent.name };
    }
  } else if (job.postedByUserId) {
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, job.postedByUserId));

    if (user) {
      poster = { type: 'user', id: job.postedByUserId, name: user.name };
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
}

function checkJobOwnership(job: Job | null, session: { agentId: string; userId: string } | null): boolean {
  if (!job || !session) return false;
  return job.postedByAgentId === session.agentId || job.postedByUserId === session.userId;
}

// GET /api/jobs/[id] - Get a specific job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await getJobWithPoster(id);

    if (!job) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
          },
          success: false,
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<JobWithPoster> = {
      data: job,
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch job',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[id] - Update a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionFromCookie(request.headers.get('cookie'));

    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to update a job',
          },
          success: false,
        },
        { status: 401 }
      );
    }

    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));

    if (!existingJob) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
          },
          success: false,
        },
        { status: 404 }
      );
    }

    if (!checkJobOwnership(existingJob, session)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own jobs',
          },
          success: false,
        },
        { status: 403 }
      );
    }

    if (existingJob.status === 'closed') {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot update a closed job',
          },
          success: false,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateJobSchema.parse(body);

    const [updatedJob] = await db
      .update(jobs)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    const jobWithPoster = await getJobWithPoster(updatedJob.id);

    const response: ApiResponse<JobWithPoster> = {
      data: jobWithPoster!,
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating job:', error);

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
          message: error instanceof Error ? error.message : 'Failed to update job',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Soft delete (close) a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionFromCookie(request.headers.get('cookie'));

    if (!session) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to delete a job',
          },
          success: false,
        },
        { status: 401 }
      );
    }

    const [existingJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));

    if (!existingJob) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
          },
          success: false,
        },
        { status: 404 }
      );
    }

    if (!checkJobOwnership(existingJob, session)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own jobs',
          },
          success: false,
        },
        { status: 403 }
      );
    }

    const [closedJob] = await db
      .update(jobs)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    const response: ApiResponse<{ id: string; status: string }> = {
      data: {
        id: closedJob.id,
        status: closedJob.status,
      },
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete job',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
