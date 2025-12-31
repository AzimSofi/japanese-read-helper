#!/usr/bin/env python3
"""
Extract ALL Ruby from EPUB (No Filtering)

Extracts all ruby pairs from EPUB files without any filtering.
Updates the ruby-registry.json for each book.

Usage:
    python extract-all-ruby.py
"""

import json
import re
import sys
from pathlib import Path

try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
    import warnings
    from bs4 import XMLParsedAsHTMLWarning
    warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
except ImportError as e:
    print(f"Error: Missing dependencies: {e}")
    print("pip install ebooklib beautifulsoup4 lxml")
    sys.exit(1)


def sanitize_filename(title):
    """Convert book title to safe filename."""
    safe = re.sub(r'[<>:"/\\|?*]', '', title)
    safe = re.sub(r'\s+', ' ', safe)
    safe = safe.strip()[:200]
    return safe if safe else 'untitled'


def extract_all_ruby_from_epub(epub_path: Path) -> dict[str, str]:
    """Extract ALL ruby pairs from EPUB without any filtering."""
    book = epub.read_epub(str(epub_path))
    all_pairs = {}

    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            try:
                soup = BeautifulSoup(item.get_content().decode('utf-8'), 'lxml')
                for ruby in soup.find_all('ruby'):
                    rt = ruby.find('rt')
                    if not rt:
                        continue

                    reading = rt.get_text().strip()
                    if not reading:
                        continue

                    for rp in ruby.find_all('rp'):
                        rp.decompose()

                    rt_copy = rt.extract()
                    kanji = ruby.get_text().strip()
                    ruby.append(rt_copy)

                    if kanji and reading and kanji != reading:
                        if kanji not in all_pairs:
                            all_pairs[kanji] = reading
            except Exception:
                continue

    return all_pairs


def find_book_directory(epub_path: Path, public_dir: Path) -> Path | None:
    """Find the book directory in public folder."""
    try:
        book = epub.read_epub(str(epub_path))
        title = book.get_metadata('DC', 'title')
        title = title[0][0] if title else epub_path.stem
    except Exception:
        title = epub_path.stem

    safe_title = sanitize_filename(title)

    for subdir in ['bookv3-rephrase', 'bookv2-furigana', 'bookv1-rephrase']:
        book_dir = public_dir / subdir / safe_title
        if book_dir.exists():
            return book_dir

    for subdir in ['bookv3-rephrase', 'bookv2-furigana', 'bookv1-rephrase']:
        base_dir = public_dir / subdir
        if base_dir.exists():
            for d in base_dir.iterdir():
                if d.is_dir() and safe_title in d.name:
                    return d

    return None


def update_registry(book_dir: Path, pairs: dict[str, str], book_title: str):
    """Update or create ruby-registry.json."""
    registry_path = book_dir / 'ruby-registry.json'

    if registry_path.exists():
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
    else:
        registry = {
            'bookTitle': book_title,
            'entries': [],
            'suggestions': []
        }

    existing_kanji = {e['kanji'] for e in registry['entries']}

    new_entries = []
    for kanji, reading in sorted(pairs.items()):
        if kanji not in existing_kanji:
            new_entries.append({
                'kanji': kanji,
                'reading': reading,
                'source': 'epub',
                'note': ''
            })

    registry['entries'].extend(new_entries)
    registry['entries'].sort(key=lambda x: x['kanji'])

    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)

    return len(new_entries), len(registry['entries'])


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    temp_dir = project_root / 'temp'
    public_dir = project_root / 'public'

    if not temp_dir.exists():
        print(f"Error: temp directory not found at {temp_dir}")
        sys.exit(1)

    epub_files = list(temp_dir.glob('*.epub'))
    print(f"Found {len(epub_files)} EPUB files\n")

    for epub_path in epub_files:
        print(f"Processing: {epub_path.name}")

        try:
            pairs = extract_all_ruby_from_epub(epub_path)
            print(f"  Found {len(pairs)} unique ruby pairs")

            book_dir = find_book_directory(epub_path, public_dir)
            if book_dir:
                book_title = book_dir.name
                new_count, total_count = update_registry(book_dir, pairs, book_title)
                print(f"  Updated registry: +{new_count} new entries (total: {total_count})")
                print(f"  Location: {book_dir / 'ruby-registry.json'}")
            else:
                print(f"  No book directory found, skipping")
        except Exception as e:
            print(f"  Error: {e}")

        print()

    print("Done!")


if __name__ == '__main__':
    main()
