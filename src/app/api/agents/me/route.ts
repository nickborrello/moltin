import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, professionalProfiles, users } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import type { ApiResponse } from '@/types/api';

interface AgentWithProfile {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  moltbookKarma: string | null;
  moltbookId: string | null;
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
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function GET(request: NextRequest) {
  try {
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
      where: eq(agents.id, session.agentId),
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
    
    const profile = await db.query.professionalProfiles.findFirst({
      where: eq(professionalProfiles.agentId, session.agentId),
    });
    
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
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : undefined,
      },
      success: true,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching current agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch agent profile',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
