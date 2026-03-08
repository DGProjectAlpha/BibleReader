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
/**
 * Alias map: common non-English and variant book names → canonical English name.
 * Covers Russian Synodal (RST) names and common English variants.
 * Keys are lowercased and stripped of spaces/punctuation for matching.
 */
const BOOK_ALIASES: Record<string, string> = {
  // ── Russian Synodal (RST) — full names ─────────────────────────────────────
  'бытие': 'Genesis',
  'исход': 'Exodus',
  'левит': 'Leviticus',
  'числа': 'Numbers',
  'второзаконие': 'Deuteronomy',
  'иисусанавин': 'Joshua',
  'иисуснавин': 'Joshua',
  'судьи': 'Judges',
  'руфь': 'Ruth',
  '1яцарств': '1 Samuel',
  '2яцарств': '2 Samuel',
  '3яцарств': '1 Kings',
  '4яцарств': '2 Kings',
  '1япаралипоменон': '1 Chronicles',
  '2япаралипоменон': '2 Chronicles',
  'ездра': 'Ezra',
  'неемия': 'Nehemiah',
  'есфирь': 'Esther',
  'иов': 'Job',
  'псалтирь': 'Psalms',
  'псалмы': 'Psalms',
  'притчи': 'Proverbs',
  'екклесиаст': 'Ecclesiastes',
  'екклезиаст': 'Ecclesiastes',
  'песняпесней': 'Song of Solomon',
  'песньпесней': 'Song of Solomon',
  'исаия': 'Isaiah',
  'иеремия': 'Jeremiah',
  'плачиеремии': 'Lamentations',
  'иезекиль': 'Ezekiel',
  'иезекииль': 'Ezekiel',
  'даниил': 'Daniel',
  'осия': 'Hosea',
  'иоиль': 'Joel',
  'амос': 'Amos',
  'авдий': 'Obadiah',
  'иона': 'Jonah',
  'михей': 'Micah',
  'наум': 'Nahum',
  'аввакум': 'Habakkuk',
  'софония': 'Zephaniah',
  'аггей': 'Haggai',
  'захария': 'Zechariah',
  'малахия': 'Malachi',
  // NT
  'отматфея': 'Matthew',
  'матфея': 'Matthew',
  'матфей': 'Matthew',
  'отмарка': 'Mark',
  'марка': 'Mark',
  'отлуки': 'Luke',
  'луки': 'Luke',
  'отиоанна': 'John',
  'иоанна': 'John',
  'деяния': 'Acts',
  'деянияапостолов': 'Acts',
  'римлянам': 'Romans',
  'кримлянам': 'Romans',           // "К Римлянам" (RST "To the Romans")
  '1екоринфянам': '1 Corinthians',
  '1коринфянам': '1 Corinthians',
  '2екоринфянам': '2 Corinthians',
  '2коринфянам': '2 Corinthians',
  'галатам': 'Galatians',
  'кгалатам': 'Galatians',         // "К Галатам"
  'ефесянам': 'Ephesians',
  'кефесянам': 'Ephesians',        // "К Ефесянам"
  'филиппийцам': 'Philippians',
  'кфилиппийцам': 'Philippians',   // "К Филиппийцам"
  'колоссянам': 'Colossians',
  'кколоссянам': 'Colossians',     // "К Колоссянам"
  '1ефессалоникийцам': '1 Thessalonians',
  '1фессалоникийцам': '1 Thessalonians',
  '2ефессалоникийцам': '2 Thessalonians',
  '2фессалоникийцам': '2 Thessalonians',
  '1етимофею': '1 Timothy',
  '1тимофею': '1 Timothy',
  '2етимофею': '2 Timothy',
  '2тимофею': '2 Timothy',
  'титу': 'Titus',
  'ктиту': 'Titus',                // "К Титу"
  'филимону': 'Philemon',
  'кфилимону': 'Philemon',         // "К Филимону"
  'евреям': 'Hebrews',
  'кевреям': 'Hebrews',            // "К Евреям"
  'иакова': 'James',
  '1епетра': '1 Peter',
  '1петра': '1 Peter',
  '2епетра': '2 Peter',
  '2петра': '2 Peter',
  '1еиоанна': '1 John',
  '1иоанна': '1 John',
  '2еиоанна': '2 John',
  '2иоанна': '2 John',
  '3еиоанна': '3 John',
  '3иоанна': '3 John',
  'иуды': 'Jude',
  'откровение': 'Revelation',
  'откровениеиоанна': 'Revelation',

  // ── Russian Synodal — short abbreviations (from BibleQuote6 ShortName field) ─
  // OT
  'быт': 'Genesis',    'бт': 'Genesis',
  'исх': 'Exodus',
  'лев': 'Leviticus',  'лв': 'Leviticus',
  'чис': 'Numbers',    'чс': 'Numbers',    'числ': 'Numbers',
  'втор': 'Deuteronomy', 'вт': 'Deuteronomy', 'втрзк': 'Deuteronomy',
  'нав': 'Joshua',     'ииснав': 'Joshua',  'иисус': 'Joshua',   'навин': 'Joshua',
  'суд': 'Judges',     'сд': 'Judges',
  'руф': 'Ruth',       'рф': 'Ruth',
  '1цар': '1 Samuel',  '1ц': '1 Samuel',   '1цр': '1 Samuel',   '1царств': '1 Samuel',
  '2цар': '2 Samuel',  '2ц': '2 Samuel',   '2цр': '2 Samuel',   '2царств': '2 Samuel',
  '3цар': '1 Kings',   '3ц': '1 Kings',    '3цр': '1 Kings',    '3царств': '1 Kings',
  '4цар': '2 Kings',   '4ц': '2 Kings',    '4цр': '2 Kings',    '4царств': '2 Kings',
  '1пар': '1 Chronicles', '1пр': '1 Chronicles',
  '2пар': '2 Chronicles', '2пр': '2 Chronicles',
  'езд': 'Ezra',       'ездр': 'Ezra',     'ез': 'Ezra',
  'неем': 'Nehemiah',  'нм': 'Nehemiah',
  'есф': 'Esther',     'ес': 'Esther',
  'ив': 'Job',
  'пс': 'Psalms',      'псал': 'Psalms',   'псалт': 'Psalms',   'псл': 'Psalms',   'псалом': 'Psalms',
  'прит': 'Proverbs',  'притч': 'Proverbs', 'притча': 'Proverbs', 'пр': 'Proverbs',
  'еккл': 'Ecclesiastes', 'екк': 'Ecclesiastes', 'ек': 'Ecclesiastes',
  'песн': 'Song of Solomon', 'пес': 'Song of Solomon', 'псн': 'Song of Solomon',
  'песни': 'Song of Solomon', 'песнпесней': 'Song of Solomon',
  'ис': 'Isaiah',      'иса': 'Isaiah',    'исайя': 'Isaiah',
  'иер': 'Jeremiah',   'иерем': 'Jeremiah',
  'плач': 'Lamentations', 'пл': 'Lamentations', 'плч': 'Lamentations', 'плиер': 'Lamentations',
  'иез': 'Ezekiel',    'иезек': 'Ezekiel', 'из': 'Ezekiel',
  'дан': 'Daniel',     'дн': 'Daniel',     'днл': 'Daniel',
  'ос': 'Hosea',
  'иоил': 'Joel',      'ил': 'Joel',
  'ам': 'Amos',        'амс': 'Amos',
  'авд': 'Obadiah',
  'ион': 'Jonah',
  'мих': 'Micah',      'мх': 'Micah',
  'авв': 'Habakkuk',   'аввак': 'Habakkuk',
  'соф': 'Zephaniah',  'софон': 'Zephaniah',
  'агг': 'Haggai',
  'зах': 'Zechariah',  'захар': 'Zechariah', 'зхр': 'Zechariah',
  'мал': 'Malachi',    'малах': 'Malachi',   'млх': 'Malachi',
  // NT
  'мф': 'Matthew',     'мт': 'Matthew',    'мтф': 'Matthew',
  'мат': 'Matthew',    'матф': 'Matthew',
  'мк': 'Mark',        'мр': 'Mark',       'мрк': 'Mark',
  'мар': 'Mark',       'марк': 'Mark',
  'лк': 'Luke',        'лук': 'Luke',
  'ин': 'John',        'иоан': 'John',     'иоанн': 'John',
  'деян': 'Acts',      'дея': 'Acts',      'да': 'Acts',
  'рим': 'Romans',     'римл': 'Romans',
  '1кор': '1 Corinthians',  '1коринф': '1 Corinthians',
  '2кор': '2 Corinthians',  '2коринф': '2 Corinthians',
  'гал': 'Galatians',  'галат': 'Galatians',
  'еф': 'Ephesians',   'ефес': 'Ephesians',
  'флп': 'Philippians', 'фил': 'Philippians', 'филип': 'Philippians',
  'кол': 'Colossians', 'колос': 'Colossians',
  '1фес': '1 Thessalonians', '1фесс': '1 Thessalonians', '1сол': '1 Thessalonians',
  '2фес': '2 Thessalonians', '2фесс': '2 Thessalonians', '2сол': '2 Thessalonians',
  '1тим': '1 Timothy', '1тимоф': '1 Timothy',
  '2тим': '2 Timothy', '2тимоф': '2 Timothy',
  'тит': 'Titus',
  'флм': 'Philemon',   'филимон': 'Philemon',
  'евр': 'Hebrews',
  'иак': 'James',      'иаков': 'James',   'ик': 'James',
  '1пет': '1 Peter',   '1петр': '1 Peter', '1пт': '1 Peter',  '1птр': '1 Peter',
  '2пет': '2 Peter',   '2петр': '2 Peter', '2пт': '2 Peter',  '2птр': '2 Peter',
  '1ин': '1 John',     '1иоан': '1 John',  '1иоанн': '1 John',
  '2ин': '2 John',     '2иоан': '2 John',  '2иоанн': '2 John',
  '3ин': '3 John',     '3иоан': '3 John',  '3иоанн': '3 John',
  'иуд': 'Jude',       'иуда': 'Jude',     'ид': 'Jude',
  'откр': 'Revelation', 'отк': 'Revelation', 'откровен': 'Revelation',
  'апок': 'Revelation', 'апокалипсис': 'Revelation',
  '1солунянам': '1 Thessalonians',
  '2солунянам': '2 Thessalonians',

  // ── English abbreviations (common short forms not already matched by CI) ──────
  'ge': 'Genesis',   'gen': 'Genesis',    'gn': 'Genesis',
  'ex': 'Exodus',    'exo': 'Exodus',     'exod': 'Exodus',
  'le': 'Leviticus', 'lev': 'Leviticus',  'lv': 'Leviticus',  'levit': 'Leviticus',
  'nu': 'Numbers',   'num': 'Numbers',    'nm': 'Numbers',    'numb': 'Numbers',
  'de': 'Deuteronomy', 'deu': 'Deuteronomy', 'deut': 'Deuteronomy', 'dt': 'Deuteronomy', 'deuteron': 'Deuteronomy',
  'jos': 'Joshua',   'josh': 'Joshua',
  'jdg': 'Judges',   'judg': 'Judges',    'judge': 'Judges',
  'ru': 'Ruth',      'rth': 'Ruth',       'rt': 'Ruth',
  '1sa': '1 Samuel', '1sam': '1 Samuel',  '1s': '1 Samuel',   '1sm': '1 Samuel',  '1sml': '1 Samuel',
  '2sa': '2 Samuel', '2sam': '2 Samuel',  '2s': '2 Samuel',   '2sm': '2 Samuel',  '2sml': '2 Samuel',
  '1ki': '1 Kings',  '1k': '1 Kings',     '1kn': '1 Kings',   '1kg': '1 Kings',   '1king': '1 Kings',  '1kng': '1 Kings',
  '2ki': '2 Kings',  '2k': '2 Kings',     '2kn': '2 Kings',   '2kg': '2 Kings',   '2king': '2 Kings',  '2kng': '2 Kings',
  '1ch': '1 Chronicles', '1chr': '1 Chronicles', '1chron': '1 Chronicles',
  '2ch': '2 Chronicles', '2chr': '2 Chronicles', '2chron': '2 Chronicles',
  'ezr': 'Ezra',
  'ne': 'Nehemiah',  'neh': 'Nehemiah',   'nehem': 'Nehemiah',
  'es': 'Esther',    'est': 'Esther',     'esth': 'Esther',
  'jb': 'Job',
  'ps': 'Psalms',    'psa': 'Psalms',     'psal': 'Psalms',   'psalm': 'Psalms',
  'pr': 'Proverbs',  'pro': 'Proverbs',   'prov': 'Proverbs', 'proverb': 'Proverbs',
  'ec': 'Ecclesiastes', 'ecc': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'ecclesia': 'Ecclesiastes',
  'sol': 'Song of Solomon', 'song': 'Song of Solomon', 'songs': 'Song of Solomon',
  'ss': 'Song of Solomon', 'songofsongsongs': 'Song of Solomon',
  'songofsongsong': 'Song of Solomon', 'songofsongs': 'Song of Solomon',
  'canticles': 'Song of Solomon',
  'is': 'Isaiah',    'isa': 'Isaiah',
  'je': 'Jeremiah',  'jer': 'Jeremiah',   'jerem': 'Jeremiah',
  'la': 'Lamentations', 'lam': 'Lamentations', 'lament': 'Lamentations', 'lamentation': 'Lamentations',
  'ez': 'Ezekiel',   'eze': 'Ezekiel',    'ezek': 'Ezekiel',
  'da': 'Daniel',    'dan': 'Daniel',
  'ho': 'Hosea',     'hos': 'Hosea',
  'am': 'Amos',      'amo': 'Amos',
  'ob': 'Obadiah',   'oba': 'Obadiah',    'obad': 'Obadiah',
  'jnh': 'Jonah',    'jon': 'Jonah',      'jona': 'Jonah',
  'mi': 'Micah',     'mic': 'Micah',
  'na': 'Nahum',     'nah': 'Nahum',
  'hab': 'Habakkuk', 'habak': 'Habakkuk',
  'ze': 'Zechariah', 'zec': 'Zechariah',  'zech': 'Zechariah', 'zxr': 'Zechariah',
  'zep': 'Zephaniah', 'zeph': 'Zephaniah',
  'hag': 'Haggai',
  'mal': 'Malachi',
  'ma': 'Matthew',   'mat': 'Matthew',    'matt': 'Matthew',  'mt': 'Matthew',
  'mr': 'Mark',      'mrk': 'Mark',       'mar': 'Mark',      'mk': 'Mark',
  'lu': 'Luke',      'luk': 'Luke',       'lk': 'Luke',
  'jn': 'John',      'jno': 'John',       'jo': 'John',       'joh': 'John',
  'ac': 'Acts',      'act': 'Acts',
  'ro': 'Romans',    'rom': 'Romans',
  '1co': '1 Corinthians', '1cor': '1 Corinthians', '1corinth': '1 Corinthians',
  '2co': '2 Corinthians', '2cor': '2 Corinthians', '2corinth': '2 Corinthians',
  'ga': 'Galatians', 'gal': 'Galatians',  'galat': 'Galatians',
  'ep': 'Ephesians', 'eph': 'Ephesians',  'ephes': 'Ephesians',
  'ph': 'Philippians', 'phi': 'Philippians', 'phil': 'Philippians', 'php': 'Philippians', 'philip': 'Philippians',
  'col': 'Colossians', 'colos': 'Colossians',
  '1th': '1 Thessalonians', '1thes': '1 Thessalonians', '1thess': '1 Thessalonians',
  '2th': '2 Thessalonians', '2thes': '2 Thessalonians', '2thess': '2 Thessalonians',
  '1ti': '1 Timothy', '1tim': '1 Timothy',
  '2ti': '2 Timothy', '2tim': '2 Timothy',
  'ti': 'Titus',     'tit': 'Titus',
  'phm': 'Philemon', 'phlm': 'Philemon',  'phile': 'Philemon',
  'he': 'Hebrews',   'heb': 'Hebrews',   'hebr': 'Hebrews',
  'ja': 'James',     'jam': 'James',      'jas': 'James',     'jms': 'James',
  '1pe': '1 Peter',  '1pet': '1 Peter',
  '2pe': '2 Peter',  '2pet': '2 Peter',
  '1jn': '1 John',   '1jno': '1 John',   '1jo': '1 John',    '1joh': '1 John',
  '2jn': '2 John',   '2jno': '2 John',   '2jo': '2 John',    '2joh': '2 John',
  '3jn': '3 John',   '3jno': '3 John',   '3jo': '3 John',    '3joh': '3 John',
  'jd': 'Jude',      'jud': 'Jude',
  're': 'Revelation', 'rev': 'Revelation', 'rv': 'Revelation',
  'revelations': 'Revelation', 'ecclesiasticus': 'Ecclesiastes',
};

function normalizeBookName(name: string, warnings?: string[]): string {
  // 1. Exact match
  const exact = canonicalBooks.find((b) => b.name === name);
  if (exact) return exact.name;

  // 2. Case-insensitive match
  const lower = name.toLowerCase();
  const ci = canonicalBooks.find((b) => b.name.toLowerCase() === lower);
  if (ci) return ci.name;

  // 3. Strip spaces/punctuation and check alias map (handles Russian, variant names)
  const stripped = name.toLowerCase().replace(/[.\s\-–]/g, '');
  if (BOOK_ALIASES[stripped]) return BOOK_ALIASES[stripped];

  // 4. Strip common English ordinal prefixes and compare to canonical
  const stripEn = (s: string) =>
    s.toLowerCase().replace(/[.\s]/g, '').replace(/^(first|second|third|1st|2nd|3rd)/, (m) => {
      if (m === 'first' || m === '1st') return '1';
      if (m === 'second' || m === '2nd') return '2';
      if (m === 'third' || m === '3rd') return '3';
      return m;
    });
  const fuzzy = canonicalBooks.find((b) => stripEn(b.name) === stripEn(name));
  if (fuzzy) return fuzzy.name;

  // 5. No canonical match found — this book will not appear in the sidebar.
  // Surface a warning rather than failing silently.
  const msg = `Book name "${name}" could not be matched to a canonical Bible book. It will be skipped in navigation.`;
  console.warn(`[bibleLoader] normalizeBookName: ${msg}`);
  if (warnings) warnings.push(msg);
  return name;
}

/**
 * Given a plain BibleData object (as imported from JSON), return a map of
 * canonical English book name → original imported key for every entry where
 * the two differ (i.e. the imported key was a non-English or variant name).
 *
 * Example input keys: ["Бытие", "Исход", ...]
 * Example output:     { "Genesis": "Бытие", "Exodus": "Исход", ... }
 *
 * Books whose imported key already matches the canonical name are excluded
 * from the map since there is nothing to localise.
 */
export function extractBookNames(data: BibleData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const originalKey of Object.keys(data)) {
    const canonical = normalizeBookName(originalKey);
    if (canonical !== originalKey) {
      result[canonical] = originalKey;
    }
  }
  return result;
}

/**
 * Register a custom (user-imported) translation so it can be used in panes.
 * Converts plain string verses into TaggedVerse format (each word as a token
 * with no Strong's numbers, since custom bibles are untagged).
 */
export function registerCustomTranslation(abbreviation: string, data: BibleData): string[] {
  const warnings: string[] = [];

  // --- INSTRUMENTATION: log raw incoming data shape ---
  console.log(`[registerCustomTranslation] called for "${abbreviation}"`);
  console.log(`[registerCustomTranslation] data type: ${typeof data}`);
  console.log(`[registerCustomTranslation] data === null: ${data === null}`);
  if (data && typeof data === 'object') {
    const topKeys = Object.keys(data);
    console.log(`[registerCustomTranslation] top-level key count: ${topKeys.length}`);
    console.log(`[registerCustomTranslation] first 5 top-level keys:`, topKeys.slice(0, 5));
    // Detect double-wrap: if keys are "meta" and "data", the caller passed the envelope
    if (topKeys.includes('meta') || topKeys.includes('data')) {
      console.error(`[registerCustomTranslation] *** DOUBLE-WRAP DETECTED *** — "data" contains "meta" or "data" keys. Caller is passing the import envelope instead of the inner BibleData!`);
    }
    // Check first value shape
    const firstKey = topKeys[0];
    if (firstKey) {
      const firstVal = (data as Record<string, unknown>)[firstKey];
      console.log(`[registerCustomTranslation] typeof data["${firstKey}"]: ${typeof firstVal}`);
      if (firstVal && typeof firstVal === 'object') {
        const chapterKeys = Object.keys(firstVal as object);
        console.log(`[registerCustomTranslation] data["${firstKey}"] chapter keys:`, chapterKeys.slice(0, 5));
        const firstChKey = chapterKeys[0];
        if (firstChKey) {
          const firstChVal = (firstVal as Record<string, unknown>)[firstChKey];
          console.log(`[registerCustomTranslation] data["${firstKey}"]["${firstChKey}"] type: ${typeof firstChVal}, isArray: ${Array.isArray(firstChVal)}`);
          if (Array.isArray(firstChVal) && firstChVal.length > 0) {
            console.log(`[registerCustomTranslation] first verse sample:`, firstChVal[0]);
          }
        }
      }
    }
  }
  // --- END INSTRUMENTATION ---

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
    // If the module embeds a pre-resolved English canonical name (e.g. RST brbmod adds
    // nameEn: "Genesis" via the build script), use it directly to skip alias lookup entirely.
    const nameEn = (bookEntry as unknown as Record<string, unknown>)['nameEn'];
    if (typeof nameEn === 'string') {
      const directMatch = canonicalBooks.find((b) => b.name === nameEn);
      if (directMatch) {
        if (directMatch.name !== bookEntry.name) {
          console.log(`[bibleLoader] tagged book "${bookEntry.name}" resolved via nameEn → "${directMatch.name}"`);
        }
        return { name: directMatch.name, chapters: bookEntry.chapters };
      }
    }
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

/**
 * Canonical Russian book names for the SYN (Russian Synodal) translation.
 * Keyed by canonical English name → Russian display name.
 */
const RST_BOOK_NAMES: Record<string, string> = {
  // Old Testament
  'Genesis': 'Бытие',
  'Exodus': 'Исход',
  'Leviticus': 'Левит',
  'Numbers': 'Числа',
  'Deuteronomy': 'Второзаконие',
  'Joshua': 'Иисус Навин',
  'Judges': 'Судьи',
  'Ruth': 'Руфь',
  '1 Samuel': '1 Царств',
  '2 Samuel': '2 Царств',
  '1 Kings': '3 Царств',
  '2 Kings': '4 Царств',
  '1 Chronicles': '1 Паралипоменон',
  '2 Chronicles': '2 Паралипоменон',
  'Ezra': 'Ездра',
  'Nehemiah': 'Неемия',
  'Esther': 'Есфирь',
  'Job': 'Иов',
  'Psalms': 'Псалтирь',
  'Proverbs': 'Притчи',
  'Ecclesiastes': 'Екклесиаст',
  'Song of Solomon': 'Песня Песней',
  'Isaiah': 'Исаия',
  'Jeremiah': 'Иеремия',
  'Lamentations': 'Плач Иеремии',
  'Ezekiel': 'Иезекиль',
  'Daniel': 'Даниил',
  'Hosea': 'Осия',
  'Joel': 'Иоиль',
  'Amos': 'Амос',
  'Obadiah': 'Авдий',
  'Jonah': 'Иона',
  'Micah': 'Михей',
  'Nahum': 'Наум',
  'Habakkuk': 'Аввакум',
  'Zephaniah': 'Софония',
  'Haggai': 'Аггей',
  'Zechariah': 'Захария',
  'Malachi': 'Малахия',
  // New Testament
  'Matthew': 'Матфей',
  'Mark': 'Марк',
  'Luke': 'Лука',
  'John': 'Иоанн',
  'Acts': 'Деяния',
  'Romans': 'Римлянам',
  '1 Corinthians': '1 Коринфянам',
  '2 Corinthians': '2 Коринфянам',
  'Galatians': 'Галатам',
  'Ephesians': 'Ефесянам',
  'Philippians': 'Филиппийцам',
  'Colossians': 'Колоссянам',
  '1 Thessalonians': '1 Фессалоникийцам',
  '2 Thessalonians': '2 Фессалоникийцам',
  '1 Timothy': '1 Тимофею',
  '2 Timothy': '2 Тимофею',
  'Titus': 'Титу',
  'Philemon': 'Филимону',
  'Hebrews': 'Евреям',
  'James': 'Иакова',
  '1 Peter': '1 Петра',
  '2 Peter': '2 Петра',
  '1 John': '1 Иоанна',
  '2 John': '2 Иоанна',
  '3 John': '3 Иоанна',
  'Jude': 'Иуды',
  'Revelation': 'Откровение',
};

/** Book name maps for built-in translations that are not English. */
const BUILTIN_BOOK_NAMES: Record<string, Record<string, string>> = {
  SYN: RST_BOOK_NAMES,
};

/**
 * Returns localized book names for a built-in translation, or null if the
 * translation uses English names (KJV, ASV) or is not recognized.
 */
export function getBuiltinBookNames(translation: Translation): Record<string, string> | null {
  return BUILTIN_BOOK_NAMES[translation] ?? null;
}
