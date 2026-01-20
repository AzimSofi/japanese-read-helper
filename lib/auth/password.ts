import bcrypt from 'bcryptjs';

export async function verifyPassword(password: string): Promise<boolean> {
  const hashBase64 = process.env.AUTH_PASSWORD_HASH;

  if (!hashBase64) {
    console.error('AUTH_PASSWORD_HASH environment variable not set');
    return false;
  }

  // Decode from base64 (workaround for $ character escaping in Lambda env vars)
  const hash = Buffer.from(hashBase64, 'base64').toString('utf-8');

  return bcrypt.compare(password, hash);
}

// Utility to generate hash (for setup only)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
