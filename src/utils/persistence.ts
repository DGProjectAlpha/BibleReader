/**
 * persistence.ts
 *
 * Thin wrapper around @tauri-apps/plugin-store.
 * All Phase 5 data (notes, highlights, bookmarks) flows through here.
 *
 * Store file layout on disk (inside Tauri's app data dir):
 *   bible-reader.json  — single store file for all persisted data
 *
 * Keys:
 *   "notes"      → Record<string, string>      verse key → markdown text
 *   "highlights" → Record<string, string>      verse key → color string
 *   "bookmarks"  → BookmarkEntry[]
 *
 * Verse key format: "<Book>.<chapter>.<verse>"  e.g. "Genesis.1.1"
 */

import { load, Store } from '@tauri-apps/plugin-store';

const STORE_FILE = 'bible-reader.json';

let _store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await load(STORE_FILE, { autoSave: true, defaults: {} });
  }
  return _store;
}

/** Build the canonical key for a verse. */
export function verseKey(book: string, chapter: number, verse: number): string {
  return `${book}.${chapter}.${verse}`;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function getNotes(): Promise<Record<string, string>> {
  const store = await getStore();
  return (await store.get<Record<string, string>>('notes')) ?? {};
}

export async function setNote(key: string, text: string): Promise<void> {
  const store = await getStore();
  const notes = (await store.get<Record<string, string>>('notes')) ?? {};
  notes[key] = text;
  await store.set('notes', notes);
}

export async function deleteNote(key: string): Promise<void> {
  const store = await getStore();
  const notes = (await store.get<Record<string, string>>('notes')) ?? {};
  delete notes[key];
  await store.set('notes', notes);
}

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export async function getHighlights(): Promise<Record<string, HighlightColor>> {
  const store = await getStore();
  return (await store.get<Record<string, HighlightColor>>('highlights')) ?? {};
}

export async function setHighlight(key: string, color: HighlightColor): Promise<void> {
  const store = await getStore();
  const highlights = (await store.get<Record<string, HighlightColor>>('highlights')) ?? {};
  highlights[key] = color;
  await store.set('highlights', highlights);
}

export async function clearHighlight(key: string): Promise<void> {
  const store = await getStore();
  const highlights = (await store.get<Record<string, HighlightColor>>('highlights')) ?? {};
  delete highlights[key];
  await store.set('highlights', highlights);
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export interface BookmarkEntry {
  id: string;       // crypto.randomUUID()
  book: string;
  chapter: number;
  verse: number;
  label?: string;   // optional user label
  createdAt: number; // Date.now()
}

export async function getBookmarks(): Promise<BookmarkEntry[]> {
  const store = await getStore();
  return (await store.get<BookmarkEntry[]>('bookmarks')) ?? [];
}

export async function addBookmark(
  entry: Omit<BookmarkEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<BookmarkEntry> {
  const store = await getStore();
  const bookmarks = (await store.get<BookmarkEntry[]>('bookmarks')) ?? [];
  const newEntry: BookmarkEntry = {
    ...entry,
    id: entry.id ?? crypto.randomUUID(),
    createdAt: entry.createdAt ?? Date.now(),
  };
  bookmarks.push(newEntry);
  await store.set('bookmarks', bookmarks);
  return newEntry;
}

export async function removeBookmark(id: string): Promise<void> {
  const store = await getStore();
  const bookmarks = (await store.get<BookmarkEntry[]>('bookmarks')) ?? [];
  await store.set('bookmarks', bookmarks.filter((b) => b.id !== id));
}

export async function updateBookmarkLabel(id: string, label: string): Promise<void> {
  const store = await getStore();
  const bookmarks = (await store.get<BookmarkEntry[]>('bookmarks')) ?? [];
  const idx = bookmarks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookmarks[idx] = { ...bookmarks[idx], label };
    await store.set('bookmarks', bookmarks);
  }
}

// ---------------------------------------------------------------------------
// Preferences (darkMode, syncScroll)
// ---------------------------------------------------------------------------

export async function getDarkMode(): Promise<boolean | null> {
  const store = await getStore();
  return (await store.get<boolean>('darkMode')) ?? null;
}

export async function setDarkMode(value: boolean): Promise<void> {
  const store = await getStore();
  await store.set('darkMode', value);
}

export async function getSyncScroll(): Promise<boolean | null> {
  const store = await getStore();
  return (await store.get<boolean>('syncScroll')) ?? null;
}

export async function setSyncScroll(value: boolean): Promise<void> {
  const store = await getStore();
  await store.set('syncScroll', value);
}
