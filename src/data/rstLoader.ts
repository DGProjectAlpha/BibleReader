// ?url import: Vite copies the file as a static asset and returns its URL.
// This prevents Vite from parsing/bundling the large JSON during build.
import rstUrl from './rst_strong.json?url';

import type { WordToken, TaggedVerse, BibleBook } from './kjvLoader';
export type { WordToken, TaggedVerse, BibleBook };

// Maps English book names (used throughout the app) to Russian Synodal names in rst_strong.json
const EN_TO_RU: Record<string, string> = {
  'Genesis': 'Бытие',
  'Exodus': 'Исход',
  'Leviticus': 'Левит',
  'Numbers': 'Числа',
  'Deuteronomy': 'Второзаконие',
  'Joshua': 'Иисус Навин',
  'Judges': 'Судьи',
  'Ruth': 'Руфь',
  '1 Samuel': '1-я Царств',
  '2 Samuel': '2-я Царств',
  '1 Kings': '3-я Царств',
  '2 Kings': '4-я Царств',
  '1 Chronicles': '1-я Паралипоменон',
  '2 Chronicles': '2-я Паралипоменон',
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
  'Ezekiel': 'Иезекииль',
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
  'Matthew': 'От Матфея',
  'Mark': 'От Марка',
  'Luke': 'От Луки',
  'John': 'От Иоанна',
  'Acts': 'Деяния',
  'Romans': 'К Римлянам',
  '1 Corinthians': '1-е Коринфянам',
  '2 Corinthians': '2-е Коринфянам',
  'Galatians': 'К Галатам',
  'Ephesians': 'К Ефесянам',
  'Philippians': 'К Филиппийцам',
  'Colossians': 'К Колоссянам',
  '1 Thessalonians': '1-е Фессалоникийцам',
  '2 Thessalonians': '2-е Фессалоникийцам',
  '1 Timothy': '1-е Тимофею',
  '2 Timothy': '2-е Тимофею',
  'Titus': 'К Титу',
  'Philemon': 'К Филимону',
  'Hebrews': 'К Евреям',
  'James': 'Иакова',
  '1 Peter': '1-е Петра',
  '2 Peter': '2-е Петра',
  '1 John': '1-е Иоанна',
  '2 John': '2-е Иоанна',
  '3 John': '3-е Иоанна',
  'Jude': 'Иуды',
  'Revelation': 'Откровение',
};

function toRu(bookName: string): string {
  return EN_TO_RU[bookName] ?? bookName;
}

let _data: BibleBook[] = [];

/**
 * Fetch and cache RST (Russian Synodal with Strong's) data.
 * Must be awaited before calling any other export.
 */
export async function initRst(): Promise<void> {
  const res = await fetch(rstUrl as string);
  _data = (await res.json()) as BibleBook[];
}

/** Returns the raw bible array (empty until initRst resolves). */
export function getData(): BibleBook[] {
  return _data;
}

/**
 * Returns all word-tagged verses for a given book and chapter (1-indexed).
 * Returns [] if not found.
 */
export function getChapter(bookName: string, chapter: number): TaggedVerse[] {
  const book = _data.find((b) => b.name === toRu(bookName));
  if (!book) return [];
  return book.chapters[chapter - 1] ?? [];
}

/**
 * Returns plain text verses (word tokens joined) for a given book and chapter.
 */
export function getChapterText(bookName: string, chapter: number): string[] {
  return getChapter(bookName, chapter).map((verse) =>
    verse.map((t) => t.word).join(' ')
  );
}

/**
 * Returns all chapter arrays for a book (word-tagged).
 */
export function getBook(bookName: string): TaggedVerse[][] {
  const book = _data.find((b) => b.name === toRu(bookName));
  return book ? book.chapters : [];
}
