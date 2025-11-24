#!/usr/bin/env python3
"""
Helper module for adding furigana to Japanese text.
Provides N4 kanji filtering and MeCab-based furigana generation.
"""

import re
import MeCab

# Common N4 and lower kanji (these should NOT get furigana when filtering is enabled)
N4_AND_LOWER_KANJI = set([
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万',
    '日', '月', '火', '水', '木', '金', '土', '年', '今', '毎', '先', '来', '何', '時', '分', '半',
    '人', '男', '女', '子', '学', '生', '先', '友', '私', '父', '母', '兄', '姉', '弟', '妹', '家', '族',
    '本', '名', '前', '国', '語', '文', '字', '会', '社', '話', '読', '書', '見', '聞', '言', '食', '飲',
    '行', '来', '帰', '入', '出', '会', '休', '立', '座', '歩', '走', '作', '使', '働', '買', '売',
    '大', '小', '多', '少', '高', '安', '低', '長', '短', '新', '古', '若', '明', '暗', '白', '黒',
    '赤', '青', '色', '好', '悪', '元', '気', '有', '無', '便', '利', '不', '正', '間', '違',
    '右', '左', '上', '下', '中', '外', '内', '前', '後', '東', '西', '南', '北', '近', '遠',
    '山', '川', '田', '町', '村', '市', '駅', '校', '店', '車', '道', '門', '室', '開', '閉',
    '天', '雨', '雪', '花', '草', '木', '林', '森', '犬', '猫', '魚', '鳥', '肉', '米', '茶',
    '朝', '昼', '夜', '晩', '午', '早', '遅', '週', '円', '度', '回', '番', '方', '力', '勉', '強',
    '思', '知', '考', '教', '習', '問', '答', '分', '理', '解', '同', '意', '味', '物', '品', '者',
    '手', '足', '目', '耳', '口', '体', '頭', '顔', '心', '声', '電', '話', '写', '真', '切', '持',
    '貸', '借', '送', '返', '起', '寝', '着', '脱', '洗', '待', '取', '付', '始', '終', '住', '度'
])


def is_kanji(char):
    """Check if a character is a kanji."""
    code = ord(char)
    return (0x4E00 <= code <= 0x9FFF) or (0x3400 <= code <= 0x4DBF)


def is_n3_plus_kanji(char):
    """Check if a character is N3+ kanji (advanced/rare kanji)."""
    return is_kanji(char) and char not in N4_AND_LOWER_KANJI


def has_any_n3_plus_kanji(text):
    """Check if text contains any N3+ kanji."""
    return any(is_n3_plus_kanji(char) for char in text)


class FuriganaGenerator:
    """Generate furigana using MeCab morphological analyzer."""

    def __init__(self, name_dictionary=None, preserve_long_vowel=False):
        """
        Initialize MeCab with unidic-lite.

        Args:
            name_dictionary: Optional dict mapping kanji to readings {"神崎": "かんざき"}
                           Used to preserve author's chosen readings for names/terms
            preserve_long_vowel: If True, keep ー in hiragana output. If False (default),
                               convert to proper vowels (しょー → しょう)
        """
        try:
            self.tagger = MeCab.Tagger()
        except Exception as e:
            raise RuntimeError(
                f"Failed to initialize MeCab: {e}\n"
                "Please ensure MeCab and unidic-lite are installed:\n"
                "  pip install mecab-python3 unidic-lite"
            )

        # Store name dictionary for consistent readings
        self.name_dictionary = name_dictionary if name_dictionary else {}

        # Store long vowel preference
        self.preserve_long_vowel = preserve_long_vowel

    def add_furigana(self, text, filter_n3_plus=False):
        """
        Add furigana (ruby tags) to Japanese text.

        Args:
            text: Japanese text to process
            filter_n3_plus: If True, only add furigana to N3+ kanji

        Returns:
            Text with <ruby> tags added
        """
        if not text or not text.strip():
            return text

        # Parse text with MeCab
        result = []
        parsed = self.tagger.parse(text)

        for line in parsed.split('\n'):
            if line == 'EOS' or not line:
                continue

            parts = line.split('\t')
            if len(parts) < 2:
                continue

            surface = parts[0]  # The actual text (表層形)

            # Check if this word contains kanji
            has_kanji = any(is_kanji(char) for char in surface)

            # Check name dictionary FIRST (priority over MeCab)
            if surface in self.name_dictionary and has_kanji:
                # Use dictionary reading (author's chosen reading for names/terms)
                hiragana_reading = self.name_dictionary[surface]

                # Apply filter if requested
                if filter_n3_plus:
                    if has_any_n3_plus_kanji(surface):
                        result.append(f'<ruby>{surface}<rt>{hiragana_reading}</rt></ruby>')
                    else:
                        result.append(surface)
                else:
                    # Add furigana from dictionary
                    result.append(f'<ruby>{surface}<rt>{hiragana_reading}</rt></ruby>')

            # Otherwise, use MeCab reading
            elif len(parts) >= 2 and parts[1]:
                reading = parts[1]  # Reading in katakana from MeCab

                # Convert katakana reading to hiragana
                hiragana_reading = self._katakana_to_hiragana(reading, self.preserve_long_vowel)

                if has_kanji:
                    # Apply filter if requested
                    if filter_n3_plus:
                        # Only add furigana if word contains N3+ kanji
                        if has_any_n3_plus_kanji(surface):
                            result.append(f'<ruby>{surface}<rt>{hiragana_reading}</rt></ruby>')
                        else:
                            result.append(surface)
                    else:
                        # Add furigana to all kanji words
                        result.append(f'<ruby>{surface}<rt>{hiragana_reading}</rt></ruby>')
                else:
                    # No kanji, just add as-is
                    result.append(surface)
            else:
                # No reading available, add as-is
                result.append(surface)

        return ''.join(result)

    @staticmethod
    def _katakana_to_hiragana(text, preserve_long_vowel=False):
        """
        Convert katakana to hiragana with proper long vowel mark handling.

        Args:
            text: Katakana text to convert
            preserve_long_vowel: If True, keep ー as-is. If False, convert to proper vowel.

        Returns:
            Hiragana text with proper long vowels (e.g., しょう instead of しょー)
        """
        result = []
        for i, char in enumerate(text):
            code = ord(char)

            # Handle long vowel mark ー (chōonpu)
            if char == 'ー':
                if preserve_long_vowel:
                    result.append('ー')
                elif i > 0 and result:
                    # Convert to appropriate vowel based on previous character
                    prev_char = result[-1]
                    vowel = FuriganaGenerator._get_vowel_for_long_mark(prev_char)
                    result.append(vowel)
                else:
                    # No previous character, keep as-is
                    result.append('ー')

            # Convert katakana to hiragana (standard conversion)
            elif 0x30A1 <= code <= 0x30F6:  # Full-width katakana
                result.append(chr(code - 0x60))
            else:
                result.append(char)

        return ''.join(result)

    @staticmethod
    def _get_vowel_for_long_mark(prev_char):
        """
        Determine which vowel to use for a long vowel mark based on the previous character.

        Japanese vowel rows:
        - a-row (あ段): あかさたなはまやらわ → add あ
        - i-row (い段): いきしちにひみ　り　 → add い
        - u-row (う段): うくすつぬふむゆる　 → add う
        - e-row (え段): えけせてねへめ　れ　 → add い
        - o-row (お段): おこそとのほもよろを → add う
        """
        code = ord(prev_char)

        # Hiragana a-row (あ段): 0x3042, 0x304B, 0x3055, 0x305F, 0x306A, 0x306F, 0x307E, 0x3084, 0x3089, 0x308F
        if prev_char in 'あかがさざただなはばぱまやらわ':
            return 'あ'

        # Hiragana i-row (い段): 0x3044, 0x304D, 0x3057, 0x3061, 0x306B, 0x3072, 0x307F, 0x308A
        elif prev_char in 'いきぎしじちぢにひびぴみり':
            return 'い'

        # Hiragana u-row (う段): 0x3046, 0x304F, 0x3059, 0x3064, 0x306C, 0x3075, 0x3080, 0x3086, 0x308B
        elif prev_char in 'うくぐすずつづぬふぶぷむゆる':
            return 'う'

        # Hiragana e-row (え段): 0x3048, 0x3051, 0x305B, 0x3066, 0x306D, 0x3078, 0x3081, 0x308C
        elif prev_char in 'えけげせぜてでねへべぺめれ':
            return 'い'  # e-row long vowels typically become い

        # Hiragana o-row (お段): 0x304A, 0x3053, 0x305D, 0x3068, 0x306E, 0x307B, 0x3082, 0x3088, 0x308D, 0x3092
        elif prev_char in 'おこごそぞとどのほぼぽもよろを':
            return 'う'

        # Small kana (ゃ, ゅ, ょ, etc.) - use the main vowel sound
        elif prev_char in 'ゃゅょ':
            # ya, yu, yo → use u-row vowel
            return 'う'

        elif prev_char in 'ぁぃぅぇぉ':
            # Small vowels - use the same vowel
            return {'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'い', 'ぉ': 'う'}[prev_char]

        # Default: use う (most common for long vowels)
        else:
            return 'う'


def preserve_existing_ruby(html_content, generator, filter_n3_plus=False):
    """
    Process HTML content, adding furigana only to text that doesn't already have it.

    Args:
        html_content: HTML string with potential existing <ruby> tags
        generator: FuriganaGenerator instance
        filter_n3_plus: If True, only add furigana to N3+ kanji

    Returns:
        Plain text with ruby tags (no other HTML)
    """
    from bs4 import BeautifulSoup, NavigableString, Tag
    import re

    # Use html.parser to avoid adding html/body wrappers
    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove non-content elements (but handle images specially)
    for element in soup.find_all(['nav', 'script', 'style', 'meta', 'link']):
        element.decompose()

    # Replace <img> tags with placeholders before processing
    image_counter = 0
    for img_tag in soup.find_all('img'):
        image_counter += 1
        # Get image source if available
        img_src = img_tag.get('src', '')
        # Extract filename from path
        img_filename = img_src.split('/')[-1] if img_src else f'image-{image_counter}'
        # Create placeholder text
        placeholder = f'\n[IMAGE:{img_filename}]\n'
        # Replace img tag with placeholder text
        img_tag.replace_with(placeholder)

    # Extract text with ruby tags preserved
    def extract_text_with_ruby(element):
        """Recursively extract text, preserving ruby tags and adding furigana to plain text."""
        result = []

        for child in element.children:
            if isinstance(child, NavigableString):
                # This is plain text - add furigana if it contains kanji
                text = str(child).strip()
                if text:
                    # Add furigana to this text
                    with_furigana = generator.add_furigana(text, filter_n3_plus)
                    result.append(with_furigana)
            elif isinstance(child, Tag):
                if child.name == 'ruby':
                    # Preserve existing ruby tag as-is
                    result.append(str(child))
                elif child.name == 'rt':
                    # Skip rt tags (they're inside ruby tags)
                    continue
                elif child.name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    # Process content of paragraph/div elements
                    content = extract_text_with_ruby(child)
                    if content.strip():
                        # Add paragraph breaks for block elements
                        if child.name in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                            result.append('\n' + content + '\n')
                        else:
                            result.append(content)
                elif child.name == 'br':
                    result.append('\n')
                else:
                    # For other tags, just extract their text content
                    content = extract_text_with_ruby(child)
                    if content.strip():
                        result.append(content)

        return ''.join(result)

    # Extract text from the parsed HTML
    text = extract_text_with_ruby(soup)

    # Clean up excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def clean_existing_ruby_tags(text):
    """
    Remove all existing ruby tags from text, keeping only the base kanji.

    Args:
        text: Text with potential <ruby> tags

    Returns:
        Text with ruby tags removed
    """
    cleaned = text

    # Keep removing ruby tags until there are none left (handles nested tags)
    prev_length = -1
    while len(cleaned) != prev_length:
        prev_length = len(cleaned)
        # Match innermost ruby tags first
        cleaned = re.sub(r'<ruby>([^<>]*?)<rt>.*?</rt></ruby>', r'\1', cleaned)

    # Also remove any <rp> tags (ruby parentheses fallback)
    cleaned = re.sub(r'<rp>.*?</rp>', '', cleaned)

    return cleaned


def extract_ruby_dictionary(html_content):
    """
    Extract all ruby tags from HTML to build a name/term dictionary.

    This is used for the two-pass approach: first extract all ruby tags
    that the EPUB author provided (character names, special terms), then
    use those readings consistently throughout the book.

    Args:
        html_content: HTML string with ruby tags

    Returns:
        Dictionary mapping base text to readings: {"神崎": "かんざき", ...}
    """
    from bs4 import BeautifulSoup
    from collections import Counter

    soup = BeautifulSoup(html_content, 'html.parser')
    ruby_dict = {}
    frequency = Counter()  # Track how often each reading appears

    # Find all ruby tags
    for ruby_tag in soup.find_all('ruby'):
        # Get the base text (the kanji/word)
        rt_tag = ruby_tag.find('rt')
        if not rt_tag:
            continue

        # Extract base text (everything except <rt> tag)
        base_text = ''.join(ruby_tag.find_all(text=True, recursive=False))
        reading = rt_tag.get_text()

        if base_text and reading:
            # Track frequency
            key = (base_text, reading)
            frequency[key] += 1

            # Store in dictionary (will overwrite if multiple readings exist)
            # We'll use the most frequent one later
            ruby_dict[base_text] = reading

    # If same base text has multiple readings, use most frequent
    # (This handles cases where a word might have different readings in different contexts)
    final_dict = {}
    base_texts = set(base for base, _ in frequency.keys())

    for base_text in base_texts:
        # Find all readings for this base text
        readings_for_base = [(reading, count) for (b, reading), count in frequency.items() if b == base_text]

        if readings_for_base:
            # Use the most frequent reading
            most_frequent_reading = max(readings_for_base, key=lambda x: x[1])[0]
            final_dict[base_text] = most_frequent_reading

    return final_dict
