# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Read Helper is a web-based tool designed to assist Japanese language learners when reading Visual Novels. It integrates with Textractor and clipboard inserters to provide AI-rephrased versions of in-game text using Gemini AI, offering three different phrasings to improve comprehension.

**Tech Stack:**
- Next.js 15.4.5 (App Router)
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- Google Gemini AI (@google/genai)

## Development Commands

```bash
# Development (default port 3333)
npm run dev

# Development on LAN (specific IP)
npm run dev-lan

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture Overview

### Data Flow Architecture

1. **Text Input Sources:**
   - `/text-input`: Manual text entry (writes to `public/text.txt`)
   - `/text-input-ai`: Manual text entry with AI processing
   - `/visual-novel`: Real-time text capture from Visual Novels via Textractor (reads last `<p>` tag content)
   - `/ocr`: OCR-based text extraction

2. **AI Processing Pipeline:**
   - Text → Gemini API (`/api/gemini-api`) → Markdown response
   - Response format: `<original>>rephrasing1>>rephrasing2>>rephrasing3`
   - Retry mechanism (max 4 attempts) validates response format before accepting

3. **Storage System:**
   - Text files: `public/*.txt` (dynamically detected and displayed)
   - Bookmarks: `public/bookmark.json` (stores bookmark position per file)
   - All file operations centralized in `lib/services/fileService.ts`
   - Automatic bookmark sync: On file list fetch, invalid bookmarks are removed and missing bookmarks are initialized with empty strings

### Core Components

**Markdown Parser (`lib/utils/markdownParser/`):**
The parser converts AI-generated text into structured data. It handles multiple edge cases:
- Standard format: `<heading>>subitem1>>subitem2>>subitem3`
- **Multi-line headers**: Headers starting with `<` can span multiple lines until `>>` is encountered
- Merged lines, embedded headings, bold formatting, hash headings
- Split across three modules: `validator.ts`, `normalizer.ts`, `splitter.ts`

Multi-line header example:
```
< var start = (new Date()).getTime();
...
document.writeln("読み込み時間：" + elapsed + " 秒");
このコードは間違っていないように見える。
>> 最初のリフレーズ
>> 2番目のリフレーズ
>> 3番目のリフレーズ
```

**CollapsibleItem Component (`app/components/ui/CollapsibleItem.tsx`):**
- Displays original Japanese text as heading with collapsible rephrasings
- Bookmark functionality per item (circular icon, not the text)
- Dictionary parsing for format: `word[reading・meaning]` (index 4 is reserved for dictionary data)
- Auto-scrolls to bookmarked item via `id="bookmark"`

**File Service (`lib/services/fileService.ts`):**
Centralized service for all file operations in the `public/` directory:
- `readTextFile(fileName)` / `writeTextFile(fileName, content)`
- `readBookmark(fileName)` / `updateBookmark(fileName, content)`
- `listTextFiles()` - Returns all `.txt` files in public directory
- `cleanupBookmarks()` - Removes bookmarks for deleted files
- `initializeBookmarks()` - Creates empty bookmark entries for new files
- `syncBookmarks()` - Combines cleanup and initialization (removes invalid + adds missing)
- Both async and sync versions available
- Automatically handles control character removal

**TopNavigation Component (`app/components/ui/TopNavigation.tsx`):**
- Dynamic file selector dropdown (auto-detects all .txt files)
- Display mode toggle (collapsed/expanded)
- Links to other pages (input, OCR, Visual Novel)
- Uses URL query parameters for state management

### API Routes

All routes defined in `lib/constants.ts` under `API_ROUTES`:

- `/api/gemini-api`: POST - Sends text or image to Gemini AI
  - Accepts JSON (`prompt_post`, `ai_model`) or FormData (with optional image)
  - Returns `{response: string, message: string}`
- `/api/read-public-txt`: GET - Reads text files from public/
- `/api/write-public-txt`: POST - Writes to public/text.txt
- `/api/write-public-txt-ai`: POST - Writes AI-processed text
- `/api/read-bookmark`: GET - Reads bookmark for specific file
- `/api/write-bookmark`: POST - Updates bookmark position
- `/api/list-text-files`: GET - Lists all .txt files and auto-syncs bookmarks
  - Returns `{files: string[], bookmarkSync?: {cleaned: number, added: number}}`
  - Removes bookmarks for deleted files and creates empty entries for new files

### Custom Hooks

**useBookmark (`app/hooks/useBookmark.ts`):**
```typescript
const { bookmarkText, isLoading, error, updateBookmark, refetch } = useBookmark({
  fileName: 'text-1',
  enabled: true
});
```

**useTextContent (`app/hooks/useTextContent.ts`):**
Similar pattern for managing text file state.

**useTextFileList (`app/hooks/useTextFileList.ts`):**
```typescript
const { files, isLoading, error, refetch } = useTextFileList();
```
Fetches list of all available .txt files and triggers automatic bookmark cleanup.

### Constants & Configuration

All configuration centralized in `lib/constants.ts`:
- `AI_MODELS`: Gemini model versions (currently using `gemini-2.0-flash-exp`)
- `VN_RETRY_CONFIG`: Retry logic for Visual Novel processing (MAX_ATTEMPTS: 4)
- `MARKDOWN_PATTERNS`: Parser patterns (`<`, `>>`, etc.)
- `API_ROUTES`, `PAGE_ROUTES`: Route definitions

### Type Definitions

Core types in `lib/types.ts`:
- `ParsedItem`: `{head: string, subItems: string[]}`
- API request/response types for all endpoints
- Component prop types

## Environment Variables

Required in `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

## AI Prompt Instructions

The AI prompts are defined in `lib/geminiService.tsx`:

- `ai_instructions`: Standard 3-rephasing format (used in `/visual-novel`)
- `ai_instructions2`: 2-rephasing + dictionary format (not currently active)
- `ai_instructions_picture`: OCR/image text extraction

## Visual Novel Workflow

The `/visual-novel` page implements a specialized workflow:
1. Captures last `<p>` tag content from the page (populated by clipboard inserter)
2. Sends to Gemini with retry logic
3. Validates response format using `parseMarkdown()`
4. Re-prompts with error message if format is invalid
5. Displays results in CollapsibleItem components

## Important Implementation Notes

- **Bookmark behavior**: Only the circular bookmark icon is clickable, not the text heading itself
- **File naming**: Text files are referenced without `.txt` extension in code (added by fileService)
- **Control characters**: Automatically stripped from bookmarks (CR/LF only, preserves spaces)
  - Multi-line headers: Newlines are preserved in display (`whitespace-pre-wrap`) but removed when saving bookmarks
  - Bookmark comparison: Both strings are normalized (newlines removed) before comparing
- **Response validation**: Parser checks for valid `head` and non-empty `subItems` before accepting AI response
- **Query params**: `fileName` and `dropdownAlwaysOpen` control which file to display and UI state

## Navigation Structure

The app has a fixed top navigation (`app/layout.tsx`) with the following features:
- **Dynamic File Selector**: Dropdown showing all .txt files in public/ directory
  - Automatically updates when files are added/removed
  - Displays filenames without .txt extension
  - Uses `fileName` query parameter to select file
- **Display Toggle**: Button to switch between collapsed/expanded view
  - Uses `dropdownAlwaysOpen` query parameter
- **Page Links**:
  - 入力: Manual text input page
  - 入力-AI: Manual text input with AI processing
  - OCR: Image text extraction
  - ビジュアルノベル: Visual Novel real-time processing
