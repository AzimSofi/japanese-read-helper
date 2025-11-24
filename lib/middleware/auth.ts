import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the API key from the request headers
 * @param request Next.js request object
 * @returns true if authenticated, false otherwise
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const adminApiKey = process.env.ADMIN_API_KEY;

  // If no admin key is configured, deny access
  if (!adminApiKey) {
    console.warn('ADMIN_API_KEY not configured in environment variables');
    return false;
  }

  // Check if the provided key matches
  return apiKey === adminApiKey;
}

/**
 * Middleware wrapper for protected routes
 * Returns a 401 response if authentication fails
 * @param request Next.js request object
 * @returns NextResponse with 401 if unauthorized, null if authenticated
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Valid API key required. Include "x-api-key" header with your ADMIN_API_KEY.',
      },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Helper to check if API key authentication is configured
 * @returns true if ADMIN_API_KEY is set
 */
export function isAuthConfigured(): boolean {
  return !!process.env.ADMIN_API_KEY;
}
