/**
 * usePersistStore — wires the Zustand store to the Tauri persistence layer.
 *
 * On mount: loads saved notes/highlights/bookmarks/preferences and hydrates the store.
 * On change: subscribes to Zustand, diffs state, and writes only changed keys to disk.
 *
 * Ephemeral state (search query, Strong's panel, search results) is intentionally
 * NOT persisted — it resets to defaults on every app launch.
 */

import { useEffect } from 'react';
import { useBibleStore } from '../store/bibleStore';
import type { Note, Highlight, Bookmark } from '../store/bibleStore';
import {
  getNotes,
  getHighlights,
  getBookmarks,
  getDarkMode,
  getSyncScroll,
  setNote,
  deleteNote,
  setHighlight,
  clearHighlight,
  addBookmark,
  removeBookmark,
  setDarkMode,
  setSyncScroll,
  verseKey,
} from '../utils/persistence';

export function usePersistStore() {
  // ── Load persisted state on mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [rawNotes, rawHighlights, rawBookmarks, darkMode, syncScroll] = await Promise.all([
          getNotes(),
          getHighlights(),
          getBookmarks(),
          getDarkMode(),
          getSyncScroll(),
        ]);

        // Record<verseKey, text>  →  Note[]
        const notes: Note[] = Object.entries(rawNotes).map(([key, text]) => {
          const [book, chapterStr, verseStr] = key.split('.');
          return {
            id: crypto.randomUUID(),
            book,
            chapter: Number(chapterStr),
            verse: Number(verseStr),
            text,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        });

        // Record<verseKey, color>  →  Highlight[]
        const highlights: Highlight[] = Object.entries(rawHighlights).map(([key, color]) => {
          const [book, chapterStr, verseStr] = key.split('.');
          return {
            id: crypto.randomUUID(),
            book,
            chapter: Number(chapterStr),
            verse: Number(verseStr),
            color,
          };
        });

        // BookmarkEntry[]  →  Bookmark[] (schema is compatible, just cast)
        const bookmarks: Bookmark[] = rawBookmarks.map((b) => ({
          id: b.id,
          book: b.book,
          chapter: b.chapter,
          verse: b.verse,
          label: b.label,
          createdAt: b.createdAt,
        }));

        // Hydrate store — only override if there's actually data to restore
        useBibleStore.setState((state) => ({
          notes: notes.length > 0 ? notes : state.notes,
          highlights: highlights.length > 0 ? highlights : state.highlights,
          bookmarks: bookmarks.length > 0 ? bookmarks : state.bookmarks,
          darkMode: darkMode !== null ? darkMode : state.darkMode,
          syncScroll: syncScroll !== null ? syncScroll : state.syncScroll,
        }));
      } catch (err) {
        // Running outside Tauri (browser dev mode) — persistence unavailable, ignore.
        console.debug('[usePersistStore] persistence unavailable:', err);
      }
    }

    loadAll();
  }, []);

  // ── Subscribe to store changes and persist diffs ───────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useBibleStore.subscribe((state, prevState) => {
      // Debounce: batch rapid changes (e.g. typing in note editor) into one write
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncToStore(state, prevState), 500);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);
}

// ── Diff-and-sync helper ────────────────────────────────────────────────────

type StoreState = ReturnType<typeof useBibleStore.getState>;

async function syncToStore(state: StoreState, prevState: StoreState) {
  try {
    // Notes
    if (state.notes !== prevState.notes) {
      const prevMap = new Map(prevState.notes.map((n) => [n.id, n]));
      const currMap = new Map(state.notes.map((n) => [n.id, n]));

      // Deleted
      for (const [id, note] of prevMap) {
        if (!currMap.has(id)) {
          await deleteNote(verseKey(note.book, note.chapter, note.verse));
        }
      }
      // Added or updated
      for (const [id, note] of currMap) {
        const prev = prevMap.get(id);
        if (!prev || prev.text !== note.text) {
          await setNote(verseKey(note.book, note.chapter, note.verse), note.text);
        }
      }
    }

    // Highlights
    if (state.highlights !== prevState.highlights) {
      const prevMap = new Map(prevState.highlights.map((h) => [h.id, h]));
      const currMap = new Map(state.highlights.map((h) => [h.id, h]));

      for (const [id, h] of prevMap) {
        if (!currMap.has(id)) {
          await clearHighlight(verseKey(h.book, h.chapter, h.verse));
        }
      }
      for (const [id, h] of currMap) {
        const prev = prevMap.get(id);
        if (!prev || prev.color !== h.color) {
          await setHighlight(verseKey(h.book, h.chapter, h.verse), h.color);
        }
      }
    }

    // Bookmarks
    if (state.bookmarks !== prevState.bookmarks) {
      const prevIds = new Set(prevState.bookmarks.map((b) => b.id));
      const currIds = new Set(state.bookmarks.map((b) => b.id));

      for (const b of prevState.bookmarks) {
        if (!currIds.has(b.id)) await removeBookmark(b.id);
      }
      for (const b of state.bookmarks) {
        if (!prevIds.has(b.id)) {
          // Pass through the Zustand id so persisted entry stays in sync
          await addBookmark({ id: b.id, book: b.book, chapter: b.chapter, verse: b.verse, label: b.label, createdAt: b.createdAt });
        }
      }
    }

    // Preferences
    if (state.darkMode !== prevState.darkMode) await setDarkMode(state.darkMode);
    if (state.syncScroll !== prevState.syncScroll) await setSyncScroll(state.syncScroll);
  } catch (err) {
    console.debug('[usePersistStore] sync error:', err);
  }
}
