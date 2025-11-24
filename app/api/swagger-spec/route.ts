import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/swagger/spec';

export const runtime = 'edge';

/**
 * Serves the OpenAPI specification for Swagger UI
 */
export async function GET() {
  return NextResponse.json(openApiSpec);
}
