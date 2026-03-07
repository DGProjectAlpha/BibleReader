import kjvData from './kjv.json';

export interface BibleBook {
  name: string;
  chapters: string[][];
}

// kjv.json is typed as an array of {name, chapters}
const kjv = kjvData as BibleBook[];

/**
 * Returns all verses for a given book and chapter (1-indexed).
 * Returns [] if not found.
 */
export function getChapter(bookName: string, chapter: number): string[] {
  const book = kjv.find((b) => b.name === bookName);
  if (!book) return [];
  const ch = book.chapters[chapter - 1];
  return ch ?? [];
}

/**
 * Returns all chapter arrays for a book.
 */
export function getBook(bookName: string): string[][] {
  const book = kjv.find((b) => b.name === bookName);
  return book ? book.chapters : [];
}

export default kjv;
