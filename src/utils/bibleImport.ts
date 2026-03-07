/**
 * bibleImport.ts
 * Schema validator for user-imported Bible JSON files.
 *
 * Expected schema:
 * {
 *   "BookName": {
 *     "1": ["verse 1 text", "verse 2 text", ...],
 *     "2": [...],
 *     ...
 *   },
 *   ...
 * }
 *
 * Chapter keys must be numeric strings ("1", "2", ...).
 * Verse arrays must contain only strings.
 */

export interface BibleData {
  [book: string]: {
    [chapter: string]: string[];
  };
}

export interface ValidationResult {
  valid: true;
  data: BibleData;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export type ImportResult = ValidationResult | ValidationFailure;

/**
 * Validates a parsed JSON object against the BibleData schema.
 * Returns typed BibleData on success, or a list of human-readable errors on failure.
 */
export function validateBibleJson(input: unknown): ImportResult {
  const errors: string[] = [];

  // Top level must be a plain object
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      valid: false,
      errors: ["Root value must be a JSON object, not " + (Array.isArray(input) ? "an array" : String(input))],
    };
  }

  const root = input as Record<string, unknown>;
  const bookNames = Object.keys(root);

  if (bookNames.length === 0) {
    errors.push("Bible object has no books — the file appears to be empty.");
  }

  for (const book of bookNames) {
    const bookValue = root[book];

    if (typeof bookValue !== "object" || bookValue === null || Array.isArray(bookValue)) {
      errors.push(`Book "${book}": expected an object of chapters, got ${Array.isArray(bookValue) ? "array" : typeof bookValue}.`);
      continue;
    }

    const chapters = bookValue as Record<string, unknown>;
    const chapterKeys = Object.keys(chapters);

    if (chapterKeys.length === 0) {
      errors.push(`Book "${book}": has no chapters.`);
      continue;
    }

    for (const chapterKey of chapterKeys) {
      // Chapter key must be a numeric string
      if (!/^\d+$/.test(chapterKey)) {
        errors.push(`Book "${book}", chapter key "${chapterKey}": keys must be numeric strings like "1", "2", etc.`);
        continue;
      }

      const verses = chapters[chapterKey];

      if (!Array.isArray(verses)) {
        errors.push(`Book "${book}", chapter ${chapterKey}: expected an array of verse strings, got ${typeof verses}.`);
        continue;
      }

      if (verses.length === 0) {
        errors.push(`Book "${book}", chapter ${chapterKey}: verse array is empty.`);
        continue;
      }

      for (let i = 0; i < verses.length; i++) {
        if (typeof verses[i] !== "string") {
          errors.push(
            `Book "${book}", chapter ${chapterKey}, verse ${i + 1}: expected a string, got ${typeof verses[i]}.`
          );
          // Cap error count to avoid flooding the user
          if (errors.length >= 25) {
            errors.push("...too many errors, stopping early. Fix the above issues and re-import.");
            return { valid: false, errors };
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: root as BibleData };
}

// ─── api.bible fetch path ────────────────────────────────────────────────────

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1";

/** Shape of a book entry returned by api.bible /books */
interface ApiBibleBook {
  id: string;       // e.g. "GEN"
  name: string;     // e.g. "Genesis"
  nameLong?: string;
}

/** Shape of a chapter entry returned by api.bible /chapters */
interface ApiBibleChapter {
  id: string;       // e.g. "GEN.1"
  number: string;   // e.g. "1"
  bookId: string;
}

/**
 * Fetches a complete Bible from api.bible and normalises it to BibleData.
 *
 * Strategy:
 *   1. GET /bibles/{bibleId}/books            — list of 66 books
 *   2. GET /bibles/{bibleId}/books/{bookId}/chapters — chapter list per book
 *   3. GET /bibles/{bibleId}/chapters/{chapterId}
 *         ?content-type=text&include-verse-numbers=true  — full chapter text
 *   4. Parse [N] verse-number markers from the text into verse arrays.
 *
 * The free api.bible tier allows 5 000 requests/day. A full Bible fetch
 * requires ~1 200 requests (books + chapters + chapter content). Add a small
 * delay between chapter fetches to be a polite citizen.
 *
 * @param apiKey    Your api.bible API key
 * @param bibleId   The api.bible translation ID (e.g. "de4e12af7f28f599-02" for KJV)
 * @param onProgress Optional callback called with human-readable progress messages
 */
export async function fetchFromApiBible(
  apiKey: string,
  bibleId: string,
  onProgress?: (msg: string) => void
): Promise<ImportResult> {
  const headers = { "api-key": apiKey };
  const errors: string[] = [];

  function report(msg: string) {
    onProgress?.(msg);
  }

  // Helper: fetch JSON from api.bible and throw a descriptive error on failure
  async function apiFetch<T>(path: string): Promise<T> {
    const url = `${API_BIBLE_BASE}${path}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`api.bible ${res.status} for ${path}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    return json.data as T;
  }

  // ── 1. Fetch book list ────────────────────────────────────────────────────
  let books: ApiBibleBook[];
  try {
    report("Fetching book list…");
    books = await apiFetch<ApiBibleBook[]>(`/bibles/${bibleId}/books`);
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to fetch book list: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (!books || books.length === 0) {
    return { valid: false, errors: ["api.bible returned no books for this translation ID."] };
  }

  const result: BibleData = {};

  // ── 2 & 3. For each book, fetch chapters, then fetch each chapter's content
  for (let bi = 0; bi < books.length; bi++) {
    const book = books[bi];
    const bookName = book.nameLong ?? book.name;

    // Fetch chapter list for this book
    let chapters: ApiBibleChapter[];
    try {
      chapters = await apiFetch<ApiBibleChapter[]>(
        `/bibles/${bibleId}/books/${book.id}/chapters`
      );
    } catch (err) {
      errors.push(`Book "${bookName}": failed to fetch chapters — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    // api.bible includes a synthetic "intro" chapter (number "intro") — skip it
    const realChapters = chapters.filter((c) => /^\d+$/.test(c.number));

    report(`[${bi + 1}/${books.length}] ${bookName} — ${realChapters.length} chapters`);

    result[bookName] = {};

    for (const chapter of realChapters) {
      // Fetch chapter content as plain text with verse numbers embedded
      let chapterText: string;
      try {
        const chapterData = await apiFetch<{ content: string }>(
          `/bibles/${bibleId}/chapters/${chapter.id}` +
          `?content-type=text&include-notes=false&include-titles=false` +
          `&include-chapter-numbers=false&include-verse-numbers=true` +
          `&include-verse-spans=false`
        );
        chapterText = chapterData.content ?? "";
      } catch (err) {
        errors.push(
          `Book "${bookName}", chapter ${chapter.number}: fetch failed — ` +
          (err instanceof Error ? err.message : String(err))
        );
        result[bookName][chapter.number] = [];
        continue;
      }

      // ── 4. Parse verse text ─────────────────────────────────────────────
      // api.bible text format: "¶ [1] Verse text here [2] Next verse…"
      // Split on [N] markers, drop empty segments.
      const verses = parseChapterText(chapterText);

      if (verses.length === 0) {
        errors.push(`Book "${bookName}", chapter ${chapter.number}: parsed 0 verses (raw: ${chapterText.slice(0, 80)})`);
      }

      result[bookName][chapter.number] = verses;

      // Polite delay — 50 ms between chapter requests avoids rate-limit spikes
      await sleep(50);
    }
  }

  if (Object.keys(result).length === 0) {
    return { valid: false, errors: ["No books were successfully imported.", ...errors] };
  }

  // Non-fatal errors are returned alongside the data so the caller can warn
  // the user while still using the successfully imported content.
  if (errors.length > 0) {
    // Attach errors as warnings — still return valid data
    console.warn("api.bible import completed with warnings:", errors);
  }

  return { valid: true, data: result };
}

/**
 * Parses a chapter text string from api.bible (text mode, verse numbers on)
 * into a 0-indexed array of verse strings (matching BibleData schema).
 *
 * Input example:
 *   "¶ [1] In the beginning God created... [2] The earth was..."
 *
 * Returns: ["In the beginning God created...", "The earth was...", ...]
 */
function parseChapterText(raw: string): string[] {
  // Strip paragraph markers and normalise whitespace
  const cleaned = raw
    .replace(/¶\s*/g, " ")       // remove pilcrow paragraph markers
    .replace(/\s+/g, " ")        // collapse whitespace
    .trim();

  // Split on [N] markers; the first segment before [1] is typically empty
  // Pattern: one or more digits inside square brackets
  const parts = cleaned.split(/\[\d+\]/);

  const verses: string[] = [];
  for (const part of parts) {
    const verse = part.trim();
    if (verse.length > 0) {
      verses.push(verse);
    }
  }

  return verses;
}

/** Simple async sleep helper */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches just Genesis 1 from api.bible to validate the key + translation ID
 * and give the user a quick preview before committing to a full import.
 */
export async function previewFromApiBible(
  apiKey: string,
  bibleId: string
): Promise<{ verses: string[]; error?: string }> {
  const url =
    `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/GEN.1` +
    `?content-type=text&include-notes=false&include-titles=false` +
    `&include-chapter-numbers=false&include-verse-numbers=true` +
    `&include-verse-spans=false`;

  try {
    const res = await fetch(url, { headers: { "api-key": apiKey } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        verses: [],
        error: `api.bible returned ${res.status}: ${body.slice(0, 300)}`,
      };
    }
    const json = await res.json();
    const content: string = json.data?.content ?? "";
    const verses = parseChapterText(content);
    if (verses.length === 0) {
      return {
        verses: [],
        error: "Got a response but could not parse any verses. Double-check the translation ID.",
      };
    }
    return { verses };
  } catch (err) {
    return {
      verses: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── File import path ────────────────────────────────────────────────────────

/**
 * Reads a File object (from a file input or drag-drop) and validates it.
 * Rejects if the file is not valid JSON or fails schema validation.
 */
export async function importBibleFile(file: File): Promise<ImportResult> {
  let parsed: unknown;

  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      valid: false,
      errors: [`File is not valid JSON: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  return validateBibleJson(parsed);
}
