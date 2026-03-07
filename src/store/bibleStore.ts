import { create } from 'zustand';
import type { Translation } from '../data/bibleLoader';
import { searchByKjvWord } from '../data/strongs';
import type { StrongsEntry } from '../data/strongs';

export type SearchScope = 'bible' | 'OT' | 'NT' | 'book' | 'chapter';

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
}

interface BibleStore {
  panes: Pane[];
  activePaneIndex: number;
  syncScroll: boolean;
  darkMode: boolean;

  // Pane management
  addPane: () => void;
  addPaneWithRef: (book: string, chapter: number, translation: Translation) => void;
  removePane: (id: string) => void;
  setActivePaneIndex: (index: number) => void;
  updatePane: (id: string, updates: Partial<Pick<Pane, 'selectedBook' | 'selectedChapter' | 'selectedTranslation'>>) => void;
  navigateAllPanes: (book: string, chapter: number) => void;

  // Convenience setters that target the active pane
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setSelectedTranslation: (translation: Translation) => void;

  toggleDarkMode: () => void;
  toggleSyncScroll: () => void;

  // Strong's concordance state
  strongsWord: string | null;
  strongsResults: StrongsResult[];
  setStrongsWord: (word: string | null) => void;

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

  // Search state
  searchQuery: string;
  searchScope: SearchScope;
  searchScopeBook: string;
  searchScopeChapter: number;
  searchResults: SearchResult[];
  searchOpen: boolean;
  scrollToVerse: number | null; // verse number (1-indexed) to scroll to after navigation
  setSearchQuery: (query: string) => void;
  setSearchScope: (scope: SearchScope) => void;
  setSearchScopeBook: (book: string) => void;
  setSearchScopeChapter: (chapter: number) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchOpen: (open: boolean) => void;
  setScrollToVerse: (verse: number | null) => void;
}

const DEFAULT_PANE = (): Pane => ({
  id: crypto.randomUUID(),
  selectedBook: 'Genesis',
  selectedChapter: 1,
  selectedTranslation: 'KJV',
});

export const useBibleStore = create<BibleStore>((set, get) => ({
  panes: [DEFAULT_PANE()],
  activePaneIndex: 0,
  syncScroll: false,
  darkMode: false,

  addPane: () =>
    set((state) => ({
      panes: [...state.panes, DEFAULT_PANE()],
      activePaneIndex: state.panes.length,
    })),

  addPaneWithRef: (book, chapter, translation) =>
    set((state) => {
      const newPane: Pane = {
        id: crypto.randomUUID(),
        selectedBook: book,
        selectedChapter: chapter,
        selectedTranslation: translation,
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

  navigateAllPanes: (book, chapter) =>
    set((state) => ({
      panes: state.panes.map((p) => ({ ...p, selectedBook: book, selectedChapter: chapter })),
    })),

  updatePane: (id, updates) =>
    set((state) => {
      const { syncScroll } = state;
      // When synced, propagate book/chapter changes to all panes
      const syncFields: Partial<Pick<Pane, 'selectedBook' | 'selectedChapter'>> = {};
      if (syncScroll) {
        if (updates.selectedBook !== undefined) syncFields.selectedBook = updates.selectedBook;
        if (updates.selectedChapter !== undefined) syncFields.selectedChapter = updates.selectedChapter;
      }
      const hasSyncFields = Object.keys(syncFields).length > 0;
      return {
        panes: state.panes.map((p) => {
          if (p.id === id) return { ...p, ...updates };
          if (hasSyncFields) return { ...p, ...syncFields };
          return p;
        }),
      };
    }),

  // Convenience setters — operate on whichever pane is active
  setSelectedBook: (book) =>
    set((state) => {
      const { syncScroll } = state;
      const panes = state.panes.map((p, i) => {
        if (syncScroll) return { ...p, selectedBook: book, selectedChapter: 1 };
        return i === state.activePaneIndex ? { ...p, selectedBook: book, selectedChapter: 1 } : p;
      });
      return { panes };
    }),

  setSelectedChapter: (chapter) =>
    set((state) => {
      const { syncScroll } = state;
      const panes = state.panes.map((p, i) => {
        if (syncScroll) return { ...p, selectedChapter: chapter };
        return i === state.activePaneIndex ? { ...p, selectedChapter: chapter } : p;
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

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleSyncScroll: () => set((state) => ({ syncScroll: !state.syncScroll })),

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
  strongsResults: [],
  setStrongsWord: (word) => {
    if (!word) {
      set({ strongsWord: null, strongsResults: [] });
      return;
    }
    const results = searchByKjvWord(word);
    set({ strongsWord: word, strongsResults: results });
  },

  searchQuery: '',
  searchScope: 'bible',
  searchScopeBook: 'Genesis',
  searchScopeChapter: 1,
  searchResults: [],
  searchOpen: false,
  scrollToVerse: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchScope: (scope) => set({ searchScope: scope }),
  setSearchScopeBook: (book) => set({ searchScopeBook: book }),
  setSearchScopeChapter: (chapter) => set({ searchScopeChapter: chapter }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setScrollToVerse: (verse) => set({ scrollToVerse: verse }),
}));

// Selector helpers
export const selectActivePane = (state: BibleStore): Pane =>
  state.panes[state.activePaneIndex] ?? state.panes[0];
