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

// 説明キャッシュ型
export interface CachedExplanation {
  sentence: string;
  explanation: string;
  contextSize: number;
  timestamp: number;
}

export interface ExplanationCache {
  [key: string]: CachedExplanation;
}
