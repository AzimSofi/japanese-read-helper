-- AlterTable: add updated_at to text_entries so content edits can sync via last-write-wins
ALTER TABLE "text_entries" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows from created_at. upsertTextEntry historically set
-- created_at = CURRENT_TIMESTAMP on every write, so it already reflects the
-- last write time; seeding updated_at from it avoids treating old content as
-- freshly edited on the first sync after this migration.
UPDATE "text_entries" SET "updated_at" = "created_at";
