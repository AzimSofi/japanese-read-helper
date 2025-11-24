# Read Helper

Read Helper is a web-based tool designed to assist Japanese language learners when reading Visual Novels. It integrates with Textractor and a clipboard inserter to provide AI-rephrased versions of in-game text, aiming to improve comprehension.

---

## Demo (Early prototype)

This video demonstrates Read Helper in operation, showcasing its text processing and AI rephrasing capabilities.

https://github.com/user-attachments/assets/16d81533-e417-4123-b764-a0066d0b6c84

---

## Functionality

Read Helper provides the following core functions:

*   **Text Acquisition:** Captures Visual Novel text in real-time via Textractor and a clipboard inserter.
*   **AI Rephrasing:** Utilizes the Gemini AI model to generate three distinct rephrased versions of the extracted text.
*   **Comprehension Support:** Offers alternative phrasings to clarify complex Japanese sentences and enhance understanding for learners.

## Usage Context

This tool is intended for:

*   **Japanese Language Learners:** To aid in understanding and learning Japanese through Visual Novels.
*   **Visual Novel Readers:** To provide immediate linguistic assistance without interrupting the reading flow.

---

## EPUB Processing

Read Helper can process EPUB files to extract text with furigana annotations and images for reading in the app.

### Prerequisites

Install Python dependencies:

```bash
pip install -r scripts/requirements.txt
# Or install with --break-system-packages on managed systems:
pip install -r scripts/requirements.txt --break-system-packages
```

### Processing an EPUB

Basic usage:

```bash
python3 scripts/epub-to-text-furigana.py path/to/your-book.epub
```

Options:
- `--filter n3`: Only add furigana to N3+ (advanced) kanji
- `--hiragana-style long-vowel`: Use long vowel marks (ー) instead of full hiragana
- `--output ./custom/path`: Specify custom output directory

Examples:

```bash
# Process with all kanji getting furigana (default)
python3 scripts/epub-to-text-furigana.py book.epub

# Only add furigana to advanced kanji
python3 scripts/epub-to-text-furigana.py book.epub --filter n3

# Custom output location
python3 scripts/epub-to-text-furigana.py book.epub --output ./my-books/
```

### What the script does:

1. **Extracts and organizes files** into a book-specific directory:
   - Text file with furigana: `book-name/book-name.txt`
   - Metadata JSON: `book-name/book-name.json`
   - Images: `book-name/images/illustration-*.jpg/png`

2. **Image processing**:
   - Automatically detects and extracts cover image as `illustration-000.jpg`
   - Renames all images sequentially: `illustration-001.jpg`, `illustration-002.jpg`, etc.
   - Creates image mapping in JSON metadata for the app to use

3. **Text processing**:
   - Preserves existing furigana from the EPUB
   - Adds furigana to remaining kanji using MeCab
   - Builds dictionary of character names/terms for consistent readings
   - Processes all chapters and combines them

### Output location:

Files are created in: `public/bookv2-furigana/[book-name]/`

### Using processed books in the app:

Once processed, the book will automatically appear in the file selector dropdown in the app.

---

## Content Management (Database-Only Architecture)

Read Helper uses a **database-first architecture** for managing book content. Text files are **not committed to the repository** to avoid copyright issues. Instead, content is stored in PostgreSQL and managed via admin API endpoints.

### Quick Start

1. **Set up environment variables**:

```bash
# Copy example file
cp .env.example .env.local

# Edit .env.local and set:
ADMIN_API_KEY=your_secure_random_key_here  # Generate with: openssl rand -hex 32
GEMINI_API_KEY=your_gemini_api_key
```

2. **Start the database** (development):

```bash
npm run db:start    # Start PostgreSQL container
npm run db:init     # Initialize tables
```

3. **Add books** (choose one method):

**Option A: Via Swagger UI** (Recommended for single files)
- Navigate to `http://localhost:3333/api-docs`
- Click "Authorize" and enter your `ADMIN_API_KEY`
- Use `POST /api/admin?action=text-entries` to upload book content

**Option B: Via EPUB Script** (Recommended for EPUB files)
```bash
export ADMIN_API_KEY=your_key_here
python3 scripts/epub-to-text-furigana.py book.epub --output-mode api
```

**Option C: Via Direct API Call**
```bash
curl -X POST 'http://localhost:3333/api/admin?action=text-entries' \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_key_here" \
  -d '{"fileName":"my-book","directory":"bookv2-furigana","content":"< 日本語のテキスト"}'
```

### Admin API Endpoints

All admin endpoints require the `x-api-key` header with your `ADMIN_API_KEY`.

The `/api/admin` route uses action-based routing with query parameters:

#### `POST /api/admin?action=text-entries`
Upload or update a single text entry.

**Request:**
```json
{
  "fileName": "my-book",
  "directory": "bookv2-furigana",
  "content": "< 今日は良い天気です。>> Today is nice weather. >> ..."
}
```

#### `POST /api/admin?action=bookmarks`
Set a bookmark position for a file.

**Request:**
```json
{
  "fileName": "my-book",
  "directory": "bookv2-furigana",
  "bookmarkText": "< 今日は良い天気です。"
}
```

#### `POST /api/admin?action=bulk-seed`
Upload multiple text entries at once.

**Request:**
```json
{
  "entries": [
    {
      "fileName": "book-1",
      "directory": "bookv2-furigana",
      "content": "..."
    },
    {
      "fileName": "book-2",
      "directory": "bookv2-furigana",
      "content": "..."
    }
  ]
}
```

### Interactive API Documentation

Access the Swagger UI at `http://localhost:3333/api-docs` for:
- Interactive endpoint testing
- Request/response examples
- API authentication setup

### EPUB Script API Mode

The EPUB processing script supports direct upload to the database:

```bash
# Set your API key
export ADMIN_API_KEY=your_key_here

# Process and upload directly to database (no files created)
python3 scripts/epub-to-text-furigana.py book.epub --output-mode api

# Optional: Specify custom API URL (defaults to http://localhost:3333)
export API_URL=https://your-app.vercel.app
python3 scripts/epub-to-text-furigana.py book.epub --output-mode api
```

**API Mode Features:**
- Uploads text content directly to database
- Images still saved to `public/bookv2-furigana/[book-name]/images/`
- Metadata JSON still created for image references
- No text files created (database-only)

### Local Development Workflow

1. **Start services**:
```bash
npm run db:start    # Start PostgreSQL
npm run dev         # Start Next.js (port 3333)
```

2. **Add your books** via any method above

3. **Access app**: Open `http://localhost:3333`
   - Books automatically appear in dropdown
   - All content served from database

### Production Deployment (Vercel)

1. **Deploy to Vercel**:
   - Vercel Postgres is automatically provisioned
   - No manual database configuration needed

2. **Set environment variables** in Vercel dashboard:
   - `GEMINI_API_KEY`
   - `ADMIN_API_KEY`

3. **Add books** to production:
   - Use API mode: `export API_URL=https://your-app.vercel.app`
   - Or use Swagger UI at `https://your-app.vercel.app/api-docs`

### Important Notes

- ✅ **Text files are gitignored** - no copyrighted content in repository
- ✅ **Images are gitignored** - book covers/illustrations not committed
- ✅ **Database is the source of truth** - all text content stored in PostgreSQL
- ✅ **Directory structure preserved** - `.gitkeep` files maintain folder structure
- ⚠️ **ADMIN_API_KEY required** - generate a secure key for production
- ⚠️ **Database backup** - recommended for production (Vercel handles automatically)

### Migrating Existing Files

If you have existing text files in `public/` and want to migrate them to the database:

```bash
# One-time migration
npm run db:migrate

# Or use the API endpoint
curl -X POST http://localhost:3333/api/migrate-text-files
```

After migration, the app will read from database instead of files.

