/**
 * Read Helperアプリケーションのコア型定義
 */

// AI生成のマークダウンから解析されたアイテム構造
export interface ParsedItem {
  head: string;       // 元の日本語テキスト（プレフィックスなし）
  subItems: string[]; // 言い換えバージョンの配列
}

// 辞書の単語構造（漢字[読み・意味]）
export interface DictionaryWord {
  kanji: string;
  reading: string;
  meaning: string;
}

// APIレスポンスタイプ
export interface TextResponse {
  text: string;
}

export interface BookmarkResponse {
  text: string;
}

export interface TextFileListResponse {
  directories: string[];
  filesByDirectory: Record<string, string[]>;
  files: string[]; // Flat array of all files (directory/filename format) for backward compatibility
  bookmarkSync?: {
    cleaned: number;
    added: number;
  };
}

export interface GeminiResponse {
  response: string;
  message: string;
}

export interface ExplanationResponse {
  explanation: string;
  message: string;
}

export interface WriteResponse {
  success?: boolean;
  message: string;
}

// APIリクエストタイプ
export interface BookmarkRequest {
  target: string;   // ファイル名
  content: string;  // ブックマークテキスト
}

export interface TextRequest {
  text: string;
}

export interface GeminiRequest {
  text?: string;
  image?: File;
}

export interface ExplanationRequest {
  sentence: string;
  context: string;
  fileName: string;
  contextSize: number;
  mode: import('./constants').ExplanationMode;
}

// コンポーネントのプロップ型
export interface CollapsibleItemProps {
  head: string;
  subItems: string[];
  initialDropdownState?: boolean;
  id?: string;
  onSubmitSuccess: () => void;
}

export interface SidebarProps {
  dropdownAlwaysOpen: boolean;
  setDropdownAlwaysOpen: (value: boolean) => void;
}

// クエリパラメータ型
export interface PageQueryParams {
  directory?: string;
  fileName?: string;
  dropdownAlwaysOpen?: string;
}

// ファイル保存型
export interface BookmarkData {
  [fileName: string]: string;
}

// Book metadata types (from EPUB converter JSON)
export interface BookImage {
  fileName: string;          // e.g., "illustration-001.jpg"
  imagePath: string;         // Full path to image file
  orderIndex: number;        // Order in the book
  originalName: string;      // Original name in EPUB (e.g., "image/k001.jpg")
  altText: string | null;    // Alt text for accessibility
}

export interface ProcessingHistory {
  filterMode: string;        // "all" or "n3"
  hiraganaStyle: string;     // "full" or "long-vowel"
  chaptersCount: number;     // Number of chapters
  fileSize: number;          // File size in KB
  imageCount: number;        // Number of images
}

export interface BookMetadata {
  title: string;
  author: string;
  fileName: string;
  textFilePath: string;
  originalEpubName: string;
  processingHistory: ProcessingHistory;
  images: BookImage[];
}

// Image mapping: original name (without "image/" prefix) → actual filename
export type ImageMap = Record<string, string>;

// 説明キャッシュ型
export interface CachedExplanation {
  sentence: string;
  explanation: string;
  contextSize: number;
  mode: import('./constants').ExplanationMode;
  timestamp: number;
}

export interface ExplanationCache {
  [key: string]: CachedExplanation;
}

// 単語帳機能の型
export interface VocabularyEntry {
  id: string;
  word: string;
  reading: string | null;
  sentence: string;
  fileName: string;
  directory: string;
  paragraphText: string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VocabularyListResponse {
  success: boolean;
  entries: VocabularyEntry[];
  count: number;
  message?: string;
}

export interface VocabularyCreateRequest {
  word: string;
  reading?: string;
  sentence: string;
  fileName: string;
  directory: string;
  paragraphText?: string;
  notes?: string;
}

export interface VocabularyUpdateRequest {
  notes?: string;
  word?: string;
  reading?: string;
}

export interface VocabularyResponse {
  success: boolean;
  entry?: VocabularyEntry;
  message: string;
}
