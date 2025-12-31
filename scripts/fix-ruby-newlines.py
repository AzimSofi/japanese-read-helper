#!/usr/bin/env python3
"""
Fix Ruby Newline Issues in Extracted Text

This script fixes the issue where ruby/furigana elements were incorrectly
extracted with newlines, resulting in text like:
    襖
    を開け閉めする

Instead of:
    襖を開け閉めする

Usage:
    python fix-ruby-newlines.py path/to/file.txt
    python fix-ruby-newlines.py path/to/file.txt --dry-run
"""

import argparse
import re
import sys
from pathlib import Path


KANJI_PATTERN = re.compile(r'^[\u4e00-\u9faf\u3400-\u4dbf]{1,3}$')
KANJI_START = re.compile(r'^[\u4e00-\u9faf\u3400-\u4dbf]')
KANJI_END = re.compile(r'[\u4e00-\u9faf\u3400-\u4dbf]$')
HIRAGANA_START = re.compile(r'^[\u3040-\u309F]')
KATAKANA_START = re.compile(r'^[\u30A0-\u30FF]')


def should_merge_with_next(current_line: str, next_line: str) -> bool:
    """Check if current line should be merged with next line."""
    current = current_line.strip()
    next_l = next_line.strip()

    if not current or not next_l:
        return False

    punctuation = ('。', '、', '」', '』', '）', ')', '！', '？', '…', '―')

    if KANJI_PATTERN.match(current):
        if HIRAGANA_START.match(next_l) or KANJI_PATTERN.match(next_l):
            return True

    if KANJI_PATTERN.match(next_l) and not current.endswith(punctuation):
        if not next_l.startswith(('<', '>', '＜', '＞')):
            return True

    if KANJI_END.search(current) and HIRAGANA_START.match(next_l):
        if not next_l.startswith(('<', '>', '＜', '＞', '>>')):
            return True

    sentence_end = ('。', '」', '』', '）', ')', '！', '？')
    if not current.endswith(sentence_end) and KANJI_PATTERN.match(next_l):
        if not next_l.startswith(('<', '>', '＜', '＞')):
            return True

    if current.endswith('、') and KANJI_START.match(next_l):
        if not next_l.startswith(('<', '>', '＜', '＞')):
            return True

    return False


def should_merge_with_prev(prev_line: str, current_line: str) -> bool:
    """Check if current line should be merged with previous line."""
    prev = prev_line.strip()
    current = current_line.strip()

    if not prev or not current:
        return False

    punctuation = ('。', '、', '」', '』', '）', ')', '！', '？', '…', '―')

    if KANJI_PATTERN.match(current):
        if prev and not prev.endswith(punctuation):
            if not current.startswith(('<', '>', '＜', '＞')):
                return True

    return False


def fix_ruby_newlines(content: str) -> str:
    """Fix ruby-related newline issues in text content."""
    lines = content.split('\n')

    max_passes = 5
    for _ in range(max_passes):
        result = []
        i = 0
        changed = False

        while i < len(lines):
            current_line = lines[i]

            if i > 0 and result and should_merge_with_prev(result[-1], current_line):
                result[-1] = result[-1] + current_line.strip()
                i += 1
                changed = True
                continue

            while i + 1 < len(lines) and should_merge_with_next(current_line, lines[i + 1]):
                current_line = current_line.rstrip() + lines[i + 1].strip()
                i += 1
                changed = True

            result.append(current_line)
            i += 1

        lines = result
        if not changed:
            break

    return '\n'.join(lines)


def process_file(file_path: Path, dry_run: bool = False) -> bool:
    """Process a single file and fix ruby newlines."""
    print(f"Processing: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
    except Exception as e:
        print(f"  Error reading file: {e}")
        return False

    fixed_content = fix_ruby_newlines(original_content)

    if original_content == fixed_content:
        print("  No changes needed")
        return True

    original_lines = len(original_content.split('\n'))
    fixed_lines = len(fixed_content.split('\n'))
    diff = original_lines - fixed_lines

    print(f"  Lines: {original_lines} -> {fixed_lines} ({diff} merged)")

    if dry_run:
        print("  [DRY RUN] Would write changes")

        sample_diffs = []
        orig_lines = original_content.split('\n')
        fix_lines = fixed_content.split('\n')
        for i, (orig, fix) in enumerate(zip(orig_lines[:50], fix_lines[:50])):
            if orig != fix:
                sample_diffs.append(f"    Line {i+1}:")
                sample_diffs.append(f"      Before: {orig[:80]}")
                sample_diffs.append(f"      After:  {fix[:80]}")
            if len(sample_diffs) >= 15:
                break
        if sample_diffs:
            print("  Sample changes:")
            print('\n'.join(sample_diffs))
    else:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print("  Changes written successfully")
        except Exception as e:
            print(f"  Error writing file: {e}")
            return False

    return True


def main():
    parser = argparse.ArgumentParser(
        description='Fix ruby newline issues in extracted text files'
    )
    parser.add_argument('files', nargs='+', help='Text files to process')
    parser.add_argument('--dry-run', '-n', action='store_true',
                        help='Show what would be changed without writing')
    args = parser.parse_args()

    success_count = 0
    for file_arg in args.files:
        file_path = Path(file_arg)
        if file_path.is_file():
            if process_file(file_path, args.dry_run):
                success_count += 1
        elif file_path.is_dir():
            for txt_file in file_path.rglob('*.txt'):
                if process_file(txt_file, args.dry_run):
                    success_count += 1
        else:
            print(f"Warning: {file_arg} not found")

    print(f"\nProcessed {success_count} file(s)")


if __name__ == '__main__':
    main()
