/**
 * searchBible.ts
 * Keyword search across a Bible translation with scope filtering.
 * Scopes: 'bible' (whole), 'OT', 'NT', 'book' (one book), 'chapter' (one chapter).
 */

import { getBible } from '../data/bibleLoader';
import type { Translation } from '../data/bibleLoader';
import { books } from '../data/books';
import type { SearchResult, SearchScope } from '../store/bibleStore';

const OT_BOOKS = new Set(books.filter((b) => b.testament === 'OT').map((b) => b.name));
const NT_BOOKS = new Set(books.filter((b) => b.testament === 'NT').map((b) => b.name));

export interface SearchOptions {
  translation: Translation;
  scope: SearchScope;
  scopeBook: string;   // used when scope === 'book' | 'chapter'
  scopeChapter: number; // used when scope === 'chapter' (1-indexed)
  maxResults?: number; // default 500 — prevents UI meltdown on "the"
}

/**
 * Search for `query` across the given translation + scope.
 * Matching is case-insensitive whole-substring (not whole-word).
 * Returns up to maxResults hits in canonical Bible order.
 */
export function searchBible(query: string, options: SearchOptions): SearchResult[] {
  const { translation, scope, scopeBook, scopeChapter, maxResults = 500 } = options;

  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = trimmed.toLowerCase();
  const bible = getBible(translation);
  const results: SearchResult[] = [];

  for (const bookData of bible) {
    const bookName = bookData.name;

    // --- scope filter ---
    if (scope === 'OT' && !OT_BOOKS.has(bookName)) continue;
    if (scope === 'NT' && !NT_BOOKS.has(bookName)) continue;
    if ((scope === 'book' || scope === 'chapter') && bookName !== scopeBook) continue;

    const chaptersToSearch =
      scope === 'chapter'
        ? bookData.chapters.slice(scopeChapter - 1, scopeChapter)
        : bookData.chapters;

    const chapterOffset = scope === 'chapter' ? scopeChapter - 1 : 0;

    for (let ci = 0; ci < chaptersToSearch.length; ci++) {
      const chapterVerses = chaptersToSearch[ci];
      const chapterNum = chapterOffset + ci + 1; // 1-indexed

      for (let vi = 0; vi < chapterVerses.length; vi++) {
        const text = chapterVerses[vi];
        if (text.toLowerCase().includes(needle)) {
          results.push({
            book: bookName,
            chapter: chapterNum,
            verse: vi + 1, // 1-indexed
            text,
          });
          if (results.length >= maxResults) return results;
        }
      }
    }
  }

  return results;
}
