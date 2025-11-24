import bcrypt from 'bcryptjs';

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.AUTH_PASSWORD_HASH;

  if (!hash) {
    console.error('AUTH_PASSWORD_HASH environment variable not set');
    return false;
  }

  return bcrypt.compare(password, hash);
}

// Utility to generate hash (for setup only)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
