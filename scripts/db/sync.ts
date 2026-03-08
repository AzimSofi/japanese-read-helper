#!/usr/bin/env npx tsx
/**
 * Interactive database sync tool
 *
 * Usage:
 *   npx tsx scripts/db/sync.ts
 *   npm run db:sync
 */

import pg from 'pg';
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROD_URL = process.env.PROD_DATABASE_URL;
const LOCAL_URL = process.env.DATABASE_URL;

if (!PROD_URL || !LOCAL_URL) {
  console.error('Missing PROD_DATABASE_URL or DATABASE_URL in .env.local');
  process.exit(1);
}

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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function stripQuotes(name: string): string {
  return name.replace(/^"|"$/g, '');
}

function quoteIdent(name: string): string {
  return `"${name}"`;
}

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
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

async function getCount(client: pg.Client, table: string): Promise<number> {
  const bare = stripQuotes(table);
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM "${bare}"`
    );
    return parseInt(result.rows[0].count, 10);
  } catch {
    return -1;
  }
}

async function getIdentities(client: pg.Client, table: TableConfig): Promise<Set<string>> {
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

async function computeDiffs(prod: pg.Client, local: pg.Client): Promise<DiffResult[]> {
  const diffs: DiffResult[] = [];

  for (const table of TABLES) {
    const [localCount, prodCount, localIds, prodIds] = await Promise.all([
      getCount(local, table.name),
      getCount(prod, table.name),
      getIdentities(local, table),
      getIdentities(prod, table),
    ]);

    const onlyLocal = [...localIds].filter(id => !prodIds.has(id));
    const onlyProd = [...prodIds].filter(id => !localIds.has(id));

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

function printDashboard(diffs: DiffResult[]) {
  console.log('\n  ' + pad('Table', 22) + padLeft('Local', 7) + padLeft('Prod', 7) + '   Status');
  console.log('  ' + '-'.repeat(60));

  for (const d of diffs) {
    const localStr = d.localCount === -1 ? 'N/A' : String(d.localCount);
    const prodStr = d.prodCount === -1 ? 'N/A' : String(d.prodCount);
    let status = 'in sync';

    if (d.onlyLocal.length > 0 && d.onlyProd.length > 0) {
      status = `+${d.onlyLocal.length} local only, +${d.onlyProd.length} prod only`;
    } else if (d.onlyLocal.length > 0) {
      status = `+${d.onlyLocal.length} local only`;
    } else if (d.onlyProd.length > 0) {
      status = `+${d.onlyProd.length} prod only`;
    } else if (d.localCount !== d.prodCount) {
      status = 'counts differ (same keys)';
    }

    const ok = d.onlyLocal.length === 0 && d.onlyProd.length === 0 && d.localCount === d.prodCount;
    const marker = ok ? ' ' : '*';
    console.log(`${marker} ${pad(d.table, 22)}${padLeft(localStr, 7)}${padLeft(prodStr, 7)}   ${status}`);
  }
  console.log();
}

async function syncDirection(
  source: pg.Client,
  target: pg.Client,
  table: TableConfig,
  direction: string
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERR] ${table.name}: ${msg}`);
    }
  }

  console.log(`  ${stripQuotes(table.name)}: ${synced} rows ${direction}`);
  return synced;
}

async function pullFromProd(prod: pg.Client, local: pg.Client) {
  console.log('\nPulling prod -> local...');
  for (const table of TABLES) {
    await syncDirection(prod, local, table, '<- prod');
  }
  console.log('Done.\n');
}

async function pushToProd(prod: pg.Client, local: pg.Client, diffs: DiffResult[]) {
  const missing = diffs.filter(d => d.onlyLocal.length > 0);
  if (missing.length === 0) {
    console.log('\nNothing to push - prod has everything.\n');
    return;
  }

  console.log('\nWill push to prod:');
  for (const d of missing) {
    console.log(`  ${d.table}: ${d.onlyLocal.length} missing entries`);
    for (const id of d.onlyLocal.slice(0, 5)) {
      console.log(`    - ${id}`);
    }
    if (d.onlyLocal.length > 5) {
      console.log(`    ... and ${d.onlyLocal.length - 5} more`);
    }
  }

  const confirm = await ask('\nProceed? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.\n');
    return;
  }

  console.log('\nPushing local -> prod...');
  for (const table of TABLES) {
    const diff = missing.find(d => d.table === stripQuotes(table.name));
    if (diff) {
      await syncDirection(local, prod, table, '-> prod');
    }
  }
  console.log('Done.\n');
}

async function showDiff(diffs: DiffResult[]) {
  console.log('\n=== Detailed Diff ===\n');
  for (const d of diffs) {
    if (d.onlyLocal.length === 0 && d.onlyProd.length === 0) continue;

    console.log(`${d.table}:`);
    if (d.onlyLocal.length > 0) {
      console.log('  Local only:');
      for (const id of d.onlyLocal) console.log(`    + ${id}`);
    }
    if (d.onlyProd.length > 0) {
      console.log('  Prod only:');
      for (const id of d.onlyProd) console.log(`    + ${id}`);
    }
    console.log();
  }

  if (diffs.every(d => d.onlyLocal.length === 0 && d.onlyProd.length === 0)) {
    console.log('Everything is in sync.\n');
  }
}

async function fullSync(prod: pg.Client, local: pg.Client, diffs: DiffResult[]) {
  const hasMissingInProd = diffs.some(d => d.onlyLocal.length > 0);
  const hasMissingInLocal = diffs.some(d => d.onlyProd.length > 0);

  if (!hasMissingInProd && !hasMissingInLocal) {
    console.log('\nAlready in sync.\n');
    return;
  }

  console.log('\nFull sync will:');
  if (hasMissingInLocal) console.log('  - Pull missing entries from prod -> local');
  if (hasMissingInProd) console.log('  - Push missing entries from local -> prod');

  const confirm = await ask('\nProceed? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.\n');
    return;
  }

  if (hasMissingInLocal) {
    console.log('\nPulling prod -> local...');
    for (const table of TABLES) {
      await syncDirection(prod, local, table, '<- prod');
    }
  }

  if (hasMissingInProd) {
    console.log('\nPushing local -> prod...');
    for (const table of TABLES) {
      const diff = diffs.find(d => d.table === stripQuotes(table.name));
      if (diff && diff.onlyLocal.length > 0) {
        await syncDirection(local, prod, table, '-> prod');
      }
    }
  }

  console.log('Done.\n');
}

async function main() {
  console.log('=== Database Sync Tool ===\n');

  const prod = new pg.Client({ connectionString: PROD_URL, ssl: { rejectUnauthorized: false } });
  const local = new pg.Client({ connectionString: LOCAL_URL });

  try {
    await prod.connect();
    await local.connect();
    console.log('Connected to both databases.');

    let diffs = await computeDiffs(prod, local);
    printDashboard(diffs);

    let running = true;
    while (running) {
      console.log('[1] Pull all from prod -> local');
      console.log('[2] Push missing to prod');
      console.log('[3] Show diff details');
      console.log('[4] Full sync (both directions)');
      console.log('[5] Refresh dashboard');
      console.log('[0] Exit\n');

      const choice = await ask('> ');

      switch (choice.trim()) {
        case '1':
          await pullFromProd(prod, local);
          diffs = await computeDiffs(prod, local);
          printDashboard(diffs);
          break;
        case '2':
          await pushToProd(prod, local, diffs);
          diffs = await computeDiffs(prod, local);
          printDashboard(diffs);
          break;
        case '3':
          await showDiff(diffs);
          break;
        case '4':
          await fullSync(prod, local, diffs);
          diffs = await computeDiffs(prod, local);
          printDashboard(diffs);
          break;
        case '5':
          diffs = await computeDiffs(prod, local);
          printDashboard(diffs);
          break;
        case '0':
        case 'q':
          running = false;
          break;
        default:
          console.log('Invalid choice.\n');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prod.end();
    await local.end();
    rl.close();
  }
}

main();
