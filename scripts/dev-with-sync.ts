#!/usr/bin/env npx tsx
/**
 * Dev wrapper that syncs the local DB with prod on startup and on Ctrl+C.
 *
 * Usage:
 *   npx tsx scripts/dev-with-sync.ts            # next dev on default port
 *   npx tsx scripts/dev-with-sync.ts --lan      # next dev on LAN host/port
 *
 * Skip the sync entirely with `npm run dev:nosync`.
 * Press Ctrl+C twice to skip the shutdown sync if it hangs.
 */

import { spawn, type ChildProcess } from 'child_process';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { fullSync, withClients, type SyncResult } from '../lib/db/sync-core';

dotenv.config({ path: '.env.local' });

const SYNC_TIMEOUT_MS = 10_000;

function nextDevArgs(): string[] {
  const lan = process.argv.includes('--lan');
  return lan
    ? ['next', 'dev', '--hostname', '192.168.1.15', '--port', '3001']
    : ['next', 'dev', '--port', '3333'];
}

function summarize(label: string, results: SyncResult[]) {
  const meaningful = results.filter(r => r.rows > 0);
  if (meaningful.length === 0) {
    console.log(`[sync] ${label}: nothing to transfer`);
    return;
  }
  console.log(`[sync] ${label}:`);
  for (const r of meaningful) {
    console.log(`  ${r.table}: ${r.rows} rows ${r.direction}`);
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runSync(label: string): Promise<void> {
  const prodUrl = process.env.PROD_DATABASE_URL;
  const localUrl = process.env.DATABASE_URL;

  if (!prodUrl || !localUrl) {
    console.log(`[sync] ${label}: skipped (PROD_DATABASE_URL or DATABASE_URL not set)`);
    return;
  }

  console.log(`[sync] ${label}: running full sync...`);
  try {
    const results = await withTimeout(
      withClients(prodUrl, localUrl, (prod: Client, local: Client) => fullSync(prod, local)),
      SYNC_TIMEOUT_MS,
      `${label} sync`
    );
    summarize(label, results);
  } catch (err) {
    console.warn(`[sync] ${label} failed: ${err instanceof Error ? err.message : String(err)}`);
    console.warn('[sync] continuing without sync');
  }
}

function spawnNextDev(): ChildProcess {
  const [cmd, ...args] = nextDevArgs();
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return child;
}

async function main() {
  await runSync('startup');

  const child = spawnNextDev();

  let shuttingDown = false;
  const handleSigint = () => {
    if (shuttingDown) {
      console.log('\n[sync] second Ctrl+C received, exiting immediately');
      process.exit(130);
    }
    shuttingDown = true;
    console.log('\n[sync] Ctrl+C received, stopping next dev and pushing to prod...');
    console.log('[sync] press Ctrl+C again to skip shutdown sync');
    if (!child.killed) {
      child.kill('SIGINT');
    }
  };
  process.on('SIGINT', handleSigint);

  child.on('exit', async (code) => {
    process.off('SIGINT', handleSigint);
    if (shuttingDown) {
      await runSync('shutdown');
    }
    process.exit(code ?? 0);
  });
}

main().catch(err => {
  console.error('[dev-with-sync] fatal:', err);
  process.exit(1);
});
