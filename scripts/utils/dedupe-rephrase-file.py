#!/usr/bin/env python3
"""
Deduplication script for rephrase files.

Removes duplicate sections from -rephrase-furigana.txt files while preserving:
- All rephrasings (AI-generated content)
- Bookmark validity

Usage:
    python dedupe-rephrase-file.py path/to/file.txt [--dry-run]
    python dedupe-rephrase-file.py --batch path/to/directory [--dry-run]
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path


def normalize_header(header: str) -> str:
    """Normalize header for comparison by removing ruby tags and whitespace."""
    # Remove ruby/rt tags
    text = re.sub(r'</?(?:ruby|rt|rb)>', '', header)
    # Remove all whitespace (spaces, newlines, etc.)
    text = re.sub(r'\s+', '', text)
    return text


def parse_sections(content: str) -> list[dict]:
    """
    Parse content into sections.
    Each section starts with '< ' and may have multiple '>>' lines.
    """
    sections = []
    current_section = None
    lines = content.split('\n')

    for line in lines:
        stripped = line.strip()

        # Check for section start (< at beginning of line, but not HTML tags)
        if stripped.startswith('< ') or (stripped.startswith('<') and not stripped.startswith('</')):
            # Skip if it's an HTML tag like <ruby>
            if stripped.startswith('<ruby') or stripped.startswith('<rt') or stripped.startswith('<rb'):
                if current_section is not None:
                    current_section['lines'].append(line)
                continue

            # Save previous section if exists
            if current_section is not None:
                sections.append(current_section)

            # Start new section
            header = stripped[1:].strip() if stripped.startswith('< ') else stripped[1:].strip()
            current_section = {
                'header': header,
                'lines': [line],
                'normalized': normalize_header(header)
            }
        elif current_section is not None:
            # Add line to current section
            current_section['lines'].append(line)
        else:
            # Lines before first section (title, metadata)
            if sections or current_section:
                pass
            else:
                # This is preamble content, create a pseudo-section
                if not sections:
                    sections.append({
                        'header': '__PREAMBLE__',
                        'lines': [line],
                        'normalized': '__PREAMBLE__'
                    })
                else:
                    sections[0]['lines'].append(line)

    # Don't forget the last section
    if current_section is not None:
        sections.append(current_section)

    return sections


def find_duplicates(sections: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Find and remove duplicate sections.
    Returns (unique_sections, removed_sections)
    """
    seen = {}
    unique = []
    removed = []

    for section in sections:
        norm = section['normalized']

        # Always keep preamble
        if norm == '__PREAMBLE__':
            unique.append(section)
            continue

        if norm not in seen:
            seen[norm] = True
            unique.append(section)
        else:
            removed.append(section)

    return unique, removed


def sections_to_content(sections: list[dict]) -> str:
    """Convert sections back to file content."""
    all_lines = []
    for section in sections:
        all_lines.extend(section['lines'])
    return '\n'.join(all_lines)


def read_bookmark(file_path: Path) -> str | None:
    """Read bookmark for the given file from bookmark.json."""
    # Find the bookmark.json in the same directory
    bookmark_path = file_path.parent / 'bookmark.json'

    if not bookmark_path.exists():
        # Try public directory structure
        public_dir = file_path.parents[2] if 'public' in str(file_path) else None
        if public_dir:
            bookmark_path = public_dir / 'bookmark.json'

    if not bookmark_path.exists():
        return None

    try:
        with open(bookmark_path, 'r', encoding='utf-8') as f:
            bookmarks = json.load(f)

        # Get filename without extension
        file_name = file_path.stem

        # Check various key formats
        for key in [file_name, file_path.name, str(file_path)]:
            if key in bookmarks:
                return bookmarks[key]

        return None
    except Exception:
        return None


def check_bookmark_preserved(content: str, bookmark: str | None) -> bool:
    """Check if bookmark text still exists in content."""
    if bookmark is None or bookmark == '':
        return True

    # Normalize for comparison (remove newlines)
    normalized_bookmark = re.sub(r'\s+', '', bookmark)
    normalized_content = re.sub(r'\s+', '', content)

    return normalized_bookmark in normalized_content


def process_file(file_path: Path, dry_run: bool = False) -> dict:
    """
    Process a single file for deduplication.
    Returns stats about what was done.
    """
    stats = {
        'file': str(file_path),
        'original_sections': 0,
        'unique_sections': 0,
        'removed_sections': 0,
        'removed_headers': [],
        'bookmark_preserved': True,
        'backup_created': False,
        'success': False
    }

    if not file_path.exists():
        stats['error'] = 'File not found'
        return stats

    # Read content
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse into sections
    sections = parse_sections(content)
    stats['original_sections'] = len(sections)

    # Find duplicates
    unique, removed = find_duplicates(sections)
    stats['unique_sections'] = len(unique)
    stats['removed_sections'] = len(removed)
    stats['removed_headers'] = [
        s['header'][:80] + '...' if len(s['header']) > 80 else s['header']
        for s in removed
    ]

    # Generate new content
    new_content = sections_to_content(unique)

    # Check bookmark
    bookmark = read_bookmark(file_path)
    stats['bookmark_preserved'] = check_bookmark_preserved(new_content, bookmark)

    if not stats['bookmark_preserved']:
        print(f"  WARNING: Bookmark may be affected!")
        print(f"  Bookmark text: {bookmark[:50]}..." if bookmark else "")

    if dry_run:
        stats['success'] = True
        return stats

    # Create backup
    if stats['removed_sections'] > 0:
        backup_path = file_path.with_suffix(file_path.suffix + '.bak')
        shutil.copy2(file_path, backup_path)
        stats['backup_created'] = True

        # Write new content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    stats['success'] = True
    return stats


def process_batch(directory: Path, dry_run: bool = False) -> list[dict]:
    """Process all rephrase files in a directory."""
    results = []

    # Find all -rephrase-furigana.txt files
    pattern = '*-rephrase-furigana.txt'

    for file_path in directory.rglob(pattern):
        print(f"\nProcessing: {file_path.name}")
        stats = process_file(file_path, dry_run)
        results.append(stats)

        if stats['removed_sections'] > 0:
            print(f"  Found {stats['removed_sections']} duplicates")
            for header in stats['removed_headers'][:3]:
                print(f"    - {header}")
            if len(stats['removed_headers']) > 3:
                print(f"    ... and {len(stats['removed_headers']) - 3} more")
        else:
            print(f"  No duplicates found")

    return results


def main():
    parser = argparse.ArgumentParser(
        description='Remove duplicate sections from rephrase files'
    )
    parser.add_argument(
        'path',
        type=str,
        help='File path or directory (with --batch)'
    )
    parser.add_argument(
        '--batch',
        action='store_true',
        help='Process all rephrase files in directory'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without writing'
    )

    args = parser.parse_args()
    path = Path(args.path)

    if args.dry_run:
        print("DRY RUN MODE - No files will be modified\n")

    if args.batch:
        if not path.is_dir():
            print(f"Error: {path} is not a directory")
            sys.exit(1)

        results = process_batch(path, args.dry_run)

        # Summary
        print("\n" + "=" * 50)
        print("SUMMARY")
        print("=" * 50)
        total_removed = sum(r['removed_sections'] for r in results)
        files_with_dupes = sum(1 for r in results if r['removed_sections'] > 0)
        print(f"Files processed: {len(results)}")
        print(f"Files with duplicates: {files_with_dupes}")
        print(f"Total sections removed: {total_removed}")

        bookmark_issues = [r for r in results if not r['bookmark_preserved']]
        if bookmark_issues:
            print(f"\nWARNING: {len(bookmark_issues)} files may have bookmark issues:")
            for r in bookmark_issues:
                print(f"  - {r['file']}")

    else:
        if not path.is_file():
            print(f"Error: {path} is not a file")
            sys.exit(1)

        print(f"Processing: {path.name}")
        stats = process_file(path, args.dry_run)

        print(f"\nResults:")
        print(f"  Original sections: {stats['original_sections']}")
        print(f"  Unique sections: {stats['unique_sections']}")
        print(f"  Removed duplicates: {stats['removed_sections']}")

        if stats['removed_sections'] > 0:
            print(f"\n  Removed headers:")
            for header in stats['removed_headers']:
                print(f"    - {header}")

            if stats['backup_created']:
                print(f"\n  Backup created: {path}.bak")

        if not stats['bookmark_preserved']:
            print(f"\n  WARNING: Bookmark may be affected!")

        print(f"\n  Success: {stats['success']}")


if __name__ == '__main__':
    main()
