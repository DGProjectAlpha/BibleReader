// ?url import: Vite copies the file as a static asset and returns its URL.
// Prevents Vite from parsing/bundling the 22MB JSON during build.
import rstUrl from './rst.json?url';

import type { TaggedVerse, BibleBook } from './kjvLoader';

let _data: BibleBook[] = [];

/**
 * Fetch and cache SYN (Russian Synodal + Strong's) data.
 * Must be awaited before calling any other export.
 */
export async function initRst(): Promise<void> {
  const res = await fetch(rstUrl as string);
  _data = (await res.json()) as BibleBook[];
}

export function getData(): BibleBook[] {
  return _data;
}

export function getChapter(bookName: string, chapter: number): TaggedVerse[] {
  const book = _data.find((b) => b.name === bookName);
  if (!book) return [];
  return book.chapters[chapter - 1] ?? [];
}

export function getChapterText(bookName: string, chapter: number): string[] {
  return getChapter(bookName, chapter).map((verse) =>
    verse.map((t) => t.word).join(' ')
  );
}

export function getBook(bookName: string): TaggedVerse[][] {
  const book = _data.find((b) => b.name === bookName);
  return book ? book.chapters : [];
}
