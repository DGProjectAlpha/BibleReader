import asvData from './asv.json';

export interface BibleBook {
  name: string;
  chapters: string[][];
}

// asv.json is typed as an array of {name, chapters}
const asv = asvData as BibleBook[];

/**
 * Returns all verses for a given book and chapter (1-indexed).
 * Returns [] if not found.
 */
export function getChapter(bookName: string, chapter: number): string[] {
  const book = asv.find((b) => b.name === bookName);
  if (!book) return [];
  const ch = book.chapters[chapter - 1];
  return ch ?? [];
}

/**
 * Returns all chapter arrays for a book.
 */
export function getBook(bookName: string): string[][] {
  const book = asv.find((b) => b.name === bookName);
  return book ? book.chapters : [];
}

export default asv;
