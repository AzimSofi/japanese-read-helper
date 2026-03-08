#!/usr/bin/env npx tsx
/**
 * Sync production database to local
 *
 * Pulls bookmarks, books, book_images, user_bookmarks, processing_history,
 * and vocabulary_entries from Neon (prod) into the local Docker PostgreSQL.
 * Text entries are skipped by default (large data, synced separately via epub-to-book).
 *
 * Usage:
 *   npx tsx scripts/db/sync-from-prod.ts                # sync all tables (except text_entries)
 *   npx tsx scripts/db/sync-from-prod.ts --include-text # also sync text_entries
 *   npx tsx scripts/db/sync-from-prod.ts --dry-run      # show counts without syncing
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROD_URL = process.env.PROD_DATABASE_URL;
const LOCAL_URL = process.env.DATABASE_URL;
const args = process.argv.slice(2);
const includeText = args.includes('--include-text');
const dryRun = args.includes('--dry-run');

if (!PROD_URL) {
  console.error('Missing PROD_DATABASE_URL in .env.local');
  process.exit(1);
}
if (!LOCAL_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

interface TableConfig {
  name: string;
  conflictKey: string;
  orderBy: string;
  dependsOn?: string;
}

const TABLES: TableConfig[] = [
  { name: '"Book"', conflictKey: 'id', orderBy: '"createdAt"' },
  { name: '"BookImage"', conflictKey: 'id', orderBy: '"createdAt"', dependsOn: '"Book"' },
  { name: '"ProcessingHistory"', conflictKey: 'id', orderBy: '"processedAt"', dependsOn: '"Book"' },
  { name: 'bookmarks', conflictKey: 'id', orderBy: 'updated_at' },
  { name: '"UserBookmark"', conflictKey: 'id', orderBy: '"updatedAt"', dependsOn: '"Book"' },
  { name: 'vocabulary_entries', conflictKey: 'id', orderBy: 'created_at' },
];

if (includeText) {
  TABLES.push({ name: 'text_entries', conflictKey: 'id', orderBy: 'created_at' });
}

function stripQuotes(name: string): string {
  return name.replace(/^"|"$/g, '');
}

function quoteIdent(name: string): string {
  return `"${name}"`;
}

async function getColumns(client: pg.Client, tableName: string): Promise<string[]> {
  const bare = stripQuotes(tableName);
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = $1 AND table_schema = 'public'
     ORDER BY ordinal_position`,
    [bare]
  );
  return result.rows.map((r: { column_name: string }) => r.column_name);
}

async function syncTable(
  prod: pg.Client,
  local: pg.Client,
  table: TableConfig
): Promise<number> {
  const columns = await getColumns(prod, table.name);
  if (columns.length === 0) {
    console.log(`  [SKIP] Table ${table.name} not found in prod`);
    return 0;
  }

  const prodRows = await prod.query(
    `SELECT * FROM ${table.name} ORDER BY ${table.orderBy}`
  );

  if (prodRows.rows.length === 0) {
    console.log(`  [SKIP] ${table.name} is empty in prod`);
    return 0;
  }

  if (dryRun) {
    console.log(`  [DRY] ${table.name}: ${prodRows.rows.length} rows in prod`);
    return prodRows.rows.length;
  }

  const quotedCols = columns.map(quoteIdent);
  const colList = quotedCols.join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const conflictCol = quoteIdent(table.conflictKey);
  const updateSet = columns
    .filter(c => c !== table.conflictKey)
    .map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
    .join(', ');

  let synced = 0;
  for (const row of prodRows.rows) {
    const values = columns.map(c => row[c]);
    try {
      await local.query(
        `INSERT INTO ${table.name} (${colList}) VALUES (${placeholders})
         ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateSet}`,
        values
      );
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERR] ${table.name} row ${row[table.conflictKey]}: ${msg}`);
    }
  }

  return synced;
}

async function main() {
  console.log('=== Prod -> Local Database Sync ===\n');
  if (dryRun) console.log('[DRY RUN MODE]\n');
  if (includeText) console.log('[Including text_entries]\n');

  const prod = new pg.Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  const local = new pg.Client({ connectionString: LOCAL_URL });

  try {
    await prod.connect();
    console.log('Connected to prod (Neon)');
    await local.connect();
    console.log('Connected to local (Docker)\n');

    for (const table of TABLES) {
      console.log(`Syncing "${table.name}"...`);
      const count = await syncTable(prod, local, table);
      console.log(`  ${dryRun ? 'Found' : 'Synced'}: ${count} rows\n`);
    }

    console.log('=== Sync Complete ===');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  } finally {
    await prod.end();
    await local.end();
  }
}

main();
