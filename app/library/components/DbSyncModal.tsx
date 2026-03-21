'use client';

import { useState, useCallback } from 'react';
import { API_ROUTES } from '@/lib/constants';

interface DiffResult {
  table: string;
  localCount: number;
  prodCount: number;
  onlyLocal: string[];
  onlyProd: string[];
}

interface SyncResult {
  table: string;
  rows: number;
  direction: string;
}

type SyncDirection = 'pull' | 'push' | 'full';

export default function DbSyncModal({ onClose }: { onClose: () => void }) {
  const [diffs, setDiffs] = useState<DiffResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSyncResults(null);
    try {
      const res = await fetch(API_ROUTES.DB_SYNC);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDiffs(data.diffs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSync = useCallback(async (direction: SyncDirection) => {
    setSyncing(true);
    setError(null);
    setSyncResults(null);
    try {
      const res = await fetch(API_ROUTES.DB_SYNC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSyncResults(data.results);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [fetchStatus]);

  const hasLocalOnly = diffs?.some(d => d.onlyLocal.length > 0) ?? false;
  const hasProdOnly = diffs?.some(d => d.onlyProd.length > 0) ?? false;
  const allInSync = diffs !== null && !hasLocalOnly && !hasProdOnly &&
    diffs.every(d => d.localCount === d.prodCount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E5EA' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#1D1D1F' }}>Database Sync</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5"
            style={{ color: '#8E8E93' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!diffs && !loading && !error && (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: '#8E8E93' }}>
                Compare local and production databases
              </p>
              <button
                onClick={fetchStatus}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: '#007AFF' }}
              >
                Check Status
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin mr-3"
                style={{ borderColor: '#E5E5EA', borderTopColor: '#007AFF' }}
              />
              <span className="text-sm" style={{ color: '#8E8E93' }}>Connecting to databases...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF2F2' }}>
              <p className="text-sm font-medium" style={{ color: '#FF3B30' }}>{error}</p>
            </div>
          )}

          {diffs && !loading && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: '#8E8E93' }}>
                      <th className="text-left py-2 px-3 font-medium">Table</th>
                      <th className="text-right py-2 px-3 font-medium">Local</th>
                      <th className="text-right py-2 px-3 font-medium">Prod</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d) => {
                      const inSync = d.onlyLocal.length === 0 && d.onlyProd.length === 0 && d.localCount === d.prodCount;
                      let status = 'In sync';
                      let statusColor = '#34C759';
                      if (d.onlyLocal.length > 0 && d.onlyProd.length > 0) {
                        status = `+${d.onlyLocal.length} local, +${d.onlyProd.length} prod`;
                        statusColor = '#FF9500';
                      } else if (d.onlyLocal.length > 0) {
                        status = `+${d.onlyLocal.length} local only`;
                        statusColor = '#007AFF';
                      } else if (d.onlyProd.length > 0) {
                        status = `+${d.onlyProd.length} prod only`;
                        statusColor = '#AF52DE';
                      } else if (d.localCount !== d.prodCount) {
                        status = 'Counts differ';
                        statusColor = '#FF9500';
                      }
                      return (
                        <tr key={d.table} className="border-t" style={{ borderColor: '#F2F2F7' }}>
                          <td className="py-2.5 px-3 font-mono text-xs" style={{ color: '#1D1D1F' }}>{d.table}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: '#1D1D1F' }}>
                            {d.localCount === -1 ? 'N/A' : d.localCount}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: '#1D1D1F' }}>
                            {d.prodCount === -1 ? 'N/A' : d.prodCount}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium"
                              style={{ color: statusColor }}
                            >
                              {inSync && (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {syncResults && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FFF4' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: '#34C759' }}>Sync completed</p>
                  {syncResults.map((r, i) => (
                    <p key={i} className="text-xs" style={{ color: '#1D1D1F' }}>
                      {r.table}: {r.rows} rows ({r.direction})
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={fetchStatus}
                  disabled={syncing}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#F2F2F7', color: '#1D1D1F', opacity: syncing ? 0.5 : 1 }}
                >
                  Refresh
                </button>
                <button
                  onClick={() => runSync('pull')}
                  disabled={syncing || (!hasProdOnly && allInSync)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{
                    backgroundColor: '#AF52DE',
                    opacity: syncing || (!hasProdOnly && allInSync) ? 0.4 : 1,
                  }}
                >
                  {syncing ? 'Syncing...' : 'Pull (Prod -> Local)'}
                </button>
                <button
                  onClick={() => runSync('push')}
                  disabled={syncing || !hasLocalOnly}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{
                    backgroundColor: '#007AFF',
                    opacity: syncing || !hasLocalOnly ? 0.4 : 1,
                  }}
                >
                  {syncing ? 'Syncing...' : 'Push (Local -> Prod)'}
                </button>
                <button
                  onClick={() => runSync('full')}
                  disabled={syncing || allInSync}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{
                    backgroundColor: '#FF9500',
                    opacity: syncing || allInSync ? 0.4 : 1,
                  }}
                >
                  {syncing ? 'Syncing...' : 'Full Sync'}
                </button>
              </div>

              {allInSync && (
                <p className="text-sm text-center" style={{ color: '#34C759' }}>
                  All tables are in sync.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
