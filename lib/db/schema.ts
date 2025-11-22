/**
 * Database schema definitions for Vercel Postgres
 */

export interface Bookmark {
  id?: number;
  file_name: string;
  directory: string;
  bookmark_text: string;
  updated_at?: Date;
}

export interface TextEntry {
  id?: number;
  file_name: string;
  directory: string;
  content: string;
  created_at?: Date;
}

/**
 * SQL schema for creating tables
 * Run this in Vercel Postgres dashboard or via migration script
 */
export const CREATE_TABLES_SQL = `
  -- Bookmarks table
  CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    directory VARCHAR(255) NOT NULL,
    bookmark_text TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_name, directory)
  );

  -- Create index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_bookmarks_file_directory
    ON bookmarks(file_name, directory);

  -- Text entries table (for user-generated content)
  CREATE TABLE IF NOT EXISTS text_entries (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    directory VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_name, directory)
  );

  -- Create index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_text_entries_file_directory
    ON text_entries(file_name, directory);
`;
