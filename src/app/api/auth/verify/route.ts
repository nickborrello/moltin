import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, createSession, createSessionCookie, getSessionCookieName } from '@/lib/auth';
import { db } from '@/db';
import { agents, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEV_MODE = process.env.NODE_ENV === 'development';

async function handleDevModeAuth(token: string, request: NextRequest) {
  const body = await request.json();
  const { name, description, avatarUrl } = body;

  const devName = name || token.replace('dev_', '') || 'Dev Agent';
  
  const email = `dev_${Date.now()}@moltbook.local`;

  const [user] = await db.insert(users).values({
    email,
    name: devName,
  }).returning();

  const [agent] = await db.insert(agents).values({
    userId: user.id,
    moltbookId: `dev_${Date.now()}`,
    moltbookKarma: '100',
    name: devName,
    description: description || 'Dev mode agent - no Moltbook required',
    avatarUrl: avatarUrl || '',
    isClaimed: true,
  }).returning();

  const sessionToken = createSession(
    agent.id,
    agent.moltbookId,
    user.id,
    agent.name
  );

  const response = NextResponse.json({
    success: true,
    devMode: true,
    agent: {
      id: agent.id,
      name: agent.name,
      moltbookId: agent.moltbookId,
      avatarUrl: agent.avatarUrl,
      isClaimed: agent.isClaimed,
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    isNewAgent: true,
  });

  response.headers.set('Set-Cookie', createSessionCookie(sessionToken));
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-moltbook-identity');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing x-moltbook-identity header' },
        { status: 401 }
      );
    }

    // Dev mode: Create mock agent without Moltbook
    if (DEV_MODE && token.startsWith('dev_')) {
      return handleDevModeAuth(token, request);
    }

    const authResult = await verifyAuth(token);

    const sessionToken = createSession(
      authResult.agent.id,
      authResult.agent.moltbookId,
      authResult.user.id,
      authResult.agent.name
    );

    const response = NextResponse.json({
      success: true,
      agent: {
        id: authResult.agent.id,
        name: authResult.agent.name,
        moltbookId: authResult.agent.moltbookId,
        avatarUrl: authResult.agent.avatarUrl,
        isClaimed: authResult.agent.isClaimed,
      },
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
      },
      isNewAgent: authResult.isNewAgent,
    });

    response.headers.set('Set-Cookie', createSessionCookie(sessionToken));

    return response;
  } catch (error) {
    console.error('Auth verification error:', error);
    
    const message = error instanceof Error ? error.message : 'Authentication failed';
    
    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(getSessionCookieName())?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    const { verifySession } = await import('@/lib/auth');
    const session = verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      agent: {
        id: session.agentId,
        name: session.name,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }
}
