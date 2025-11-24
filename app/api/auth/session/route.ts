import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';

export const runtime = 'edge';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }

  const isValid = await verifySession(sessionCookie.value);
  return NextResponse.json({ authenticated: isValid });
}
