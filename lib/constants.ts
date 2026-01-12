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
// Note: No default file is set. App auto-redirects to first available file.
export const DEFAULT_FILE_NAME = null;
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
  // HTML rubyタグ形式（<rb>タグあり/なし両対応）
  RUBY_PATTERN: /<ruby>(?:<rb>)?(.+?)(?:<\/rb>)?<rt>(.+?)<\/rt><\/ruby>/g,
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
  VOCABULARY: '/api/vocabulary',
  AUTH_LOGIN: '/api/auth?action=login',
  AUTH_LOGOUT: '/api/auth?action=logout',
  AUTH_SESSION: '/api/auth?action=session',
  // Text entries management
  TEXT_ENTRIES: '/api/text-entries',
  TEXT_ENTRIES_SYNC: '/api/text-entries/sync',
  TEXT_ENTRIES_RESET: '/api/text-entries/reset',
  // TTS
  TTS: '/api/tts',
  // Ruby Registry
  RUBY_REGISTRY: '/api/ruby-registry',
  // Library
  LIBRARY_PROGRESS: '/api/library-progress',
} as const;

// ページルート
export const PAGE_ROUTES = {
  HOME: '/',
  TEXT_INPUT: '/text-input',
  TEXT_INPUT_AI: '/text-input-ai',
  OCR: '/ocr',
  VISUAL_NOVEL: '/visual-novel',
  BOOK_READER: '/book-reader',
  VOCABULARY: '/vocabulary',
  LOGIN: '/login',
  RUBY_REGISTRY: '/ruby-registry',
} as const;

// 文説明機能の設定
export const EXPLANATION_CONFIG = {
  MIN_CONTEXT_SIZE: 10,
  MAX_CONTEXT_SIZE: 100,
  DEFAULT_CONTEXT_SIZE: 50,
  CACHE_KEY_PREFIX: 'explanation_',
  SENTENCE_DELIMITERS: ['。', '！', '？'],
  CONTEXT_SIZE_EXPANDED_DEFAULT: false,
} as const;

// 説明モードの設定
export const EXPLANATION_MODES = {
  QUICK: 'quick',           // 簡潔
  STORY: 'story',           // 物語
  NUANCE: 'nuance',         // 詳細
  SPEAKER: 'speaker',       // 話者
  NARRATIVE: 'narrative',   // 文体
} as const;

export type ExplanationMode = typeof EXPLANATION_MODES[keyof typeof EXPLANATION_MODES];

export const EXPLANATION_MODE_CONFIG = {
  [EXPLANATION_MODES.QUICK]: {
    label: '簡潔',
    icon: '[簡]',
    description: '短く要点のみ',
  },
  [EXPLANATION_MODES.STORY]: {
    label: '物語',
    icon: '[物]',
    description: '物語の流れと感想',
  },
  [EXPLANATION_MODES.NUANCE]: {
    label: '詳細',
    icon: '[詳]',
    description: 'ニュアンス分析',
  },
  [EXPLANATION_MODES.SPEAKER]: {
    label: '話者',
    icon: '[話]',
    description: '登場人物の特定',
  },
  [EXPLANATION_MODES.NARRATIVE]: {
    label: '文体',
    icon: '[文]',
    description: '文章構造の分析',
  },
} as const;

export const DEFAULT_EXPLANATION_MODE = EXPLANATION_MODES.QUICK;

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
  EXPLANATION_MODE: 'explanation_mode',
  CONTEXT_SIZE_EXPANDED: 'context_size_expanded',
  READER_FONT_SIZE: 'reader_font_size',
  READER_LINE_HEIGHT: 'reader_line_height',
  VOCABULARY_MODE: 'vocabulary_mode',
  AI_EXPLANATION_ENABLED: 'ai_explanation_enabled',
  SHOW_REPHRASE: 'show_rephrase',
  STARRED_WORDS: 'starred_words', // Format: starred_words_{directory}_{bookName}
  // Floating sticky notes
  STICKY_NOTES_POSITION: 'sticky_notes_position',
  STICKY_NOTES_COLLAPSED: 'sticky_notes_collapsed',
  // TTS設定
  TTS_SPEED: 'tts_speed',
  TTS_VOICE_GENDER: 'tts_voice_gender',
  TTS_ENABLED: 'tts_enabled',
  TTS_LAST_POSITION: 'tts_last_position', // {fileName}_{directory}
} as const;

// TTS（Text-to-Speech）設定
export const TTS_CONFIG = {
  MIN_SPEED: 0.5,
  MAX_SPEED: 2.0,
  DEFAULT_SPEED: 1.0,
  SPEED_STEP: 0.1,
  DEFAULT_VOICE_GENDER: 'FEMALE' as const,
  // Google Cloud TTS日本語音声
  VOICES: {
    FEMALE: 'ja-JP-Neural2-B',
    MALE: 'ja-JP-Neural2-C',
  },
  LANGUAGE_CODE: 'ja-JP',
} as const;

export type TTSVoiceGender = 'FEMALE' | 'MALE';

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

// Minimal Reader Theme
export const READER_THEME = {
  SURFACE: '#FFF0DD',
  SURFACE_MUTED: '#FFF8F0',
  FAB_BG: '#E2A16F',
  FAB_ICON: '#FFFFFF',
  PROGRESS_TRACK: '#D1D3D8',
  PROGRESS_FILL: '#86B0BD',
  TRANSITION_FAST: '150ms',
  TRANSITION_NORMAL: '300ms',
} as const;

// Library page settings
export const LIBRARY_CONFIG = {
  GRID_COLUMNS: {
    MOBILE: 2,
    TABLET: 3,
    DESKTOP: 4,
  },
} as const;
