#!/usr/bin/env python3
"""
Smart Ruby Extraction from EPUB (v2 Optimized)

Extracts vocabulary (words) from EPUB ruby annotations using linguistically-aware heuristics.
Improvements:
- Cleaned Okurigana list for better verb/adjective detection
- Fixed "Volitional Form" bug (e.g., 行こう vs 行こ)
- Added cleanup for full-width spaces

Usage:
    python extract-ruby-smart.py
"""

import json
import re
import sys
from pathlib import Path
from dataclasses import dataclass

try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup, NavigableString
    import warnings
    from bs4 import XMLParsedAsHTMLWarning
    warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
except ImportError as e:
    print(f"Error: Missing dependencies: {e}")
    print("Run: pip install ebooklib beautifulsoup4 lxml")
    sys.exit(1)


KANJI_PATTERN = re.compile(r'[\u4e00-\u9faf\u3400-\u4dbf]')
HIRAGANA_PATTERN = re.compile(r'^[\u3040-\u309F\u30FC]+')
REPETITION_MARK = '々'

# Particles to exclude (single and multi-char)
PARTICLES = {
    'は', 'が', 'を', 'に', 'で', 'と', 'も', 'の', 'へ', 'や',
    'か', 'ね', 'よ', 'わ', 'ば', 'ら', 'ぜ', 'ぞ', 'さ',
    'より', 'から', 'など', 'まで', 'だけ', 'ほど', 'くらい', 'ばかり'
}

# Optimized Okurigana Dictionary
VALID_OKURIGANA = {
    # --- Adjectives (i-adj, na-adj endings) ---
    'しい', 'かい', 'がい', 'さい', 'ない', 'らい', 'ゆい', 'くい', 'ぐい',
    'き', 'け',  # Classical/Literary
    'さ', 'み', 'げ',  # Noun-ifiers

    # --- Verbs (Common Conjugations) ---
    # Dictionary forms (u-verbs)
    'る', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'う',
    # Te-forms / Ta-forms
    'った', 'って', 'んだ', 'んで', 'いた', 'いて', 'いだ', 'いで',
    'した', 'して', 'きた', 'きて',
    # Masu stem / Volitional / Potential
    'ます', 'ません', 'ました', 'ましょう',
    'れる', 'られる', 'せる', 'させる',  # Passive/Causative
    'ない', 'なかった', 'なく', 'ず',  # Negative
    'たい', 'たく',  # Desire
    'こう', 'そう', 'よう', 'まい',  # Volitional / Conjectural

    # --- Ichidan / Godan specific tails ---
    'える', 'ける', 'せる', 'てる', 'ねる', 'べる', 'める', 'れる', 'げる', 'でる',
    'いる', 'きる', 'じる', 'ちる', 'にる', 'ひる', 'びる', 'みる', 'りる',
    'わる', 'ある', 'うる', 'おる',

    # --- Single Char Fallbacks (common verb/adj endings) ---
    'い', 'き', 'し', 'ち', 'り', 'え', 'れ',
    'め', 'た', 'て', 'だ', 'で', 'せ', 'べ', 'け', 'げ', 'ね',
    'み', 'ひ', 'び', 'ぎ', 'じ', 'ぴ', 'ぢ',
    'る', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'う'  # Dictionary form endings
}


@dataclass
class WordEntry:
    word: str
    reading: str
    source: str = 'epub'
    note: str = ''


def is_all_kanji(text: str) -> bool:
    """Check if text is entirely kanji/repetition marks."""
    if not text:
        return False
    return all(KANJI_PATTERN.match(c) or c == REPETITION_MARK for c in text)


def extract_ruby_base(ruby_tag) -> tuple[str, str]:
    """Extract base text and reading from a ruby tag."""
    if not ruby_tag or not ruby_tag.name == 'ruby':
        return '', ''

    rt = ruby_tag.find('rt')
    if not rt:
        return '', ''

    reading = rt.get_text().strip()

    for rp in ruby_tag.find_all('rp'):
        rp.decompose()

    rt_copy = rt.extract()
    base = ruby_tag.get_text().strip()
    ruby_tag.append(rt_copy)

    return base, reading


def get_next_sibling_ruby(element):
    """Get the next sibling if it's a ruby tag, ignoring whitespace."""
    sibling = element.next_sibling
    while sibling:
        if isinstance(sibling, NavigableString):
            if not sibling.strip():
                sibling = sibling.next_sibling
                continue
            return None
        elif sibling.name == 'ruby':
            return sibling
        else:
            return None
    return None


def get_trailing_text(element) -> str:
    """Get text immediately following an element."""
    sibling = element.next_sibling
    if isinstance(sibling, NavigableString):
        return str(sibling)
    return ''


def extract_words_from_html(html_content: str) -> dict[str, WordEntry]:
    soup = BeautifulSoup(html_content, 'lxml')
    words = {}
    processed_rubies = set()

    rubies = soup.find_all('ruby')

    for ruby in rubies:
        if id(ruby) in processed_rubies:
            continue

        base, reading = extract_ruby_base(ruby)
        if not base or not reading:
            continue

        # Skip entries starting with repetition mark
        if base.startswith(REPETITION_MARK):
            continue

        processed_rubies.add(id(ruby))

        # --- HEURISTIC 1: COMPOUND NOUN MERGE ---
        current_ruby = ruby
        while True:
            next_ruby = get_next_sibling_ruby(current_ruby)
            if not next_ruby:
                break

            next_base, next_reading = extract_ruby_base(next_ruby)

            if is_all_kanji(base) and is_all_kanji(next_base):
                base += next_base
                reading += next_reading
                processed_rubies.add(id(next_ruby))
                current_ruby = next_ruby
            else:
                break

        # --- HEURISTIC 2: OKURIGANA CAPTURE ---
        trailing = get_trailing_text(current_ruby)
        match = HIRAGANA_PATTERN.match(trailing)

        if match:
            okurigana = match.group(0)
            candidate = okurigana[:4]

            found_suffix = ""

            # Try 4, then 3, then 2 chars (longest match first)
            for i in range(min(len(candidate), 4), 1, -1):
                sub = candidate[:i]
                if sub in VALID_OKURIGANA:
                    found_suffix = sub
                    break

            # Fallback: 1 char check
            if not found_suffix and len(candidate) >= 1:
                char = candidate[0]
                if char in VALID_OKURIGANA and char not in PARTICLES:
                    found_suffix = char
                # Special Case: 'う' for volitional (行こう)
                elif char == 'う' and base and base[-1] in ['こ', 'そ', 'よ', 'ろ']:
                    found_suffix = char

            if found_suffix:
                base += found_suffix
                reading += found_suffix

        if base != reading:
            if base not in words:
                words[base] = WordEntry(word=base, reading=reading)

    return words


def find_book_directory(epub_path: Path, public_dir: Path) -> Path | None:
    """Intelligent folder matching with fuzzy comparison."""
    clean_name = epub_path.stem.strip()

    for v_dir in ['bookv3-rephrase', 'bookv2-furigana', 'bookv1-rephrase']:
        base = public_dir / v_dir
        if not base.exists():
            continue

        for d in base.iterdir():
            if not d.is_dir():
                continue
            folder_norm = d.name.replace(' ', '')
            file_norm = clean_name.replace(' ', '')

            if folder_norm in file_norm or file_norm in folder_norm:
                return d
    return None


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    public_dir = project_root / 'public'

    # Check for dated subdirectory first, then fall back to temp/
    temp_base = project_root / 'temp'
    dated_dir = temp_base / '2025-01-02'

    if dated_dir.exists():
        temp_dir = dated_dir
        print(f"Using dated directory: {temp_dir}")
    elif temp_base.exists():
        temp_dir = temp_base
    else:
        print(f"Error: temp directory not found at {temp_base}")
        sys.exit(1)

    epub_files = list(temp_dir.glob('*.epub'))
    print(f"Found {len(epub_files)} EPUB files")
    print("Using Smart Extraction: Kanji-Merge + Semantic Okurigana\n")

    total_books_updated = 0

    for epub_path in epub_files:
        print(f"Processing: {epub_path.name}")
        try:
            book = epub.read_epub(str(epub_path))
            all_words = {}

            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    html = item.get_content().decode('utf-8')
                    chapter_words = extract_words_from_html(html)
                    all_words.update(chapter_words)

            print(f"  -> Extracted {len(all_words)} unique vocabulary entries")

            book_dir = find_book_directory(epub_path, public_dir)
            if book_dir:
                registry_path = book_dir / 'ruby-registry.json'

                registry = {
                    'bookTitle': book_dir.name,
                    'entries': []
                }

                for w in sorted(all_words.keys()):
                    entry = all_words[w]
                    registry['entries'].append({
                        'kanji': entry.word,
                        'reading': entry.reading,
                        'source': 'epub_smart',
                        'note': ''
                    })

                with open(registry_path, 'w', encoding='utf-8') as f:
                    json.dump(registry, f, ensure_ascii=False, indent=2)

                print(f"  -> Registry updated: {registry_path}")
                total_books_updated += 1
            else:
                print(f"  [!] Skipped: Could not find matching directory in public/")

        except Exception as e:
            print(f"  [!] Error processing {epub_path.name}: {e}")

    print(f"\nCompleted. Updated {total_books_updated} books.")


if __name__ == '__main__':
    main()
