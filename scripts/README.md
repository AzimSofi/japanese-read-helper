# Scripts Directory

This directory contains Python utility scripts for processing Japanese text and EPUB files.

## Contents

- **epub-to-text-furigana.py** - Converts EPUB files to plain text with furigana
- **furigana_helper.py** - Helper functions for MeCab-based furigana generation
- **requirements.txt** - Python dependencies
- **README-epub-converter.md** - Detailed documentation for the EPUB converter

## Quick Start

### 1. Create Virtual Environment (Recommended)

```bash
# From the scripts directory
cd scripts

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Make sure you're in the activated virtual environment
pip install -r requirements.txt
```

This will install:
- `ebooklib` - EPUB file parsing
- `beautifulsoup4` - HTML/XML parsing
- `lxml` - XML processing
- `mecab-python3` - Japanese morphological analysis
- `unidic-lite` - Japanese dictionary for MeCab

### 3. Verify Installation

```bash
python3 -c "import MeCab; print('MeCab installed successfully!')"
```

### 4. Run Scripts

```bash
# Convert an EPUB file (from scripts directory)
python epub-to-text-furigana.py path/to/book.epub

# Or from project root
python scripts/epub-to-text-furigana.py path/to/book.epub
```

## EPUB Converter

For detailed documentation on the EPUB to Text converter, see [README-epub-converter.md](./README-epub-converter.md).

## Virtual Environment Notes

**Important:** The `venv/` directory should NOT be committed to git. It's already in `.gitignore`.

Each developer should create their own virtual environment locally:

```bash
cd scripts
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

## Deactivating Virtual Environment

When you're done using the scripts:

```bash
deactivate
```

## Troubleshooting

### "Command not found: python3"

Try `python` instead of `python3`:

```bash
python -m venv venv
```

### Permission errors on macOS/Linux

Make the script executable:

```bash
chmod +x epub-to-text-furigana.py
```

### MeCab installation fails

Install system dependencies first:

**macOS:**
```bash
brew install mecab
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mecab libmecab-dev mecab-ipadic-utf8
```

Then retry:
```bash
pip install mecab-python3 unidic-lite
```

## Integration with Main App

These scripts are standalone utilities and do NOT run as part of the main Next.js application. They are used offline to prepare text files that are then read by the web app.

The main Next.js app (`npm run dev`) is configured to ignore this directory to avoid file watcher issues with the large `venv/` folder.
