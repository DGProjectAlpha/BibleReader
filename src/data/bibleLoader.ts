/**
 * Unified Bible data loader.
 * Single entry point for all translation lookups — wraps KJV and ASV loaders.
 * Add new translations here without touching consumer code.
 */

import * as kjv from './kjvLoader';
import * as asv from './asvLoader';
import * as rst from './rstLoader';
import { books as canonicalBooks } from './books';

// Translation is any string — 'KJV' and 'ASV' are built-ins; custom translations use their abbreviation.
export type Translation = string;

// The two built-in translation keys
export const BUILTIN_TRANSLATIONS = ['KJV', 'ASV'] as const;
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
  SYN: rst,
};

/**
 * Plain bible JSON schema used by the import module:
 * { BookName: { "1": ["verse text", ...], ... } }
 */
export interface BibleData {
  [book: string]: { [chapter: string]: string[] };
}

/**
 * Normalise an imported book name to its canonical name from books.ts.
 * Handles case differences and long-form names (e.g. api.bible may return
 * "Song Of Songs" or "Psalms" when the canonical is "Song of Solomon" / "Psalm").
 *
 * @param name     The imported book name to normalise.
 * @param warnings Optional array to collect unmatched names. If provided and
 *                 no canonical match is found, a human-readable warning is pushed
 *                 before the function returns the original name unchanged.
 */
function normalizeBookName(name: string, warnings?: string[]): string {
  // 1. Exact match
  const exact = canonicalBooks.find((b) => b.name === name);
  if (exact) return exact.name;

  // 2. Case-insensitive match
  const lower = name.toLowerCase();
  const ci = canonicalBooks.find((b) => b.name.toLowerCase() === lower);
  if (ci) return ci.name;

  // 3. Strip common prefixes / punctuation and compare
  const strip = (s: string) =>
    s.toLowerCase().replace(/[.\s]/g, '').replace(/^(first|second|third|1st|2nd|3rd)/, (m) => {
      if (m === 'first' || m === '1st') return '1';
      if (m === 'second' || m === '2nd') return '2';
      if (m === 'third' || m === '3rd') return '3';
      return m;
    });
  const stripped = strip(name);
  const fuzzy = canonicalBooks.find((b) => strip(b.name) === stripped);
  if (fuzzy) return fuzzy.name;

  // 4. No canonical match found — this book will not appear in the sidebar.
  // Surface a warning rather than failing silently.
  const msg = `Book name "${name}" could not be matched to a canonical Bible book. It will be skipped in navigation.`;
  console.warn(`[bibleLoader] normalizeBookName: ${msg}`);
  if (warnings) warnings.push(msg);
  return name;
}

/**
 * Register a custom (user-imported) translation so it can be used in panes.
 * Converts plain string verses into TaggedVerse format (each word as a token
 * with no Strong's numbers, since custom bibles are untagged).
 */
export function registerCustomTranslation(abbreviation: string, data: BibleData): string[] {
  const warnings: string[] = [];

  // Build BibleBook[] from the flat BibleData object
  const books: BibleBook[] = Object.entries(data).map(([bookName, chaptersObj]) => {
    // Normalise to canonical name so sidebar navigation (which uses books.ts names) works
    const canonicalName = normalizeBookName(bookName, warnings);
    if (canonicalName !== bookName) {
      console.log(`[bibleLoader] normalised book name: "${bookName}" → "${canonicalName}"`);
    }
    const chapterKeys = Object.keys(chaptersObj).sort((a, b) => Number(a) - Number(b));
    const chapters: import('./kjvLoader').TaggedVerse[][] = chapterKeys.map((chKey) => {
      const verses = chaptersObj[chKey];
      // Convert each verse string to TaggedVerse (split into word tokens, no Strong's)
      return verses.map((verseText): import('./kjvLoader').TaggedVerse =>
        verseText.split(/\s+/).filter(Boolean).map((word) => ({ word, strongs: [] }))
      );
    });
    return { name: canonicalName, chapters };
  });

  const bookNames = books.map((b) => b.name);
  console.log(`[bibleLoader] registerCustomTranslation: ${abbreviation} — ${books.length} books registered`);
  console.log(`[bibleLoader] ${abbreviation} book names:`, bookNames);

  // Create a BibleLoader backed by the in-memory books array
  const loader: BibleLoader = {
    getData: () => books,
    getChapter: (bookName, chapter) => {
      const book = books.find((b) => b.name === bookName);
      if (!book) {
        console.warn(`[bibleLoader] ${abbreviation}.getChapter: book "${bookName}" not found. Available:`, bookNames);
        return [];
      }
      const ch = book.chapters[chapter - 1] ?? [];
      console.log(`[bibleLoader] ${abbreviation}.getChapter("${bookName}", ${chapter}) → ${ch.length} verses`);
      return ch;
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

  if (warnings.length > 0) {
    console.warn(`[bibleLoader] registerCustomTranslation: ${warnings.length} unmatched book name(s) for "${abbreviation}"`);
  }
  return warnings;
}

/**
 * Register a custom translation that is already in tagged format
 * (BibleDataTagged = BibleBookTagged[] from brbmod.ts).
 * Each word token already carries Strong's numbers — no conversion needed.
 */
export function registerTaggedTranslation(
  abbreviation: string,
  data: import('../types/brbmod').BibleDataTagged
): string[] {
  const warnings: string[] = [];

  // BibleBookTagged and BibleBook are structurally identical, but normalise book names
  // in case the tagged module uses variant names (e.g. from api.bible).
  const books: BibleBook[] = data.map((bookEntry) => {
    const canonicalName = normalizeBookName(bookEntry.name, warnings);
    if (canonicalName !== bookEntry.name) {
      console.log(`[bibleLoader] normalised tagged book name: "${bookEntry.name}" → "${canonicalName}"`);
    }
    return { name: canonicalName, chapters: bookEntry.chapters };
  });

  const bookNames = books.map((b) => b.name);
  console.log(`[bibleLoader] registerTaggedTranslation: ${abbreviation} — ${books.length} books registered`);
  console.log(`[bibleLoader] ${abbreviation} book names:`, bookNames);

  const loader: BibleLoader = {
    getData: () => books,
    getChapter: (bookName, chapter) => {
      const book = books.find((b) => b.name === bookName);
      if (!book) {
        console.warn(`[bibleLoader] ${abbreviation}.getChapter: book "${bookName}" not found. Available:`, bookNames);
        return [];
      }
      const ch = book.chapters[chapter - 1] ?? [];
      console.log(`[bibleLoader] ${abbreviation}.getChapter("${bookName}", ${chapter}) → ${ch.length} verses`);
      return ch;
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

  if (warnings.length > 0) {
    console.warn(`[bibleLoader] registerTaggedTranslation: ${warnings.length} unmatched book name(s) for "${abbreviation}"`);
  }
  return warnings;
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
  if (translation in loaders) {
    return loaders[translation];
  }
  console.warn(`[bibleLoader] resolveLoader: "${translation}" not registered — falling back to KJV. Registered: [${Object.keys(loaders).join(', ')}]`);
  return loaders['KJV'];
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

export const TRANSLATIONS: Translation[] = ['KJV', 'ASV', 'SYN'];
