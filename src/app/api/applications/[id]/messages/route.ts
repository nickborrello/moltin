import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, applications, jobs, agents } from '@/db/schema';
import { getSessionFromCookie } from '@/lib/auth';
import { eq, asc, sql } from 'drizzle-orm';
import type { ApiResponse } from '@/types/api';

interface MessageWithSender {
  id: string;
  applicationId: string;
  senderAgentId: string;
  content: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
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
        { error: { code: 'FORBIDDEN', message: 'Not authorized to view messages for this application' }, success: false },
        { status: 403 }
      );
    }

    const messageList = await db
      .select({
        id: messages.id,
        applicationId: messages.applicationId,
        senderAgentId: messages.senderAgentId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.applicationId, applicationId))
      .orderBy(asc(messages.createdAt));

    const senderIds = [...new Set(messageList.map(m => m.senderAgentId))];

    let senderDetails: { id: string; name: string; avatarUrl: string | null }[] = [];
    if (senderIds.length > 0) {
      senderDetails = await db
        .select({
          id: agents.id,
          name: agents.name,
          avatarUrl: agents.avatarUrl,
        })
        .from(agents)
        .where(sql`${agents.id} IN ${senderIds}`);
    }

    const senderMap = new Map(senderDetails.map(s => [s.id, s]));

    const messagesWithSender: MessageWithSender[] = messageList.map(msg => {
      const sender = senderMap.get(msg.senderAgentId);
      return {
        id: msg.id,
        applicationId: msg.applicationId,
        senderAgentId: msg.senderAgentId,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: {
          id: sender?.id || msg.senderAgentId,
          name: sender?.name || 'Unknown',
          avatarUrl: sender?.avatarUrl || null,
        },
      };
    });

    const response: ApiResponse<MessageWithSender[]> = {
      data: messagesWithSender,
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch messages',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Message content is required' }, success: false },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Message content cannot be empty' }, success: false },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Message content must be 2000 characters or less' }, success: false },
        { status: 400 }
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
        { error: { code: 'FORBIDDEN', message: 'Not authorized to send messages for this application' }, success: false },
        { status: 403 }
      );
    }

    if (application.status === 'rejected') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot send messages on rejected applications' }, success: false },
        { status: 403 }
      );
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        applicationId,
        senderAgentId: session.agentId,
        content: trimmedContent,
      })
      .returning();

    const senderResult = await db
      .select({
        id: agents.id,
        name: agents.name,
        avatarUrl: agents.avatarUrl,
      })
      .from(agents)
      .where(eq(agents.id, session.agentId))
      .limit(1);

    const sender = senderResult[0];

    const messageWithSender: MessageWithSender = {
      id: newMessage.id,
      applicationId: newMessage.applicationId,
      senderAgentId: newMessage.senderAgentId,
      content: newMessage.content,
      createdAt: newMessage.createdAt,
      sender: {
        id: sender?.id || session.agentId,
        name: sender?.name || 'Unknown',
        avatarUrl: sender?.avatarUrl || null,
      },
    };

    const response: ApiResponse<MessageWithSender> = {
      data: messageWithSender,
      success: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send message',
        },
        success: false,
      },
      { status: 500 }
    );
  }
}
