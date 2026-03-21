import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

interface TableConfig {
  name: string;
  conflictKey: string;
  orderBy: string;
  identityCol: string;
}

const TABLES: TableConfig[] = [
  { name: '"Book"', conflictKey: 'id', orderBy: '"createdAt"', identityCol: '"fileName"' },
  { name: '"BookImage"', conflictKey: 'id', orderBy: '"createdAt"', identityCol: '"fileName"' },
  { name: '"ProcessingHistory"', conflictKey: 'id', orderBy: '"processedAt"', identityCol: 'id' },
  { name: 'bookmarks', conflictKey: 'id', orderBy: 'updated_at', identityCol: 'file_name' },
  { name: '"UserBookmark"', conflictKey: 'id', orderBy: '"updatedAt"', identityCol: 'id' },
  { name: 'vocabulary_entries', conflictKey: 'id', orderBy: 'created_at', identityCol: 'word' },
  { name: 'text_entries', conflictKey: 'id', orderBy: 'created_at', identityCol: 'file_name' },
];

function stripQuotes(name: string): string {
  return name.replace(/^"|"$/g, '');
}

function quoteIdent(name: string): string {
  return `"${name}"`;
}

async function getColumns(client: Client, tableName: string): Promise<string[]> {
  const bare = stripQuotes(tableName);
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = $1 AND table_schema = 'public'
     ORDER BY ordinal_position`,
    [bare]
  );
  return result.rows.map((r: { column_name: string }) => r.column_name);
}

async function getCount(client: Client, table: string): Promise<number> {
  const bare = stripQuotes(table);
  try {
    const result = await client.query(`SELECT COUNT(*) as count FROM "${bare}"`);
    return parseInt(result.rows[0].count, 10);
  } catch {
    return -1;
  }
}

async function getIdentities(client: Client, table: TableConfig): Promise<Set<string>> {
  const bare = stripQuotes(table.name);
  try {
    let query: string;
    if (bare === 'text_entries' || bare === 'bookmarks') {
      query = `SELECT file_name || '|' || directory as key FROM "${bare}"`;
    } else {
      query = `SELECT ${table.identityCol}::text as key FROM "${bare}"`;
    }
    const result = await client.query(query);
    return new Set(result.rows.map((r: { key: string }) => r.key));
  } catch {
    return new Set();
  }
}

interface DiffResult {
  table: string;
  localCount: number;
  prodCount: number;
  onlyLocal: string[];
  onlyProd: string[];
}

async function computeDiffs(prod: Client, local: Client): Promise<DiffResult[]> {
  const diffs: DiffResult[] = [];
  for (const table of TABLES) {
    const [localCount, prodCount, localIds, prodIds] = await Promise.all([
      getCount(local, table.name),
      getCount(prod, table.name),
      getIdentities(local, table),
      getIdentities(prod, table),
    ]);
    const onlyLocal = Array.from(localIds).filter(id => !prodIds.has(id));
    const onlyProd = Array.from(prodIds).filter(id => !localIds.has(id));
    diffs.push({
      table: stripQuotes(table.name),
      localCount,
      prodCount,
      onlyLocal,
      onlyProd,
    });
  }
  return diffs;
}

async function syncDirection(
  source: Client,
  target: Client,
  table: TableConfig,
): Promise<number> {
  const columns = await getColumns(source, table.name);
  if (columns.length === 0) return 0;

  const sourceRows = await source.query(
    `SELECT * FROM ${table.name} ORDER BY ${table.orderBy}`
  );
  if (sourceRows.rows.length === 0) return 0;

  const quotedCols = columns.map(quoteIdent);
  const colList = quotedCols.join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const conflictCol = quoteIdent(table.conflictKey);
  const updateSet = columns
    .filter(c => c !== table.conflictKey)
    .map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
    .join(', ');

  let synced = 0;
  for (const row of sourceRows.rows) {
    const values = columns.map(c => row[c]);
    try {
      await target.query(
        `INSERT INTO ${table.name} (${colList}) VALUES (${placeholders})
         ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet}`,
        values
      );
      synced++;
    } catch (err) {
      console.error(`[db-sync] ${table.name}:`, err instanceof Error ? err.message : err);
    }
  }
  return synced;
}

async function withClients<T>(fn: (prod: Client, local: Client) => Promise<T>): Promise<T> {
  const prodUrl = process.env.PROD_DATABASE_URL;
  const localUrl = process.env.DATABASE_URL;

  if (!prodUrl || !localUrl) {
    throw new Error('PROD_DATABASE_URL or DATABASE_URL not configured');
  }

  const prod = new Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
  const local = new Client({ connectionString: localUrl });

  try {
    await Promise.all([prod.connect(), local.connect()]);
    return await fn(prod, local);
  } finally {
    await prod.end().catch(() => {});
    await local.end().catch(() => {});
  }
}

async function requireSession(request: NextRequest): Promise<NextResponse | null> {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie || !(await verifySession(sessionCookie.value))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authError = await requireSession(request);
  if (authError) return authError;

  if (!process.env.PROD_DATABASE_URL) {
    return NextResponse.json(
      { error: 'Sync not available - PROD_DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const diffs = await withClients(computeDiffs);
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

  if (!process.env.PROD_DATABASE_URL) {
    return NextResponse.json(
      { error: 'Sync not available - PROD_DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { direction } = body as { direction: 'pull' | 'push' | 'full' };

  if (!['pull', 'push', 'full'].includes(direction)) {
    return NextResponse.json(
      { error: 'Invalid direction. Use pull, push, or full' },
      { status: 400 }
    );
  }

  try {
    const results = await withClients(async (prod, local) => {
      const syncResults: { table: string; rows: number; direction: string }[] = [];

      if (direction === 'pull' || direction === 'full') {
        for (const table of TABLES) {
          const rows = await syncDirection(prod, local, table);
          syncResults.push({ table: stripQuotes(table.name), rows, direction: 'prod -> local' });
        }
      }

      if (direction === 'push' || direction === 'full') {
        const diffs = await computeDiffs(prod, local);
        for (const table of TABLES) {
          const diff = diffs.find(d => d.table === stripQuotes(table.name));
          if (diff && diff.onlyLocal.length > 0) {
            const rows = await syncDirection(local, prod, table);
            syncResults.push({ table: stripQuotes(table.name), rows, direction: 'local -> prod' });
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
