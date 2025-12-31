#!/usr/bin/env python3
"""
Extract Ruby from EPUB Only (No Text Processing)

Extracts ruby pairs from EPUB files and creates ruby-registry.json
without re-processing the entire book. Use this for books that have
already been processed but need the registry.

Usage:
    python extract-ruby-from-epub.py book.epub --output public/bookv2-furigana/book-name/
"""

import argparse
import json
import re
import sys
from pathlib import Path
from collections import Counter

try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Error: Missing dependencies: {e}")
    print("pip install ebooklib beautifulsoup4 lxml")
    sys.exit(1)


KANJI_PATTERN = re.compile(r'[\u4e00-\u9faf\u3400-\u4dbf]+')

COMMON_WORDS = {
    '私', '僕', '俺', '彼', '彼女', '今日', '明日', '昨日', '今', '何',
    '言', '思', '見', '聞', '知', '行', '来', '出', '入', '持', '使',
    '時', '人', '事', '物', '所', '方', '前', '後', '上', '下', '中',
    '大', '小', '新', '古', '良', '悪', '高', '低', '長', '短',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '百', '千', '万', '億', '年', '月', '日', '週', '曜',
}


HIRAGANA_PATTERN = re.compile(r'^[\u3040-\u309F]+$')
KATAKANA_PATTERN = re.compile(r'^[\u30A0-\u30FF]+$')


def extract_ruby_from_html(html_content: str) -> dict[str, str]:
    """Extract ruby pairs from HTML content."""
    soup = BeautifulSoup(html_content, 'lxml')
    pairs = {}

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

        if not kanji or not reading or kanji == reading:
            continue
        if len(kanji) == 1:
            continue
        if HIRAGANA_PATTERN.match(kanji):
            continue
        if KATAKANA_PATTERN.match(kanji):
            continue
        if not KANJI_PATTERN.search(kanji):
            continue
        if kanji in COMMON_WORDS:
            continue
        if kanji not in pairs:
            pairs[kanji] = reading

    return pairs


def process_epub(epub_path: Path, output_dir: Path | None = None):
    """Extract ruby from EPUB and create registry."""
    print(f"Processing: {epub_path}")

    try:
        book = epub.read_epub(str(epub_path))
    except Exception as e:
        print(f"Error reading EPUB: {e}")
        sys.exit(1)

    title = book.get_metadata('DC', 'title')
    title = title[0][0] if title else epub_path.stem
    print(f"Title: {title}")

    all_pairs = {}
    chapter_count = 0

    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            chapter_count += 1
            try:
                html = item.get_content().decode('utf-8')
                pairs = extract_ruby_from_html(html)
                all_pairs.update(pairs)
            except Exception:
                continue

    print(f"Chapters processed: {chapter_count}")
    print(f"Ruby pairs found: {len(all_pairs)}")

    if not all_pairs:
        print("No ruby annotations found in EPUB")
        return

    entries = [
        {"kanji": k, "reading": v, "source": "epub", "note": ""}
        for k, v in sorted(all_pairs.items())
    ]

    registry = {
        "bookTitle": title,
        "entries": entries,
        "suggestions": []
    }

    if output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        registry_path = output_dir / "ruby-registry.json"
    else:
        registry_path = epub_path.parent / "ruby-registry.json"

    print(f"Saving to: {registry_path}")
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)

    print()
    print("Sample entries:")
    for entry in entries[:10]:
        print(f"  {entry['kanji']} -> {entry['reading']}")
    if len(entries) > 10:
        print(f"  ... and {len(entries) - 10} more")


def main():
    parser = argparse.ArgumentParser(
        description='Extract ruby from EPUB to create registry'
    )
    parser.add_argument('epub_file', help='Path to EPUB file')
    parser.add_argument('--output', '-o',
                        help='Output directory for ruby-registry.json')
    args = parser.parse_args()

    epub_path = Path(args.epub_file)
    if not epub_path.exists():
        print(f"Error: File not found: {epub_path}")
        sys.exit(1)

    output_dir = Path(args.output) if args.output else None
    process_epub(epub_path, output_dir)


if __name__ == '__main__':
    main()
