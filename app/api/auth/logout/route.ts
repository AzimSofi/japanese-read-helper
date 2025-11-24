import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    message: 'Logged out successfully',
    success: true
  });

  // Delete session cookie
  response.cookies.delete('session');

  return response;
}
