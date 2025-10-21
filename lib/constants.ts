/**
 * アプリケーション全体で使用される定数と設定値
 */

// ファイル保存パス
export const PUBLIC_DIR = 'public';
export const BOOKMARK_FILE = 'bookmark.json';

// デフォルトのテキストファイル
export const DEFAULT_TEXT_FILES = {
  TEXT_1: 'text-1',
  TEXT_2: 'text-2',
  TEMP: 'text',
} as const;

// デフォルト値
export const DEFAULT_FILE_NAME = 'text-1';
export const DEFAULT_DROPDOWN_STATE = false;

// テキスト処理
export const MAX_CHUNK_SIZE = 4000;
export const ENGLISH_REGEX = /[a-zA-Z]/;

// AIモデルの設定
export const AI_MODELS = {
  GEMINI_FLASH: 'gemini-2.0-flash-exp',
  GEMINI_PRO: 'gemini-1.5-pro-latest',
} as const;

// ビジュアルノベル処理のリトライ設定
export const VN_RETRY_CONFIG = {
  MAX_ATTEMPTS: 4,
  INITIAL_ATTEMPT: 1,
} as const;

// マークダウン解析パターン
export const MARKDOWN_PATTERNS = {
  HEADING_PREFIX: '<',
  HEADING_PREFIX_FULLWIDTH: '＜',
  SUBITEM_PREFIX: '>>',
  BOLD_PATTERN: /\*\*(.*?)\*\*/g,
  HEADING_HASH: '##',
  HEADING_HASH_FULLWIDTH: '＃＃',
} as const;

// 辞書解析パターン
export const DICTIONARY_PATTERNS = {
  WORD_PATTERN: /(.+?)\[(.+?)・(.+?)\]/,
  SEPARATOR: '・',
} as const;

// APIルート
export const API_ROUTES = {
  GEMINI: '/api/gemini-api',
  READ_TEXT: '/api/read-public-txt',
  READ_BOOKMARK: '/api/read-bookmark',
  WRITE_TEXT: '/api/write-public-txt',
  WRITE_TEXT_AI: '/api/write-public-txt-ai',
  WRITE_BOOKMARK: '/api/write-bookmark',
  LIST_TEXT_FILES: '/api/list-text-files',
} as const;

// ページルート
export const PAGE_ROUTES = {
  HOME: '/',
  TEXT_INPUT: '/text-input',
  TEXT_INPUT_AI: '/text-input-ai',
  OCR: '/ocr',
  VISUAL_NOVEL: '/visual-novel',
} as const;
