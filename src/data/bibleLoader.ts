/**
 * Unified Bible data loader.
 * Single entry point for all translation lookups — wraps KJV and ASV loaders.
 * Add new translations here without touching consumer code.
 */

import * as kjv from './kjvLoader';
import * as asv from './asvLoader';

export type Translation = 'KJV' | 'ASV';

/** A single verse — plain text string. */
export type Verse = string;

export interface BibleBook {
  name: string;
  chapters: string[][];
}

// Map translation keys to their loaded data modules
const loaders: Record<Translation, typeof kjv> = {
  KJV: kjv,
  ASV: asv,
};

/**
 * Get all verses for a specific book + chapter.
 * @param translation - 'KJV' or 'ASV'
 * @param bookName    - Full book name, e.g. 'Genesis'
 * @param chapter     - 1-indexed chapter number
 * @returns Array of verse strings, or [] if not found
 */
export function getChapter(translation: Translation, bookName: string, chapter: number): string[] {
  return loaders[translation].getChapter(bookName, chapter);
}

/**
 * Get all chapters for a book (array of verse arrays).
 * @param translation - 'KJV' or 'ASV'
 * @param bookName    - Full book name, e.g. 'Genesis'
 * @returns Array of chapters, each being an array of verse strings
 */
export function getBook(translation: Translation, bookName: string): string[][] {
  return loaders[translation].getBook(bookName);
}

/**
 * Returns the full Bible data array for a translation.
 */
export function getBible(translation: Translation): BibleBook[] {
  return loaders[translation].default as BibleBook[];
}

/**
 * Returns total chapter count for a book in a given translation.
 * Useful for dynamic chapter navigation without depending on books.ts.
 */
export function getChapterCount(translation: Translation, bookName: string): number {
  return loaders[translation].getBook(bookName).length;
}

export const TRANSLATIONS: Translation[] = ['KJV', 'ASV'];
