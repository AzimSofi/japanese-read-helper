const ALLOWED_DIRECTORIES = [
  'bookv1-rephrase',
  'bookv2-furigana',
  'bookv3-rephrase',
  'public',
  'temp',
];

export function validateFileName(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  if (fileName.length > 255) {
    return false;
  }
  return true;
}

export function validateDirectory(directory: string): boolean {
  if (!directory || typeof directory !== 'string') {
    return false;
  }
  if (directory.includes('..')) {
    return false;
  }
  return true;
}

export function isPathSafe(path: string): boolean {
  return !path.includes('..');
}

export function sanitizePath(path: string): string {
  return path.replace(/[^a-zA-Z0-9-_/]/g, '');
}

export function getFullFilePath(fileName: string, directory: string = 'public'): string {
  if (!validateFileName(fileName) || !validateDirectory(directory)) {
    throw new Error('Invalid file path');
  }
  return directory ? `${directory}/${fileName}` : fileName;
}
