import jwt from 'jsonwebtoken';
import { getMoltbookClient } from './moltbook';
import { db } from '@/db';
import { agents, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Agent, User } from '@/db/schema';
import type { MoltbookAgent } from '@/types/moltbook';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_COOKIE_NAME = 'moltbook_session';
const SESSION_EXPIRY_DAYS = 7;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

type JwtSecret = string;

export interface SessionPayload {
  agentId: string;
  moltbookId: string;
  userId: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  agent: Agent;
  user: User;
  isNewAgent: boolean;
}

export async function verifyAuth(token: string): Promise<AuthResult> {
  const moltbookClient = getMoltbookClient();
  const result = await moltbookClient.verifyIdentityToken(token);

  if (!result.success || !result.valid || !result.agent) {
    throw new Error(result.error?.message || 'Invalid token');
  }

  const moltbookAgent = result.agent;
  return ensureAgentExists(moltbookAgent);
}

export async function ensureAgentExists(moltbookAgent: MoltbookAgent): Promise<AuthResult> {
  const existingAgent = await db.query.agents.findFirst({
    where: eq(agents.moltbookId, moltbookAgent.id),
  });

  if (existingAgent) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, existingAgent.userId),
    });

    if (!user) {
      throw new Error('Agent exists but user not found');
    }

    return {
      agent: existingAgent,
      user,
      isNewAgent: false,
    };
  }

  const ownerEmail = moltbookAgent.owner?.x_handle 
    ? `${moltbookAgent.owner.x_handle}@moltbook.local`
    : `agent-${moltbookAgent.id}@moltbook.local`;

  let user = await db.query.users.findFirst({
    where: eq(users.email, ownerEmail),
  });

  if (!user) {
    const [newUser] = await db.insert(users).values({
      email: ownerEmail,
      name: moltbookAgent.owner?.x_handle || moltbookAgent.name,
    }).returning();
    user = newUser;
  }

  const [newAgent] = await db.insert(agents).values({
    userId: user.id,
    moltbookId: moltbookAgent.id,
    moltbookKarma: moltbookAgent.karma.toString(),
    name: moltbookAgent.name,
    description: moltbookAgent.description || '',
    avatarUrl: moltbookAgent.avatar_url || '',
    isClaimed: moltbookAgent.is_claimed,
  }).returning();

  return {
    agent: newAgent,
    user,
    isNewAgent: true,
  };
}

export function createSession(agentId: string, moltbookId: string, userId: string, name: string): string {
  const payload = {
    agentId,
    moltbookId,
    userId,
    name,
  };

  return jwt.sign(payload, JWT_SECRET as JwtSecret, {
    expiresIn: `${SESSION_EXPIRY_DAYS}d`,
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as JwtSecret) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function getSessionFromCookie(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (!sessionToken) {
    return null;
  }

  return verifySession(sessionToken);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

export function createSessionCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_EXPIRY_DAYS);

  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expires.toUTCString()}`,
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  return cookieParts.join('; ');
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}
