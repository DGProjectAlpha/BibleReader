/**
 * Unified Bible data loader.
 * Single entry point for all translation lookups — wraps KJV and ASV loaders.
 * Add new translations here without touching consumer code.
 */

import * as kjv from './kjvLoader';
import * as asv from './asvLoader';

export type Translation = 'KJV' | 'ASV';

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
const loaders: Record<Translation, BibleLoader> = {
  KJV: kjv,
  ASV: asv,
};

/**
 * Initialize all bible translations. Call this once at app startup and await it
 * before rendering the React tree so all sync loader functions work immediately.
 */
export async function initBibleData(): Promise<void> {
  await Promise.all([kjv.initKjv(), asv.initAsv()]);
}

/**
 * Get all word-tagged verses for a specific book + chapter.
 */
export function getChapter(
  translation: Translation,
  bookName: string,
  chapter: number
): import('./kjvLoader').TaggedVerse[] {
  return loaders[translation].getChapter(bookName, chapter);
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
  return loaders[translation].getChapterText(bookName, chapter);
}

/**
 * Get all chapters for a book (word-tagged).
 */
export function getBook(
  translation: Translation,
  bookName: string
): import('./kjvLoader').TaggedVerse[][] {
  return loaders[translation].getBook(bookName);
}

/**
 * Returns the full Bible data array for a translation.
 */
export function getBible(translation: Translation): BibleBook[] {
  return loaders[translation].getData() as BibleBook[];
}

/**
 * Returns total chapter count for a book in a given translation.
 */
export function getChapterCount(translation: Translation, bookName: string): number {
  return loaders[translation].getBook(bookName).length;
}

export const TRANSLATIONS: Translation[] = ['KJV', 'ASV'];
