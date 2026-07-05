import { cookies } from 'next/headers';
import { verifySession } from './session';

/**
 * Reads the `session` cookie inside a route handler and reports whether it is a
 * valid signed-in session. Kept separate from session.ts (which the Edge
 * middleware imports) so next/headers never enters the middleware bundle.
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return false;
  return verifySession(token);
}
