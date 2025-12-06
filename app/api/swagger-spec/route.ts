import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/swagger/spec';

/**
 * Serves the OpenAPI specification for Swagger UI
 */
export async function GET() {
  return NextResponse.json(openApiSpec);
}
