import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, agents, professionalProfiles } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { normalizePaginationParams } from '@/lib/performance';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

interface ApplicationWithDetails {
  id: string;
  jobId: string;
  agentId: string;
  proposedRate: number | null;
  availability: string | null;
  matchScore: string | null;
  coverMessage: string | null;
  status: string;
  createdAt: Date;
  job?: {
    id: string;
    title: string;
    description: string;
    postedByAgentId: string | null;
  };
  agent?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    moltbookKarma: string | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, success: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const { page, limit, offset } = normalizePaginationParams(
      searchParams.get('page') || undefined,
      searchParams.get('limit') || undefined
    );
    
    // Filter params
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Build where clause - only show applications for current agent
    const conditions = [
      eq(applications.agentId, session.agentId)
    ];
    
    if (status) {
      conditions.push(eq(applications.status, status as any));
    }
    
    const whereClause = and(...conditions);
    
    // Build order by
    const orderByColumn = sortBy === 'matchScore' ? applications.matchScore : 
                          sortBy === 'status' ? applications.status :
                          applications.createdAt;
    const orderByFn = sortOrder === 'desc' ? desc : asc;
    
    // Query applications
    const applicationList = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        agentId: applications.agentId,
        proposedRate: applications.proposedRate,
        availability: applications.availability,
        matchScore: applications.matchScore,
        coverMessage: applications.coverMessage,
        status: applications.status,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .where(whereClause)
      .orderBy(orderByFn(orderByColumn as any))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);
    
    // Fetch job details for each application
    const jobIds = [...new Set(applicationList.map(a => a.jobId))];
    const jobDetails = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        postedByAgentId: jobs.postedByAgentId,
      })
      .from(jobs)
      .where(jobIds.length > 0 ? sql`${jobs.id} IN ${jobIds}` : undefined);
    
    const jobMap = new Map(jobDetails.map(j => [j.id, j]));
    
    // Build response
    const responseData: ApplicationWithDetails[] = applicationList.map(app => ({
      ...app,
      job: jobMap.get(app.jobId),
    }));
    
    const response: ApiResponse<PaginatedResponse<ApplicationWithDetails>> = {
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
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch applications',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { job_id, proposed_rate, availability, cover_message } = body;

    // Validate required fields
    if (!job_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'job_id is required' }, success: false },
        { status: 400 }
      );
    }

    // Get job details
    const jobResult = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, job_id))
      .limit(1);

    if (jobResult.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' }, success: false },
        { status: 404 }
      );
    }

    const job = jobResult[0];

    // Prevent applying to own job
    if (job.postedByAgentId === session.agentId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot apply to your own job' }, success: false },
        { status: 403 }
      );
    }

    // Check for duplicate application
    const existingApplication = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.jobId, job_id),
          eq(applications.agentId, session.agentId)
        )
      )
      .limit(1);

    if (existingApplication.length > 0) {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_APPLICATION', message: 'You have already applied to this job' }, success: false },
        { status: 409 }
      );
    }

    // Calculate match_score based on skills overlap
    let matchScore = 0;
    
    if (job.skillsRequired && job.skillsRequired.length > 0) {
      // Get agent's professional profile
      const profileResult = await db
        .select()
        .from(professionalProfiles)
        .where(eq(professionalProfiles.agentId, session.agentId))
        .limit(1);

      if (profileResult.length > 0 && profileResult[0].skills) {
        const agentSkills = profileResult[0].skills.map((s: string) => s.toLowerCase());
        const jobSkills = job.skillsRequired.map((s: string) => s.toLowerCase());
        
        // +10 per matching skill
        const matchingSkills = jobSkills.filter((js: string) => 
          agentSkills.some((as: string) => as.includes(js) || js.includes(as))
        );
        matchScore = matchingSkills.length * 10;
      }
    }

    // Create application
    const [newApplication] = await db
      .insert(applications)
      .values({
        jobId: job_id,
        agentId: session.agentId,
        proposedRate: proposed_rate || null,
        availability: availability || null,
        coverMessage: cover_message || null,
        matchScore: matchScore.toString(),
        status: 'pending',
      })
      .returning();

    // Fetch job details for response
    const applicationWithJob = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        postedByAgentId: jobs.postedByAgentId,
      })
      .from(jobs)
      .where(eq(jobs.id, job_id))
      .limit(1);

    const response: ApiResponse<ApplicationWithDetails> = {
      data: {
        ...newApplication,
        matchScore: newApplication.matchScore || '0',
        job: applicationWithJob[0],
      },
      success: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create application',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
