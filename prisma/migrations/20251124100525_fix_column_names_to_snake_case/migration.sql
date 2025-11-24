-- AlterTable: Rename columns in bookmarks table to snake_case
ALTER TABLE "bookmarks" RENAME COLUMN "fileName" TO "file_name";
ALTER TABLE "bookmarks" RENAME COLUMN "bookmarkText" TO "bookmark_text";
ALTER TABLE "bookmarks" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable: Rename columns in text_entries table to snake_case  
ALTER TABLE "text_entries" RENAME COLUMN "fileName" TO "file_name";
ALTER TABLE "text_entries" RENAME COLUMN "createdAt" TO "created_at";

-- Update indexes for bookmarks (drop old, create new with correct column names)
DROP INDEX "bookmarks_fileName_directory_idx";
DROP INDEX "bookmarks_fileName_directory_key";
CREATE INDEX "bookmarks_file_name_directory_idx" ON "bookmarks"("file_name", "directory");
CREATE UNIQUE INDEX "bookmarks_file_name_directory_key" ON "bookmarks"("file_name", "directory");

-- Update indexes for text_entries (drop old, create new with correct column names)
DROP INDEX "text_entries_fileName_directory_idx";
DROP INDEX "text_entries_fileName_directory_key";
CREATE INDEX "text_entries_file_name_directory_idx" ON "text_entries"("file_name", "directory");
CREATE UNIQUE INDEX "text_entries_file_name_directory_key" ON "text_entries"("file_name", "directory");
