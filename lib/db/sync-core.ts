import { Client } from 'pg';

export interface TableConfig {
  name: string;
  conflictKey: string;
  orderBy: string;
  identityCol: string;
  timestampCol: string | null;
}

export const TABLES: TableConfig[] = [
  { name: '"Book"', conflictKey: 'id', orderBy: '"createdAt"', identityCol: '"fileName"', timestampCol: '"updatedAt"' },
  { name: '"BookImage"', conflictKey: 'id', orderBy: '"createdAt"', identityCol: '"fileName"', timestampCol: null },
  { name: '"ProcessingHistory"', conflictKey: 'id', orderBy: '"processedAt"', identityCol: 'id', timestampCol: null },
  { name: 'bookmarks', conflictKey: 'id', orderBy: 'updated_at', identityCol: 'file_name', timestampCol: 'updated_at' },
  { name: '"UserBookmark"', conflictKey: 'id', orderBy: '"updatedAt"', identityCol: 'id', timestampCol: '"updatedAt"' },
  { name: 'vocabulary_entries', conflictKey: 'id', orderBy: 'created_at', identityCol: 'word', timestampCol: 'updated_at' },
  { name: 'text_entries', conflictKey: 'id', orderBy: 'created_at', identityCol: 'file_name', timestampCol: null },
];

export function stripQuotes(name: string): string {
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
    const query = (bare === 'text_entries' || bare === 'bookmarks')
      ? `SELECT file_name || '|' || directory as key FROM "${bare}"`
      : `SELECT ${table.identityCol}::text as key FROM "${bare}"`;
    const result = await client.query(query);
    return new Set(result.rows.map((r: { key: string }) => r.key));
  } catch {
    return new Set();
  }
}

export interface DiffResult {
  table: string;
  localCount: number;
  prodCount: number;
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

function buildUpsertSql(table: TableConfig, columns: string[]): string {
  const quotedCols = columns.map(quoteIdent);
  const colList = quotedCols.join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const conflictCol = quoteIdent(table.conflictKey);

  if (table.timestampCol === null) {
    return `INSERT INTO ${table.name} (${colList}) VALUES (${placeholders})
            ON CONFLICT (${conflictCol}) DO NOTHING`;
  }

  const updateSet = columns
    .filter(c => c !== table.conflictKey)
    .map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
    .join(', ');

  return `INSERT INTO ${table.name} (${colList}) VALUES (${placeholders})
          ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet}
          WHERE EXCLUDED.${table.timestampCol} > ${table.name}.${table.timestampCol}`;
}

export interface SyncResult {
  table: string;
  rows: number;
  direction: string;
}

export async function syncDirection(
  source: Client,
  target: Client,
  table: TableConfig,
  direction: string
): Promise<SyncResult> {
  const columns = await getColumns(source, table.name);
  if (columns.length === 0) return { table: stripQuotes(table.name), rows: 0, direction };

  const sourceRows = await source.query(
    `SELECT * FROM ${table.name} ORDER BY ${table.orderBy}`
  );
  if (sourceRows.rows.length === 0) return { table: stripQuotes(table.name), rows: 0, direction };

  const sql = buildUpsertSql(table, columns);

  let synced = 0;
  for (const row of sourceRows.rows) {
    const values = columns.map(c => row[c]);
    try {
      await target.query(sql, values);
      synced++;
    } catch (err) {
      console.error(`  [ERR] ${table.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { table: stripQuotes(table.name), rows: synced, direction };
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

export async function fullSync(prod: Client, local: Client): Promise<SyncResult[]> {
  const pullResults = await pull(prod, local);
  const pushResults = await push(prod, local);
  return [...pullResults, ...pushResults];
}
