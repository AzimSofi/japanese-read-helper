'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_ROUTES } from '@/lib/constants';
import type { RubyRegistry, RubyEntry, RubyRegistryResponse } from '@/lib/types';

interface UseRubyRegistryOptions {
  directory: string;
  bookName: string;
  enabled?: boolean;
}

interface UseRubyRegistryReturn {
  registry: RubyRegistry | null;
  isLoading: boolean;
  error: Error | null;
  addEntry: (entry: Omit<RubyEntry, 'source'> & { source?: 'epub' | 'user' }) => Promise<void>;
  deleteEntry: (kanji: string) => Promise<void>;
  ignoreSuggestion: (kanji: string) => Promise<void>;
  refetch: () => Promise<void>;
  searchEntries: (query: string) => RubyEntry[];
}

export function useRubyRegistry({
  directory,
  bookName,
  enabled = true,
}: UseRubyRegistryOptions): UseRubyRegistryReturn {
  const [registry, setRegistry] = useState<RubyRegistry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRegistry = useCallback(async () => {
    if (!directory || !bookName) {
      setRegistry(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_ROUTES.RUBY_REGISTRY}?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.statusText}`);
      }

      const data: RubyRegistryResponse = await response.json();
      if (data.success && data.registry) {
        setRegistry(data.registry);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching ruby registry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [directory, bookName]);

  const addEntry = async (entry: Omit<RubyEntry, 'source'> & { source?: 'epub' | 'user' }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ROUTES.RUBY_REGISTRY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory,
          bookName,
          entry: {
            ...entry,
            source: entry.source || 'user',
            note: entry.note || ''
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save entry: ${response.statusText}`);
      }

      const data: RubyRegistryResponse = await response.json();
      if (data.success && data.registry) {
        setRegistry(data.registry);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (kanji: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_ROUTES.RUBY_REGISTRY}?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}&kanji=${encodeURIComponent(kanji)}&type=entry`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete entry: ${response.statusText}`);
      }

      const data: RubyRegistryResponse = await response.json();
      if (data.success && data.registry) {
        setRegistry(data.registry);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const ignoreSuggestion = async (kanji: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_ROUTES.RUBY_REGISTRY}?directory=${encodeURIComponent(directory)}&bookName=${encodeURIComponent(bookName)}&kanji=${encodeURIComponent(kanji)}&type=suggestion`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to ignore suggestion: ${response.statusText}`);
      }

      const data: RubyRegistryResponse = await response.json();
      if (data.success && data.registry) {
        setRegistry(data.registry);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const searchEntries = useCallback((query: string): RubyEntry[] => {
    if (!registry || !query.trim()) {
      return registry?.entries || [];
    }
    const q = query.toLowerCase();
    return registry.entries.filter(e =>
      e.kanji.includes(q) ||
      e.reading.includes(q) ||
      e.note.toLowerCase().includes(q)
    );
  }, [registry]);

  useEffect(() => {
    if (enabled) {
      fetchRegistry();
    }
  }, [enabled, fetchRegistry]);

  return {
    registry,
    isLoading,
    error,
    addEntry,
    deleteEntry,
    ignoreSuggestion,
    refetch: fetchRegistry,
    searchEntries,
  };
}
