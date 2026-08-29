import { SignJWT, jwtVerify } from 'jose';

// Resolved per call rather than at module load so a missing secret fails on use
// with a clear error, instead of silently signing everything with a constant.
function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set; refusing to sign or verify sessions');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d') // 7 days
    .sign(sessionKey());
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, sessionKey());
    return true;
  } catch {
    return false;
  }
}
