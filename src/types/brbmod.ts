/**
 * BibleReader Module Format — .brbmod
 *
 * A .brbmod file is a JSON file with a `.brbmod` extension.
 * It contains a `meta` block describing the translation and a `data` block
 * holding the actual Bible text in one of two supported formats.
 *
 * Supported formats:
 *   "plain"  — flat string verses, no Strong's tagging
 *   "tagged" — per-word tokens with Strong's number arrays (H### / G###)
 *
 * Usage:
 *   1. User drops a .brbmod file into BibleReader's import dialog.
 *   2. The app reads meta.format to determine how to parse data.
 *   3. The translation is registered via registerCustomTranslation() (plain)
 *      or registerTaggedTranslation() (tagged) using meta.abbreviation as key.
 *   4. A permanent copy is written to the app's local data directory so it
 *      reloads on every subsequent launch — highlights, notes, and bookmarks
 *      keyed to this translation persist alongside it.
 */

// ---------------------------------------------------------------------------
// Shared meta block — required for every .brbmod file
// ---------------------------------------------------------------------------

export interface BrbModMeta {
  /** Human-readable name, e.g. "King James Version" */
  name: string;

  /** Short key used as the translation ID in the UI, e.g. "KJV" */
  abbreviation: string;

  /** BCP-47 language tag, e.g. "en", "ru", "he", "el" */
  language: string;

  /**
   * Data format selector — determines how to parse the `data` block.
   *   "plain"  — BibleDataPlain  (simple string verses)
   *   "tagged" — BibleDataTagged (per-word Strong's tokens)
   */
  format: 'plain' | 'tagged';

  /**
   * Module schema version — increment if the format changes in a
   * backwards-incompatible way. Current version: 1.
   */
  version: number;

  /** Optional: copyright or license notice */
  copyright?: string;

  /** Optional: notes about the source, encoding, or tagging methodology */
  notes?: string;
}

// ---------------------------------------------------------------------------
// Plain format — no Strong's, just verse strings
// ---------------------------------------------------------------------------

/**
 * Plain data block.
 * Structure: { BookName: { "1": ["verse 1 text", "verse 2 text", ...], ... } }
 *
 * - Book names must match the canonical names in src/data/books.ts
 *   (e.g. "Genesis", "Matthew") for navigation to work correctly.
 * - Chapter keys are 1-indexed strings ("1", "2", ...).
 * - Each inner array index is the verse index (0-based), so element 0 = verse 1.
 */
export interface BibleDataPlain {
  [bookName: string]: {
    [chapter: string]: string[];
  };
}

// ---------------------------------------------------------------------------
// Tagged format — per-word tokens with Strong's numbers
// ---------------------------------------------------------------------------

/** A single word token with zero or more Strong's concordance numbers. */
export interface WordToken {
  /** The display word (may include punctuation). */
  word: string;

  /**
   * Strong's numbers attached to this word.
   * Prefix H = Hebrew (OT), G = Greek (NT).
   * Examples: ["H7225"], ["G2316"], ["H3068", "H430"] (compound), [] (untagged)
   */
  strongs: string[];
}

/** A single verse represented as an ordered array of word tokens. */
export type TaggedVerse = WordToken[];

/** A single book in tagged format. */
export interface BibleBookTagged {
  /** Canonical book name matching src/data/books.ts */
  name: string;

  /**
   * Array of chapters (0-indexed, so chapters[0] = chapter 1).
   * Each chapter is an array of TaggedVerse (0-indexed, so [0] = verse 1).
   */
  chapters: TaggedVerse[][];
}

/**
 * Tagged data block.
 * Top-level array of books in canonical Bible order.
 */
export type BibleDataTagged = BibleBookTagged[];

// ---------------------------------------------------------------------------
// The .brbmod envelope — the full file shape
// ---------------------------------------------------------------------------

/** .brbmod file with plain (untagged) Bible text. */
export interface BrbModPlain {
  meta: BrbModMeta & { format: 'plain' };
  data: BibleDataPlain;
}

/** .brbmod file with tagged (Strong's-annotated) Bible text. */
export interface BrbModTagged {
  meta: BrbModMeta & { format: 'tagged' };
  data: BibleDataTagged;
}

/** Union type — any valid .brbmod file. */
export type BrbMod = BrbModPlain | BrbModTagged;

// ---------------------------------------------------------------------------
// Type guard helpers
// ---------------------------------------------------------------------------

export function isBrbModPlain(mod: BrbMod): mod is BrbModPlain {
  return mod.meta.format === 'plain';
}

export function isBrbModTagged(mod: BrbMod): mod is BrbModTagged {
  return mod.meta.format === 'tagged';
}

/**
 * Minimal validation: checks that the required meta fields are present
 * and that the format value is one of the two known strings.
 * Throws a descriptive Error if invalid.
 */
export function validateBrbMod(raw: unknown): BrbMod {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('.brbmod: root value must be a JSON object');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj['meta'] !== 'object' || obj['meta'] === null) {
    throw new Error('.brbmod: missing or invalid "meta" block');
  }

  const meta = obj['meta'] as Record<string, unknown>;

  for (const field of ['name', 'abbreviation', 'language', 'format', 'version'] as const) {
    if (meta[field] === undefined || meta[field] === null) {
      throw new Error(`.brbmod: meta.${field} is required`);
    }
  }

  if (meta['format'] !== 'plain' && meta['format'] !== 'tagged') {
    throw new Error(`.brbmod: meta.format must be "plain" or "tagged", got "${meta['format']}"`);
  }

  if (typeof meta['version'] !== 'number') {
    throw new Error('.brbmod: meta.version must be a number');
  }

  if (!obj['data']) {
    throw new Error('.brbmod: missing "data" block');
  }

  return raw as BrbMod;
}
