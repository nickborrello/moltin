import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, professionalProfiles, follows, users } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiResponse, ApiErrorResponse } from '@/types/api';

interface AgentWithProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  moltbookKarma: string | null;
  isClaimed: boolean | null;
  isActive: boolean;
  createdAt: Date;
  professionalProfile?: {
    bio: string | null;
    skills: string[] | null;
    rateMin: number | null;
    rateMax: number | null;
    availability: string | null;
    experienceLevel: string | null;
  };
  isFollowing: boolean;
}

const updateAgentSchema = z.object({
  description: z.string().max(5000).optional(),
  professionalProfile: z.object({
    bio: z.string().max(5000).optional(),
    skills: z.array(z.string()).max(50).optional(),
    rateMin: z.number().int().min(0).optional(),
    rateMax: z.number().int().min(0).optional(),
    availability: z.enum(['immediate', '1_week', '2_weeks', '1_month', '2_months']).optional(),
    experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  }).optional(),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
    });
    
    if (!agent) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
          success: false,
        },
        { status: 404 }
      );
    }
    
    if (!agent.isActive) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
          success: false,
        },
        { status: 404 }
      );
    }
    
    const profile = await db.query.professionalProfiles.findFirst({
      where: eq(professionalProfiles.agentId, id),
    });
    
    const session = getSessionFromCookie(request.headers.get('cookie'));
    let isFollowing = false;
    
    if (session?.agentId) {
      const followRecord = await db.query.follows.findFirst({
        where: and(
          eq(follows.followerAgentId, session.agentId),
          eq(follows.followingAgentId, id)
        ),
      });
      isFollowing = !!followRecord;
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, agent.userId),
    });
    
    const response: ApiResponse<AgentWithProfile> = {
      data: {
        ...agent,
        professionalProfile: profile ? {
          bio: profile.bio,
          skills: profile.skills,
          rateMin: profile.rateMin,
          rateMax: profile.rateMax,
          availability: profile.availability,
          experienceLevel: profile.experienceLevel,
        } : undefined,
        isFollowing,
      },
      success: true,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch agent',
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
    const { id } = await params;
    
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        {
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          success: false,
        },
        { status: 401 }
      );
    }
    
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
    });
    
    if (!agent) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
          success: false,
        },
        { status: 404 }
      );
    }
    
    if (session.agentId !== id) {
      return NextResponse.json(
        {
          error: { code: 'FORBIDDEN', message: 'You can only update your own profile' },
          success: false,
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const parsed = updateAgentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
          },
          success: false,
        },
        { status: 400 }
      );
    }
    
    const { description, professionalProfile } = parsed.data;
    
    const updateData: { description?: string } = {};
    if (description !== undefined) {
      updateData.description = description;
    }
    
    let updatedAgent = agent;
    
    if (Object.keys(updateData).length > 0) {
      const [result] = await db
        .update(agents)
        .set(updateData)
        .where(eq(agents.id, id))
        .returning();
      updatedAgent = result;
    }
    
    let updatedProfile = null;
    
    if (professionalProfile) {
      const existingProfile = await db.query.professionalProfiles.findFirst({
        where: eq(professionalProfiles.agentId, id),
      });
      
      if (existingProfile) {
        const [result] = await db
          .update(professionalProfiles)
          .set(professionalProfile)
          .where(eq(professionalProfiles.agentId, id))
          .returning();
        updatedProfile = result;
      } else {
        const [result] = await db
          .insert(professionalProfiles)
          .values({
            agentId: id,
            ...professionalProfile,
          })
          .returning();
        updatedProfile = result;
      }
    }
    
    const response: ApiResponse<AgentWithProfile> = {
      data: {
        ...updatedAgent,
        professionalProfile: updatedProfile ? {
          bio: updatedProfile.bio,
          skills: updatedProfile.skills,
          rateMin: updatedProfile.rateMin,
          rateMax: updatedProfile.rateMax,
          availability: updatedProfile.availability,
          experienceLevel: updatedProfile.experienceLevel,
        } : undefined,
        isFollowing: false,
      },
      success: true,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update agent',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = getSessionFromCookie(request.headers.get('cookie'));
    
    if (!session?.agentId) {
      return NextResponse.json(
        {
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          success: false,
        },
        { status: 401 }
      );
    }
    
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
    });
    
    if (!agent) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
          success: false,
        },
        { status: 404 }
      );
    }
    
    if (session.agentId !== id) {
      return NextResponse.json(
        {
          error: { code: 'FORBIDDEN', message: 'You can only delete your own profile' },
          success: false,
        },
        { status: 403 }
      );
    }
    
    await db
      .update(agents)
      .set({ isActive: false })
      .where(eq(agents.id, id));
    
    return NextResponse.json({
      data: { deleted: true, id },
      success: true,
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete agent',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
