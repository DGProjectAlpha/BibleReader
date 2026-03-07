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
  kjv_def?: string;
}

type StrongsMap = Record<string, StrongsEntry>;

const hebrew = hebrewData as unknown as StrongsMap;
const greek = greekData as unknown as StrongsMap;

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
      const text = `${entry.kjv_def ?? ''} ${entry.strongs_def ?? ''}`;
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

export interface StrongsSearchResult {
  exact: { num: string; entry: StrongsEntry } | null;
  similar: Array<{ num: string; entry: StrongsEntry }>;
}

/**
 * Score how well an entry matches the clicked word.
 * Higher = better match.
 * 3: word is the first token in kjv_def (primary definition)
 * 2: word appears as an exact whole-word match in kjv_def
 * 1: word appears somewhere in the definition text (fallback)
 */
function scoreEntry(entry: StrongsEntry, normalized: string): number {
  const kjv = (entry.kjv_def ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ');
  const tokens = kjv.split(/\s+/).filter(Boolean);
  if (tokens[0] === normalized) return 3;
  if (tokens.includes(normalized)) return 2;
  return 1;
}

/**
 * Reverse-lookup Strong's entries by an English word.
 * Returns an object with:
 *   exact  — the single best-matching entry (highest score), or null
 *   similar — all remaining matches, up to `limit - 1`
 */
export function searchByKjvWord(
  word: string,
  limit = 10
): StrongsSearchResult {
  if (!_reverseIndex) _reverseIndex = buildReverseIndex();

  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return { exact: null, similar: [] };

  const nums = _reverseIndex.get(normalized) ?? [];
  const candidates = nums.slice(0, limit).map((num) => ({
    num,
    entry: lookup(num) as StrongsEntry,
  }));

  if (candidates.length === 0) return { exact: null, similar: [] };

  // Find the best-scoring candidate
  let bestIdx = 0;
  let bestScore = scoreEntry(candidates[0].entry, normalized);
  for (let i = 1; i < candidates.length; i++) {
    const s = scoreEntry(candidates[i].entry, normalized);
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  }

  const exact = candidates[bestIdx];
  const similar = candidates.filter((_, i) => i !== bestIdx);

  return { exact, similar };
}
