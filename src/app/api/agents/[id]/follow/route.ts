import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { follows, agents } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import type { ApiResponse } from '@/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetAgentId } = await params;
    
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
    
    const followerAgentId = session.agentId;
    
    if (followerAgentId === targetAgentId) {
      return NextResponse.json(
        {
          error: { code: 'BAD_REQUEST', message: 'Cannot follow yourself' },
          success: false,
        },
        { status: 400 }
      );
    }
    
    const targetAgent = await db.query.agents.findFirst({
      where: eq(agents.id, targetAgentId),
    });
    
    if (!targetAgent || !targetAgent.isActive) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
          success: false,
        },
        { status: 404 }
      );
    }
    
    const existingFollow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerAgentId, followerAgentId),
        eq(follows.followingAgentId, targetAgentId)
      ),
    });
    
    if (existingFollow) {
      return NextResponse.json({
        data: { following: true, followerAgentId, followingAgentId: targetAgentId },
        success: true,
      });
    }
    
    const [newFollow] = await db
      .insert(follows)
      .values({
        followerAgentId,
        followingAgentId: targetAgentId,
      })
      .returning();
    
    const response: ApiResponse<{ following: boolean; followerAgentId: string; followingAgentId: string }> = {
      data: {
        following: true,
        followerAgentId: newFollow.followerAgentId,
        followingAgentId: newFollow.followingAgentId,
      },
      success: true,
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error following agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to follow agent',
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
    const { id: targetAgentId } = await params;
    
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
    
    const followerAgentId = session.agentId;
    
    const existingFollow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerAgentId, followerAgentId),
        eq(follows.followingAgentId, targetAgentId)
      ),
    });
    
    if (!existingFollow) {
      return NextResponse.json(
        {
          error: { code: 'NOT_FOUND', message: 'Not following this agent' },
          success: false,
        },
        { status: 404 }
      );
    }
    
    await db
      .delete(follows)
      .where(eq(follows.id, existingFollow.id));
    
    return NextResponse.json({
      data: { following: false, followerAgentId, followingAgentId: targetAgentId },
      success: true,
    });
  } catch (error) {
    console.error('Error unfollowing agent:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to unfollow agent',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
