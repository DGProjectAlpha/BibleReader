// TSK (Treasury of Scripture Knowledge) cross-reference loader
// Data format: { "Gen.1.1": ["Ps.96.5", ...], ... }

// ?url import: Vite copies the 7MB file as a static asset instead of bundling it.
import tskUrl from './tskCrossRefs.json?url';

let TSK: Record<string, string[]> = {};

/**
 * Fetch and cache TSK data. Must be awaited before calling getTSKRefs().
 */
export async function initTsk(): Promise<void> {
  const res = await fetch(tskUrl as string);
  TSK = (await res.json()) as Record<string, string[]>;
}

// Map from canonical app book names → TSK abbreviations
const BOOK_TO_TSK: Record<string, string> = {
  'Genesis': 'Gen', 'Exodus': 'Exod', 'Leviticus': 'Lev', 'Numbers': 'Num',
  'Deuteronomy': 'Deut', 'Joshua': 'Josh', 'Judges': 'Judg', 'Ruth': 'Ruth',
  '1 Samuel': '1Sam', '2 Samuel': '2Sam', '1 Kings': '1Kgs', '2 Kings': '2Kgs',
  '1 Chronicles': '1Chr', '2 Chronicles': '2Chr', 'Ezra': 'Ezra',
  'Nehemiah': 'Neh', 'Esther': 'Esth', 'Job': 'Job', 'Psalms': 'Ps',
  'Proverbs': 'Prov', 'Ecclesiastes': 'Eccl', 'Song of Solomon': 'Song',
  'Isaiah': 'Isa', 'Jeremiah': 'Jer', 'Lamentations': 'Lam', 'Ezekiel': 'Ezek',
  'Daniel': 'Dan', 'Hosea': 'Hos', 'Joel': 'Joel', 'Amos': 'Amos',
  'Obadiah': 'Obad', 'Jonah': 'Jonah', 'Micah': 'Mic', 'Nahum': 'Nah',
  'Habakkuk': 'Hab', 'Zephaniah': 'Zeph', 'Haggai': 'Hag', 'Zechariah': 'Zech',
  'Malachi': 'Mal', 'Matthew': 'Matt', 'Mark': 'Mark', 'Luke': 'Luke',
  'John': 'John', 'Acts': 'Acts', 'Romans': 'Rom', '1 Corinthians': '1Cor',
  '2 Corinthians': '2Cor', 'Galatians': 'Gal', 'Ephesians': 'Eph',
  'Philippians': 'Phil', 'Colossians': 'Col', '1 Thessalonians': '1Thess',
  '2 Thessalonians': '2Thess', '1 Timothy': '1Tim', '2 Timothy': '2Tim',
  'Titus': 'Titus', 'Philemon': 'Phlm', 'Hebrews': 'Heb', 'James': 'Jas',
  '1 Peter': '1Pet', '2 Peter': '2Pet', '1 John': '1John', '2 John': '2John',
  '3 John': '3John', 'Jude': 'Jude', 'Revelation': 'Rev',
};

// Reverse map: TSK abbreviation → canonical book name
const TSK_TO_BOOK: Record<string, string> = Object.fromEntries(
  Object.entries(BOOK_TO_TSK).map(([full, abbr]) => [abbr, full])
);

export interface TSKRef {
  book: string;
  chapter: number;
  verse: number;
  label: string; // e.g. "John 3:16"
}

/**
 * Parse a TSK ref string like "Gen.1.1" or "1Cor.3.16" into a structured object.
 * Returns null if the ref cannot be parsed or the book is unknown.
 */
export function parseTSKRef(ref: string): TSKRef | null {
  const lastDot = ref.lastIndexOf('.');
  const secondLastDot = ref.lastIndexOf('.', lastDot - 1);
  if (lastDot === -1 || secondLastDot === -1) return null;

  const abbr = ref.slice(0, secondLastDot);
  const chapter = parseInt(ref.slice(secondLastDot + 1, lastDot), 10);
  const verse = parseInt(ref.slice(lastDot + 1), 10);

  if (isNaN(chapter) || isNaN(verse)) return null;

  const book = TSK_TO_BOOK[abbr];
  if (!book) return null;

  return { book, chapter, verse, label: `${book} ${chapter}:${verse}` };
}

/**
 * Get TSK cross-references for a verse.
 * Returns an array of parsed TSKRef objects (unknown refs filtered out).
 */
export function getTSKRefs(book: string, chapter: number, verse: number): TSKRef[] {
  const abbr = BOOK_TO_TSK[book];
  if (!abbr) return [];

  const key = `${abbr}.${chapter}.${verse}`;
  const raw = TSK[key];
  if (!raw) return [];

  return raw
    .map(parseTSKRef)
    .filter((r): r is TSKRef => r !== null);
}
