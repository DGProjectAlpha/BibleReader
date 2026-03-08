import { create } from 'zustand';
import type { Translation, WordToken, TaggedVerse, BibleData } from '../data/bibleLoader';
import { registerCustomTranslation, registerTaggedTranslation, unregisterCustomTranslation } from '../data/bibleLoader';
import { searchByKjvWord, lookup } from '../data/strongs';
import type { StrongsEntry, StrongsSearchResult } from '../data/strongs';
import type { BibleDataTagged } from '../types/brbmod';

// Re-export verse data types so components only need one import point
export type { WordToken, TaggedVerse };

export type SearchScope = 'bible' | 'OT' | 'NT' | 'book' | 'chapter';

export type Theme = 'dark-blue' | 'dark-oled' | 'light-cool' | 'light-warm';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface VerseKey {
  book: string;
  chapter: number;
  verse: number; // 1-indexed
}

export interface Note extends VerseKey {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface Highlight extends VerseKey {
  id: string;
  color: HighlightColor;
}

export interface Bookmark extends VerseKey {
  id: string;
  label?: string;
  createdAt: number;
}

// Metadata for a user-imported bible translation.
// The actual verse data is stored separately (as a JSON file in the Tauri app data dir).
export interface CustomTranslationMeta {
  abbreviation: string; // primary key — short label shown in pane header, e.g. "NASB"
  fullName: string;     // e.g. "New American Standard Bible"
  language: string;     // BCP-47 language tag, e.g. "en", "es", "ru"
  fileName: string;     // name of the JSON file stored in app data dir
  importedAt: number;   // Date.now()
  /** Localized book names keyed by canonical English name, e.g. { "Genesis": "Бытие" } */
  bookNames?: Record<string, string>;
}

export interface SearchResult {
  book: string;
  chapter: number;
  verse: number; // 1-indexed
  text: string;
}

export interface StrongsResult {
  num: string;
  entry: StrongsEntry;
}

export interface Pane {
  id: string;
  selectedBook: string;
  selectedChapter: number;
  selectedTranslation: Translation;
  scrollToVerse: number | null; // verse number (1-indexed) to scroll to; each pane clears its own
  synced: boolean; // when true, this pane follows navigation from other synced panes
}

interface BibleStore {
  panes: Pane[];
  activePaneIndex: number;
  syncScroll: boolean;
  darkMode: boolean;

  // Pane management
  addPane: () => void;
  addPaneWithRef: (book: string, chapter: number, translation: Translation, scrollToVerse?: number | null) => void;
  removePane: (id: string) => void;
  setActivePaneIndex: (index: number) => void;
  updatePane: (id: string, updates: Partial<Pick<Pane, 'selectedBook' | 'selectedChapter' | 'selectedTranslation' | 'scrollToVerse'>>) => void;
  navigateAllPanes: (book: string, chapter: number, scrollToVerse?: number | null) => void;
  togglePaneSync: (id: string) => void;

  // Convenience setters that target the active pane
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setSelectedTranslation: (translation: Translation) => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleSyncScroll: () => void;

  // Strong's concordance state
  strongsWord: string | null;
  // Structured lookup: exact = best/tagged match, similar = remaining fuzzy matches
  strongsLookup: StrongsSearchResult | null;
  // Flat list for backwards compat — derived from strongsLookup (exact first, then similar)
  strongsResults: StrongsResult[];
  setStrongsWord: (word: string | null) => void;
  // Exact Strong's number lookup (set when user clicks a tagged word)
  // Pass optional fallbackWord to also populate similar entries via fuzzy search
  selectedStrongsNum: string | null;
  setStrongsNum: (num: string | null, fallbackWord?: string) => void;

  // TSK cross-reference panel state
  tskVerse: VerseKey | null;
  setTskVerse: (key: VerseKey | null) => void;

  // Notes state
  notes: Note[];
  addNote: (key: VerseKey, text: string) => void;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  getNoteForVerse: (key: VerseKey) => Note | undefined;

  // Highlights state
  highlights: Highlight[];
  addHighlight: (key: VerseKey, color: HighlightColor) => void;
  removeHighlight: (key: VerseKey) => void;
  getHighlightForVerse: (key: VerseKey) => Highlight | undefined;

  // Bookmarks state
  bookmarks: Bookmark[];
  addBookmark: (key: VerseKey, label?: string) => void;
  removeBookmark: (key: VerseKey) => void;
  isBookmarked: (key: VerseKey) => boolean;

  // Font preferences
  fontSize: number;
  fontFamily: string;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;

  // True once scanAndLoadModules() has completed on startup — gates VerseDisplay
  // from attempting custom-translation lookups before they are registered.
  modulesReady: boolean;
  setModulesReady: (ready: boolean) => void;

  // Custom (user-imported) translations
  customTranslations: CustomTranslationMeta[];
  /**
   * Register + save a custom translation.
   * Pass either `data` (plain string verses) or `taggedData` (Strong's-tagged) so
   * the store can index the translation in bibleLoader immediately. At least one
   * must be non-null for the translation to produce any verse output.
   */
  addCustomTranslation: (
    meta: CustomTranslationMeta,
    data?: BibleData | null,
    taggedData?: BibleDataTagged | null
  ) => string[];
  removeCustomTranslation: (abbreviation: string) => void;

  // Search state
  searchQuery: string;
  searchScope: SearchScope;
  searchScopeBook: string;
  searchScopeChapter: number;
  searchResults: SearchResult[];
  searchOpen: boolean;
  setSearchQuery: (query: string) => void;
  setSearchScope: (scope: SearchScope) => void;
  setSearchScopeBook: (book: string) => void;
  setSearchScopeChapter: (chapter: number) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchOpen: (open: boolean) => void;
}

export const MAX_PANES = 4;

const DEFAULT_PANE = (): Pane => ({
  id: crypto.randomUUID(),
  selectedBook: 'Genesis',
  selectedChapter: 1,
  selectedTranslation: 'KJV',
  scrollToVerse: null,
  synced: false,
});

export const useBibleStore = create<BibleStore>((set, get) => ({
  panes: [DEFAULT_PANE()],
  activePaneIndex: 0,
  syncScroll: false,
  darkMode: false,
  theme: 'light-cool',
  fontSize: 16,
  fontFamily: 'sans',
  modulesReady: false,

  setModulesReady: (ready) => set({ modulesReady: ready }),

  addPane: () =>
    set((state) => {
      if (state.panes.length >= MAX_PANES) return state;
      return {
        panes: [...state.panes, DEFAULT_PANE()],
        activePaneIndex: state.panes.length,
      };
    }),

  addPaneWithRef: (book, chapter, translation, scrollToVerse = null) =>
    set((state) => {
      if (state.panes.length >= MAX_PANES) return state;
      const newPane: Pane = {
        id: crypto.randomUUID(),
        selectedBook: book,
        selectedChapter: chapter,
        selectedTranslation: translation,
        scrollToVerse: scrollToVerse ?? null,
        synced: false,
      };
      return {
        panes: [...state.panes, newPane],
        activePaneIndex: state.panes.length,
      };
    }),

  removePane: (id) =>
    set((state) => {
      if (state.panes.length <= 1) return state; // always keep at least one pane
      const newPanes = state.panes.filter((p) => p.id !== id);
      const newActive = Math.min(state.activePaneIndex, newPanes.length - 1);
      return { panes: newPanes, activePaneIndex: newActive };
    }),

  setActivePaneIndex: (index) => set({ activePaneIndex: index }),

  navigateAllPanes: (book, chapter, scrollToVerse) =>
    set((state) => ({
      panes: state.panes.map((p) => ({
        ...p,
        selectedBook: book,
        selectedChapter: chapter,
        ...(scrollToVerse !== undefined ? { scrollToVerse } : {}),
      })),
    })),

  togglePaneSync: (id) =>
    set((state) => ({
      panes: state.panes.map((p) =>
        p.id === id ? { ...p, synced: !p.synced } : p
      ),
    })),

  updatePane: (id, updates) =>
    set((state) => {
      const sourcePane = state.panes.find((p) => p.id === id);
      // Only propagate navigation to other panes when the source pane is synced
      const syncFields: Partial<Pick<Pane, 'selectedBook' | 'selectedChapter' | 'scrollToVerse'>> = {};
      if (sourcePane?.synced) {
        if (updates.selectedBook !== undefined) syncFields.selectedBook = updates.selectedBook;
        if (updates.selectedChapter !== undefined) syncFields.selectedChapter = updates.selectedChapter;
        if (updates.scrollToVerse !== undefined) syncFields.scrollToVerse = updates.scrollToVerse;
      }
      const hasSyncFields = Object.keys(syncFields).length > 0;
      return {
        panes: state.panes.map((p) => {
          if (p.id === id) return { ...p, ...updates };
          // Propagate only to OTHER synced panes
          if (hasSyncFields && p.synced) return { ...p, ...syncFields };
          return p;
        }),
      };
    }),

  // Convenience setters — operate on whichever pane is active
  setSelectedBook: (book) =>
    set((state) => {
      const activePane = state.panes[state.activePaneIndex];
      const panes = state.panes.map((p, i) => {
        if (i === state.activePaneIndex) return { ...p, selectedBook: book, selectedChapter: 1 };
        // Propagate to other synced panes only if the active pane is also synced
        if (activePane?.synced && p.synced) return { ...p, selectedBook: book, selectedChapter: 1 };
        return p;
      });
      return { panes };
    }),

  setSelectedChapter: (chapter) =>
    set((state) => {
      const activePane = state.panes[state.activePaneIndex];
      const panes = state.panes.map((p, i) => {
        if (i === state.activePaneIndex) return { ...p, selectedChapter: chapter };
        // Propagate to other synced panes only if the active pane is also synced
        if (activePane?.synced && p.synced) return { ...p, selectedChapter: chapter };
        return p;
      });
      return { panes };
    }),

  setSelectedTranslation: (translation) =>
    set((state) => {
      const panes = state.panes.map((p, i) =>
        i === state.activePaneIndex ? { ...p, selectedTranslation: translation } : p
      );
      return { panes };
    }),

  setTheme: (theme) =>
    set({
      theme,
      darkMode: theme === 'dark-blue' || theme === 'dark-oled',
    }),
  toggleSyncScroll: () => set((state) => ({ syncScroll: !state.syncScroll })),
  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),

  // Notes
  notes: [],
  addNote: (key, text) =>
    set((state) => {
      const existing = state.notes.find(
        (n) => n.book === key.book && n.chapter === key.chapter && n.verse === key.verse
      );
      if (existing) {
        // Update in place if note already exists for this verse
        return {
          notes: state.notes.map((n) =>
            n.id === existing.id ? { ...n, text, updatedAt: Date.now() } : n
          ),
        };
      }
      const note: Note = {
        id: crypto.randomUUID(),
        ...key,
        text,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return { notes: [...state.notes, note] };
    }),
  updateNote: (id, text) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, text, updatedAt: Date.now() } : n
      ),
    })),
  deleteNote: (id) =>
    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
  getNoteForVerse: (key) =>
    get().notes.find(
      (n) => n.book === key.book && n.chapter === key.chapter && n.verse === key.verse
    ),

  // Highlights
  highlights: [],
  addHighlight: (key, color) =>
    set((state) => {
      // Replace existing highlight for same verse if any
      const filtered = state.highlights.filter(
        (h) => !(h.book === key.book && h.chapter === key.chapter && h.verse === key.verse)
      );
      const highlight: Highlight = { id: crypto.randomUUID(), ...key, color };
      return { highlights: [...filtered, highlight] };
    }),
  removeHighlight: (key) =>
    set((state) => ({
      highlights: state.highlights.filter(
        (h) => !(h.book === key.book && h.chapter === key.chapter && h.verse === key.verse)
      ),
    })),
  getHighlightForVerse: (key) =>
    get().highlights.find(
      (h) => h.book === key.book && h.chapter === key.chapter && h.verse === key.verse
    ),

  // Bookmarks
  bookmarks: [],
  addBookmark: (key, label) =>
    set((state) => {
      const exists = state.bookmarks.some(
        (b) => b.book === key.book && b.chapter === key.chapter && b.verse === key.verse
      );
      if (exists) return state;
      const bookmark: Bookmark = {
        id: crypto.randomUUID(),
        ...key,
        label,
        createdAt: Date.now(),
      };
      return { bookmarks: [...state.bookmarks, bookmark] };
    }),
  removeBookmark: (key) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter(
        (b) => !(b.book === key.book && b.chapter === key.chapter && b.verse === key.verse)
      ),
    })),
  isBookmarked: (key) =>
    get().bookmarks.some(
      (b) => b.book === key.book && b.chapter === key.chapter && b.verse === key.verse
    ),

  strongsWord: null,
  strongsLookup: null,
  strongsResults: [],
  setStrongsWord: (word) => {
    if (!word) {
      set({ strongsWord: null, strongsLookup: null, strongsResults: [] });
      return;
    }
    const result = searchByKjvWord(word);
    // Flat list: exact first, then similar (for backwards compat with StrongsPanel)
    const flat: StrongsResult[] = [
      ...(result.exact ? [result.exact] : []),
      ...result.similar,
    ];
    set({ strongsWord: word, strongsLookup: result, strongsResults: flat });
  },

  selectedStrongsNum: null,
  setStrongsNum: (num, fallbackWord) => {
    if (!num) {
      set({ selectedStrongsNum: null, strongsLookup: null, strongsResults: [] });
      return;
    }
    const entry = lookup(num);
    if (!entry) {
      set({ selectedStrongsNum: num, strongsLookup: { exact: null, similar: [] }, strongsResults: [] });
      return;
    }
    // Build similar list: fuzzy search on the word text, minus the exact entry
    const similar = fallbackWord
      ? searchByKjvWord(fallbackWord).similar.filter((r) => r.num !== num)
      : [];
    const structured: StrongsSearchResult = { exact: { num, entry }, similar };
    const flat: StrongsResult[] = [{ num, entry }, ...similar];
    set({ selectedStrongsNum: num, strongsLookup: structured, strongsResults: flat });
  },

  tskVerse: null,
  setTskVerse: (key) => set({ tskVerse: key }),

  // Custom translations
  customTranslations: [],
  addCustomTranslation: (meta, data, taggedData) => {
    // Register in bibleLoader so panes can retrieve verse data immediately.
    // This is the single authoritative indexing call — all callers go through here.
    let warnings: string[] = [];
    try {
      if (taggedData != null) {
        console.log(`[bibleStore] addCustomTranslation: registering tagged "${meta.abbreviation}" — ${taggedData.length} books`);
        warnings = registerTaggedTranslation(meta.abbreviation, taggedData);
      } else if (data != null) {
        const bookCount = Object.keys(data).length;
        console.log(`[bibleStore] addCustomTranslation: registering plain "${meta.abbreviation}" — ${bookCount} books`);
        // INSTRUMENTATION: log full shape of data before passing to registerCustomTranslation
        console.log(`[bibleStore] data typeof: ${typeof data}`);
        console.log(`[bibleStore] data top-level keys (first 5):`, Object.keys(data).slice(0, 5));
        if (bookCount === 0) {
          console.warn(`[bibleStore] addCustomTranslation: "${meta.abbreviation}" has 0 books — verse display will be empty`);
        }
        warnings = registerCustomTranslation(meta.abbreviation, data);
      } else {
        console.warn(`[bibleStore] addCustomTranslation: "${meta.abbreviation}" called with no data or taggedData — verses will not load`);
      }
    } catch (err) {
      console.error(`[bibleStore] addCustomTranslation: registration failed for "${meta.abbreviation}":`, err);
    }

    set((state) => {
      // Prevent duplicates: if this abbreviation is already registered, replace its entry
      const filtered = state.customTranslations.filter((t) => t.abbreviation !== meta.abbreviation);
      if (filtered.length < state.customTranslations.length) {
        console.log(`[bibleStore] addCustomTranslation: replaced existing entry for "${meta.abbreviation}"`);
      }
      return { customTranslations: [...filtered, meta] };
    });

    return warnings;
  },
  removeCustomTranslation: (abbreviation) => {
    console.log(`[bibleStore] removeCustomTranslation: unregistering "${abbreviation}"`);
    unregisterCustomTranslation(abbreviation);
    set((state) => ({
      customTranslations: state.customTranslations.filter((t) => t.abbreviation !== abbreviation),
    }));
  },

  searchQuery: '',
  searchScope: 'bible',
  searchScopeBook: 'Genesis',
  searchScopeChapter: 1,
  searchResults: [],
  searchOpen: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchScope: (scope) => set({ searchScope: scope }),
  setSearchScopeBook: (book) => set({ searchScopeBook: book }),
  setSearchScopeChapter: (chapter) => set({ searchScopeChapter: chapter }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchOpen: (open) => set({ searchOpen: open }),
}));

// Selector helpers
export const selectActivePane = (state: BibleStore): Pane =>
  state.panes[state.activePaneIndex] ?? state.panes[0];
