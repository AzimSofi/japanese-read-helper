import { NextRequest, NextResponse } from 'next/server';

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    console.warn('ADMIN_API_KEY not configured');
    return false;
  }

  return apiKey === adminApiKey;
}

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
