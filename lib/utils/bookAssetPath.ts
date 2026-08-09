const REPHRASE_SUFFIX_PATTERN = /-rephrase(-furigana)?$/;

/**
 * Folder holding a book's text and sidecars. For a rephrase file the directory
 * already points at it; for an original file the directory is the parent and the
 * book name doubles as the subfolder.
 */
function bookFolder(directory: string, fileName: string): string {
  return REPHRASE_SUFFIX_PATTERN.test(fileName) ? directory : `${directory}/${fileName}`;
}

/** Public URL of a per-book sidecar, shared by every text variant of that book. */
export function bookAssetPath(directory: string, fileName: string, extension: string): string {
  const baseFileName = fileName.replace(REPHRASE_SUFFIX_PATTERN, '');
  return `/${bookFolder(directory, fileName)}/${baseFileName}${extension}`;
}

/**
 * Public URL of a sidecar belonging to one text variant rather than the book.
 *
 * Variants differ in how the reader splits them into units, so anything indexed
 * by unit has to be per-variant: a book-wide path would hand the plain text the
 * rephrase build's cues, which line up with neither.
 */
export function bookVariantAssetPath(directory: string, fileName: string, extension: string): string {
  return `/${bookFolder(directory, fileName)}/${fileName}${extension}`;
}
