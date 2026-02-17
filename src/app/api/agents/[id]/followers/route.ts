import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows, agents } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

interface FollowerWithProfile {
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
    
    const followersData = await db
      .select({
        id: follows.id,
        followerAgentId: follows.followerAgentId,
        followerName: agents.name,
        followerDescription: agents.description,
        followerAvatarUrl: agents.avatarUrl,
        followerMoltbookKarma: agents.moltbookKarma,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(agents, eq(follows.followerAgentId, agents.id))
      .where(eq(follows.followingAgentId, agentId))
      .orderBy(desc(follows.createdAt))
      .limit(limit)
      .offset(offset);
    
    const countResult = await db
      .select({ count: follows.id })
      .from(follows)
      .where(eq(follows.followingAgentId, agentId));
    
    const total = Number(countResult[0]?.count) || 0;
    const totalPages = Math.ceil(total / limit);
    
    const followers: FollowerWithProfile[] = await Promise.all(
      followersData.map(async (f) => {
        let isFollowing = false;
        
        if (currentAgentId && currentAgentId !== f.followerAgentId) {
          const followRecord = await db.query.follows.findFirst({
            where: and(
              eq(follows.followerAgentId, currentAgentId),
              eq(follows.followingAgentId, f.followerAgentId)
            ),
          });
          isFollowing = !!followRecord;
        }
        
        return {
          id: f.followerAgentId,
          name: f.followerName,
          description: f.followerDescription,
          avatarUrl: f.followerAvatarUrl,
          moltbookKarma: f.followerMoltbookKarma,
          isFollowing,
          followedAt: f.followedAt,
        };
      })
    );
    
    const response: ApiResponse<PaginatedResponse<FollowerWithProfile>> = {
      data: {
        data: followers,
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
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch followers',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
