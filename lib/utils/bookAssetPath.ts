const REPHRASE_SUFFIX_PATTERN = /-rephrase(-furigana)?$/;

/**
 * Public URL of a book sidecar asset (metadata, narration, ...).
 *
 * Rephrase files live next to their book folder, so their sidecars are siblings
 * of the folder; original files live inside it. Both resolve to the same book.
 */
export function bookAssetPath(directory: string, fileName: string, extension: string): string {
  const isRephraseFile = REPHRASE_SUFFIX_PATTERN.test(fileName);
  const baseFileName = fileName.replace(REPHRASE_SUFFIX_PATTERN, '');
  return isRephraseFile
    ? `/${directory}/${baseFileName}${extension}`
    : `/${directory}/${baseFileName}/${baseFileName}${extension}`;
}
