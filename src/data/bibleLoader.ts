/**
 * Unified Bible data loader.
 * Single entry point for all translation lookups — wraps KJV and ASV loaders.
 * Add new translations here without touching consumer code.
 */

import * as kjv from './kjvLoader';
import * as asv from './asvLoader';
import * as rst from './rstLoader';

// Translation is any string — 'KJV' and 'ASV' are built-ins; custom translations use their abbreviation.
export type Translation = string;

// The two built-in translation keys
export const BUILTIN_TRANSLATIONS = ['KJV', 'ASV', 'RST'] as const;
export type BuiltinTranslation = typeof BUILTIN_TRANSLATIONS[number];

export type { WordToken, TaggedVerse } from './kjvLoader';

export interface BibleBook {
  name: string;
  chapters: import('./kjvLoader').TaggedVerse[][];
}

// Shared interface: only the methods common to all loader modules
interface BibleLoader {
  getData(): BibleBook[];
  getChapter(bookName: string, chapter: number): import('./kjvLoader').TaggedVerse[];
  getChapterText(bookName: string, chapter: number): string[];
  getBook(bookName: string): import('./kjvLoader').TaggedVerse[][];
}

// Map translation keys to their loaded data modules
const loaders: Record<string, BibleLoader> = {
  KJV: kjv,
  ASV: asv,
  RST: rst,
};

/**
 * Plain bible JSON schema used by the import module:
 * { BookName: { "1": ["verse text", ...], ... } }
 */
export interface BibleData {
  [book: string]: { [chapter: string]: string[] };
}

/**
 * Register a custom (user-imported) translation so it can be used in panes.
 * Converts plain string verses into TaggedVerse format (each word as a token
 * with no Strong's numbers, since custom bibles are untagged).
 */
export function registerCustomTranslation(abbreviation: string, data: BibleData): void {
  // Build BibleBook[] from the flat BibleData object
  const books: BibleBook[] = Object.entries(data).map(([bookName, chaptersObj]) => {
    const chapterKeys = Object.keys(chaptersObj).sort((a, b) => Number(a) - Number(b));
    const chapters: import('./kjvLoader').TaggedVerse[][] = chapterKeys.map((chKey) => {
      const verses = chaptersObj[chKey];
      // Convert each verse string to TaggedVerse (split into word tokens, no Strong's)
      return verses.map((verseText): import('./kjvLoader').TaggedVerse =>
        verseText.split(/\s+/).filter(Boolean).map((word) => ({ word, strongs: [] }))
      );
    });
    return { name: bookName, chapters };
  });

  // Create a BibleLoader backed by the in-memory books array
  const loader: BibleLoader = {
    getData: () => books,
    getChapter: (bookName, chapter) => {
      const book = books.find((b) => b.name === bookName);
      return book ? (book.chapters[chapter - 1] ?? []) : [];
    },
    getChapterText: (bookName, chapter) => {
      const book = books.find((b) => b.name === bookName);
      if (!book) return [];
      const ch = book.chapters[chapter - 1] ?? [];
      return ch.map((verse) => verse.map((t) => t.word).join(' '));
    },
    getBook: (bookName) => {
      const book = books.find((b) => b.name === bookName);
      return book ? book.chapters : [];
    },
  };

  loaders[abbreviation] = loader;
}

/** Removes a custom translation from the in-memory registry. */
export function unregisterCustomTranslation(abbreviation: string): void {
  delete loaders[abbreviation];
}

/** Returns true if the given translation key is registered (built-in or custom). */
export function isTranslationRegistered(abbreviation: string): boolean {
  return abbreviation in loaders;
}

/**
 * Resolve a loader for the given translation key.
 * Custom translations (registered via registerCustomTranslation) are checked first
 * since they share the same loaders map. Falls back to KJV if the key is unknown
 * (e.g. a pane referencing a translation that was later removed).
 */
function resolveLoader(translation: Translation): BibleLoader {
  return loaders[translation] ?? loaders['KJV'];
}

/**
 * Initialize all bible translations. Call this once at app startup and await it
 * before rendering the React tree so all sync loader functions work immediately.
 */
export async function initBibleData(): Promise<void> {
  await Promise.all([kjv.initKjv(), asv.initAsv(), rst.initRst()]);
}

/**
 * Get all word-tagged verses for a specific book + chapter.
 */
export function getChapter(
  translation: Translation,
  bookName: string,
  chapter: number
): import('./kjvLoader').TaggedVerse[] {
  return resolveLoader(translation).getChapter(bookName, chapter);
}

/**
 * Get plain text verses for a specific book + chapter.
 * Use this for search, display fallback, or components not yet updated for word tokens.
 */
export function getChapterText(
  translation: Translation,
  bookName: string,
  chapter: number
): string[] {
  return resolveLoader(translation).getChapterText(bookName, chapter);
}

/**
 * Get all chapters for a book (word-tagged).
 */
export function getBook(
  translation: Translation,
  bookName: string
): import('./kjvLoader').TaggedVerse[][] {
  return resolveLoader(translation).getBook(bookName);
}

/**
 * Returns the full Bible data array for a translation.
 */
export function getBible(translation: Translation): BibleBook[] {
  return resolveLoader(translation).getData() as BibleBook[];
}

/**
 * Returns total chapter count for a book in a given translation.
 */
export function getChapterCount(translation: Translation, bookName: string): number {
  return resolveLoader(translation).getBook(bookName).length;
}

export const TRANSLATIONS: Translation[] = ['KJV', 'ASV', 'RST'];
