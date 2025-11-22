/**
 * アプリケーション全体で使用される定数と設定値
 */

// ファイル保存パス
export const PUBLIC_DIR = 'public';
export const BOOKMARK_FILE = 'bookmark.json';

// デフォルトのテキストファイル（サブディレクトリ対応）
export const DEFAULT_TEXT_FILES = {
  TEXT_1: 'temp/text-1',
  TEXT_2: 'temp/text-2',
  TEMP: 'temp/text',
} as const;

// デフォルト値（サブディレクトリ対応）
export const DEFAULT_FILE_NAME = 'bookv1-rephrase/readable-code';
export const DEFAULT_DROPDOWN_STATE = false;

// テキスト処理
export const MAX_CHUNK_SIZE = 4000;
export const ENGLISH_REGEX = /[a-zA-Z]/;

// AIモデルの設定
export const AI_MODELS = {
  GEMINI_FLASH: 'gemini-2.0-flash-exp',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
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

// 振り仮名解析パターン
export const FURIGANA_PATTERNS = {
  // 漢字[ふりがな]形式
  BRACKET_PATTERN: /(.+?)\[(.+?)\]/g,
  // HTML rubyタグ形式
  RUBY_PATTERN: /<ruby>(.+?)<rt>(.+?)<\/rt><\/ruby>/g,
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
  EXPLAIN_SENTENCE: '/api/explain-sentence',
} as const;

// ページルート
export const PAGE_ROUTES = {
  HOME: '/',
  TEXT_INPUT: '/text-input',
  TEXT_INPUT_AI: '/text-input-ai',
  OCR: '/ocr',
  VISUAL_NOVEL: '/visual-novel',
  BOOK_READER: '/book-reader',
} as const;

// 文説明機能の設定
export const EXPLANATION_CONFIG = {
  MIN_CONTEXT_SIZE: 10,
  MAX_CONTEXT_SIZE: 100,
  DEFAULT_CONTEXT_SIZE: 50,
  CACHE_KEY_PREFIX: 'explanation_',
  SENTENCE_DELIMITERS: ['。', '！', '？'],
} as const;

// 読書ページの設定
export const READER_CONFIG = {
  MIN_FONT_SIZE: 12,
  MAX_FONT_SIZE: 24,
  DEFAULT_FONT_SIZE: 16,
  MIN_LINE_HEIGHT: 1.2,
  MAX_LINE_HEIGHT: 2.5,
  DEFAULT_LINE_HEIGHT: 1.8,
  PARAGRAPH_SPLIT_PATTERN: /\n\n+/,
} as const;

// ページネーション設定
export const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 50,
  MAX_PAGE_BUTTONS: 5, // 表示する最大ページボタン数
} as const;

// LocalStorage キー
export const STORAGE_KEYS = {
  FURIGANA_ENABLED: 'furigana_enabled',
  EXPLANATION_CONTEXT_SIZE: 'explanation_context_size',
  EXPLANATION_CACHE: 'explanation_cache',
  READER_FONT_SIZE: 'reader_font_size',
  READER_LINE_HEIGHT: 'reader_line_height',
} as const;

// カラーパレット
export const COLORS = {
  BASE: '#FFF0DD',              // 背景・ハイライト
  NEUTRAL: '#D1D3D8',           // サーフェス・境界線
  PRIMARY: '#E2A16F',           // 重要アクション・AI処理
  PRIMARY_DARK: '#d18a54',      // hoverフィードバック
  SECONDARY: '#86B0BD',         // 通常操作・入力系
  SECONDARY_DARK: '#6a98a8',    // hoverフィードバック
} as const;

// CSS変数（インラインスタイルで使用）
export const CSS_VARS = {
  BASE: 'var(--color-base)',
  NEUTRAL: 'var(--color-neutral)',
  PRIMARY: 'var(--color-primary)',
  PRIMARY_DARK: 'var(--color-primary-dark)',
  SECONDARY: 'var(--color-secondary)',
  SECONDARY_DARK: 'var(--color-secondary-dark)',
} as const;

// カラーパレット
export const COLORS = {
  BASE: '#FFF0DD',              // 背景・ハイライト
  NEUTRAL: '#D1D3D8',           // サーフェス・境界線
  PRIMARY: '#E2A16F',           // 重要アクション・AI処理
  PRIMARY_DARK: '#d18a54',      // hoverフィードバック
  SECONDARY: '#86B0BD',         // 通常操作・入力系
  SECONDARY_DARK: '#6a98a8',    // hoverフィードバック
} as const;

// CSS変数（インラインスタイルで使用）
export const CSS_VARS = {
  BASE: 'var(--color-base)',
  NEUTRAL: 'var(--color-neutral)',
  PRIMARY: 'var(--color-primary)',
  PRIMARY_DARK: 'var(--color-primary-dark)',
  SECONDARY: 'var(--color-secondary)',
  SECONDARY_DARK: 'var(--color-secondary-dark)',
} as const;
