import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, verifySession } from '@/lib/auth/session';

/**
 * Consolidated authentication API route
 * Handles login, logout, and session verification with action routing
 *
 * POST /api/auth?action=login - Authenticate user
 * POST /api/auth?action=logout - Clear session
 * GET /api/auth?action=session - Check authentication status
 */

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'login') {
    return handleLogin(request);
  } else if (action === 'logout') {
    return handleLogout();
  }

  return NextResponse.json(
    { message: 'Invalid action. Use action=login or action=logout' },
    { status: 400 }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'session') {
    return handleSession();
  }

  return NextResponse.json(
    { message: 'Invalid action. Use action=session' },
    { status: 400 }
  );
}

// Login handler (uses bcrypt - Node.js runtime required)
async function handleLogin(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await createSession();

    // Set cookie
    const response = NextResponse.json({
      message: 'Login successful',
      success: true
    });

    // COOKIE_SECURE=false allows HTTP in production (e.g., before SSL setup)
    const isSecure = process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production';

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Login failed' },
      { status: 500 }
    );
  }
}

// Logout handler
async function handleLogout() {
  const response = NextResponse.json({
    message: 'Logged out successfully',
    success: true
  });

  // Delete session cookie
  response.cookies.delete('session');

  return response;
}

// Session verification handler (Edge Runtime compatible)
async function handleSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }

  const isValid = await verifySession(sessionCookie.value);
  return NextResponse.json({ authenticated: isValid });
}
