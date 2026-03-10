/**
 * usePersistStore — wires the Zustand store to the Tauri persistence layer.
 *
 * On mount: loads saved notes/highlights/bookmarks/preferences and hydrates the store.
 * On change: subscribes to Zustand, diffs state, and writes only changed keys to disk.
 *
 * Profile support: per-profile data (notes, highlights, bookmarks, layout) is stored
 * under profile-scoped keys. Preferences (theme, font, language) are global.
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
  getFontSize,
  getFontFamily,
  scanAndLoadModules,
  setNote,
  deleteNote,
  setHighlight,
  clearHighlight,
  addBookmark,
  removeBookmark,
  setDarkMode,
  setSyncScroll,
  setFontSize,
  setFontFamily,
  getTheme,
  saveTheme,
  verseKey,
  getLayoutState,
  saveLayoutState,
  getLanguage,
  saveLanguage,
  getProfiles,
  saveProfiles,
  getActiveProfileName,
  saveActiveProfileName,
  migrateToProfiles,
} from '../utils/persistence';
import type { PersistedLayoutState } from '../utils/persistence';
import { isBrbModPlain, isBrbModTagged } from '../types/brbmod';
import type { CustomTranslationMeta } from '../store/bibleStore';

/** Deserialize raw persisted data into Zustand-compatible arrays for a given profile. */
async function loadProfileData(profile: string) {
  const [rawNotes, rawHighlights, rawBookmarks, layoutState] = await Promise.all([
    getNotes(profile),
    getHighlights(profile),
    getBookmarks(profile),
    getLayoutState(profile),
  ]);

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

  const bookmarks: Bookmark[] = rawBookmarks.map((b) => ({
    id: b.id,
    book: b.book,
    chapter: b.chapter,
    verse: b.verse,
    label: b.label,
    createdAt: b.createdAt,
  }));

  let restoredPanes: import('../store/bibleStore').Pane[] | null = null;
  let restoredLayoutTree: import('../store/bibleStore').LayoutNode | null = null;
  if (layoutState && layoutState.panes.length > 0) {
    restoredPanes = layoutState.panes.map((p) => ({
      id: p.id,
      selectedBook: p.selectedBook,
      selectedChapter: p.selectedChapter,
      selectedTranslation: p.selectedTranslation as import('../data/bibleLoader').Translation,
      scrollToVerse: null,
      synced: p.synced,
    }));
    restoredLayoutTree = layoutState.layoutTree as import('../store/bibleStore').LayoutNode;
  }

  return { notes, highlights, bookmarks, restoredPanes, restoredLayoutTree };
}

export function usePersistStore() {
  // ── Load persisted state on mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        // Run one-time migration from legacy un-prefixed keys to Default profile
        await migrateToProfiles();

        const [profiles, activeProfile, darkMode, syncScroll, fontSize, fontFamily, theme, scannedMods, language] = await Promise.all([
          getProfiles(),
          getActiveProfileName(),
          getDarkMode(),
          getSyncScroll(),
          getFontSize(),
          getFontFamily(),
          getTheme(),
          scanAndLoadModules(),
          getLanguage(),
        ]);

        // Load profile-scoped data for the active profile
        const profileData = await loadProfileData(activeProfile);

        // Register every module found on disk into bibleLoader so panes can use them.
        console.log(`[usePersistStore] registering ${scannedMods.length} module(s) from disk`);
        const { addCustomTranslation, setModulesReady } = useBibleStore.getState();
        scannedMods.forEach((mod) => {
          console.log(`[usePersistStore] registering "${mod.meta.abbreviation}" format=${mod.meta.format}`);
          const meta: CustomTranslationMeta = {
            abbreviation: mod.meta.abbreviation,
            fullName: mod.meta.name,
            language: mod.meta.language,
            fileName: `${mod.meta.abbreviation}.brbmod`,
            importedAt: 0,
            ...(mod.meta.bookNames && Object.keys(mod.meta.bookNames).length > 0 ? { bookNames: mod.meta.bookNames } : {}),
          };
          if (isBrbModTagged(mod)) {
            addCustomTranslation(meta, null, mod.data);
          } else if (isBrbModPlain(mod)) {
            addCustomTranslation(meta, mod.data as import('../data/bibleLoader').BibleData, null);
          } else {
            console.warn(`[usePersistStore] unknown format for "${(mod as import('../types/brbmod').BrbMod).meta.abbreviation}" — skipped`);
          }
        });
        setModulesReady(true);

        // Derive a consistent theme+darkMode pair
        const resolvedDarkMode = darkMode !== null ? darkMode : null;
        let resolvedTheme: import('../store/bibleStore').Theme | null =
          theme !== null
            ? theme
            : resolvedDarkMode !== null
              ? (resolvedDarkMode ? 'dark-blue' : 'light-cool')
              : null;

        if (resolvedDarkMode !== null && resolvedTheme !== null) {
          const themeIsDark = resolvedTheme === 'dark-blue' || resolvedTheme === 'dark-oled';
          if (themeIsDark !== resolvedDarkMode) {
            resolvedTheme = resolvedDarkMode ? 'dark-blue' : 'light-cool';
          }
        }

        // Hydrate store with global prefs + profile-scoped data
        useBibleStore.setState((state) => ({
          // Profile state
          profiles,
          activeProfile,
          // Profile-scoped data
          notes: profileData.notes.length > 0 ? profileData.notes : state.notes,
          highlights: profileData.highlights.length > 0 ? profileData.highlights : state.highlights,
          bookmarks: profileData.bookmarks.length > 0 ? profileData.bookmarks : state.bookmarks,
          panes: profileData.restoredPanes !== null ? profileData.restoredPanes : state.panes,
          layoutTree: profileData.restoredLayoutTree !== null ? profileData.restoredLayoutTree : state.layoutTree,
          // Global prefs
          darkMode: resolvedDarkMode !== null ? resolvedDarkMode : state.darkMode,
          syncScroll: syncScroll !== null ? syncScroll : state.syncScroll,
          fontSize: fontSize !== null ? fontSize : state.fontSize,
          fontFamily: fontFamily !== null ? fontFamily : state.fontFamily,
          theme: resolvedTheme !== null ? resolvedTheme : state.theme,
          language: language !== null ? language : state.language,
        }));
      } catch (err) {
        console.debug('[usePersistStore] persistence unavailable:', err);
        useBibleStore.getState().setModulesReady(true);
      }
    }

    loadAll();
  }, []);

  // ── Subscribe to store changes and persist diffs ───────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useBibleStore.subscribe((state, prevState) => {
      // Profile switch: save old profile's data, load new profile's data
      if (state.activeProfile !== prevState.activeProfile) {
        if (timer) clearTimeout(timer);
        handleProfileSwitch(prevState, state);
        return;
      }

      // Debounce: batch rapid changes into one write
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncToStore(state, prevState), 500);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);
}

// ── Profile switch handler ──────────────────────────────────────────────────

async function handleProfileSwitch(
  prevState: ReturnType<typeof useBibleStore.getState>,
  newState: ReturnType<typeof useBibleStore.getState>
) {
  try {
    const oldProfile = prevState.activeProfile;
    const newProfile = newState.activeProfile;

    // Save old profile's per-profile data first
    await saveProfileState(oldProfile, prevState);

    // Persist the active profile name
    await saveActiveProfileName(newProfile);

    // Load new profile's data
    const profileData = await loadProfileData(newProfile);

    // Default pane if profile has no saved layout
    const defaultPane = {
      id: crypto.randomUUID(),
      selectedBook: 'Genesis',
      selectedChapter: 1,
      selectedTranslation: 'KJV' as import('../data/bibleLoader').Translation,
      scrollToVerse: null,
      synced: false,
    };

    useBibleStore.setState({
      notes: profileData.notes,
      highlights: profileData.highlights,
      bookmarks: profileData.bookmarks,
      panes: profileData.restoredPanes ?? [defaultPane],
      layoutTree: profileData.restoredLayoutTree ?? { type: 'leaf', paneId: defaultPane.id },
      activePaneIndex: 0,
    });
  } catch (err) {
    console.error('[usePersistStore] profile switch error:', err);
  }
}

/** Save all per-profile state for a given profile. */
async function saveProfileState(
  profile: string,
  state: ReturnType<typeof useBibleStore.getState>
) {
  // Notes: convert Note[] → Record<verseKey, text>
  for (const note of state.notes) {
    await setNote(verseKey(note.book, note.chapter, note.verse), note.text, profile);
  }

  // Highlights: convert Highlight[] → Record<verseKey, color>
  for (const h of state.highlights) {
    await setHighlight(verseKey(h.book, h.chapter, h.verse), h.color, profile);
  }

  // Bookmarks
  // Overwrite by saving fresh — first get existing and remove all, then add current
  const existingBookmarks = await getBookmarks(profile);
  for (const b of existingBookmarks) {
    await removeBookmark(b.id, profile);
  }
  for (const b of state.bookmarks) {
    await addBookmark({ id: b.id, book: b.book, chapter: b.chapter, verse: b.verse, label: b.label, createdAt: b.createdAt }, profile);
  }

  // Layout
  const layout: PersistedLayoutState = {
    panes: state.panes.map((p) => ({
      id: p.id,
      selectedBook: p.selectedBook,
      selectedChapter: p.selectedChapter,
      selectedTranslation: p.selectedTranslation,
      synced: p.synced,
    })),
    layoutTree: state.layoutTree as PersistedLayoutState['layoutTree'],
  };
  await saveLayoutState(layout, profile);
}

// ── Diff-and-sync helper ────────────────────────────────────────────────────

type StoreState = ReturnType<typeof useBibleStore.getState>;

async function syncToStore(state: StoreState, prevState: StoreState) {
  try {
    const profile = state.activeProfile;

    // Notes
    if (state.notes !== prevState.notes) {
      const prevMap = new Map(prevState.notes.map((n) => [n.id, n]));
      const currMap = new Map(state.notes.map((n) => [n.id, n]));

      for (const [id, note] of prevMap) {
        if (!currMap.has(id)) {
          await deleteNote(verseKey(note.book, note.chapter, note.verse), profile);
        }
      }
      for (const [id, note] of currMap) {
        const prev = prevMap.get(id);
        if (!prev || prev.text !== note.text) {
          await setNote(verseKey(note.book, note.chapter, note.verse), note.text, profile);
        }
      }
    }

    // Highlights
    if (state.highlights !== prevState.highlights) {
      const prevMap = new Map(prevState.highlights.map((h) => [h.id, h]));
      const currMap = new Map(state.highlights.map((h) => [h.id, h]));

      for (const [id, h] of prevMap) {
        if (!currMap.has(id)) {
          await clearHighlight(verseKey(h.book, h.chapter, h.verse), profile);
        }
      }
      for (const [id, h] of currMap) {
        const prev = prevMap.get(id);
        if (!prev || prev.color !== h.color) {
          await setHighlight(verseKey(h.book, h.chapter, h.verse), h.color, profile);
        }
      }
    }

    // Bookmarks
    if (state.bookmarks !== prevState.bookmarks) {
      const prevIds = new Set(prevState.bookmarks.map((b) => b.id));
      const currIds = new Set(state.bookmarks.map((b) => b.id));

      for (const b of prevState.bookmarks) {
        if (!currIds.has(b.id)) await removeBookmark(b.id, profile);
      }
      for (const b of state.bookmarks) {
        if (!prevIds.has(b.id)) {
          await addBookmark({ id: b.id, book: b.book, chapter: b.chapter, verse: b.verse, label: b.label, createdAt: b.createdAt }, profile);
        }
      }
    }

    // Global preferences (not profile-scoped)
    if (state.darkMode !== prevState.darkMode) await setDarkMode(state.darkMode);
    if (state.syncScroll !== prevState.syncScroll) await setSyncScroll(state.syncScroll);
    if (state.fontSize !== prevState.fontSize) await setFontSize(state.fontSize);
    if (state.fontFamily !== prevState.fontFamily) await setFontFamily(state.fontFamily);
    if (state.theme !== prevState.theme) await saveTheme(state.theme);
    if (state.language !== prevState.language) await saveLanguage(state.language);

    // Layout state (profile-scoped)
    if (state.panes !== prevState.panes || state.layoutTree !== prevState.layoutTree) {
      const layout: PersistedLayoutState = {
        panes: state.panes.map((p) => ({
          id: p.id,
          selectedBook: p.selectedBook,
          selectedChapter: p.selectedChapter,
          selectedTranslation: p.selectedTranslation,
          synced: p.synced,
        })),
        layoutTree: state.layoutTree as PersistedLayoutState['layoutTree'],
      };
      await saveLayoutState(layout, profile);
    }

    // Profile list + active profile name (global)
    if (state.profiles !== prevState.profiles) await saveProfiles(state.profiles);
    if (state.activeProfile !== prevState.activeProfile) await saveActiveProfileName(state.activeProfile);
  } catch (err) {
    console.debug('[usePersistStore] sync error:', err);
  }
}
