'use client';

import { useEffect, useState, useMemo } from 'react';
import { COLORS, READER_THEME, API_ROUTES } from '@/lib/constants';
import DirectorySection from './DirectorySection';

interface FileListResponse {
  directories: string[];
  filesByDirectory: Record<string, string[]>;
  files: string[];
}

interface BookProgress {
  [key: string]: {
    progress: number;
    totalCharacters?: number;
  };
}

export default function LibraryGrid() {
  const [fileData, setFileData] = useState<FileListResponse | null>(null);
  const [bookProgress, setBookProgress] = useState<BookProgress>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(API_ROUTES.LIST_TEXT_FILES);
        if (!response.ok) throw new Error('Failed to load library');
        const data: FileListResponse = await response.json();
        setFileData(data);

        const progressData: BookProgress = {};
        for (const dir of data.directories) {
          const files = data.filesByDirectory[dir] || [];
          for (const file of files) {
            const key = `${dir}/${file}`;
            progressData[key] = {
              progress: Math.random() * 100,
              totalCharacters: Math.floor(Math.random() * 50000) + 5000,
            };
          }
        }
        setBookProgress(progressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedDirectories = useMemo(() => {
    if (!fileData) return [];
    return [...fileData.directories].sort((a, b) => a.localeCompare(b));
  }, [fileData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: COLORS.NEUTRAL,
              borderTopColor: COLORS.PRIMARY,
            }}
          />
          <p style={{ color: COLORS.SECONDARY_DARK }}>Loading library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 rounded-xl text-center"
        style={{
          backgroundColor: READER_THEME.SURFACE,
          color: COLORS.PRIMARY_DARK,
        }}
      >
        <p className="text-lg mb-2">Could not load library</p>
        <p className="text-sm" style={{ color: COLORS.SECONDARY_DARK }}>{error}</p>
      </div>
    );
  }

  if (!fileData || sortedDirectories.length === 0) {
    return (
      <div
        className="p-8 rounded-xl text-center"
        style={{ backgroundColor: READER_THEME.SURFACE }}
      >
        <p className="text-lg mb-2" style={{ color: COLORS.PRIMARY_DARK }}>
          No books found
        </p>
        <p className="text-sm" style={{ color: COLORS.SECONDARY_DARK }}>
          Add .txt files to the public/ directory to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedDirectories.map((directory) => {
        const files = fileData.filesByDirectory[directory] || [];
        const books = files.map((fileName) => {
          const key = `${directory}/${fileName}`;
          const progress = bookProgress[key] || { progress: 0 };
          return {
            fileName,
            ...progress,
          };
        });

        return (
          <DirectorySection
            key={directory}
            directory={directory}
            books={books}
            defaultExpanded={sortedDirectories.length <= 3}
          />
        );
      })}
    </div>
  );
}
