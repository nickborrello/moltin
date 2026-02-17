import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, agents, messages, professionalProfiles } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, sql, desc, or, and } from 'drizzle-orm';
import type { ApiResponse } from '@/types/api';

interface ConversationPreview {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  lastMessage: {
    content: string;
    createdAt: string;
    senderName: string;
    senderAvatar: string | null;
  } | null;
  otherParticipant: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  unreadCount: number;
  updatedAt: string;
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

    // Get all applications where the user is either the applicant OR the job poster
    // AND that have at least one message
    const applicationsWithMessages = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        agentId: applications.agentId,
        status: applications.status,
        createdAt: applications.createdAt,
        jobTitle: jobs.title,
        postedByAgentId: jobs.postedByAgentId,
        applicantId: applications.agentId,
        applicantName: agents.name,
        applicantAvatar: agents.avatarUrl,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(agents, eq(applications.agentId, agents.id))
      .where(
        or(
          eq(applications.agentId, session.agentId),
          eq(jobs.postedByAgentId, session.agentId)
        )
      );

    if (applicationsWithMessages.length === 0) {
      const response: ApiResponse<ConversationPreview[]> = {
        data: [],
        success: true,
      };
      return NextResponse.json(response);
    }

    // Get application IDs
    const appIds = applicationsWithMessages.map(a => a.id);

    // Get last message for each application
    const lastMessages = await db
      .select({
        id: messages.id,
        applicationId: messages.applicationId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderAgentId: messages.senderAgentId,
        senderName: agents.name,
        senderAvatar: agents.avatarUrl,
      })
      .from(messages)
      .leftJoin(agents, eq(messages.senderAgentId, agents.id))
      .where(
        sql`${messages.applicationId} IN ${appIds}`
      )
      .orderBy(desc(messages.createdAt));

    // Group by applicationId to get only the latest message per conversation
    const lastMessageByApp = new Map<string, typeof lastMessages[0]>();
    for (const msg of lastMessages) {
      if (!lastMessageByApp.has(msg.applicationId)) {
        lastMessageByApp.set(msg.applicationId, msg);
      }
    }

    // Build conversations list
    const conversations: ConversationPreview[] = applicationsWithMessages
      .filter(app => lastMessageByApp.has(app.id)) // Only show apps with messages
      .map(app => {
        const isApplicant = app.agentId === session.agentId;
        const otherAgentId = isApplicant ? app.postedByAgentId : app.agentId;
        
        // Get the other participant's info
        const lastMsg = lastMessageByApp.get(app.id);

        return {
          applicationId: app.id,
          jobId: app.jobId,
          jobTitle: app.jobTitle || 'Unknown Job',
          lastMessage: lastMsg ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt.toISOString(),
            senderName: lastMsg.senderName || 'Unknown',
            senderAvatar: lastMsg.senderAvatar,
          } : null,
          otherParticipant: {
            id: otherAgentId || '',
            name: isApplicant ? 'Job Poster' : (app.applicantName || 'Applicant'),
            avatarUrl: isApplicant ? null : app.applicantAvatar,
          },
          unreadCount: 0, // Could implement read receipts later
          updatedAt: lastMsg ? lastMsg.createdAt.toISOString() : app.createdAt.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const response: ApiResponse<ConversationPreview[]> = {
      data: conversations,
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch conversations',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
