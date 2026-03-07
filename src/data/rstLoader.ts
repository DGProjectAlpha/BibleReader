// ?url import: Vite copies the file as a static asset and returns its URL.
// This prevents Vite from parsing/bundling the large JSON during build.
import rstUrl from './rst_strong.json?url';

import type { WordToken, TaggedVerse, BibleBook } from './kjvLoader';
export type { WordToken, TaggedVerse, BibleBook };

let _data: BibleBook[] = [];

/**
 * Fetch and cache RST (Russian Synodal with Strong's) data.
 * Must be awaited before calling any other export.
 */
export async function initRst(): Promise<void> {
  const res = await fetch(rstUrl as string);
  _data = (await res.json()) as BibleBook[];
}

/** Returns the raw bible array (empty until initRst resolves). */
export function getData(): BibleBook[] {
  return _data;
}

/**
 * Returns all word-tagged verses for a given book and chapter (1-indexed).
 * Returns [] if not found.
 */
export function getChapter(bookName: string, chapter: number): TaggedVerse[] {
  const book = _data.find((b) => b.name === bookName);
  if (!book) return [];
  return book.chapters[chapter - 1] ?? [];
}

/**
 * Returns plain text verses (word tokens joined) for a given book and chapter.
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
  const book = _data.find((b) => b.name === bookName);
  return book ? book.chapters : [];
}
