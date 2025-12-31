import { sql } from './connection';
import type { Book, BookImage, ProcessingHistory, UserBookmark, QueryResult } from './schema';
import { nanoid } from 'nanoid';

function normalizeResult<T>(result: QueryResult<T>): T[] {
  if (result && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows;
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [];
}

export interface BookWithRelations extends Book {
  images?: BookImage[];
  processingHistory?: ProcessingHistory[];
  userBookmarks?: UserBookmark[];
}

export interface CreateBookInput {
  title: string;
  author: string;
  fileName: string;
  textFilePath: string;
  originalEpubName: string;
  processingHistory?: {
    filterMode: string;
    hiraganaStyle: string;
    chaptersCount: number;
    fileSize: number;
    imageCount?: number;
  };
  images?: {
    fileName: string;
    imagePath: string;
    orderIndex: number;
    chapterName?: string;
    altText?: string;
  }[];
}

export async function getBooks(fileName?: string): Promise<BookWithRelations[]> {
  try {
    let booksResult: QueryResult<Book>;
    if (fileName) {
      booksResult = await sql<Book>`
        SELECT * FROM books WHERE file_name = ${fileName} ORDER BY created_at DESC
      `;
    } else {
      booksResult = await sql<Book>`
        SELECT * FROM books ORDER BY created_at DESC
      `;
    }

    const books = normalizeResult(booksResult);
    const result: BookWithRelations[] = [];

    for (const book of books) {
      const imagesResult = await sql<BookImage>`
        SELECT * FROM book_images WHERE book_id = ${book.id} ORDER BY order_index ASC
      `;
      const historyResult = await sql<ProcessingHistory>`
        SELECT * FROM processing_history WHERE book_id = ${book.id} ORDER BY processed_at DESC LIMIT 1
      `;
      const bookmarksResult = await sql<UserBookmark>`
        SELECT * FROM user_bookmarks WHERE book_id = ${book.id} AND user_id = 'default'
      `;

      result.push({
        ...book,
        images: normalizeResult(imagesResult),
        processingHistory: normalizeResult(historyResult),
        userBookmarks: normalizeResult(bookmarksResult),
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
}

export async function getBookById(id: string): Promise<BookWithRelations | null> {
  try {
    const bookResult = await sql<Book>`SELECT * FROM books WHERE id = ${id}`;
    const books = normalizeResult(bookResult);

    if (books.length === 0) {
      return null;
    }

    const book = books[0];
    const imagesResult = await sql<BookImage>`
      SELECT * FROM book_images WHERE book_id = ${id} ORDER BY order_index ASC
    `;
    const historyResult = await sql<ProcessingHistory>`
      SELECT * FROM processing_history WHERE book_id = ${id} ORDER BY processed_at DESC
    `;
    const bookmarksResult = await sql<UserBookmark>`
      SELECT * FROM user_bookmarks WHERE book_id = ${id} AND user_id = 'default'
    `;

    return {
      ...book,
      images: normalizeResult(imagesResult),
      processingHistory: normalizeResult(historyResult),
      userBookmarks: normalizeResult(bookmarksResult),
    };
  } catch (error) {
    console.error('Error fetching book by id:', error);
    throw error;
  }
}

export async function getBookByFileName(fileName: string): Promise<BookWithRelations | null> {
  try {
    const bookResult = await sql<Book>`SELECT * FROM books WHERE file_name = ${fileName}`;
    const books = normalizeResult(bookResult);

    if (books.length === 0) {
      return null;
    }

    const book = books[0];
    const imagesResult = await sql<BookImage>`
      SELECT * FROM book_images WHERE book_id = ${book.id} ORDER BY order_index ASC
    `;
    const historyResult = await sql<ProcessingHistory>`
      SELECT * FROM processing_history WHERE book_id = ${book.id} ORDER BY processed_at DESC
    `;
    const bookmarksResult = await sql<UserBookmark>`
      SELECT * FROM user_bookmarks WHERE book_id = ${book.id} AND user_id = 'default'
    `;

    return {
      ...book,
      images: normalizeResult(imagesResult),
      processingHistory: normalizeResult(historyResult),
      userBookmarks: normalizeResult(bookmarksResult),
    };
  } catch (error) {
    console.error('Error fetching book by fileName:', error);
    throw error;
  }
}

export async function createBook(input: CreateBookInput): Promise<BookWithRelations> {
  try {
    const bookId = nanoid();
    const now = new Date();

    await sql`
      INSERT INTO books (id, title, author, file_name, text_file_path, original_epub_name, created_at, updated_at)
      VALUES (${bookId}, ${input.title}, ${input.author}, ${input.fileName}, ${input.textFilePath}, ${input.originalEpubName}, ${now}, ${now})
    `;

    if (input.processingHistory) {
      const historyId = nanoid();
      await sql`
        INSERT INTO processing_history (id, book_id, filter_mode, hiragana_style, chapters_count, file_size, image_count, processed_at)
        VALUES (${historyId}, ${bookId}, ${input.processingHistory.filterMode}, ${input.processingHistory.hiraganaStyle}, ${input.processingHistory.chaptersCount}, ${input.processingHistory.fileSize}, ${input.processingHistory.imageCount || 0}, ${now})
      `;
    }

    if (input.images && input.images.length > 0) {
      for (const img of input.images) {
        const imageId = nanoid();
        await sql`
          INSERT INTO book_images (id, book_id, file_name, image_path, order_index, chapter_name, alt_text, created_at)
          VALUES (${imageId}, ${bookId}, ${img.fileName}, ${img.imagePath}, ${img.orderIndex}, ${img.chapterName || null}, ${img.altText || null}, ${now})
        `;
      }
    }

    const book = await getBookById(bookId);
    if (!book) {
      throw new Error('Failed to retrieve created book');
    }
    return book;
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

export async function updateBook(
  id: string,
  data: Partial<Pick<Book, 'title' | 'author' | 'text_file_path'>>
): Promise<BookWithRelations | null> {
  try {
    const updates: string[] = [];
    const values: (string | Date)[] = [];

    if (data.title !== undefined) {
      updates.push('title');
      values.push(data.title);
    }
    if (data.author !== undefined) {
      updates.push('author');
      values.push(data.author);
    }
    if (data.text_file_path !== undefined) {
      updates.push('text_file_path');
      values.push(data.text_file_path);
    }

    if (updates.length === 0) {
      return getBookById(id);
    }

    const now = new Date();
    await sql`
      UPDATE books
      SET title = COALESCE(${data.title}, title),
          author = COALESCE(${data.author}, author),
          text_file_path = COALESCE(${data.text_file_path}, text_file_path),
          updated_at = ${now}
      WHERE id = ${id}
    `;

    return getBookById(id);
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

export async function deleteBook(id: string): Promise<void> {
  try {
    await sql`DELETE FROM books WHERE id = ${id}`;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

export async function getBookImages(bookId: string): Promise<BookImage[]> {
  try {
    const result = await sql<BookImage>`
      SELECT * FROM book_images WHERE book_id = ${bookId} ORDER BY order_index ASC
    `;
    return normalizeResult(result);
  } catch (error) {
    console.error('Error fetching book images:', error);
    throw error;
  }
}

export async function addBookImage(
  bookId: string,
  data: { fileName: string; imagePath: string; orderIndex: number; chapterName?: string; altText?: string }
): Promise<BookImage> {
  try {
    const imageId = nanoid();
    const now = new Date();
    await sql`
      INSERT INTO book_images (id, book_id, file_name, image_path, order_index, chapter_name, alt_text, created_at)
      VALUES (${imageId}, ${bookId}, ${data.fileName}, ${data.imagePath}, ${data.orderIndex}, ${data.chapterName || null}, ${data.altText || null}, ${now})
    `;

    const result = await sql<BookImage>`SELECT * FROM book_images WHERE id = ${imageId}`;
    const images = normalizeResult(result);
    if (images.length === 0) {
      throw new Error('Failed to retrieve created image');
    }
    return images[0];
  } catch (error) {
    console.error('Error adding book image:', error);
    throw error;
  }
}

export async function getOrCreateBook(
  fileName: string,
  defaults: { title?: string; author?: string; textFilePath?: string; originalEpubName?: string } = {}
): Promise<BookWithRelations> {
  try {
    let book = await getBookByFileName(fileName);
    if (book) {
      return book;
    }

    book = await createBook({
      fileName,
      title: defaults.title || fileName,
      author: defaults.author || 'Unknown',
      textFilePath: defaults.textFilePath || `/public/bookv2-furigana/${fileName}.txt`,
      originalEpubName: defaults.originalEpubName || `${fileName}.epub`,
    });

    return book;
  } catch (error) {
    console.error('Error in getOrCreateBook:', error);
    throw error;
  }
}

export async function getBookUserBookmark(fileName: string, userId: string = 'default'): Promise<string> {
  try {
    const book = await getOrCreateBook(fileName);
    const result = await sql<UserBookmark>`
      SELECT * FROM user_bookmarks WHERE book_id = ${book.id} AND user_id = ${userId}
    `;
    const bookmarks = normalizeResult(result);
    return bookmarks.length > 0 ? bookmarks[0].bookmark_text : '';
  } catch (error) {
    console.error('Error fetching book user bookmark:', error);
    return '';
  }
}

export async function upsertBookUserBookmark(
  fileName: string,
  bookmarkText: string,
  userId: string = 'default'
): Promise<void> {
  try {
    const book = await getOrCreateBook(fileName);
    const now = new Date();
    const bookmarkId = nanoid();

    await sql`
      INSERT INTO user_bookmarks (id, book_id, user_id, bookmark_text, created_at, updated_at)
      VALUES (${bookmarkId}, ${book.id}, ${userId}, ${bookmarkText}, ${now}, ${now})
      ON CONFLICT (book_id, user_id)
      DO UPDATE SET bookmark_text = ${bookmarkText}, updated_at = ${now}
    `;
  } catch (error) {
    console.error('Error upserting book user bookmark:', error);
    throw error;
  }
}
