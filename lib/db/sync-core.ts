import { Client } from 'pg';

export type SyncDirection = 'prod -> local' | 'local -> prod';

type IdentityKey =
  | { kind: 'column'; col: string }
  | { kind: 'composite'; cols: [string, string]; sep: string };

type ConflictKey =
  | { kind: 'column'; col: string }
  | { kind: 'composite'; cols: string[] };

type ConflictStrategy =
  | { kind: 'insert-only' }
  | { kind: 'last-write-wins'; timestampCol: string };

export interface TableConfig {
  name: string;
  conflictKey: ConflictKey;
  orderBy: string;
  identity: IdentityKey;
  strategy: ConflictStrategy;
}

export const TABLES: TableConfig[] = [
  {
    name: '"Book"',
    // Conflict on id (cuid), not fileName: BookImage, UserBookmark, and
    // ProcessingHistory FK to Book.id. Resolving conflicts on fileName would
    // keep the target's id while incoming child rows still reference the
    // source's id, leaving child FK references dangling. In this app's
    // workflow books are only ingested via the EPUB pipeline on a single
    // machine, so cuids stay consistent across DBs and id-conflict is safe.
    conflictKey: { kind: 'column', col: 'id' },
    orderBy: '"createdAt"',
    identity: { kind: 'column', col: '"fileName"' },
    strategy: { kind: 'last-write-wins', timestampCol: '"updatedAt"' },
  },
  {
    name: '"BookImage"',
    conflictKey: { kind: 'column', col: 'id' },
    orderBy: '"createdAt"',
    identity: { kind: 'column', col: '"fileName"' },
    strategy: { kind: 'insert-only' },
  },
  {
    name: '"ProcessingHistory"',
    conflictKey: { kind: 'column', col: 'id' },
    orderBy: '"processedAt"',
    identity: { kind: 'column', col: 'id' },
    strategy: { kind: 'insert-only' },
  },
  {
    name: 'bookmarks',
    conflictKey: { kind: 'composite', cols: ['file_name', 'directory'] },
    orderBy: 'updated_at',
    identity: { kind: 'composite', cols: ['file_name', 'directory'], sep: '|' },
    strategy: { kind: 'last-write-wins', timestampCol: 'updated_at' },
  },
  {
    name: '"UserBookmark"',
    conflictKey: { kind: 'composite', cols: ['bookId', 'userId'] },
    orderBy: '"updatedAt"',
    identity: { kind: 'column', col: 'id' },
    strategy: { kind: 'last-write-wins', timestampCol: '"updatedAt"' },
  },
  {
    name: 'vocabulary_entries',
    conflictKey: { kind: 'column', col: 'id' },
    orderBy: 'created_at',
    identity: { kind: 'column', col: 'word' },
    strategy: { kind: 'last-write-wins', timestampCol: 'updated_at' },
  },
  {
    name: 'text_entries',
    conflictKey: { kind: 'composite', cols: ['file_name', 'directory'] },
    orderBy: 'created_at',
    identity: { kind: 'composite', cols: ['file_name', 'directory'], sep: '|' },
    strategy: { kind: 'insert-only' },
  },
];

export function stripQuotes(name: string): string {
  return name.replace(/^"|"$/g, '');
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
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

async function getCount(client: Client, table: string): Promise<number | null> {
  const bare = stripQuotes(table);
  try {
    const result = await client.query(`SELECT COUNT(*) as count FROM "${bare}"`);
    return parseInt(result.rows[0].count, 10);
  } catch (err) {
    console.error(`[sync-core] getCount(${bare}) failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function identityQuery(table: TableConfig): string {
  const bare = stripQuotes(table.name);
  if (table.identity.kind === 'composite') {
    const [a, b] = table.identity.cols;
    return `SELECT ${a} || '${table.identity.sep}' || ${b} as key FROM "${bare}"`;
  }
  return `SELECT ${table.identity.col}::text as key FROM "${bare}"`;
}

async function getIdentities(client: Client, table: TableConfig): Promise<Set<string>> {
  try {
    const result = await client.query(identityQuery(table));
    return new Set(result.rows.map((r: { key: string }) => r.key));
  } catch (err) {
    console.error(
      `[sync-core] getIdentities(${stripQuotes(table.name)}) failed:`,
      err instanceof Error ? err.message : err
    );
    return new Set();
  }
}

export interface DiffResult {
  table: string;
  localCount: number | null;
  prodCount: number | null;
  onlyLocal: string[];
  onlyProd: string[];
}

export async function computeDiffs(prod: Client, local: Client): Promise<DiffResult[]> {
  const diffs: DiffResult[] = [];
  for (const table of TABLES) {
    const [localCount, prodCount, localIds, prodIds] = await Promise.all([
      getCount(local, table.name),
      getCount(prod, table.name),
      getIdentities(local, table),
      getIdentities(prod, table),
    ]);
    diffs.push({
      table: stripQuotes(table.name),
      localCount,
      prodCount,
      onlyLocal: Array.from(localIds).filter(id => !prodIds.has(id)),
      onlyProd: Array.from(prodIds).filter(id => !localIds.has(id)),
    });
  }
  return diffs;
}

function conflictColumns(key: ConflictKey): string[] {
  return key.kind === 'column' ? [key.col] : key.cols;
}

function buildUpsertSql(table: TableConfig, columns: string[]): string {
  const colList = columns.map(quoteIdent).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  const conflictCols = conflictColumns(table.conflictKey);
  const conflictExpr = conflictCols.map(quoteIdent).join(', ');

  if (table.strategy.kind === 'insert-only') {
    return `INSERT INTO ${table.name} (${colList}) VALUES (${placeholders})
            ON CONFLICT (${conflictExpr}) DO NOTHING`;
  }

  const ts = table.strategy.timestampCol;
  // Never overwrite the conflict columns or the primary key on update.
  const excludedFromUpdate = new Set<string>([...conflictCols, 'id']);
  const updateSet = columns
    .filter(c => !excludedFromUpdate.has(c))
    .map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
    .join(', ');

  return `INSERT INTO ${table.name} (${colList}) VALUES (${placeholders})
          ON CONFLICT (${conflictExpr}) DO UPDATE SET ${updateSet}
          WHERE EXCLUDED.${ts} > ${table.name}.${ts}`;
}

export interface SyncResult {
  table: string;
  rows: number;
  failed: number;
  direction: SyncDirection;
}

export async function syncDirection(
  source: Client,
  target: Client,
  table: TableConfig,
  direction: SyncDirection
): Promise<SyncResult> {
  const tableName = stripQuotes(table.name);
  const columns = await getColumns(source, table.name);
  if (columns.length === 0) return { table: tableName, rows: 0, failed: 0, direction };

  const sourceRows = await source.query(
    `SELECT * FROM ${table.name} ORDER BY ${table.orderBy}`
  );
  if (sourceRows.rows.length === 0) return { table: tableName, rows: 0, failed: 0, direction };

  const sql = buildUpsertSql(table, columns);

  let synced = 0;
  let failed = 0;
  for (const row of sourceRows.rows) {
    const values = columns.map(c => row[c]);
    try {
      await target.query(sql, values);
      synced++;
    } catch (err) {
      failed++;
      console.error(`  [ERR] ${table.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { table: tableName, rows: synced, failed, direction };
}

export async function withClients<T>(
  prodUrl: string,
  localUrl: string,
  fn: (prod: Client, local: Client) => Promise<T>
): Promise<T> {
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

export async function pull(prod: Client, local: Client): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const table of TABLES) {
    results.push(await syncDirection(prod, local, table, 'prod -> local'));
  }
  return results;
}

export async function push(prod: Client, local: Client): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const table of TABLES) {
    results.push(await syncDirection(local, prod, table, 'local -> prod'));
  }
  return results;
}

export async function pushMissing(
  prod: Client,
  local: Client,
  diffs: DiffResult[]
): Promise<SyncResult[]> {
  const tablesWithLocalOnly = new Set(
    diffs.filter(d => d.onlyLocal.length > 0).map(d => d.table)
  );
  const results: SyncResult[] = [];
  for (const table of TABLES) {
    if (tablesWithLocalOnly.has(stripQuotes(table.name))) {
      results.push(await syncDirection(local, prod, table, 'local -> prod'));
    }
  }
  return results;
}

export async function fullSync(prod: Client, local: Client): Promise<SyncResult[]> {
  const pullResults = await pull(prod, local);
  const pushResults = await push(prod, local);
  return [...pullResults, ...pushResults];
}
