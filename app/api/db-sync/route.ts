import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { Client } from 'pg';
import {
  TABLES,
  computeDiffs,
  syncDirection,
  withClients,
  stripQuotes,
  type SyncResult,
} from '@/lib/db/sync-core';

export const dynamic = 'force-dynamic';

async function requireSession(request: NextRequest): Promise<NextResponse | null> {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie || !(await verifySession(sessionCookie.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

function ensureProdConfigured(): NextResponse | null {
  if (!process.env.PROD_DATABASE_URL) {
    return NextResponse.json(
      { error: 'Sync not available - PROD_DATABASE_URL not configured' },
      { status: 503 }
    );
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Sync not available - DATABASE_URL not configured' },
      { status: 503 }
    );
  }
  return null;
}

function callWithClients<T>(fn: (prod: Client, local: Client) => Promise<T>): Promise<T> {
  return withClients(process.env.PROD_DATABASE_URL!, process.env.DATABASE_URL!, fn);
}

export async function GET(request: NextRequest) {
  const authError = await requireSession(request);
  if (authError) return authError;

  const configError = ensureProdConfigured();
  if (configError) return configError;

  try {
    const diffs = await callWithClients(computeDiffs);
    return NextResponse.json({ diffs });
  } catch (error) {
    console.error('[db-sync] status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireSession(request);
  if (authError) return authError;

  const configError = ensureProdConfigured();
  if (configError) return configError;

  const body = await request.json();
  const { direction } = body as { direction: 'pull' | 'push' | 'full' };

  if (!['pull', 'push', 'full'].includes(direction)) {
    return NextResponse.json(
      { error: 'Invalid direction. Use pull, push, or full' },
      { status: 400 }
    );
  }

  try {
    const results = await callWithClients(async (prod, local) => {
      const syncResults: SyncResult[] = [];

      if (direction === 'pull' || direction === 'full') {
        for (const table of TABLES) {
          syncResults.push(await syncDirection(prod, local, table, 'prod -> local'));
        }
      }

      if (direction === 'push' || direction === 'full') {
        const diffs = await computeDiffs(prod, local);
        for (const table of TABLES) {
          const diff = diffs.find(d => d.table === stripQuotes(table.name));
          if (diff && diff.onlyLocal.length > 0) {
            syncResults.push(await syncDirection(local, prod, table, 'local -> prod'));
          }
        }
      }

      return syncResults;
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[db-sync] sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
