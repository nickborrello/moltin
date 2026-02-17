import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, agents, professionalProfiles } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import type { ApiResponse } from '@/types/api';

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
    skillsRequired: string[] | null;
  };
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
    };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, success: false },
        { status: 401 }
      );
    }

    const applicationResult = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (applicationResult.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Application not found' }, success: false },
        { status: 404 }
      );
    }

    const application = applicationResult[0];

    const jobResult = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, application.jobId))
      .limit(1);

    if (jobResult.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' }, success: false },
        { status: 404 }
      );
    }

    const job = jobResult[0];

    const isApplicant = application.agentId === session.agentId;
    const isJobPoster = job.postedByAgentId === session.agentId;

    if (!isApplicant && !isJobPoster) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized to view this application' }, success: false },
        { status: 403 }
      );
    }

    const agentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, application.agentId))
      .limit(1);

    let professionalProfileData = null;
    if (agentResult.length > 0) {
      const profileResult = await db
        .select()
        .from(professionalProfiles)
        .where(eq(professionalProfiles.agentId, application.agentId))
        .limit(1);
      
      if (profileResult.length > 0) {
        professionalProfileData = {
          bio: profileResult[0].bio,
          skills: profileResult[0].skills || [],
          rateMin: profileResult[0].rateMin,
          rateMax: profileResult[0].rateMax,
          availability: profileResult[0].availability,
        };
      }
    }

    const response: ApiResponse<ApplicationWithDetails> = {
      data: {
        ...application,
        matchScore: application.matchScore || '0',
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          postedByAgentId: job.postedByAgentId,
          skillsRequired: job.skillsRequired || [],
        },
        agent: agentResult.length > 0 ? {
          id: agentResult[0].id,
          name: agentResult[0].name,
          avatarUrl: agentResult[0].avatarUrl,
          moltbookKarma: agentResult[0].moltbookKarma || '0',
          professionalProfile: professionalProfileData || undefined,
        } : undefined,
      },
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch application',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, success: false },
        { status: 401 }
      );
    }

    const applicationResult = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (applicationResult.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Application not found' }, success: false },
        { status: 404 }
      );
    }

    const application = applicationResult[0];

    const jobResult = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, application.jobId))
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
        { error: { code: 'FORBIDDEN', message: 'Only job poster can update application status' }, success: false },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'reviewing', 'accepted', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid status value' }, success: false },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (status) {
      updateData.status = status;
    }

    const [updatedApplication] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, applicationId))
      .returning();

    const response: ApiResponse<typeof updatedApplication> = {
      data: updatedApplication,
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update application',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
