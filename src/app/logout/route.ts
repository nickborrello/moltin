import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
