/**
 * useSyncBridge — Tauri event bridge for cross-window navigation and theme sync.
 *
 * Each OS window (main + pop-outs) runs its own Zustand store.
 * This hook bridges them by:
 *   - Emitting `bible:sync-nav` whenever a synced pane navigates
 *   - Listening for `bible:sync-nav` from other windows and applying to local synced panes
 *   - Emitting `bible:theme-change` when the theme changes
 *   - Listening for `bible:theme-change` and applying to local store
 *
 * Call this hook once at the top level of App and PopoutApp.
 */

import { useEffect, useRef } from 'react';
import { useBibleStore } from '../store/bibleStore';
import type { Theme } from '../store/bibleStore';

interface SyncNavPayload {
  book: string;
  chapter: number;
  scrollToVerse?: number | null;
  sourceWindow: string;
}

interface ThemePayload {
  theme: Theme;
  darkMode: boolean;
  sourceWindow: string;
}

export function useSyncBridge() {
  const panes    = useBibleStore((s) => s.panes);
  const setTheme = useBibleStore((s) => s.setTheme);
  const theme    = useBibleStore((s) => s.theme);
  const darkMode = useBibleStore((s) => s.darkMode);

  // True while we are applying an incoming remote event — prevents echo loops
  const applyingExternal = useRef(false);

  // Last nav state we emitted (avoid re-emitting identical values)
  const lastEmittedNav = useRef<{ book: string; chapter: number } | null>(null);

  // Last theme state we emitted
  const lastEmittedTheme = useRef<{ theme: Theme; darkMode: boolean } | null>(null);

  // ── Emit nav when a synced pane changes ───────────────────────────────────
  useEffect(() => {
    if (applyingExternal.current) return;

    // Find the first synced pane (all synced panes share the same book/chapter
    // because updatePane already propagates to all of them)
    const syncedPane = panes.find((p) => p.synced);
    if (!syncedPane) return;

    const { selectedBook: book, selectedChapter: chapter, scrollToVerse } = syncedPane;
    const last = lastEmittedNav.current;
    if (last?.book === book && last?.chapter === chapter) return;

    lastEmittedNav.current = { book, chapter };

    void (async () => {
      try {
        const { emit }       = await import('@tauri-apps/api/event');
        const { getCurrent } = await import('@tauri-apps/api/window');
        const sourceWindow   = getCurrent().label;
        await emit('bible:sync-nav', { book, chapter, scrollToVerse, sourceWindow } satisfies SyncNavPayload);
      } catch {
        // Running in browser dev mode — no Tauri available
      }
    })();
  }, [panes]);

  // ── Listen for nav sync events from other windows ─────────────────────────
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    void (async () => {
      try {
        const { listen }     = await import('@tauri-apps/api/event');
        const { getCurrent } = await import('@tauri-apps/api/window');
        const myLabel        = getCurrent().label;

        unlisten = await listen<SyncNavPayload>('bible:sync-nav', (event) => {
          if (event.payload.sourceWindow === myLabel) return; // ignore own emits

          const { book, chapter, scrollToVerse } = event.payload;

          // Update lastEmittedNav so we don't echo this nav back after applying
          lastEmittedNav.current = { book, chapter };

          applyingExternal.current = true;
          const state = useBibleStore.getState();
          state.panes
            .filter((p) => p.synced)
            .forEach((p) => {
              state.updatePane(p.id, {
                selectedBook:    book,
                selectedChapter: chapter,
                ...(scrollToVerse !== undefined ? { scrollToVerse } : {}),
              });
            });
          // Reset flag after Zustand effects settle
          setTimeout(() => { applyingExternal.current = false; }, 50);
        });
      } catch {
        // Not in Tauri context
      }
    })();

    return () => { unlisten?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Emit theme when it changes ────────────────────────────────────────────
  useEffect(() => {
    if (applyingExternal.current) return;

    const last = lastEmittedTheme.current;
    if (last?.theme === theme && last?.darkMode === darkMode) return;
    lastEmittedTheme.current = { theme, darkMode };

    void (async () => {
      try {
        const { emit }       = await import('@tauri-apps/api/event');
        const { getCurrent } = await import('@tauri-apps/api/window');
        const sourceWindow   = getCurrent().label;
        await emit('bible:theme-change', { theme, darkMode, sourceWindow } satisfies ThemePayload);
      } catch {
        // Not in Tauri context
      }
    })();
  }, [theme, darkMode]);

  // ── Listen for theme changes from other windows ───────────────────────────
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    void (async () => {
      try {
        const { listen }     = await import('@tauri-apps/api/event');
        const { getCurrent } = await import('@tauri-apps/api/window');
        const myLabel        = getCurrent().label;

        unlisten = await listen<ThemePayload>('bible:theme-change', (event) => {
          if (event.payload.sourceWindow === myLabel) return;

          lastEmittedTheme.current = { theme: event.payload.theme, darkMode: event.payload.darkMode };
          applyingExternal.current = true;
          setTheme(event.payload.theme);
          setTimeout(() => { applyingExternal.current = false; }, 50);
        });
      } catch {
        // Not in Tauri context
      }
    })();

    return () => { unlisten?.(); };
  }, [setTheme]);
}
