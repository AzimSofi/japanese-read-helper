import { sql } from '@/lib/db/connection';
import { PAGINATION_CONFIG, READER_CONFIG } from '@/lib/constants';
import { parseMarkdown } from '@/lib/utils/markdownParser';
import { stripFurigana } from '@/lib/utils/furiganaParser';

function computeTextMetadata(content: string): { totalPages: number; totalCharacters: number } {
  if (!content) return { totalPages: 0, totalCharacters: 0 };

  let itemCount: number;
  let totalCharacters: number;

  if (content.includes('>>')) {
    const items = parseMarkdown(content);
    itemCount = items.length;
    totalCharacters = 0;
    for (const item of items) {
      if (item.head) {
        totalCharacters += stripFurigana(item.head).length;
      }
    }
  } else {
    const paragraphs = content.split(READER_CONFIG.PARAGRAPH_SPLIT_PATTERN).filter(p => p.trim());
    itemCount = paragraphs.length;
    totalCharacters = stripFurigana(content).length;
  }

  const totalPages = Math.ceil(itemCount / PAGINATION_CONFIG.ITEMS_PER_PAGE);
  return { totalPages, totalCharacters };
}

async function migrate() {
  console.log('Adding total_pages and total_characters columns...');

  await sql`
    ALTER TABLE text_entries
    ADD COLUMN IF NOT EXISTS total_pages INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_characters INT DEFAULT 0
  `;

  console.log('Columns added. Backfilling existing entries...');

  const entries = await sql<{ id: number; content: string }>`
    SELECT id, content FROM text_entries
  `;

  const rows = Array.isArray(entries) ? entries : (entries as { rows: { id: number; content: string }[] }).rows || [];
  console.log(`Found ${rows.length} entries to backfill.`);

  for (const row of rows) {
    const { totalPages, totalCharacters } = computeTextMetadata(row.content);
    await sql`
      UPDATE text_entries
      SET total_pages = ${totalPages}, total_characters = ${totalCharacters}
      WHERE id = ${row.id}
    `;
  }

  console.log('Backfill complete.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
