#!/usr/bin/env python3
"""
EPUB to Text with Furigana Converter

Converts EPUB files to plain text while:
1. Preserving existing furigana (ruby tags) from the EPUB
2. Adding furigana to remaining kanji without it
3. Optional N3+ kanji filtering

Usage:
    python epub-to-text-furigana.py book.epub
    python epub-to-text-furigana.py book.epub --filter n3
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
import urllib.request
import urllib.error

try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Error: Missing required dependencies: {e}")
    print("\nPlease install dependencies:")
    print("  pip install -r scripts/requirements.txt")
    print("\nOr install individually:")
    print("  pip install ebooklib beautifulsoup4 lxml mecab-python3 unidic-lite")
    sys.exit(1)

# Import local helper module
try:
    from furigana_helper import FuriganaGenerator, preserve_existing_ruby
except ImportError:
    print("Error: Could not find furigana_helper.py")
    print("Make sure you're running this script from the project root or scripts directory.")
    sys.exit(1)


def sanitize_filename(title):
    """Convert book title to safe filename."""
    # Remove or replace invalid filename characters
    safe = re.sub(r'[<>:"/\\|?*]', '', title)
    # Replace multiple spaces with single space
    safe = re.sub(r'\s+', ' ', safe)
    # Trim and limit length
    safe = safe.strip()[:200]
    return safe if safe else 'untitled'


def extract_images_from_epub(book, output_dir, safe_title):
    """
    Extract all images from EPUB and save them to the output directory.

    Args:
        book: EPUB book object
        output_dir: Directory to save images
        safe_title: Sanitized book title for creating subdirectory

    Returns:
        List of dicts with image metadata: [
            {'fileName': 'illustration-001.jpg', 'imagePath': '/public/...', 'orderIndex': 0, ...}
        ]
    """
    images_dir = output_dir / safe_title / 'images'
    images_dir.mkdir(parents=True, exist_ok=True)

    image_metadata = []
    image_counter = 0
    failed_images = []

    # Count total images first for validation
    all_images = [item for item in book.get_items() if item.get_type() == ebooklib.ITEM_IMAGE]
    total_images = len(all_images)
    print(f"  Found {total_images} images via ITEM_IMAGE filter")

    # Check for cover image specifically
    # Method 1: Look for 'cover' in filename among ITEM_IMAGE items
    cover_image = None
    for item in all_images:
        original_name = item.get_name()
        if 'cover' in original_name.lower():
            cover_image = item
            print(f"  📕 Detected cover image in ITEM_IMAGE: {original_name}")
            break

    # Method 2: If not found, check all items (including non-ITEM_IMAGE)
    if not cover_image:
        print(f"  🔍 Cover not in ITEM_IMAGE list, checking all items...")
        for item in book.get_items():
            original_name = item.get_name()
            if 'cover' in original_name.lower() and (original_name.endswith('.jpg') or
                                                       original_name.endswith('.jpeg') or
                                                       original_name.endswith('.png')):
                cover_image = item
                total_images += 1  # Add to count since it wasn't in ITEM_IMAGE
                print(f"  📕 Detected cover image in all items: {original_name}")
                break

    # Extract cover first with index 000 if found
    if cover_image:
        original_name = cover_image.get_name()
        ext = Path(original_name).suffix or '.jpg'
        new_filename = f"illustration-000{ext}"
        image_path = images_dir / new_filename

        print(f"  Processing: {original_name} → {new_filename}")
        try:
            with open(image_path, 'wb') as img_file:
                img_file.write(cover_image.get_content())

            image_metadata.append({
                'fileName': new_filename,
                'imagePath': str(image_path),
                'orderIndex': -1,
                'originalName': original_name,
                'altText': None
            })
            print(f"  ✓ Extracted: {new_filename}")
        except Exception as e:
            print(f"  ✗ ERROR saving cover image {original_name}:")
            print(f"     Exception: {type(e).__name__}: {e}")
            failed_images.append(original_name)

    # Extract remaining images
    for item in all_images:
        if cover_image and item == cover_image:
            continue  # Skip cover, already processed

        original_name = item.get_name()
        ext = Path(original_name).suffix or '.jpg'

        image_counter += 1
        new_filename = f"illustration-{image_counter:03d}{ext}"
        image_path = images_dir / new_filename

        print(f"  Processing: {original_name} → {new_filename}")
        try:
            with open(image_path, 'wb') as img_file:
                img_file.write(item.get_content())

            image_metadata.append({
                'fileName': new_filename,
                'imagePath': str(image_path),
                'orderIndex': image_counter - 1,
                'originalName': original_name,
                'altText': None
            })
            print(f"  ✓ Extracted: {new_filename}")
        except Exception as e:
            print(f"  ✗ ERROR saving image {original_name}:")
            print(f"     Exception: {type(e).__name__}: {e}")
            failed_images.append(original_name)

    # Validation
    print(f"\n  Summary:")
    print(f"    Total images in EPUB: {total_images}")
    print(f"    Successfully extracted: {len(image_metadata)}")
    if failed_images:
        print(f"    ⚠️  Failed to extract: {len(failed_images)}")
        for img in failed_images:
            print(f"       - {img}")
    if len(image_metadata) < total_images:
        print(f"    ⚠️  WARNING: {total_images - len(image_metadata)} image(s) missing!")

    return image_metadata


def upload_to_api(fileName, directory, content, api_url=None, api_key=None):
    """
    Upload text entry to the database via API.

    Args:
        fileName: Name of the file (without .txt extension)
        directory: Directory name (e.g., 'bookv2-furigana')
        content: Text content to upload
        api_url: API endpoint URL (default: http://localhost:3333)
        api_key: Admin API key (default: from ADMIN_API_KEY env var)

    Returns:
        True if successful, False otherwise
    """
    if api_url is None:
        api_url = os.environ.get('API_URL', 'http://localhost:3333')
    if api_key is None:
        api_key = os.environ.get('ADMIN_API_KEY')

    if not api_key:
        print("Error: ADMIN_API_KEY environment variable not set")
        print("Please set it with: export ADMIN_API_KEY=your-api-key")
        return False

    endpoint = f"{api_url}/api/admin/text-entries"

    payload = {
        'fileName': fileName,
        'directory': directory,
        'content': content
    }

    headers = {
        'Content-Type': 'application/json',
        'x-api-key': api_key
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(endpoint, data=data, headers=headers, method='POST')

        print(f"  Uploading to API: {endpoint}")
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            if response_data.get('success'):
                print(f"  ✓ Upload successful: {response_data.get('message', 'OK')}")
                return True
            else:
                print(f"  ✗ Upload failed: {response_data.get('message', 'Unknown error')}")
                return False

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"  ✗ HTTP Error {e.code}: {e.reason}")
        print(f"     {error_body}")
        return False
    except urllib.error.URLError as e:
        print(f"  ✗ Connection Error: {e.reason}")
        print(f"     Make sure the server is running at {api_url}")
        return False
    except Exception as e:
        print(f"  ✗ Unexpected error: {e}")
        return False


def extract_text_from_html(html_content):
    """
    Extract text content from HTML, preserving only ruby tags.
    Note: Most processing is now done in preserve_existing_ruby().
    This function just does basic cleanup.
    """
    # Just return the HTML content - preserve_existing_ruby() will handle extraction
    return html_content


def process_epub_to_text(epub_path, filter_n3_plus=False, output_dir=None, preserve_long_vowel=False, output_mode='file'):
    """
    Convert EPUB to text file with furigana.

    Args:
        epub_path: Path to EPUB file
        filter_n3_plus: If True, only add furigana to N3+ kanji
        output_dir: Directory to save output file (default: public/bookv2-furigana/)
        preserve_long_vowel: If True, keep ー in output. If False (default), convert to proper vowels.
        output_mode: Output mode - 'file' (default) or 'api'

    Returns:
        Path to created text file (file mode) or True/False (api mode)
    """
    print(f"Processing EPUB: {epub_path}")
    print(f"Filtering mode: {'N3+ only' if filter_n3_plus else 'All kanji'}")
    print(f"Hiragana style: {'Long vowel marks (ー)' if preserve_long_vowel else 'Full hiragana (proper)'}")
    print(f"Output mode: {output_mode}")

    # Read EPUB
    try:
        book = epub.read_epub(epub_path)
    except Exception as e:
        print(f"Error reading EPUB: {e}")
        sys.exit(1)

    # Get book metadata
    title = book.get_metadata('DC', 'title')
    title = title[0][0] if title else Path(epub_path).stem
    author = book.get_metadata('DC', 'creator')
    author = author[0][0] if author else 'Unknown'

    print(f"Title: {title}")
    print(f"Author: {author}")

    # Create output filename and directory structure
    safe_title = sanitize_filename(title)
    if output_dir is None:
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        output_dir = project_root / 'public' / 'bookv2-furigana'
    output_dir = Path(output_dir)

    # Extract images first
    print(f"\n{'='*60}")
    print("Extracting images from EPUB...")
    print(f"{'='*60}")
    image_metadata = extract_images_from_epub(book, output_dir, safe_title)
    print(f"  Extracted {len(image_metadata)} images")

    # PASS 1: Extract name dictionary from existing ruby tags
    print("\nPass 1: Building name/term dictionary from EPUB...")
    from furigana_helper import extract_ruby_dictionary

    name_dictionary = {}
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            try:
                html_content = item.get_content().decode('utf-8')
                chapter_dict = extract_ruby_dictionary(html_content)
                name_dictionary.update(chapter_dict)
            except Exception:
                # Skip chapters that fail to parse
                continue

    print(f"  Found {len(name_dictionary)} unique names/terms with furigana")
    if name_dictionary:
        # Show a few examples
        sample = list(name_dictionary.items())[:5]
        for kanji, reading in sample:
            print(f"    {kanji} → {reading}")

    # Initialize furigana generator with name dictionary and hiragana style
    print("\nPass 2: Initializing MeCab and processing chapters...")
    try:
        generator = FuriganaGenerator(
            name_dictionary=name_dictionary,
            preserve_long_vowel=preserve_long_vowel
        )
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)

    # Process chapters
    print("\nExtracting chapters...")
    chapters = []
    chapter_count = 0

    # Get all items in reading order (spine)
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            chapter_count += 1
            print(f"  Processing chapter {chapter_count}...", end='', flush=True)

            try:
                # Get HTML content
                html_content = item.get_content().decode('utf-8')

                # Extract text while preserving ruby tags
                text_with_ruby = extract_text_from_html(html_content)

                # Add furigana to text that doesn't have it
                # This preserves existing ruby tags and adds new ones
                processed = preserve_existing_ruby(
                    text_with_ruby,
                    generator,
                    filter_n3_plus
                )

                # Clean up excessive whitespace and metadata
                processed = re.sub(r'\n{3,}', '\n\n', processed)

                # Remove XML/HTML declarations and other metadata
                processed = re.sub(r"xmlversion.*?html", "", processed)
                processed = re.sub(r'<\?xml.*?\?>', '', processed)
                processed = re.sub(r'<!DOCTYPE.*?>', '', processed)

                processed = processed.strip()

                # Only add non-empty chapters with actual content
                if processed and len(processed) > 10:  # Ignore nearly-empty chapters
                    chapters.append(processed)
                    print(" ✓")
                else:
                    print(" (empty, skipped)")

            except Exception as e:
                print(f" ✗ Error: {e}")
                # Continue processing other chapters
                continue

    if not chapters:
        print("\nError: No chapters could be extracted from the EPUB.")
        sys.exit(1)

    print(f"\nSuccessfully processed {len(chapters)} chapters")

    # Combine chapters
    print("Combining chapters...")
    output_text = f"Title: {title}\nAuthor: {author}\n\n"
    output_text += "\n\n".join(chapters)

    # Create book directory structure (book-specific folder)
    book_dir = output_dir / safe_title
    book_dir.mkdir(parents=True, exist_ok=True)

    # Create output paths inside book directory
    output_path = book_dir / f"{safe_title}.txt"
    metadata_path = book_dir / f"{safe_title}.json"

    # Save based on output mode
    if output_mode == 'api':
        print(f"\nUploading to API...")
        print(f"  File name: {safe_title}")
        print(f"  Directory: bookv2-furigana")
        print(f"  Content length: {len(output_text)} characters")

        success = upload_to_api(
            fileName=safe_title,
            directory='bookv2-furigana',
            content=output_text
        )

        if not success:
            print("\n✗ Failed to upload to API")
            print("  You can still save to file by running without --output-mode api")
            sys.exit(1)

        # Calculate file size estimate
        file_size = len(output_text.encode('utf-8')) / 1024  # KB

        print(f"\n{'='*60}")
        print(f"✓ Upload complete!")
        print(f"{'='*60}")
        print(f"File name: {safe_title}")
        print(f"Directory: bookv2-furigana")
        print(f"File size (estimate): {file_size:.1f} KB")
        print(f"Chapters: {len(chapters)}")
        print(f"Images: {len(image_metadata)} (saved to {book_dir})")
        print(f"Filter mode: {'N3+ kanji only' if filter_n3_plus else 'All kanji'}")
        print(f"Hiragana style: {'Long vowel marks (ー)' if preserve_long_vowel else 'Full hiragana (proper)'}")
        print(f"{'='*60}")

        # Still save metadata JSON file for images reference
        metadata = {
            'title': title,
            'author': author,
            'fileName': safe_title,
            'originalEpubName': Path(epub_path).name,
            'processingHistory': {
                'filterMode': 'n3' if filter_n3_plus else 'all',
                'hiraganaStyle': 'long-vowel' if preserve_long_vowel else 'full',
                'chaptersCount': len(chapters),
                'fileSize': int(file_size),
                'imageCount': len(image_metadata)
            },
            'images': image_metadata
        }

        print(f"\nSaving metadata to: {metadata_path}")
        try:
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving metadata: {e}")
            # Don't exit - metadata is not critical for API mode

        return True

    # File mode (default)
    # Save text file
    print(f"\nSaving text to: {output_path}")
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output_text)
    except Exception as e:
        print(f"Error saving file: {e}")
        sys.exit(1)

    # Calculate file size
    file_size = output_path.stat().st_size / 1024  # KB

    # Create metadata JSON
    metadata = {
        'title': title,
        'author': author,
        'fileName': safe_title,
        'textFilePath': str(output_path),
        'originalEpubName': Path(epub_path).name,
        'processingHistory': {
            'filterMode': 'n3' if filter_n3_plus else 'all',
            'hiraganaStyle': 'long-vowel' if preserve_long_vowel else 'full',
            'chaptersCount': len(chapters),
            'fileSize': int(file_size),
            'imageCount': len(image_metadata)
        },
        'images': image_metadata
    }

    # Save metadata JSON
    print(f"Saving metadata to: {metadata_path}")
    try:
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving metadata: {e}")
        sys.exit(1)

    # Print summary
    print(f"\n{'='*60}")
    print(f"✓ Conversion complete!")
    print(f"{'='*60}")
    print(f"Output file: {output_path}")
    print(f"Metadata: {metadata_path}")
    print(f"File size: {file_size:.1f} KB")
    print(f"Chapters: {len(chapters)}")
    print(f"Images: {len(image_metadata)}")
    print(f"Filter mode: {'N3+ kanji only' if filter_n3_plus else 'All kanji'}")
    print(f"Hiragana style: {'Long vowel marks (ー)' if preserve_long_vowel else 'Full hiragana (proper)'}")
    print(f"{'='*60}")

    return output_path


def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(
        description='Convert EPUB to text with furigana',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Add furigana to all kanji (default)
  python epub-to-text-furigana.py book.epub

  # Only add furigana to N3+ kanji (advanced/rare kanji)
  python epub-to-text-furigana.py book.epub --filter n3

  # Upload directly to database via API (requires ADMIN_API_KEY env var)
  export ADMIN_API_KEY=your-secret-key
  python epub-to-text-furigana.py book.epub --output-mode api

  # Specify custom output directory
  python epub-to-text-furigana.py book.epub --output ./output/

Note: Existing furigana in the EPUB will always be preserved.
        """
    )

    parser.add_argument(
        'epub_file',
        help='Path to EPUB file to convert'
    )

    parser.add_argument(
        '--filter',
        choices=['n3', 'none'],
        default='none',
        help='Furigana filtering mode (default: none - add to all kanji)'
    )

    parser.add_argument(
        '--output',
        '-o',
        help='Output directory (default: public/bookv2-furigana/)'
    )

    parser.add_argument(
        '--hiragana-style',
        choices=['full', 'long-vowel'],
        default='full',
        help='Hiragana style: "full" (しょう) or "long-vowel" (しょー) (default: full)'
    )

    parser.add_argument(
        '--output-mode',
        choices=['file', 'api'],
        default='file',
        help='Output mode: "file" (save to filesystem) or "api" (upload to database via API) (default: file)'
    )

    args = parser.parse_args()

    # Validate input file
    epub_path = Path(args.epub_file)
    if not epub_path.exists():
        print(f"Error: File not found: {epub_path}")
        sys.exit(1)

    if not epub_path.suffix.lower() == '.epub':
        print(f"Warning: File doesn't have .epub extension: {epub_path}")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)

    # Process the EPUB
    filter_n3_plus = (args.filter == 'n3')
    preserve_long_vowel = (args.hiragana_style == 'long-vowel')
    output_mode = args.output_mode

    result = process_epub_to_text(
        epub_path,
        filter_n3_plus=filter_n3_plus,
        output_dir=args.output,
        preserve_long_vowel=preserve_long_vowel,
        output_mode=output_mode
    )

    if output_mode == 'api':
        if result:
            print("\n✓ Done! Text uploaded to database via API.")
            print("  Refresh your app to see the new book.")
        else:
            print("\n✗ Failed to upload to API.")
            sys.exit(1)
    else:
        print("\n✓ Done! You can now use this file in your Japanese reading app.")
        print(f"  File saved to: {result}")


if __name__ == '__main__':
    main()
