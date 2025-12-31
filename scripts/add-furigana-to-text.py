#!/usr/bin/env python3
"""
Add Furigana to Text Files

Adds furigana (ruby tags) to Japanese text in any text file.
Works with both plain text and rephrase format (< original >> rephrased).

Usage:
    python add-furigana-to-text.py input.txt
    python add-furigana-to-text.py input.txt --output output.txt
    python add-furigana-to-text.py input.txt --filter n3
"""

import argparse
import re
import sys
from pathlib import Path

try:
    from furigana_helper import FuriganaGenerator
except ImportError:
    print("Error: Could not find furigana_helper.py")
    print("Make sure you're running from the project root or scripts directory.")
    sys.exit(1)


def add_furigana_to_line(line, generator, filter_n3_plus=False):
    """Add furigana to a single line of text."""
    if not line.strip():
        return line

    # Skip lines that already have ruby tags
    if '<ruby>' in line:
        return line

    # Process the text
    return generator.add_furigana(line, filter_n3_plus=filter_n3_plus)


def process_rephrase_format(content, generator, filter_n3_plus=False):
    """
    Process text in rephrase format, adding furigana to both
    original text (< lines) and rephrased text (>> lines).
    """
    lines = content.split('\n')
    result_lines = []

    for line in lines:
        stripped = line.strip()

        # Skip empty lines
        if not stripped:
            result_lines.append(line)
            continue

        # Handle heading lines (< prefix)
        if stripped.startswith('<') and not stripped.startswith('<ruby>'):
            # Extract the prefix and content
            prefix_match = re.match(r'^([<＜]\s*)', stripped)
            if prefix_match:
                prefix = prefix_match.group(1)
                content_text = stripped[len(prefix):]
                furigana_text = add_furigana_to_line(content_text, generator, filter_n3_plus)
                result_lines.append(prefix + furigana_text)
            else:
                result_lines.append(line)

        # Handle subitem lines (>> prefix)
        elif stripped.startswith('>>'):
            prefix_match = re.match(r'^(>>\s*)', stripped)
            if prefix_match:
                prefix = prefix_match.group(1)
                content_text = stripped[len(prefix):]
                furigana_text = add_furigana_to_line(content_text, generator, filter_n3_plus)
                result_lines.append(prefix + furigana_text)
            else:
                result_lines.append(line)

        # Regular line - add furigana
        else:
            furigana_text = add_furigana_to_line(stripped, generator, filter_n3_plus)
            result_lines.append(furigana_text)

    return '\n'.join(result_lines)


def process_plain_text(content, generator, filter_n3_plus=False):
    """Process plain text, adding furigana to each line."""
    lines = content.split('\n')
    result_lines = []

    for line in lines:
        if not line.strip():
            result_lines.append(line)
            continue

        furigana_text = add_furigana_to_line(line, generator, filter_n3_plus)
        result_lines.append(furigana_text)

    return '\n'.join(result_lines)


def detect_format(content):
    """Detect if content is in rephrase format."""
    has_heading = bool(re.search(r'^[<＜](?!ruby>)', content, re.MULTILINE))
    has_subitem = '>>' in content
    return has_heading and has_subitem


def process_file(input_path, output_path=None, filter_n3_plus=False, preserve_long_vowel=False):
    """Add furigana to a text file."""
    input_path = Path(input_path)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}")
        sys.exit(1)

    print(f"Processing: {input_path}")
    print(f"Filter mode: {'N3+ only' if filter_n3_plus else 'All kanji'}")
    print(f"Hiragana style: {'Long vowel (ー)' if preserve_long_vowel else 'Full hiragana'}")

    # Read input file
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Detect format
    is_rephrase = detect_format(content)
    print(f"Format detected: {'Rephrase' if is_rephrase else 'Plain text'}")

    # Initialize furigana generator
    print("Initializing MeCab...")
    try:
        generator = FuriganaGenerator(preserve_long_vowel=preserve_long_vowel)
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    # Process content
    print("Adding furigana...")
    if is_rephrase:
        result = process_rephrase_format(content, generator, filter_n3_plus)
    else:
        result = process_plain_text(content, generator, filter_n3_plus)

    # Determine output path
    if output_path is None:
        # Add -furigana suffix before extension
        stem = input_path.stem
        if stem.endswith('-rephrase'):
            # Replace -rephrase with -rephrase-furigana
            new_stem = stem + '-furigana'
        else:
            new_stem = stem + '-furigana'
        output_path = input_path.parent / f"{new_stem}{input_path.suffix}"
    else:
        output_path = Path(output_path)

    # Save output
    print(f"Saving to: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(result)

    # Stats
    input_size = input_path.stat().st_size / 1024
    output_size = output_path.stat().st_size / 1024

    print(f"\n{'='*60}")
    print(f"Done! Furigana added")
    print(f"{'='*60}")
    print(f"Input: {input_path} ({input_size:.1f} KB)")
    print(f"Output: {output_path} ({output_size:.1f} KB)")
    print(f"Size increase: {((output_size/input_size)-1)*100:.1f}%")
    print(f"{'='*60}")

    return output_path


def main():
    parser = argparse.ArgumentParser(description='Add furigana to text files')
    parser.add_argument('input_file', help='Input text file')
    parser.add_argument('--output', '-o', help='Output file path (default: input-furigana.txt)')
    parser.add_argument('--filter', choices=['n3', 'none'], default='none',
                        help='Furigana filter mode (default: none)')
    parser.add_argument('--hiragana-style', choices=['full', 'long-vowel'], default='full',
                        help='Hiragana style (default: full)')
    args = parser.parse_args()

    filter_n3_plus = (args.filter == 'n3')
    preserve_long_vowel = (args.hiragana_style == 'long-vowel')

    process_file(
        args.input_file,
        args.output,
        filter_n3_plus=filter_n3_plus,
        preserve_long_vowel=preserve_long_vowel
    )


if __name__ == '__main__':
    main()
