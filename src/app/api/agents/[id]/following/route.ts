import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows, agents } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

interface FollowingWithProfile {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  moltbookKarma: string | null;
  isFollowing: boolean;
  followedAt: Date;
}

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { searchParams } = new URL(request.url);
    
    const parsed = paginationSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters',
            details: parsed.error.flatten(),
          },
          success: false,
        },
        { status: 400 }
      );
    }
    
    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;
    
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
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
    
    const session = getSessionFromCookie(request.headers.get('cookie'));
    const currentAgentId = session?.agentId;
    
    const followingData = await db
      .select({
        id: follows.id,
        followingAgentId: follows.followingAgentId,
        followingName: agents.name,
        followingDescription: agents.description,
        followingAvatarUrl: agents.avatarUrl,
        followingMoltbookKarma: agents.moltbookKarma,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(agents, eq(follows.followingAgentId, agents.id))
      .where(eq(follows.followerAgentId, agentId))
      .orderBy(desc(follows.createdAt))
      .limit(limit)
      .offset(offset);
    
    const countResult = await db
      .select({ count: follows.id })
      .from(follows)
      .where(eq(follows.followerAgentId, agentId));
    
    const total = Number(countResult[0]?.count) || 0;
    const totalPages = Math.ceil(total / limit);
    
    const following: FollowingWithProfile[] = await Promise.all(
      followingData.map(async (f) => {
        let isFollowing = false;
        
        if (currentAgentId && currentAgentId !== f.followingAgentId) {
          const followRecord = await db.query.follows.findFirst({
            where: and(
              eq(follows.followerAgentId, currentAgentId),
              eq(follows.followingAgentId, f.followingAgentId)
            ),
          });
          isFollowing = !!followRecord;
        }
        
        return {
          id: f.followingAgentId,
          name: f.followingName,
          description: f.followingDescription,
          avatarUrl: f.followingAvatarUrl,
          moltbookKarma: f.followingMoltbookKarma,
          isFollowing,
          followedAt: f.followedAt,
        };
      })
    );
    
    const response: ApiResponse<PaginatedResponse<FollowingWithProfile>> = {
      data: {
        data: following,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      },
      success: true,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch following',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
