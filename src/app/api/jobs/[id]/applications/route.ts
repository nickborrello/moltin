import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, agents, professionalProfiles } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { normalizePaginationParams } from '@/lib/performance';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

interface JobApplicationWithAgent {
  id: string;
  jobId: string;
  agentId: string;
  proposedRate: number | null;
  availability: string | null;
  matchScore: string | null;
  coverMessage: string | null;
  status: string;
  createdAt: Date;
  agent?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    moltbookKarma: string | null;
    professionalProfile?: {
      bio: string | null;
      skills: string[] | null;
      rateMin: number | null;
      rateMax: number | null;
      availability: string | null;
      experienceLevel: string | null;
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, success: false },
        { status: 401 }
      );
    }

    const jobResult = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (jobResult.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' }, success: false },
        { status: 404 }
      );
    }

    const job = jobResult[0];

    if (job.postedByAgentId !== session.agentId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only job poster can view applications' }, success: false },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const { page, limit, offset } = normalizePaginationParams(
      searchParams.get('page') || undefined,
      searchParams.get('limit') || undefined
    );
    
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'matchScore';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    const conditions = [
      eq(applications.jobId, jobId)
    ];
    
    if (status) {
      conditions.push(eq(applications.status, status as any));
    }
    
    const whereClause = and(...conditions);
    
    const orderByColumn = sortBy === 'createdAt' ? applications.createdAt : 
                          sortBy === 'status' ? applications.status :
                          applications.matchScore;
    const orderByFn = sortOrder === 'desc' ? desc : asc;
    
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
    
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);
    
    const agentIds = [...new Set(applicationList.map(a => a.agentId))];
    const agentDetails = await db
      .select({
        id: agents.id,
        name: agents.name,
        avatarUrl: agents.avatarUrl,
        moltbookKarma: agents.moltbookKarma,
      })
      .from(agents)
      .where(agentIds.length > 0 ? sql`${agents.id} IN ${agentIds}` : undefined);
    
    const agentMap = new Map(agentDetails.map(a => [a.id, a]));
    
    const profileDetails = await db
      .select()
      .from(professionalProfiles)
      .where(agentIds.length > 0 ? sql`${professionalProfiles.agentId} IN ${agentIds}` : undefined);
    
    const profileMap = new Map(profileDetails.map(p => [p.agentId, p]));
    
    const responseData: JobApplicationWithAgent[] = applicationList.map(app => {
      const agent = agentMap.get(app.agentId);
      const profile = profileMap.get(app.agentId);
      
      return {
        ...app,
        agent: agent ? {
          id: agent.id,
          name: agent.name,
          avatarUrl: agent.avatarUrl,
          moltbookKarma: agent.moltbookKarma,
          professionalProfile: profile ? {
            bio: profile.bio,
            skills: profile.skills,
            rateMin: profile.rateMin,
            rateMax: profile.rateMax,
            availability: profile.availability,
            experienceLevel: profile.experienceLevel,
          } : undefined,
        } : undefined,
      };
    });
    
    const response: ApiResponse<PaginatedResponse<JobApplicationWithAgent>> = {
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
    console.error('Error fetching job applications:', error);
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
