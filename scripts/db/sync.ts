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
import {
  TABLES,
  computeDiffs,
  syncDirection,
  pushMissing,
  type DiffResult,
  type SyncResult,
} from '../../lib/db/sync-core';

dotenv.config({ path: '.env.local' });

const PROD_URL = process.env.PROD_DATABASE_URL;
const LOCAL_URL = process.env.DATABASE_URL;

if (!PROD_URL || !LOCAL_URL) {
  console.error('Missing PROD_DATABASE_URL or DATABASE_URL in .env.local');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

function renderCount(n: number | null): string {
  return n === null ? '?' : String(n);
}

function logSyncResult(r: SyncResult) {
  const skippedSuffix = r.skipped > 0 ? `, ${r.skipped} skipped` : '';
  const failedSuffix = r.failed > 0 ? `, ${r.failed} failed` : '';
  console.log(`  ${r.table}: ${r.rows} rows ${r.direction}${skippedSuffix}${failedSuffix}`);
}

function printDashboard(diffs: DiffResult[]) {
  console.log('\n  ' + pad('Table', 22) + padLeft('Local', 7) + padLeft('Prod', 7) + '   Status');
  console.log('  ' + '-'.repeat(60));

  for (const d of diffs) {
    const localStr = renderCount(d.localCount);
    const prodStr = renderCount(d.prodCount);
    let status = 'in sync';

    if (d.onlyLocal.length > 0 && d.onlyProd.length > 0) {
      status = `+${d.onlyLocal.length} local only, +${d.onlyProd.length} prod only`;
    } else if (d.onlyLocal.length > 0) {
      status = `+${d.onlyLocal.length} local only`;
    } else if (d.onlyProd.length > 0) {
      status = `+${d.onlyProd.length} prod only`;
    } else if (d.localCount === null || d.prodCount === null) {
      status = 'count unavailable';
    } else if (d.localCount !== d.prodCount) {
      status = 'counts differ (same keys)';
    }

    const ok = d.onlyLocal.length === 0 && d.onlyProd.length === 0
      && d.localCount !== null && d.prodCount !== null
      && d.localCount === d.prodCount;
    const marker = ok ? ' ' : '*';
    console.log(`${marker} ${pad(d.table, 22)}${padLeft(localStr, 7)}${padLeft(prodStr, 7)}   ${status}`);
  }
  console.log();
}

async function pullFromProd(prod: pg.Client, local: pg.Client) {
  console.log('\nPulling prod -> local...');
  for (const table of TABLES) {
    const result = await syncDirection(prod, local, table, 'prod -> local');
    logSyncResult(result);
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
  const results = await pushMissing(prod, local, diffs);
  for (const r of results) logSyncResult(r);
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

async function fullSyncInteractive(prod: pg.Client, local: pg.Client, diffs: DiffResult[]) {
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
      const result = await syncDirection(prod, local, table, 'prod -> local');
      logSyncResult(result);
    }
  }

  if (hasMissingInProd) {
    console.log('\nPushing local -> prod...');
    const results = await pushMissing(prod, local, diffs);
    for (const r of results) logSyncResult(r);
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
          await fullSyncInteractive(prod, local, diffs);
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
