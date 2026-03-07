import { books } from '../data/books';

export interface RefSegment {
  type: 'ref';
  text: string;
  book: string;
  chapter: number;
  verse: number;
}

export interface TextSegment {
  type: 'text';
  text: string;
}

export type VerseSegment = TextSegment | RefSegment;

// Common abbreviations → canonical book names
const ABBREV_MAP: Record<string, string> = {
  'Gen': 'Genesis', 'Gen.': 'Genesis',
  'Ex': 'Exodus', 'Ex.': 'Exodus', 'Exo': 'Exodus', 'Exod': 'Exodus', 'Exod.': 'Exodus',
  'Lev': 'Leviticus', 'Lev.': 'Leviticus',
  'Num': 'Numbers', 'Num.': 'Numbers',
  'Deut': 'Deuteronomy', 'Deut.': 'Deuteronomy', 'Deu': 'Deuteronomy',
  'Josh': 'Joshua', 'Josh.': 'Joshua',
  'Judg': 'Judges', 'Judg.': 'Judges', 'Jdg': 'Judges',
  '1 Sam': '1 Samuel', '1Sam': '1 Samuel', '1 Sa': '1 Samuel',
  '2 Sam': '2 Samuel', '2Sam': '2 Samuel', '2 Sa': '2 Samuel',
  '1 Kgs': '1 Kings', '1Kgs': '1 Kings', '1 Ki': '1 Kings',
  '2 Kgs': '2 Kings', '2Kgs': '2 Kings', '2 Ki': '2 Kings',
  '1 Chr': '1 Chronicles', '1Chr': '1 Chronicles', '1 Ch': '1 Chronicles',
  '2 Chr': '2 Chronicles', '2Chr': '2 Chronicles', '2 Ch': '2 Chronicles',
  'Neh': 'Nehemiah', 'Neh.': 'Nehemiah',
  'Esth': 'Esther', 'Esth.': 'Esther',
  'Ps': 'Psalms', 'Ps.': 'Psalms', 'Psa': 'Psalms', 'Psalm': 'Psalms', 'Psa.': 'Psalms',
  'Prov': 'Proverbs', 'Prov.': 'Proverbs', 'Pro': 'Proverbs',
  'Eccl': 'Ecclesiastes', 'Eccl.': 'Ecclesiastes', 'Ecc': 'Ecclesiastes',
  'Song': 'Song of Solomon', 'Sol': 'Song of Solomon', 'SoS': 'Song of Solomon',
  'Isa': 'Isaiah', 'Isa.': 'Isaiah',
  'Jer': 'Jeremiah', 'Jer.': 'Jeremiah',
  'Lam': 'Lamentations', 'Lam.': 'Lamentations',
  'Ezek': 'Ezekiel', 'Ezek.': 'Ezekiel', 'Eze': 'Ezekiel',
  'Dan': 'Daniel', 'Dan.': 'Daniel',
  'Hos': 'Hosea', 'Hos.': 'Hosea',
  'Jon': 'Jonah', 'Jon.': 'Jonah',
  'Mic': 'Micah', 'Mic.': 'Micah',
  'Nah': 'Nahum', 'Nah.': 'Nahum',
  'Hab': 'Habakkuk', 'Hab.': 'Habakkuk',
  'Zeph': 'Zephaniah', 'Zeph.': 'Zephaniah', 'Zep': 'Zephaniah',
  'Hag': 'Haggai', 'Hag.': 'Haggai',
  'Zech': 'Zechariah', 'Zech.': 'Zechariah', 'Zec': 'Zechariah',
  'Mal': 'Malachi', 'Mal.': 'Malachi',
  'Matt': 'Matthew', 'Matt.': 'Matthew', 'Mt': 'Matthew',
  'Mk': 'Mark',
  'Lk': 'Luke',
  'Jn': 'John',
  'Rom': 'Romans', 'Rom.': 'Romans',
  '1 Cor': '1 Corinthians', '1Cor': '1 Corinthians',
  '2 Cor': '2 Corinthians', '2Cor': '2 Corinthians',
  'Gal': 'Galatians', 'Gal.': 'Galatians',
  'Eph': 'Ephesians', 'Eph.': 'Ephesians',
  'Phil': 'Philippians', 'Phil.': 'Philippians',
  'Col': 'Colossians', 'Col.': 'Colossians',
  '1 Thess': '1 Thessalonians', '1Thess': '1 Thessalonians', '1 Th': '1 Thessalonians',
  '2 Thess': '2 Thessalonians', '2Thess': '2 Thessalonians', '2 Th': '2 Thessalonians',
  '1 Tim': '1 Timothy', '1Tim': '1 Timothy',
  '2 Tim': '2 Timothy', '2Tim': '2 Timothy',
  'Tit': 'Titus',
  'Philem': 'Philemon', 'Phlm': 'Philemon',
  'Heb': 'Hebrews', 'Heb.': 'Hebrews',
  'Jas': 'James', 'Jas.': 'James',
  '1 Pet': '1 Peter', '1Pet': '1 Peter', '1 Pe': '1 Peter',
  '2 Pet': '2 Peter', '2Pet': '2 Peter', '2 Pe': '2 Peter',
  '1Jn': '1 John', '1 Jn': '1 John',
  '2Jn': '2 John', '2 Jn': '2 John',
  '3Jn': '3 John', '3 Jn': '3 John',
  'Rev': 'Revelation', 'Rev.': 'Revelation',
};

const BOOK_NAMES = new Set(books.map((b) => b.name));

function resolveBook(token: string): string | null {
  if (BOOK_NAMES.has(token)) return token;
  return ABBREV_MAP[token] ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// All known tokens sorted longest-first so greedy matching picks the most specific
const ALL_TOKENS = [
  ...books.map((b) => b.name),
  ...Object.keys(ABBREV_MAP),
].sort((a, b) => b.length - a.length);

const bookPattern = ALL_TOKENS.map(escapeRegex).join('|');

// Matches: <BookToken> <chapter>:<verse>(-<endVerse>)?
const REF_REGEX = new RegExp(
  `(${bookPattern})\\s+(\\d+):(\\d+)(?:-(\\d+))?`,
  'g'
);

export function parseVerseRefs(text: string): VerseSegment[] {
  const segments: VerseSegment[] = [];
  let lastIndex = 0;

  REF_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = REF_REGEX.exec(text)) !== null) {
    const [fullMatch, bookToken, chStr, vStr] = match;
    const book = resolveBook(bookToken);
    if (!book) continue;

    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    segments.push({
      type: 'ref',
      text: fullMatch,
      book,
      chapter: parseInt(chStr, 10),
      verse: parseInt(vStr, 10),
    });

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
}
