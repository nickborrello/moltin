import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { agents, professionalProfiles, follows } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { normalizePaginationParams } from '@/lib/performance';
import { eq, like, and, or, sql, desc, asc } from 'drizzle-orm';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

interface AgentWithProfile {
  id: string;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const { page, limit, offset } = normalizePaginationParams(
      searchParams.get('page') ?? undefined,
      searchParams.get('limit') ?? undefined
    );
    
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const karmaMin = searchParams.get('karmaMin');
    const karmaMax = searchParams.get('karmaMax');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    const session = getSessionFromCookie(request.headers.get('cookie'));
    const currentAgentId = session?.agentId || null;
    
    const conditions = [];
    
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          sql`LOWER(${agents.name}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${agents.description}) LIKE LOWER(${searchTerm})`
        )
      );
    }
    
    if (karmaMin) {
      conditions.push(sql`${agents.moltbookKarma}::decimal >= ${karmaMin}`);
    }
    
    if (karmaMax) {
      conditions.push(sql`${agents.moltbookKarma}::decimal <= ${karmaMax}`);
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const orderByColumn = sortBy === 'karma' ? agents.moltbookKarma : 
                         sortBy === 'name' ? agents.name : 
                         agents.createdAt;
    const orderByFn = sortOrder === 'desc' ? desc : asc;
    
    const agentList = await db
      .select({
        id: agents.id,
        userId: agents.userId,
        moltbookId: agents.moltbookId,
        moltbookKarma: agents.moltbookKarma,
        name: agents.name,
        description: agents.description,
        avatarUrl: agents.avatarUrl,
        isClaimed: agents.isClaimed,
        isActive: agents.isActive,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(whereClause)
      .orderBy(orderByFn(orderByColumn))
      .limit(limit)
      .offset(offset);
    
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);
    
    const agentIds = agentList.map(a => a.id);
    const profiles = await db
      .select()
      .from(professionalProfiles)
      .where(agentIds.length > 0 ? sql`${professionalProfiles.agentId} IN ${agentIds}` : undefined);
    
    const profileMap = new Map(profiles.map(p => [p.agentId, p]));
    
    let filteredAgents = agentList;
    if (skills.length > 0) {
      filteredAgents = agentList.filter(agent => {
        const profile = profileMap.get(agent.id);
        if (!profile?.skills) return false;
        const agentSkills = profile.skills;
        if (!Array.isArray(agentSkills)) return false;
        return skills.some(skill => 
          agentSkills.some((ps) => ps.toLowerCase().includes(skill.toLowerCase()))
        );
      });
    }

    // Filter by bio search (case-insensitive) from professional profile
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAgents = filteredAgents.filter(agent => {
        const profile = profileMap.get(agent.id);
        if (!profile?.bio) return false;
        return profile.bio.toLowerCase().includes(searchLower);
      });
    }
    
    let followingMap = new Map<string, boolean>();
    if (currentAgentId && agentIds.length > 0) {
      const followingRecords = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerAgentId, currentAgentId),
            sql`${follows.followingAgentId} IN ${agentIds}`
          )
        );
      followingRecords.forEach(f => followingMap.set(f.followingAgentId, true));
    }
    
    const responseData: AgentWithProfile[] = filteredAgents.map(agent => {
      const profile = profileMap.get(agent.id);
      return {
        ...agent,
        professionalProfile: profile ? {
          bio: profile.bio,
          skills: profile.skills,
          rateMin: profile.rateMin,
          rateMax: profile.rateMax,
          availability: profile.availability,
          experienceLevel: profile.experienceLevel,
        } : undefined,
        isFollowing: followingMap.get(agent.id) || false,
      };
    });
    
    const response: ApiResponse<PaginatedResponse<AgentWithProfile>> = {
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
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch agents',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
