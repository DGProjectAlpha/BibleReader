import kjvData from './kjv.json';

/** A single word with its Strong's number(s). */
export interface WordToken {
  word: string;
  strongs: string[];
}

/** A verse is an array of word tokens. */
export type TaggedVerse = WordToken[];

export interface BibleBook {
  name: string;
  chapters: TaggedVerse[][];
}

const kjv = kjvData as unknown as BibleBook[];

/**
 * Returns all word-tagged verses for a given book and chapter (1-indexed).
 * Returns [] if not found.
 */
export function getChapter(bookName: string, chapter: number): TaggedVerse[] {
  const book = kjv.find((b) => b.name === bookName);
  if (!book) return [];
  return book.chapters[chapter - 1] ?? [];
}

/**
 * Returns plain text verses (word tokens joined) for a given book and chapter.
 * Backward-compatible with consumers that expect string[].
 */
export function getChapterText(bookName: string, chapter: number): string[] {
  return getChapter(bookName, chapter).map((verse) =>
    verse.map((t) => t.word).join(' ')
  );
}

/**
 * Returns all chapter arrays for a book (word-tagged).
 */
export function getBook(bookName: string): TaggedVerse[][] {
  const book = kjv.find((b) => b.name === bookName);
  return book ? book.chapters : [];
}

export default kjv;
