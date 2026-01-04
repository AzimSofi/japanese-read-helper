#!/usr/bin/env python3
"""
EPUB to Plain Text Converter (No Furigana) + Ruby Registry Extraction

Extracts plain text from EPUB files without adding furigana.
Also extracts ruby annotations to create a lookup registry for character names, etc.

Usage:
    python epub-to-text.py book.epub
    python epub-to-text.py book.epub --output ./custom-dir/
"""

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Error: Missing required dependencies: {e}")
    print("\nPlease install dependencies:")
    print("  pip install ebooklib beautifulsoup4 lxml")
    sys.exit(1)


KANJI_PATTERN = re.compile(r'[\u4e00-\u9faf\u3400-\u4dbf]+')
COMMON_WORDS = {
    '私', '僕', '俺', '彼', '彼女', '今日', '明日', '昨日', '今', '何',
    '言', '思', '見', '聞', '知', '行', '来', '出', '入', '持', '使',
    '時', '人', '事', '物', '所', '方', '前', '後', '上', '下', '中',
    '大', '小', '新', '古', '良', '悪', '高', '低', '長', '短',
}


def sanitize_filename(title):
    """Convert book title to safe filename."""
    safe = re.sub(r'[<>:"/\\|?*]', '', title)
    safe = re.sub(r'\s+', ' ', safe)
    safe = safe.strip()[:200]
    return safe if safe else 'untitled'


def extract_images_from_epub(book, output_dir, safe_title):
    """Extract all images from EPUB."""
    images_dir = output_dir / safe_title / 'images'
    images_dir.mkdir(parents=True, exist_ok=True)

    image_metadata = []
    image_counter = 0

    all_images = [item for item in book.get_items() if item.get_type() == ebooklib.ITEM_IMAGE]
    print(f"  Found {len(all_images)} images")

    # Find cover image
    cover_image = None
    for item in all_images:
        if 'cover' in item.get_name().lower():
            cover_image = item
            break

    if not cover_image:
        for item in book.get_items():
            name = item.get_name()
            if 'cover' in name.lower() and name.endswith(('.jpg', '.jpeg', '.png')):
                cover_image = item
                break

    # Extract cover first
    if cover_image:
        ext = Path(cover_image.get_name()).suffix or '.jpg'
        new_filename = f"illustration-000{ext}"
        image_path = images_dir / new_filename
        try:
            with open(image_path, 'wb') as f:
                f.write(cover_image.get_content())
            image_metadata.append({'fileName': new_filename, 'orderIndex': -1})
            print(f"  Extracted cover: {new_filename}")
        except Exception as e:
            print(f"  Failed to extract cover: {e}")

    # Extract remaining images
    for item in all_images:
        if cover_image and item == cover_image:
            continue
        image_counter += 1
        ext = Path(item.get_name()).suffix or '.jpg'
        new_filename = f"illustration-{image_counter:03d}{ext}"
        image_path = images_dir / new_filename
        try:
            with open(image_path, 'wb') as f:
                f.write(item.get_content())
            image_metadata.append({'fileName': new_filename, 'orderIndex': image_counter - 1})
        except Exception:
            pass

    return image_metadata


def extract_ruby_pairs(soup):
    """Extract all ruby (kanji -> reading) pairs from HTML."""
    ruby_pairs = {}

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
            if kanji not in ruby_pairs:
                ruby_pairs[kanji] = reading

    return ruby_pairs


def find_kanji_compounds(text):
    """Find all kanji compounds in text and count occurrences."""
    compounds = Counter()
    for match in KANJI_PATTERN.finditer(text):
        compound = match.group()
        if len(compound) >= 2 and compound not in COMMON_WORDS:
            compounds[compound] += 1
    return compounds


def extract_text_from_html(html_content, ruby_collector=None, compound_counter=None):
    """Extract plain text from HTML, removing all ruby/furigana."""
    soup = BeautifulSoup(html_content, 'lxml')

    if ruby_collector is not None:
        pairs = extract_ruby_pairs(soup)
        ruby_collector.update(pairs)

    for rt in soup.find_all('rt'):
        rt.decompose()

    for rp in soup.find_all('rp'):
        rp.decompose()

    for ruby in soup.find_all('ruby'):
        ruby.unwrap()

    for tag in soup.find_all(['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        if tag.name == 'br':
            tag.replace_with('\n')
        else:
            if tag.string is None:
                tag.insert_before('\n')
                tag.insert_after('\n')

    text = soup.get_text()

    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if line:
            lines.append(line)

    result = '\n'.join(lines)

    if compound_counter is not None:
        compounds = find_kanji_compounds(result)
        compound_counter.update(compounds)

    return result


def process_epub(epub_path, output_dir=None):
    """Convert EPUB to plain text."""
    print(f"Processing EPUB: {epub_path}")

    try:
        book = epub.read_epub(epub_path)
    except Exception as e:
        print(f"Error reading EPUB: {e}")
        sys.exit(1)

    title = book.get_metadata('DC', 'title')
    title = title[0][0] if title else Path(epub_path).stem
    author = book.get_metadata('DC', 'creator')
    author = author[0][0] if author else 'Unknown'

    print(f"Title: {title}")
    print(f"Author: {author}")

    safe_title = sanitize_filename(title)
    if output_dir is None:
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        output_dir = project_root / 'public' / 'bookv3-rephrase'
    output_dir = Path(output_dir)

    print("\nExtracting images...")
    image_metadata = extract_images_from_epub(book, output_dir, safe_title)
    print(f"  Extracted {len(image_metadata)} images")

    print("\nExtracting text and ruby annotations...")
    chapters = []
    chapter_count = 0
    ruby_collector = {}
    compound_counter = Counter()

    for spine_id, linear in book.spine:
        item = book.get_item_with_id(spine_id)
        if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
            chapter_count += 1
            print(f"  Processing chapter {chapter_count}...", end='', flush=True)

            try:
                html_content = item.get_content().decode('utf-8')
                text = extract_text_from_html(
                    html_content,
                    ruby_collector=ruby_collector,
                    compound_counter=compound_counter
                )

                text = re.sub(r'\n{3,}', '\n\n', text)
                text = text.strip()

                if text and len(text) > 10:
                    chapters.append(text)
                    print(" done")
                else:
                    print(" (empty)")
            except Exception as e:
                print(f" error: {e}")
                continue

    if not chapters:
        print("\nError: No chapters extracted")
        sys.exit(1)

    print(f"\nExtracted {len(chapters)} chapters")
    print(f"Found {len(ruby_collector)} unique ruby annotations")

    output_text = f"Title: {title}\nAuthor: {author}\n\n"
    output_text += "\n\n".join(chapters)

    book_dir = output_dir / safe_title
    book_dir.mkdir(parents=True, exist_ok=True)

    output_path = book_dir / f"{safe_title}.txt"
    metadata_path = book_dir / f"{safe_title}.json"
    registry_path = book_dir / "ruby-registry.json"

    print(f"\nSaving to: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output_text)

    metadata = {
        'title': title,
        'author': author,
        'fileName': safe_title,
        'chaptersCount': len(chapters),
        'images': image_metadata,
        'workflow': 'rephrase-first'
    }
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    entries = [
        {"kanji": k, "reading": v, "source": "epub", "note": ""}
        for k, v in sorted(ruby_collector.items())
    ]

    annotated_kanji = set(ruby_collector.keys())
    suggestions = []
    for compound, count in compound_counter.most_common():
        if compound not in annotated_kanji and count >= 3:
            suggestions.append({"kanji": compound, "occurrences": count})
        if len(suggestions) >= 50:
            break

    ruby_registry = {
        "bookTitle": title,
        "entries": entries,
        "suggestions": suggestions
    }

    print(f"Saving ruby registry: {registry_path}")
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(ruby_registry, f, ensure_ascii=False, indent=2)

    file_size = output_path.stat().st_size / 1024
    print(f"\n{'='*60}")
    print(f"Done! Plain text extracted (no furigana)")
    print(f"{'='*60}")
    print(f"Output: {output_path}")
    print(f"Size: {file_size:.1f} KB")
    print(f"Chapters: {len(chapters)}")
    print(f"Images: {len(image_metadata)}")
    print(f"Ruby entries: {len(entries)}")
    print(f"Suggestions: {len(suggestions)}")
    print(f"{'='*60}")

    return output_path, safe_title


def main():
    parser = argparse.ArgumentParser(description='Extract plain text from EPUB (no furigana)')
    parser.add_argument('epub_file', help='Path to EPUB file')
    parser.add_argument('--output', '-o', help='Output directory (default: public/bookv3-rephrase/)')
    args = parser.parse_args()

    epub_path = Path(args.epub_file)
    if not epub_path.exists():
        print(f"Error: File not found: {epub_path}")
        sys.exit(1)

    process_epub(epub_path, args.output)


if __name__ == '__main__':
    main()
