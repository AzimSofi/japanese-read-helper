# Frontend Architecture Documentation

This document provides a comprehensive overview of the Japanese Reading Helper frontend architecture, including all pages, components, styling, and patterns.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Design Philosophy](#design-philosophy)
3. [Page Structure](#page-structure)
4. [Component Architecture](#component-architecture)
5. [Styling System](#styling-system)
6. [State Management](#state-management)
7. [Hooks](#hooks)
8. [User Flows](#user-flows)
9. [Responsive Design](#responsive-design)
10. [Accessibility](#accessibility)

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.4.5 | App Router framework |
| React | 19.1.0 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| Noto Serif JP | - | Japanese typography |

---

## Design Philosophy

The frontend follows a **minimal, reading-focused** design philosophy:

1. **Content-first**: Reading area maximized, UI chrome hidden by default
2. **Library-first navigation**: File selection in dedicated library page
3. **Essential features only**: Bookmark + Furigana as primary controls
4. **Progressive disclosure**: Advanced features available but not prominent
5. **Warm, inviting aesthetic**: Cream/beige color palette for comfortable reading

---

## Page Structure

### Route Overview

\`\`\`
/                    -> Redirects to /library (or /read if params exist)
/library             -> Book library grid view
/read                -> Minimal distraction-free reader
/book-reader         -> Legacy reader with paragraph view
/text-input          -> Manual text entry
/text-input-ai       -> Manual text entry with AI processing
/visual-novel        -> Real-time VN text capture
/ocr                 -> OCR-based text extraction
/vocabulary          -> Saved vocabulary list
/ruby-registry       -> Character name readings management
/login               -> Authentication page
\`\`\`

### Page Details

#### \`/library\` - Library Page
**File**: \`app/library/page.tsx\`

The entry point for browsing and selecting books.

**Features**:
- Grid layout of all books organized by directory
- Progress bar per book showing reading completion
- Collapsible directory sections
- Minimal header with tool links

**Components Used**:
- \`LibraryGrid\` - Main grid container
- \`DirectorySection\` - Collapsible directory group
- \`BookCard\` - Individual book card

**Navigation**:
- Click book -> \`/read?directory=x&fileName=y\`
- Add button -> \`/text-input-ai\`
- VN icon -> \`/visual-novel\`

---

#### \`/read\` - Minimal Reader
**File**: \`app/read/page.tsx\`

The primary reading experience with distraction-free design.

**Features**:
- Full-width content with minimal chrome
- Thin progress bar at top (4px)
- Floating Action Button (FAB) in bottom-right
- Tap zones for page navigation
- Auto-hides controls after 3 seconds

**Components Used**:
- \`ProgressBar\` - Top progress indicator
- \`ReaderFAB\` - Floating action button with controls
- \`ReaderSettings\` - Slide-out settings panel
- \`ReadingContent\` - Content type detection and rendering
- \`CollapsibleItem\` - For rephrase-format content
- \`ParagraphItem\` - For furigana-format content
- \`ExplanationSidebar\` - AI sentence explanations

**URL Parameters**:
- \`directory\` - Book directory
- \`fileName\` - Book file name
- \`page\` - Current page number

**Tap Zones**:
- Left 20%: Previous page
- Right 20%: Next page
- Center: Show/hide FAB

---

#### \`/book-reader\` - Legacy Reader
**File**: \`app/book-reader/page.tsx\`

Alternative paragraph-based reader (preserved for backwards compatibility).

**Features**:
- Paragraph-by-paragraph display
- Font size and line height controls
- Bookmark functionality
- AI explanation sidebar

---

#### \`/visual-novel\` - Visual Novel Mode
**File**: \`app/visual-novel/page.tsx\`

Real-time text capture from Visual Novels via Textractor.

**Features**:
- Captures last \`<p>\` tag content from clipboard
- Sends to Gemini AI for rephrasing
- Retry logic with format validation
- Displays results in CollapsibleItem components

---

## Component Architecture

### Directory Structure

\`\`\`
app/
├── components/
│   ├── ui/                        # Shared UI components
│   │   ├── CollapsibleItem.tsx    # Expandable reading unit
│   │   ├── ParagraphItem.tsx      # Paragraph display
│   │   ├── ExplanationSidebar.tsx # AI explanation panel
│   │   ├── TopNavigation.tsx      # Legacy navigation (854 lines)
│   │   ├── Sidebar.tsx            # Progress sidebar
│   │   ├── Pagination.tsx         # Page navigation
│   │   ├── TTSButton.tsx          # Text-to-speech button
│   │   ├── TTSPlayerBar.tsx       # TTS playback controls
│   │   ├── VocabularySaveDialog.tsx
│   │   ├── RubyLookupSidebar.tsx
│   │   ├── ReadingControls.tsx
│   │   └── BookImage.tsx
│   ├── icons/                     # Icon components
│   │   ├── BookmarkFilled.tsx
│   │   ├── BookmarkUnfilled.tsx
│   │   ├── ChevronUp.tsx
│   │   └── ChevronDown.tsx
│   └── ClientLayout.tsx           # Layout wrapper
├── library/
│   ├── page.tsx                   # Library page
│   └── components/
│       ├── LibraryGrid.tsx        # Book grid
│       ├── DirectorySection.tsx   # Directory group
│       └── BookCard.tsx           # Book card
└── read/
    ├── page.tsx                   # Minimal reader
    └── components/
        ├── ProgressBar.tsx        # Top progress line
        ├── ReaderFAB.tsx          # Floating action button
        ├── ReaderSettings.tsx     # Settings panel
        └── ReadingContent.tsx     # Content renderer
\`\`\`

### Key Components

#### \`CollapsibleItem\`
**File**: \`app/components/ui/CollapsibleItem.tsx\`

The primary reading unit for rephrase-format content.

**Props**:
\`\`\`typescript
interface CollapsibleItemProps {
  id?: string;
  head: string;                    // Original Japanese text
  subItems: string[];              // Rephrasings (3 variations)
  initialDropdownState?: boolean;
  onSubmitSuccess: () => void;
  showFurigana?: boolean;
  aiExplanationEnabled?: boolean;
  onSentenceClick?: (sentence: string) => void;
  imageMap?: Record<string, string>;
  bookDirectory?: string;
  bookFileName?: string;
  onVocabularySelect?: (data: {...}) => void;
  onStartContinuousPlay?: () => void;
}
\`\`\`

**Features**:
- Expandable header with sub-items
- Bookmark icon (circular, filled/unfilled)
- TTS button with long-press for continuous play
- Sentence click for AI explanation
- Vocabulary mode for word selection
- Furigana support (bracket and ruby formats)
- Image placeholder rendering

---

#### \`ParagraphItem\`
**File**: \`app/components/ui/ParagraphItem.tsx\`

Paragraph display for furigana-format content.

**Props**:
\`\`\`typescript
interface ParagraphItemProps {
  id?: string;
  text: string;
  isBookmarked: boolean;
  fileName: string;
  showFurigana: boolean;
  onBookmarkSuccess: () => void;
  onSentenceClick?: (sentence: string) => void;
  fontSize: number;
  lineHeight: number;
  imageMap?: Record<string, string>;
}
\`\`\`

---

#### \`ReaderFAB\`
**File**: \`app/read/components/ReaderFAB.tsx\`

Floating action button for reader controls.

**Props**:
\`\`\`typescript
interface ReaderFABProps {
  onBookmark: () => void;
  onToggleFurigana: () => void;
  onOpenSettings: () => void;
  isFuriganaEnabled: boolean;
  isBookmarked: boolean;
}
\`\`\`

**Behavior**:
- Auto-hides after 3 seconds of inactivity
- Expands on tap to reveal action buttons
- Actions: Bookmark, Furigana toggle, Settings, Library

---

#### \`ReadingContent\`
**File**: \`app/read/components/ReadingContent.tsx\`

Content type detection and rendering orchestrator.

**Content Type Detection**:
\`\`\`typescript
function detectContentType(text: string): 'rephrase' | 'furigana' | 'plain' {
  if (text.includes('>>') && text.includes('<')) return 'rephrase';
  if (/<ruby>/.test(text) || /[^\[\]]+\[[^\[\]]+\]/.test(text)) return 'furigana';
  return 'plain';
}
\`\`\`

- \`rephrase\`: Renders with \`CollapsibleItem\`
- \`furigana\`/\`plain\`: Renders with \`ParagraphItem\`

---

#### \`ExplanationSidebar\`
**File**: \`app/components/ui/ExplanationSidebar.tsx\`

AI-powered sentence explanation panel.

**Features**:
- 5 explanation modes: Quick, Story, Nuance, Speaker, Narrative
- Context size slider (10-100 characters)
- Explanation caching in localStorage
- Swipe-to-close on mobile (100px threshold)
- ESC key to close

---

#### \`ClientLayout\`
**File**: \`app/components/ClientLayout.tsx\`

Layout wrapper with conditional navigation.

**Behavior**:
- Hides TopNavigation on \`/library\` and \`/read\` paths
- Shows TopNavigation on all other pages
- Handles client-side rendering for TopNavigation

\`\`\`typescript
const MINIMAL_LAYOUT_PATHS = ['/library', '/read'];

if (isMinimalLayout) {
  return <>{children}</>;  // No navigation
}
return (
  <>
    <TopNavigation />
    <div className="my-18">{children}</div>
  </>
);
\`\`\`

---

## Styling System

### Color Palette

Defined in \`lib/constants.ts\`:

\`\`\`typescript
export const COLORS = {
  BASE: '#FFF0DD',           // Warm cream - backgrounds, highlights
  NEUTRAL: '#D1D3D8',        // Light gray - borders, surfaces
  PRIMARY: '#E2A16F',        // Tan/gold - important actions, AI features
  PRIMARY_DARK: '#d18a54',   // Dark tan - hover states
  SECONDARY: '#86B0BD',      // Blue-gray - standard operations
  SECONDARY_DARK: '#6a98a8', // Dark blue-gray - hover states
} as const;

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
\`\`\`

### CSS Variables

Defined in \`app/globals.css\`:

\`\`\`css
:root {
  --background: #fff0dd82;
  --foreground: #171717;
  --color-base: #FFF0DD;
  --color-neutral: #D1D3D8;
  --color-primary: #E2A16F;
  --color-primary-dark: #d18a54;
  --color-secondary: #86B0BD;
  --color-secondary-dark: #6a98a8;
}
\`\`\`

### Typography

**Japanese Text (Reading Content)**:
\`\`\`css
.collapsibleItem, .collapsibleItem p {
  font-size: 1.3rem !important;
  font-family: Noto Serif JP;
  font-weight: 500;
  line-height: 1.5;
}
\`\`\`

**Furigana**:
\`\`\`css
rt {
  user-select: none;  /* Prevent selection */
}

.reader-content rt {
  font-size: 0.5em;
  color: var(--color-secondary-dark);
}
\`\`\`

### Using Colors in Components

**Via CSS Variables**:
\`\`\`typescript
import { CSS_VARS } from '@/lib/constants';

style={{ backgroundColor: CSS_VARS.BASE }}  // Uses var(--color-base)
\`\`\`

**Via Direct Values**:
\`\`\`typescript
import { COLORS, READER_THEME } from '@/lib/constants';

style={{ backgroundColor: COLORS.PRIMARY }}  // Uses #E2A16F
\`\`\`

**Color Mixing (Semi-transparent)**:
\`\`\`typescript
style={{
  backgroundColor: \`color-mix(in srgb, \${COLORS.PRIMARY} 20%, transparent)\`
}}
\`\`\`

---

## State Management

### URL Parameters (Navigation State)

| Parameter | Usage | Example |
|-----------|-------|---------|
| \`directory\` | Book subdirectory | \`bookv2-furigana\` |
| \`fileName\` | Book file name | \`chapter-1\` |
| \`page\` | Current page number | \`1\` |
| \`dropdownAlwaysOpen\` | Display mode | \`true\` |
| \`highlight\` | Word to highlight | \`word\` |

### LocalStorage (Persistent Preferences)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| \`furigana_enabled\` | boolean | false | Show furigana annotations |
| \`vocabulary_mode\` | boolean | false | Enable text selection mode |
| \`ai_explanation_enabled\` | boolean | false | Enable sentence explanations |
| \`topnav_collapsed\` | boolean | false | Collapse top navigation |
| \`reader_font_size\` | number | 16 | Font size in pixels |
| \`reader_line_height\` | number | 1.8 | Line height multiplier |
| \`explanation_mode\` | string | 'quick' | Selected explanation type |
| \`explanation_context_size\` | number | 50 | Context window size |
| \`tts_speed\` | number | 1.0 | TTS playback speed |
| \`tts_voice_gender\` | string | 'FEMALE' | TTS voice selection |

### Custom Events (Cross-Component Sync)

\`\`\`typescript
// Furigana toggle
window.dispatchEvent(new CustomEvent('furiganaChanged', {
  detail: { enabled: boolean }
}));

// Vocabulary mode toggle
window.dispatchEvent(new CustomEvent('vocabularyModeChanged', {
  detail: { enabled: boolean }
}));

// AI explanation toggle
window.dispatchEvent(new CustomEvent('aiExplanationChanged', {
  detail: { enabled: boolean }
}));

// Ruby lookup toggle
window.dispatchEvent(new CustomEvent('toggleRubyLookup'));
\`\`\`

---

## Hooks

### \`useTextContent\`
**File**: \`app/hooks/useTextContent.ts\`

Fetches text content from API.

\`\`\`typescript
const { text, isLoading, error, refetch } = useTextContent({
  fileName: 'chapter-1',
  directory: 'bookv2-furigana',
});
\`\`\`

### \`useBookmark\`
**File**: \`app/hooks/useBookmark.ts\`

Manages bookmark state.

\`\`\`typescript
const { bookmarkText, isLoading, error, updateBookmark, refetch } = useBookmark({
  fileName: 'chapter-1',
  enabled: true,
});
\`\`\`

### \`useReadingProgress\`
**File**: \`app/hooks/useReadingProgress.ts\`

Calculates reading progress metrics.

\`\`\`typescript
const { progress, totalItems, characterCount } = useReadingProgress({
  fileName: 'chapter-1',
  directory: 'bookv2-furigana',
});
\`\`\`

### \`useExplanationCache\`
**File**: \`app/hooks/useExplanationCache.ts\`

Manages localStorage caching for AI explanations.

\`\`\`typescript
const { getCachedExplanation, cacheExplanation, settings } = useExplanationCache(
  fileName,
  directory
);
\`\`\`

### \`useBookMetadata\`
**File**: \`app/hooks/useBookMetadata.ts\`

Loads book metadata including image mappings.

\`\`\`typescript
const { imageMap, metadata } = useBookMetadata(fileName, directory);
\`\`\`

### \`useTTSPlayer\`
**File**: \`app/hooks/useTTS.ts\`

Text-to-speech playback management.

\`\`\`typescript
const ttsPlayer = useTTSPlayer({
  items: textItems,
  fileName: 'chapter-1',
  directory: 'bookv2',
  onItemChange: (index) => { /* handle item change */ },
});
\`\`\`

---

## User Flows

### Primary Reading Flow

\`\`\`
1. User visits /
   |
2. Redirect to /library
   |
3. User browses book grid
   |
4. Click book card
   |
5. Navigate to /read?directory=x&fileName=y
   |
6. Minimal reader loads
   |
7. User reads content
   |
8. Tap left/right edges to navigate pages
   |
9. Tap center to show FAB
   |
10. Use FAB for bookmark/furigana/settings
\`\`\`

### Bookmark Flow

\`\`\`
1. User taps center to show FAB
   |
2. FAB expands
   |
3. Tap bookmark icon
   |
4. Current page saved to API
   |
5. Visual feedback (icon fills)
   |
6. Next visit auto-navigates to bookmark
\`\`\`

### AI Explanation Flow

\`\`\`
1. Enable AI explanation in settings
   |
2. Long-press or click sentence
   |
3. ExplanationSidebar opens
   |
4. Select explanation mode
   |
5. API call to Gemini
   |
6. Explanation displayed
   |
7. Result cached in localStorage
\`\`\`

---

## Responsive Design

### Breakpoints

| Breakpoint | Size | Usage |
|------------|------|-------|
| Mobile | < 768px | Full-width, hamburger menu |
| Tablet | 768px+ | Increased margins |
| Desktop | 1024px+ | Larger content area |
| Large | 1280px+ | Desktop sidebar visible |

### Layout Patterns

**Library Grid**:
\`\`\`
Mobile:  2 columns
Tablet:  3 columns
Desktop: 4 columns
\`\`\`

**Reader Content**:
\`\`\`
Mobile:  mx-4, full width
Tablet:  max-w-3xl, centered
Desktop: max-w-3xl, centered
\`\`\`

**Settings Panel**:
\`\`\`
Mobile:  Full screen height, 90vw width
Desktop: 320px fixed width
\`\`\`

---

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| \`ESC\` | Close sidebars |
| \`Ctrl+K\` or \`/\` | Toggle Ruby Lookup |
| \`Tab\` | Navigate focusable elements |

### ARIA Labels

All interactive elements include appropriate ARIA labels:
- Buttons have \`aria-label\` descriptions
- Current page uses \`aria-current="page"\`
- Dialogs use proper role attributes

### Touch Targets

- Minimum 44x44px for interactive elements
- FAB button: 56x56px
- Book cards: Full card clickable

### Color Contrast

- Text on cream background: sufficient contrast
- Primary color (#E2A16F) used for emphasis
- Secondary color (#86B0BD) for less prominent elements

---

## File Reference

### Constants
- \`lib/constants.ts\` - All configuration, colors, and constants

### Types
- \`lib/types.ts\` - TypeScript interfaces and types

### Utilities
- \`lib/utils/markdownParser/\` - AI response parsing
- \`lib/utils/furiganaParser.ts\` - Furigana rendering

### Styles
- \`app/globals.css\` - Global styles and CSS variables

### API Routes
- See \`lib/constants.ts\` -> \`API_ROUTES\` for all endpoints

---

## Future Considerations

1. **Dark Mode**: CSS variables are prepared for theme switching
2. **Offline Support**: Service worker for offline reading
3. **Reading Statistics**: Track time spent, pages read
4. **Swipe Gestures**: Swipe left/right for page navigation
5. **Bookshelf Organization**: Favorites, reading, completed categories
