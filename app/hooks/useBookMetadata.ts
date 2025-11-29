/**
 * Custom hook to load book metadata from JSON file
 *
 * Loads the .json file created by the EPUB converter and builds
 * an image mapping from original filenames to renamed filenames.
 */

import { useState, useEffect } from 'react';
import type { BookMetadata, ImageMap } from '@/lib/types';

interface UseBookMetadataResult {
  metadata: BookMetadata | null;
  imageMap: ImageMap;
  isLoading: boolean;
  error: Error | null;
}

export function useBookMetadata(
  fileName: string | null,
  directory: string | null
): UseBookMetadataResult {
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [imageMap, setImageMap] = useState<ImageMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!fileName || !directory) {
      setMetadata(null);
      setImageMap({});
      return;
    }

    const loadMetadata = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Construct JSON file path (now inside book directory)
        const jsonPath = `/${directory}/${fileName}/${fileName}.json`;
        const response = await fetch(jsonPath);

        if (!response.ok) {
          // If JSON doesn't exist, silently fail (not all books have metadata)
          console.log(`No metadata found for ${fileName}`);
          setMetadata(null);
          setImageMap({});
          setIsLoading(false);
          return;
        }

        const data: BookMetadata = await response.json();
        setMetadata(data);

        // Build image mapping from original names to renamed files
        const map: ImageMap = {};

        data.images?.forEach((image) => {
          // Strip "image/" or "images/" prefix from originalName if present
          const originalName = image.originalName.replace(/^images?\//, '');

          // Map original name → renamed filename
          map[originalName] = image.fileName;

          // Also add mapping with original path for backward compatibility
          if (image.originalName.startsWith('image/') || image.originalName.startsWith('images/')) {
            map[image.originalName] = image.fileName;
          }
        });

        setImageMap(map);
      } catch (err) {
        console.error('Error loading book metadata:', err);
        setError(err instanceof Error ? err : new Error('Failed to load metadata'));
        setMetadata(null);
        setImageMap({});
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [fileName, directory]);

  return { metadata, imageMap, isLoading, error };
}
