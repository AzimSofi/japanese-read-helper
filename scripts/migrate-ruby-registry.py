#!/usr/bin/env python3
"""
Migrate Ruby Registry from Existing Text Files

Extracts ruby pairs from text files that already contain <ruby> HTML tags
and creates ruby-registry.json files.

Usage:
    # Migrate a single book
    python migrate-ruby-registry.py public/bookv2-furigana/book-name/book-name.txt

    # Migrate all books in a directory
    python migrate-ruby-registry.py public/bookv2-furigana/ --all

    # Dry run (show what would be created)
    python migrate-ruby-registry.py public/bookv2-furigana/ --all --dry-run
"""

import argparse
import json
import re
import sys
from pathlib import Path
from collections import Counter

RUBY_PATTERN = re.compile(r'<ruby>([^<]+)<rt>([^<]+)</rt></ruby>')

COMMON_SINGLE_KANJI = {
    '私', '僕', '俺', '彼', '今', '何', '時', '人', '事', '物',
    '所', '方', '前', '後', '上', '下', '中', '大', '小', '新',
    '古', '良', '悪', '高', '低', '長', '短', '日', '月', '年',
    '言', '思', '見', '聞', '知', '行', '来', '出', '入', '持',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
}

COMMON_WORDS = {
    '本書', '発刊', '刊行', '出版', '株式', '会社', '研究', '最後',
    '感謝', '平成', '令和', '昭和', '大正', '明治',
}


def extract_ruby_pairs(text: str) -> dict[str, tuple[str, int]]:
    """Extract ruby pairs from text, counting occurrences."""
    pairs: dict[str, tuple[str, int]] = {}

    for match in RUBY_PATTERN.finditer(text):
        kanji = match.group(1).strip()
        reading = match.group(2).strip()

        if not kanji or not reading:
            continue
        if kanji == reading:
            continue

        if kanji in pairs:
            existing_reading, count = pairs[kanji]
            if existing_reading == reading:
                pairs[kanji] = (reading, count + 1)
        else:
            pairs[kanji] = (reading, 1)

    return pairs


def filter_entries(pairs: dict[str, tuple[str, int]], min_occurrences: int = 1) -> list[dict]:
    """Filter out common words and low-frequency entries."""
    entries = []

    for kanji, (reading, count) in pairs.items():
        if len(kanji) == 1 and kanji in COMMON_SINGLE_KANJI:
            continue
        if kanji in COMMON_WORDS:
            continue
        if count < min_occurrences:
            continue

        entries.append({
            "kanji": kanji,
            "reading": reading,
            "source": "text",
            "note": f"({count}x)" if count > 1 else ""
        })

    entries.sort(key=lambda e: e["kanji"])
    return entries


def process_file(file_path: Path, dry_run: bool = False) -> dict | None:
    """Process a single text file and create/update registry."""
    if not file_path.exists():
        print(f"  File not found: {file_path}")
        return None

    print(f"Processing: {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pairs = extract_ruby_pairs(content)
    print(f"  Found {len(pairs)} unique ruby pairs")

    entries = filter_entries(pairs, min_occurrences=1)
    print(f"  After filtering: {len(entries)} entries")

    if not entries:
        print("  No entries to save (all filtered out)")
        return None

    book_title = file_path.stem
    registry = {
        "bookTitle": book_title,
        "entries": entries,
        "suggestions": []
    }

    registry_path = file_path.parent / "ruby-registry.json"

    if dry_run:
        print(f"  Would save to: {registry_path}")
        print(f"  Sample entries:")
        for entry in entries[:5]:
            print(f"    {entry['kanji']} -> {entry['reading']}")
        if len(entries) > 5:
            print(f"    ... and {len(entries) - 5} more")
    else:
        if registry_path.exists():
            with open(registry_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            existing_kanji = {e['kanji'] for e in existing.get('entries', [])}
            new_entries = [e for e in entries if e['kanji'] not in existing_kanji]
            if new_entries:
                existing['entries'].extend(new_entries)
                existing['entries'].sort(key=lambda e: e['kanji'])
                print(f"  Merged {len(new_entries)} new entries with existing registry")
                registry = existing
            else:
                print(f"  Registry already exists with same entries, skipping")
                return existing

        with open(registry_path, 'w', encoding='utf-8') as f:
            json.dump(registry, f, ensure_ascii=False, indent=2)
        print(f"  Saved to: {registry_path}")

    return registry


def process_directory(dir_path: Path, dry_run: bool = False) -> int:
    """Process all books in a directory."""
    count = 0

    for book_dir in sorted(dir_path.iterdir()):
        if not book_dir.is_dir():
            continue
        if book_dir.name.startswith('.'):
            continue

        txt_files = list(book_dir.glob("*.txt"))
        main_txt = None
        for txt in txt_files:
            if '-rephrase' not in txt.name and '-progress' not in txt.name:
                main_txt = txt
                break

        if main_txt:
            result = process_file(main_txt, dry_run)
            if result:
                count += 1
            print()

    return count


def main():
    parser = argparse.ArgumentParser(
        description='Migrate ruby registry from existing text files'
    )
    parser.add_argument('path', help='Path to text file or directory')
    parser.add_argument('--all', action='store_true',
                        help='Process all books in directory')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without saving')
    args = parser.parse_args()

    path = Path(args.path)

    if not path.exists():
        print(f"Error: Path not found: {path}")
        sys.exit(1)

    print(f"{'DRY RUN - ' if args.dry_run else ''}Ruby Registry Migration")
    print("=" * 60)
    print()

    if args.all or path.is_dir():
        if path.is_file():
            path = path.parent.parent
        count = process_directory(path, args.dry_run)
        print("=" * 60)
        print(f"Processed {count} books")
    else:
        process_file(path, args.dry_run)


if __name__ == '__main__':
    main()
