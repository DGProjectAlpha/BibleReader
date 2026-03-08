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
import {
  writeTextFile,
  readTextFile,
  exists,
  mkdir,
  remove,
  readDir,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { validateBrbMod } from '../types/brbmod';
import type { BrbMod } from '../types/brbmod';

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
  await store.save();
}

export async function deleteNote(key: string): Promise<void> {
  const store = await getStore();
  const notes = (await store.get<Record<string, string>>('notes')) ?? {};
  delete notes[key];
  await store.set('notes', notes);
  await store.save();
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
  await store.save();
}

export async function clearHighlight(key: string): Promise<void> {
  const store = await getStore();
  const highlights = (await store.get<Record<string, HighlightColor>>('highlights')) ?? {};
  delete highlights[key];
  await store.set('highlights', highlights);
  await store.save();
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
  await store.save();
  return newEntry;
}

export async function removeBookmark(id: string): Promise<void> {
  const store = await getStore();
  const bookmarks = (await store.get<BookmarkEntry[]>('bookmarks')) ?? [];
  await store.set('bookmarks', bookmarks.filter((b) => b.id !== id));
  await store.save();
}

export async function updateBookmarkLabel(id: string, label: string): Promise<void> {
  const store = await getStore();
  const bookmarks = (await store.get<BookmarkEntry[]>('bookmarks')) ?? [];
  const idx = bookmarks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookmarks[idx] = { ...bookmarks[idx], label };
    await store.set('bookmarks', bookmarks);
    await store.save();
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
  await store.save();
}

export async function getSyncScroll(): Promise<boolean | null> {
  const store = await getStore();
  return (await store.get<boolean>('syncScroll')) ?? null;
}

export async function setSyncScroll(value: boolean): Promise<void> {
  const store = await getStore();
  await store.set('syncScroll', value);
  await store.save();
}

export type Theme = 'dark-blue' | 'dark-oled' | 'light-cool' | 'light-warm';

export async function getTheme(): Promise<Theme | null> {
  const store = await getStore();
  return (await store.get<Theme>('theme')) ?? null;
}

export async function saveTheme(value: Theme): Promise<void> {
  const store = await getStore();
  await store.set('theme', value);
  await store.save();
}

export async function getFontSize(): Promise<number | null> {
  const store = await getStore();
  return (await store.get<number>('fontSize')) ?? null;
}

export async function setFontSize(value: number): Promise<void> {
  const store = await getStore();
  await store.set('fontSize', value);
  await store.save();
}

export async function getFontFamily(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>('fontFamily')) ?? null;
}

export async function setFontFamily(value: string): Promise<void> {
  const store = await getStore();
  await store.set('fontFamily', value);
  await store.save();
}

// ---------------------------------------------------------------------------
// Custom translations metadata
// ---------------------------------------------------------------------------

export interface CustomTranslationMeta {
  abbreviation: string; // primary key
  fullName: string;
  language: string;
  fileName: string;
  importedAt: number;
  /** Localized book names keyed by canonical English name, e.g. { "Genesis": "Бытие" } */
  bookNames?: Record<string, string>;
}

export async function getCustomTranslations(): Promise<CustomTranslationMeta[]> {
  const store = await getStore();
  return (await store.get<CustomTranslationMeta[]>('customTranslations')) ?? [];
}

export async function saveCustomTranslation(meta: CustomTranslationMeta): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<CustomTranslationMeta[]>('customTranslations')) ?? [];
  const filtered = existing.filter((t) => t.abbreviation !== meta.abbreviation);
  await store.set('customTranslations', [...filtered, meta]);
  await store.save();
}

export async function deleteCustomTranslation(abbreviation: string): Promise<void> {
  const store = await getStore();
  const existing = (await store.get<CustomTranslationMeta[]>('customTranslations')) ?? [];
  await store.set('customTranslations', existing.filter((t) => t.abbreviation !== abbreviation));
  await store.save();
}

// ---------------------------------------------------------------------------
// Custom translation bible data (verse content)
// Each imported module is stored as a permanent file:
//   {AppData}/modules/{abbreviation}.brbmod  (JSON-encoded)
// This means the file survives app restarts and is independent of plugin-store.
// ---------------------------------------------------------------------------

const MODULES_DIR = 'modules';

async function ensureModulesDir(): Promise<void> {
  const dirExists = await exists(MODULES_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(MODULES_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

/** Write module data to {AppData}/modules/{abbreviation}.brbmod */
export async function saveCustomBibleData(abbreviation: string, data: unknown): Promise<void> {
  await ensureModulesDir();
  const path = `${MODULES_DIR}/${abbreviation}.brbmod`;
  const serialized = JSON.stringify(data);
  console.log(`[persistence] saveCustomBibleData: writing ${abbreviation}.brbmod — ${serialized.length} bytes`);
  await writeTextFile(path, serialized, { baseDir: BaseDirectory.AppData });
  console.log(`[persistence] saveCustomBibleData: write complete for ${abbreviation}.brbmod`);
}

/** Read module data from {AppData}/modules/{abbreviation}.brbmod */
export async function getCustomBibleData(abbreviation: string): Promise<unknown> {
  await ensureModulesDir();
  const path = `${MODULES_DIR}/${abbreviation}.brbmod`;
  const fileExists = await exists(path, { baseDir: BaseDirectory.AppData });
  if (!fileExists) return null;
  const text = await readTextFile(path, { baseDir: BaseDirectory.AppData });
  return JSON.parse(text);
}

/** Remove {AppData}/modules/{abbreviation}.brbmod */
export async function deleteCustomBibleData(abbreviation: string): Promise<void> {
  const path = `${MODULES_DIR}/${abbreviation}.brbmod`;
  const fileExists = await exists(path, { baseDir: BaseDirectory.AppData });
  if (fileExists) {
    await remove(path, { baseDir: BaseDirectory.AppData });
  }
}

/**
 * Scan {AppData}/modules/ for all *.brbmod files and return parsed + validated
 * module objects. Files that fail validation are silently skipped (logged to console).
 *
 * This is the authoritative loader — the plugin-store 'customTranslations' key
 * is NOT the source of truth. The filesystem is.
 */
export async function scanAndLoadModules(): Promise<BrbMod[]> {
  await ensureModulesDir();
  const entries = await readDir(MODULES_DIR, { baseDir: BaseDirectory.AppData });
  const results: BrbMod[] = [];

  console.log(`[scanAndLoadModules] found ${entries.length} entries in modules dir`);

  for (const entry of entries) {
    if (!entry.name || !entry.name.endsWith('.brbmod')) {
      console.log(`[scanAndLoadModules] skipping non-.brbmod entry: ${entry.name}`);
      continue;
    }
    try {
      const filePath = `${MODULES_DIR}/${entry.name}`;
      const text = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
      console.log(`[scanAndLoadModules] read ${entry.name} — ${text.length} bytes`);
      const raw = JSON.parse(text);
      const mod = validateBrbMod(raw);
      console.log(`[scanAndLoadModules] validated OK: ${mod.meta.abbreviation} (${mod.meta.format})`);
      results.push(mod);
    } catch (err) {
      console.warn(`[scanAndLoadModules] skipping ${entry.name}:`, err);
    }
  }

  console.log(`[scanAndLoadModules] loaded ${results.length} modules:`, results.map((m) => m.meta.abbreviation));
  return results;
}
