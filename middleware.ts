import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { findPublicBook, PUBLIC_BOOKS } from '@/lib/publicBooks';

// What a signed-out guest may reach: the home redirect ('/') and public library,
// the reader ('/read') for an allowlisted book (checked against the query params),
// and an allowlisted book's own static assets (e.g. the metadata JSON that the
// reader fetches to resolve inline illustrations).
function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function isGuestAllowed(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;

  if (path === '/' || path === '/library') {
    return true;
  }

  if (path === '/read') {
    const directory = request.nextUrl.searchParams.get('directory');
    const fileName = request.nextUrl.searchParams.get('fileName');
    return findPublicBook(directory, fileName) !== null;
  }

  // Static assets are requested under the book's path (which may be percent-encoded).
  const decodedPath = decodePath(path);
  return PUBLIC_BOOKS.some((book) => decodedPath.startsWith(`/${book.directory}/`));
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session');
  if (sessionCookie && (await verifySession(sessionCookie.value))) {
    return NextResponse.next();
  }

  if (isGuestAllowed(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

// Protect all routes except public ones
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (ALL API routes - they handle their own auth)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
