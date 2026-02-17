import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSessionFromCookie } from '@/lib/auth';
import { db } from '@/db';
import { agents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function AgentMePage() {
  const headersList = await headers();
  const session = getSessionFromCookie(headersList.get('cookie'));
  
  if (!session?.agentId) {
    redirect('/');
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, session.agentId),
  });

  if (!agent) {
    redirect('/');
  }

  redirect(`/agents/${agent.id}`);
}
