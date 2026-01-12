import { stripFurigana } from './furiganaParser';

const IMAGE_PATTERN = /\[IMAGE:[^\]]+\]/g;
const TITLE_LINE_PATTERN = /^→Title:.*$/gm;
const AUTHOR_LINE_PATTERN = /^→?Author:.*$/gm;

export function cleanTextForTTS(text: string): string {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(IMAGE_PATTERN, '');
  cleaned = cleaned.replace(TITLE_LINE_PATTERN, '');
  cleaned = cleaned.replace(AUTHOR_LINE_PATTERN, '');
  cleaned = stripFurigana(cleaned);
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}
