/**
 * Strong's Exhaustive Concordance loader.
 * Provides lookup for Hebrew (H###) and Greek (G###) entries.
 * Data sourced from strongs-hebrew.json and strongs-greek.json.
 */

import hebrewData from './strongs-hebrew.json';
import greekData from './strongs-greek.json';

export interface StrongsEntry {
  lemma: string;
  xlit?: string;      // transliteration (Hebrew)
  translit?: string;  // transliteration (Greek)
  pron?: string;      // pronunciation
  derivation?: string;
  strongs_def?: string;
  kjv_def: string;
}

type StrongsMap = Record<string, StrongsEntry>;

const hebrew = hebrewData as StrongsMap;
const greek = greekData as StrongsMap;

/**
 * Look up a Strong's number.
 * @param num - e.g. "H1", "G3056", 1 (Hebrew assumed if bare number)
 * @returns The entry or null if not found
 */
export function lookup(num: string | number): StrongsEntry | null {
  if (typeof num === 'number') {
    return hebrew[`H${num}`] ?? null;
  }
  const key = num.toUpperCase();
  if (key.startsWith('H')) return hebrew[key] ?? null;
  if (key.startsWith('G')) return greek[key] ?? null;
  return null;
}

/**
 * Returns the display transliteration for an entry,
 * normalizing the xlit/translit field difference between Hebrew and Greek data.
 */
export function getTranslit(entry: StrongsEntry): string {
  return entry.xlit ?? entry.translit ?? '';
}

/**
 * Check if a Strong's number is Hebrew.
 */
export function isHebrew(num: string): boolean {
  return num.toUpperCase().startsWith('H');
}

/**
 * Check if a Strong's number is Greek.
 */
export function isGreek(num: string): boolean {
  return num.toUpperCase().startsWith('G');
}

// Lazy reverse index: normalized English word → list of Strong's numbers
let _reverseIndex: Map<string, string[]> | null = null;

function buildReverseIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();

  const addEntries = (map: StrongsMap) => {
    for (const [num, entry] of Object.entries(map)) {
      // Parse words from kjv_def and strongs_def; deduplicate per entry
      const text = `${entry.kjv_def} ${entry.strongs_def ?? ''}`;
      const uniqueKeys = new Set(
        text
          .toLowerCase()
          .replace(/[^a-z\s-]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2)
          .map((w) => w.replace(/-/g, ''))
          .filter(Boolean)
      );
      for (const key of uniqueKeys) {
        const existing = index.get(key);
        if (existing) {
          existing.push(num);
        } else {
          index.set(key, [num]);
        }
      }
    }
  };

  addEntries(hebrew as StrongsMap);
  addEntries(greek as StrongsMap);
  return index;
}

/**
 * Reverse-lookup Strong's entries by an English word.
 * Searches kjv_def and strongs_def of all entries.
 * Returns up to `limit` results (default 10).
 */
export function searchByKjvWord(
  word: string,
  limit = 10
): Array<{ num: string; entry: StrongsEntry }> {
  if (!_reverseIndex) _reverseIndex = buildReverseIndex();

  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return [];

  const nums = _reverseIndex.get(normalized) ?? [];
  return nums.slice(0, limit).map((num) => ({
    num,
    entry: lookup(num) as StrongsEntry,
  }));
}
